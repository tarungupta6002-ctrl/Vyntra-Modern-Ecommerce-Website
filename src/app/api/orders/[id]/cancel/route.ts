import { NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { OrderStatus, OrderItemStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    id: string;
  };
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await requireAuth();
    const { id } = context.params;

    // Rate limiting: 10 cancellation attempts per minute per user
    const rateCheck = checkRateLimit(`cancel-order:${auth.userId}`, 10, 60);
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.resetInSeconds, 'Too many cancellation attempts. Please slow down.');
    }

    const body = await request.json().catch(() => ({}));
    const reason = (body.reason || 'Cancelled by customer').trim();

    // Find order
    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      return apiError('Order not found.', 404);
    }

    // Security: Only order owner can cancel the order
    if (order.userId !== auth.userId) {
      return apiError('You are not authorized to cancel this order.', 403);
    }

    // Idempotency: Prevent restoring inventory twice if already cancelled
    if (order.status === OrderStatus.CANCELLED) {
      return apiError('This order is already cancelled.', 400, null, 'ALREADY_CANCELLED');
    }

    // Business Rule: Only PENDING, CONFIRMED, or PROCESSING orders can be cancelled online
    const cancellableStatuses: OrderStatus[] = [
      OrderStatus.PENDING,
      OrderStatus.CONFIRMED,
      OrderStatus.PROCESSING,
    ];

    if (!cancellableStatuses.includes(order.status as OrderStatus)) {
      return apiError(
        `Orders that are already ${order.status.toLowerCase()} cannot be cancelled online. Please initiate a return upon receipt or contact 24/7 Concierge Support.`,
        400,
        { currentStatus: order.status },
        'ORDER_NOT_CANCELLABLE'
      );
    }

    // Atomic Cancellation and Inventory Restoration in the SAME Prisma Transaction
    await prisma.$transaction(
      async (tx) => {
        // 1. Mark Order as CANCELLED
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.CANCELLED,
          },
        });

        // 2. Mark all OrderItems as CANCELLED
        await tx.orderItem.updateMany({
          where: { orderId: order.id },
          data: {
            status: OrderItemStatus.CANCELLED,
          },
        });

        // 3. Mark all VendorShipments as CANCELLED
        await tx.vendorShipment.updateMany({
          where: { orderId: order.id },
          data: {
            status: 'CANCELLED',
          },
        });

        // 4. Atomically restore inventory for each item (both OfferInventory and ProductInventory)
        for (const item of order.items) {
          if (item.offerVariantId) {
            await tx.$executeRaw`
              UPDATE "OfferInventory"
              SET "quantity" = "quantity" + ${item.quantity},
                  "updatedAt" = NOW()
              WHERE "offerVariantId" = ${item.offerVariantId}
            `;
          }

          const inventory = await tx.productInventory.findFirst({
            where: {
              productId: item.productId,
              ...(item.variantId ? { variantId: item.variantId } : {}),
            },
          });

          if (inventory) {
            await tx.$executeRaw`
              UPDATE "ProductInventory"
              SET "quantity" = "quantity" + ${item.quantity},
                  "updatedAt" = NOW()
              WHERE "id" = ${inventory.id}
            `;
          }
        }
      },
      {
        maxWait: 5000,
        timeout: 10000,
      }
    );

    return apiSuccess({
      message: `Order #${order.orderNumber} has been successfully cancelled and inventory has been restored.`,
      orderNumber: order.orderNumber,
      cancellationReason: reason,
      status: OrderStatus.CANCELLED,
    });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    console.error('[POST /api/orders/[id]/cancel error]:', err);
    return handleApiError(err);
  }
}
