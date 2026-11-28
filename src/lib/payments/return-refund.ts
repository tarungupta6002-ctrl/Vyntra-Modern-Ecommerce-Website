import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PayoutStatus,
  Prisma,
  RefundMode,
  RefundStatus,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getRazorpayClient } from '@/lib/razorpay';
import { allocateOrderDiscount } from '@/lib/discounts';
import {
  calculateProRataShippingShare,
  calculateRefundShares,
  validateRefundCeilings,
  validateShippingRefundCeiling,
} from '@/lib/refund-math';
import { SELLER_FAULT_REASONS } from '@/lib/policy-constants';

/**
 * Refunds for approved returns (RefundTransaction rows).
 *
 * Online-paid orders are refunded through Razorpay to the original payment method:
 *   A. createReturnRefund   - validate, lock the return, claim the amount as an INITIATED row
 *   B. executeGatewayRefund - ask Razorpay; adopt an earlier refund for the same row if one exists
 *   C. finalize             - only once Razorpay accepted it: update the order, the return and the
 *                             seller's earnings (GATEWAY_PENDING until refund.processed arrives)
 * Cash on Delivery orders (and online orders with no Razorpay payment ID) are paid back by the
 * team outside the system; the admin records the bank/UPI reference and A+C happen together.
 *
 * Double-refund protection: the return row is locked while claiming; rows that are not FAILED
 * count against the refund ceilings; every Razorpay refund carries notes.return_refund_id and is
 * looked up before a new one is created; network errors become RECONCILIATION_REQUIRED and are
 * never blindly retried.
 */

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Rows that hold (or may hold) money: they count against the refund ceilings. */
const COUNTED: RefundStatus[] = [
  RefundStatus.INITIATED,
  RefundStatus.GATEWAY_PENDING,
  RefundStatus.CONFIRMED,
  RefundStatus.RECONCILIATION_REQUIRED,
];
/** Rows whose bookkeeping (order, return, seller earnings) has been applied. */
const FINALIZED: RefundStatus[] = [RefundStatus.GATEWAY_PENDING, RefundStatus.CONFIRMED];

type Tx = Prisma.TransactionClient;

export class ReturnRefundError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

function razorpayPaymentIdOf(order: { razorpayPaymentId: string | null; remittanceReference: string | null }) {
  return order.razorpayPaymentId || (order.remittanceReference?.startsWith('pay_') ? order.remittanceReference : null);
}

export interface CreateReturnRefundInput {
  returnRequestId: string;
  clientRequestId: string;
  requestedAmount?: number;
  adminEmail: string;
  adminNotes?: string;
  /** Bank/UPI reference; required when the money is sent outside Razorpay (COD). */
  manualReference?: string;
}

export type CreateReturnRefundResult =
  | { kind: 'duplicate'; refundId: string; status: RefundStatus }
  | { kind: 'manual'; refundId: string; amount: number }
  | { kind: 'gateway'; refundId: string; amount: number; orderNumber: string };

