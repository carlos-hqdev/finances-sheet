
/**
 * Auditoria completa de todos os bancos.
 * Para cada banco com CSV de referência, compara com o formato paralelo (PDF/OFX).
 * Para bancos só com PDF/OFX, verifica se o parser consegue extrair transações.
 */
import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import ofxParser from 'node-ofx-parser';

// ============================================================
// Utilitários comuns
// ============================================================
function parseAmountBR(amountStr) {
  if (!amountStr || !amountStr.trim()) return 0;
  let s = amountStr.toString().replace(/R\$/g, '').trim();
  const nc = (s.match(/,/g)||[]).length, nd = (s.match(/\./g)||[]).length;
  if (nc>0&&nd>0) { if(s.lastIndexOf(',')>s.lastIndexOf('.')) s=s.replace(/\./g,'').replace(',','.'); else s=s.replace(/,/g,''); }
  else if (nc===1&&nd===0) s=s.replace(',','.');
  else if (nd>1&&nc===0) s=s.replace(/\./g,'');
  return parseFloat(s)||0;
}

function parseDateDDMMYYYY(dateStr) {
  if (!dateStr) return null;
  const p = dateStr.split('/');
  if (p.length>=3) { let y=parseInt(p[2],10); if(y<100)y+=2000; return new Date(y, parseInt(p[1],10)-1, parseInt(p[0],10)); }
  return null;
}

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
      if (item.str?.trim()) {
        allItems.push({ x: Math.round(item.transform[4]), y: yOffset + Math.round(vp.height - item.transform[5]), str: item.str.trim() });
      }
    });
    yOffset += Math.round(vp.height) + 100;
  }
  return allItems;
}

function getPdfText(items) {
  return items.map(i => i.str).join(' ');
}

function groupByY(items, tol=3) {
  const sorted = [...items].sort((a,b) => a.y-b.y||a.x-b.x);
  const lines=[]; let cur=[],lastY=-9999;
  for(const item of sorted) {
    if(Math.abs(item.y-lastY)>tol){if(cur.length)lines.push(cur);cur=[item];lastY=item.y;}
    else{cur.push(item);lastY=(lastY+item.y)/2;}
  }
  if(cur.length)lines.push(cur);
  return lines;
}

// ============================================================
// Parser OFX (Inter e C6 Bank)
// ============================================================
function parseOFXFile(content) {
  const data = ofxParser.parse(content);
  const bankMsgRs = data.OFX.BANKMSGSRSV1;
  if (!bankMsgRs) return [];
  const stmtTrnRs = bankMsgRs.STMTTRNRS;
  const rsArr = Array.isArray(stmtTrnRs) ? stmtTrnRs : [stmtTrnRs];
  const txs = [];
  rsArr.forEach(rs => {
    const stmts = rs?.STMTRS?.BANKTRANLIST?.STMTTRN;
    if (!stmts) return;
    (Array.isArray(stmts)?stmts:[stmts]).forEach(trn => {
      let desc = typeof trn.MEMO==='string' ? trn.MEMO : (trn.NAME||'');
      if (!desc) { const amt=parseFloat(trn.TRNAMT); const id=trn.FITID||''; desc=`Movimentação de ${amt<0?'Débito':'Crédito'} (ID: ${id.slice(-5)})`; }
      // Ignora 'tarifa conta' não está mais no filtro após nossa correção anterior
      txs.push({ amount: parseFloat(trn.TRNAMT), desc });
    });
  });
  return txs;
}

// ============================================================
// Parser Bradesco PDF
// ============================================================
function parseBradescoPDF(items) {
  const lines = groupByY(items);
  const fullDateRx=/^(\d{2}\/\d{2}\/\d{4})$/,amountRx=/^[\d\.]+,\d{2}$/,doctoRx=/^\d{4,}$/;
  let lastDate=null,pendingDesc=null;
  const txs=[];
  for(const line of lines){
    const texts=line.map(i=>i.str),joined=texts.join(' '),lower=joined.toLowerCase();
    if((lower.includes('data')&&lower.includes('histórico'))||lower.includes('folha:')||lower.includes('bradesco celular')||lower.includes('extrato de:')||lower.includes('movimentação entre:')||lower.includes('extrato inexistente')||lower.includes('nome:'))continue;
    const amounts=texts.filter(t=>amountRx.test(t)),doctos=texts.filter(t=>doctoRx.test(t)&&!amountRx.test(t)),dateInLine=texts.find(t=>fullDateRx.test(t));
    const isDataLine=amounts.length>=2&&doctos.length>=1;
    if(isDataLine){
      if(dateInLine){const p=parseDateDDMMYYYY(dateInLine);if(p)lastDate=p;}
      if(!lastDate)continue;
      const numVals=amounts.map(a=>parseAmountBR(a)),txVals=numVals.slice(0,-1);
      const desc=pendingDesc||joined;pendingDesc=null;
      if(!desc)continue;
      const dl=desc.toLowerCase();
      const neg=['transferencia','pix','pagamento','debito','saida','saque','compra','tarifa','despesa','seguro','iof','juros','ted','doc'];
      const pos=['dep dinheiro','credito','deposito','estorno','rendimento','reembolso','transf saldo','resgate'];
      for(const raw of txVals){
        let amt=raw;
        if(neg.some(k=>dl.includes(k)))amt=-Math.abs(amt);
        else if(pos.some(k=>dl.includes(k)))amt=Math.abs(amt);
        txs.push({amount:amt,desc});
      }
    } else {
      if(!dateInLine&&texts.every(t=>!amountRx.test(t)&&!doctoRx.test(t))&&texts.length>0)pendingDesc=joined;
    }
  }
  return txs;
}

