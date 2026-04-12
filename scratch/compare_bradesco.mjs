
import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

// Funções mockadas do csv-parser.ts para teste local
function parseDateDDMMYYYY(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length >= 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    return new Date(year, month, day);
  }
  return null;
}

function parseAmountBR(amountStr) {
  if (!amountStr || amountStr.trim() === '') return 0;
  let cleanStr = amountStr.toString().replace(/R\$/g, '').replace(/\./g, '').replace(',', '.').trim();
  const val = parseFloat(cleanStr);
  return isNaN(val) ? 0 : val;
}

// Lógica Bradesco CSV
async function testBradescoCSV(csvPath) {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n');
  const transactions = [];
  
  // Linha 2 tem headers: Data;Histórico;Docto.;Crédito (R$);Débito (R$);Saldo (R$)
  for (let i = 2; i < lines.length; i++) {
    const row = lines[i].split(';');
    if (row.length < 5) continue;
    const dateStr = row[0];
    if (!dateStr || !dateStr.includes('/')) continue;
    
    // Ignorar saldo anterior e totais como no código original
    const desc = row[1] || "";
    if (desc.toLowerCase().includes("saldo anterior") || desc.toLowerCase().includes("total")) continue;
    if (desc.includes("COD. LANC. 0")) continue; // Ruído comum

    const creditStr = row[3] || '';
    const debitStr = row[4] || '';
    
    let amount = 0;
    if (creditStr.trim() !== '' && creditStr.trim() !== '0,00') {
      amount = parseAmountBR(creditStr);
    } else if (debitStr.trim() !== '' && debitStr.trim() !== '0,00') {
      amount = -Math.abs(parseAmountBR(debitStr));
    } else {
      continue;
    }

    transactions.push({ date: dateStr, amount, description: desc });
  }
  return transactions;
}

// Lógica PDF genérica (similar ao pdf-parser.ts)
async function testBradescoPDF(pdfPath) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;

  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(" ");
    fullText += pageText + "\n";
  }

  const transactions = [];
  const tokens = fullText.split(/\s+/).filter(t => t !== '');
  
  const dateRegex = /(\d{2}\/\d{2}\/\d{4})/;
  const numericValueRegex = /^-?[\d\.]+,\d{2}$/;

  let lastDate = null;
  let wordBuffer = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const dateMatch = token.match(dateRegex);
    
    if (dateMatch) {
      lastDate = dateMatch[1];
      wordBuffer = [];
      continue;
    }

    if (!lastDate) continue;

    let amount = null;
    if (numericValueRegex.test(token)) {
      amount = parseAmountBR(token);
      // Bradesco PDF costuma ter indicadores de C (crédito) ou D (débito) próximos ao valor?
      // Ou usamos a mesma lógica de palavras-chave do parser original.
    }

    if (amount !== null && lastDate) {
      const description = wordBuffer.join(' ');
      
      // Lógica de sinal simplificada (igual ao pdf-parser.ts atual)
      const descLower = description.toLowerCase();
      if (descLower.includes('transferencia') || descLower.includes('pix') || descLower.includes('saida')) {
          // No Bradesco precisamos ter cuidado com o sinal.
      }

      transactions.push({ date: lastDate, amount, description });
      lastDate = null;
      wordBuffer = [];
      continue;
    }
    wordBuffer.push(token);
  }
  return transactions;
}

async function run() {
  const csvPath = '/home/carlo/Projetos/Pessoal/finances-sheet/extratos_exemplos/Bradesco/2023.csv';
  const pdfPath = '/home/carlo/Projetos/Pessoal/finances-sheet/extratos_exemplos/Bradesco/2023.pdf';

  const csvTxs = await testBradescoCSV(csvPath);
  const pdfTxs = await testBradescoPDF(pdfPath);

  console.log(`Bradesco 2023 - CSV Transactions: ${csvTxs.length}`);
  console.log(`Bradesco 2023 - PDF Transactions: ${pdfTxs.length}`);
}

run().catch(console.error);
