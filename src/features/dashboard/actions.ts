"use server";

import { parseISO } from "date-fns";
import { prisma } from "@/shared/lib/db";

export async function getDashboardBalances(
  userId: string,
  _referenceMonth?: string,
) {
  // Se houver um referenceMonth, idealmente deveríamos calcular o saldo retroativo.
  // Por ora, para manter a consistência com o schema atual (que não tem snapshots),
  // retornaremos o saldo atual, mas marcaremos no plano que saldo histórico exigiria
  // somar todas as transações desde o início dos tempos até o fim do mês solicitado.

  const accounts = await prisma.bankAccount.findMany({
    where: { userId },
    select: {
      type: true,
      balance: true,
    },
  });

  const totalBalance = accounts
    .filter((a) => a.type !== "SAVINGS")
    .reduce((sum, a) => sum + a.balance.toNumber(), 0);

  const emergencyFund = accounts
    .filter((a) => a.type === "SAVINGS")
    .reduce((sum, a) => sum + a.balance.toNumber(), 0);

  const investments = await prisma.investment.aggregate({
    _sum: { balance: true },
    where: { userId, type: { not: "SAVINGS" } },
  });

  const totalInvestments = investments._sum.balance?.toNumber() || 0;

  return { totalBalance, emergencyFund, totalInvestments };
}

export async function getPatrimonyBreakdown(
  userId: string,
  _referenceMonth?: string,
) {
  const [accounts, investments] = await Promise.all([
    prisma.bankAccount.findMany({
      where: { userId },
      select: { type: true, balance: true },
    }),
    prisma.investment.groupBy({
      by: ["type"],
      _sum: { balance: true },
      where: { userId },
    }),
  ]);

  const accountsTotal = accounts
    .filter((a) => a.type !== "SAVINGS")
    .reduce((sum, a) => sum + a.balance.toNumber(), 0);

  const typeLabels: Record<string, string> = {
    SAVINGS: "Reserva de Emergência",
    FIXED: "Renda Fixa",
    VARIABLE: "Renda Variável",
    CRYPTO: "Cripto",
  };

  const typeColors: Record<string, string> = {
    SAVINGS: "#eab308",
    FIXED: "#3b82f6",
    VARIABLE: "#8b5cf6",
    CRYPTO: "#f97316",
  };

  const investmentSlices = investments.map((inv) => ({
    name: typeLabels[inv.type] ?? inv.type,
    value: inv._sum.balance?.toNumber() ?? 0,
    color: typeColors[inv.type] ?? "#6b7280",
  }));

  // Adiciona reserva de emergência vinda das accounts tipo SAVINGS se houver
  const savingsFromAccounts = accounts
    .filter((a) => a.type === "SAVINGS")
    .reduce((sum, a) => sum + a.balance.toNumber(), 0);

  if (savingsFromAccounts > 0) {
    const existingSavings = investmentSlices.find(
      (s) => s.name === "Reserva de Emergência",
    );
    if (existingSavings) {
      existingSavings.value += savingsFromAccounts;
    } else {
      investmentSlices.push({
        name: "Reserva de Emergência",
        value: savingsFromAccounts,
        color: typeColors.SAVINGS,
      });
    }
  }

  return [
    { name: "Contas Correntes", value: accountsTotal, color: "#22c55e" },
    ...investmentSlices,
  ];
}

export async function getCurrentMonthTransactions(
  userId: string,
  referenceMonth?: string,
) {
  const date = referenceMonth ? parseISO(`${referenceMonth}-01`) : new Date();
  const ref =
    referenceMonth ||
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

  const transactions = await prisma.transaction.findMany({
    where: {
      account: { userId },
      referenceMonth: ref,
      isPaid: true,
    },
    select: {
      amount: true,
      type: true,
    },
  });

  const incomes = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + t.amount.toNumber(), 0);

  const expenses = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + t.amount.toNumber(), 0);

  return { incomes, expenses };
}

export async function getYearlyComparison(userId: string) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const previousYear = currentYear - 1;

  const transactions = await prisma.transaction.findMany({
    where: {
      account: { userId },
      isPaid: true,
      date: {
        gte: new Date(`${previousYear}-01-01`),
        lte: new Date(`${currentYear}-12-31`),
      },
    },
    select: {
      amount: true,
      type: true,
      date: true,
    },
  });

  const months = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];

  const comparisonData = months.map((monthName, index) => {
    const monthIndex = index; // 0-11

    const filter = (year: number, type: string) =>
      transactions
        .filter(
          (t) =>
            t.date.getFullYear() === year &&
            t.date.getMonth() === monthIndex &&
            t.type === type,
        )
        .reduce((sum, t) => sum + t.amount.toNumber(), 0);

    return {
      month: monthName,
      currentIncome: filter(currentYear, "INCOME"),
      previousIncome: filter(previousYear, "INCOME"),
      currentExpense: filter(currentYear, "EXPENSE"),
      previousExpense: filter(previousYear, "EXPENSE"),
    };
  });

  return {
    years: { current: currentYear, previous: previousYear },
    data: comparisonData,
  };
}

export async function getAvailableMonths(userId: string) {
  const transactions = await prisma.transaction.findMany({
    where: { account: { userId } },
    select: { referenceMonth: true },
    distinct: ["referenceMonth"],
    orderBy: { referenceMonth: "desc" },
  });

  return transactions
    .map((t) => t.referenceMonth)
    .filter((m): m is string => !!m);
}

export async function getYearlyPeriodComparison(
  userId: string,
  targetYear: number,
  baseYear: number,
  type: "INCOME" | "EXPENSE",
) {
  const transactions = await prisma.transaction.findMany({
    where: {
      account: { userId },
      isPaid: true,
      type,
      date: {
        gte: new Date(`${baseYear}-01-01`),
        lte: new Date(`${targetYear}-12-31`),
      },
    },
    select: { amount: true, date: true },
  });

  const calculateSum = (year: number, months: number[]) => {
    return transactions
      .filter(
        (t) =>
          t.date.getFullYear() === year && months.includes(t.date.getMonth()),
      )
      .reduce((sum, t) => sum + t.amount.toNumber(), 0);
  };

  const currentMonth = new Date().getMonth();

  const periods = [
    { label: "Mês Selecionado", months: [currentMonth] }, // Nota: Idealmente o mês do seletor, mas por ora usaremos o atual
    { label: "1º Trimestre", months: [0, 1, 2] },
    { label: "2º Trimestre", months: [3, 4, 5] },
    { label: "3º Trimestre", months: [6, 7, 8] },
    { label: "4º Trimestre", months: [9, 10, 11] },
    { label: "1º Semestre", months: [0, 1, 2, 3, 4, 5] },
    { label: "2º Semestre", months: [6, 7, 8, 9, 10, 11] },
    { label: "ANO", months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  ];

  const data = periods.map((p) => {
    const finalVal = calculateSum(targetYear, p.months);
    const initialVal = calculateSum(baseYear, p.months);
    const result = finalVal - initialVal;
    const percentage = initialVal > 0 ? (result / initialVal) * 100 : 0;

    return {
      period: p.label,
      final: finalVal,
      initial: initialVal,
      result,
      percentage,
    };
  });

  return data;
}
