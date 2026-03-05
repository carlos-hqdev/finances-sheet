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
    const investments = await prisma.investment.findMany({
      where: { 
        isDailyYield: true,
        yieldRate: { not: null },
      },
      include: {
        lots: true, // We need to calculate yield per lot
      },
    });

    let totalYields = 0;

    for (const investment of investments) {
      if (!investment.yieldRate || investment.balance.toNumber() <= 0) continue;

      // Determine days since last yield (default to 1 if no previous record exists)
      const lastYieldDate = investment.updatedAt; // Temporarily using updatedAt or we need lastYieldDate in Investment
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const lastDate = new Date(lastYieldDate || investment.createdAt);
      lastDate.setHours(0, 0, 0, 0);

      const diffTime = today.getTime() - lastDate.getTime();
      const daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (daysPassed <= 0) continue;

      // Yield calculation (simplified)
      // yieldRate is typically annual (e.g., 10%). 
      // Monthly: (1 + annualRate)^(1/12) - 1
      // To get the actual decimal: yieldRate / 100
      // Daily multiplier = (yieldRate / 100) / 365
      const annualRateDecimal = investment.yieldRate.toNumber() / 100;
      // Compound interest formula: A = P(1 + r/n)^(nt)
      // Since it's daily, n=1, t=daysPassed, r = dailyRate
      const dailyRate = annualRateDecimal / 365;
      const compoundFactor = Math.pow(1 + dailyRate, daysPassed);
      
      const previousBalance = investment.balance.toNumber();
      const rawYieldAmount = previousBalance * (compoundFactor - 1);
      
      // Let's cap precision to 2 decimal places to avoid tiny fractions preventing updates
      const yieldAmount = Number(rawYieldAmount.toFixed(4)); 
      
      if (yieldAmount <= 0.005) {
        continue; // Too small to register as a cent
      }

      await prisma.$transaction(async (tx) => {
        // Create a generic transaction representing the yield (Income)
        // Since it's an investment now, it's not a regular account transaction.
        // For now, we update the investment balance directly.
        // Or generate a history record.
        
        await tx.investmentHistory.create({
          data: {
            investmentId: investment.id,
            balance: previousBalance + yieldAmount,
            date: new Date()
          }
        });

        // Update Investment balance and timestamp
        await tx.investment.update({
          where: { id: investment.id },
          data: {
            balance: { increment: yieldAmount },
          },
        });
      });

      totalYields++;
    }

    return NextResponse.json({
      success: true,
      message: `Processed yields for ${totalYields} investments.`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error processing daily yields:", error);
    return NextResponse.json(
      { error: "Failed to process daily yields." },
      { status: 500 }
    );
  }
}