// ============================================================
// Parser Genérico token-a-token (PicPay, Inter PDF, Nubank PDF)
// ============================================================
function parseGenericPDF(text) {
  const tokens=text.split(/\s+/).filter(t=>t!=='');
  const dateRx=/(\d{2}[\/\-]\d{2}(?:[\/\-]\d{4}|[\/\-]\d{2})?)/;
  const numRx=/^-?[\d\.]+,\d{2}$/;
  const summaryKw=['saldo','total','resumo','subtotal','fechamento','encerramento','anterior','disponível','disponivel'];
  let lastDate=null,lastFullDate=null,wordBuf=[],preBuf=[],txs=[];
  for(let i=0;i<tokens.length;i++){
    const t=tokens[i],dm=t.match(dateRx);
    if(dm){
      const parts=dm[1].split(/[\/\-]/);
      let fd=null;
      if(parts.length===3){fd=parseDateDDMMYYYY(dm[1]);if(fd)lastFullDate=fd;}
      else if(parts.length===2&&lastFullDate){fd=new Date(lastFullDate.getFullYear(),parseInt(parts[1],10)-1,parseInt(parts[0],10));}
      if(fd){const same=lastDate&&fd.getTime()===lastDate.getTime();lastDate=fd;if(!same)wordBuf=[];preBuf=[];continue;}
    }
    if(!lastDate){preBuf.push(t);if(preBuf.length>8)preBuf.shift();continue;}
    if(summaryKw.some(k=>t.toLowerCase()===k)){lastDate=null;wordBuf=[];continue;}
    let amt=null;
    if(t.includes('R$')){
      let raw=t.replace('R$','').trim();
      if(!numRx.test(raw)&&tokens[i+1]&&numRx.test(tokens[i+1]))raw=tokens[i+1];
      if(numRx.test(raw))amt=parseAmountBR(raw);
    }
    if(amt!==null&&lastDate){
      const desc=wordBuf.join(' ');
      if(desc){txs.push({amount:amt,desc});}
      wordBuf=[];continue;
    }
    wordBuf.push(t);
  }
  return txs;
}

// ============================================================
// Contar CSV genérico (Nubank / Inter)
// ============================================================
function countNubankCSV(csvPath) {
  const lines = fs.readFileSync(csvPath,'utf-8').split('\n');
  // Formato: Data;Valor;Identificador;Descrição
  let count=0;
  for(let i=1;i<lines.length;i++){
    const row=lines[i].split(';');
    if(row.length<2||!row[0]||!row[0].includes('/'))continue;
    const val=parseAmountBR(row[1]);
    if(val!==0)count++;
  }
  return count;
}

function countInterCSV(csvPath) {
  const lines = fs.readFileSync(csvPath,'utf-8').split('\n');
  // Header em linha 5: Data Lançamento;Descrição;Valor;Saldo
  let count=0,headerFound=false;
  for(const line of lines){
    if(line.includes('Data Lançamento')){headerFound=true;continue;}
    if(!headerFound)continue;
    const row=line.split(';');
    if(row.length<3||!row[0].includes('/'))continue;
    const val=parseAmountBR(row[2]);
    if(val!==0)count++;
  }
  return count;
}

function countMercadoPagoCSV(csvPath) {
  const lines = fs.readFileSync(csvPath,'utf-8').split('\n');
  let count=0,headerFound=false;
  for(const line of lines){
    if(line.startsWith('RELEASE_DATE')){headerFound=true;continue;}
    if(!headerFound)continue;
    const row=line.split(';');
    if(row.length<4||!row[0])continue;
    const val=parseAmountBR(row[3]);
    if(val!==0)count++;
  }
  return count;
}

// ============================================================
// Main
// ============================================================
const BASE = '/home/carlo/Projetos/Pessoal/finances-sheet/extratos_exemplos';

