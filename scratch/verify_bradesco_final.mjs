
import fs from 'fs';
import { parseBrasilPdfText } from '../src/shared/lib/parsers/pdf-parser.ts';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

async function verifyBradesco() {
  const pdfPath = '/home/carlo/Projetos/Pessoal/finances-sheet/extratos_exemplos/Bradesco/2023.pdf';
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

  const transactions = parseBrasilPdfText(fullText);
  
  console.log(`Bradesco 2023 PDF - Transactions found: ${transactions.length}`);
  
  // Mostrar inconsistências se houver (alvo é 42)
  if (transactions.length === 42) {
    console.log("SUCCESS: Both PDF and CSV now detect 42 transactions!");
  } else {
    console.log(`STILL INCONSISTENT: Expected 42, got ${transactions.length}`);
    transactions.forEach(t => {
       console.log(`${t.date.toISOString().split('T')[0]} | ${t.amount} | ${t.description}`);
    });
  }
}

verifyBradesco().catch(console.error);
