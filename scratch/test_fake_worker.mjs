import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

async function testWorker() {
  const data = new Uint8Array(fs.readFileSync('/home/carlo/Projetos/Pessoal/finances-sheet/extratos_exemplos/Nubank/202405 - Maio 2024.pdf'));
  
  try {
     console.log("Not setting workerSrc");
     const pdf = await pdfjs.getDocument({ data }).promise;
     console.log("Pages:", pdf.numPages);
  } catch (err) {
     console.log("Failed:", err);
  }
}
testWorker();
