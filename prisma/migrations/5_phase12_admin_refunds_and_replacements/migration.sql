-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'PARTIALLY_REFUNDED';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "refundedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00;

-- AlterTable
ALTER TABLE "ReturnRequest" ADD COLUMN     "replacementCourierPartner" TEXT,
ADD COLUMN     "replacementDeliveredAt" TIMESTAMP(3),
ADD COLUMN     "replacementDispatchedAt" TIMESTAMP(3),
ADD COLUMN     "replacementTrackingNumber" TEXT;
