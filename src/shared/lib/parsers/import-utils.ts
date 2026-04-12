import { ParsedTransaction } from "@/features/transactions/types";

/**
 * Palavras-chave para ignorar transações (como tarifas, informativos bancários, etc.)
 */
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

/**
 * Detecta o método de pagamento baseado na descrição
 */
export function detectPaymentMethod(description: string): string {
  const desc = description.toUpperCase();

  if (desc.includes('PIX')) return 'PIX';
  if (desc.includes('BOLETO')) return 'BOLETO';
  if (desc.includes('TED') || desc.includes('DOC') || desc.includes('TRANSFERENCIA') || desc.includes('TRANSF')) return 'TRANSFER';
  if (desc.includes('COMPRA DEB') || desc.includes('DEBITO') || desc.includes('MAQUININHA D') || desc.includes('CARTAO DEB')) return 'DEBIT_CARD';
  if (desc.includes('COMPRA CRED') || desc.includes('COMPRA NO CARTAO') || desc.includes('CREDITO')) return 'CREDIT_CARD';
  if (desc.includes('SAQUE') || desc.includes('BCO24H') || desc.includes('BANCO24HORAS') || desc.includes('RETIRO')) return 'WITHDRAWAL';
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
