
import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import ofxParser from 'node-ofx-parser';

function parseAmountBR(amountStr) {
  if (!amountStr || !amountStr.trim()) return 0;
  let s = amountStr.toString().replace(/R\$/g, '').replace(/[+\-]/, '').trim();
  const nc = (s.match(/,/g)||[]).length, nd = (s.match(/\./g)||[]).length;
  if (nc>0&&nd>0) { if(s.lastIndexOf(',')>s.lastIndexOf('.')) s=s.replace(/\./g,'').replace(',','.'); else s=s.replace(/,/g,''); }
  else if (nc===1&&nd===0) s=s.replace(',','.');
  else if (nd>1&&nc===0) s=s.replace(/\./g,'');
  return parseFloat(s)||0;
}

function parseDateDDMMYYYY(dateStr) {
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
      if (item.str?.trim()) allItems.push({ x: Math.round(item.transform[4]), y: yOffset + Math.round(vp.height - item.transform[5]), str: item.str.trim() });
    });
    yOffset += Math.round(vp.height) + 100;
  }
  return allItems;
}

function groupByY(items, tol=3) {
  const sorted=[...items].sort((a,b)=>a.y-b.y||a.x-b.x);
  const lines=[]; let cur=[],lastY=-9999;
  for(const item of sorted){
    if(Math.abs(item.y-lastY)>tol){if(cur.length)lines.push(cur);cur=[item];lastY=item.y;}
    else{cur.push(item);lastY=(lastY+item.y)/2;}
  }
  if(cur.length)lines.push(cur); return lines;
}

function parseOFXFile(content) {
  const data=ofxParser.parse(content);
  const stmts=data.OFX?.BANKMSGSRSV1?.STMTTRNRS;
  if(!stmts)return[];
  const arr=Array.isArray(stmts)?stmts:[stmts];
  const txs=[];
  arr.forEach(rs=>{
    const trns=rs?.STMTRS?.BANKTRANLIST?.STMTTRN;
    if(!trns)return;
    (Array.isArray(trns)?trns:[trns]).forEach(t=>{
      let desc=typeof t.MEMO==='string'?t.MEMO:(t.NAME||'');
      if(!desc){const amt=parseFloat(t.TRNAMT);const id=t.FITID||'';desc=`Mov ${amt<0?'Déb':'Créd'} (${id.slice(-5)})`;}
      txs.push({amount:parseFloat(t.TRNAMT),desc});
    });
  });
  return txs;
}

function parseBradescoPDF(items) {
  const lines=groupByY(items);
  const fdr=/^(\d{2}\/\d{2}\/\d{4})$/,amr=/^[\d\.]+,\d{2}$/,docr=/^\d{4,}$/;
  let ld=null,pd=null; const txs=[];
  for(const line of lines){
    const ts=line.map(i=>i.str),j=ts.join(' '),lo=j.toLowerCase();
    if((lo.includes('data')&&lo.includes('histórico'))||lo.includes('folha:')||lo.includes('bradesco celular')||lo.includes('extrato de:')||lo.includes('movimentação entre:')||lo.includes('extrato inexistente')||lo.includes('nome:'))continue;
    const ams=ts.filter(t=>amr.test(t)),dc=ts.filter(t=>docr.test(t)&&!amr.test(t)),din=ts.find(t=>fdr.test(t));
    if(ams.length>=2&&dc.length>=1){
      if(din){const p=parseDateDDMMYYYY(din);if(p)ld=p;}
      if(!ld)continue;
      const nv=ams.map(a=>parseAmountBR(a)),tv=nv.slice(0,-1);
      const desc=pd||j;pd=null;if(!desc)continue;
      const dl=desc.toLowerCase();
      const neg=['transferencia','pix','pagamento','debito','saida','saque','compra','tarifa','despesa','seguro','iof','juros','ted','doc'];
      const pos=['dep dinheiro','credito','deposito','estorno','rendimento','reembolso','transf saldo','resgate'];
      for(const raw of tv){let amt=raw;if(neg.some(k=>dl.includes(k)))amt=-Math.abs(amt);else if(pos.some(k=>dl.includes(k)))amt=Math.abs(amt);txs.push({amount:amt,desc});}
    }else if(!din&&ts.every(t=>!amr.test(t)&&!docr.test(t))&&ts.length>0)pd=j;
  }
  return txs;
}

const MONTH_MAP = {JAN:0,FEV:1,MAR:2,ABR:3,MAI:4,JUN:5,JUL:6,AGO:7,SET:8,OUT:9,NOV:10,DEZ:11};

