
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

function parseBrasilPdfText(text) {
  const transactions = [];
  const tokens = text.split(/\s+/).filter(t => t !== '');
  const dateRegex = /(\d{2}[\/\-]\d{2}(?:[\/\-]\d{4}|[\/\-]\d{2})?)/;
  const numericValueRegex = /^-?[\d\.]+,\d{2}$/;
  const summaryKeywords = ['saldo', 'total', 'resumo', 'extrato', 'período', 'periodo', 'subtotal', 'fechamento', 'encerramento', 'anterior', 'disponível', 'disponivel'];
  const isBradesco = text.toUpperCase().includes('BRADESCO');

  let lastFullDate = null;
  let lastDate = null;
  let wordBuffer = [];
  let preDateBuffer = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const dateMatch = token.match(dateRegex);
    if (dateMatch) {
      const dateStr = dateMatch[1];
      const parts = dateStr.split(/[\/\-]/);
      let finalDate = null;
      if (parts.length === 3) {
        finalDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        lastFullDate = finalDate;
      } else if (parts.length === 2 && lastFullDate) {
        finalDate = new Date(lastFullDate.getFullYear(), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      }
      if (finalDate) {
        const isSameDate = lastDate && finalDate.getTime() === lastDate.getTime();
        lastDate = finalDate;
        if (!isSameDate) wordBuffer = [];
        continue;
      }
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
      if (!description && lastDate && !isBradesco) description = `Movimentação (PDF)`;
      if (description) {
        transactions.push({ date: lastDate, amount: Math.abs(amount), description }); // Compare absolute
      }
      wordBuffer = [];
      continue;
    }
    wordBuffer.push(token);
  }
  return transactions;
}

async function reconcile() {
  const csvPath = '/home/carlo/Projetos/Pessoal/finances-sheet/extratos_exemplos/Bradesco/2023.csv';
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const csvLines = csvContent.split('\n');
  const csvTxs = [];
  for (let i = 2; i < csvLines.length; i++) {
    const row = csvLines[i].split(';');
    if (row.length < 5) continue;
    const desc = row[1];
    if (!desc || desc.includes("SALDO ANTERIOR") || desc.includes("TOTAL") || desc.includes("COD. LANC. 0")) continue;
    let val = parseAmountBR(row[3]) || parseAmountBR(row[4]);
    if (val === 0) continue;
    csvTxs.push({ date: row[0], amount: Math.abs(val), description: desc.trim() });
  }

  const pdfPath = '/home/carlo/Projetos/Pessoal/finances-sheet/extratos_exemplos/Bradesco/2023.pdf';
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await pdfjs.getDocument({ data }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    fullText += textContent.items.map((item) => item.str).join(" ") + "\n";
  }
  const pdfTxs = parseBrasilPdfText(fullText);

  console.log(`CSV Txs: ${csvTxs.length}, PDF Txs: ${pdfTxs.length}`);
  
  // Find which CSV Txs are missing from PDF
  const missing = csvTxs.filter(ctx => {
    return !pdfTxs.some(ptx => Math.abs(ptx.amount - ctx.amount) < 0.01);
  });

  console.log(`\nMissing from PDF (${missing.length}):`);
  missing.forEach(m => console.log(`${m.date} | ${m.amount} | ${m.description}`));
}

reconcile().catch(console.error);
