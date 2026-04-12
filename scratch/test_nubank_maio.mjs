import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

function parseAmountBR(s) {
  if (!s) return 0;
  return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
}
const MONTH_MAP = { JAN: 0, FEV: 1, MAR: 2, ABR: 3, MAI: 4, JUN: 5, JUL: 6, AGO: 7, SET: 8, OUT: 9, NOV: 10, DEZ: 11 };

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

async function testIt() {
  const path = '/home/carlo/Projetos/Pessoal/finances-sheet/extratos_exemplos/Nubank/202505 - Maio 2025.pdf';
  if (!fs.existsSync(path)) {
    console.log("File not found:", path);
    return;
  }
  const data = new Uint8Array(fs.readFileSync(path));
  const pdf = await pdfjs.getDocument({ data }).promise;
  const allItems = []; let yOffset = 0;
  for (let i = 1; i <= Math.min(3, pdf.numPages); i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    const vp = page.getViewport({ scale: 1 });
    tc.items.forEach(item => {
      if (item.str?.trim()) allItems.push({ x: Math.round(item.transform[4]), y: yOffset + Math.round(vp.height - item.transform[5]), str: item.str.trim() });
    });
    yOffset += Math.round(vp.height) + 100;
  }
  
  const lines = groupByY(allItems);
  lines.forEach(l => console.log(l.map(i=>i.str).join(' ')));
}
testIt().catch(console.log);
