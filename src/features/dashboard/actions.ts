"use server";

import { prisma } from "@/shared/lib/db";
import { startOfMonth, endOfMonth } from "date-fns";

export async function getDashboardBalances(userId: string) {
  const accountsResult = await prisma.account.aggregate({
    _sum: {
      balance: true,
    },
    where: {
      userId,
    },
  });
  const accountsBalance = accountsResult._sum.balance?.toNumber() || 0;

  const savingsResult = await prisma.investment.aggregate({
    _sum: {
      balance: true,
    },
    where: {
      userId,
      type: "SAVINGS",
    },
  });
  const savingsBalance = savingsResult._sum.balance?.toNumber() || 0;

  const totalBalance = accountsBalance + savingsBalance;

  const investmentsResult = await prisma.investment.aggregate({
    _sum: {
      balance: true,
    },
    where: {
      userId,
      type: {
        not: "SAVINGS",
      },
    },
  });
  const totalInvestments = investmentsResult._sum.balance?.toNumber() || 0;

  return { totalBalance, totalInvestments };
}

export async function getCurrentMonthTransactions(userId: string) {
  const now = new Date();
  const start = startOfMonth(now);
  const end = endOfMonth(now);

  const incomesResult = await prisma.transaction.aggregate({
    _sum: {
      amount: true,
    },
    where: {
      account: {
        userId,
      },
      type: "INCOME",
      isPaid: true,
      date: {
        gte: start,
        lte: end,
      },
    },
  });
  const incomes = incomesResult._sum.amount?.toNumber() || 0;

  const expensesResult = await prisma.transaction.aggregate({
    _sum: {
      amount: true,
    },
    where: {
      account: {
        userId,
      },
      type: "EXPENSE",
      isPaid: true,
      date: {
        gte: start,
        lte: end,
      },
    },
  });
  const expenses = expensesResult._sum.amount?.toNumber() || 0;

  return { incomes, expenses };
}
