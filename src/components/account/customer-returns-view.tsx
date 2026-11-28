'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Check, ExternalLink, Package, RefreshCw, RotateCcw, Search, X } from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { getCourierTrackingUrl } from '@/lib/courier-tracking';
import { CometSpinner } from '@/components/ui/loading-spinner';
import { EMPTY_PAYOUT, PayoutDetailsFields, checkPayoutForm, type PayoutFormValue } from '@/components/orders/payout-details-fields';

interface RefundTx {
  id: string;
  status: string;
  mode: string;
  amount: number;
  gatewayReference?: string | null;
  processedAt?: string | null;
  createdAt?: string;
}

interface ReturnItem {
  id: string;
  orderId: string;
  orderNumber: string;
  orderItemId: string;
  type: 'RETURN_REFUND' | 'REPLACEMENT';
  status: string;
  reason: string;
  detailedReason?: string | null;
  customerNotes?: string | null;
  requestedQuantity: number;
  reverseTrackingNumber?: string | null;
  reverseCourierPartner?: string | null;
  pickedUpAt?: string | null;
  receivedAtWarehouseAt?: string | null;
  replacementCourierPartner?: string | null;
  replacementTrackingNumber?: string | null;
  replacementDispatchedAt?: string | null;
  replacementDeliveredAt?: string | null;
  qcPassed?: boolean | null;
  qcCompletedAt?: string | null;
  qcFailedReason?: string | null;
  rejectedAt?: string | null;
  isDisputed?: boolean;
  createdAt: string;
  updatedAt: string;
  item: {
    title: string;
    brand: string;
    size: string;
    color: string;
    unitPrice: number;
    totalPrice: number;
    image: string | null;
  };
  vendor: {
    storeName: string;
    storeSlug?: string;
  };
  refunds: RefundTx[];
  paymentMethod?: string;
  /** Cash on Delivery: where the refund goes (masked). */
  payoutDetails?: { method: string; summary: string; erased: boolean } | null;
  canEditPayoutDetails?: boolean;
}

const REASONS: Record<string, string> = {
  DAMAGED_ON_ARRIVAL: 'Arrived damaged',
  DEFECTIVE: 'Defective or not working',
  WRONG_ITEM: 'Wrong item or variant',
  SIZE_FIT_ISSUE: "Size or fit isn't right",
  NOT_AS_DESCRIBED: "Doesn't match the description or photos",
  QUALITY_NOT_EXPECTED: 'Quality not as expected',
  BUYER_REMORSE: 'Changed my mind',
};

const formatDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

/** Status label, its colour, and a sentence on what happens next. */
function describe(ret: ReturnItem, refunded: boolean): { label: string; tone: string; next: string } {
  const refund = ret.type === 'RETURN_REFUND';
  const why = ret.qcFailedReason ? `: ${ret.qcFailedReason.replace(/[.\s]+$/, '')}.` : '.';
  switch (ret.status) {
    case 'REQUESTED':
      return { label: 'Requested', tone: 'bg-amber-50 text-amber-800', next: 'The seller is reviewing your request. This page updates when they respond.' };
    case 'APPROVED':
      return { label: 'Approved', tone: 'bg-sky-50 text-sky-800', next: 'A courier will pick up the item. Keep it packed with its tags and accessories.' };
    case 'PICKED_UP':
      return { label: 'Picked up', tone: 'bg-sky-50 text-sky-800', next: 'The item is on its way back to the seller.' };
    case 'RECEIVED_AT_WH':
      return { label: 'Being checked', tone: 'bg-sky-50 text-sky-800', next: 'The item has reached the seller and is being checked.' };
    case 'QC_PASSED':
      return refunded
        ? { label: 'Refund sent', tone: 'bg-emerald-50 text-emerald-800', next: 'Your refund has been sent.' }
        : {
            label: 'Check passed',
            tone: 'bg-emerald-50 text-emerald-800',
            next: refund ? 'The item passed the check. Your refund is being processed.' : 'The item passed the check. Your replacement will be sent soon.',
          };
    case 'QC_FAILED':
      return {
        label: "Didn't pass the check",
        tone: 'bg-rose-50 text-rose-800',
        next: `The seller says the item didn't pass the check${why} If you disagree, raise a dispute from Your orders.`,
      };
    case 'QC_DISPUTED':
      return { label: 'Under review', tone: 'bg-amber-50 text-amber-800', next: 'You disputed the check result. Vyntra is reviewing it and will update you here.' };
    case 'REFUND_OFFERED':
      return {
        label: 'Refund offered',
        tone: 'bg-amber-50 text-amber-800',
        next: "A replacement isn't available, so you've been offered a refund instead. Accept it from Your orders.",
      };
    case 'COMPLETED':
      return {
        label: refund || refunded ? 'Refunded' : 'Replaced',
        tone: 'bg-emerald-50 text-emerald-800',
        next: refund || refunded ? 'Your refund has been sent.' : 'Your replacement has been delivered.',
      };
    case 'REJECTED':
      return { label: 'Declined', tone: 'bg-rose-50 text-rose-800', next: `This request was declined${why}` };
    case 'CANCELLED':
      return { label: 'Cancelled', tone: 'bg-[#F0F2F2] text-[#0F1111]', next: 'This request was cancelled.' };
    default:
      return { label: ret.status.replace(/_/g, ' ').toLowerCase(), tone: 'bg-[#F0F2F2] text-[#0F1111]', next: '' };
  }
}

