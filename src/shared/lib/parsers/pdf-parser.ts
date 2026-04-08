import { ParsedTransaction } from "@/features/transactions/types";
import { isInternalTransfer, parseAmountBR, parseDateDDMMYYYY } from "./csv-parser";

/**
 * PicPay PDF Adapter Regex Strategies
 * PicPay usually formats PDFs sequentially in text blocks.
 */
export function parseBrasilPdfText(text: string, userDocument?: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const tokens = text.split(/\s+/).filter(t => t !== '');
  
  // Detectar Banco
  const isBradesco = text.toUpperCase().includes('BRADESCO');
  const isMercadoPago = text.toUpperCase().includes('MERCADO PAGO');

  // Regex de Data flexível: DD/MM/YYYY ou DD/MM ou DD-MM-YYYY
  const dateRegex = /(\d{2}[\/\-]\d{2}(?:[\/\-]\d{4}|[\/\-]\d{2})?)/;
  // Regex de valor: com R$ ou apenas o formato decimal brasileiro 1.234,56
  const numericValueRegex = /^-?[\d\.]+,\d{2}$/;

  let lastFullDate: Date | null = null;
  let lastDate: Date | null = null;
  let wordBuffer: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    // 1. Tenta encontrar Data
    const dateMatch = token.match(dateRegex);
    if (dateMatch) {
       const dateStr = dateMatch[1];
       const parts = dateStr.split(/[\/\-]/);
       
       let finalDate: Date | null = null;
       if (parts.length === 3) {
           // Data completa DD/MM/YYYY
           finalDate = parseDateDDMMYYYY(dateStr);
           if (finalDate) lastFullDate = finalDate;
       } else if (parts.length === 2 && lastFullDate) {
           // Data parcial DD/MM (Bradesco), usa o ano da última completa encontrada
           const day = parseInt(parts[0], 10);
           const month = parseInt(parts[1], 10) - 1;
           const year = lastFullDate.getFullYear();
           finalDate = new Date(year, month, day);
       }

       if (finalDate) {
           lastDate = finalDate;
           wordBuffer = [];
           continue;
       }
    }

    if (!lastDate) continue;

    // 2. Tenta encontrar Valor
    let amount: number | null = null;

    if (token.includes('R$')) {
        let rawAmountStr = token.replace('R$', '').trim();
        if (!numericValueRegex.test(rawAmountStr) && tokens[i+1] && numericValueRegex.test(tokens[i+1])) {
            rawAmountStr = tokens[i+1];
        }
        if (numericValueRegex.test(rawAmountStr)) {
            amount = parseAmountBR(rawAmountStr);
        }
    } else if (isBradesco && numericValueRegex.test(token)) {
        // No Bradesco, valores são números puros. 
        // Verificamos se o sinal está nos arredores
        amount = parseAmountBR(token);
    }

    if (amount !== null && lastDate) {
        const description = wordBuffer.join(' ') || "Lançamento Bancário";
        const descLower = description.toLowerCase();

        // Detecção de Sinal
        const hasNegativeSymbol = 
            token.includes('-') || tokens[i-1] === '-' || tokens[i-2] === '-';
        
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

        // Ignorar se for uma linha de resumo (comum em cabeçalhos de meses ou rodapés)
        const summaryKeywords = ['entradas:', 'saídas:', 'saida:', 'saldo do dia:', 'saldo anterior:', 'saldo sacável:'];
        if (summaryKeywords.some(k => descLower.includes(k))) {
            lastDate = null;
            wordBuffer = [];
            continue;
        }

        transactions.push({
          id: Math.random().toString(36).substr(2, 9),
          date: lastDate,
          amount,
          description: description,
          type: isTransfer ? "TRANSFER" : (amount < 0 ? "EXPENSE" : "INCOME"),
          isInternalTransfer: isTransfer
        });

        lastDate = null;
        wordBuffer = [];
        continue;
    }

    // 4. Acumula descrição
    wordBuffer.push(token);
  }

  return transactions;
}
