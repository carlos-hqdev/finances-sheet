
import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

function parseAmountBR(amountStr) {
  if (!amountStr || amountStr.trim() === '') return 0;
  let cleanStr = amountStr.toString().replace(/R\$/g, '').trim();
  const countComma = (cleanStr.match(/,/g) || []).length;
  const countDot = (cleanStr.match(/\./g) || []).length;
  if (countComma > 0 && countDot > 0) {
    const lastComma = cleanStr.lastIndexOf(',');
    const lastDot = cleanStr.lastIndexOf('.');
    if (lastComma > lastDot) cleanStr = cleanStr.replace(/\./g, '').replace(',', '.');
    else cleanStr = cleanStr.replace(/,/g, '');
  } else if (countComma === 1 && countDot === 0) cleanStr = cleanStr.replace(',', '.');
  else if (countDot > 1 && countComma === 0) cleanStr = cleanStr.replace(/\./g, '');
  const val = parseFloat(cleanStr);
  return isNaN(val) ? 0 : val;
}

function shouldIgnoreTransaction(description) {
  const IGNORE_KEYWORDS = [
    'saldo do dia', 'saldo anterior', 'entradas:', 'saídas:', 'total de entradas', 'total de saídas', 'demonstrativo',
  ];
  const desc = description.toLowerCase();
  return IGNORE_KEYWORDS.some(keyword => desc.includes(keyword));
}

function parseBrasilPdfText(text) {
  const transactions = [];
  const tokens = text.split(/\s+/).filter(t => t !== '');
  const dateRegex = /(\d{2}[\/\-]\d{2}(?:[\/\-]\d{4}|[\/\-]\d{2})?)/;
  const numericValueRegex = /^-?[\d\.]+,\d{2}$/;
  const summaryKeywords = ['saldo', 'total', 'resumo', 'extrato', 'período', 'periodo', 'subtotal', 'fechamento', 'encerramento', 'anterior', 'disponível', 'disponivel'];
  const isBradesco = text.toUpperCase().includes('BRADESCO');

  let lastDate = null;
  let wordBuffer = [];
  let preDateBuffer = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const dateMatch = token.match(dateRegex);
    if (dateMatch) {
      lastDate = dateMatch[1];
      wordBuffer = [];
      preDateBuffer = [];
      continue;
    }

    if (!lastDate) {
      preDateBuffer.push(token);
      if (preDateBuffer.length > 8) preDateBuffer.shift();
      continue;
    }

    if (lastDate && summaryKeywords.some(k => token.toLowerCase() === k)) {
      lastDate = null;
      wordBuffer = [];
      continue;
    }

    let amount = null;
    if (token.includes('R$')) {
      let raw = token.replace('R$', '').trim();
      if (!numericValueRegex.test(raw) && tokens[i+1] && numericValueRegex.test(tokens[i+1])) raw = tokens[i+1];
      if (numericValueRegex.test(raw)) amount = parseAmountBR(raw);
    } else if (isBradesco && numericValueRegex.test(token)) {
      amount = parseAmountBR(token);
    }

    if (amount !== null && lastDate) {
      let description = wordBuffer.join(' ') || null;
      
      // NOVA LÓGICA: Sem fallback para Bradesco se estiver vazio
      if (!description && lastDate && !isBradesco) {
        description = `Movimentação (PDF)`;
      }

      if (description && !shouldIgnoreTransaction(description)) {
        if (isBradesco && !token.includes('-')) {
             const lower = description.toLowerCase();
             if (['saida', 'transferencia', 'pix', 'pagamento'].some(k => lower.includes(k))) amount = -Math.abs(amount);
        }
        transactions.push({ date: lastDate, amount, description });
      }
      
      wordBuffer = [];
      // NÃO resetamos lastDate para permitir múltiplos lançamentos
      continue;
    }
    wordBuffer.push(token);
  }
  return transactions;
}

async function verifyBradesco() {
  const pdfPath = '/home/carlo/Projetos/Pessoal/finances-sheet/extratos_exemplos/Bradesco/2023.pdf';
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    fullText += textContent.items.map((item) => item.str).join(" ") + "\n";
  }
  const transactions = parseBrasilPdfText(fullText);
  console.log(`Transactions found: ${transactions.length}`);
}

verifyBradesco().catch(console.error);
