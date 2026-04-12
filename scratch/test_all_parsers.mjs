import fs from 'fs';

async function init() {
    const csvMod = await import('../src/shared/lib/parsers/csv-parser.ts');
    const ofxMod = await import('../src/shared/lib/parsers/ofx-parser.ts');
    const pdfMod = await import('../src/shared/lib/parsers/pdf-parser.ts');
    return { csvMod, ofxMod, pdfMod };
}

async function testAll() {
  const { csvMod, ofxMod, pdfMod } = await init();
  const base = '/home/carlo/Projetos/Pessoal/finances-sheet/extratos_exemplos';
  
  // Nubank
  console.log('--- NUBANK ---');
  let nubankCSV = fs.readFileSync(base + '/Nubank/202301 - Janeiro 2023.csv', 'utf8');
  let nubankPDF = fs.readFileSync(base + '/Nubank/202301 - Janeiro 2023.pdf');
  
  let nuCsvTxs = await csvMod.parseCSV(nubankCSV);
  let nuPdfTxs = await pdfMod.parsePdfFile(nubankPDF.buffer);
  console.log('Nubank CSV:', nuCsvTxs.length, 'Nubank PDF:', nuPdfTxs.length);

  // C6 Bank
  console.log('--- C6 BANK ---');
  let c6OFX = fs.readFileSync(base + '/C6 Bank/2023 - C6.ofx', 'utf8');
  let c6PDF = fs.readFileSync(base + '/C6 Bank/2023.pdf');
  
  let c6OfxTxs = ofxMod.parseOFX(c6OFX);
  let c6PdfTxs = await pdfMod.parsePdfFile(c6PDF.buffer, undefined, '170420');
  console.log('C6 OFX:', c6OfxTxs.length, 'C6 PDF:', c6PdfTxs.length);

  // Inter
  console.log('--- INTER ---');
  let interCSV = fs.readFileSync(base + '/Inter/Extrato-01-01-2023-a-06-02-2024.csv', 'utf8');
  let interPDF = fs.readFileSync(base + '/Inter/Extrato-01-01-2023-a-06-02-2024.pdf');
  let interOFX = fs.readFileSync(base + '/Inter/2023 - Banco Inter.ofx', 'utf8');
  
  let interCsvTxs = await csvMod.parseCSV(interCSV);
  let interPdfTxs = await pdfMod.parsePdfFile(interPDF.buffer);
  let interOfxTxs = ofxMod.parseOFX(interOFX);
  console.log('Inter CSV:', interCsvTxs.length, 'Inter PDF:', interPdfTxs.length, 'Inter OFX:', interOfxTxs.length);

  // PicPay
  console.log('--- PICPAY ---');
  let picpayPDF = fs.readFileSync(base + '/PicPay/202509 - Setembro 2025.pdf');
  let picpayPdfTxs = await pdfMod.parsePdfFile(picpayPDF.buffer);
  console.log('PicPay PDF:', picpayPdfTxs.length);

  // Bradesco
  console.log('--- BRADESCO ---');
  let bradescoCSV = fs.readFileSync(base + '/Bradesco/2023.csv', 'utf8');
  let bradescoPDF = fs.readFileSync(base + '/Bradesco/2023.pdf');
  let bradescoCsvTxs = await csvMod.parseCSV(bradescoCSV);
  let bradescoPdfTxs = await pdfMod.parsePdfFile(bradescoPDF.buffer);
  console.log('Bradesco CSV:', bradescoCsvTxs.length, 'Bradesco PDF:', bradescoPdfTxs.length);

  // MercadoPago
  console.log('--- MERCADO PAGO ---');
  let mpCSV = fs.readFileSync(base + '/MercadoPago/Formato Novo/202404 - Abril.csv', 'utf8');
  let mpPDF = fs.readFileSync(base + '/MercadoPago/Formato Novo/202404 - Abril.pdf');
  let mpCsvTxs = await csvMod.parseCSV(mpCSV);
  let mpPdfTxs = await pdfMod.parsePdfFile(mpPDF.buffer);
  console.log('MercadoPago CSV:', mpCsvTxs.length, 'MercadoPago PDF:', mpPdfTxs.length);

}
testAll().catch(console.error);
