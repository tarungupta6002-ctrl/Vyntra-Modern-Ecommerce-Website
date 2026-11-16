-- ==============================================================================
-- VYNTRA MULTI-SELLER BACKFILL PREVIEW & DRY-RUN AUDIT QUERIES
-- READ-ONLY: Executes zero writes, zero mutations, zero table locks.
-- Run in Supabase SQL Editor to preview exact row impacts before executing backfill.
-- ==============================================================================

-- 1. Brands to be created from existing products
SELECT
    count(DISTINCT trim("brand")) AS "brands_to_create",
    array_agg(DISTINCT trim("brand")) FILTER (WHERE "brand" IS NOT NULL) AS "sample_brands"
FROM "Product"
WHERE "brand" IS NOT NULL AND length(trim("brand")) > 0;

-- 2. Approved Vendors needing a default VendorWarehouse
SELECT
    count(*) AS "warehouses_to_create",
    array_agg(v."storeName") AS "sample_vendors"
FROM "VendorProfile" v
WHERE NOT EXISTS (
    SELECT 1 FROM "VendorWarehouse" w WHERE w."vendorId" = v."id"
);

-- 3. Products needing a synthesized default SellerOffer
SELECT
    count(*) AS "offers_to_create",
    count(DISTINCT p."vendorId") AS "vendors_impacted",
    count(*) FILTER (WHERE p."isPublished" = true) AS "active_offers_projected",
    count(*) FILTER (WHERE p."isPublished" = false) AS "inactive_offers_projected"
FROM "Product" p
WHERE NOT EXISTS (
    SELECT 1 FROM "SellerOffer" so WHERE so."productId" = p."id" AND so."vendorId" = p."vendorId"
);

-- 4. ProductVariants needing synthesized OfferVariants
SELECT
    count(*) AS "offer_variants_to_create",
    count(DISTINCT pv."productId") AS "products_covered"
FROM "ProductVariant" pv
JOIN "Product" p ON p."id" = pv."productId";

-- 5. ProductInventories to be mapped into OfferInventory
SELECT
    count(*) AS "inventories_to_map",
    sum(pi."quantity") AS "total_units_in_stock",
    sum(pi."reservedQuantity") AS "total_reserved_units"
FROM "ProductInventory" pi;

-- 6. Historical Orders & OrderItems to be partitioned into VendorShipments
SELECT
    count(DISTINCT o."id" || '_' || oi."vendorId") AS "vendor_shipments_projected",
    count(DISTINCT o."id") AS "total_parent_orders_affected",
    count(oi."id") AS "order_items_to_attach",
    sum(oi."totalPrice") AS "aggregate_shipments_gross_value"
FROM "OrderItem" oi
JOIN "Order" o ON o."id" = oi."orderId";

-- 7. Sanity Check: Identify any orphaned or corrupt legacy records
SELECT
    (SELECT count(*) FROM "Product" WHERE "vendorId" IS NULL) AS "products_missing_vendor_id",
    (SELECT count(*) FROM "OrderItem" WHERE "vendorId" IS NULL) AS "order_items_missing_vendor_id",
    (SELECT count(*) FROM "ProductVariant" WHERE "sku" IS NULL OR length(trim("sku")) = 0) AS "variants_missing_sku",
    (SELECT count(*) FROM "Order" WHERE "status" IS NULL) AS "orders_missing_status";
