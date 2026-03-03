import { NextResponse } from "next/server";
import { prisma } from "@/shared/lib/db";
import { getFinanceReferenceMonth } from "@/shared/lib/finance-utils";
import { differenceInDays, startOfDay } from "date-fns";

// Protect this route in production using a secret token
// Ex: https://your-domain.com/api/cron/daily-yield?token=YOUR_SUPER_SECRET_TOKEN
const CRON_SECRET = process.env.CRON_SECRET || "dev-secret-token";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  // Basic security check
  if (token !== CRON_SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Fetch all accounts that have daily yield enabled and a valid yield rate
    const accounts = await prisma.account.findMany({
      where: {
        isDailyYield: true,
        yieldRate: { not: null },
      },
    });

    const today = startOfDay(new Date());
    let processedCount = 0;

    for (const account of accounts) {
      if (!account.yieldRate || account.balance.toNumber() <= 0) continue;

      // Determine days since last yield (default to 1 if no previous record exists)
      const lastDate = account.lastYieldDate ? startOfDay(account.lastYieldDate) : null;
      const daysPassed = lastDate ? differenceInDays(today, lastDate) : 1;

      // Only process if at least one day has passed
      if (daysPassed < 1) continue;

      // Calculate yield: 
      // yieldRate is typically annual (e.g., 10%). 
      // Approximate daily rate = Annual Rate / 365
      // To get the actual decimal: yieldRate / 100
      // Daily multiplier = (yieldRate / 100) / 365
      const annualRateDecimal = account.yieldRate.toNumber() / 100;
      const dailyRate = annualRateDecimal / 365;
      
      // Calculate earnings based on compound or simple interest for the days passed
      // Using simple interest for tiny daily precision on normal balances
      const currentBalance = account.balance.toNumber();
      const yieldEarnings = currentBalance * dailyRate * daysPassed;

      // Ignore microscopic yields (less than 1 cent)
      if (yieldEarnings < 0.01) continue;

      const referenceMonth = getFinanceReferenceMonth(today, 25);

      await prisma.$transaction(async (tx) => {
        // Create the Yield transaction
        await tx.transaction.create({
          data: {
            accountId: account.id,
            amount: yieldEarnings,
            type: "INCOME",
            description: `Rendimento Diário (${account.name})`,
            paymentMethod: "OTHER",
            date: today,
            isPaid: true,
            condition: "A_VISTA",
            referenceMonth,
            notes: `Rendimento calculado para ${daysPassed} dia(s). Taxa: ${account.yieldRate}% a.a.`,
          },
        });

        // Update Account balance and lastYieldDate
        await tx.account.update({
          where: { id: account.id },
          data: {
            balance: { increment: yieldEarnings },
            lastYieldDate: today,
          },
        });
      });

      processedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Rendimentos processados com sucesso. Contas afetadas: ${processedCount}`,
      processedCount,
    });
  } catch (error) {
    console.error("Error processing daily yields:", error);
    return NextResponse.json(
      { error: "Failed to process daily yields." },
      { status: 500 }
    );
  }
}
