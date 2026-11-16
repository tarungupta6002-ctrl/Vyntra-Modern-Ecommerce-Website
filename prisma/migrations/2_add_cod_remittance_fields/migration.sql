-- AlterTable
ALTER TABLE "Order" ADD COLUMN "remittanceReference" TEXT,
ADD COLUMN "settledAt" TIMESTAMP(3);
