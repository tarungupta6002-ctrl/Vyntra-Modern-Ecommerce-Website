import { NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { OrderStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const skip = (page - 1) * limit;

    const statusParam = searchParams.get('status')?.toUpperCase();
    const searchQuery = searchParams.get('search')?.trim();

    // Build Prisma where clause strictly filtered by auth.userId
    const where: any = {
      userId: auth.userId,
    };

    if (statusParam && statusParam !== 'ALL') {
      if (statusParam === 'PROCESSING') {
        where.status = { in: [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PROCESSING] };
      } else if (statusParam === 'SHIPPED') {
        where.status = { in: [OrderStatus.SHIPPED, OrderStatus.OUT_FOR_DELIVERY] };
      } else if (statusParam === 'DELIVERED') {
        where.status = OrderStatus.DELIVERED;
      } else if (statusParam === 'CANCELLED') {
        where.status = { in: [OrderStatus.CANCELLED, OrderStatus.RETURNED] };
      } else if (Object.values(OrderStatus).includes(statusParam as any)) {
        where.status = statusParam as OrderStatus;
      }
    }

    if (searchQuery) {
      where.OR = [
        { orderNumber: { contains: searchQuery, mode: 'insensitive' } },
        { trackingNumber: { contains: searchQuery, mode: 'insensitive' } },
        {
          items: {
            some: {
              product: {
                title: { contains: searchQuery, mode: 'insensitive' },
              },
            },
          },
        },
      ];
    }

    const [totalCount, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          shippingAddress: true,
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
              review: {
                select: {
                  id: true,
                  rating: true,
                  status: true,
                },
              },
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
                  isDisputed: true,
                  disputeResolution: true,
                  rejectedAt: true,
                  qcCompletedAt: true,
                  vendorNotes: true,
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
      }),
    ]);

    const formattedOrders = orders.map((order) => {
      const isCancellable =
        order.status === OrderStatus.PENDING ||
        order.status === OrderStatus.CONFIRMED ||
        order.status === OrderStatus.PROCESSING;

      // Status UI mapping
      let uiStatus: 'processing' | 'shipped' | 'delivered' | 'cancelled' = 'processing';
      let statusLabel = 'Order Confirmed — Being Prepared';

      switch (order.status) {
        case OrderStatus.PENDING:
          uiStatus = 'processing';
          statusLabel = 'Order Placed — Pending Confirmation';
          break;
        case OrderStatus.CONFIRMED:
          uiStatus = 'processing';
          statusLabel = 'Order Confirmed — Being Prepared by Artisan';
          break;
        case OrderStatus.PROCESSING:
          uiStatus = 'processing';
          statusLabel = 'Artisan Crafting & Quality Check';
          break;
        case OrderStatus.SHIPPED:
          uiStatus = 'shipped';
          statusLabel = 'Dispatched via Courier';
          break;
        case OrderStatus.OUT_FOR_DELIVERY:
          uiStatus = 'shipped';
          statusLabel = 'Out for Delivery';
          break;
        case OrderStatus.DELIVERED:
          uiStatus = 'delivered';
          statusLabel = 'Delivered to Doorstep';
          break;
        case OrderStatus.CANCELLED:
          uiStatus = 'cancelled';
          statusLabel = 'Cancelled by Customer';
          break;
        case OrderStatus.RETURNED:
          uiStatus = 'cancelled';
          statusLabel = 'Returned & Closed';
          break;
      }

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        datePlaced: new Date(order.createdAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        placedTime: new Date(order.createdAt).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        createdAt: order.createdAt,
        status: uiStatus,
        rawStatus: order.status,
        statusLabel,
        isCancellable,
        returnWindowDaysLeft: (() => {
          if (order.status !== OrderStatus.DELIVERED) return 0;
          const deliveredDate = (order as any).deliveredAt || order.updatedAt || order.createdAt;
          const daysSince = Math.floor((Date.now() - new Date(deliveredDate).getTime()) / (1000 * 60 * 60 * 24));
          return Math.max(0, 7 - daysSince);
        })(),
        isReturnEligible: (() => {
          if (order.status !== OrderStatus.DELIVERED) return false;
          const deliveredDate = (order as any).deliveredAt || order.updatedAt || order.createdAt;
          const daysSince = Math.floor((Date.now() - new Date(deliveredDate).getTime()) / (1000 * 60 * 60 * 24));
          return daysSince <= 7;
        })(),
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        subtotal: Number(order.subtotal),
        discount: Number(order.discount),
        shippingFee: Number(order.shippingFee),
        tax: Number(order.tax || 0),
        totalAmount: Number(order.totalAmount),
        refundedAmount: Number(order.refundedAmount || 0),
        refundTransactions: order.items.flatMap((item) =>
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
        totalItems: order.items.reduce((sum, item) => sum + item.quantity, 0),
        trackingNumber: order.trackingNumber || null,
        courierPartner: order.courierPartner || null,
        shippingAddress: order.shippingAddress,
        vendorShipments:
          order.vendorShipments && order.vendorShipments.length > 0
            ? order.vendorShipments.map((vs: any) => ({
                id: vs.id,
                shipmentNumber: vs.shipmentNumber,
                status: vs.status,
                courierPartner: vs.courierPartner,
                trackingNumber: vs.trackingNumber,
                subtotal: Number(vs.subtotal),
                shippingFee: Number(vs.shippingFee),
                dispatchedAt: vs.dispatchedAt ? vs.dispatchedAt.toISOString() : null,
                deliveredAt: vs.deliveredAt ? vs.deliveredAt.toISOString() : null,
                vendor: vs.vendor || { id: vs.vendorId, storeName: 'Artisan Atelier' },
                itemsCount: vs.items?.length || 0,
              }))
            : [
                {
                  id: `legacy-${order.id}`,
                  shipmentNumber: `VYN-SHP-${order.orderNumber}`,
                  status:
                    order.status === 'DELIVERED'
                      ? 'DELIVERED'
                      : order.status === 'SHIPPED'
                      ? 'SHIPPED'
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
          const resolvedVendor = item.vendor?.storeName || item.product?.brand || 'Vyntra Atelier';

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
            hasReviewed: Boolean(item.review),
            review: item.review ? { id: item.review.id, rating: item.review.rating, status: item.review.status } : null,
            returnRequest: item.returnRequest || null,
          };
        }),
      };
    });

    return apiSuccess({
      orders: formattedOrders,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    console.error('[GET /api/orders error]:', err);
    return handleApiError(err);
  }
}
