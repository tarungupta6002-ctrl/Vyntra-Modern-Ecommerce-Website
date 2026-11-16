-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "commissionRate" DECIMAL(5,2),
ADD COLUMN "commissionAmount" DECIMAL(12,2),
ADD COLUMN "commissionTax" DECIMAL(12,2),
ADD COLUMN "netEarnings" DECIMAL(12,2),
ADD COLUMN "payoutStatus" "PayoutStatus",
ADD COLUMN "vendorPayoutId" TEXT;

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformSetting_key_key" ON "PlatformSetting"("key");

-- CreateIndex
CREATE INDEX "OrderItem_vendorPayoutId_idx" ON "OrderItem"("vendorPayoutId");

-- CreateIndex
CREATE INDEX "OrderItem_payoutStatus_idx" ON "OrderItem"("payoutStatus");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_vendorPayoutId_fkey" FOREIGN KEY ("vendorPayoutId") REFERENCES "VendorPayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
