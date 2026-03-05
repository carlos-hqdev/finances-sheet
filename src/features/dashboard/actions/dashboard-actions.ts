"use server";

import { prisma } from "@/shared/lib/db";

export async function getAggregatedTransactions(monthsHistory: number = 36) {
  // Create a date limit (e.g., 36 months ago)
  const d = new Date();
  d.setMonth(d.getMonth() - monthsHistory);
  d.setDate(1); // the first of that month

  const transactions = await prisma.transaction.findMany({
    where: {
      date: {
        gte: d,
      },
    },
    select: {
      referenceMonth: true,
      amount: true,
      type: true,
      date: true,
    },
  });

  // Group by referenceMonth and type (Income vs Expense)
  const aggregated: Record<
    string,
    { income: number; expense: number; month: string }
  > = {};

  transactions.forEach((tx) => {
    // some older transactions might not have referenceMonth, fallback to YYYY-MM of the tx date
    let ref = tx.referenceMonth;
    if (!ref) {
      const td = new Date(tx.date);
      ref = `${td.getFullYear()}-${String(td.getMonth() + 1).padStart(2, "0")}`;
    }

    if (!aggregated[ref]) {
      aggregated[ref] = { month: ref, income: 0, expense: 0 };
    }

    if (tx.type === "INCOME") {
      aggregated[ref].income += Number(tx.amount);
    } else if (tx.type === "EXPENSE") {
      aggregated[ref].expense += Number(tx.amount);
    }
  });

  // Sort by month ascending
  const sorted = Object.values(aggregated).sort((a, b) =>
    a.month.localeCompare(b.month),
  );
  return sorted;
}
