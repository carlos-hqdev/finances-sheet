import Papa from 'papaparse';
import { ParsedTransaction } from '@/features/transactions/types';

// Mapas comuns genéricos
const DATE_COLUMNS = ['data', 'date', 'data lançamento', 'data da transação'];
const AMOUNT_COLUMNS = ['valor', 'amount', 'valor(r$)', 'valor (r$)'];
const DESC_COLUMNS = ['descrição', 'description', 'histórico', 'lançamento', 'nome'];

export function isInternalTransfer(description: string, userDocumentOrName?: string): boolean {
  if (!userDocumentOrName || userDocumentOrName.trim() === '') return false;
  
  const normalizedDesc = description.toLowerCase().replace(/[\.\-\/\s]/g, '');
  const normalizedDoc = userDocumentOrName.toLowerCase().replace(/[\.\-\/\s]/g, '');
  
  return normalizedDesc.includes(normalizedDoc);
}

export function parseDateDDMMYYYY(dateStr: string): Date | null {
  if (!dateStr) return null;
  const cleanStr = dateStr.trim();
  
  // DD/MM/YYYY
  if (cleanStr.includes('/')) {
    const parts = cleanStr.split('/');
    if (parts.length >= 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      let year = parseInt(parts[2], 10);
      if (year < 100) year += 2000;
      return new Date(year, month, day);
    }
  }

  // DD-MM-YYYY
  if (cleanStr.includes('-')) {
    const parts = cleanStr.split('-');
    // ISO YYYY-MM-DD
    if (parts[0].length === 4) {
      const dateObj = new Date(cleanStr);
      if (!isNaN(dateObj.getTime())) return dateObj;
    } else if (parts.length >= 3) {
      // DD-MM-YYYY
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      let year = parseInt(parts[2], 10);
      if (year < 100) year += 2000;
      return new Date(year, month, day);
    }
  }

  return null;
}

export function parseAmountBR(amountStr: string): number {
  if (!amountStr || amountStr.trim() === '') return 0;
  let cleanStr = amountStr.toString().replace(/R\$/g, '').trim();
  
  const countComma = (cleanStr.match(/,/g) || []).length;
  const countDot = (cleanStr.match(/\./g) || []).length;

  if (countComma > 0 && countDot > 0) {
    const lastComma = cleanStr.lastIndexOf(',');
    const lastDot = cleanStr.lastIndexOf('.');
    if (lastComma > lastDot) {
      cleanStr = cleanStr.replace(/\./g, '').replace(',', '.');
    } else {
      cleanStr = cleanStr.replace(/,/g, '');
    }
  } else if (countComma === 1 && countDot === 0) {
    cleanStr = cleanStr.replace(',', '.');
  } else if (countDot > 1 && countComma === 0) {
     cleanStr = cleanStr.replace(/\./g, '');
  }

  const val = parseFloat(cleanStr);
  return isNaN(val) ? 0 : val;
}

// -------------------------------------------------------------------------------- //
// ADAPTADORES ESPECÍFICOS                                                          //
// -------------------------------------------------------------------------------- //

function parseBradescoCSV(lines: string[], userDocument?: string): ParsedTransaction[] {
  // Bradesco salta a linha 1 "Extrato de: Ag..."
  // Cabeçalhos na linha 2: Data;Histórico;Docto.;Crédito (R$);Débito (R$);Saldo (R$)
  const validLines = lines.slice(1).join('\n');
  const results = Papa.parse<{ [key: string]: string }>(validLines, { header: true, skipEmptyLines: true, delimiter: ';' });
  
  const parsedTransactions: ParsedTransaction[] = [];
  
  results.data.forEach((row) => {
    const dateStr = row['Data'];
    if (!dateStr || dateStr.trim() === '') return;
    
    // Ignorar "SALDO ANTERIOR" e "Total"
    if (row['Histórico']?.toLowerCase().includes("saldo anterior")) return;
    if (row['Histórico']?.toLowerCase().includes("total")) return;

    const date = parseDateDDMMYYYY(dateStr);
    if (!date) return;

    const creditStr = row['Crédito (R$)'] || '';
    const debitStr = row['Débito (R$)'] || '';
    
    let amount = 0;
    if (creditStr.trim() !== '') {
      amount = parseAmountBR(creditStr);
    } else if (debitStr.trim() !== '') {
      amount = -Math.abs(parseAmountBR(debitStr));
    } else {
      return;
    }

    const desc = row['Histórico'] || 'Sem Lançamento';
    const isTransfer = isInternalTransfer(desc, userDocument);

    parsedTransactions.push({
      id: Math.random().toString(36).substr(2, 9),
      date,
      amount,
      description: desc,
      type: isTransfer ? "TRANSFER" : (amount < 0 ? "EXPENSE" : "INCOME"),
      isInternalTransfer: isTransfer
    });
  });

  return parsedTransactions;
}

