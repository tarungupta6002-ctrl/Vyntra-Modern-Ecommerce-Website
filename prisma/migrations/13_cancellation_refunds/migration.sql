-- Automatic Razorpay refunds for cancelled online-paid orders.
-- Additive only: one new table, no changes to existing tables or data.

-- CreateTable
CREATE TABLE "CancellationRefund" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'INITIATED',
    "initiatedBy" TEXT NOT NULL,
    "razorpayPaymentId" TEXT,
    "razorpayRefundId" TEXT,
    "failureReason" TEXT,
    "gatewayResponse" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CancellationRefund_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CancellationRefund_orderId_key" ON "CancellationRefund"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "CancellationRefund_razorpayRefundId_key" ON "CancellationRefund"("razorpayRefundId");

-- CreateIndex
CREATE INDEX "CancellationRefund_status_idx" ON "CancellationRefund"("status");

-- CreateIndex
CREATE INDEX "CancellationRefund_createdAt_idx" ON "CancellationRefund"("createdAt");

-- AddForeignKey
ALTER TABLE "CancellationRefund" ADD CONSTRAINT "CancellationRefund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