const FILTERS = [
  { id: 'ALL', label: 'All' },
  { id: 'IN_PROGRESS', label: 'In progress' },
  { id: 'RETURN_REFUND', label: 'Refunds' },
  { id: 'REPLACEMENT', label: 'Replacements' },
  { id: 'COMPLETED', label: 'Completed' },
];
const CLOSED = ['COMPLETED', 'REJECTED', 'CANCELLED'];

export function CustomerReturnsView() {
  const [returns, setReturns] = useState<ReturnItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchReturns = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/returns?limit=50');
      const json = await res.json();
      if (res.ok && json.success && json.data) setReturns(json.data.returns || []);
      else setError(json.error?.message || 'Could not load your returns.');
    } catch {
      setError('Could not load your returns. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  const filtered = returns.filter((r) => {
    if (filterType === 'RETURN_REFUND' && r.type !== 'RETURN_REFUND') return false;
    if (filterType === 'REPLACEMENT' && r.type !== 'REPLACEMENT') return false;
    if (filterType === 'IN_PROGRESS' && CLOSED.includes(r.status)) return false;
    if (filterType === 'COMPLETED' && r.status !== 'COMPLETED') return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return [r.orderNumber, r.item.title, r.vendor.storeName, r.reverseTrackingNumber || ''].some((v) => v.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1111]">Returns and refunds</h1>
          <p className="mt-1 max-w-2xl text-sm text-[#565959]">
            Track each return from pickup to refund or replacement. To start a new return, go to{' '}
            <Link href="/account?tab=orders" className="text-[#007185] hover:underline">
              Your orders
            </Link>
            .
          </p>
        </div>
        <button
          type="button"
          onClick={fetchReturns}
          disabled={isLoading}
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-[#D5D9D9] bg-white px-4 py-2 text-sm font-semibold text-[#0F1111] hover:bg-[#F7F8F8] disabled:opacity-60 sm:self-auto"
        >
          {isLoading ? <CometSpinner className="h-4 w-4 text-current" decorative /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
          Refresh
        </button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Filter returns">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filterType === f.id}
              onClick={() => setFilterType(f.id)}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium ${
                filterType === f.id ? 'bg-[#0F1111] text-white' : 'border border-[#D5D9D9] bg-white text-[#0F1111] hover:bg-[#F7F8F8]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#565959]" aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by order number or item"
            aria-label="Search returns"
            className="w-full rounded-full border border-[#D5D9D9] bg-white py-2 pl-9 pr-3 text-sm focus:border-[#007185] focus:outline-none focus:ring-1 focus:ring-[#007185]"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[#D5D9D9] bg-white py-16" aria-live="polite">
          <CometSpinner className="h-12 w-12" decorative />
          <p className="text-sm text-[#565959]">Loading your returns…</p>
        </div>
      ) : error ? (
        <div role="alert" className="space-y-3 rounded-xl border border-rose-200 bg-white p-8 text-center">
          <p className="text-sm font-semibold text-rose-800">{error}</p>
          <button type="button" onClick={fetchReturns} className="rounded-full border border-[#D5D9D9] bg-white px-4 py-2 text-sm font-semibold text-[#0F1111] hover:bg-[#F7F8F8]">
            Try again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="space-y-3 rounded-xl border border-dashed border-[#D5D9D9] bg-white p-10 text-center">
          <RotateCcw className="mx-auto h-8 w-8 text-[#8A8F8F]" aria-hidden="true" />
          <h2 className="text-base font-semibold text-[#0F1111]">
            {returns.length === 0 ? 'No returns yet' : 'No returns match'}
          </h2>
          <p className="mx-auto max-w-md text-sm text-[#565959]">
            {returns.length === 0
              ? 'Delivered items can be returned or replaced within the return window from Your orders.'
              : 'Try another filter or search.'}
          </p>
          {returns.length === 0 && (
            <Link href="/account?tab=orders" className="inline-flex rounded-full border border-[#FCD200] bg-[#FFD814] px-4 py-2 text-sm font-semibold text-[#0F1111] hover:bg-[#F7CA00]">
              Go to Your orders
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-4" role="list">
          {filtered.map((ret) => (
            <li key={ret.id}>
              <ReturnCard ret={ret} onPayoutSaved={fetchReturns} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReturnCard({ ret, onPayoutSaved }: { ret: ReturnItem; onPayoutSaved: () => void }) {
  const isRefund = ret.type === 'RETURN_REFUND';
  const sent = ret.refunds.find((r) => r.status === 'CONFIRMED');
  const pending = ret.refunds.find((r) => ['INITIATED', 'GATEWAY_PENDING', 'RECONCILIATION_REQUIRED'].includes(r.status));
  const status = describe(ret, Boolean(sent));
  const failed = ['QC_FAILED', 'REJECTED', 'CANCELLED'].includes(ret.status);
  const showRefund = isRefund || ret.status === 'REFUND_OFFERED' || Boolean(sent || pending);
  const pickupUrl = getCourierTrackingUrl(ret.reverseCourierPartner, ret.reverseTrackingNumber);
  const replacementUrl = getCourierTrackingUrl(ret.replacementCourierPartner, ret.replacementTrackingNumber);

  // Five steps; the last is the refund or the replacement.
  const done = [
    true,
    Boolean(ret.pickedUpAt) || ['PICKED_UP', 'RECEIVED_AT_WH', 'QC_PASSED', 'QC_FAILED', 'QC_DISPUTED', 'REFUND_OFFERED', 'COMPLETED'].includes(ret.status),
    Boolean(ret.receivedAtWarehouseAt) || ['RECEIVED_AT_WH', 'QC_PASSED', 'QC_FAILED', 'QC_DISPUTED', 'REFUND_OFFERED', 'COMPLETED'].includes(ret.status),
    ret.qcPassed === true || ['QC_PASSED', 'REFUND_OFFERED', 'COMPLETED'].includes(ret.status),
    Boolean(sent) || ret.status === 'COMPLETED' || Boolean(ret.replacementDispatchedAt),
  ];
  const steps = [
    { label: 'Requested', date: formatDate(ret.createdAt) },
    { label: 'Picked up', date: formatDate(ret.pickedUpAt) },
    { label: 'Back with seller', date: formatDate(ret.receivedAtWarehouseAt) },
    { label: ret.status === 'QC_FAILED' ? "Didn't pass check" : 'Checked', date: formatDate(ret.qcCompletedAt) },
    { label: isRefund || sent ? 'Refund sent' : 'Replacement sent', date: formatDate(sent?.processedAt || ret.replacementDispatchedAt) },
  ];
  const current = done.lastIndexOf(true);

  return (
    <article className="overflow-hidden rounded-xl border border-[#D5D9D9] bg-white">
      {/* Item and status */}
      <div className="flex gap-4 p-4 sm:p-5">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-[#EAEDED] bg-[#F7F8F8]">
          {ret.item.image ? (
            <Image src={ret.item.image} alt="" fill className="object-contain p-1" />
          ) : (
            <Package className="absolute inset-0 m-auto h-7 w-7 text-[#8A8F8F]" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="text-sm font-semibold leading-snug text-[#0F1111]">{ret.item.title}</h2>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.tone}`}>{status.label}</span>
          </div>
          <p className="text-sm text-[#565959]">
            {isRefund ? 'Return for refund' : 'Replacement'} · Qty {ret.requestedQuantity}
            {ret.item.size && !['N/A', 'Standard'].includes(ret.item.size) ? ` · Size ${ret.item.size}` : ''}
            {ret.item.color && ret.item.color !== 'N/A' ? ` · ${ret.item.color}` : ''}
          </p>
          <p className="text-xs text-[#565959]">
            Order{' '}
            <Link href="/account?tab=orders" className="text-[#007185] hover:underline">
              #{ret.orderNumber}
            </Link>{' '}
            · Requested {formatDate(ret.createdAt)} · Sold by {ret.vendor.storeName}
          </p>
        </div>
      </div>

      {/* What happens next */}
      {status.next && (
        <p className={`border-t border-[#EAEDED] px-4 py-3 text-sm sm:px-5 ${failed ? 'text-rose-800' : 'text-[#0F1111]'}`}>{status.next}</p>
      )}

      {/* Steps */}
      {!['REJECTED', 'CANCELLED'].includes(ret.status) && (
        <ol className="grid grid-cols-1 gap-2 border-t border-[#EAEDED] px-4 py-4 sm:grid-cols-5 sm:gap-0 sm:px-5" aria-label="Return progress">
          {steps.map((step, i) => {
            const isDone = done[i] && !(i === 3 && ret.status === 'QC_FAILED');
            const isFail = i === 3 && ret.status === 'QC_FAILED';
            return (
              <li key={step.label} className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-2" aria-current={i === current ? 'step' : undefined}>
                <div className="flex w-full items-center sm:pr-2">
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                      isFail ? 'bg-rose-600 text-white' : isDone ? 'bg-[#067D62] text-white' : 'border border-[#D5D9D9] bg-white text-[#565959]'
                    }`}
                  >
                    {isFail ? <X className="h-3.5 w-3.5" aria-hidden="true" /> : isDone ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
                  </span>
                  {i < steps.length - 1 && (
                    <span className={`ml-2 hidden h-0.5 flex-1 sm:block ${done[i + 1] ? 'bg-[#067D62]' : 'bg-[#E3E6E6]'}`} aria-hidden="true" />
                  )}
                </div>
                <div className="text-sm">
                  <p className={isDone || isFail ? 'font-medium text-[#0F1111]' : 'text-[#565959]'}>{step.label}</p>
                  {step.date && (isDone || isFail) && <p className="text-xs text-[#565959]">{step.date}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* Details: why, pickup, refund / replacement */}
      <dl className="grid gap-x-6 gap-y-3 border-t border-[#EAEDED] px-4 py-4 text-sm sm:grid-cols-2 sm:px-5">
        <div>
          <dt className="text-xs text-[#565959]">Reason</dt>
          <dd className="text-[#0F1111]">
            {REASONS[ret.reason] || ret.reason}
            {ret.detailedReason && <span className="block text-[#565959]">&ldquo;{ret.detailedReason}&rdquo;</span>}
          </dd>
        </div>

        {(ret.reverseTrackingNumber || ret.reverseCourierPartner) && (
          <div>
            <dt className="text-xs text-[#565959]">Pickup</dt>
            <dd className="text-[#0F1111]">
              {ret.reverseCourierPartner || 'Courier'}
              {ret.reverseTrackingNumber && <span className="tabular-nums"> · {ret.reverseTrackingNumber}</span>}
              {pickupUrl && (
                <a href={pickupUrl} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-0.5 text-[#007185] hover:underline">
                  Track <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              )}
            </dd>
          </div>
        )}

        {showRefund && (
          <div>
            <dt className="text-xs text-[#565959]">Refund</dt>
            <dd className="text-[#0F1111]">
              {sent ? (
                <>
                  <strong>{formatINR(sent.amount)}</strong> sent {formatDate(sent.processedAt)}
                  {' to '}
                  {sent.mode === 'MANUAL_BANK_TRANSFER'
                    ? ret.payoutDetails && !ret.payoutDetails.erased
                      ? ret.payoutDetails.summary
                      : 'the bank account or UPI ID you gave'
                    : 'your original payment method'}
                  {sent.mode === 'MANUAL_BANK_TRANSFER' && sent.gatewayReference && (
                    <span className="block text-[#565959]">
                      Bank reference (UTR) <span className="tabular-nums text-[#0F1111]">{sent.gatewayReference}</span>
                    </span>
                  )}
                  {sent.mode !== 'MANUAL_BANK_TRANSFER' && (
                    <span className="block text-[#565959]">Banks usually show it within 5–7 working days.</span>
                  )}
                </>
              ) : pending ? (
                <>
                  <strong>{formatINR(pending.amount)}</strong> is being processed.
                </>
              ) : failed ? (
                <span className="text-[#565959]">No refund for this request.</span>
              ) : (
                <span className="text-[#565959]">The amount is confirmed after the item passes the check.</span>
              )}
            </dd>
          </div>
        )}

        {!isRefund && ret.status !== 'REFUND_OFFERED' && !failed && (
          <div>
            <dt className="text-xs text-[#565959]">Replacement</dt>
            <dd className="text-[#0F1111]">
              {ret.replacementTrackingNumber ? (
                <>
                  Sent with {ret.replacementCourierPartner || 'courier'}
                  <span className="tabular-nums"> · {ret.replacementTrackingNumber}</span>
                  {replacementUrl && (
                    <a href={replacementUrl} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-0.5 text-[#007185] hover:underline">
                      Track <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  )}
                </>
              ) : (
                <span className="text-[#565959]">Sent after the returned item passes the check.</span>
              )}
            </dd>
          </div>
        )}

        {ret.customerNotes && (
          <div>
            <dt className="text-xs text-[#565959]">Your notes</dt>
            <dd className="text-[#0F1111]">{ret.customerNotes}</dd>
          </div>
        )}
      </dl>

      {/* Cash on Delivery: where the refund goes */}
      {(ret.canEditPayoutDetails || (ret.payoutDetails && !sent)) && <RefundPayoutBox ret={ret} onSaved={onPayoutSaved} />}
    </article>
  );
}

/** Where a Cash on Delivery refund goes: shown masked, with a form to add or change it while the return is open. */
function RefundPayoutBox({ ret, onSaved }: { ret: ReturnItem; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<PayoutFormValue>(EMPTY_PAYOUT);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const details = ret.payoutDetails;
  const missing = !details && ret.canEditPayoutDetails;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const check = checkPayoutForm(value);
    if ('error' in check) {
      setMessage(check.error);
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/returns/${ret.id}/payout-details`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(check.body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || 'Could not save your refund details.');
      setEditing(false);
      setValue(EMPTY_PAYOUT);
      onSaved();
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`border-t border-[#EAEDED] px-4 py-4 sm:px-5 ${missing ? 'bg-amber-50' : 'bg-[#F7F8F8]'}`}>
      {!editing ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            <p className="font-semibold text-[#0F1111]">{missing ? 'Tell us where to send your refund' : 'Refund goes to'}</p>
            <p className="text-[#565959]">
              {missing
                ? 'You paid cash on delivery, so we need a UPI ID or bank account to send the money back.'
                : details?.erased
                ? 'Your refund was sent, so we have deleted these bank details.'
                : details?.summary}
            </p>
          </div>
          {ret.canEditPayoutDetails && (
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setMessage(null);
              }}
              className={
                missing
                  ? 'inline-flex items-center rounded-full border border-[#FCD200] bg-[#FFD814] px-4 py-2 text-sm font-semibold text-[#0F1111] hover:bg-[#F7CA00]'
                  : 'inline-flex items-center rounded-full border border-[#D5D9D9] bg-white px-4 py-2 text-sm font-semibold text-[#0F1111] hover:bg-[#F7F8F8]'
              }
            >
              {missing ? 'Add refund details' : 'Change'}
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={save} className="space-y-3">
          <PayoutDetailsFields value={value} onChange={setValue} idPrefix={`payout-${ret.id}`} />
          {message && (
            <p role="alert" className="text-sm text-[#B12704]">
              {message}
            </p>
          )}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#FCD200] bg-[#FFD814] px-4 py-2 text-sm font-semibold text-[#0F1111] hover:bg-[#F7CA00] disabled:opacity-60"
            >
              {saving && <CometSpinner className="h-4 w-4 text-current" decorative />}
              Save refund details
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-full border border-[#D5D9D9] bg-white px-4 py-2 text-sm font-semibold text-[#0F1111] hover:bg-[#F7F8F8]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
