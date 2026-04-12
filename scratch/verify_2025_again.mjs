import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

function parseAmountBR(s) {
  if (!s) return 0;
  return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
}
const MONTH_MAP = { JAN: 0, FEV: 1, MAR: 2, ABR: 3, MAI: 4, JUN: 5, JUL: 6, AGO: 7, SET: 8, OUT: 9, NOV: 10, DEZ: 11 };

function groupItemsIntoLines(items, tolerance = 3) {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const lines = [];
  let currentGroup = [];
  let lastY = -9999;

  for (const item of sorted) {
    if (Math.abs(item.y - lastY) > tolerance) {
      if (currentGroup.length > 0) lines.push(currentGroup);
      currentGroup = [item];
      lastY = item.y;
    } else {
      currentGroup.push(item);
      lastY = (lastY + item.y) / 2;
    }
  }
  if (currentGroup.length > 0) lines.push(currentGroup);
  return lines;
}

function shouldIgnoreTransaction(description) {
  const IGNORE_KEYWORDS = [
    'saldo do dia',
    'saldo anterior',
    'entradas:',
    'saídas:',
    'total de entradas',
    'total de saídas',
    'demonstrativo',
    'extrato:',
    'período:',
  ];
  const normalizedDesc = description.toLowerCase();
  return IGNORE_KEYWORDS.some((keyword) => normalizedDesc.includes(keyword));
}

function isInternalTransfer() { return false; }
function detectPaymentMethod() { return "OTHER"; }

function parseNubankPdfItems(items, userDocument) {
  const lines = groupItemsIntoLines(items);
  const transactions = [];

  const nuDateRegex = /(\d{1,2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+(\d{4})/i;
  const signedAmountRegex = /^[+\-]\s*[\d\.]+,\d{2}$/;
  const amountRegex = /^[\d\.]+,\d{2}$/;

  const skipKw = ['SALDO INICIAL','SALDO FINAL','RENDIMENTO','OUVIDORIA','CNPJ',
    'VALORES EM R$','EXTRATO GERADO','NÃO NOS RESPONSABILIZAMOS','ASSEGURAMOS A AUTENTICIDADE',
    'NU PAGAMENTOS','NU FINANCEIRA','MOVIMENTAÇÕES','TOTAL DE ENTRADAS','TOTAL DE SA'];

  let pendingDate = null;
  let pendingSign = 1;
  let pendingAmount = null;

  for (const line of lines) {
    const texts = line.map(i => i.str);
    const joined = texts.join(' ').trim();
    const upper = joined.toUpperCase();

    if (skipKw.some(k => upper.includes(k)) || joined.match(/^\d+ de \d+$/)) {
    }

    const dateMatch = upper.match(nuDateRegex);
    const hasTotal = upper.includes('TOTAL DE ENTRADAS') || upper.includes('TOTAL DE SA');

    if (dateMatch && hasTotal) {
      pendingAmount = null;
      const day = parseInt(dateMatch[1], 10);
      const month = MONTH_MAP[dateMatch[2].toUpperCase()];
      const year = parseInt(dateMatch[3], 10);
      if (month !== undefined) pendingDate = new Date(year, month, day);

      pendingSign = upper.includes('TOTAL DE ENTRADAS') ? 1 : -1;

      const valToken = texts.find(t => signedAmountRegex.test(t) || (t.startsWith('+') || t.startsWith('-')));
      const allJoined = texts.join('');
      const signedMatch = allJoined.match(/([+\-])\s*([\d\.]+,\d{2})/);
      if (signedMatch) {
        const sign = signedMatch[1] === '+' ? 1 : -1;
        pendingAmount = sign * parseAmountBR(signedMatch[2]);
      }
      continue;
    }

    if (!dateMatch && hasTotal) {
      pendingSign = upper.includes('TOTAL DE ENTRADAS') ? 1 : -1;
      const allJoined = texts.join('');
      const signedMatch = allJoined.match(/([+\-])\s*([\d\.]+,\d{2})/);
      if (signedMatch) {
        const sign = signedMatch[1] === '+' ? 1 : -1;
        pendingAmount = sign * parseAmountBR(signedMatch[2]);
      }
      continue;
    }

    if (pendingDate) {
      const valueToken = texts.find(t => amountRegex.test(t));
      if (valueToken) {
        const descParts = texts.filter(t => t !== valueToken && !signedAmountRegex.test(t) && t.trim() !== '');
        const description = descParts.join(' ').trim();

        if (description && !shouldIgnoreTransaction(description)) {
          const rawAmount = parseAmountBR(valueToken);
          const amount = pendingSign * rawAmount;
          const isTransfer = isInternalTransfer(description, userDocument);

          transactions.push({
            id: Math.random().toString(36).substr(2, 9),
            date: pendingDate,
            amount,
            description,
            type: isTransfer ? "TRANSFER" : (amount < 0 ? "EXPENSE" : "INCOME"),
            isInternalTransfer: isTransfer,
            paymentMethod: detectPaymentMethod(description),
          });
        }
        continue;
      }
    }
  }

  return transactions;
}

async function verify() {
  const data = new Uint8Array(fs.readFileSync('/home/carlo/Projetos/Pessoal/finances-sheet/extratos_exemplos/Nubank/202505 - Maio 2025.pdf'));
  
  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;
  
  const allItems = [];
  let pageYOffset = 0;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1 });

    for (const item of textContent.items) {
      if (item.str?.trim()) {
        const itemY = Math.round(viewport.height - item.transform[5]);
        allItems.push({
          x: Math.round(item.transform[4]),
          y: pageYOffset + itemY,
          str: item.str.trim(),
        });
      }
    }
    pageYOffset += Math.round(viewport.height) + 100;
  }
  
  const fullText = allItems.map(i => i.str).join(' ');
  const upperText = fullText.toUpperCase();
  
  if (upperText.includes('NU PAGAMENTOS') || upperText.includes('NUBANK') || upperText.includes('NU FINANCEIRA')) {
     console.log("--> RECONHECIDO COMO NUBANK");
     const txs = parseNubankPdfItems(allItems);
     console.log("--> Transacoes parseadas:", txs.length);
  } else {
     console.log("--> NAO RECONHECIDO COMO NUBANK!!");
  }
}
verify().catch(console.error);
