import { NextResponse } from 'next/server';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, handleApiError } from '@/lib/api-response';
import { resolveBuyBox, calculateBuyBoxScore } from '@/lib/buy-box';
import { SellerOfferItem } from '@/types/multiseller';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/buy-box
 * Returns active catalog products with Buy Box evaluation breakdown, competing offers, and score analysis.
 * Strictly protected by requireAdmin().
 */
export async function GET(request: Request) {
  try {
    await requireAdmin();

    try {
      const products = await prisma.product.findMany({
        where: { isPublished: true },
        include: {
          sellerOffers: {
            where: { status: 'ACTIVE' },
            include: {
              vendor: true,
              offerVariants: { include: { inventories: true } },
            },
          },
        },
        take: 30,
      });

      const monitoredProducts = products.map((prod: any) => {
        const candidateOffers: SellerOfferItem[] = prod.sellerOffers.map((o: any) => {
          const v = o.offerVariants[0];
          const stock = o.offerVariants.reduce(
            (sum: number, item: any) =>
              sum + (item.inventories?.reduce((iSum: number, inv: any) => iSum + inv.quantity, 0) || 0),
            0
          );
          return {
            id: o.id,
            productId: o.productId,
            vendorId: o.vendorId,
            vendor: {
              id: o.vendor.id,
              storeName: o.vendor.storeName,
              storeSlug: o.vendor.storeSlug || o.vendor.id,
              isVerified: o.vendor.isVerified,
              rating: o.vendor.rating || 4.5,
              totalSales: o.vendor.totalSales || 10,
            },
            sellingPrice: v ? Number(v.sellingPrice) : 99999,
            mrpPrice: v?.mrpPrice ? Number(v.mrpPrice) : null,
            originalPrice: v?.mrpPrice ? Number(v.mrpPrice) : (v ? Number(v.sellingPrice) : 99999),
            discountPercent: v?.discountPercentage ? Number(v.discountPercentage) : 0,
            stock,
            condition: o.condition,
            fulfillmentType: o.fulfillmentType,
            handlingDays: o.handlingDays,
            estimatedDeliveryDays: (o.handlingDays || 2) + 2,
            shipsFrom: o.vendor?.storeName || 'India',
            isBuyBoxWinner: false,
          };
        });

        const buyBoxResult = resolveBuyBox(candidateOffers);
        const minPrice = candidateOffers.length > 0 ? Math.min(...candidateOffers.map((c) => c.sellingPrice)) : 0;

        const allRanked = buyBoxResult ? [buyBoxResult.winner, ...buyBoxResult.otherOffers] : [];

        const breakdown = allRanked.map((r) => {
          const isOOS = r.stock <= 0;
          const priceDiffRatio = minPrice > 0 ? (r.sellingPrice - minPrice) / minPrice : 0;
          const pricePenalty = Math.min(50, priceDiffRatio * 50);
          const ratingPenalty = Math.max(0, 5.0 - (r.vendor?.rating || 5.0)) * 5;
          const deliveryPenalty = Math.min(25, ((r.handlingDays || 2) - 1) * 3);
          const verificationBonus = r.vendor?.isVerified ? -5.0 : 0;

          return {
            offerId: r.id,
            vendorId: r.vendorId,
            vendorStoreName: r.vendor.storeName,
            sellingPrice: r.sellingPrice,
            stock: r.stock,
            isBuyBoxWinner: r.isBuyBoxWinner,
            compositeScore: r.score ?? 0,
            scoreBreakdown: {
              pricePenalty: Number(pricePenalty.toFixed(2)),
              deliveryPenalty: Number(deliveryPenalty.toFixed(2)),
              ratingPenalty: Number(ratingPenalty.toFixed(2)),
              verificationBonus,
              isOutOfStock: isOOS,
            },
          };
        });

        const winner = buyBoxResult?.winner;

        return {
          productId: prod.id,
          title: prod.title,
          slug: prod.slug,
          totalOffersCount: prod.sellerOffers.length,
          winnerOfferId: winner?.id || null,
          winnerVendorName: winner?.vendor.storeName || null,
          winnerPrice: winner?.sellingPrice || null,
          competingOffers: breakdown,
        };
      });

      return apiSuccess({ products: monitoredProducts, total: monitoredProducts.length });
    } catch (dbError) {
      // No invented fallback data: let the request fail visibly.
      throw dbError;
    }
  } catch (err: any) {
    const authErr = handleAuthError(err);
    if (authErr) return authErr;
    return handleApiError(err);
  }
}
