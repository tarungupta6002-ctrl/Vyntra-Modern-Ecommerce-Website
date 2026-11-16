-- CreateEnum
CREATE TYPE "ReturnType" AS ENUM ('RETURN_REFUND', 'REPLACEMENT');

-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'PICKED_UP', 'RECEIVED_AT_WH', 'QC_PASSED', 'QC_FAILED', 'QC_DISPUTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReturnReason" AS ENUM ('DAMAGED_ON_ARRIVAL', 'DEFECTIVE', 'WRONG_ITEM', 'SIZE_FIT_ISSUE', 'NOT_AS_DESCRIBED', 'QUALITY_NOT_EXPECTED', 'BUYER_REMORSE');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('INITIATED', 'GATEWAY_PENDING', 'CONFIRMED', 'FAILED', 'RECONCILIATION_REQUIRED');

-- CreateEnum
CREATE TYPE "RefundMode" AS ENUM ('ORIGINAL_PAYMENT', 'STORE_CREDIT', 'MANUAL_BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM ('RETURN_REFUND_DEBIT', 'REPLACEMENT_RESTOCK_CREDIT', 'DAMAGED_ITEM_FEE', 'SHIPPING_REVERSAL', 'PENALTY', 'COMPENSATION', 'MANUAL_CORRECTION');

-- AlterEnum
ALTER TYPE "PayoutStatus" ADD VALUE 'CANCELLED';

-- CreateTable
CREATE TABLE "ReturnRequest" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "vendorProfileId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ReturnType" NOT NULL DEFAULT 'RETURN_REFUND',
    "status" "ReturnStatus" NOT NULL DEFAULT 'REQUESTED',
    "reason" "ReturnReason" NOT NULL,
    "detailedReason" TEXT,
    "customerNotes" TEXT,
    "adminNotes" TEXT,
    "vendorNotes" TEXT,
    "requestedQuantity" INTEGER NOT NULL DEFAULT 1,
    "reverseTrackingNumber" TEXT,
    "reverseCourierPartner" TEXT,
    "pickedUpAt" TIMESTAMP(3),
    "receivedAtWarehouseAt" TIMESTAMP(3),
    "qcPassed" BOOLEAN,
    "qcFailedReason" TEXT,
    "qcNotes" TEXT,
    "qcCompletedAt" TIMESTAMP(3),
    "isDisputed" BOOLEAN NOT NULL DEFAULT false,
    "disputeNotes" TEXT,
    "disputeResolvedAt" TIMESTAMP(3),
    "disputedByRole" TEXT,
    "disputeResolution" TEXT,
    "nextRefundSequence" INTEGER NOT NULL DEFAULT 1,
    "allocatedInventoryId" TEXT,
    "allocatedVariantId" TEXT,
    "allocatedVendorId" TEXT,
    "restockInventoryId" TEXT,
    "restockVariantId" TEXT,
    "restockVendorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReturnRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefundTransaction" (
    "id" TEXT NOT NULL,
    "returnRequestId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vendorProfileId" TEXT NOT NULL,
    "clientRequestId" TEXT NOT NULL,
    "requestSequence" INTEGER NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'INITIATED',
    "mode" "RefundMode" NOT NULL DEFAULT 'ORIGINAL_PAYMENT',
    "amount" DECIMAL(10,2) NOT NULL,
    "vendorShare" DECIMAL(10,2) NOT NULL,
    "platformShare" DECIMAL(10,2) NOT NULL,
    "gatewayTransactionId" TEXT,
    "gatewayReference" TEXT,
    "gatewayResponse" JSONB,
    "failureReason" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefundTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorAdjustment" (
    "id" TEXT NOT NULL,
    "vendorProfileId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "type" "AdjustmentType" NOT NULL,
    "description" TEXT NOT NULL,
    "returnRequestId" TEXT,
    "refundTransactionId" TEXT,
    "vendorPayoutId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReturnRequest_orderItemId_key" ON "ReturnRequest"("orderItemId");

-- CreateIndex
CREATE INDEX "ReturnRequest_orderId_idx" ON "ReturnRequest"("orderId");

-- CreateIndex
CREATE INDEX "ReturnRequest_orderItemId_idx" ON "ReturnRequest"("orderItemId");

-- CreateIndex
CREATE INDEX "ReturnRequest_vendorProfileId_idx" ON "ReturnRequest"("vendorProfileId");

-- CreateIndex
CREATE INDEX "ReturnRequest_userId_idx" ON "ReturnRequest"("userId");

-- CreateIndex
CREATE INDEX "ReturnRequest_status_idx" ON "ReturnRequest"("status");

-- CreateIndex
CREATE INDEX "ReturnRequest_type_idx" ON "ReturnRequest"("type");

-- CreateIndex
CREATE INDEX "ReturnRequest_createdAt_idx" ON "ReturnRequest"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnRequest_id_vendorProfileId_key" ON "ReturnRequest"("id", "vendorProfileId");

-- CreateIndex
CREATE INDEX "RefundTransaction_returnRequestId_idx" ON "RefundTransaction"("returnRequestId");

-- CreateIndex
CREATE INDEX "RefundTransaction_orderId_idx" ON "RefundTransaction"("orderId");

-- CreateIndex
CREATE INDEX "RefundTransaction_vendorProfileId_idx" ON "RefundTransaction"("vendorProfileId");

-- CreateIndex
CREATE INDEX "RefundTransaction_status_idx" ON "RefundTransaction"("status");

-- CreateIndex
CREATE INDEX "RefundTransaction_createdAt_idx" ON "RefundTransaction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RefundTransaction_id_vendorProfileId_key" ON "RefundTransaction"("id", "vendorProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "RefundTransaction_returnRequestId_clientRequestId_key" ON "RefundTransaction"("returnRequestId", "clientRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "RefundTransaction_returnRequestId_requestSequence_key" ON "RefundTransaction"("returnRequestId", "requestSequence");

-- CreateIndex
CREATE INDEX "VendorAdjustment_vendorProfileId_idx" ON "VendorAdjustment"("vendorProfileId");

-- CreateIndex
CREATE INDEX "VendorAdjustment_returnRequestId_idx" ON "VendorAdjustment"("returnRequestId");

-- CreateIndex
CREATE INDEX "VendorAdjustment_refundTransactionId_idx" ON "VendorAdjustment"("refundTransactionId");

-- CreateIndex
CREATE INDEX "VendorAdjustment_vendorPayoutId_idx" ON "VendorAdjustment"("vendorPayoutId");

-- CreateIndex
CREATE INDEX "VendorAdjustment_type_idx" ON "VendorAdjustment"("type");

-- CreateIndex
CREATE INDEX "VendorAdjustment_createdAt_idx" ON "VendorAdjustment"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductInventory_id_variantId_vendorId_key" ON "ProductInventory"("id", "variantId", "vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorPayout_id_vendorId_key" ON "VendorPayout"("id", "vendorId");

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_vendorProfileId_fkey" FOREIGN KEY ("vendorProfileId") REFERENCES "VendorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_allocatedInventoryId_allocatedVariantId_allo_fkey" FOREIGN KEY ("allocatedInventoryId", "allocatedVariantId", "allocatedVendorId") REFERENCES "ProductInventory"("id", "variantId", "vendorId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_restockInventoryId_restockVariantId_restockV_fkey" FOREIGN KEY ("restockInventoryId", "restockVariantId", "restockVendorId") REFERENCES "ProductInventory"("id", "variantId", "vendorId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundTransaction" ADD CONSTRAINT "RefundTransaction_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundTransaction" ADD CONSTRAINT "RefundTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundTransaction" ADD CONSTRAINT "RefundTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundTransaction" ADD CONSTRAINT "RefundTransaction_vendorProfileId_fkey" FOREIGN KEY ("vendorProfileId") REFERENCES "VendorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorAdjustment" ADD CONSTRAINT "VendorAdjustment_vendorProfileId_fkey" FOREIGN KEY ("vendorProfileId") REFERENCES "VendorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorAdjustment" ADD CONSTRAINT "VendorAdjustment_returnRequestId_vendorProfileId_fkey" FOREIGN KEY ("returnRequestId", "vendorProfileId") REFERENCES "ReturnRequest"("id", "vendorProfileId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorAdjustment" ADD CONSTRAINT "VendorAdjustment_refundTransactionId_vendorProfileId_fkey" FOREIGN KEY ("refundTransactionId", "vendorProfileId") REFERENCES "RefundTransaction"("id", "vendorProfileId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorAdjustment" ADD CONSTRAINT "VendorAdjustment_vendorPayoutId_vendorProfileId_fkey" FOREIGN KEY ("vendorPayoutId", "vendorProfileId") REFERENCES "VendorPayout"("id", "vendorId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ==============================================================================
-- POSTGRESQL CHECK CONSTRAINTS FOR PHASE 12
-- ==============================================================================

-- 1. VendorAdjustment Parent Exclusivity & Permitted Types
ALTER TABLE "VendorAdjustment"
  ADD CONSTRAINT "chk_vendor_adjustment_parent_integrity"
  CHECK (
    (
      type = 'RETURN_REFUND_DEBIT' 
      AND "returnRequestId" IS NOT NULL 
      AND "refundTransactionId" IS NOT NULL 
      AND "vendorPayoutId" IS NULL
    ) OR
    (
      type = 'REPLACEMENT_RESTOCK_CREDIT' 
      AND "returnRequestId" IS NOT NULL 
      AND "refundTransactionId" IS NULL 
      AND "vendorPayoutId" IS NULL
    ) OR
    (
      type IN ('DAMAGED_ITEM_FEE', 'SHIPPING_REVERSAL', 'PENALTY', 'COMPENSATION', 'MANUAL_CORRECTION')
      AND (
        ("returnRequestId" IS NOT NULL AND "vendorPayoutId" IS NULL) OR
        ("returnRequestId" IS NULL AND "vendorPayoutId" IS NOT NULL) OR
        ("returnRequestId" IS NULL AND "vendorPayoutId" IS NULL)
      )
    )
  );

-- 2. RefundTransaction Positive Amount & Exact Paise Share Split
ALTER TABLE "RefundTransaction"
  ADD CONSTRAINT "chk_refund_positive_and_shares"
  CHECK (
    "amount" > 0 AND
    "vendorShare" >= 0 AND
    "platformShare" >= 0 AND
    ("vendorShare" + "platformShare" = "amount")
  );

-- 3. ReturnRequest Quantity Integrity
ALTER TABLE "ReturnRequest"
  ADD CONSTRAINT "chk_return_request_quantity_positive"
  CHECK ("requestedQuantity" > 0);