/** Part A (and C for manual refunds). */
export async function createReturnRefund(input: CreateReturnRefundInput): Promise<CreateReturnRefundResult> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.refundTransaction.findUnique({
      where: { returnRequestId_clientRequestId: { returnRequestId: input.returnRequestId, clientRequestId: input.clientRequestId } },
    });
    if (existing) return { kind: 'duplicate', refundId: existing.id, status: existing.status };

    // Serialize refunds for this return so two clicks cannot both pass the ceiling checks.
    await tx.$queryRaw`SELECT id FROM "ReturnRequest" WHERE id = ${input.returnRequestId} FOR UPDATE`;

    const returnRequest = await tx.returnRequest.findUnique({
      where: { id: input.returnRequestId },
      include: { orderItem: true, order: { include: { items: { select: { id: true, totalPrice: true } } } } },
    });
    if (!returnRequest) throw new ReturnRefundError('RETURN_NOT_FOUND', 'Return request not found.');
    const { order, orderItem } = returnRequest;
    if (returnRequest.orderItemId !== orderItem.id || orderItem.orderId !== order.id) {
      throw new ReturnRefundError('ORDER_ITEM_INTEGRITY_MISMATCH', 'Return does not match its order item.');
    }

    const isQcPassed = returnRequest.status === 'QC_PASSED';
    const isDisputeApproved = returnRequest.status === 'QC_DISPUTED' && returnRequest.disputeResolution === 'REFUND_APPROVED';
    if (!isQcPassed && !isDisputeApproved) {
      throw new ReturnRefundError(
        'RETURN_NOT_ELIGIBLE',
        `This return is "${returnRequest.status}". Only returns that passed inspection, or whose dispute was approved, can be refunded.`
      );
    }

    if (order.paymentMethod === PaymentMethod.COD && order.paymentStatus !== PaymentStatus.PAID && order.paymentStatus !== PaymentStatus.PARTIALLY_REFUNDED) {
      throw new ReturnRefundError('COD_NOT_SETTLED', 'This Cash on Delivery order is not marked as paid yet, so there is nothing to refund.');
    }
    if (order.paymentStatus === PaymentStatus.PENDING || order.paymentStatus === PaymentStatus.FAILED) {
      throw new ReturnRefundError('ORDER_PAYMENT_INELIGIBLE', `The order's payment is ${order.paymentStatus}, so it cannot be refunded.`);
    }

    const paymentId = order.paymentMethod === PaymentMethod.COD ? null : razorpayPaymentIdOf(order);
    const viaGateway = Boolean(paymentId);
    const manualReference = (input.manualReference || '').trim();
    if (!viaGateway && (manualReference.length < 4 || manualReference.length > 60)) {
      throw new ReturnRefundError(
        'MANUAL_REFERENCE_REQUIRED',
        order.paymentMethod === PaymentMethod.COD
          ? 'Cash on Delivery refunds are paid by bank transfer or UPI. Send the money, then enter its reference / UTR (4 to 60 characters).'
          : 'This order has no Razorpay payment ID, so refund it manually and enter the bank reference / UTR (4 to 60 characters).'
      );
    }

    // Ceilings, counting every refund that holds or may hold money.
    const allocated = allocateOrderDiscount(
      Number(order.subtotal),
      Number(order.discount),
      order.items.map((it) => ({ id: it.id, totalPrice: Number(it.totalPrice) }))
    );
    const effectiveItemCeiling =
      allocated.find((a) => a.id === orderItem.id)?.effectiveItemCeiling ?? Number(orderItem.totalPrice);

    const counted = await tx.refundTransaction.findMany({
      where: { orderId: order.id, status: { in: COUNTED } },
      select: { returnRequestId: true, amount: true, shippingFeeRefund: true },
    });
    const productPart = (r: { amount: Prisma.Decimal; shippingFeeRefund: Prisma.Decimal }) => Number(r.amount) - Number(r.shippingFeeRefund || 0);
    const itemRefunded = round2(counted.filter((r) => r.returnRequestId === returnRequest.id).reduce((s, r) => s + productPart(r), 0));
    const orderRefunded = round2(counted.reduce((s, r) => s + productPart(r), 0));
    const shippingRefunded = round2(counted.reduce((s, r) => s + Number(r.shippingFeeRefund || 0), 0));
    const approvedOrderCeiling = Math.max(0, round2(Number(order.subtotal) - Number(order.discount)));

    const maxRefundable = Math.min(
      Math.max(0, round2(effectiveItemCeiling - itemRefunded)),
      Math.max(0, round2(approvedOrderCeiling - orderRefunded))
    );
    if (maxRefundable <= 0) {
      throw new ReturnRefundError('NO_REFUNDABLE_BALANCE', 'This item has already been refunded in full (or a refund for it is still in progress).');
    }

    const refundAmount = input.requestedAmount !== undefined ? round2(input.requestedAmount) : maxRefundable;
    validateRefundCeilings({
      requestedAmount: refundAmount,
      confirmedItemRefunds: itemRefunded,
      effectiveItemCeiling,
      confirmedOrderRefunds: orderRefunded,
      approvedOrderCeiling,
    });
    const shares = calculateRefundShares(refundAmount, Number(orderItem.commissionRate || 0));

    // Seller-fault returns also get their share of the order's shipping/packaging fee back.
    let shippingRefund = 0;
    const orderShippingFee = Number(order.shippingFee || 0);
    if (SELLER_FAULT_REASONS.has(returnRequest.reason) && orderShippingFee > 0) {
      shippingRefund = calculateProRataShippingShare(
        orderShippingFee,
        order.items.map((it) => ({
          id: it.id,
          eligibleValue: allocated.find((a) => a.id === it.id)?.effectiveItemCeiling ?? Number(it.totalPrice),
        })),
        orderItem.id
      );
      validateShippingRefundCeiling({
        orderShippingFee,
        confirmedShippingRefunds: shippingRefunded,
        requestedShippingRefund: shippingRefund,
      });
    }
    const gross = round2(refundAmount + shippingRefund);

    const note = input.adminNotes?.trim();
    await tx.returnRequest.update({
      where: { id: returnRequest.id },
      data: {
        nextRefundSequence: { increment: 1 },
        ...(note || manualReference
          ? {
              adminNotes: [
                returnRequest.adminNotes,
                `[${new Date().toISOString()}] Admin ${input.adminEmail}: refund ₹${gross}${manualReference ? ` (Ref: ${manualReference})` : ' via Razorpay'}${note ? ` - ${note}` : ''}`,
              ]
                .filter(Boolean)
                .join('\n'),
            }
          : {}),
      },
    });

    const row = await tx.refundTransaction.create({
      data: {
        returnRequestId: returnRequest.id,
        orderId: order.id,
        userId: returnRequest.userId,
        vendorProfileId: returnRequest.vendorProfileId,
        clientRequestId: input.clientRequestId,
        requestSequence: returnRequest.nextRefundSequence,
        status: viaGateway ? RefundStatus.INITIATED : RefundStatus.CONFIRMED,
        mode: viaGateway ? RefundMode.ORIGINAL_PAYMENT : RefundMode.MANUAL_BANK_TRANSFER,
        amount: gross,
        shippingFeeRefund: shippingRefund,
        vendorShare: shares.vendorShare,
        platformShare: round2(shares.platformShare + shippingRefund),
        gatewayReference: viaGateway ? null : manualReference,
        processedAt: viaGateway ? null : new Date(),
      },
    });

    if (!viaGateway) {
      await applyBookkeeping(tx, row.id);
      return { kind: 'manual', refundId: row.id, amount: gross };
    }
    return { kind: 'gateway', refundId: row.id, amount: gross, orderNumber: order.orderNumber };
  });
}

