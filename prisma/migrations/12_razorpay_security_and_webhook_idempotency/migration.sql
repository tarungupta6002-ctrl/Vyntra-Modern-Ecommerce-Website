-- ==============================================================================
-- VYNTRA RAZORPAY SECURITY & WEBHOOK IDEMPOTENCY MIGRATION (Phase 12 Migration)
-- Additive Schema Expansion for Payment Gateway Replay Protection & Webhook Ledger
-- ==============================================================================

BEGIN;

-- 1. Add razorpayPaymentId and razorpayOrderId to Order table
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "razorpayPaymentId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "razorpayOrderId" TEXT;

-- 2. Add Unique Index on razorpayPaymentId (PostgreSQL allows multiple NULLs in UNIQUE index)
CREATE UNIQUE INDEX IF NOT EXISTS "Order_razorpayPaymentId_key" ON "Order"("razorpayPaymentId");
CREATE INDEX IF NOT EXISTS "Order_razorpayOrderId_idx" ON "Order"("razorpayOrderId");

-- 3. Create Table: PaymentWebhookEvent
CREATE TABLE IF NOT EXISTS "PaymentWebhookEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "paymentId" TEXT,
    "orderId" TEXT,
    "payload" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PROCESSED',
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- 4. Unique Index on eventId for strict replay prevention
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentWebhookEvent_eventId_key" ON "PaymentWebhookEvent"("eventId");
CREATE INDEX IF NOT EXISTS "PaymentWebhookEvent_paymentId_idx" ON "PaymentWebhookEvent"("paymentId");
CREATE INDEX IF NOT EXISTS "PaymentWebhookEvent_orderId_idx" ON "PaymentWebhookEvent"("orderId");
CREATE INDEX IF NOT EXISTS "PaymentWebhookEvent_createdAt_idx" ON "PaymentWebhookEvent"("createdAt");

-- 5. Backfill existing online test orders where remittanceReference has Razorpay payment ID
UPDATE "Order"
SET "razorpayPaymentId" = "remittanceReference"
WHERE "remittanceReference" LIKE 'pay_%' AND "razorpayPaymentId" IS NULL;

COMMIT;
