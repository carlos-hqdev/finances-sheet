
import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

// Simulando as funções do pdf-parser.ts para teste isolado
function parseAmountBR(s) {
  if (!s) return 0;
  return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
}

const MONTH_MAP = { JAN: 0, FEV: 1, MAR: 2, ABR: 3, MAI: 4, JUN: 5, JUL: 6, AGO: 7, SET: 8, OUT: 9, NOV: 10, DEZ: 11 };

async function testNubank() {
  const data = new Uint8Array(fs.readFileSync('/home/carlo/Projetos/Pessoal/finances-sheet/extratos_exemplos/Nubank/202301 - Janeiro 2023.pdf'));
  const pdf = await pdfjs.getDocument({ data }).promise;
  const allItems = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    const vp = page.getViewport({ scale: 1 });
    tc.items.forEach(item => {
      if (item.str?.trim()) {
        allItems.push({ x: Math.round(item.transform[4]), y: Math.round(vp.height - item.transform[5]), str: item.str.trim() });
      }
    });
  }

  // Agrupar por Y
  const sorted = allItems.sort((a, b) => a.y - b.y || a.x - b.x);
  const lines = [];
  let cur = [];
  let lastY = -999;
  for (const item of sorted) {
    if (Math.abs(item.y - lastY) > 3) {
      if (cur.length) lines.push(cur);
      cur = [item];
      lastY = item.y;
    } else {
      cur.push(item);
    }
  }
  if (cur.length) lines.push(cur);

  const nuDateRegex = /(\d{1,2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+(\d{4})/i;
  const amountRegex = /^[\d\.]+,\d{2}$/;
  const signedAmountRegex = /^[+\-]\s*[\d\.]+,\d{2}$/;

  let pendingDate = null;
  let pendingSign = 1;
  const txs = [];

  for (const line of lines) {
    const texts = line.map(i => i.str);
    const joined = texts.join(' ');
    console.log(`LINHA: [${joined}]`);

    const dateMatch = joined.match(nuDateRegex);
    const hasTotal = joined.toUpperCase().includes('TOTAL DE');

    if (dateMatch && hasTotal) {
      const day = parseInt(dateMatch[1], 10);
      const month = MONTH_MAP[dateMatch[2].toUpperCase()];
      const year = parseInt(dateMatch[3], 10);
      pendingDate = new Date(year, month, day);
      pendingSign = joined.toUpperCase().includes('ENTRADAS') ? 1 : -1;
      console.log(`  -> DATA DETECTADA: ${pendingDate.toLocaleDateString()} | SINAL: ${pendingSign}`);
      continue;
    }

    if (pendingDate) {
      const valToken = texts.find(t => amountRegex.test(t));
      if (valToken) {
        const desc = texts.filter(t => t !== valToken && !signedAmountRegex.test(t)).join(' ').trim();
        console.log(`  -> TX ENCONTRADA: ${desc} | VALOR: ${valToken}`);
        txs.push({ date: pendingDate, desc, amount: parseAmountBR(valToken) * pendingSign });
      }
    }
  }

  console.log(`\nTOTAL DETECTADO: ${txs.length}`);
}

testNubank().catch(console.error);