/** Part C: order totals, return status and seller earnings, for a row that now holds money. */
async function applyBookkeeping(tx: Tx, refundId: string) {
  const row = await tx.refundTransaction.findUniqueOrThrow({ where: { id: refundId } });
  const returnRequest = await tx.returnRequest.findUniqueOrThrow({
    where: { id: row.returnRequestId },
    include: { orderItem: true, order: { include: { items: { select: { id: true, totalPrice: true } } } } },
  });
  const { order, orderItem } = returnRequest;

  const refunded = round2(Number(order.refundedAmount || 0) + Number(row.amount));
  const approvedOrderCeiling = Math.max(0, round2(Number(order.subtotal) - Number(order.discount)));
  // Every product in the order has been refunded: the order counts as returned. The payment is
  // only "REFUNDED" if the whole amount paid came back (fees such as packaging may be kept).
  const allProductsRefunded = refunded >= round2(approvedOrderCeiling + Number(order.shippingFee || 0));
  await tx.order.update({
    where: { id: order.id },
    data: {
      refundedAmount: refunded,
      paymentStatus: refunded >= Number(order.totalAmount) ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED,
      ...(allProductsRefunded ? { status: OrderStatus.RETURNED } : {}),
    },
  });

  // Item fully refunded? Count only rows whose money has gone (this one included).
  const allocated = allocateOrderDiscount(
    Number(order.subtotal),
    Number(order.discount),
    order.items.map((it) => ({ id: it.id, totalPrice: Number(it.totalPrice) }))
  );
  const effectiveItemCeiling =
    allocated.find((a) => a.id === orderItem.id)?.effectiveItemCeiling ?? Number(orderItem.totalPrice);
  const done = await tx.refundTransaction.findMany({
    where: { returnRequestId: returnRequest.id, status: { in: [...FINALIZED] } },
    select: { amount: true, shippingFeeRefund: true },
  });
  const itemRefunded = round2(done.reduce((s, r) => s + Number(r.amount) - Number(r.shippingFeeRefund || 0), 0));
  const itemFullyRefunded = itemRefunded >= effectiveItemCeiling;
  if (itemFullyRefunded) {
    await tx.returnRequest.update({ where: { id: returnRequest.id }, data: { status: 'COMPLETED' } });
    await tx.orderItem.update({ where: { id: orderItem.id }, data: { status: 'RETURNED' } });
  }

  // Seller side: recover from a paid-out item, otherwise reduce or cancel the pending earnings.
  const vendorShare = Number(row.vendorShare);
  if (orderItem.vendorPayoutId !== null || orderItem.payoutStatus === PayoutStatus.COMPLETED) {
    await tx.vendorAdjustment.create({
      data: {
        vendorProfileId: orderItem.vendorId,
        amount: vendorShare,
        type: 'RETURN_REFUND_DEBIT',
        description: `Return refund debit for order #${order.orderNumber} (Refund Tx: ${row.id})`,
        returnRequestId: returnRequest.id,
        refundTransactionId: row.id,
        vendorPayoutId: null,
      },
    });
  } else if (itemFullyRefunded) {
    await tx.orderItem.update({ where: { id: orderItem.id }, data: { payoutStatus: PayoutStatus.CANCELLED } });
  } else {
    await tx.orderItem.update({
      where: { id: orderItem.id },
      data: { netEarnings: Math.max(0, round2(Number(orderItem.netEarnings || 0) - vendorShare)) },
    });
  }
}

