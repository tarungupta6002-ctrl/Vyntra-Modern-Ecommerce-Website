/**
 * Vyntra Marketplace - Deterministic Order Discount Allocation
 * 
 * Implements the Last-Item Remainder Rule to allocate order-level promotions
 * across individual OrderItems with exact paise (2 decimal places) precision.
 * 
 * Invariants:
 * 1. SUM(allocatedDiscount) === Order.discount exactly (zero paise discrepancy).
 * 2. 0.00 <= allocatedDiscount <= OrderItem.totalPrice for every item.
 * 3. EffectiveItemCeiling = OrderItem.totalPrice - allocatedDiscount.
 */

export interface DiscountAllocationCandidate {
  id: string;
  totalPrice: number; // Gross undiscounted subtotal (unitPrice * quantity)
}

export interface AllocatedDiscountResult {
  id: string;
  totalPrice: number;
  allocatedDiscount: number;
  effectiveItemCeiling: number;
}

/**
 * Deterministically apportion an order-level discount across items using the
 * Last-Item Remainder Rule.
 * 
 * @param subtotal Gross order subtotal (sum of item totalPrices)
 * @param discount Gross order discount to allocate
 * @param items Array of candidates sorted deterministically by id ASC
 */
export function allocateOrderDiscount(
  subtotal: number,
  discount: number,
  items: DiscountAllocationCandidate[]
): AllocatedDiscountResult[] {
  if (items.length === 0) {
    return [];
  }

  // Assertion 1: Non-negative discount
  if (discount < 0) {
    throw new Error('INVALID_DISCOUNT: Order discount cannot be negative');
  }

  // Assertion 2: Discount cannot exceed subtotal
  if (discount > subtotal) {
    throw new Error(
      `DISCOUNT_EXCEEDS_SUBTOTAL: Order discount (₹${discount}) cannot exceed subtotal (₹${subtotal})`
    );
  }

  // Zero-discount fast path
  if (discount === 0 || subtotal === 0) {
    return items.map((it) => ({
      id: it.id,
      totalPrice: Number(it.totalPrice.toFixed(2)),
      allocatedDiscount: 0,
      effectiveItemCeiling: Number(it.totalPrice.toFixed(2)),
    }));
  }

  // Deterministically sort candidates by id ASC
  const sorted = [...items].sort((a, b) => a.id.localeCompare(b.id));
  const results: AllocatedDiscountResult[] = [];
  let allocatedSum = 0;

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    const isLast = i === sorted.length - 1;

    let itemDiscount = 0;
    if (!isLast) {
      // Standard commercial ROUND_HALF_UP proportional share
      const share = (discount * item.totalPrice) / subtotal;
      itemDiscount = Math.round(share * 100) / 100;
      allocatedSum = Math.round((allocatedSum + itemDiscount) * 100) / 100;
    } else {
      // Last-item remainder allocation ensures exact identity
      itemDiscount = Math.round((discount - allocatedSum) * 100) / 100;
    }

    // Invariant check: Discount cannot exceed item gross totalPrice
    if (itemDiscount > item.totalPrice) {
      throw new Error(
        `ITEM_DISCOUNT_OVERFLOW: Allocated discount (₹${itemDiscount}) exceeds item totalPrice (₹${item.totalPrice}) on item ${item.id}`
      );
    }
    if (itemDiscount < 0) {
      throw new Error(
        `ITEM_DISCOUNT_UNDERFLOW: Allocated discount (₹${itemDiscount}) cannot be negative on item ${item.id}`
      );
    }

    const effectiveItemCeiling = Math.round((item.totalPrice - itemDiscount) * 100) / 100;

    results.push({
      id: item.id,
      totalPrice: Number(item.totalPrice.toFixed(2)),
      allocatedDiscount: itemDiscount,
      effectiveItemCeiling,
    });
  }

  // Post-condition validation: Verify exact sum match
  const finalAllocatedSum = results.reduce((acc, r) => acc + r.allocatedDiscount, 0);
  const roundedAllocatedSum = Math.round(finalAllocatedSum * 100) / 100;
  const roundedDiscount = Math.round(discount * 100) / 100;

  if (roundedAllocatedSum !== roundedDiscount) {
    throw new Error(
      `DISCOUNT_ALLOCATION_MISMATCH: Allocated sum (₹${roundedAllocatedSum}) does not equal order discount (₹${roundedDiscount})`
    );
  }

  return results;
}
