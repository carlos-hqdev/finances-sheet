
import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

// ---- utilitários copiados do pdf-parser.ts ----

function parseAmountBR(amountStr) {
  if (!amountStr || !amountStr.trim()) return 0;
  let s = amountStr.toString().replace(/R\$/g, '').trim();
  const nc = (s.match(/,/g) || []).length;
  const nd = (s.match(/\./g) || []).length;
  if (nc > 0 && nd > 0) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (nc === 1 && nd === 0) s = s.replace(',', '.');
  else if (nd > 1 && nc === 0) s = s.replace(/\./g, '');
  return parseFloat(s) || 0;
}

function parseDateDDMMYYYY(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length >= 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    return new Date(year, month, day);
  }
  return null;
}

function shouldIgnore(desc) {
  const kw = ['saldo do dia','saldo anterior','entradas:','saídas:','total de entradas','total de saídas','demonstrativo'];
  return kw.some(k => desc.toLowerCase().includes(k));
}

function groupByY(items, tolerance = 3) {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const lines = [];
  let cur = [];
  let lastY = -9999;
  for (const item of sorted) {
    if (Math.abs(item.y - lastY) > tolerance) {
      if (cur.length > 0) lines.push(cur);
      cur = [item];
      lastY = item.y;
    } else {
      cur.push(item);
      lastY = (lastY + item.y) / 2;
    }
  }
  if (cur.length > 0) lines.push(cur);
  return lines;
}

function parseBradescoPdf(items) {
  const transactions = [];
  const lines = groupByY(items);

  const fullDateRx = /^(\d{2}\/\d{2}\/\d{4})$/;
  const amountRx = /^[\d\.]+,\d{2}$/;
  const doctoRx = /^\d{4,}$/;

  let lastDate = null;
  let pendingDescription = null;

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const texts = line.map(i => i.str);
    const joined = texts.join(' ');
    const lower = joined.toLowerCase();

    // Pular linhas de cabeçalho/rodapé
    if (
      (lower.includes('data') && lower.includes('histórico')) ||
      lower.includes('folha:') ||
      lower.includes('bradesco celular') ||
      lower.includes('extrato de:') ||
      lower.includes('movimentação entre:') ||
      lower.includes('extrato inexistente') ||
      lower.includes('nome:')
    ) continue;

    const amounts = texts.filter(t => amountRx.test(t));
    const doctos = texts.filter(t => doctoRx.test(t) && !amountRx.test(t));
    const dateInLine = texts.find(t => fullDateRx.test(t));
    const isDataLine = amounts.length >= 2 && doctos.length >= 1;

    if (isDataLine) {
      if (dateInLine) {
        const parsed = parseDateDDMMYYYY(dateInLine);
        if (parsed) lastDate = parsed;
      }
      if (!lastDate) continue;

      const numVals = amounts.map(a => parseAmountBR(a));
      const txVals = numVals.slice(0, -1); // remove o saldo (último)

      const description = pendingDescription || joined;
      pendingDescription = null;
      if (!description || shouldIgnore(description)) continue;

      const dl = description.toLowerCase();
      const neg = ['transferencia','pix','pagamento','debito','saida','saque','compra','tarifa','despesa','seguro','iof','juros','ted','doc'];
      const pos = ['dep dinheiro','credito','deposito','estorno','rendimento','reembolso','transf saldo','resgate'];

      for (const raw of txVals) {
        let amount = raw;
        if (neg.some(k => dl.includes(k))) amount = -Math.abs(amount);
        else if (pos.some(k => dl.includes(k))) amount = Math.abs(amount);
        transactions.push({ date: lastDate.toISOString().split('T')[0], amount, description });
      }
    } else {
      const hasNoNumbers = texts.every(t => !amountRx.test(t) && !doctoRx.test(t));
      if (!dateInLine && hasNoNumbers && texts.length > 0) {
        pendingDescription = joined;
      }
    }
  }
  return transactions;
}

// ---- Execução ----
async function run() {
  const pdfPath = '/home/carlo/Projetos/Pessoal/finances-sheet/extratos_exemplos/Bradesco/2023.pdf';
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await pdfjs.getDocument({ data }).promise;

  const allItems = [];
  let yOffset = 0;
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    const vp = page.getViewport({ scale: 1 });
    tc.items.forEach(item => {
      if (item.str && item.str.trim()) {
        allItems.push({
          x: Math.round(item.transform[4]),
          y: yOffset + Math.round(vp.height - item.transform[5]),
          str: item.str.trim(),
        });
      }
    });
    yOffset += Math.round(vp.height) + 100;
  }

  const txs = parseBradescoPdf(allItems);
  console.log(`Total: ${txs.length}`);
  txs.forEach(t => console.log(`${t.date} | ${t.amount} | ${t.description}`));
}

run().catch(console.error);
