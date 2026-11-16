-- ==============================================================================
-- VYNTRA MULTI-SELLER DATA BACKFILL SCRIPT (IDEMPOTENT & NON-DESTRUCTIVE)
-- WARNING: DO NOT EXECUTE AUTOMATICALLY. REQUIRES EXPLICIT USER APPROVAL.
-- Mode: Transactional, idempotent, zero data loss, zero destructive mutation.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- PRE-CHECK VALIDATION: Ensure required Multi-Seller tables exist before backfilling
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Brand') THEN
        RAISE EXCEPTION 'Table "Brand" does not exist. Please apply Migration 10 first.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'SellerOffer') THEN
        RAISE EXCEPTION 'Table "SellerOffer" does not exist. Please apply Migration 10 first.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'VendorShipment') THEN
        RAISE EXCEPTION 'Table "VendorShipment" does not exist. Please apply Migration 10 first.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'VendorShipmentItem') THEN
        RAISE EXCEPTION 'Table "VendorShipmentItem" does not exist. Please apply Migration 10 first.';
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- STEP 1: BACKFILL BRANDS FROM EXISTING PRODUCT STRINGS
-- Groups by distinct trimmed brand name to prevent duplicate attempts
-- ------------------------------------------------------------------------------
INSERT INTO "Brand" ("id", "name", "slug", "isVerified", "createdAt", "updatedAt")
SELECT
    'brand_' || substr(md5(trim(p."brand")), 1, 16) AS "id",
    trim(p."brand") AS "name",
    lower(regexp_replace(trim(p."brand"), '[^a-zA-Z0-9]+', '-', 'g')) AS "slug",
    true AS "isVerified",
    NOW() AS "createdAt",
    NOW() AS "updatedAt"
FROM "Product" p
WHERE p."brand" IS NOT NULL AND length(trim(p."brand")) > 0
GROUP BY trim(p."brand")
ON CONFLICT ("name") DO UPDATE
SET "updatedAt" = NOW();

-- Link Product.brandRefId to Brand.id
UPDATE "Product" p
SET "brandRefId" = b."id"
FROM "Brand" b
WHERE trim(p."brand") = b."name"
  AND p."brandRefId" IS NULL;

-- ------------------------------------------------------------------------------
-- STEP 2: SYNTHESIZE DEFAULT VENDOR WAREHOUSE PER APPROVED VENDOR
-- ------------------------------------------------------------------------------
INSERT INTO "VendorWarehouse" (
    "id", "vendorId", "warehouseCode", "facilityName", "streetAddress",
    "city", "state", "postalCode", "contactPhone", "isDefault", "createdAt", "updatedAt"
)
SELECT
    'wh_' || substr(md5(v."id"), 1, 16) AS "id",
    v."id" AS "vendorId",
    'WH-' || upper(substr(md5(v."id"), 1, 6)) AS "warehouseCode",
    coalesce(v."storeName", 'Artisan Hub') || ' Primary Atelier' AS "facilityName",
    'Atelier Commercial Facility' AS "streetAddress",
    'Bengaluru' AS "city",
    'Karnataka' AS "state",
    '560001' AS "postalCode",
    coalesce(u."phone", '+91 9999999999') AS "contactPhone",
    true AS "isDefault",
    NOW() AS "createdAt",
    NOW() AS "updatedAt"
FROM "VendorProfile" v
JOIN "User" u ON u."id" = v."userId"
WHERE NOT EXISTS (
    SELECT 1 FROM "VendorWarehouse" w WHERE w."vendorId" = v."id"
)
ON CONFLICT ("vendorId", "warehouseCode") DO NOTHING;

-- ------------------------------------------------------------------------------
-- STEP 3: SYNTHESIZE SELLER OFFERS FOR ALL EXISTING PRODUCTS
-- Preserves master catalog Product ID without duplicating records
-- ------------------------------------------------------------------------------
INSERT INTO "SellerOffer" (
    "id", "productId", "vendorId", "condition", "status",
    "fulfillmentType", "handlingDays", "isBuyBoxWinner", "createdAt", "updatedAt"
)
SELECT
    'so_' || substr(md5(p."id" || '_' || p."vendorId"), 1, 16) AS "id",
    p."id" AS "productId",
    p."vendorId" AS "vendorId",
    'NEW'::"OfferCondition" AS "condition",
    CASE WHEN p."isPublished" THEN 'ACTIVE' ELSE 'INACTIVE' END AS "status",
    'SELLER_FULFILLED'::"FulfillmentType" AS "fulfillmentType",
    2 AS "handlingDays",
    true AS "isBuyBoxWinner",
    p."createdAt" AS "createdAt",
    NOW() AS "updatedAt"
