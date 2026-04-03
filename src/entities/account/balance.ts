export function calculateAccountBalance(
  currentBalance: number,
  transactions: { amount: number; type: string; isPaid: boolean }[],
): number {
  return transactions.reduce((acc, tx) => {
    if (!tx.isPaid) return acc;
    return tx.type === "INCOME" ? acc + tx.amount : acc - tx.amount;
  }, currentBalance);
}

export function calculateAvailableBalance(
  currentBalance: number,
  pendingTransactions: { amount: number; type: string }[],
): number {
  const pending = pendingTransactions.reduce((acc, tx) => {
    return tx.type === "INCOME" ? acc + tx.amount : acc - tx.amount;
  }, 0);
  return currentBalance + pending;
}
