
import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

async function debugTokens() {
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
  
  const tokens = fullText.split(/\s+/).filter(t => t !== '');
  let print = false;
  for (const t of tokens) {
    if (t.includes('30/03/2023')) print = true;
    if (print) {
      console.log(`[${t}]`);
    }
    if (print && t.includes('0,00')) {
       // Stop after some tokens
       // print = false;
    }
  }
}

debugTokens().catch(console.error);
