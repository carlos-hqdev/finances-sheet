export type ParsedTransaction = {
  id: string; // Client-side key id for UI
  date: Date; // Formatted
  amount: number; // In decimals (positive for income, negative for expense)
  description: string; // Original description from bank
  type: "INCOME" | "EXPENSE" | "TRANSFER";

  // Assigned during reconciliation step
  categoryId?: string | null;
  destinationAccountId?: string | null;
  isInternalTransfer?: boolean;
  notes?: string;
};
