-- ==============================================================================
-- 1. Create Enums
-- ==============================================================================
CREATE TYPE "PayoutSettlementType" AS ENUM ('BANK_TRANSFER', 'INTERNAL_OFFSET');
CREATE TYPE "AllocationStatus" AS ENUM ('ACTIVE', 'REVERSED');

-- ==============================================================================
-- 2. Update VendorPayout
-- ==============================================================================
ALTER TABLE "VendorPayout" 
ADD COLUMN "settlementType" "PayoutSettlementType" NOT NULL DEFAULT 'BANK_TRANSFER';

CREATE INDEX "VendorPayout_settlementType_idx" ON "VendorPayout"("settlementType");

-- Check constraint: enforce genuine bank reference vs internal offset separation
ALTER TABLE "VendorPayout"
ADD CONSTRAINT "chk_payout_settlement_reference"
CHECK (
  (
    "settlementType" = 'INTERNAL_OFFSET'
    AND "netAmount" = 0.00
    AND "referenceNumber" IS NULL
    AND "status" = 'COMPLETED'
    AND "paidAt" IS NOT NULL
  )
  OR
  (
    "settlementType" = 'BANK_TRANSFER'
    AND (
      "status" != 'COMPLETED'
      OR (
        "referenceNumber" IS NOT NULL
        AND length(trim("referenceNumber")) >= 6
        AND "paidAt" IS NOT NULL
      )
    )
  )
);

-- Check constraint: payout netAmount can never be negative
ALTER TABLE "VendorPayout"
ADD CONSTRAINT "chk_payout_non_negative_net"
CHECK ("netAmount" >= 0.00);

-- ==============================================================================
-- 3. Composite Unique Key on VendorAdjustment
-- ==============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS "VendorAdjustment_id_vendorProfileId_key" 
ON "VendorAdjustment"("id", "vendorProfileId");

-- ==============================================================================
-- 4. Create VendorAdjustmentAllocation Table
-- ==============================================================================
CREATE TABLE "VendorAdjustmentAllocation" (
    "id" TEXT NOT NULL,
    "vendorAdjustmentId" TEXT NOT NULL,
    "vendorPayoutId" TEXT NOT NULL,
    "vendorProfileId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "allocationSequence" INTEGER NOT NULL,
    "status" "AllocationStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "reversedAt" TIMESTAMP(3),
    "reversalReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorAdjustmentAllocation_pkey" PRIMARY KEY ("id")
);

-- Positive Amount Constraint
ALTER TABLE "VendorAdjustmentAllocation"
    ADD CONSTRAINT "chk_vendor_adjustment_allocation_positive"
    CHECK (amount > 0);

-- Reversal Audit Integrity Constraint
ALTER TABLE "VendorAdjustmentAllocation"
    ADD CONSTRAINT "chk_allocation_reversal_integrity"
    CHECK (
      ("status" = 'ACTIVE' AND "reversedAt" IS NULL AND "reversalReason" IS NULL)
      OR
      ("status" = 'REVERSED' AND "reversedAt" IS NOT NULL AND "reversalReason" IS NOT NULL)
    );

-- Composite Foreign Keys (Vendor Isolation Guard)
ALTER TABLE "VendorAdjustmentAllocation"
    ADD CONSTRAINT "VendorAdjustmentAllocation_adjustment_fkey"
    FOREIGN KEY ("vendorAdjustmentId", "vendorProfileId")
    REFERENCES "VendorAdjustment"("id", "vendorProfileId")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VendorAdjustmentAllocation"
    ADD CONSTRAINT "VendorAdjustmentAllocation_payout_fkey"
    FOREIGN KEY ("vendorPayoutId", "vendorProfileId")
    REFERENCES "VendorPayout"("id", "vendorId")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VendorAdjustmentAllocation"
    ADD CONSTRAINT "VendorAdjustmentAllocation_vendor_fkey"
    FOREIGN KEY ("vendorProfileId")
    REFERENCES "VendorProfile"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Unique and Query Indexes
CREATE UNIQUE INDEX "VendorAdjustmentAllocation_vendorAdjustmentId_vendorPayoutId_key"
ON "VendorAdjustmentAllocation"("vendorAdjustmentId", "vendorPayoutId");

CREATE UNIQUE INDEX "VendorAdjustmentAllocation_adjustment_seq_key"
ON "VendorAdjustmentAllocation"("vendorAdjustmentId", "allocationSequence");

CREATE INDEX "VendorAdjustmentAllocation_vendorAdjustmentId_idx"
ON "VendorAdjustmentAllocation"("vendorAdjustmentId");

CREATE INDEX "VendorAdjustmentAllocation_vendorPayoutId_idx"
ON "VendorAdjustmentAllocation"("vendorPayoutId");

CREATE INDEX "VendorAdjustmentAllocation_vendorProfileId_idx"
ON "VendorAdjustmentAllocation"("vendorProfileId");

CREATE INDEX "VendorAdjustmentAllocation_status_idx"
ON "VendorAdjustmentAllocation"("status");

CREATE INDEX "VendorAdjustmentAllocation_createdAt_idx"
ON "VendorAdjustmentAllocation"("createdAt");

-- ==============================================================================
-- 5. Concurrency-Safe Row-Locking Trigger on VendorAdjustment
-- ==============================================================================
CREATE OR REPLACE FUNCTION check_vendor_adjustment_allocation_cap()
RETURNS TRIGGER AS $$
DECLARE
    v_adj_amount DECIMAL(10,2);
    v_total_allocated DECIMAL(10,2);
BEGIN
    -- 1. Deterministically lock the parent VendorAdjustment row with FOR UPDATE
    -- Serializes concurrent allocation attempts for this specific adjustment
    SELECT amount INTO v_adj_amount
    FROM "VendorAdjustment"
    WHERE id = NEW."vendorAdjustmentId"
    FOR UPDATE;

    IF v_adj_amount IS NULL THEN
        RAISE EXCEPTION 'ADJUSTMENT_NOT_FOUND: VendorAdjustment % does not exist', NEW."vendorAdjustmentId";
    END IF;

    -- 2. Recalculate cumulative ACTIVE allocations after obtaining row lock
    -- Only ACTIVE allocations count towards the cap; REVERSED allocations are excluded
    SELECT COALESCE(SUM(amount), 0) INTO v_total_allocated
    FROM "VendorAdjustmentAllocation"
    WHERE "vendorAdjustmentId" = NEW."vendorAdjustmentId"
      AND "status" = 'ACTIVE'
      AND id <> COALESCE(NEW.id, '');

    -- 3. If new allocation is ACTIVE, verify it does not exceed the adjustment cap
    IF NEW."status" = 'ACTIVE' AND (v_total_allocated + NEW.amount) > v_adj_amount THEN
        RAISE EXCEPTION 'ALLOCATION_EXCEEDS_CAP: Cumulative active allocation (₹%) cannot exceed adjustment amount (₹%)',
            (v_total_allocated + NEW.amount), v_adj_amount;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_vendor_adjustment_allocation_cap ON "VendorAdjustmentAllocation";

CREATE TRIGGER trg_check_vendor_adjustment_allocation_cap
BEFORE INSERT OR UPDATE ON "VendorAdjustmentAllocation"
FOR EACH ROW
EXECUTE FUNCTION check_vendor_adjustment_allocation_cap();
