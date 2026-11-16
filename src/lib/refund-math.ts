/**
 * Vyntra Marketplace - Refund Financial Mathematics & Ceilings
 * 
 * Implements commercial ROUND_HALF_UP paise-exact share allocations and
 * strictly bounded cumulative refund ceiling guards.
 */

export interface RefundShares {
  refundAmount: number;
  platformShare: number;
  vendorShare: number;
}

/**
 * Calculates exact platform commission reversal and vendor debit share
 * with zero-paise discrepancy.
 * 
 * Formula:
 *   platformShare = ROUND_HALF_UP(refundAmount * (commissionRate / 100), 2)
 *   vendorShare   = refundAmount - platformShare
 * Invariant:
 *   platformShare + vendorShare === refundAmount (identical to 2 decimal places).
 */
export function calculateRefundShares(
  refundAmount: number,
  commissionRate: number
): RefundShares {
  if (refundAmount <= 0) {
    throw new Error('INVALID_REFUND_AMOUNT: Refund amount must be strictly positive');
  }
  if (commissionRate < 0 || commissionRate > 100) {
    throw new Error('INVALID_COMMISSION_RATE: Commission rate must be between 0 and 100%');
  }

  // Paise rounding using half-up arithmetic
  const rawPlatform = (refundAmount * commissionRate) / 100;
  const platformShare = Math.round(rawPlatform * 100) / 100;
  const vendorShare = Math.round((refundAmount - platformShare) * 100) / 100;

  // Exact identity verification
  const checkSum = Math.round((platformShare + vendorShare) * 100) / 100;
  if (checkSum !== Math.round(refundAmount * 100) / 100) {
    throw new Error(
      `PAISE_INTEGRITY_VIOLATION: Shares sum (₹${checkSum}) does not equal refund amount (₹${refundAmount})`
    );
  }

  return {
    refundAmount: Math.round(refundAmount * 100) / 100,
    platformShare,
    vendorShare,
  };
}

/**
 * Validates whether a requested refund amount conforms to cumulative item
 * and order-level allowable ceilings.
 */
export function validateRefundCeilings(params: {
  requestedAmount: number;
  confirmedItemRefunds: number;
  effectiveItemCeiling: number; // OrderItem.totalPrice - OrderItem.allocatedDiscount
  confirmedOrderRefunds: number;
  approvedOrderCeiling: number; // Order.subtotal - Order.discount (excluding packaging/COD fees pending policy)
}): { allowed: boolean; remainingItemCap: number; remainingOrderCap: number } {
  const {
    requestedAmount,
    confirmedItemRefunds,
    effectiveItemCeiling,
    confirmedOrderRefunds,
    approvedOrderCeiling,
  } = params;

  if (requestedAmount <= 0) {
    throw new Error('INVALID_REFUND_AMOUNT: Requested amount must be positive');
  }

  const remainingItemCap = Math.max(
    0,
    Math.round((effectiveItemCeiling - confirmedItemRefunds) * 100) / 100
  );
  const remainingOrderCap = Math.max(
    0,
    Math.round((approvedOrderCeiling - confirmedOrderRefunds) * 100) / 100
  );

  if (requestedAmount > remainingItemCap) {
    throw new Error(
      `ITEM_CEILING_EXCEEDED: Requested ₹${requestedAmount} exceeds remaining item allowable ceiling of ₹${remainingItemCap}`
    );
  }

  if (requestedAmount > remainingOrderCap) {
    throw new Error(
      `ORDER_CEILING_EXCEEDED: Requested ₹${requestedAmount} exceeds remaining order allowable ceiling of ₹${remainingOrderCap}`
    );
  }

  return {
    allowed: true,
    remainingItemCap,
    remainingOrderCap,
  };
}

/**
 * Generates the permanent sequence-anchored gateway idempotency key.
 */
export function buildIdempotencyKey(
  returnRequestId: string,
  requestSequence: number
): string {
  if (!returnRequestId || requestSequence <= 0) {
    throw new Error('INVALID_IDEMPOTENCY_PARAMS: returnRequestId and positive requestSequence required');
  }
  return `VYN-REF-${returnRequestId}-SEQ-${requestSequence}`;
}

export interface ShippingAllocationItem {
  id: string;
  eligibleValue: number; // totalPrice - allocatedDiscount
}

/**
 * Calculates deterministic proportional shipping fee allocation for multi-item seller fault returns.
 * Invariant: Last item deterministically absorbs paise rounding remainder.
 * Total allocated across all items === orderShippingFee.
 */
export function calculateProRataShippingShare(
  orderShippingFee: number,
  items: ShippingAllocationItem[],
  currentItemId: string
): number {
  if (orderShippingFee <= 0 || items.length === 0) return 0;
  if (items.length === 1) return Math.round(orderShippingFee * 100) / 100;

  // Deterministically sort items by id ascending
  const sorted = [...items].sort((a, b) => a.id.localeCompare(b.id));
  const totalValue = sorted.reduce((sum, it) => sum + Math.max(0, it.eligibleValue), 0);

  if (totalValue <= 0) {
    // Equal distribution if values are 0
    const equalShare = Math.floor((orderShippingFee / sorted.length) * 100) / 100;
    const isLast = sorted[sorted.length - 1].id === currentItemId;
    if (isLast) {
      const priorSum = equalShare * (sorted.length - 1);
      return Math.round((orderShippingFee - priorSum) * 100) / 100;
    }
    return equalShare;
  }

  // Calculate prior shares for all items up to the last
  let allocatedPriorSum = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    const item = sorted[i];
    const share = Math.round((orderShippingFee * (item.eligibleValue / totalValue)) * 100) / 100;
    if (item.id === currentItemId) {
      return share;
    }
    allocatedPriorSum = Math.round((allocatedPriorSum + share) * 100) / 100;
  }

  // Last item absorbs remainder
  const lastItem = sorted[sorted.length - 1];
  if (lastItem.id === currentItemId) {
    return Math.max(0, Math.round((orderShippingFee - allocatedPriorSum) * 100) / 100);
  }

  return 0;
}

/**
 * Validates that cumulative shipping fee refunds never exceed the original Order.shippingFee.
 */
export function validateShippingRefundCeiling(params: {
  orderShippingFee: number;
  confirmedShippingRefunds: number;
  requestedShippingRefund: number;
}): { allowed: boolean; remainingShippingCap: number } {
  const { orderShippingFee, confirmedShippingRefunds, requestedShippingRefund } = params;
  const remainingShippingCap = Math.max(
    0,
    Math.round((orderShippingFee - confirmedShippingRefunds) * 100) / 100
  );

  if (requestedShippingRefund > remainingShippingCap) {
    throw new Error(
      `SHIPPING_CEILING_EXCEEDED: Requested shipping refund ₹${requestedShippingRefund} exceeds remaining shipping fee cap of ₹${remainingShippingCap}`
    );
  }

  return { allowed: true, remainingShippingCap };
}

