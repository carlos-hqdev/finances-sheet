import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

async function getPdfItems(pdfPath, password) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await pdfjs.getDocument({ data, password }).promise;
  const allItems = [];
  let yOffset = 0;
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    const vp = page.getViewport({ scale: 1 });
    tc.items.forEach(item => {
      if (item.str?.trim()) allItems.push({ x: Math.round(item.transform[4]), y: yOffset + Math.round(vp.height - item.transform[5]), str: item.str.trim() });
    });
    yOffset += Math.round(vp.height) + 100;
    console.log(`Page ${i} loaded`);
  }
  return allItems;
}

getPdfItems('/home/carlo/Projetos/Pessoal/finances-sheet/extratos_exemplos/Nubank/202405 - Maio 2024.pdf').then(items => {
  console.log(`Extracted ${items.length} items`);
}).catch(err => {
  console.error("PDF Parse error: ", err);
});
