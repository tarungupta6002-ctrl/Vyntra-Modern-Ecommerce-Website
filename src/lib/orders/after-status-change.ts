import { OrderStatus } from '@prisma/client';
import { refundCancelledOrder, type RefundActor, type CancellationRefundOutcome } from '@/lib/payments/cancellation-refund';
import { notifyOrderStatusChange } from '@/lib/email/order-notifications';

/**
 * Side effects of an order status change, run AFTER the status transaction has committed:
 * 1. Cancelled online-paid order -> automatic Razorpay refund.
 * 2. Customer email (sent after the refund so the cancellation email can mention it).
 *
 * Returns the refund outcome (null when the change wasn't a cancellation). Never throws.
 */
export async function afterOrderStatusChange(
  orderId: string,
  previous: OrderStatus | string | null | undefined,
  next: OrderStatus | string | null | undefined,
  actor: RefundActor
): Promise<CancellationRefundOutcome | null> {
  let refund: CancellationRefundOutcome | null = null;
  try {
    if (next === OrderStatus.CANCELLED && previous !== OrderStatus.CANCELLED) {
      refund = await refundCancelledOrder(orderId, actor);
    }
  } catch (err: any) {
    console.error(`[order ${orderId}] refund step failed:`, err?.message || err);
  }
  await notifyOrderStatusChange(orderId, previous, next);
  return refund;
}
