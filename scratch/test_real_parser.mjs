import fs from 'fs';

async function init() {
    const pdfMod = await import('../src/shared/lib/parsers/pdf-parser.ts');
    return pdfMod;
}

async function run() {
  const pdfMod = await init();
  const pdfPath = '/home/carlo/Projetos/Pessoal/finances-sheet/extratos_exemplos/Nubank/202505 - Maio 2025.pdf';
  const data = fs.readFileSync(pdfPath).buffer;
  
  const txs = await pdfMod.parsePdfFile(data);
  console.log("Parsed using SRC:", txs.length);
}
run().catch(console.error);
