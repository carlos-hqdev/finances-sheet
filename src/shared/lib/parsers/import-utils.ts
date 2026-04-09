import { ParsedTransaction } from "@/features/transactions/types";

/**
 * Palavras-chave para ignorar transações (como tarifas, informativos bancários, etc.)
 */
const IGNORE_KEYWORDS = [
  'tarifa conta',
  'lançamento de',
  'saldo do dia',
  'saldo anterior',
  'entradas:',
  'saídas:',
  'total de entradas',
  'total de saídas',
  'demonstrativo',
];

/**
 * Detecta o método de pagamento baseado na descrição
 */
export function detectPaymentMethod(description: string): string {
  const desc = description.toUpperCase();

  if (desc.includes('PIX')) return 'PIX';
  if (desc.includes('BOLETO')) return 'BOLETO';
  if (desc.includes('TED') || desc.includes('DOC') || desc.includes('TRANSFERENCIA')) return 'TRANSFER';
  if (desc.includes('COMPRA DEB') || desc.includes('DEBITO')) return 'DEBIT_CARD';
  if (desc.includes('COMPRA NO CARTAO') || desc.includes('CREDITO')) return 'CREDIT_CARD';
  if (desc.includes('DINHEIRO') || desc.includes('ESPECIE')) return 'CASH';

  return 'OTHER';
}

/**
 * Determina se uma transação deve ser ignorada
 */
export function shouldIgnoreTransaction(description: string): boolean {
  const desc = description.toLowerCase();
  return IGNORE_KEYWORDS.some(keyword => desc.includes(keyword));
}
