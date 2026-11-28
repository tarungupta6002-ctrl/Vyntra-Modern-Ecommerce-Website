import { NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { OrderStatus } from '@prisma/client';
import { DEFAULT_RETURN_WINDOW_DAYS } from '@/lib/policy-constants';
import { computeIstReturnDeadline, isWithinDeadline } from '@/lib/date-utils';
import { cancellationRefundAsTransaction } from '@/lib/refund-ui-helpers';

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
          cancellationRefund: {
            select: {
              id: true,
              status: true,
              amount: true,
              razorpayRefundId: true,
              initiatedBy: true,
              processedAt: true,
              createdAt: true,
            },
          },
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
              vendorShipment: { select: { deliveredAt: true, courierPartner: true, trackingNumber: true } },
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
                  qcFailedReason: true,
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

    // Return window (days after delivery), as enforced when a return is requested.
    const windowSetting = await prisma.platformSetting.findUnique({ where: { key: 'return_window_days' } }).catch(() => null);
    const returnWindowDays = windowSetting ? parseInt(windowSetting.value, 10) || DEFAULT_RETURN_WINDOW_DAYS : DEFAULT_RETURN_WINDOW_DAYS;
    const now = new Date();

    const formattedOrders = orders.map((order) => {
      const itemWindows = order.items.map((item) => {
        // Same fallback as POST /api/returns uses for items delivered before deliveredAt was recorded.
        const deliveredAt = item.deliveredAt || item.vendorShipment?.deliveredAt || order.updatedAt || order.createdAt;
        if (item.status !== 'DELIVERED') return { deliveredAt: null, deadline: null, open: false, daysLeft: 0 };
        const deadline = computeIstReturnDeadline(deliveredAt, returnWindowDays);
        const open = isWithinDeadline(now, deadline);
        const daysLeft = open ? Math.max(1, Math.ceil((deadline.getTime() - now.getTime()) / 86400000)) : 0;
        return { deliveredAt, deadline, open, daysLeft };
      });
      const isCancellable =
        order.status === OrderStatus.PENDING ||
        order.status === OrderStatus.CONFIRMED ||
        order.status === OrderStatus.PROCESSING;

      // Status UI mapping
      let uiStatus: 'processing' | 'shipped' | 'delivered' | 'cancelled' = 'processing';
      let statusLabel = 'Being prepared';

      switch (order.status) {
        case OrderStatus.PENDING:
          uiStatus = 'processing';
          statusLabel = 'Order placed';
          break;
        case OrderStatus.CONFIRMED:
          uiStatus = 'processing';
          statusLabel = 'Confirmed';
          break;
        case OrderStatus.PROCESSING:
          uiStatus = 'processing';
          statusLabel = 'Being prepared';
          break;
        case OrderStatus.SHIPPED:
          uiStatus = 'shipped';
          statusLabel = 'Shipped';
          break;
        case OrderStatus.OUT_FOR_DELIVERY:
          uiStatus = 'shipped';
          statusLabel = 'Out for delivery';
          break;
        case OrderStatus.DELIVERED:
          uiStatus = 'delivered';
          statusLabel = 'Delivered';
          break;
        case OrderStatus.CANCELLED:
          uiStatus = 'cancelled';
          statusLabel = 'Cancelled';
          break;
        case OrderStatus.RETURNED:
          uiStatus = 'cancelled';
          statusLabel = 'Returned';
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
        returnWindowDaysLeft: Math.max(0, ...itemWindows.map((w) => w.daysLeft)),
        isReturnEligible: itemWindows.some((w) => w.open),
        // Who cancelled is only recorded with a refund (prepaid orders).
        cancelledBy: order.cancellationRefund?.initiatedBy || null,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        subtotal: Number(order.subtotal),
        discount: Number(order.discount),
        shippingFee: Number(order.shippingFee),
        tax: Number(order.tax || 0),
        totalAmount: Number(order.totalAmount),
        refundedAmount: Number(order.refundedAmount || 0),
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
        cancellationRefund: order.cancellationRefund
          ? {
              status: order.cancellationRefund.status,
              amount: Number(order.cancellationRefund.amount),
              reference: order.cancellationRefund.razorpayRefundId,
              initiatedBy: order.cancellationRefund.initiatedBy,
              createdAt: order.cancellationRefund.createdAt.toISOString(),
              processedAt: order.cancellationRefund.processedAt
                ? order.cancellationRefund.processedAt.toISOString()
                : null,
            }
          : null,
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
                vendor: vs.vendor || { id: vs.vendorId, storeName: 'Seller' },
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
                  vendor: { id: 'legacy', storeName: 'Seller' },
                  itemsCount: order.items.length,
                },
              ],
        items: order.items.map((item, itemIndex) => {
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
          const resolvedVendor = item.vendor?.storeName || 'Seller';
          const window = itemWindows[itemIndex];

          return {
            id: item.id,
            productId: item.productId,
            variantId: item.variantId,
            slug: item.product?.slug || null,
            title: item.product?.title || 'Product no longer listed',
            brand: item.product?.brand || '',
            categoryTag: '',
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
            shippingMethod: item.vendorShipment?.courierPartner || order.courierPartner || '',
            trackingNumber: item.vendorShipment?.trackingNumber || order.trackingNumber || null,
            image: item.variant?.imageUrl || item.product?.images[0]?.url || '',
            deliveredAt: window.deliveredAt ? window.deliveredAt.toISOString() : null,
            returnDeadline: window.deadline ? window.deadline.toISOString() : null,
            returnWindowOpen: window.open,
            isCustomized: Boolean(item.isCustomizedSnapshot || item.product?.isCustomized),
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
