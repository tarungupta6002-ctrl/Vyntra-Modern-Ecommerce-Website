-- ==============================================================================
-- Migration 8: Product Customization Flag & OrderItem Purchase Snapshot
-- ==============================================================================

-- 1. AlterTable Product to add isCustomized flag
ALTER TABLE "Product" ADD COLUMN "isCustomized" BOOLEAN NOT NULL DEFAULT false;

-- 2. AlterTable OrderItem to add isCustomizedSnapshot purchase snapshot
ALTER TABLE "OrderItem" ADD COLUMN "isCustomizedSnapshot" BOOLEAN NOT NULL DEFAULT false;
