/*
  Warnings:

  - You are about to drop the column `isDailyYield` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `lastYieldDate` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `yieldRate` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `yieldFrequency` on the `Investment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Account" DROP COLUMN "isDailyYield",
DROP COLUMN "lastYieldDate",
DROP COLUMN "yieldRate";

-- AlterTable
ALTER TABLE "Investment" DROP COLUMN "yieldFrequency",
ADD COLUMN     "isDailyYield" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "targetAmount" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "investmentId" TEXT;

-- CreateTable
CREATE TABLE "InvestmentLot" (
    "id" TEXT NOT NULL,
    "investmentId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "quantity" DECIMAL(65,30),
    "originalPrice" DECIMAL(65,30) NOT NULL,
    "currentBalance" DECIMAL(65,30) NOT NULL,
    "isFullyWithdrawn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestmentLot_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentLot" ADD CONSTRAINT "InvestmentLot_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentLot" ADD CONSTRAINT "InvestmentLot_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