/** Undo Part C when Razorpay reports that a refund we counted failed after all. */
async function revertBookkeeping(tx: Tx, refundId: string) {
  const row = await tx.refundTransaction.findUniqueOrThrow({ where: { id: refundId } });
  const returnRequest = await tx.returnRequest.findUniqueOrThrow({
    where: { id: row.returnRequestId },
    include: { orderItem: true, order: true },
  });
  const { order, orderItem } = returnRequest;

  const refunded = Math.max(0, round2(Number(order.refundedAmount || 0) - Number(row.amount)));
  await tx.order.update({
    where: { id: order.id },
    data: {
      refundedAmount: refunded,
      paymentStatus: refunded > 0 ? PaymentStatus.PARTIALLY_REFUNDED : PaymentStatus.PAID,
      ...(order.status === OrderStatus.RETURNED ? { status: OrderStatus.DELIVERED } : {}),
    },
  });

  if (orderItem.status === 'RETURNED') {
    await tx.orderItem.update({ where: { id: orderItem.id }, data: { status: 'DELIVERED' } });
  }
  if (returnRequest.status === 'COMPLETED') {
    await tx.returnRequest.update({
      where: { id: returnRequest.id },
      data: { status: returnRequest.disputeResolution === 'REFUND_APPROVED' ? 'QC_DISPUTED' : 'QC_PASSED' },
    });
  }

  const adjustment = await tx.vendorAdjustment.findFirst({
    where: { refundTransactionId: row.id },
    include: { allocations: { where: { status: 'ACTIVE' }, select: { id: true } } },
  });
  if (adjustment) {
    if (adjustment.allocations.length === 0) {
      await tx.vendorAdjustment.delete({ where: { id: adjustment.id } });
    } else {
      console.error(`[return-refund] ${row.id}: refund failed but its seller debit was already deducted from a payout; fix by hand`);
    }
  } else if (orderItem.payoutStatus === PayoutStatus.CANCELLED) {
    await tx.orderItem.update({ where: { id: orderItem.id }, data: { payoutStatus: PayoutStatus.PENDING } });
  } else {
    await tx.orderItem.update({
      where: { id: orderItem.id },
      data: { netEarnings: round2(Number(orderItem.netEarnings || 0) + Number(row.vendorShare)) },
    });
  }
}

