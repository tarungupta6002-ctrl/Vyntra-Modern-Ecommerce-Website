-- ==============================================================================
-- Migration 9: Customer Product Reviews & Moderation Lifecycle
-- ==============================================================================

-- 1. CreateEnum ReviewStatus
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FLAGGED');

-- 2. AlterTable Review to add orderItemId, status, and moderation metadata
ALTER TABLE "Review" ADD COLUMN "orderItemId" TEXT;
ALTER TABLE "Review" ADD COLUMN "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Review" ADD COLUMN "moderationNote" TEXT;
ALTER TABLE "Review" ADD COLUMN "moderatedBy" TEXT;
ALTER TABLE "Review" ADD COLUMN "moderatedAt" TIMESTAMP(3);

-- 3. CreateIndex for orderItemId (unique constraint for duplicate review protection per OrderItem)
CREATE UNIQUE INDEX "Review_orderItemId_key" ON "Review"("orderItemId");

-- 4. CreateIndex for status filtering and composite product+status lookup
CREATE INDEX "Review_status_idx" ON "Review"("status");
CREATE INDEX "Review_productId_status_idx" ON "Review"("productId", "status");

-- 5. AddForeignKey Review to OrderItem
ALTER TABLE "Review" ADD CONSTRAINT "Review_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