function parseNubankPDF(items) {
  const lines=groupByY(items);
  const ndRx=/^(\d{1,2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+(\d{4})$/i;
  const amRx=/^[\d\.]+,\d{2}$/,samRx=/^[+\-][\d\.]+,\d{2}$/;
  let curDate=null,curSign=1; const txs=[];
  const skipKw=['SALDO INICIAL','SALDO FINAL','RENDIMENTO','OUVIDORIA','CNPJ','VALORES EM R$','EXTRATO GERADO','NÃO NOS','ASSEGURAMOS','NU PAGAMENTOS','NU FINANCEIRA','MOVIMENTAÇÕES'];
  for(const line of lines){
    const texts=line.map(i=>i.str),j=texts.join(' ').trim(),u=j.toUpperCase();
    if(skipKw.some(k=>u.includes(k))||j.match(/^\d+ de \d+$/))continue;
    const dm=u.match(ndRx);
    if(dm){const mo=MONTH_MAP[dm[2].toUpperCase()];if(mo!==undefined)curDate=new Date(parseInt(dm[3],10),mo,parseInt(dm[1],10));continue;}
    if(u.includes('TOTAL DE ENTRADAS')){curSign=1;continue;}
    if(u.includes('TOTAL DE SA')){curSign=-1;continue;}
    if(!curDate)continue;
    const vt=texts.find(t=>amRx.test(t)||samRx.test(t));
    if(!vt)continue;
    const desc=texts.filter(t=>t!==vt&&!samRx.test(t)).join(' ').trim();
    if(!desc)continue;
    txs.push({amount:curSign*parseAmountBR(vt),desc});
  }
  return txs;
}

function countNubankCSV(csvPath) {
  const lines=fs.readFileSync(csvPath,'utf-8').split('\n');
  let c=0;
  for(let i=1;i<lines.length;i++){const r=lines[i].split(';');if(r.length<2||!r[0]||!r[0].includes('/'))continue;if(parseAmountBR(r[1])!==0)c++;}
  return c;
}

const BASE='/home/carlo/Projetos/Pessoal/finances-sheet/extratos_exemplos';

async function audit() {
  const res=[];

  // Bradesco
  for(const yr of ['2023','2024','2025']){
    const csvLines=fs.readFileSync(`${BASE}/Bradesco/${yr}.csv`,'utf-8').split('\n');
    let cc=0;for(let i=2;i<csvLines.length;i++){const r=csvLines[i].split(';');if(r.length<5||!r[0]||!r[0].includes('/'))continue;if(r[1]?.includes('COD. LANC. 0'))continue;const v=parseAmountBR(r[3])||parseAmountBR(r[4]);if(v!==0)cc++;}
    const items=await getPdfItems(`${BASE}/Bradesco/${yr}.pdf`);
    const pc=parseBradescoPDF(items).length;
    res.push({bank:'Bradesco',file:yr,ref:cc,parsed:pc,ok:cc===pc});
  }

  // C6 Bank OFX
  {
    const oc=parseOFXFile(fs.readFileSync(`${BASE}/C6 Bank/2023 - C6.ofx`,'utf-8')).length;
    res.push({bank:'C6 Bank OFX',file:'2023',ref:35,parsed:oc,ok:oc===35});
  }

  // Inter OFX
  for(const yr of ['2023','2024','2025']){
    const fn=yr==='2025'?'2025  - Banco Inter.ofx':`${yr} - Banco Inter.ofx`;
    if(!fs.existsSync(`${BASE}/Inter/${fn}`))continue;
    const oc=parseOFXFile(fs.readFileSync(`${BASE}/Inter/${fn}`,'utf-8')).length;
    res.push({bank:'Inter OFX',file:yr,ref:'N/A',parsed:oc,ok:oc>0});
  }

  // Nubank (CSV vs PDF) — os 2 primeiros arquivos
  const nFiles=fs.readdirSync(`${BASE}/Nubank`).filter(f=>f.endsWith('.csv')&&!f.endsWith('Zone.Identifier')).slice(0,4);
  for(const f of nFiles){
    const cc=countNubankCSV(`${BASE}/Nubank/${f}`);
    const pdfPath=`${BASE}/Nubank/${f.replace('.csv','.pdf')}`;
    if(!fs.existsSync(pdfPath)){res.push({bank:'Nubank CSV',file:f.slice(0,16),ref:cc,parsed:'N/A',ok:cc>0});continue;}
    const items=await getPdfItems(pdfPath);
    const pc=parseNubankPDF(items).length;
    res.push({bank:'Nubank',file:f.slice(0,16),ref:cc,parsed:pc,ok:cc===pc||(Math.abs(cc-pc)<=2&&cc>0)});
  }

  // MercadoPago CSV (só verifica se lê sem erro)
  const mpFiles=fs.readdirSync(`${BASE}/MercadoPago/Formato Novo`).filter(f=>f.endsWith('.csv')&&!f.endsWith('Zone.Identifier')).slice(0,3);
  for(const f of mpFiles){
    const lines=fs.readFileSync(`${BASE}/MercadoPago/Formato Novo/${f}`,'utf-8').split('\n');
    let c=0,hf=false;
    for(const l of lines){if(l.startsWith('RELEASE_DATE')){hf=true;continue;}if(!hf)continue;const r=l.split(';');if(r.length<4||!r[0])continue;if(parseAmountBR(r[3])!==0)c++;}
    res.push({bank:'MercadoPago CSV',file:f.slice(0,10),ref:c,parsed:'N/A',ok:c>=0});
  }

  // PicPay PDF (só verifica se lê > 0)
  const ppFiles=fs.readdirSync(`${BASE}/PicPay`).filter(f=>f.endsWith('.pdf')&&!f.endsWith('Zone.Identifier')).slice(0,2);
  for(const f of ppFiles){
    const text=(await getPdfItems(`${BASE}/PicPay/${f}`)).map(i=>i.str).join(' ');
    const tokens=text.split(/\s+/);
    const numRx=/^-?[\d\.]+,\d{2}$/;
    let c=0;tokens.forEach(t=>{if(t.includes('R$'))c++;});
    res.push({bank:'PicPay PDF',file:f.slice(0,12),ref:'N/A',parsed:c,ok:c>0});
  }

  // Exibir resultado
  console.log('\n📊 AUDITORIA DE PARSERS — TODOS OS BANCOS\n');
  console.log('Banco'.padEnd(20)+'Arquivo'.padEnd(18)+'Referência'.padEnd(12)+'Detectados'.padEnd(12)+'Status');
  console.log('-'.repeat(70));
  for(const r of res){
    const st=r.ok?'✓ OK':'✗ FALHA';
    console.log(r.bank.padEnd(20)+String(r.file).padEnd(18)+String(r.ref).padEnd(12)+String(r.parsed).padEnd(12)+st);
  }
}

audit().catch(console.error);
