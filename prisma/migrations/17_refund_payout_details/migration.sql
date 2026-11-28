-- Where Cash on Delivery refunds are sent (customer's UPI ID or bank account).
-- Additive only: one enum and one new table, no changes to existing data.

-- CreateEnum
CREATE TYPE "RefundPayoutMethod" AS ENUM ('UPI', 'BANK_ACCOUNT');

-- CreateTable
CREATE TABLE "RefundPayoutDetail" (
    "id" TEXT NOT NULL,
    "returnRequestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "method" "RefundPayoutMethod" NOT NULL,
    "upiId" TEXT,
    "accountHolderName" TEXT,
    "accountNumber" TEXT,
    "ifsc" TEXT,
    "erasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefundPayoutDetail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RefundPayoutDetail_returnRequestId_key" ON "RefundPayoutDetail"("returnRequestId");

-- CreateIndex
CREATE INDEX "RefundPayoutDetail_userId_idx" ON "RefundPayoutDetail"("userId");

-- AddForeignKey
ALTER TABLE "RefundPayoutDetail" ADD CONSTRAINT "RefundPayoutDetail_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
