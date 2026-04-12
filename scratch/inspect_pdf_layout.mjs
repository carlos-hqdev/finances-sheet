
import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

async function main() {
  const pdfPath = process.argv[2];
  const password = process.argv[3];
  
  if (!pdfPath) {
    console.error('Uso: node inspect_pdf_layout.mjs <caminho_pdf> [senha]');
    process.exit(1);
  }

  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await pdfjs.getDocument({ data, password }).promise;
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1 });
    
    console.log(`\n===== PÁGINA ${pageNum} =====`);
    const byY = {};
    textContent.items.forEach(item => {
      const y = Math.round(viewport.height - item.transform[5]);
      if (!byY[y]) byY[y] = [];
      byY[y].push({ x: Math.round(item.transform[4]), str: item.str });
    });
    
    const sortedYs = Object.keys(byY).map(Number).sort((a,b) => a - b);
    for (const y of sortedYs) {
      const items = byY[y].sort((a, b) => a.x - b.x);
      const line = items.map(i => `[${i.str}]`).join(' ');
      console.log(line);
    }
  }
}

main().catch(console.error);
