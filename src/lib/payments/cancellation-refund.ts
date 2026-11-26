import { OrderStatus, PaymentMethod, PaymentStatus, Prisma, RefundStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getRazorpayClient } from '@/lib/razorpay';

/**
 * Automatic Razorpay refunds for online-paid orders that get cancelled.
 *
 * Double-refund protection, in layers:
 * 1. One CancellationRefund row per order (unique orderId), claimed BEFORE calling Razorpay.
 * 2. Every Razorpay refund carries notes.cancellation_refund_id; before creating a refund we look
 *    for an existing one with that note on the payment and adopt it instead of creating another.
 * 3. Network/unknown errors are marked RECONCILIATION_REQUIRED (Razorpay may have refunded),
 *    never auto-retried blindly; explicit gateway rejections are FAILED and safe to retry.
 *
 * Never throws: callers run this after the cancellation has committed.
 */

export type RefundActor = 'CUSTOMER' | 'ADMIN' | 'VENDOR' | 'SYSTEM';

export type CancellationRefundOutcome =
  | { status: 'not_needed'; reason: string }
  | { status: 'already_handled'; refundStatus: RefundStatus }
  | { status: 'initiated'; amount: number; razorpayRefundId: string; gatewayStatus: string }
  | { status: 'failed'; amount: number; reason: string; needsReconciliation: boolean };

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function refundCancelledOrder(orderId: string, initiatedBy: RefundActor): Promise<CancellationRefundOutcome> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true, orderNumber: true, status: true, paymentMethod: true, paymentStatus: true,
        totalAmount: true, refundedAmount: true, razorpayPaymentId: true, remittanceReference: true,
      },
    });
    if (!order) return { status: 'not_needed', reason: 'order not found' };
    if (order.status !== OrderStatus.CANCELLED) return { status: 'not_needed', reason: `order is ${order.status}` };
    if (order.paymentMethod === PaymentMethod.COD) return { status: 'not_needed', reason: 'cash on delivery: nothing was collected online' };
    if (order.paymentStatus !== PaymentStatus.PAID && order.paymentStatus !== PaymentStatus.PARTIALLY_REFUNDED) {
      return { status: 'not_needed', reason: `payment status is ${order.paymentStatus}` };
    }

    const amount = round2(Number(order.totalAmount) - Number(order.refundedAmount || 0));
    if (amount <= 0) return { status: 'not_needed', reason: 'nothing left to refund' };

    const paymentId =
      order.razorpayPaymentId ||
      (order.remittanceReference?.startsWith('pay_') ? order.remittanceReference : null);

    // Layer 1: claim the single refund slot for this order.
    let row;
    try {
      row = await prisma.cancellationRefund.create({
        data: { orderId: order.id, amount, initiatedBy, razorpayPaymentId: paymentId, status: RefundStatus.INITIATED },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const existing = await prisma.cancellationRefund.findUnique({ where: { orderId: order.id } });
        return { status: 'already_handled', refundStatus: existing?.status ?? RefundStatus.INITIATED };
      }
      throw err;
    }

    if (!paymentId) {
      await prisma.cancellationRefund.update({
        where: { id: row.id },
        data: { status: RefundStatus.FAILED, failureReason: 'Order has no Razorpay payment ID; refund must be issued manually.' },
      });
      console.error(`[refund] #${order.orderNumber}: no Razorpay payment ID, refund needs manual handling`);
      return { status: 'failed', amount, reason: 'no Razorpay payment ID', needsReconciliation: false };
    }

    return executeGatewayRefund(row.id, order.orderNumber);
  } catch (err: any) {
    console.error(`[refund] order ${orderId}: unexpected error:`, err?.message || err);
    return { status: 'failed', amount: 0, reason: err?.message || 'unexpected error', needsReconciliation: true };
  }
}

/** Admin retry for a FAILED or RECONCILIATION_REQUIRED refund. Adopts an existing Razorpay refund if there is one. */
export async function retryCancellationRefund(orderId: string): Promise<CancellationRefundOutcome> {
  const row = await prisma.cancellationRefund.findUnique({ where: { orderId }, include: { order: { select: { orderNumber: true } } } });
  if (!row) return { status: 'not_needed', reason: 'no cancellation refund for this order' };
  if (row.status !== RefundStatus.FAILED && row.status !== RefundStatus.RECONCILIATION_REQUIRED) {
    return { status: 'already_handled', refundStatus: row.status };
  }
  if (!row.razorpayPaymentId) return { status: 'failed', amount: Number(row.amount), reason: 'no Razorpay payment ID', needsReconciliation: false };
  return executeGatewayRefund(row.id, row.order.orderNumber);
}

