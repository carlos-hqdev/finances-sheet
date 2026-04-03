import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/shared/lib/db";

export async function GET(_request: Request) {
  try {
    const DAILY_MULTIPLIER = 1.0004;

    const investments = await prisma.investment.findMany({
      where: {
        type: "SAVINGS",
        isDailyYield: true,
      },
      include: {
        lots: {
          where: {
            isFullyWithdrawn: false,
          },
          include: {
            transaction: true,
          },
        },
      },
    });

    if (investments.length === 0) {
      return NextResponse.json({
        message: "Nenhum investimento elegível para rendimento diário.",
      });
    }

    let updatedInvestmentsCount = 0;
    let updatedLotsCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const investment of investments) {
        let totalInvestmentBalance = new Prisma.Decimal(0);

        for (const lot of investment.lots) {
          const currentBalanceDec = new Prisma.Decimal(lot.currentBalance);
          const newBalance = currentBalanceDec.mul(DAILY_MULTIPLIER);
          const profit = newBalance.minus(currentBalanceDec);

          await tx.investmentLot.update({
            where: { id: lot.id },
            data: { currentBalance: newBalance },
          });

          if (profit.gt(0)) {
            await tx.transaction.create({
              data: {
                amount: profit,
                type: "INCOME",
                paymentMethod: "OTHER",
                investmentId: investment.id,
                accountId: lot.transaction.accountId,
                description: "Rendimento Diário",
                date: new Date(),
                isPaid: true,
              },
            });
          }

          totalInvestmentBalance = totalInvestmentBalance.add(newBalance);
          updatedLotsCount++;
        }

        if (investment.lots.length > 0) {
          await tx.investment.update({
            where: { id: investment.id },
            data: { balance: totalInvestmentBalance },
          });

          await tx.investmentHistory.create({
            data: {
              investmentId: investment.id,
              balance: totalInvestmentBalance,
            },
          });

          updatedInvestmentsCount++;
        }
      }
    });

    return NextResponse.json({
      message: "Rendimento diário aplicado com sucesso",
      multiplierUsed: DAILY_MULTIPLIER,
      updatedInvestments: updatedInvestmentsCount,
      updatedLots: updatedLotsCount,
    });
  } catch (error) {
    console.error("Erro ao processar rendimento diário:", error);
    return NextResponse.json(
      { error: "Ocorreu um erro ao processar os rendimentos" },
      { status: 500 },
    );
  }
}