FROM "Product" p
ON CONFLICT ("productId", "vendorId", "condition") DO UPDATE
SET "isBuyBoxWinner" = EXCLUDED."isBuyBoxWinner",
    "updatedAt" = NOW();

-- ------------------------------------------------------------------------------
-- STEP 4: SYNTHESIZE OFFER VARIANTS FOR ALL EXISTING PRODUCT VARIANTS
-- ------------------------------------------------------------------------------
INSERT INTO "OfferVariant" (
    "id", "sellerOfferId", "productVariantId", "vendorId", "sellerSku",
    "sellingPrice", "mrpPrice", "discountPercentage", "status", "createdAt", "updatedAt"
)
SELECT
    'ov_' || substr(md5(so."id" || '_' || pv."id"), 1, 16) AS "id",
    so."id" AS "sellerOfferId",
    pv."id" AS "productVariantId",
    so."vendorId" AS "vendorId",
    pv."sku" AS "sellerSku",
    pv."price" AS "sellingPrice",
    pv."originalPrice" AS "mrpPrice",
    pv."discountPercentage" AS "discountPercentage",
    'ACTIVE' AS "status",
    pv."createdAt" AS "createdAt",
    NOW() AS "updatedAt"
FROM "ProductVariant" pv
JOIN "SellerOffer" so ON so."productId" = pv."productId"
ON CONFLICT ("sellerOfferId", "productVariantId") DO UPDATE
SET "sellingPrice" = EXCLUDED."sellingPrice",
    "mrpPrice" = EXCLUDED."mrpPrice",
    "updatedAt" = NOW();

-- ------------------------------------------------------------------------------
-- STEP 5: BACKFILL OFFER INVENTORY FROM LEGACY PRODUCT INVENTORY
-- ------------------------------------------------------------------------------
INSERT INTO "OfferInventory" (
    "id", "offerVariantId", "warehouseId", "quantity", "reservedQuantity",
    "lowStockThreshold", "createdAt", "updatedAt"
)
SELECT
    'oi_' || substr(md5(ov."id" || '_' || coalesce(w."id", 'def')), 1, 16) AS "id",
    ov."id" AS "offerVariantId",
    w."id" AS "warehouseId",
    pi."quantity" AS "quantity",
    pi."reservedQuantity" AS "reservedQuantity",
    pi."lowStockThreshold" AS "lowStockThreshold",
    pi."createdAt" AS "createdAt",
    NOW() AS "updatedAt"
FROM "ProductInventory" pi
JOIN "OfferVariant" ov ON ov."productVariantId" = pi."variantId" AND ov."vendorId" = pi."vendorId"
JOIN "VendorWarehouse" w ON w."vendorId" = pi."vendorId" AND w."isDefault" = true
ON CONFLICT ("offerVariantId", "warehouseId") DO UPDATE
SET "quantity" = EXCLUDED."quantity",
    "reservedQuantity" = EXCLUDED."reservedQuantity",
    "updatedAt" = NOW();

-- ------------------------------------------------------------------------------
-- STEP 6: BACKFILL VENDOR SHIPMENTS FOR HISTORICAL ORDERS
-- Safely resolves vendorId from OrderItem or fallback Product.vendorId
-- ------------------------------------------------------------------------------
INSERT INTO "VendorShipment" (
    "id", "orderId", "vendorId", "shipmentNumber", "status", "subtotal",
    "shippingFee", "courierPartner", "trackingNumber", "dispatchedAt",
    "deliveredAt", "createdAt", "updatedAt"
)
SELECT
    'shp_' || substr(md5(o."id" || '_' || coalesce(oi."vendorId", p."vendorId")), 1, 16) AS "id",
    o."id" AS "orderId",
    coalesce(oi."vendorId", p."vendorId") AS "vendorId",
    'VYN-SHP-' || upper(substr(md5(o."id" || '_' || coalesce(oi."vendorId", p."vendorId")), 1, 10)) AS "shipmentNumber",
    CASE
        WHEN o."status" = 'DELIVERED' THEN 'DELIVERED'::"ShipmentStatus"
        WHEN o."status" = 'SHIPPED' THEN 'IN_TRANSIT'::"ShipmentStatus"
        WHEN o."status" = 'CANCELLED' THEN 'CANCELLED'::"ShipmentStatus"
        ELSE 'PENDING'::"ShipmentStatus"
    END AS "status",
    SUM(oi."totalPrice") AS "subtotal",
    0.00 AS "shippingFee",
    o."courierPartner" AS "courierPartner",
    o."trackingNumber" AS "trackingNumber",
    NULL AS "dispatchedAt",
    NULL AS "deliveredAt",
    o."createdAt" AS "createdAt",
    NOW() AS "updatedAt"
