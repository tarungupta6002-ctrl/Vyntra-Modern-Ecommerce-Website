/**
 * Where to send a Cash on Delivery refund: the customer's UPI ID or bank account. Collected
 * with the return (or later on the Returns page), shown in full only to admins making the
 * transfer, shown masked to the customer, never to the seller, and erased once the refund is sent.
 */

export type PayoutMethod = 'UPI' | 'BANK_ACCOUNT';

export interface PayoutDetailsInput {
  method: PayoutMethod;
  upiId?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifsc?: string;
}

export interface CleanPayoutDetails {
  method: PayoutMethod;
  upiId: string | null;
  accountHolderName: string | null;
  accountNumber: string | null;
  ifsc: string | null;
}

const UPI_RE = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,64}$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_RE = /^\d{9,18}$/;
/** Letters (Latin and Devanagari), spaces, dots, apostrophes and hyphens. */
const NAME_RE = /^[A-Za-zÀ-ɏऀ-ॿ .'-]{2,80}$/;

/** Validates what the customer typed. Returns clean details or the first problem, in plain words. */
export function validatePayoutDetails(input: unknown): { details: CleanPayoutDetails } | { error: string } {
  if (!input || typeof input !== 'object') return { error: 'Tell us where to send your refund.' };
  const raw = input as Record<string, unknown>;
  const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

  if (raw.method === 'UPI') {
    const upiId = text(raw.upiId).toLowerCase();
    if (!UPI_RE.test(upiId)) return { error: 'Enter a valid UPI ID, for example name@okhdfcbank.' };
    return { details: { method: 'UPI', upiId, accountHolderName: null, accountNumber: null, ifsc: null } };
  }

  if (raw.method === 'BANK_ACCOUNT') {
    const accountHolderName = text(raw.accountHolderName).replace(/\s+/g, ' ');
    const accountNumber = text(raw.accountNumber).replace(/\s+/g, '');
    const ifsc = text(raw.ifsc).toUpperCase();
    if (!NAME_RE.test(accountHolderName)) return { error: 'Enter the account holder name as it appears on the bank account.' };
    if (!ACCOUNT_RE.test(accountNumber)) return { error: 'Enter a valid account number (9 to 18 digits).' };
    if (!IFSC_RE.test(ifsc)) return { error: 'Enter a valid IFSC code, for example HDFC0001234.' };
    return { details: { method: 'BANK_ACCOUNT', upiId: null, accountHolderName, accountNumber, ifsc } };
  }

  return { error: 'Choose UPI or bank account for your refund.' };
}

/** What the customer sees once saved: enough to recognise it, not enough to misuse it. */
export function maskPayoutDetails(d: {
  method: string;
  upiId?: string | null;
  accountHolderName?: string | null;
  accountNumber?: string | null;
  ifsc?: string | null;
}): string {
  if (d.method === 'UPI' && d.upiId) {
    const [name, handle] = d.upiId.split('@');
    const shown = name.length <= 2 ? name[0] + '•' : name.slice(0, 2) + '•'.repeat(Math.min(6, name.length - 2));
    return `UPI ${shown}@${handle}`;
  }
  if (d.method === 'BANK_ACCOUNT' && d.accountNumber) {
    return `Bank account ending ${d.accountNumber.slice(-4)}${d.ifsc ? ` (${d.ifsc.slice(0, 4)})` : ''}`;
  }
  return 'Refund details removed';
}

/** Return statuses after which refund details can no longer change. */
const CLOSED_STATUSES = new Set(['REJECTED', 'CANCELLED', 'COMPLETED']);

/**
 * Whether this return will be refunded outside Razorpay (a Cash on Delivery order) and is still
 * open, so the customer can add or change where the money goes.
 */
export function acceptsPayoutDetails(r: { paymentMethod: string; type: string; status: string }): boolean {
  if (r.paymentMethod !== 'COD' || CLOSED_STATUSES.has(r.status)) return false;
  return r.type === 'RETURN_REFUND' || r.status === 'REFUND_OFFERED';
}
