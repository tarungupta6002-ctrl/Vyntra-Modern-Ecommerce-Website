import { OrderItemStatus, OrderStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { sendEmail, maskEmail, type SendResult } from './send';
import { renderOrderEmail, type OrderEmailData, type OrderEmailType } from './order-templates';

/**
 * Customer order emails (Phase 1): confirmed, shipped, delivered, cancelled.
 *
 * Call AFTER the database transaction has committed. These functions never throw, so a
 * mail outage can't fail a checkout, a dispatch or a cancellation.
 *
 * Duplicates: callers only notify when the order status actually changed, and a short
 * in-memory guard drops repeats of the same email for the same order (e.g. a double-click
 * on "Mark delivered"). The guard is per server instance.
 */

const DEDUPE_WINDOW_MS = 10 * 60 * 1000;
const recentlySent = new Map<string, number>();

function alreadySentRecently(key: string): boolean {
  const now = Date.now();
  recentlySent.forEach((ts, k) => {
    if (now - ts > DEDUPE_WINDOW_MS) recentlySent.delete(k);
  });
  if (recentlySent.has(key)) return true;
  recentlySent.set(key, now);
  return false;
}

/** Which email (if any) a status transition should send. */
export function emailTypeForTransition(
  previous: OrderStatus | string | null | undefined,
  next: OrderStatus | string | null | undefined
): OrderEmailType | null {
  if (!next || previous === next) return null;
  switch (next) {
    case OrderStatus.SHIPPED:
      // Don't announce "shipped" again after it is already out for delivery or delivered.
      return previous === OrderStatus.OUT_FOR_DELIVERY || previous === OrderStatus.DELIVERED ? null : 'shipped';
    case OrderStatus.DELIVERED:
      return 'delivered';
    case OrderStatus.CANCELLED:
      return 'cancelled';
    default:
      return null; // PROCESSING, OUT_FOR_DELIVERY, RETURNED: not part of Phase 1
  }
}

/** Notify the customer if this status change deserves an email. */
export async function notifyOrderStatusChange(
  orderId: string,
  previous: OrderStatus | string | null | undefined,
  next: OrderStatus | string | null | undefined
): Promise<SendResult | null> {
  const type = emailTypeForTransition(previous, next);
  return type ? sendOrderEmail(orderId, type) : null;
}

export async function sendOrderEmail(orderId: string, type: OrderEmailType): Promise<SendResult | null> {
  try {
    if (alreadySentRecently(`${orderId}:${type}`)) {
      return { status: 'skipped', reason: 'duplicate within dedupe window' };
    }

    const data = await loadOrderEmailData(orderId, type);
    if (!data) return { status: 'skipped', reason: 'order or customer email not found' };

    const rendered = renderOrderEmail(type, data.email);
    const result = await sendEmail({ to: data.to, tag: `order-${type}`, ...rendered });
    if (result.status === 'sent') {
      console.info(`[email] order-${type} for #${data.email.orderNumber} sent to ${maskEmail(data.to)}`);
    }
    return result;
  } catch (err: any) {
    console.error(`[email] order-${type} for order ${orderId} failed:`, err?.message || err);
    return { status: 'failed', error: err?.message || 'unknown error' };
  }
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

async function loadOrderEmailData(
  orderId: string,
  type: OrderEmailType
): Promise<{ to: string; email: OrderEmailData } | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { email: true, name: true } },
      shippingAddress: true,
      vendorShipments: { select: { courierPartner: true, trackingNumber: true } },
      cancellationRefund: { select: { amount: true, status: true } },
      items: {
        include: {
          variant: { select: { imageUrl: true } },
          product: {
            select: {
              title: true,
              images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1, select: { url: true } },
            },
          },
        },
      },
    },
  });
  if (!order?.user?.email) return null;

  // Shipped/delivered emails list only what is actually coming; cancelled lists everything.
  const items = order.items.filter((i) => type === 'cancelled' || i.status !== OrderItemStatus.CANCELLED);

  const addr = order.shippingAddress;
  return {
    to: order.user.email,
    email: {
      customerName: addr?.fullName || order.user.name || '',
      orderNumber: order.orderNumber,
      placedAt: order.createdAt,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      items: items.map((i) => ({
        title: i.product?.title || 'Item',
        imageUrl: i.variant?.imageUrl || i.product?.images?.[0]?.url || null,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        totalPrice: Number(i.totalPrice),
        size: i.selectedSize,
        color: i.selectedColor,
      })),
      subtotal: Number(order.subtotal),
      discount: Number(order.discount),
      shippingFee: Number(order.shippingFee),
      tax: Number(order.tax),
      total: Number(order.totalAmount),
      address: addr
        ? {
            fullName: addr.fullName,
            line1: addr.streetAddress,
            line2: [addr.locality, addr.landmark].filter(Boolean).join(', ') || null,
            city: addr.city,
            state: addr.state,
            postalCode: addr.postalCode,
            phone: addr.phone,
          }
        : null,
      shipments: order.vendorShipments.length
        ? order.vendorShipments
        : [{ courierPartner: order.courierPartner, trackingNumber: order.trackingNumber }],
      refund: order.cancellationRefund
        ? { amount: Number(order.cancellationRefund.amount), status: order.cancellationRefund.status }
        : null,
      siteUrl: siteUrl(),
    },
  };
}
