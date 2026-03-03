// src/actions/investments.ts
import { prisma } from "@/shared/lib/db";

export async function processMonthlyYields() {
  const investments = await prisma.investment.findMany({
    where: {
      yieldRate: { gt: 0 },
      yieldFrequency: "MONTHLY",
    },
  });

  for (const inv of investments) {
    const currentBalance = Number(inv.balance);
    const rate = Number(inv.yieldRate) / 100; // Ex: 1% vira 0.01
    const yieldAmount = currentBalance * rate;

    if (yieldAmount > 0) {
      await prisma.$transaction([
        // 1. Atualiza o saldo do investimento
        prisma.investment.update({
          where: { id: inv.id },
          data: { balance: { increment: yieldAmount } },
        }),
        // 2. Cria um registro no histórico para o gráfico
        prisma.investmentHistory.create({
          data: {
            investmentId: inv.id,
            balance: currentBalance + yieldAmount,
            date: new Date(),
          },
        }),
      ]);
    }
  }
  return { success: true };
}
