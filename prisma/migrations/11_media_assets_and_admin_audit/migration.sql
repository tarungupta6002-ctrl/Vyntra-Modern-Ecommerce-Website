-- ==============================================================================
-- VYNTRA MEDIA ASSETS & ADMIN AUDIT TRAIL (Phase 6-7 Migration)
-- Additive Schema Expansion for Media Repository & Administrative Logging
-- ==============================================================================

BEGIN;

-- 1. Create Enum: MediaAssetCategory
CREATE TYPE "MediaAssetCategory" AS ENUM (
    'PRODUCT_GALLERY',
    'COLOR_SWATCH',
    'APLUS_CONTENT',
    'BRAND_ASSET',
    'OTHER'
);

-- 2. Create Table: MediaAsset
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT,
    "title" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "category" "MediaAssetCategory" NOT NULL DEFAULT 'PRODUCT_GALLERY',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "referenceCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MediaAsset_vendorId_idx" ON "MediaAsset"("vendorId");
CREATE INDEX "MediaAsset_category_idx" ON "MediaAsset"("category");
CREATE INDEX "MediaAsset_createdAt_idx" ON "MediaAsset"("createdAt");

-- 3. Create Table: AdminAuditLog
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminAuditLog_adminId_idx" ON "AdminAuditLog"("adminId");
CREATE INDEX "AdminAuditLog_entity_idx" ON "AdminAuditLog"("entity");
CREATE INDEX "AdminAuditLog_entityId_idx" ON "AdminAuditLog"("entityId");
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- 4. Add Constraints
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
