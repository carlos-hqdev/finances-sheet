
import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

async function testC6() {
  const data = new Uint8Array(fs.readFileSync('/home/carlo/Projetos/Pessoal/finances-sheet/extratos_exemplos/C6 Bank/2023.pdf'));
  const password = '170420';
  const pdf = await pdfjs.getDocument({ data, password }).promise;
  
  const allLines = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    const vp = page.getViewport({ scale: 1 });
    
    const byY = {};
    tc.items.forEach(item => {
      const y = Math.round(vp.height - item.transform[5]);
      if (!byY[y]) byY[y] = [];
      byY[y].push({ x: Math.round(item.transform[4]), str: item.str.trim() });
    });
    
    const sortedYs = Object.keys(byY).map(Number).sort((a,b) => a - b);
    for (const y of sortedYs) {
      allLines.push(byY[y].sort((a,b)=>a.x-b.x).map(i=>i.str).join(' '));
    }
  }

  // Lógica simples de detecção para listar o que estamos pegando
  const dateRegex = /(\d{2}\/\d{2}(\/\d{4})?)/;
  const amountRegex = /(\d{1,3}(\.\d{3})*,\d{2})/;
  
  console.log("DETECÇÕES POSSÍVEIS:");
  let count = 0;
  allLines.forEach(line => {
    if (line.match(dateRegex) && line.match(amountRegex)) {
      count++;
      console.log(`${count}. [${line}]`);
    }
  });

  console.log(`\nTOTAL POTENCIAL: ${count}`);
}

testC6().catch(console.error);