/** Marks a row as holding money (once) and applies the bookkeeping. Returns false if it was already done. */
async function finalize(refundId: string, data: { status: RefundStatus; gatewayTransactionId?: string; gatewayResponse?: any }) {
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.refundTransaction.updateMany({
      where: { id: refundId, status: { in: [RefundStatus.INITIATED, RefundStatus.RECONCILIATION_REQUIRED] } },
      data: {
        status: data.status,
        failureReason: null,
        ...(data.gatewayTransactionId ? { gatewayTransactionId: data.gatewayTransactionId, gatewayReference: data.gatewayTransactionId } : {}),
        ...(data.gatewayResponse ? { gatewayResponse: data.gatewayResponse } : {}),
        ...(data.status === RefundStatus.CONFIRMED ? { processedAt: new Date() } : {}),
      },
    });
    if (claimed.count === 0) return false;
    await applyBookkeeping(tx, refundId);
    return true;
  });
}

export type GatewayOutcome =
  | { status: 'initiated'; refundId: string; razorpayRefundId: string; gatewayStatus: string; amount: number }
  | { status: 'failed'; refundId: string; reason: string; needsReconciliation: boolean; amount: number };

/** Part B: ask Razorpay to refund an INITIATED (or unresolved) row. */
export async function executeReturnGatewayRefund(refundId: string): Promise<GatewayOutcome> {
  const row = await prisma.refundTransaction.findUniqueOrThrow({
    where: { id: refundId },
    include: { order: { select: { orderNumber: true, razorpayPaymentId: true, remittanceReference: true } } },
  });
  const amount = Number(row.amount);
  const paymentId = razorpayPaymentIdOf(row.order);
  if (!paymentId) return { status: 'failed', refundId, reason: 'Order has no Razorpay payment ID', needsReconciliation: false, amount };

  try {
    const razorpay = getRazorpayClient();
    let refund: any = null;
    try {
      const existing = await razorpay.payments.fetchMultipleRefund(paymentId, { count: 100 });
      refund = (existing?.items || []).find((r: any) => r?.notes?.return_refund_id === row.id && r?.status !== 'failed') || null;
    } catch {
      // Best effort; Razorpay also refuses refunds above the captured amount.
    }
    if (!refund) {
      refund = await razorpay.payments.refund(paymentId, {
        amount: Math.round(amount * 100),
        speed: 'normal',
        receipt: `ret_${row.order.orderNumber}_${row.requestSequence}`.slice(0, 40),
        notes: { return_refund_id: row.id, order_number: row.order.orderNumber, reason: 'return_refund' },
      });
    }

    const confirmed = refund.status === 'processed';
    await finalize(row.id, {
      status: confirmed ? RefundStatus.CONFIRMED : RefundStatus.GATEWAY_PENDING,
      gatewayTransactionId: refund.id,
      gatewayResponse: { id: refund.id, status: refund.status, amount: refund.amount, created_at: refund.created_at ?? null },
    });
    console.info(`[return-refund] #${row.order.orderNumber}: Razorpay refund ${refund.id} (${refund.status}) for ₹${amount}`);
    return { status: 'initiated', refundId, razorpayRefundId: refund.id, gatewayStatus: refund.status, amount };
  } catch (err: any) {
    const isGatewayRejection = typeof err?.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 500;
    const reason = err?.error?.description || err?.message || 'unknown gateway error';
    await prisma.refundTransaction.updateMany({
      where: { id: row.id, status: { in: [RefundStatus.INITIATED, RefundStatus.RECONCILIATION_REQUIRED] } },
      data: {
        status: isGatewayRejection ? RefundStatus.FAILED : RefundStatus.RECONCILIATION_REQUIRED,
        failureReason: reason.slice(0, 500),
        gatewayResponse: { statusCode: err?.statusCode ?? null, error: err?.error ?? null },
      },
    });
    console.error(`[return-refund] #${row.order.orderNumber}: ${isGatewayRejection ? 'FAILED' : 'RECONCILIATION_REQUIRED'} - ${reason}`);
    return { status: 'failed', refundId, reason, needsReconciliation: !isGatewayRejection, amount };
  }
}

