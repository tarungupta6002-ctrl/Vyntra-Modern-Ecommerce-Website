import { NextResponse } from 'next/server';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { OrderStatus, PaymentStatus, PaymentMethod } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * POST /api/admin/orders/[id]/remittance
 * Phase 10.1: Dedicated admin action to confirm courier cash remittance for delivered COD orders.
 * Strictly protected by requireAdmin().
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const admin = await requireAdmin();

    const orderId = params.id;
    if (!orderId) {
      return apiError('Order ID is required', 400, null, 'MISSING_ORDER_ID');
    }

    const body = await request.json().catch(() => ({}));
    const rawRef = body.remittanceReference || body.utrNumber || body.reference;

    if (!rawRef || typeof rawRef !== 'string') {
      return apiError(
        'Courier remittance reference or bank UTR number is required.',
        400,
        null,
        'MISSING_REMITTANCE_REFERENCE'
      );
    }

    const cleanRef = rawRef.trim();
    if (cleanRef.length < 4 || cleanRef.length > 60) {
      return apiError(
        'Remittance reference must be between 4 and 60 characters.',
        400,
        null,
        'INVALID_REMITTANCE_REFERENCE'
      );
    }

    // 1. Fetch order with ownership verification
    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id: orderId }, { orderNumber: orderId }],
      },
      include: {
        shippingAddress: true,
      },
    });

    if (!order) {
      return apiError('Order not found.', 404, null, 'ORDER_NOT_FOUND');
    }

    // 2. Validate Payment Method: Strictly COD
    if (order.paymentMethod !== PaymentMethod.COD) {
      return apiError(
        `This order was placed using ${order.paymentMethod}. Only Cash on Delivery (COD) orders require courier remittance confirmation.`,
        400,
        { currentPaymentMethod: order.paymentMethod },
        'NOT_COD_ORDER'
      );
    }

    // 3. Validate Delivery Status: Order must be physically DELIVERED
    if (order.status !== OrderStatus.DELIVERED) {
      return apiError(
        `Cannot confirm remittance for an undelivered order. Current order status is '${order.status}'. Parcels must be marked DELIVERED before cash remittance can be settled.`,
        400,
        { currentOrderStatus: order.status },
        'ORDER_NOT_DELIVERED'
      );
    }

    // 4. Validate Current Payment Status: Must be PENDING
    if (order.paymentStatus === PaymentStatus.PAID) {
      return apiError(
        `This COD order has already been settled as PAID${
          order.remittanceReference ? ` (Ref: ${order.remittanceReference})` : ''
        }. Repeated settlements are rejected.`,
        400,
        {
          paymentStatus: order.paymentStatus,
          settledAt: order.settledAt,
          remittanceReference: order.remittanceReference,
        },
        'ALREADY_SETTLED'
      );
    }

    // 5. Atomic Concurrency-Safe Settlement Transaction
    const settlementTime = new Date();
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Conditional update ensures zero race conditions if two admins click simultaneously
      const updateResult = await tx.order.updateMany({
        where: {
          id: order.id,
          paymentStatus: PaymentStatus.PENDING,
          status: OrderStatus.DELIVERED,
          paymentMethod: PaymentMethod.COD,
        },
        data: {
          paymentStatus: PaymentStatus.PAID,
          remittanceReference: cleanRef,
          settledAt: settlementTime,
        },
      });

      if (updateResult.count === 0) {
        throw new Error('CONCURRENT_SETTLEMENT_CONFLICT');
      }

      return tx.order.findUnique({
        where: { id: order.id },
        include: {
          shippingAddress: true,
          items: true,
        },
      });
    });

    return apiSuccess({
      orderId: updatedOrder!.id,
      orderNumber: updatedOrder!.orderNumber,
      paymentMethod: updatedOrder!.paymentMethod,
      paymentStatus: updatedOrder!.paymentStatus,
      remittanceReference: updatedOrder!.remittanceReference,
      settledAt: updatedOrder!.settledAt,
      settledBy: {
        adminId: admin.userId,
        role: admin.role,
      },
      message: `COD cash remittance successfully confirmed and settled with reference: ${cleanRef}`,
    });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    if (err.message === 'CONCURRENT_SETTLEMENT_CONFLICT') {
      return apiError(
        'Concurrent settlement detected. This order was already updated by another process.',
        409,
        null,
        'CONCURRENT_SETTLEMENT_CONFLICT'
      );
    }
    return handleApiError(err);
  }
}
