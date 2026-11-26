import { NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { cancellationRefundAsTransaction } from '@/lib/refund-ui-helpers';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    id: string;
  };
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = await requireAuth();
    const { id } = context.params;

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
      },
      include: {
        shippingAddress: true,
        cancellationRefund: { select: { id: true, status: true, amount: true, razorpayRefundId: true, processedAt: true, createdAt: true } },
        vendorShipments: {
          include: {
            vendor: {
              select: { id: true, storeName: true, storeSlug: true },
            },
            items: true,
          },
        },
        items: {
          include: {
            product: {
              include: {
                images: { orderBy: { sortOrder: 'asc' }, take: 1 },
              },
            },
            variant: true,
            vendor: {
              select: { storeName: true },
            },
            returnRequest: {
              select: {
                id: true,
                type: true,
                status: true,
                reason: true,
                createdAt: true,
                refundTransactions: {
                  select: {
                    id: true,
                    amount: true,
                    mode: true,
                    gatewayReference: true,
                    status: true,
                    processedAt: true,
                    createdAt: true,
                  },
                  orderBy: { createdAt: 'desc' },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      return apiError('Order not found.', 404);
    }

    // Security: Only order owner can view the order
    if (order.userId !== auth.userId) {
      return apiError('You are not authorized to view this order.', 403);
    }

    return apiSuccess({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      subtotal: Number(order.subtotal),
      discount: Number(order.discount),
      shippingFee: Number(order.shippingFee),
      tax: Number(order.tax || 0),
      totalAmount: Number(order.totalAmount),
      refundedAmount: Number(order.refundedAmount || 0),
      // Automatic refund for a cancelled online-paid order (null when none was needed).
      cancellationRefund: order.cancellationRefund
        ? {
            status: order.cancellationRefund.status,
            amount: Number(order.cancellationRefund.amount),
            reference: order.cancellationRefund.razorpayRefundId,
            createdAt: order.cancellationRefund.createdAt.toISOString(),
          }
        : null,
      refundTransactions: [
        ...order.items.flatMap((item) =>
        (item.returnRequest?.refundTransactions || []).map((t) => ({
          id: t.id,
          amount: Number(t.amount),
          mode: t.mode,
          referenceNumber: t.gatewayReference || null,
          gatewayReference: t.gatewayReference || null,
          status: t.status,
          processedAt: t.processedAt ? t.processedAt.toISOString() : null,
          createdAt: t.createdAt.toISOString(),
        }))
      ),
        ...[cancellationRefundAsTransaction(order.cancellationRefund)].filter(
          (t): t is NonNullable<typeof t> => t !== null
        ),
      ],
      createdAt: order.createdAt,
      trackingNumber: order.trackingNumber,
      courierPartner: order.courierPartner,
      vendorShipments:
        order.vendorShipments.length > 0
          ? order.vendorShipments.map((s) => ({
              id: s.id,
              shipmentNumber: s.shipmentNumber,
              status: s.status,
              courierPartner: s.courierPartner,
              trackingNumber: s.trackingNumber,
              subtotal: Number(s.subtotal),
              shippingFee: Number(s.shippingFee),
              dispatchedAt: s.dispatchedAt ? s.dispatchedAt.toISOString() : null,
              deliveredAt: s.deliveredAt ? s.deliveredAt.toISOString() : null,
              vendor: s.vendor,
              itemsCount: s.items.length,
            }))
          : [
              {
                id: `legacy-${order.id}`,
                shipmentNumber: `VYN-SHP-${order.orderNumber}`,
                status:
                  order.status === 'DELIVERED'
                    ? 'DELIVERED'
                    : order.status === 'SHIPPED'
                    ? 'IN_TRANSIT'
                    : 'PENDING',
                courierPartner: order.courierPartner,
                trackingNumber: order.trackingNumber,
                subtotal: Number(order.subtotal),
                shippingFee: Number(order.shippingFee || 0),
                dispatchedAt: null,
                deliveredAt: null,
                vendor: { id: 'legacy', storeName: 'Artisan Boutique' },
                itemsCount: order.items.length,
              },
            ],
      shippingAddress: order.shippingAddress,
      items: order.items.map((item) => {
        const unitPriceNum = Number(item.unitPrice || 0);
        const totalPriceNum = Number(item.totalPrice || unitPriceNum * item.quantity);
        const originalPriceNum = Number(
          item.variant?.originalPrice ||
          (item.product?.discountPrice ? item.product.basePrice : unitPriceNum)
        );
        const discountStr =
          originalPriceNum > unitPriceNum
            ? `${Math.round(((originalPriceNum - unitPriceNum) / originalPriceNum) * 100)}% OFF`
            : '';

        const resolvedSize = item.selectedSize || item.variant?.size || 'N/A';
        const resolvedColor = item.selectedColor || item.variant?.color || 'N/A';
        const resolvedVendor = item.vendor?.storeName || item.product?.brand || 'Vyntra Master Guild';

        return {
          id: item.id,
          productId: item.productId,
          variantId: item.variantId,
          title: item.product?.title || 'Artisanal Piece',
          brand: item.product?.brand || 'Vyntra Collective',
          categoryTag: 'Heritage Luxury',
          sellerName: resolvedVendor,
          vendorName: resolvedVendor,
          sku: item.variant?.sku || '',
          quantity: item.quantity,
          price: unitPriceNum,
          unitPrice: unitPriceNum,
          totalPrice: totalPriceNum,
          originalPrice: originalPriceNum,
          discount: discountStr,
          size: resolvedSize,
          color: resolvedColor,
          selectedSize: resolvedSize,
          selectedColor: resolvedColor,
          shippingMethod: order.courierPartner || 'Standard Insured Delivery',
          image:
            item.variant?.imageUrl ||
            item.product?.images[0]?.url ||
            'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80',
          status: item.status,
          returnRequest: item.returnRequest || null,
        };
      }),
    });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    return handleApiError(err);
  }
}
