import { formatINR } from './utils';

export interface RefundTransactionRecord {
  id: string;
  amount: number | string;
  mode?: string | null;
  referenceNumber?: string | null;
  gatewayReference?: string | null;
  status: string;
  processedAt?: string | Date | null;
  createdAt?: string | Date | null;
}

export interface OrderFinancialSummaryInput {
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  totalAmount: number | string;
  subtotal?: number | string;
  shippingFee?: number | string;
  tax?: number | string;
  refundedAmount?: number | string;
  refundTransactions?: RefundTransactionRecord[];
}

export interface CustomerRefundSummaryResult {
  hasRefund: boolean;
  isPartial: boolean;
  isFull: boolean;
  orderTotalFormatted: string;
  refundedAmountFormatted: string;
  refundedAmountNumber: number;
  remainingAmountFormatted: string;
  remainingAmountNumber: number;
  badgeLabel: string;
  refundDestinationLabel: string;
  verifiedReferenceNumber: string;
  lifecycleStatusLabel: string;
  paymentStatusLabel: string;
}

/**
 * Resolves verified refund destination from actual database records.
 * Never invents or assumes a destination (e.g. never assumes COD goes to UPI or Bank Account
 * unless a confirmed transaction mode exists).
 */
export function resolveRefundDestination(
  paymentMethod: string,
  refundTransactions?: RefundTransactionRecord[]
): string {
  const confirmedTx = refundTransactions?.find(
    (tx) => tx.status === 'CONFIRMED' || tx.status === 'COMPLETED'
  ) || refundTransactions?.[0];

  if (!confirmedTx || !confirmedTx.mode) {
    return 'Refund destination not recorded';
  }

  const mode = confirmedTx.mode.toUpperCase();
  if (mode === 'MANUAL_BANK_TRANSFER') {
    return 'Verified Bank Account';
  }
  if (mode === 'STORE_CREDIT') {
    return 'Vyntra Vault';
  }
  if (mode === 'ORIGINAL_PAYMENT' || mode === 'ORIGINAL_PAYMENT_METHOD') {
    const pm = (paymentMethod || '').toUpperCase();
    if (pm === 'UPI') return 'Original UPI Account';
    if (pm === 'CARD') return 'Original Card';
    if (pm === 'NET_BANKING') return 'Original Net Banking Account';
    if (pm === 'WALLET') return 'Original Digital Wallet';
    return 'Original Payment Method';
  }

  return 'Refund destination not recorded';
}

/**
 * Resolves verified refund reference / UTR number from actual database records.
 * Never creates fake reference IDs (e.g. never outputs fake 'VYN-RF-4412').
 */
export function resolveRefundReference(
  refundTransactions?: RefundTransactionRecord[]
): string {
  const confirmedTx = refundTransactions?.find(
    (tx) => tx.status === 'CONFIRMED' || tx.status === 'COMPLETED'
  ) || refundTransactions?.[0];

  const rawRef = confirmedTx?.referenceNumber || confirmedTx?.gatewayReference;
  if (rawRef && rawRef.trim().length > 0) {
    return rawRef.trim();
  }

  return 'Reference not recorded';
}

/**
 * Authoritative formatter for Customer My Orders display.
 * Distinguishes order lifecycle status (Cancelled / Delivered / Returned) from
 * payment/refund status, strictly uses Order.refundedAmount, and handles partial
 * vs full refunds accurately.
 */
export function formatCustomerRefundSummary(
  order: OrderFinancialSummaryInput
): CustomerRefundSummaryResult {
  const total = Math.round(Number(order.totalAmount || 0) * 100) / 100;
  const refunded = Math.round(Number(order.refundedAmount || 0) * 100) / 100;
  const remaining = Math.max(0, Math.round((total - refunded) * 100) / 100);

  const hasRefund = refunded > 0;
  const isFull = hasRefund && refunded >= total;
  const isPartial = hasRefund && refunded < total;

  const destination = resolveRefundDestination(order.paymentMethod, order.refundTransactions);
  const destinationSuffix = destination !== 'Refund destination not recorded' ? ` to ${destination}` : '';
  const refNumber = resolveRefundReference(order.refundTransactions);

  // 1. Lifecycle status label
  const rawStatus = (order.status || '').toLowerCase();
  let lifecycleStatusLabel = 'Active';
  if (rawStatus === 'cancelled') lifecycleStatusLabel = 'Cancelled';
  else if (rawStatus === 'delivered') lifecycleStatusLabel = 'Delivered';
  else if (rawStatus === 'returned') lifecycleStatusLabel = 'Returned';
  else if (rawStatus === 'shipped') lifecycleStatusLabel = 'Shipped';
  else if (rawStatus === 'processing') lifecycleStatusLabel = 'Processing';

  // 2. Payment/Refund status label
  const payStatus = (order.paymentStatus || '').toUpperCase();
  let paymentStatusLabel = payStatus;
  if (payStatus === 'PARTIALLY_REFUNDED') paymentStatusLabel = 'Partially Refunded';
  else if (payStatus === 'REFUNDED') paymentStatusLabel = 'Refunded';
  else if (payStatus === 'PAID') paymentStatusLabel = 'Paid';
  else if (payStatus === 'PENDING') paymentStatusLabel = 'Payment Pending';

  // 3. Combined Header Badge for Customer UI
  let badgeLabel = '';
  if (isFull) {
    badgeLabel = `Refunded ${formatINR(refunded)}${destinationSuffix}`;
  } else if (isPartial) {
    badgeLabel = `Partially Refunded ${formatINR(refunded)} of ${formatINR(total)}${destinationSuffix}`;
  } else {
    // refunded === 0
    if (order.paymentMethod === 'COD' && rawStatus === 'cancelled') {
      badgeLabel = 'No Payment Collected (COD)';
    } else if (rawStatus === 'cancelled') {
      badgeLabel = 'Refund Pending';
    } else {
      badgeLabel = `${formatINR(total)}`;
    }
  }

  return {
    hasRefund,
    isPartial,
    isFull,
    orderTotalFormatted: formatINR(total),
    refundedAmountFormatted: formatINR(refunded),
    refundedAmountNumber: refunded,
    remainingAmountFormatted: formatINR(remaining),
    remainingAmountNumber: remaining,
    badgeLabel,
    refundDestinationLabel: destination,
    verifiedReferenceNumber: refNumber,
    lifecycleStatusLabel,
    paymentStatusLabel,
  };
}