FROM "OrderItem" oi
JOIN "Order" o ON o."id" = oi."orderId"
LEFT JOIN "Product" p ON p."id" = oi."productId"
WHERE coalesce(oi."vendorId", p."vendorId") IS NOT NULL
GROUP BY o."id", coalesce(oi."vendorId", p."vendorId"), o."status", o."courierPartner", o."trackingNumber", o."createdAt"
ON CONFLICT ("shipmentNumber") DO NOTHING;

-- Link OrderItem to its synthesized VendorShipment, SellerOffer, and OfferVariant
UPDATE "OrderItem" item
SET
    "vendorShipmentId" = shp."id",
    "sellerOfferId" = so."id",
    "offerVariantId" = (
        SELECT ov."id"
        FROM "OfferVariant" ov
        WHERE ov."sellerOfferId" = so."id"
          AND ov."productVariantId" = item."variantId"
        LIMIT 1
    )
FROM "VendorShipment" shp, "Product" p, "SellerOffer" so
WHERE p."id" = item."productId"
  AND so."productId" = item."productId"
  AND so."vendorId" = coalesce(item."vendorId", p."vendorId")
  AND shp."orderId" = item."orderId"
  AND shp."vendorId" = coalesce(item."vendorId", p."vendorId")
  AND item."vendorShipmentId" IS NULL;

-- ------------------------------------------------------------------------------
-- STEP 6b: BACKFILL VENDOR SHIPMENT ITEMS (Crucial for Package Tracking)
-- Ensures exact one-to-one VendorShipmentItem linkage per historical OrderItem
-- ------------------------------------------------------------------------------
INSERT INTO "VendorShipmentItem" (
    "id", "shipmentId", "orderItemId", "productId", "variantId",
    "sellerOfferId", "offerVariantId", "quantity", "createdAt", "updatedAt"
)
SELECT
    'vsi_' || substr(md5(oi."vendorShipmentId" || '_' || oi."id"), 1, 16) AS "id",
    oi."vendorShipmentId" AS "shipmentId",
    oi."id" AS "orderItemId",
    oi."productId" AS "productId",
    oi."variantId" AS "variantId",
    oi."sellerOfferId" AS "sellerOfferId",
    oi."offerVariantId" AS "offerVariantId",
    oi."quantity" AS "quantity",
    oi."createdAt" AS "createdAt",
    NOW() AS "updatedAt"
FROM "OrderItem" oi
WHERE oi."vendorShipmentId" IS NOT NULL
ON CONFLICT ("shipmentId", "orderItemId") DO NOTHING;

-- ------------------------------------------------------------------------------
-- POST-BACKFILL INTEGRITY CHECKS (Audit Warnings)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    unlinked_items INTEGER;
    unlinked_products INTEGER;
BEGIN
    SELECT count(*) INTO unlinked_items
    FROM "OrderItem" WHERE "vendorShipmentId" IS NULL;

    SELECT count(*) INTO unlinked_products
    FROM "Product" WHERE "brandRefId" IS NULL AND "brand" IS NOT NULL AND length(trim("brand")) > 0;

    IF unlinked_items > 0 THEN
        RAISE WARNING 'Backfill Notice: % OrderItem records could not be mapped to a VendorShipment.', unlinked_items;
    END IF;

    IF unlinked_products > 0 THEN
        RAISE WARNING 'Backfill Notice: % Product records could not be mapped to a Brand.', unlinked_products;
    END IF;
END $$;

COMMIT;