/** Admin "check with Razorpay" for a row stuck in INITIATED or RECONCILIATION_REQUIRED. */
export async function reconcileReturnRefund(refundId: string): Promise<GatewayOutcome> {
  const row = await prisma.refundTransaction.findUniqueOrThrow({ where: { id: refundId } });
  if (row.status !== RefundStatus.INITIATED && row.status !== RefundStatus.RECONCILIATION_REQUIRED) {
    throw new ReturnRefundError('NOT_PENDING', `This refund is already ${row.status}.`);
  }
  // Adopts the refund if Razorpay has it, otherwise creates it (the note makes this safe).
  return executeReturnGatewayRefund(refundId);
}

/** Applies refund.processed / refund.failed to a return refund. Returns true if it matched one. */
export async function applyReturnRefundWebhook(refundEntity: any, eventType: 'refund.processed' | 'refund.failed'): Promise<boolean> {
  const gatewayId = refundEntity?.id;
  const rowId = refundEntity?.notes?.return_refund_id;
  const row = await prisma.refundTransaction.findFirst({
    where: { OR: [...(gatewayId ? [{ gatewayTransactionId: gatewayId }] : []), ...(rowId ? [{ id: String(rowId) }] : [])] },
  });
  if (!row) return false;

  if (eventType === 'refund.processed') {
    if (row.status === RefundStatus.GATEWAY_PENDING) {
      await prisma.refundTransaction.update({ where: { id: row.id }, data: { status: RefundStatus.CONFIRMED, processedAt: new Date() } });
    } else if (row.status === RefundStatus.INITIATED || row.status === RefundStatus.RECONCILIATION_REQUIRED) {
      // Our own call lost the response; Razorpay says the money went back.
      await finalize(row.id, { status: RefundStatus.CONFIRMED, gatewayTransactionId: gatewayId });
    }
    return true;
  }

  // refund.failed: nothing moved. Undo our bookkeeping if we had applied it.
  await prisma.$transaction(async (tx) => {
    const wasFinalized = await tx.refundTransaction.updateMany({
      where: { id: row.id, status: { in: [...FINALIZED] } },
      data: { status: RefundStatus.FAILED, failureReason: `Razorpay reported refund.failed (${gatewayId})` },
    });
    if (wasFinalized.count === 1) {
      await revertBookkeeping(tx, row.id);
    } else {
      await tx.refundTransaction.updateMany({
        where: { id: row.id, status: { in: [RefundStatus.INITIATED, RefundStatus.RECONCILIATION_REQUIRED] } },
        data: { status: RefundStatus.FAILED, failureReason: `Razorpay reported refund.failed (${gatewayId})` },
      });
    }
  });
  console.error(`[return-refund] Razorpay refund ${gatewayId} FAILED for refund ${row.id}; the admin can refund again`);
  return true;
}
