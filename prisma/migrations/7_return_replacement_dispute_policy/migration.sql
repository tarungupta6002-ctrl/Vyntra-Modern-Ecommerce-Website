-- ==============================================================================
-- Migration 7: Return, Replacement, Refund & QC Dispute Policy Schema Upgrades
-- ==============================================================================

-- 1. AlterEnum ReturnStatus to add REFUND_OFFERED
ALTER TYPE "ReturnStatus" ADD VALUE 'REFUND_OFFERED';

-- 2. AlterTable OrderItem to add immutable deliveredAt timestamp
ALTER TABLE "OrderItem" ADD COLUMN "deliveredAt" TIMESTAMP(3);
CREATE INDEX "OrderItem_deliveredAt_idx" ON "OrderItem"("deliveredAt");

-- 3. AlterTable ReturnRequest to add immutable rejectedAt timestamp
ALTER TABLE "ReturnRequest" ADD COLUMN "rejectedAt" TIMESTAMP(3);
CREATE INDEX "ReturnRequest_rejectedAt_idx" ON "ReturnRequest"("rejectedAt");

-- 4. AlterTable RefundTransaction to add separate shippingFeeRefund column
ALTER TABLE "RefundTransaction" ADD COLUMN "shippingFeeRefund" DECIMAL(10,2) NOT NULL DEFAULT 0.00;
