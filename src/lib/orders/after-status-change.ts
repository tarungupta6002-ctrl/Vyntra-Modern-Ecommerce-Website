import { OrderStatus } from '@prisma/client';
import { refundCancelledOrder, type RefundActor } from '@/lib/payments/cancellation-refund';
import { notifyOrderStatusChange } from '@/lib/email/order-notifications';

/**
 * Side effects of an order status change, run AFTER the status transaction has committed:
 * 1. Cancelled online-paid order -> automatic Razorpay refund.
 * 2. Customer email (sent after the refund so the cancellation email can mention it).
 *
 * Never throws.
 */
export async function afterOrderStatusChange(
  orderId: string,
  previous: OrderStatus | string | null | undefined,
  next: OrderStatus | string | null | undefined,
  actor: RefundActor
): Promise<void> {
  try {
    if (next === OrderStatus.CANCELLED && previous !== OrderStatus.CANCELLED) {
      await refundCancelledOrder(orderId, actor);
    }
  } catch (err: any) {
    console.error(`[order ${orderId}] refund step failed:`, err?.message || err);
  }
  await notifyOrderStatusChange(orderId, previous, next);
}
