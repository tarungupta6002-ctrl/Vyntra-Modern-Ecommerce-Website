-- ==============================================================================
-- VYNTRA MULTI-SELLER ARCHITECTURE EXPANSION (Phase 2-5 Migration)
-- Additive, Non-Destructive Schema Expansion for Supabase Cloud PostgreSQL
-- ==============================================================================

BEGIN;

-- 1. Create Enums
CREATE TYPE "OfferCondition" AS ENUM ('NEW', 'REFURBISHED', 'ARTISAN_RESTORED');
CREATE TYPE "FulfillmentType" AS ENUM ('SELLER_FULFILLED', 'VYNTRA_FULFILLED');
CREATE TYPE "ShipmentStatus" AS ENUM (
    'PENDING',
    'LABEL_CREATED',
    'PICKED_UP',
    'IN_TRANSIT',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
    'RETURNED_TO_ORIGIN'
);

-- 2. Create Table: Brand
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "bannerUrl" TEXT,
    "description" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "registeredOwnerVendorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Brand_name_key" ON "Brand"("name");
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");
CREATE INDEX "Brand_slug_idx" ON "Brand"("slug");

-- 3. Create Table: VendorWarehouse
CREATE TABLE "VendorWarehouse" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "warehouseCode" TEXT NOT NULL,
    "facilityName" TEXT NOT NULL,
    "streetAddress" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorWarehouse_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VendorWarehouse_vendorId_warehouseCode_key" ON "VendorWarehouse"("vendorId", "warehouseCode");
CREATE INDEX "VendorWarehouse_vendorId_idx" ON "VendorWarehouse"("vendorId");
CREATE INDEX "VendorWarehouse_postalCode_idx" ON "VendorWarehouse"("postalCode");

-- 4. Create Table: SellerOffer
CREATE TABLE "SellerOffer" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "condition" "OfferCondition" NOT NULL DEFAULT 'NEW',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "fulfillmentType" "FulfillmentType" NOT NULL DEFAULT 'SELLER_FULFILLED',
    "handlingDays" INTEGER NOT NULL DEFAULT 2,
    "isBuyBoxWinner" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerOffer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SellerOffer_productId_vendorId_condition_key" ON "SellerOffer"("productId", "vendorId", "condition");
CREATE INDEX "SellerOffer_productId_idx" ON "SellerOffer"("productId");
CREATE INDEX "SellerOffer_vendorId_idx" ON "SellerOffer"("vendorId");
CREATE INDEX "SellerOffer_status_idx" ON "SellerOffer"("status");
CREATE INDEX "SellerOffer_isBuyBoxWinner_idx" ON "SellerOffer"("isBuyBoxWinner");

