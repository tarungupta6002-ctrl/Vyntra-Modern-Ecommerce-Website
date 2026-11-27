import { NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { OrderStatus } from '@prisma/client';
import { afterOrderStatusChange } from '@/lib/orders/after-status-change';
import { cancelOrderTx, OrderNotCancellableError, PRE_SHIPMENT_STATUSES } from '@/lib/orders/cancel-order';

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
        `Orders that are already ${order.status.toLowerCase()} cannot be cancelled online. You can return it after delivery, or contact Customer Service from Help & Support.`,
        400,
        { currentStatus: order.status },
        'ORDER_NOT_CANCELLABLE'
      );
    }

    // Order, items, shipments and stock in one transaction (shared with admin cancellation).
    try {
      await prisma.$transaction((tx) => cancelOrderTx(tx, order.id, PRE_SHIPMENT_STATUSES), {
        maxWait: 5000,
        timeout: 10000,
      });
    } catch (err) {
      if (err instanceof OrderNotCancellableError) {
        // Lost a race (e.g. cancelled from another tab, or just shipped).
        return apiError(
          err.message,
          400,
          { currentStatus: err.currentStatus },
          err.currentStatus === OrderStatus.CANCELLED ? 'ALREADY_CANCELLED' : 'ORDER_NOT_CANCELLABLE'
        );
      }
      throw err;
    }

    // Automatic refund (online-paid orders) + cancellation email. Never throws.
    const outcome = await afterOrderStatusChange(order.id, order.status, OrderStatus.CANCELLED, 'CUSTOMER');

    // What the customer should be told about their money, straight from the refund result.
    const refund =
      outcome?.status === 'initiated'
        ? { state: 'INITIATED' as const, amount: outcome.amount, reference: outcome.razorpayRefundId }
        : outcome?.status === 'failed'
        ? { state: 'PROCESSING' as const, amount: outcome.amount, reference: null }
        : outcome?.status === 'already_handled'
        ? { state: 'PROCESSING' as const, amount: null, reference: null }
        : { state: 'NONE' as const, amount: 0, reference: null }; // COD or nothing was paid

    return apiSuccess({
      message: `Order #${order.orderNumber} has been successfully cancelled and inventory has been restored.`,
      orderNumber: order.orderNumber,
      cancellationReason: reason,
      status: OrderStatus.CANCELLED,
      refund,
    });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    console.error('[POST /api/orders/[id]/cancel error]:', err);
    return handleApiError(err);
  }
}
