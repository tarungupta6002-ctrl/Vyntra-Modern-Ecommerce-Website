'use client';

/* eslint-disable @next/next/no-img-element -- product images come from vendor-controlled hosts */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Home,
  Info,
  Package,
  RefreshCw,
  RotateCcw,
  X,
} from 'lucide-react';
import { formatINR } from '@/lib/utils';

/**
 * Customer order cancellation.
 *
 * Everything shown here comes from the server: the whole order is cancelled (the API does not
 * support cancelling single items), online payments are refunded automatically to the original
 * payment method, and cash-on-delivery orders have nothing to refund.
 */

interface OrderCancellationViewProps {
  orderId?: string;
}

interface ApiOrderItem {
  id: string;
  title: string;
  quantity: number;
  totalPrice: number;
  image?: string | null;
  vendorName?: string | null;
  selectedSize?: string | null;
  selectedColor?: string | null;
}

interface ApiOrder {
  id: string;
  orderNumber: string;
  status: string; // PENDING | CONFIRMED | PROCESSING | SHIPPED | OUT_FOR_DELIVERY | DELIVERED | CANCELLED | RETURNED
  paymentStatus: string; // PENDING | PAID | FAILED | REFUNDED | PARTIALLY_REFUNDED
  paymentMethod: string; // COD | UPI | CARD | NETBANKING
  subtotal: number;
  discount: number;
  shippingFee: number;
  tax: number;
  totalAmount: number;
  refundedAmount: number;
  createdAt: string;
  cancellationRefund: { status: string; amount: number; reference: string | null } | null;
  items: ApiOrderItem[];
}

interface CancelRefund {
  state: 'INITIATED' | 'PROCESSING' | 'NONE';
  amount: number | null;
  reference: string | null;
}

const CANCELLABLE = new Set(['PENDING', 'CONFIRMED', 'PROCESSING']);

const REASONS = [
  { title: 'Delivery date too late', desc: 'I need it sooner than the expected delivery.' },
  { title: 'Ordered by mistake', desc: 'Duplicate purchase or changed my mind.' },
  { title: 'Incorrect size or colour', desc: 'I picked the wrong variant at checkout.' },
  { title: 'Found a better price elsewhere', desc: 'Price dropped or I found another offer.' },
  { title: 'Other', desc: 'Tell us more in the remarks below.' },
];