function parseMercadoPagoCSV(lines: string[], userDocument?: string): ParsedTransaction[] {
  // MP salta 4 linhas introdutórias
  // Cabeçalhos na linha 5: RELEASE_DATE;TRANSACTION_TYPE;REFERENCE_ID;TRANSACTION_NET_AMOUNT;PARTIAL_BALANCE
  const validLines = lines.slice(4).join('\n');
  const results = Papa.parse<{ [key: string]: string }>(validLines, { header: true, skipEmptyLines: true, delimiter: ';' });
  
  const parsedTransactions: ParsedTransaction[] = [];
  
  results.data.forEach((row) => {
    const dateStr = row['RELEASE_DATE'];
    if (!dateStr || dateStr.trim() === '') return;

    const date = parseDateDDMMYYYY(dateStr);
    if (!date) return;

    const amountStr = row['TRANSACTION_NET_AMOUNT'];
    const amount = parseAmountBR(amountStr);
    if (amount === 0) return; // Ignore zero transitions unless intended

    const desc = row['TRANSACTION_TYPE'] || row['DESCRIPTION'] || 'Mercado Pago Lançamento';
    const isTransfer = isInternalTransfer(desc, userDocument);

    parsedTransactions.push({
      id: Math.random().toString(36).substr(2, 9),
      date,
      amount,
      description: desc,
      type: isTransfer ? "TRANSFER" : (amount < 0 ? "EXPENSE" : "INCOME"),
      isInternalTransfer: isTransfer
    });
  });

  return parsedTransactions;
}

function parseGenericCSV(rawContent: string, userDocument?: string): ParsedTransaction[] {
    const results = Papa.parse<{ [key: string]: string }>(rawContent, { header: true, skipEmptyLines: true });
    
    if (!results.data || results.data.length === 0) {
      throw new Error("O arquivo CSV está vazio ou inválido.");
    }

    const headers = results.meta.fields || [];
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());

    let dateIndex = -1, amountIndex = -1, descIndex = -1;

    DATE_COLUMNS.forEach(dc => { if (dateIndex === -1 && normalizedHeaders.includes(dc)) dateIndex = normalizedHeaders.indexOf(dc); });
    AMOUNT_COLUMNS.forEach(ac => { if (amountIndex === -1 && normalizedHeaders.includes(ac)) amountIndex = normalizedHeaders.indexOf(ac); });
    DESC_COLUMNS.forEach(dc => { if (descIndex === -1 && normalizedHeaders.includes(dc)) descIndex = normalizedHeaders.indexOf(dc); });

    if (dateIndex === -1 || amountIndex === -1 || descIndex === -1) {
      throw new Error("Não foi possível identificar as colunas (Data, Valor, Descrição). Formato não suportado por padrão.");
    }

    const dateField = headers[dateIndex];
    const amountField = headers[amountIndex];
    const descField = headers[descIndex];

    const parsedTransactions: ParsedTransaction[] = [];

    results.data.forEach((row) => {
      if (!row[dateField] || !row[amountField]) return;
      const date = parseDateDDMMYYYY(row[dateField]);
      if (!date) return;

      const amount = parseAmountBR(row[amountField]);
      const desc = row[descField] || "Sem Lançamento";
      const isTransfer = isInternalTransfer(desc, userDocument);

      parsedTransactions.push({
        id: Math.random().toString(36).substr(2, 9),
        date,
        amount,
        description: desc,
        type: isTransfer ? "TRANSFER" : (amount < 0 ? "EXPENSE" : "INCOME"),
        isInternalTransfer: isTransfer
      });
    });

    return parsedTransactions;
}

// -------------------------------------------------------------------------------- //
// ORQUESTRADOR DE CSV                                                              //
// -------------------------------------------------------------------------------- //

export async function parseCSV(rawContent: string, userDocument?: string): Promise<ParsedTransaction[]> {
  const lines = rawContent.split(/\r?\n/);
  if (lines.length === 0) throw new Error("Arquivo vazio");

  const firstLines = lines.slice(0, 5).map(l => l.toUpperCase().trim());

  // 1. Check Se é Bradesco
  if (firstLines[0].startsWith("EXTRATO DE: AG:")) {
     return parseBradescoCSV(lines, userDocument);
  }

  // 2. Check Se é Mercado Pago
  if (firstLines[0].startsWith("INITIAL_BALANCE") || firstLines.some(l => l.includes("TRANSACTION_NET_AMOUNT"))) {
     return parseMercadoPagoCSV(lines, userDocument);
  }

  // 3. Padrão Genérico (Nubank, etc)
  return parseGenericCSV(rawContent, userDocument);
}