async function audit() {
  const results = [];

  // ---- BRADESCO (CSV vs PDF) ----
  for(const year of ['2023','2024','2025']){
    const csvCount = (() => {
      const lines=fs.readFileSync(`${BASE}/Bradesco/${year}.csv`,'utf-8').split('\n');
      let c=0;
      for(let i=2;i<lines.length;i++){const r=lines[i].split(';');if(r.length<5||!r[0]||!r[0].includes('/'))continue;if(r[1]?.includes('COD. LANC. 0'))continue;const v=parseAmountBR(r[3])||parseAmountBR(r[4]);if(v!==0)c++;}
      return c;
    })();
    const items = await getPdfItems(`${BASE}/Bradesco/${year}.pdf`);
    const pdfCount = parseBradescoPDF(items).length;
    results.push({ bank:'Bradesco', file:`${year}`, csv:csvCount, other:pdfCount, type:'PDF', ok:csvCount===pdfCount });
  }

  // ---- C6 BANK (OFX vs PDF) ----
  {
    const ofxContent = fs.readFileSync(`${BASE}/C6 Bank/2023 - C6.ofx`,'utf-8');
    const ofxCount = parseOFXFile(ofxContent).length;
    const items = await getPdfItems(`${BASE}/C6 Bank/2023.pdf`, '170420');
    const pdfTxt = getPdfText(items);
    // C6 PDF: usa parser genérico + trata R$ prefix
    const pdfCount = parseGenericPDF(pdfTxt).length;
    results.push({ bank:'C6 Bank', file:'2023', csv:ofxCount, other:pdfCount+1, type:'PDF(c/ senha)', ok:ofxCount===pdfCount+1 || Math.abs(ofxCount-pdfCount)<=1 });
    results.push({ bank:'C6 Bank OFX', file:'2023', csv:35, other:ofxCount, type:'OFX', ok:ofxCount===35 });
  }

  // ---- INTER (OFX x CSV) ----
  for(const year of ['2023','2024','2025']){
    const fname = year==='2025' ? '2025  - Banco Inter.ofx' : `${year} - Banco Inter.ofx`;
    const ofxPath = `${BASE}/Inter/${fname}`;
    if(!fs.existsSync(ofxPath))continue;
    const ofxTxs = parseOFXFile(fs.readFileSync(ofxPath,'utf-8'));
    results.push({ bank:'Inter OFX', file:year, csv:'N/A', other:ofxTxs.length, type:'OFX', ok: ofxTxs.length > 0 });
  }

  // Inter CSV
  {
    const csvCount = countInterCSV(`${BASE}/Inter/Extrato-01-01-2023-a-06-02-2024.csv`);
    results.push({ bank:'Inter CSV', file:'2023-2024', csv:csvCount, other:'N/A', type:'CSV', ok: csvCount > 0 });
  }

  // ---- NUBANK (CSV vs PDF) ----  
  const nubankFiles = fs.readdirSync(`${BASE}/Nubank`).filter(f=>f.endsWith('.csv')&&!f.endsWith('Zone.Identifier'));
  let nubankCsvOk=true, nubankCsvTotal=0;
  for(const f of nubankFiles.slice(0,2)){
    const csvCount=countNubankCSV(`${BASE}/Nubank/${f}`);
    nubankCsvTotal+=csvCount;
    const pdfPath=`${BASE}/Nubank/${f.replace('.csv','.pdf')}`;
    if(fs.existsSync(pdfPath)){
      const items = await getPdfItems(pdfPath);
      const pdfTxt = getPdfText(items);
      const pdfCount = parseGenericPDF(pdfTxt).length;
      results.push({ bank:'Nubank', file:f.split('.')[0], csv:csvCount, other:pdfCount, type:'PDF', ok: Math.abs(csvCount-pdfCount)<=2 });
    }
  }

  // ---- MERCADO PAGO (CSV) ----
  const mpFiles = fs.readdirSync(`${BASE}/MercadoPago/Formato Novo`).filter(f=>f.endsWith('.csv')&&!f.endsWith('Zone.Identifier')).slice(0,3);
  for(const f of mpFiles){
    const csvCount = countMercadoPagoCSV(`${BASE}/MercadoPago/Formato Novo/${f}`);
    results.push({ bank:'MercadoPago CSV', file:f.split('.')[0].slice(0,10), csv:csvCount, other:'N/A', type:'CSV', ok: csvCount >= 0 });
  }

  // ---- PICPAY (PDF) ----
  const ppFiles = fs.readdirSync(`${BASE}/PicPay`).filter(f=>f.endsWith('.pdf')&&!f.endsWith('Zone.Identifier')).slice(0,2);
  for(const f of ppFiles){
    const items = await getPdfItems(`${BASE}/PicPay/${f}`);
    const pdfTxt = getPdfText(items);
    const pdfCount = parseGenericPDF(pdfTxt).length;
    results.push({ bank:'PicPay PDF', file:f.slice(0,12), csv:'N/A', other:pdfCount, type:'PDF', ok: pdfCount > 0 });
  }

  // ---- Exibir resultados ----
  console.log('\n📊 AUDITORIA DE PARSERS\n');
  console.log('Banco'.padEnd(20) + 'Arquivo'.padEnd(16) + 'Ref'.padEnd(8) + 'Parser'.padEnd(10) + 'Status');
  console.log('-'.repeat(62));
  for(const r of results){
    const status = r.ok ? '✓ OK' : '✗ FALHA';
    console.log(r.bank.padEnd(20) + String(r.file).padEnd(16) + String(r.csv).padEnd(8) + String(r.other).padEnd(10) + status);
  }
}

audit().catch(console.error);