function paymentMethodLabel(method: string): string {
  return ({ UPI: 'UPI', CARD: 'card', NETBANKING: 'net banking', COD: 'Cash on Delivery' } as Record<string, string>)[method] || method;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** What the customer will get back if they cancel now. */
function refundPreview(o: ApiOrder): { amount: number; message: string } {
  const paidOnline = o.paymentMethod !== 'COD' && (o.paymentStatus === 'PAID' || o.paymentStatus === 'PARTIALLY_REFUNDED');
  if (paidOnline) {
    const amount = Math.max(0, Math.round((o.totalAmount - (o.refundedAmount || 0)) * 100) / 100);
    return {
      amount,
      message: `Refunded automatically to your original ${paymentMethodLabel(o.paymentMethod)} payment. It usually reaches your account within 5–7 business days.`,
    };
  }
  if (o.paymentMethod === 'COD') {
    return { amount: 0, message: 'This is a Cash on Delivery order, so no payment has been collected and there is nothing to refund.' };
  }
  return { amount: 0, message: 'No payment was completed for this order, so there is nothing to refund.' };
}

export function OrderCancellationView({ orderId = '' }: OrderCancellationViewProps) {
  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [reason, setReason] = useState<string>(REASONS[0].title);
  const [remarks, setRemarks] = useState<string>('');

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<{ refund: CancelRefund } | null>(null);

  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`);
        const json = await res.json();
        if (!alive) return;
        if (json.success && json.data) setOrder(json.data);
        else setLoadError(json.error?.message || 'You are not authorized to view or cancel this order.');
      } catch {
        if (alive) setLoadError('Could not load this order. Please check your connection and try again.');
      }
    })();
    return () => {
      alive = false;
    };
  }, [orderId]);

  const closeConfirm = useCallback(() => {
    if (!submitting) setConfirmOpen(false);
  }, [submitting]);

  useEffect(() => {
    if (!confirmOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    confirmBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeConfirm();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [confirmOpen, closeConfirm]);

  const handleCancel = async () => {
    if (!order || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const fullReason = remarks.trim() ? `${reason}: ${remarks.trim()}` : reason;
      const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: fullReason.slice(0, 300) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'We could not cancel this order. Please try again.');
      }
      setResult({ refund: json.data?.refund || { state: 'NONE', amount: 0, reference: null } });
      setConfirmOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setSubmitError(err?.message || 'We could not cancel this order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------------------- loading / errors ---------------------------- */

  if (loadError) {
    return (
      <Shell orderNumber={orderId}>
        <Card>
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-[#B12704] shrink-0 mt-0.5" />
            <div>
              <h1 className="text-lg font-bold text-[#0F1111]">We couldn&apos;t open this order</h1>
              <p className="mt-1 text-sm text-[#565959]">{loadError}</p>
              <Link href="/account?tab=orders" className="inline-block mt-4 text-sm font-bold text-[#007185] hover:underline">
                Go to Your Orders
              </Link>
            </div>
          </div>
        </Card>
      </Shell>
    );
  }

  if (!order) {
    return (
      <Shell orderNumber={orderId}>
        <Card>
          <div className="flex items-center gap-3 text-sm text-[#565959]" role="status">
            <RefreshCw className="h-4 w-4 animate-spin" /> Loading your order…
          </div>
        </Card>
      </Shell>
    );
  }

  /* --------------------------- cancelled just now --------------------------- */

  if (result) {
    return (
      <Shell orderNumber={order.orderNumber}>
        <Card>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 text-[#067D62] shrink-0" />
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-[#0F1111]">Order cancelled</h1>
              <p className="mt-1 text-sm text-[#565959]">
                Order <strong className="text-[#0F1111]">#{order.orderNumber}</strong> has been cancelled. We&apos;ve
                sent a confirmation to your email.
              </p>
            </div>
          </div>
          <RefundStatusBox
            state={result.refund.state}
            amount={result.refund.amount}
            reference={result.refund.reference}
            paymentMethod={order.paymentMethod}
          />
          <DoneActions />
        </Card>
      </Shell>
    );
  }

  const status = order.status.toUpperCase();

  /* ------------------------------ already cancelled ------------------------------ */

  if (status === 'CANCELLED') {
    const r = order.cancellationRefund;
    const state: CancelRefund['state'] = r
      ? r.status === 'GATEWAY_PENDING' || r.status === 'CONFIRMED'
        ? 'INITIATED'
        : 'PROCESSING'
      : order.paymentMethod !== 'COD' && (order.paymentStatus === 'PAID' || order.paymentStatus === 'PARTIALLY_REFUNDED')
      ? 'PROCESSING'
      : 'NONE';
    return (
      <Shell orderNumber={order.orderNumber}>
        <Card>
          <h1 className="text-xl font-bold text-[#0F1111]">This order is already cancelled</h1>
          <p className="mt-1 text-sm text-[#565959]">Order #{order.orderNumber}, placed {formatDate(order.createdAt)}.</p>
          <RefundStatusBox
            state={state}
            amount={r ? r.amount : null}
            reference={r?.reference ?? null}
            paymentMethod={order.paymentMethod}
            completed={r?.status === 'CONFIRMED'}
          />
          <DoneActions />
        </Card>
      </Shell>
    );
  }

  /* ------------------------------ can't cancel ------------------------------ */

  if (!CANCELLABLE.has(status)) {
    const delivered = status === 'DELIVERED';
    return (
      <Shell orderNumber={order.orderNumber}>
        <Card>
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-[#007185] shrink-0 mt-0.5" />
            <div>
              <h1 className="text-xl font-bold text-[#0F1111]">This order can no longer be cancelled</h1>
              <p className="mt-1 text-sm text-[#565959]">
                {delivered
                  ? 'This order has been delivered. If something isn’t right, you can request a return for eligible items from Your Orders.'
                  : status === 'RETURNED'
                  ? 'This order has been returned.'
                  : 'This order has already shipped. You can refuse the delivery, or request a return after it arrives.'}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/account?tab=orders"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] px-5 py-2 text-sm font-bold text-[#0F1111]"
                >
                  {delivered ? <RotateCcw className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                  Go to Your Orders
                </Link>
                <Link href="/support" className="inline-flex items-center rounded-full border border-[#D5D9D9] px-5 py-2 text-sm font-semibold text-[#0F1111] hover:bg-[#F7F8F8]">
                  Contact Customer Service
                </Link>
              </div>
            </div>
          </div>
        </Card>
      </Shell>
    );
  }

  /* ------------------------------ cancel form ------------------------------ */

  const preview = refundPreview(order);
  const itemCount = order.items.reduce((n, it) => n + (it.quantity || 1), 0);

  return (
    <Shell orderNumber={order.orderNumber}>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-[#0F1111]">Cancel order</h1>
        <p className="mt-1 text-sm text-[#565959]">
          Order <strong className="text-[#0F1111]">#{order.orderNumber}</strong> · Placed {formatDate(order.createdAt)}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-6">
          <Card>
            <h2 className="text-base font-bold text-[#0F1111]">Items in this order ({itemCount})</h2>
            <p className="mt-1 text-xs text-[#565959]">The whole order is cancelled. Individual items can&apos;t be cancelled separately.</p>
            <ul className="mt-4 divide-y divide-[#E3E6E6]">
              {order.items.map((it) => (
                <li key={it.id} className="flex gap-4 py-3">
                  <div className="h-16 w-16 shrink-0 rounded-md border border-[#D5D9D9] bg-[#F7F8F8] overflow-hidden flex items-center justify-center">
                    {it.image ? (
                      <img src={it.image} alt="" className="h-full w-full object-contain" loading="lazy" />
                    ) : (
                      <Package className="h-5 w-5 text-[#565959]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[#0F1111] line-clamp-2">{it.title}</p>
                    <p className="mt-0.5 text-xs text-[#565959]">
                      Qty {it.quantity}
                      {it.selectedSize ? ` · Size ${it.selectedSize}` : ''}
                      {it.selectedColor ? ` · ${it.selectedColor}` : ''}
                      {it.vendorName ? ` · Sold by ${it.vendorName}` : ''}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-[#0F1111] whitespace-nowrap">{formatINR(it.totalPrice)}</p>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <fieldset>
              <legend className="text-base font-bold text-[#0F1111]">Why are you cancelling?</legend>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {REASONS.map((r) => {
                  const checked = reason === r.title;
                  return (
                    <label
                      key={r.title}
                      className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                        checked ? 'border-[#007185] bg-[#EDF7F8]' : 'border-[#D5D9D9] bg-white hover:bg-[#F7F8F8]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="cancel_reason"
                        checked={checked}
                        onChange={() => setReason(r.title)}
                        className="mt-0.5 accent-[#007185]"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-[#0F1111]">{r.title}</span>
                        <span className="block text-xs text-[#565959]">{r.desc}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <label htmlFor="cancel-remarks" className="mt-4 block text-sm font-semibold text-[#0F1111]">
              Anything else? <span className="font-normal text-[#565959]">(optional)</span>
            </label>
            <textarea
              id="cancel-remarks"
              rows={2}
              maxLength={250}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#D5D9D9] bg-white p-3 text-sm text-[#0F1111] focus:border-[#007185] focus:outline-none"
            />
          </Card>
        </div>

        <aside className="lg:col-span-5 lg:sticky lg:top-28">
          <Card>
            <h2 className="text-base font-bold text-[#0F1111]">Refund summary</h2>
            <dl className="mt-3 space-y-1.5 text-sm">
              <Row label="Items" value={formatINR(order.subtotal)} />
              {order.discount > 0 && <Row label="Discount" value={`−${formatINR(order.discount)}`} />}
              <Row label="Shipping & fees" value={order.shippingFee > 0 ? formatINR(order.shippingFee) : 'FREE'} />
              {order.tax > 0 && <Row label="Tax" value={formatINR(order.tax)} />}
              <Row label="Order total" value={formatINR(order.totalAmount)} strong />
              {order.refundedAmount > 0 && <Row label="Already refunded" value={`−${formatINR(order.refundedAmount)}`} />}
            </dl>
            <div className="mt-4 rounded-xl border border-[#D5D9D9] bg-[#F7F8F8] p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-bold text-[#0F1111]">You&apos;ll get back</span>
                <span className="text-xl font-bold text-[#0F1111]">{formatINR(preview.amount)}</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-[#565959]">{preview.message}</p>
            </div>

            <button
              type="button"
              onClick={() => {
                setSubmitError(null);
                setConfirmOpen(true);
              }}
              className="mt-5 w-full rounded-full bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] py-2.5 text-sm font-bold text-[#0F1111] shadow-sm"
            >
              Cancel this order
            </button>
            <Link href="/account?tab=orders" className="mt-2 block text-center text-sm text-[#007185] hover:underline">
              Keep my order
            </Link>
          </Card>
        </aside>
      </div>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
          onMouseDown={(e) => e.target === e.currentTarget && closeConfirm()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-confirm-title"
            className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white p-6 shadow-2xl"
          >
            <button
              type="button"
              onClick={closeConfirm}
              aria-label="Close"
              disabled={submitting}
              className="absolute right-3 top-3 p-1 rounded text-[#565959] hover:text-[#0F1111] disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
            <h2 id="cancel-confirm-title" className="text-lg font-bold text-[#0F1111]">
              Cancel order #{order.orderNumber}?
            </h2>
            <p className="mt-2 text-sm text-[#565959]">
              All {itemCount} {itemCount === 1 ? 'item' : 'items'} will be cancelled. This can&apos;t be undone.
            </p>
            <div className="mt-4 rounded-xl bg-[#F7F8F8] border border-[#D5D9D9] p-3 text-sm">
              <div className="flex justify-between font-bold text-[#0F1111]">
                <span>Refund</span>
                <span>{formatINR(preview.amount)}</span>
              </div>
              <p className="mt-1 text-xs text-[#565959]">{preview.message}</p>
            </div>
            {submitError && (
              <p role="alert" className="mt-3 flex items-start gap-2 text-sm text-[#B12704]">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> {submitError}
              </p>
            )}
            <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2">
              <button
                type="button"
                onClick={closeConfirm}
                disabled={submitting}
                className="w-full sm:flex-1 rounded-full border border-[#D5D9D9] py-2.5 text-sm font-semibold text-[#0F1111] hover:bg-[#F7F8F8] disabled:opacity-50"
              >
                Keep my order
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                onClick={handleCancel}
                disabled={submitting}
                className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-[#B12704] hover:bg-[#8F1F03] py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Cancelling…
                  </>
                ) : (
                  'Yes, cancel order'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

/* --------------------------------- pieces --------------------------------- */

function Shell({ orderNumber, children }: { orderNumber: string; children: React.ReactNode }) {
  return (
    <div className="w-full min-h-[70vh] bg-[#F7F8F8] py-6 sm:py-8 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1.5 text-xs text-[#565959]">
          <Link href="/" className="inline-flex items-center gap-1 hover:text-[#007185]">
            <Home className="h-3.5 w-3.5" /> Home
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/account?tab=orders" className="hover:text-[#007185]">
            Your Orders
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-[#0F1111]">Cancel {orderNumber ? `#${orderNumber}` : 'order'}</span>
        </nav>
        {children}
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-2xl border border-[#D5D9D9] bg-white p-5 sm:p-6 shadow-sm">{children}</section>;
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? 'pt-1.5 border-t border-[#E3E6E6] font-bold text-[#0F1111]' : 'text-[#565959]'}`}>
      <dt>{label}</dt>
      <dd className={strong ? '' : 'text-[#0F1111]'}>{value}</dd>
    </div>
  );
}

function RefundStatusBox({
  state,
  amount,
  reference,
  paymentMethod,
  completed,
}: {
  state: CancelRefund['state'];
  amount: number | null;
  reference: string | null;
  paymentMethod: string;
  completed?: boolean;
}) {
  if (state === 'NONE') {
    return (
      <div className="mt-5 rounded-xl border border-[#D5D9D9] bg-[#F7F8F8] p-4 text-sm text-[#0F1111]">
        No payment was collected for this order, so there is nothing to refund.
      </div>
    );
  }
  if (state === 'INITIATED') {
    return (
      <div className="mt-5 rounded-xl border border-[#B7E1D4] bg-[#EEF8F4] p-4">
        <p className="text-sm font-bold text-[#0F1111]">
          {completed ? 'Refund completed' : 'Refund initiated'}
          {amount != null ? `: ${formatINR(amount)}` : ''}
        </p>
        <p className="mt-1 text-sm text-[#0F1111]">
          {completed
            ? `The refund was sent to your original ${paymentMethodLabel(paymentMethod)} payment.`
            : `On its way to your original ${paymentMethodLabel(paymentMethod)} payment. It usually reaches your account within 5–7 business days.`}
        </p>
        {reference && (
          <p className="mt-2 text-xs text-[#565959]">
            Refund reference: <span className="font-mono text-[#0F1111]">{reference}</span>. Your bank can use this to trace the refund.
          </p>
        )}
      </div>
    );
  }
  return (
    <div className="mt-5 rounded-xl border border-[#F5D98B] bg-[#FFF8E5] p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-[#0F1111]">
        <Clock className="h-4 w-4" /> Refund being processed{amount != null ? `: ${formatINR(amount)}` : ''}
      </p>
      <p className="mt-1 text-sm text-[#0F1111]">
        Our team is processing your refund to your original payment method. If you have questions,{' '}
        <Link href="/support" className="font-semibold text-[#007185] hover:underline">
          contact Customer Service
        </Link>
        .
      </p>
    </div>
  );
}

function DoneActions() {
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <Link
        href="/account?tab=orders"
        className="inline-flex items-center rounded-full bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] px-5 py-2 text-sm font-bold text-[#0F1111]"
      >
        Go to Your Orders
      </Link>
      <Link href="/" className="inline-flex items-center rounded-full border border-[#D5D9D9] px-5 py-2 text-sm font-semibold text-[#0F1111] hover:bg-[#F7F8F8]">
        Continue shopping
      </Link>
    </div>
  );
}