async function executeGatewayRefund(rowId: string, orderNumber: string): Promise<CancellationRefundOutcome> {
  const row = await prisma.cancellationRefund.update({
    where: { id: rowId },
    data: { attempts: { increment: 1 }, status: RefundStatus.INITIATED, failureReason: null },
  });
  const amount = Number(row.amount);
  const paymentId = row.razorpayPaymentId!;
  const razorpay = getRazorpayClient();

  try {
    // Layer 2: adopt a refund we already created for this row (e.g. the last attempt timed out).
    let refund: any = null;
    try {
      const existing = await razorpay.payments.fetchMultipleRefund(paymentId, { count: 100 });
      // Only adopt a live refund; a failed one moved no money, so a new attempt is correct.
      refund = (existing?.items || []).find(
        (r: any) => r?.notes?.cancellation_refund_id === row.id && r?.status !== 'failed'
      ) || null;
    } catch {
      // Listing is best effort; the create call below is still protected by Razorpay's own refund ceiling.
    }

    if (!refund) {
      refund = await razorpay.payments.refund(paymentId, {
        amount: Math.round(amount * 100), // paise
        speed: 'normal',
        receipt: `cxl_${orderNumber}`.slice(0, 40),
        notes: { cancellation_refund_id: row.id, order_number: orderNumber, reason: 'order_cancelled' },
      });
    }

    const confirmed = refund.status === 'processed';
    await prisma.$transaction(async (tx) => {
      await tx.cancellationRefund.update({
        where: { id: row.id },
        data: {
          status: confirmed ? RefundStatus.CONFIRMED : RefundStatus.GATEWAY_PENDING,
          razorpayRefundId: refund.id,
          processedAt: confirmed ? new Date() : null,
          gatewayResponse: { id: refund.id, status: refund.status, amount: refund.amount, speed_processed: refund.speed_processed ?? null, created_at: refund.created_at ?? null },
        },
      });
      const order = await tx.order.findUniqueOrThrow({ where: { id: row.orderId }, select: { totalAmount: true, refundedAmount: true } });
      const refunded = round2(Number(order.refundedAmount || 0) + amount);
      await tx.order.update({
        where: { id: row.orderId },
        data: {
          refundedAmount: refunded,
          paymentStatus: refunded >= Number(order.totalAmount) ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED,
        },
      });
    });

    console.info(`[refund] #${orderNumber}: Razorpay refund ${refund.id} (${refund.status}) for ₹${amount}`);
    return { status: 'initiated', amount, razorpayRefundId: refund.id, gatewayStatus: refund.status };
  } catch (err: any) {
    // Razorpay API errors carry statusCode + error.description; network errors don't.
    const isGatewayRejection = typeof err?.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 500;
    const reason = err?.error?.description || err?.message || 'unknown gateway error';
    const status = isGatewayRejection ? RefundStatus.FAILED : RefundStatus.RECONCILIATION_REQUIRED;
    await prisma.cancellationRefund.update({
      where: { id: row.id },
      data: { status, failureReason: reason.slice(0, 500), gatewayResponse: { statusCode: err?.statusCode ?? null, error: err?.error ?? null } },
    });
    console.error(`[refund] #${orderNumber}: ${status} - ${reason}`);
    return { status: 'failed', amount, reason, needsReconciliation: !isGatewayRejection };
  }
}

/** Applies a Razorpay refund.processed / refund.failed webhook to our record. Returns true if it matched. */
export async function applyRefundWebhook(refundEntity: any, eventType: 'refund.processed' | 'refund.failed'): Promise<boolean> {
  const refundId = refundEntity?.id;
  const rowId = refundEntity?.notes?.cancellation_refund_id;
  const row = await prisma.cancellationRefund.findFirst({
    where: { OR: [...(refundId ? [{ razorpayRefundId: refundId }] : []), ...(rowId ? [{ id: String(rowId) }] : [])] },
  });
  if (!row) return false;

  if (eventType === 'refund.processed') {
    if (row.status !== RefundStatus.CONFIRMED) {
      await prisma.cancellationRefund.update({
        where: { id: row.id },
        data: { status: RefundStatus.CONFIRMED, processedAt: new Date(), razorpayRefundId: refundId ?? row.razorpayRefundId },
      });
    }
    return true;
  }

  // refund.failed: the money did not go back, so undo what we recorded on the order and flag it.
  if (row.status === RefundStatus.FAILED) return true;
  await prisma.$transaction(async (tx) => {
    const wasCounted = row.status === RefundStatus.GATEWAY_PENDING || row.status === RefundStatus.CONFIRMED;
    await tx.cancellationRefund.update({
      where: { id: row.id },
      data: { status: RefundStatus.FAILED, failureReason: `Razorpay reported refund.failed (${refundId})` },
    });
    if (wasCounted) {
      const order = await tx.order.findUniqueOrThrow({ where: { id: row.orderId }, select: { refundedAmount: true } });
      const refunded = Math.max(0, round2(Number(order.refundedAmount || 0) - Number(row.amount)));
      await tx.order.update({
        where: { id: row.orderId },
        data: { refundedAmount: refunded, paymentStatus: refunded > 0 ? PaymentStatus.PARTIALLY_REFUNDED : PaymentStatus.PAID },
      });
    }
  });
  console.error(`[refund] Razorpay refund ${refundId} FAILED for order ${row.orderId}; marked for retry`);
  return true;
}
