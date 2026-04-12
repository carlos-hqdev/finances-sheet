
import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

async function main() {
  const pdfPath = '/home/carlo/Projetos/Pessoal/finances-sheet/extratos_exemplos/Bradesco/2023.pdf';
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await pdfjs.getDocument({ data }).promise;
  
  // Extrair texto preservando a posição para entender o layout
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    console.log(`\n===== PÁGINA ${pageNum} =====`);
    // Agrupar por linha (mesma posição Y)
    const byY = {};
    textContent.items.forEach(item => {
      const y = Math.round(item.transform[5]);
      if (!byY[y]) byY[y] = [];
      byY[y].push({ x: Math.round(item.transform[4]), str: item.str });
    });
    
    // Ordenar por Y decrescente (topo para baixo) e X crescente
    const sortedYs = Object.keys(byY).map(Number).sort((a,b) => b - a);
    for (const y of sortedYs) {
      const items = byY[y].sort((a, b) => a.x - b.x);
      const line = items.map(i => `[${i.str}]`).join(' ');
      console.log(line);
    }
  }
}

main().catch(console.error);
