-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "isDailyYield" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastYieldDate" TIMESTAMP(3),
ADD COLUMN     "yieldRate" DECIMAL(65,30);