-- 5. Create Table: OfferVariant
CREATE TABLE "OfferVariant" (
    "id" TEXT NOT NULL,
    "sellerOfferId" TEXT NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "sellerSku" TEXT NOT NULL,
    "sellingPrice" DECIMAL(10,2) NOT NULL,
    "mrpPrice" DECIMAL(10,2),
    "discountPercentage" DECIMAL(5,2),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfferVariant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OfferVariant_sellerOfferId_productVariantId_key" ON "OfferVariant"("sellerOfferId", "productVariantId");
CREATE UNIQUE INDEX "OfferVariant_vendorId_sellerSku_key" ON "OfferVariant"("vendorId", "sellerSku");
CREATE INDEX "OfferVariant_sellerOfferId_idx" ON "OfferVariant"("sellerOfferId");
CREATE INDEX "OfferVariant_productVariantId_idx" ON "OfferVariant"("productVariantId");
CREATE INDEX "OfferVariant_vendorId_idx" ON "OfferVariant"("vendorId");
CREATE INDEX "OfferVariant_sellerSku_idx" ON "OfferVariant"("sellerSku");
CREATE INDEX "OfferVariant_sellingPrice_idx" ON "OfferVariant"("sellingPrice");

-- 6. Create Table: OfferInventory
CREATE TABLE "OfferInventory" (
    "id" TEXT NOT NULL,
    "offerVariantId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfferInventory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OfferInventory_offerVariantId_warehouseId_key" ON "OfferInventory"("offerVariantId", "warehouseId");
CREATE INDEX "OfferInventory_offerVariantId_idx" ON "OfferInventory"("offerVariantId");
CREATE INDEX "OfferInventory_warehouseId_idx" ON "OfferInventory"("warehouseId");

-- 7. Create Table: VendorShipment
CREATE TABLE "VendorShipment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "shipmentNumber" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'PENDING',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "shippingFee" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "courierPartner" TEXT,
    "trackingNumber" TEXT,
    "shippingLabelUrl" TEXT,
    "manifestUrl" TEXT,
    "dispatchedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorShipment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VendorShipment_shipmentNumber_key" ON "VendorShipment"("shipmentNumber");
CREATE INDEX "VendorShipment_orderId_idx" ON "VendorShipment"("orderId");
CREATE INDEX "VendorShipment_vendorId_idx" ON "VendorShipment"("vendorId");
CREATE INDEX "VendorShipment_status_idx" ON "VendorShipment"("status");
CREATE INDEX "VendorShipment_trackingNumber_idx" ON "VendorShipment"("trackingNumber");

-- 8. Create Table: VendorShipmentItem
CREATE TABLE "VendorShipmentItem" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "sellerOfferId" TEXT,
    "offerVariantId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorShipmentItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VendorShipmentItem_shipmentId_orderItemId_key" ON "VendorShipmentItem"("shipmentId", "orderItemId");
CREATE INDEX "VendorShipmentItem_shipmentId_idx" ON "VendorShipmentItem"("shipmentId");
CREATE INDEX "VendorShipmentItem_orderItemId_idx" ON "VendorShipmentItem"("orderItemId");

-- 9. Add Foreign Keys and Columns to Existing Tables (Additive only)
ALTER TABLE "Product" ADD COLUMN "brandRefId" TEXT;
CREATE INDEX "Product_brandRefId_idx" ON "Product"("brandRefId");

ALTER TABLE "CartItem" ADD COLUMN "sellerOfferId" TEXT;
ALTER TABLE "CartItem" ADD COLUMN "offerVariantId" TEXT;
CREATE INDEX "CartItem_sellerOfferId_idx" ON "CartItem"("sellerOfferId");
CREATE INDEX "CartItem_offerVariantId_idx" ON "CartItem"("offerVariantId");

ALTER TABLE "OrderItem" ADD COLUMN "vendorShipmentId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "sellerOfferId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "offerVariantId" TEXT;
CREATE INDEX "OrderItem_vendorShipmentId_idx" ON "OrderItem"("vendorShipmentId");
CREATE INDEX "OrderItem_sellerOfferId_idx" ON "OrderItem"("sellerOfferId");
CREATE INDEX "OrderItem_offerVariantId_idx" ON "OrderItem"("offerVariantId");

-- 10. Add Constraints
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_registeredOwnerVendorId_fkey" FOREIGN KEY ("registeredOwnerVendorId") REFERENCES "VendorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VendorWarehouse" ADD CONSTRAINT "VendorWarehouse_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SellerOffer" ADD CONSTRAINT "SellerOffer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SellerOffer" ADD CONSTRAINT "SellerOffer_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OfferVariant" ADD CONSTRAINT "OfferVariant_sellerOfferId_fkey" FOREIGN KEY ("sellerOfferId") REFERENCES "SellerOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfferVariant" ADD CONSTRAINT "OfferVariant_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfferVariant" ADD CONSTRAINT "OfferVariant_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OfferInventory" ADD CONSTRAINT "OfferInventory_offerVariantId_fkey" FOREIGN KEY ("offerVariantId") REFERENCES "OfferVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfferInventory" ADD CONSTRAINT "OfferInventory_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "VendorWarehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VendorShipment" ADD CONSTRAINT "VendorShipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorShipment" ADD CONSTRAINT "VendorShipment_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VendorShipment" ADD CONSTRAINT "VendorShipment_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "VendorWarehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VendorShipmentItem" ADD CONSTRAINT "VendorShipmentItem_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "VendorShipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorShipmentItem" ADD CONSTRAINT "VendorShipmentItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Product" ADD CONSTRAINT "Product_brandRefId_fkey" FOREIGN KEY ("brandRefId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_sellerOfferId_fkey" FOREIGN KEY ("sellerOfferId") REFERENCES "SellerOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_offerVariantId_fkey" FOREIGN KEY ("offerVariantId") REFERENCES "OfferVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_vendorShipmentId_fkey" FOREIGN KEY ("vendorShipmentId") REFERENCES "VendorShipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_sellerOfferId_fkey" FOREIGN KEY ("sellerOfferId") REFERENCES "SellerOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_offerVariantId_fkey" FOREIGN KEY ("offerVariantId") REFERENCES "OfferVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
