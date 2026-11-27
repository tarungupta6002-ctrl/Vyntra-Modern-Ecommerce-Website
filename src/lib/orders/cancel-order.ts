import { Prisma, OrderStatus, OrderItemStatus, ShipmentStatus } from '@prisma/client';

/** Orders whose goods haven't left the seller yet. */
export const PRE_SHIPMENT_STATUSES: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PROCESSING];

export class OrderNotCancellableError extends Error {
  constructor(public currentStatus: OrderStatus | 'NOT_FOUND') {
    super(
      currentStatus === 'NOT_FOUND'
        ? 'Order not found.'
        : currentStatus === OrderStatus.CANCELLED
        ? 'This order is already cancelled.'
        : `Orders that are ${currentStatus.toLowerCase().replace(/_/g, ' ')} can't be cancelled here.`
    );
    this.name = 'OrderNotCancellableError';
  }
}

export interface CancelOrderResult {
  previousStatus: OrderStatus;
  cancelledItems: number;
  /** Units put back into sellable stock. */
  restoredUnits: number;
}

/**
 * Cancels an order inside the caller's transaction: order, its items, its shipments and the stock.
 *
 * - Safe to call twice (double click, customer and admin at once): the order row is claimed with a
 *   conditional update, so only one call cancels it and stock is restored exactly once.
 * - Stock goes back only for items that hadn't shipped. Units already with the courier aren't
 *   sellable until they physically come back, which is the return flow's job.
 * - Stock goes back to the same inventory the checkout took it from: the seller offer's inventory
 *   for offer items, otherwise the product inventory (never both), choosing rows in the same
 *   order the checkout does (oldest first).
 */
export async function cancelOrderTx(
  tx: Prisma.TransactionClient,
  orderId: string,
  allowedFrom: OrderStatus[]
): Promise<CancelOrderResult> {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: {
      status: true,
      items: { select: { id: true, status: true, quantity: true, variantId: true, offerVariantId: true, vendorId: true } },
    },
  });
  if (!order) throw new OrderNotCancellableError('NOT_FOUND');
  if (!allowedFrom.includes(order.status)) throw new OrderNotCancellableError(order.status);

  // Claim the cancellation: only succeeds if nobody changed the status since we read it.
  const claimed = await tx.order.updateMany({
    where: { id: orderId, status: order.status },
    data: { status: OrderStatus.CANCELLED },
  });
  if (claimed.count === 0) {
    const now = await tx.order.findUnique({ where: { id: orderId }, select: { status: true } });
    throw new OrderNotCancellableError(now?.status ?? 'NOT_FOUND');
  }

  const finalStatuses: OrderItemStatus[] = [OrderItemStatus.CANCELLED, OrderItemStatus.DELIVERED, OrderItemStatus.RETURNED];
  const toCancel = order.items.filter((i) => !finalStatuses.includes(i.status));
  if (toCancel.length > 0) {
    await tx.orderItem.updateMany({
      where: { id: { in: toCancel.map((i) => i.id) } },
      data: { status: OrderItemStatus.CANCELLED },
    });
  }

  await tx.vendorShipment.updateMany({
    where: { orderId, status: { notIn: [ShipmentStatus.DELIVERED, ShipmentStatus.CANCELLED] } },
    data: { status: ShipmentStatus.CANCELLED },
  });

  let restoredUnits = 0;
  const notShipped: OrderItemStatus[] = [OrderItemStatus.PENDING, OrderItemStatus.PROCESSING];
  for (const item of toCancel) {
    if (!notShipped.includes(item.status) || item.quantity <= 0) continue;

    if (item.offerVariantId) {
      const inv = await tx.offerInventory.findFirst({
        where: { offerVariantId: item.offerVariantId },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      if (inv) {
        await tx.$executeRaw`
          UPDATE "OfferInventory" SET "quantity" = "quantity" + ${item.quantity}, "updatedAt" = NOW()
          WHERE "id" = ${inv.id}
        `;
        restoredUnits += item.quantity;
      }
    } else if (item.variantId) {
      const inv =
        (await tx.productInventory.findFirst({
          where: { variantId: item.variantId, vendorId: item.vendorId },
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        })) ||
        (await tx.productInventory.findFirst({
          where: { variantId: item.variantId },
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        }));
      if (inv) {
        await tx.$executeRaw`
          UPDATE "ProductInventory" SET "quantity" = "quantity" + ${item.quantity}, "updatedAt" = NOW()
          WHERE "id" = ${inv.id}
        `;
        restoredUnits += item.quantity;
      }
    }
  }

  return { previousStatus: order.status, cancelledItems: toCancel.length, restoredUnits };
}
