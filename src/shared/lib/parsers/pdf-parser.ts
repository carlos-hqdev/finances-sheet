import { ParsedTransaction } from "@/features/transactions/types";
import { isInternalTransfer, parseAmountBR, parseDateDDMMYYYY } from "./csv-parser";
import { detectPaymentMethod, shouldIgnoreTransaction } from "./import-utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PdfItem = { x: number; y: number; str: string };

/**
 * Lê um arquivo PDF (ArrayBuffer), extrai os items de texto com posição
 * e retorna as transações parseadas.
 *
 * Lança PasswordException (de pdfjs-dist) se o arquivo for protegido
 * e a senha não for fornecida ou estiver incorreta.
 */
export async function parsePdfFile(
  arrayBuffer: ArrayBuffer,
  userDocument?: string,
  password?: string,
): Promise<ParsedTransaction[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  
  // Utilizar worker via unpkg (frequentemente com regras de CORS mais permissivas)
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`;

  const loadingTask = pdfjs.getDocument({ data: arrayBuffer, password });
  
  // Utilizar um timeout para evitar que o worker congele a requisição (ex: erro de CSP)
  const pdf = await Promise.race([
    loadingTask.promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        loadingTask.destroy();
        reject(new Error("O processamento do PDF excedeu o limite de tempo. Pode haver um bloqueio de conexão impedindo as bibliotecas auxiliares de carregar."));
      }, 15000);
    })
  ]);

  const allItems: PdfItem[] = [];
  let pageYOffset = 0;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    textContent.items.forEach((item: any) => {
      if (item.str && item.str.trim()) {
        allItems.push({
          x: Math.round(item.transform[4]),
          // Inverte Y (PDF usa bottom-up) e adiciona offset da página
          y: pageYOffset + Math.round(viewport.height - item.transform[5]),
          str: item.str.trim(),
        });
      }
    });

    // Offset para separar páginas verticalmente (garante ordem correta)
    pageYOffset += Math.round(viewport.height) + 100;
  }

  // Detecta banco pelo texto completo
  // Normalizar todos os tipos de espaços e quebras invisíveis que o parser do browser gera
  const fullText = allItems.map(i => i.str).join(' ').replace(/\s+/g, ' ').trim();
  const upperText = fullText.toUpperCase();

  if (upperText.includes('BRADESCO')) {
    return parseBradescoPdfItems(allItems, userDocument);
  }

  if (upperText.includes('NU PAGAMENTOS') || upperText.includes('NUBANK') || upperText.includes('NU FINANCEIRA')) {
    return parseNubankPdfItems(allItems, userDocument);
  }

  if (upperText.includes('C6 BANK')) {
    return parseC6PdfItems(allItems, userDocument);
  }

  if (upperText.includes('PICPAY')) {
    return parsePicPayPdfItems(allItems, userDocument);
  }

  // Fallback: parser token a token para outros bancos
  const lineText = groupItemsIntoLines(allItems).map(l => l.map(i => i.str).join(' ')).join('\n');
  return parseBrasilPdfText(lineText, userDocument);
}

// Mapa de meses abreviados em PT para número
const MONTH_MAP: Record<string, number> = {
  JAN: 0, FEV: 1, MAR: 2, ABR: 3, MAI: 4, JUN: 5,
  JUL: 6, AGO: 7, SET: 8, OUT: 9, NOV: 10, DEZ: 11,
};

/**
 * Parser específico para extratos do Nubank em PDF.
 *
 * O Nubank usa um layout onde:
 *  - Datas no formato "DD MES YYYY" (ex: "09 JAN 2023") precedem um grupo de transações
 *  - O sinal é inferido por "Total de entradas" (+) ou "Total de saídas" (-)
 *  - Os valores são absolutos sem prefixo R$
 *  - A descrição da transação está na linha APÓS o valor
 */
function parseNubankPdfItems(items: PdfItem[], userDocument?: string): ParsedTransaction[] {
  const lines = groupItemsIntoLines(items);
  const transactions: ParsedTransaction[] = [];

  // Regex de data no formato Nubank: "DD MES YYYY" ou "DD MES YYYY" na mesma linha que "Total de..."
  const nuDateRegex = /(\d{1,2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+(\d{4})/i;
  // Valor com sinal: "+6,29" "-30,00" "+ 6,29" "- 30,00"
  const signedAmountRegex = /^[+\-]\s*[\d\.]+,\d{2}$/;
  // Valor absoluto
  const amountRegex = /^[\d\.]+,\d{2}$/;

  // Linhas a ignorar
  const skipKw = ['SALDO INICIAL','SALDO FINAL','RENDIMENTO','OUVIDORIA','CNPJ',
    'VALORES EM R$','EXTRATO GERADO','NÃO NOS RESPONSABILIZAMOS','ASSEGURAMOS A AUTENTICIDADE',
    'NU PAGAMENTOS','NU FINANCEIRA','MOVIMENTAÇÕES','TOTAL DE ENTRADAS','TOTAL DE SA',
    'TEM ALGUMA DÚVIDA?', 'METROPOLITANAS)', 'LOCALIDADES).'];

  let pendingDate: Date | null = null;
  let pendingSign = 1;
  let pendingAmount: number | null = null;

  for (const line of lines) {
    const texts = line.map(i => i.str);
    const joined = texts.join(' ').replace(/\s+/g, ' ').trim();
    const upper = joined.toUpperCase();

    // Pular cabeçalhos e rodapés
    if (skipKw.some(k => upper.includes(k)) || joined.match(/^\d+ de \d+$/)) {
      // Mas analisar dentro dessa linha se tiver data + total + valor
      // Prosseguir para a lógica de detecção abaixo
    }

    // Detectar linha de data + sinal + valor: "09 JAN 2023 Total de saídas - 30,00"
    const dateMatch = upper.match(nuDateRegex);
    const hasTotal = upper.includes('TOTAL DE ENTRADAS') || upper.includes('TOTAL DE SA');

    if (dateMatch && hasTotal) {
      // Se havia transação pendente sem descrição ainda, ignoramos
      pendingAmount = null;

      const day = parseInt(dateMatch[1], 10);
      const month = MONTH_MAP[dateMatch[2].toUpperCase()];
      const year = parseInt(dateMatch[3], 10);
      if (month !== undefined) pendingDate = new Date(year, month, day);

      pendingSign = upper.includes('TOTAL DE ENTRADAS') ? 1 : -1;

      // Valor assinado na mesma linha
      const valToken = texts.find(t => signedAmountRegex.test(t) || (t.startsWith('+') || t.startsWith('-')));
      // Montar valor completo (pode estar separado em "+", "30,00")
      const allJoined = texts.join('');
      const signedMatch = allJoined.match(/([+\-])\s*([\d\.]+,\d{2})/);
      if (signedMatch) {
        const sign = signedMatch[1] === '+' ? 1 : -1;
        pendingAmount = sign * parseAmountBR(signedMatch[2]);
      }
      continue;
    }

    // Linha sem data mas com Total (subtotais da mesma data)
    if (!dateMatch && hasTotal) {
      pendingSign = upper.includes('TOTAL DE ENTRADAS') ? 1 : -1;
      const allJoined = texts.join('');
      const signedMatch = allJoined.match(/([+\-])\s*([\d\.]+,\d{2})/);
      if (signedMatch) {
        const sign = signedMatch[1] === '+' ? 1 : -1;
        pendingAmount = sign * parseAmountBR(signedMatch[2]);
      }
      continue;
    }

    // Linha de descrição de transação individual: tem valor absoluto + texto descritivo
    if (pendingDate) {
      const valueToken = texts.find(t => amountRegex.test(t));
      if (valueToken) {
        const descParts = texts.filter(t => t !== valueToken && !signedAmountRegex.test(t) && t.trim() !== '');
        const description = descParts.join(' ').trim();
        const skipThisLine = skipKw.some(k => upper.includes(k)) || joined.match(/^\d+ de \d+$/);

        if (!shouldIgnoreTransaction(description) && !skipThisLine) {
          const rawAmount = parseAmountBR(valueToken);
          const amount = pendingSign * rawAmount;
          const finalDescription = description || "[A Verificar] Lançamento sem descrição base";
          const isTransfer = isInternalTransfer(finalDescription, userDocument);

          transactions.push({
            id: Math.random().toString(36).substr(2, 9),
            date: pendingDate,
            amount,
            description: finalDescription,
            type: isTransfer ? "TRANSFER" : (amount < 0 ? "EXPENSE" : "INCOME"),
            isInternalTransfer: isTransfer,
            paymentMethod: detectPaymentMethod(finalDescription),
          });
        }
        continue;
      }

      // Se não encontrou valor mas a linha tem texto, pode ser continuação da descrição
      // ou apenas um informativo que não devemos capturar como transação órfã.
    }
  }

  return transactions;
}

/**
 * Parser específico para extratos do C6 Bank em PDF.
 */
function parseC6PdfItems(items: PdfItem[], userDocument?: string): ParsedTransaction[] {
  const lines = groupItemsIntoLines(items);
  const transactions: ParsedTransaction[] = [];

  const dateRegex = /^(\d{2}\/\d{2})\s+(\d{2}\/\d{2})/;
  const amountRegex = /^-?R\$\s*[\d\.]+,\d{2}$|^-?[\d\.]+,\d{2}$/;

  let lastDate: Date | null = null;

  for (const line of lines) {
    const texts = line.map(i => i.str);
    const joined = texts.join(' ').replace(/\s+/g, ' ').trim();
    const upper = joined.toUpperCase();

    if (shouldIgnoreTransaction(joined)) continue;

    const dateMatch = joined.match(dateRegex);
    const amountMatch = texts.find(t => amountRegex.test(t));

    if (dateMatch && amountMatch) {
      // C6 usa DD/MM DD/MM (Movimentação e Valorização)
      const dateParts = dateMatch[1].split('/');
      const day = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1;
      
      // Tenta inferir o ano base do extrato (se disponível nos metadados ou usa o atual)
      const year = new Date().getFullYear(); 
      const date = new Date(year, month, day);
      lastDate = date;

      const rawAmountStr = amountMatch.replace('R$', '').trim();
      let amount = parseAmountBR(rawAmountStr);

      let description = joined.replace(dateMatch[0], '').replace(amountMatch, '').trim();
      description = description.replace(/^R\$\s*/, '').trim();
      if (shouldIgnoreTransaction(description)) continue;

      const finalDescription = description || "[A Verificar] Lançamento sem descrição base";
      const isTransfer = isInternalTransfer(finalDescription, userDocument);

      transactions.push({
        id: Math.random().toString(36).substr(2, 9),
        date,
        amount,
        description: finalDescription,
        type: isTransfer ? "TRANSFER" : (amount < 0 ? "EXPENSE" : "INCOME"),
        isInternalTransfer: isTransfer,
        paymentMethod: detectPaymentMethod(finalDescription),
      });
    }
  }

  return transactions;
}

/**
 * Parser específico para extratos do PicPay em PDF.
 */
function parsePicPayPdfItems(items: PdfItem[], userDocument?: string): ParsedTransaction[] {
  const lines = groupItemsIntoLines(items);
  const transactions: ParsedTransaction[] = [];

  const dateRegex = /^(\d{2}\/\d{2}\/\d{4})$/;
  const amountRegex = /^-?\s*R\$\s*[\d\.]+,\d{2}$/;

  let lastDate: Date | null = null;

  for (let i = 0; i < lines.length; i++) {
    const texts = lines[i].map(item => item.str);
    const joined = texts.join(' ');

    const dateMatch = joined.match(dateRegex);
    if (dateMatch) {
      lastDate = parseDateDDMMYYYY(dateMatch[1]);
      continue;
    }

    if (lastDate) {
      const amountToken = texts.find(t => amountRegex.test(t));
      if (amountToken) {
        const amount = parseAmountBR(amountToken.replace('R$', '').trim());
        const description = texts.filter(t => t !== amountToken).join(' ').trim();

        if (!shouldIgnoreTransaction(description)) {
          const finalDescription = description || "[A Verificar] Lançamento sem descrição base";
          const isTransfer = isInternalTransfer(finalDescription, userDocument);
          transactions.push({
            id: Math.random().toString(36).substr(2, 9),
            date: lastDate,
            amount,
            description: finalDescription,
            type: isTransfer ? "TRANSFER" : (amount < 0 ? "EXPENSE" : "INCOME"),
            isInternalTransfer: isTransfer,
            paymentMethod: detectPaymentMethod(finalDescription),
          });
        }
      }
    }
  }

  return transactions;
}

/**
 * Agrupa items de texto pelo eixo Y (mesma linha visual),
 * ordenando cada linha pelo eixo X (esquerda para direita).
 */
function groupItemsIntoLines(items: PdfItem[], tolerance = 8): PdfItem[][] {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const lines: PdfItem[][] = [];
  let currentLine: PdfItem[] = [];
  let lastY = -9999;

  for (const item of sorted) {
    if (Math.abs(item.y - lastY) > tolerance) {
      if (currentLine.length > 0) lines.push(currentLine);
      currentLine = [item];
      lastY = item.y;
    } else {
      currentLine.push(item);
      lastY = (lastY + item.y) / 2; // média para tolerância
    }
  }
  if (currentLine.length > 0) lines.push(currentLine);
  return lines;
}

/**
 * Parser específico para extratos do Bradesco em PDF.
 *
 * O Bradesco usa um layout de colunas fixas:
 *   Coluna 1: Histórico (descrição) — linha anterior à de dados
 *   Linha de dados: [DATA?] [DOCTO] [CRÉDITO] [DÉBITO] [SALDO]
 *   A data é opcional nas linhas seguintes do mesmo dia.
 */
function parseBradescoPdfItems(items: PdfItem[], userDocument?: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = groupItemsIntoLines(items);

  // Regex de data completa (DD/MM/YYYY) para detectar linhas com data
  const fullDateRegex = /^(\d{2}\/\d{2}\/\d{4})$/;
  // Regex de valor numérico BR: 1.234,56 ou 123,45
  const amountRegex = /^[\d\.]+,\d{2}$/;
  // Regex docto (número sem vírgula)
  const doctoRegex = /^\d{4,}$/;

  let lastDate: Date | null = null;
  let pendingDescription: string | null = null;

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const texts = line.map(i => i.str);
    const joined = texts.join(' ');

    // Detectar linhas de cabeçalho/rodapé/resumo para ignorar
    const joinedLower = joined.toLowerCase();
    if (
      joinedLower.includes('data') && joinedLower.includes('histórico') ||
      joinedLower.includes('folha:') ||
      joinedLower.includes('bradesco celular') ||
      joinedLower.includes('extrato de:') ||
      joinedLower.includes('movimentação entre:') ||
      joinedLower.includes('extrato inexistente') ||
      joinedLower.includes('nome:')
    ) {
      continue;
    }

    // Uma linha de dados do Bradesco tipicamente tem:
    // [DD/MM/YYYY?] [Docto] [valor] [valor] (2 ou 3 valores numéricos + docto)
    const amounts = texts.filter(t => amountRegex.test(t));
    const doctos = texts.filter(t => doctoRegex.test(t) && !amountRegex.test(t));
    const dateInLine = texts.find(t => fullDateRegex.test(t));

    const isDataLine = amounts.length >= 2 && doctos.length >= 1;

    if (isDataLine) {
      if (dateInLine) {
        const parsed = parseDateDDMMYYYY(dateInLine);
        if (parsed) lastDate = parsed;
      }

      if (!lastDate) continue;

      // Determinar crédito e débito pela quantidade de values:
      // [docto] [credito] [saldo] → crédito
      // [docto] [debito] [saldo] → débito
      // [docto] [credito|debito] [saldo] — precisamos inferir pelo contexto (descrição)
      // O Bradesco coloca crédito na 1ª posição se for entrada, débito se for saída.
      // Como temos só valores numéricos, usamos a descrição pendente para inferir o sinal.
      const numericValues = amounts.map(a => parseAmountBR(a));
      // O saldo é sempre o ÚLTIMO valor. Os anteriores são crédito/débito.
      const transactionValues = numericValues.slice(0, -1); // remove o saldo

      const description = pendingDescription || joined;
      pendingDescription = null;

      if (shouldIgnoreTransaction(description)) continue;
      const finalDescription = description || "[A Verificar] Lançamento sem descrição base";

      const descLower = finalDescription.toLowerCase();

      const negativeKeywords = [
        'transferencia', 'pix', 'pagamento', 'debito', 'saida', 'saque',
        'compra', 'tarifa', 'despesa', 'seguro', 'iof', 'juros', 'ted', 'doc'
      ];
      const positiveKeywords = [
        'dep dinheiro', 'credito', 'deposito', 'estorno', 'rendimento', 'reembolso',
        'transf saldo', 'resgate'
      ];

      for (const rawAmount of transactionValues) {
        let amount = rawAmount;
        if (negativeKeywords.some(k => descLower.includes(k))) {
          amount = -Math.abs(amount);
        } else if (positiveKeywords.some(k => descLower.includes(k))) {
          amount = Math.abs(amount);
        }

        const isTransfer = isInternalTransfer(description, userDocument);
        transactions.push({
          id: Math.random().toString(36).substr(2, 9),
          date: lastDate,
          amount,
          description: finalDescription,
          type: isTransfer ? "TRANSFER" : (amount < 0 ? "EXPENSE" : "INCOME"),
          isInternalTransfer: isTransfer,
          paymentMethod: detectPaymentMethod(finalDescription),
        });
      }

    } else {
      // Linhas sem valores numéricos suficientes são provavelmente descrições
      // Guarda como pendingDescription para a próxima linha de dados
      if (!dateInLine && texts.length > 0 && texts.every(t => !amountRegex.test(t) && !doctoRegex.test(t))) {
        pendingDescription = joined;
      }
    }
  }

  return transactions;
}

/**
 * Estratégias de parsing de PDF brasileiro token a token.
 * Detecta datas, valores e descrições em extratos como C6 Bank e PicPay.
 *
 * IMPORTANTE: Linhas de resumo como "Saldo do dia 02/01/23 R$ 62,97" são ignoradas
 * via detecção por preDateBuffer — palavras antes de cada data são inspecionadas
 * para verificar se se trata de uma linha de saldo/total, não de uma transação real.
 */
export function parseBrasilPdfText(text: string, userDocument?: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const tokens = text.split(/\s+/).filter(t => t !== '');

  // Detectar Banco
  const isC6 = text.toUpperCase().includes('C6 BANK');

  // Regex de Data flexível: DD/MM/YYYY ou DD/MM ou DD-MM-YYYY
  const dateRegex = /(\d{2}[\/\-]\d{2}(?:[\/\-]\d{4}|[\/\-]\d{2})?)/;
  // Regex de valor: com R$ ou apenas o formato decimal brasileiro 1.234,56
  const numericValueRegex = /^-?[\d\.]+,\d{2}$/;

  // Palavras-chave que indicam linhas de resumo/saldo — NÃO são transações reais
  const summaryKeywords = [
    'saldo', 'total', 'resumo', 'extrato', 'período', 'periodo',
    'subtotal', 'fechamento', 'encerramento', 'anterior', 'disponível', 'disponivel',
  ];

  let lastFullDate: Date | null = null;
  let lastDate: Date | null = null;
  let wordBuffer: string[] = [];

  // Janela deslizante de palavras antes da data (detecta "Saldo do dia")
  let preDateBuffer: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // 1. Tenta encontrar Data
    const dateMatch = token.match(dateRegex);
    if (dateMatch) {
      const dateStr = dateMatch[1];
      const parts = dateStr.split(/[\/\-]/);

      let finalDate: Date | null = null;
      if (parts.length === 3) {
        finalDate = parseDateDDMMYYYY(dateStr);
        if (finalDate) lastFullDate = finalDate;
      } else if (parts.length === 2 && lastFullDate) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = lastFullDate.getFullYear();
        finalDate = new Date(year, month, day);
      }

      if (finalDate) {
        const preDateContext = preDateBuffer.join(' ').toLowerCase();
        const isSummaryLine = summaryKeywords.some(k => preDateContext.includes(k));

        preDateBuffer = [];

        if (isSummaryLine) {
          lastDate = null;
          wordBuffer = [];
          continue;
        }

        // Se a nova data é igual à última ativa, não limpa o buffer de descrição
        const isSameDate = lastDate && finalDate.getTime() === lastDate.getTime();
        lastDate = finalDate;
        if (!isSameDate) {
          wordBuffer = [];
        }
        continue;
      }
    }

    // Quando ainda não há lastDate, acumular no buffer pré-data
    if (!lastDate) {
      preDateBuffer.push(token);
      if (preDateBuffer.length > 8) preDateBuffer.shift();
      continue;
    }

    // Se encontrou token de resumo, encerra o bloco
    if (lastDate && summaryKeywords.some(k => token.toLowerCase() === k)) {
      lastDate = null;
      wordBuffer = [];
      continue;
    }

    // 2. Tenta encontrar Valor
    let amount: number | null = null;

    if (token.includes('R$')) {
      let rawAmountStr = token.replace('R$', '').trim();
      if (!numericValueRegex.test(rawAmountStr) && tokens[i + 1] && numericValueRegex.test(tokens[i + 1])) {
        rawAmountStr = tokens[i + 1];
      }
      if (numericValueRegex.test(rawAmountStr)) {
        amount = parseAmountBR(rawAmountStr);
      }
    }

    if (amount !== null && lastDate) {
      let description = wordBuffer.join(' ') || null;

      if (!description && lastDate) {
        const typeLabel = amount < 0 ? "Débito" : "Crédito";
        description = `Movimentação de ${typeLabel} (Extraído do PDF)`;
      }

      if (!description || shouldIgnoreTransaction(description)) {
        wordBuffer = [];
        continue;
      }

      const descLower = description.toLowerCase();

      const hasNegativeSymbol =
        token.includes('-') || tokens[i - 1] === '-' || tokens[i - 2] === '-';

      if (hasNegativeSymbol) amount = -Math.abs(amount);

      const negativeKeywords = [
        'enviado', 'pagamento', 'débito', 'saída', 'saida', 'saque',
        'compra', 'tarifa', 'despesa', 'seguro', 'iof', 'juros'
      ];
      const positiveKeywords = [
        'recebido', 'entrada', 'depósito', 'deposito', 'crédito',
        'credito', 'estorno', 'rendimento', 'reembolso', 'pago'
      ];

      if (negativeKeywords.some(k => descLower.includes(k))) {
        amount = -Math.abs(amount);
      } else if (positiveKeywords.some(k => descLower.includes(k))) {
        amount = Math.abs(amount);
      }

      const isTransfer = isInternalTransfer(description, userDocument);

      transactions.push({
        id: Math.random().toString(36).substr(2, 9),
        date: lastDate,
        amount,
        description,
        type: isTransfer ? "TRANSFER" : (amount < 0 ? "EXPENSE" : "INCOME"),
        isInternalTransfer: isTransfer,
        paymentMethod: detectPaymentMethod(description),
      });

      wordBuffer = [];
      continue;
    }

    // 3. Acumula descrição
    wordBuffer.push(token);
  }

  return transactions;
}
