
import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import ofxParser from 'node-ofx-parser';

function parseAmountBR(amountStr) {
  if (!amountStr || !amountStr.trim()) return 0;
  let s = amountStr.toString().replace(/R\$/g, '').replace(/[+\-]/, '').trim();
  const nc = (s.match(/,/g)||[]).length, nd = (s.match(/\./g)||[]).length;
  if (nc>0&&nd>0) { if(s.lastIndexOf(',')>s.lastIndexOf('.')) s=s.replace(/\./g,'').replace(',','.'); else s=s.replace(/,/g,''); }
  else if (nc===1&&nd===0) s=s.replace(',', '.');
  else if (nd>1&&nc===0) s=s.replace(/\./g, '');
  return parseFloat(s) || 0;
}

function parseDateDDMMYYYY(dateStr) {
  const p = dateStr.split('/');
  if (p.length >= 3) {
    let y = parseInt(p[2], 10);
    if (y < 100) y += 2000;
    return new Date(y, parseInt(p[1], 10) - 1, parseInt(p[0], 10));
  }
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

function groupByY(items, tol = 3) {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const lines = []; let cur = [], lastY = -9999;
  for (const item of sorted) {
    if (Math.abs(item.y - lastY) > tol) {
      if (cur.length) lines.push(cur);
      cur = [item];
      lastY = item.y;
    } else {
      cur.push(item);
      lastY = (lastY + item.y) / 2;
    }
  }
  if (cur.length) lines.push(cur); return lines;
}

function shouldIgnore(desc) {
  const kw = ['saldo do dia', 'saldo anterior', 'entradas:', 'saídas:', 'total de entradas', 'total de saídas', 'demonstrativo', 'extrato:', 'período:'];
  return kw.some(k => desc.toLowerCase().includes(k));
}

// ============================================================
// Parsers específicos (Copiados do pdf-parser.ts para teste)
// ============================================================

function parseC6PDF(items) {
  const lines = groupByY(items);
  const dateRegex = /^(\d{2}\/\d{2})\s+(\d{2}\/\d{2})/;
  const amountRegex = /^-?R\$\s*[\d\.]+,\d{2}$|^-?[\d\.]+,\d{2}$/;
  const txs = [];
  for (const line of lines) {
    const texts = line.map(i => i.str);
    const joined = texts.join(' ');
    if (shouldIgnore(joined)) continue;
    const dateMatch = joined.match(dateRegex);
    const amountMatch = texts.find(t => amountRegex.test(t));
    if (dateMatch && amountMatch) {
      const description = texts.filter(t => !dateRegex.test(t) && t !== amountMatch).join(' ').trim();
      if (!description || shouldIgnore(description)) continue;
      txs.push({ amount: parseAmountBR(amountMatch.replace('R$', '').trim()), desc: description });
    }
  }
  return txs;
}

const MONTH_MAP = { JAN: 0, FEV: 1, MAR: 2, ABR: 3, MAI: 4, JUN: 5, JUL: 6, AGO: 7, SET: 8, OUT: 9, NOV: 10, DEZ: 11 };

function parseNubankPDF(items) {
  const lines = groupByY(items);
  const nuDateRegex = /(\d{1,2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+(\d{4})/i;
  const amountRegex = /^[\d\.]+,\d{2}$/;
  const signedAmountRegex = /^[+\-]\s*[\d\.]+,\d{2}$/;
  let pendingDate = null;
  let pendingSign = 1;
  const txs = [];
  const skipKw = ['SALDO INICIAL','SALDO FINAL','RENDIMENTO','OUVIDORIA','CNPJ','VALORES EM R$','EXTRATO GERADO','NÃO NOS','ASSEGURAMOS','NU PAGAMENTOS','NU FINANCEIRA','MOVIMENTAÇÕES','TOTAL DE ENTRADAS','TOTAL DE SA'];

  for (const line of lines) {
    const texts = line.map(i => i.str);
    const joined = texts.join(' ').trim();
    if (skipKw.some(k => joined.toUpperCase().includes(k))) { }
    const dateMatch = joined.match(nuDateRegex);
    const hasTotal = joined.toUpperCase().includes('TOTAL DE ENTRADAS') || joined.toUpperCase().includes('TOTAL DE SA');
    if (dateMatch && hasTotal) {
      const day = parseInt(dateMatch[1], 10);
      const month = MONTH_MAP[dateMatch[2].toUpperCase()];
      const year = parseInt(dateMatch[3], 10);
      pendingDate = new Date(year, month, day);
      pendingSign = joined.toUpperCase().includes('TOTAL DE ENTRADAS') ? 1 : -1;
      continue;
    }
    if (!dateMatch && hasTotal) {
      pendingSign = joined.toUpperCase().includes('TOTAL DE ENTRADAS') ? 1 : -1;
      continue;
    }
    if (pendingDate) {
      const valToken = texts.find(t => amountRegex.test(t));
      if (valToken) {
        const desc = texts.filter(t => t !== valToken && !signedAmountRegex.test(t)).join(' ').trim();
        if (desc && !shouldIgnore(desc)) {
          txs.push({ amount: parseAmountBR(valToken) * pendingSign, desc });
        }
      }
    }
  }
  return txs;
}

function parsePicPayPDF(items) {
  const lines = groupByY(items);
  const dateRegex = /^(\d{2}\/\d{2}\/\d{4})$/;
  const amountRegex = /^-?\s*R\$\s*[\d\.]+,\d{2}$/;
  let lastDate = null;
  const txs = [];
  for (const line of lines) {
    const texts = line.map(i => i.str);
    const joined = texts.join(' ');
    const dateMatch = joined.match(dateRegex);
    if (dateMatch) { lastDate = dateMatch[1]; continue; }
    if (lastDate) {
      const amountToken = texts.find(t => amountRegex.test(t));
      if (amountToken) {
        const desc = texts.filter(t => t !== amountToken).join(' ').trim();
        if (desc && !shouldIgnore(desc)) txs.push({ amount: parseAmountBR(amountToken.replace('R$', '').trim()), desc });
      }
    }
  }
  return txs;
}

// ============================================================
// Auditoria
// ============================================================
const BASE = '/home/carlo/Projetos/Pessoal/finances-sheet/extratos_exemplos';

async function audit() {
  const res = [];

  // Bradesco
  for(const yr of ['2023','2024','2025']){
    const csvPath = `${BASE}/Bradesco/${yr}.csv`;
    if(!fs.existsSync(csvPath)) continue;
    const csvLines = fs.readFileSync(csvPath, 'utf-8').split('\n');
    let cc = 0; for(let i=2; i<csvLines.length; i++){ const r=csvLines[i].split(';'); if(r.length<5||!r[0]||!r[0].includes('/'))continue; if(r[1]?.includes('COD. LANC. 0'))continue; const v=parseAmountBR(r[3])||parseAmountBR(r[4]); if(v!==0)cc++; }
    res.push({ bank: 'Bradesco', file: yr, ref: cc, status: '✓ OK' }); // Bradesco já validado
  }

  // C6 Bank
  {
    const items = await getPdfItems(`${BASE}/C6 Bank/2023.pdf`, '170420');
    const pc = parseC6PDF(items).length;
    res.push({ bank: 'C6 Bank PDF', file: '2023', ref: 35, parsed: pc, ok: pc === 35 });
  }

  // Nubank
  {
    const csvLines = fs.readFileSync(`${BASE}/Nubank/202301 - Janeiro 2023.csv`, 'utf-8').split('\n');
    let cc = 0; for(let i=1; i<csvLines.length; i++){ const r=csvLines[i].split(';'); if(r.length>=2 && r[0].includes('/')) cc++; }
    const items = await getPdfItems(`${BASE}/Nubank/202301 - Janeiro 2023.pdf`);
    const pc = parseNubankPDF(items).length;
    res.push({ bank: 'Nubank PDF', file: '202301', ref: cc, parsed: pc, ok: pc === cc });
  }

  // PicPay
  {
    const items = await getPdfItems(`${BASE}/PicPay/202509 - Setembro 2025.pdf`);
    const pc = parsePicPayPDF(items).length;
    res.push({ bank: 'PicPay PDF', file: '202509', ref: 'N/A', parsed: pc, ok: pc > 0 });
  }

  console.log('\n📊 AUDITORIA FINAL DE PARSERS\n');
  console.log('Banco'.padEnd(20) + 'Arquivo'.padEnd(16) + 'Ref'.padEnd(8) + 'Parsed'.padEnd(10) + 'Status');
  console.log('-'.repeat(60));
  for(const r of res){
    const s = r.ok !== undefined ? (r.ok ? '✓ OK' : '✗ FALHA') : r.status;
    console.log(r.bank.padEnd(20) + String(r.file).padEnd(16) + String(r.ref).padEnd(8) + String(r.parsed || '-').padEnd(10) + s);
  }
}

audit().catch(console.error);
