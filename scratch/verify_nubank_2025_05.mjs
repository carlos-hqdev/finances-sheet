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

function shouldIgnoreTransaction(description) {
  const IGNORE_KEYWORDS = [
    'saldo do dia', 'saldo anterior', 'entradas:', 'saídas:', 'total de entradas', 'total de saídas', 'demonstrativo', 'extrato:', 'período:'
  ];
  const desc = description.toLowerCase();
  return IGNORE_KEYWORDS.some(keyword => desc.includes(keyword));
}

async function run() {
  const data = new Uint8Array(fs.readFileSync('/home/carlo/Projetos/Pessoal/finances-sheet/extratos_exemplos/Nubank/202505 - Maio 2025.pdf'));
  const pdf = await pdfjs.getDocument({ data }).promise;
  const allItems = []; let yOffset = 0;
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    const vp = page.getViewport({ scale: 1 });
    tc.items.forEach(item => {
      if (item.str?.trim()) allItems.push({ x: Math.round(item.transform[4]), y: yOffset + Math.round(vp.height - item.transform[5]), str: item.str.trim() });
    });
    yOffset += Math.round(vp.height) + 100;
  }
  
  const transactions = [];
  const lines = groupByY(allItems);
  
  const nuDateRegex = /(\d{1,2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+(\d{4})/i;
  const signedAmountRegex = /^[+\-]\s*[\d\.]+,\d{2}$/;
  const amountRegex = /^[\d\.]+,\d{2}$/;

  const skipKw = ['SALDO INICIAL','SALDO FINAL','RENDIMENTO','OUVIDORIA','CNPJ',
    'VALORES EM R$','EXTRATO GERADO','NÃO NOS RESPONSABILIZAMOS','ASSEGURAMOS A AUTENTICIDADE',
    'NU PAGAMENTOS','NU FINANCEIRA','MOVIMENTAÇÕES','TOTAL DE ENTRADAS','TOTAL DE SA',
    'TEM ALGUMA DÚVIDA?', 'METROPOLITANAS)', 'LOCALIDADES).'];

  let pendingDate = null;
  let pendingSign = 1;

  for (const line of lines) {
    const texts = line.map(i => i.str);
    const joined = texts.join(' ').trim();
    const upper = joined.toUpperCase();

    // Pular abeçalhos e rodapés novos
    if (skipKw.some(k => upper.includes(k)) || joined.match(/^\d+ de \d+$/)) {
      // continua abaixo para verificar totais
    }

    const dateMatch = upper.match(nuDateRegex);
    const hasTotal = upper.includes('TOTAL DE ENTRADAS') || upper.includes('TOTAL DE SA');

    if (dateMatch && hasTotal) {
      const day = parseInt(dateMatch[1], 10);
      const month = MONTH_MAP[dateMatch[2].toUpperCase()];
      const year = parseInt(dateMatch[3], 10);
      if (month !== undefined) pendingDate = new Date(year, month, day);

      pendingSign = upper.includes('TOTAL DE ENTRADAS') ? 1 : -1;
      continue;
    }

    if (!dateMatch && hasTotal) {
      pendingSign = upper.includes('TOTAL DE ENTRADAS') ? 1 : -1;
      continue;
    }

    if (pendingDate) {
      const valueToken = texts.find(t => amountRegex.test(t));
      if (valueToken) {
        const descParts = texts.filter(t => t !== valueToken && !signedAmountRegex.test(t) && t.trim() !== '');
        const description = descParts.join(' ').trim();
        const skipThisLine = skipKw.some(k => upper.includes(k)) || joined.match(/^\d+ de \d+$/);

        if (description && !shouldIgnoreTransaction(description) && !skipThisLine) {
          const rawAmount = parseAmountBR(valueToken);
          const amount = pendingSign * rawAmount;
          
          transactions.push({ date: pendingDate, amount, description });
        }
      }
    }
  }
  
  console.log(`Found: ${transactions.length}`);
  console.log(transactions.slice(0, 3));
}
run().catch(console.error);
