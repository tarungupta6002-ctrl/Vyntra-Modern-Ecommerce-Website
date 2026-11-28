import { NextResponse } from 'next/server';
import { requireVendor, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { findDefaultPickupAddress, PICKUP_ADDRESS_REQUIRED, warehouseLabel } from '@/lib/vendor/pickup-address';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { OfferCondition, FulfillmentType } from '@prisma/client';
import { resolveBuyBox } from '@/lib/buy-box';
import { SellerOfferItem } from '@/types/multiseller';
import { invalidateProduct } from '@/lib/cache-invalidation';

export const dynamic = 'force-dynamic';

interface VariantInput {
  productVariantId: string;
  sellerSku: string;
  sellingPrice: number;
  mrpPrice?: number | null;
  stock: number;
}

/**
 * POST /api/vendor/offers
 * Creates an independent SellerOffer, OfferVariants, and OfferInventory for an existing master product.
 * Preserves the shared Product identity and never creates a duplicate Product.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireVendor();
    const body = await request.json();

    const productId = body.productId?.trim();
    if (!productId) {
      return apiError('Product ID is required to attach an offer.', 400);
    }

    const condition: OfferCondition =
      body.condition && Object.values(OfferCondition).includes(body.condition)
        ? body.condition
        : OfferCondition.NEW;

    const fulfillmentType: FulfillmentType =
      body.fulfillmentType && Object.values(FulfillmentType).includes(body.fulfillmentType)
        ? body.fulfillmentType
        : FulfillmentType.SELLER_FULFILLED;

    const handlingDays = Math.max(1, Math.min(14, parseInt(body.handlingDays || '2', 10)));
    const variants: VariantInput[] = Array.isArray(body.variants) ? body.variants : [];

    if (variants.length === 0) {
      return apiError('At least one variant must be configured for your seller offer.', 400);
    }

    // 1. Verify Master Product Exists & Is Published
    const masterProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        title: true,
        isPublished: true,
        variants: { select: { id: true, sku: true, price: true } },
      },
    });

    if (!masterProduct) {
      return apiError('The specified master product does not exist.', 404);
    }

    if (!masterProduct.isPublished) {
      return apiError(
        'Cannot attach an offer to an unpublished or unapproved master product.',
        400
      );
    }

    // 2. Prevent Duplicate Offers (One offer per vendor per condition)
    const existingOffer = await prisma.sellerOffer.findUnique({
      where: {
        productId_vendorId_condition: {
          productId,
          vendorId: auth.vendorProfileId,
          condition,
        },
      },
      select: { id: true, status: true },
    });

    if (existingOffer) {
      return apiError(
        `You already have an existing ${condition} offer for this product (Offer ID: ${existingOffer.id}). Please update your existing offer instead of creating a duplicate.`,
        409
      );
    }

    // 3. Validate Variants & Pricing
    const validVariantIds = new Set(masterProduct.variants.map((v) => v.id));
    const submittedSkus = new Set<string>();

    for (const v of variants) {
      if (!v.productVariantId || !validVariantIds.has(v.productVariantId)) {
        return apiError(
          `Invalid product variant ID '${v.productVariantId}'. It does not belong to this master product.`,
          400
        );
      }

      const cleanSku = (v.sellerSku || '').trim().toUpperCase();
      if (!cleanSku) {
        return apiError('Every variant must specify a non-empty seller SKU.', 400);
      }

      if (submittedSkus.has(cleanSku)) {
        return apiError(`Duplicate seller SKU '${cleanSku}' in request payload.`, 400);
      }
      submittedSkus.add(cleanSku);

      const price = Number(v.sellingPrice);
      if (isNaN(price) || price <= 0) {
        return apiError(`Selling price for SKU '${cleanSku}' must be a positive number.`, 400);
      }

      if (v.mrpPrice !== undefined && v.mrpPrice !== null) {
        const mrp = Number(v.mrpPrice);
        if (isNaN(mrp) || mrp < price) {
          return apiError(
            `MRP Price for SKU '${cleanSku}' cannot be less than the selling price.`,
            400
          );
        }
      }

      const stock = parseInt(String(v.stock ?? 0), 10);
      if (isNaN(stock) || stock < 0) {
        return apiError(`Inventory quantity for SKU '${cleanSku}' cannot be negative.`, 400);
      }
    }

    // 4. Validate Seller SKU Uniqueness across the vendor's active catalog
    const skuArray = Array.from(submittedSkus);
    const existingSkuConflict = await prisma.offerVariant.findFirst({
      where: {
        vendorId: auth.vendorProfileId,
        sellerSku: { in: skuArray },
      },
      select: { sellerSku: true },
    });

    if (existingSkuConflict) {
      return apiError(
        `Seller SKU '${existingSkuConflict.sellerSku}' is already registered in your store catalog. Each seller SKU must be unique.`,
        409
      );
    }

    // 5. Stock is recorded at the seller's default pickup address, which must be a real one.
    if (!(await findDefaultPickupAddress(auth.vendorProfileId))) {
      return apiError(PICKUP_ADDRESS_REQUIRED, 400, null, 'PICKUP_ADDRESS_REQUIRED');
    }

    // 6. Execute Creation inside a Prisma Database Transaction
    const createdOffer = await prisma.$transaction(async (tx) => {
      // 5.1 The default pickup address (checked above)
      const warehouse = await findDefaultPickupAddress(auth.vendorProfileId, tx);
      if (!warehouse) throw new Error(PICKUP_ADDRESS_REQUIRED);

      // 5.2 Create the SellerOffer
      const newOffer = await tx.sellerOffer.create({
        data: {
          productId,
          vendorId: auth.vendorProfileId,
          condition,
          fulfillmentType,
          handlingDays,
          status: 'ACTIVE',
          isBuyBoxWinner: false,
        },
      });

      // 5.3 Create OfferVariants & OfferInventory records
      for (const v of variants) {
        const price = Number(v.sellingPrice);
        const mrp = v.mrpPrice ? Number(v.mrpPrice) : null;
        const discountPct = mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
        const stockUnits = Math.max(0, parseInt(String(v.stock || 0), 10));

        const offerVariant = await tx.offerVariant.create({
          data: {
            sellerOfferId: newOffer.id,
            productVariantId: v.productVariantId,
            vendorId: auth.vendorProfileId,
            sellerSku: v.sellerSku.trim().toUpperCase(),
            sellingPrice: price,
            mrpPrice: mrp,
            discountPercentage: discountPct,
            status: 'ACTIVE',
          },
        });

        await tx.offerInventory.create({
          data: {
            offerVariantId: offerVariant.id,
            warehouseId: warehouse.id,
            quantity: stockUnits,
            reservedQuantity: 0,
            lowStockThreshold: 5,
          },
        });
      }

      // 5.4 Evaluate Buy Box for this product across all active offers
      const allActiveOffers = await tx.sellerOffer.findMany({
        where: { productId, status: 'ACTIVE' },
        include: {
          vendor: {
            select: {
              id: true,
              storeName: true,
              storeSlug: true,
              isVerified: true,
              rating: true,
            },
          },
          offerVariants: {
            where: { status: 'ACTIVE' },
            include: {
              inventories: {
                select: { quantity: true, reservedQuantity: true },
              },
            },
          },
        },
      });

      if (allActiveOffers.length > 0) {
        const buyBoxCandidates: SellerOfferItem[] = allActiveOffers.map((so) => {
          const prices = so.offerVariants.map((ov) => Number(ov.sellingPrice));
          const minPrice = prices.length > 0 ? Math.min(...prices) : 999999;
          const totalStock = so.offerVariants.reduce((sum, ov) => {
            const variantStock = ov.inventories.reduce(
              (iSum, inv) => iSum + Math.max(0, inv.quantity - inv.reservedQuantity),
              0
            );
            return sum + variantStock;
          }, 0);

          return {
            id: so.id,
            productId: so.productId,
            vendorId: so.vendorId,
            vendor: {
              id: so.vendor.id,
              storeName: so.vendor.storeName,
              storeSlug: so.vendor.storeSlug,
              rating: so.vendor.rating,
              isVerified: so.vendor.isVerified,
            },
            condition: so.condition as any,
            sellingPrice: minPrice,
            originalPrice: minPrice,
            discountPercent: 0,
            stock: totalStock,
            handlingDays: so.handlingDays,
            estimatedDeliveryDays: so.handlingDays + 2,
            fulfillmentType: so.fulfillmentType as any,
            shipsFrom: 'Bengaluru, India',
            isBuyBoxWinner: false,
          };
        });

        const buyBoxResult = resolveBuyBox(buyBoxCandidates);
        if (buyBoxResult?.winner) {
          // Update all offers' isBuyBoxWinner flags
          for (const cand of buyBoxCandidates) {
            const isWinner = cand.id === buyBoxResult.winner.id && cand.stock > 0;
            await tx.sellerOffer.update({
              where: { id: cand.id },
              data: { isBuyBoxWinner: isWinner },
            });
          }
        }
      }

      // Return fully hydrated created offer
      return await tx.sellerOffer.findUnique({
        where: { id: newOffer.id },
        include: {
          product: {
            select: { id: true, title: true, brand: true, slug: true },
          },
          offerVariants: {
            include: {
              productVariant: {
                select: { id: true, sku: true, size: true, color: true, barcode: true },
              },
              inventories: true,
            },
          },
        },
      });
    });

    invalidateProduct(createdOffer?.product?.slug, productId);

    return apiSuccess(createdOffer, undefined, 201);
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    return handleApiError(err);
  }
}
