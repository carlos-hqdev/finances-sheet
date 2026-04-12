
import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

/**
 * Esse script usa a lógica do pdf-parser.ts para validar o extrato do C6.
 */
async function parseBrasilPdfTextStandalone(text) {
  const transactions = [];
  const tokens = text.split(/\s+/).filter(t => t !== '');
  
  const dateRegex = /(\d{2}[\/\-]\d{2}(?:[\/\-]\d{4}|[\/\-]\d{2})?)/;
  const numericValueRegex = /^-?[\d\.]+,\d{2}$/;
  
  const summaryKeywords = [
    'saldo', 'total', 'resumo', 'extrato', 'período', 'periodo',
    'subtotal', 'fechamento', 'encerramento', 'anterior', 'disponível', 'disponivel',
  ];

  let lastDate = null;
  let wordBuffer = [];
  let preDateBuffer = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const dateMatch = token.match(dateRegex);
    
    if (dateMatch) {
      const dateStr = dateMatch[1];
      const preDateContext = preDateBuffer.join(' ').toLowerCase();
      const isSummaryLine = summaryKeywords.some(k => preDateContext.includes(k));
      preDateBuffer = [];
      
      if (!isSummaryLine) {
        lastDate = dateStr;
        wordBuffer = [];
        continue;
      }
    }

    if (!lastDate) {
      preDateBuffer.push(token);
      if (preDateBuffer.length > 8) preDateBuffer.shift();
      continue;
    }

    let amount = null;
    if (token.includes('R$')) {
      let rawAmountStr = token.replace('R$', '').trim();
      if (!numericValueRegex.test(rawAmountStr) && tokens[i + 1] && numericValueRegex.test(tokens[i + 1])) {
        rawAmountStr = tokens[i + 1];
      }
      if (numericValueRegex.test(rawAmountStr)) {
        amount = rawAmountStr;
      }
    }

    if (amount !== null && lastDate) {
      let description = wordBuffer.join(' ') || "Movimentação (PDF)";
      
      // NOVA LÓGICA DE FILTRO (Simulada aqui sem importar import-utils.ts)
      const IGNORE_KEYWORDS = [
        'saldo do dia', 'saldo anterior', 'entradas:', 'saídas:', 'total de entradas', 'total de saídas', 'demonstrativo',
      ];
      const isIgnored = IGNORE_KEYWORDS.some(k => description.toLowerCase().includes(k));

      if (!isIgnored) {
        transactions.push({ date: lastDate, amount, description });
      }
      
      lastDate = null;
      wordBuffer = [];
      continue;
    }
    wordBuffer.push(token);
  }
  return transactions;
}

async function run() {
  const pdfPath = '/home/carlo/Projetos/Pessoal/finances-sheet/extratos_exemplos/C6 Bank/2023.pdf';
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const loadingTask = pdfjs.getDocument({ data, password: '170420' });
  const pdf = await loadingTask.promise;

  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(" ");
    fullText += pageText + "\n";
  }
  
  const txs = await parseBrasilPdfTextStandalone(fullText);
  console.log(`Total PDF Transactions: ${txs.length}`);
  txs.slice(-5).forEach(t => console.log(`${t.date} | ${t.amount} | ${t.description}`));
}

run().catch(console.error);
