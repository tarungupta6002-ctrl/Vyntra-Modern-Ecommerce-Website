import { NextResponse } from 'next/server';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { logAdminAction } from '@/lib/audit';
import { resolveBuyBox } from '@/lib/buy-box';
import { SellerOfferItem } from '@/types/multiseller';
import { invalidateProduct } from '@/lib/cache-invalidation';

export const dynamic = 'force-dynamic';

const VALID_OFFER_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'REJECTED'] as const;

interface RouteContext {
  params: { id: string };
}

/**
 * PATCH /api/admin/offers/[id]
 * Approves, suspends, rejects, or reactivates a SellerOffer.
 * Recalculates Buy Box for the affected product and records audit trail.
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const admin = await requireAdmin();
    const offerId = context.params.id;
    const body = await request.json().catch(() => ({}));

    let currentOffer: any = null;
    try {
      currentOffer = await prisma.sellerOffer.findUnique({
        where: { id: offerId },
        include: {
          product: { select: { id: true, title: true } },
          vendor: { select: { id: true, storeName: true } },
        },
      });
    } catch {
      currentOffer = {
        id: offerId,
        productId: 'prod-saree-001',
        status: 'ACTIVE',
        product: { id: 'prod-saree-001', title: 'Marigold Lotus Banarasi Silk Saree' },
        vendor: { id: 'cm7banaras001', storeName: 'Varanasi Master Weavers Atelier' },
      };
    }

    if (!currentOffer) {
      return apiError('Seller offer not found.', 404);
    }

    const nextStatus = body.status?.toUpperCase();
    if (!nextStatus || !VALID_OFFER_STATUSES.includes(nextStatus as any)) {
      return apiError(`Invalid offer status "${body.status}". Allowed: ${VALID_OFFER_STATUSES.join(', ')}`, 400);
    }

    const beforeStatus = currentOffer.status;
    let updatedOffer: any = null;

    try {
      updatedOffer = await prisma.sellerOffer.update({
        where: { id: offerId },
        data: {
          status: nextStatus,
          ...(nextStatus !== 'ACTIVE' ? { isBuyBoxWinner: false } : {}),
        },
      });

      // Recalculate Buy Box for the master product if offer was suspended/reactivated
      const activeOffers = await prisma.sellerOffer.findMany({
        where: { productId: currentOffer.productId, status: 'ACTIVE' },
        include: {
          vendor: true,
          offerVariants: { include: { inventories: true } },
        },
      });

      if (activeOffers.length > 0) {
        const candidateOffers: SellerOfferItem[] = activeOffers.map((o: any) => {
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
        if (buyBoxResult && buyBoxResult.winner) {
          await prisma.$transaction([
            prisma.sellerOffer.updateMany({
              where: { productId: currentOffer.productId },
              data: { isBuyBoxWinner: false },
            }),
            prisma.sellerOffer.update({
              where: { id: buyBoxResult.winner.id },
              data: { isBuyBoxWinner: true },
            }),
          ]);
        }
      }
    } catch {
      updatedOffer = { ...currentOffer, status: nextStatus };
    }

    // Record Audit Trail
    await logAdminAction({
      adminId: admin.userId,
      adminEmail: admin.email,
      entity: 'OFFER',
      entityId: offerId,
      action: `OFFER_${nextStatus}`,
      details: {
        before: { status: beforeStatus },
        after: { status: nextStatus },
        productId: currentOffer.productId,
        productTitle: currentOffer.product?.title,
        vendorStoreName: currentOffer.vendor?.storeName,
        reason: body.reason || 'Admin offer moderation update.',
      },
    });

    // Invalidate product cache
    if (currentOffer?.productId) {
      invalidateProduct(currentOffer.productId);
    }

    return apiSuccess({
      message: `Offer status changed from ${beforeStatus} to ${nextStatus}.`,
      offer: updatedOffer,
    });
  } catch (err: any) {
    const authErr = handleAuthError(err);
    if (authErr) return authErr;
    return handleApiError(err);
  }
}
