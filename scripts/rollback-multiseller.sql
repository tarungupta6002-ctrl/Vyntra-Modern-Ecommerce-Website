-- ==============================================================================
-- VYNTRA MULTI-SELLER ROLLBACK SCRIPT (EMERGENCY REVERSAL)
-- ==============================================================================
-- CRITICAL WARNING & IRREVERSIBLE DATA LOSS DISCLOSURE:
-- ------------------------------------------------------------------------------
-- Executing this script causes IMMEDIATE, PERMANENT, AND IRREVERSIBLE DATA LOSS
-- for all entities created under the Multi-Seller architecture (Phases 2-7):
--
-- IRREVERSIBLY DESTROYED TABLES AND DATA:
--   1. "SellerOffer": ALL independent seller pricing, handling SLAs, and Buy Box flags.
--   2. "OfferVariant": ALL seller SKUs, promotional markups, and variant terms.
--   3. "OfferInventory": ALL multi-warehouse inventory stock tracking data.
--   4. "VendorShipment": ALL multi-vendor consignments, subtotal splits, and AWB links.
--   5. "VendorShipmentItem": ALL shipment package item join records.
--   6. "MediaAsset": ALL uploaded gallery photos, swatches, and metadata in the asset library.
--   7. "Brand": ALL brand entities and verified owner mappings.
--   8. "VendorWarehouse": ALL facility addresses and warehouse dispatch configurations.
--   9. "AdminAuditLog": ALL recorded administrative audit events, timestamps, and state diffs.
--
-- PRESERVED DATA (Historical Single-Seller Core):
--   - "User", "VendorProfile", "Product", "ProductVariant", "ProductInventory",
--     "Order", "OrderItem", "Cart", "VendorPayout", "Review", "ReturnRequest".
--   - Newly added foreign key columns on OrderItem, CartItem, and Product are reset to NULL.
--
-- DO NOT EXECUTE AUTOMATICALLY. REQUIRES FORMAL ENGINEERING SIGN-OFF.
-- ==============================================================================

BEGIN;

-- 1. Unlink foreign keys from core production records
UPDATE "OrderItem"
SET "vendorShipmentId" = NULL,
    "sellerOfferId" = NULL,
    "offerVariantId" = NULL
WHERE "vendorShipmentId" IS NOT NULL
   OR "sellerOfferId" IS NOT NULL
   OR "offerVariantId" IS NOT NULL;

UPDATE "CartItem"
SET "sellerOfferId" = NULL,
    "offerVariantId" = NULL
WHERE "sellerOfferId" IS NOT NULL
   OR "offerVariantId" IS NOT NULL;

UPDATE "Product"
SET "brandRefId" = NULL
WHERE "brandRefId" IS NOT NULL;

-- 2. Drop additive tables in reverse dependency order (IRREVERSIBLE DATA DESTRUCTION)
DROP TABLE IF EXISTS "AdminAuditLog" CASCADE;
DROP TABLE IF EXISTS "MediaAsset" CASCADE;
DROP TABLE IF EXISTS "VendorShipmentItem" CASCADE;
DROP TABLE IF EXISTS "VendorShipment" CASCADE;
DROP TABLE IF EXISTS "OfferInventory" CASCADE;
DROP TABLE IF EXISTS "OfferVariant" CASCADE;
DROP TABLE IF EXISTS "SellerOffer" CASCADE;
DROP TABLE IF EXISTS "VendorWarehouse" CASCADE;
DROP TABLE IF EXISTS "Brand" CASCADE;

-- 3. Drop additive columns from core tables
ALTER TABLE "OrderItem"
    DROP COLUMN IF EXISTS "vendorShipmentId",
    DROP COLUMN IF EXISTS "sellerOfferId",
    DROP COLUMN IF EXISTS "offerVariantId";

ALTER TABLE "CartItem"
    DROP COLUMN IF EXISTS "sellerOfferId",
    DROP COLUMN IF EXISTS "offerVariantId";

ALTER TABLE "Product"
    DROP COLUMN IF EXISTS "brandRefId";

-- 4. Drop newly introduced Enums
DROP TYPE IF EXISTS "MediaAssetCategory";
DROP TYPE IF EXISTS "ShipmentStatus";
DROP TYPE IF EXISTS "FulfillmentType";
DROP TYPE IF EXISTS "OfferCondition";

COMMIT;
