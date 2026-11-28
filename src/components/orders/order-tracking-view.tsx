'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Copy, ExternalLink, FileText, HelpCircle, MapPin, Package, RotateCcw, Search, Truck, X } from 'lucide-react';
import { useOrderStore } from '@/store/order-store';
import { formatINR } from '@/lib/utils';
import { getCourierTrackingUrl } from '@/lib/courier-tracking';
import { CometSpinner } from '@/components/ui/loading-spinner';

interface OrderTrackingViewProps {
  orderId?: string;
  embeddedInAccount?: boolean;
}

const btn = {
  primary:
    'inline-flex items-center justify-center gap-1.5 rounded-full border border-[#FCD200] bg-[#FFD814] px-4 py-2 text-sm font-semibold text-[#0F1111] hover:bg-[#F7CA00]',
  secondary:
    'inline-flex items-center justify-center gap-1.5 rounded-full border border-[#D5D9D9] bg-white px-4 py-2 text-sm font-semibold text-[#0F1111] hover:bg-[#F7F8F8]',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Order placed',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Being prepared',
  SHIPPED: 'Shipped',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURNED: 'Returned',
};
const STEP_ORDER = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];

const fmt = (iso?: string | null, withTime = false) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
      })
    : '';

const shipmentLabel = (s: string) =>
  ({ PENDING: 'Being prepared', PROCESSING: 'Being prepared', PACKED: 'Packed', SHIPPED: 'Shipped', IN_TRANSIT: 'Shipped', OUT_FOR_DELIVERY: 'Out for delivery', DELIVERED: 'Delivered', CANCELLED: 'Cancelled' } as Record<string, string>)[s] ||
  s.replace(/_/g, ' ').toLowerCase();

export function OrderTrackingView({ orderId = '', embeddedInAccount = true }: OrderTrackingViewProps) {
  const router = useRouter();
  const { orders: recentOrders, fetchOrders } = useOrderStore();

  const [activeOrderId, setActiveOrderId] = useState(orderId);
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(Boolean(orderId));
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders({ page: 1 }).catch(() => {});
  }, [fetchOrders]);

  useEffect(() => {
    setActiveOrderId(orderId || '');
    if (!orderId) {
      setOrder(null);
      setFetchError(null);
    }
  }, [orderId]);

  useEffect(() => {
    if (!activeOrderId) {
      setIsLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(activeOrderId)}`);
        const json = await res.json();
        if (!alive) return;
        if (json.success && json.data) setOrder(json.data);
        else setFetchError(json.error?.message || `We couldn't find order ${activeOrderId} in your account.`);
      } catch {
        if (alive) setFetchError('Could not load the order. Check your connection and try again.');
      } finally {
        if (alive) setIsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [activeOrderId]);

  const open = (id: string) => {
    const clean = id.trim().replace(/^#/, '');
    if (!clean) return;
    setActiveOrderId(clean);
    setQuery('');
    router.replace(`/account?tab=tracking&orderId=${encodeURIComponent(clean)}`, { scroll: false });
  };

  const copy = (value: string) => {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopied(value);
    setTimeout(() => setCopied(null), 1500);
  };

  const switcher = (
    <div className="space-y-3 rounded-xl border border-[#D5D9D9] bg-white p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          open(query);
        }}
        className="flex flex-col gap-2 sm:flex-row sm:items-center"
      >
        <label htmlFor="track-order-input" className="text-sm font-semibold text-[#0F1111] sm:w-40">
          Track an order
        </label>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#565959]" aria-hidden="true" />
          <input
            id="track-order-input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Order number, for example VYN-ORD-123456"
            className="w-full rounded-full border border-[#D5D9D9] py-2 pl-9 pr-3 text-sm focus:border-[#007185] focus:outline-none focus:ring-1 focus:ring-[#007185]"
          />
        </div>
        <button type="submit" className={btn.primary}>
          Track
        </button>
      </form>
      {recentOrders.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-[#EAEDED] pt-3">
          <span className="text-xs text-[#565959]">Recent:</span>
          {recentOrders.slice(0, 6).map((o: any) => {
            const id = o.orderNumber || o.id;
            const current = order?.orderNumber === id || activeOrderId === id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => open(id)}
                aria-pressed={current}
                className={`rounded-full px-3 py-1 text-xs font-medium tabular-nums ${
                  current ? 'bg-[#0F1111] text-white' : 'border border-[#D5D9D9] bg-white text-[#0F1111] hover:bg-[#F7F8F8]'
                }`}
              >
                #{id}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const wrap = (children: React.ReactNode) => (
    <div className={embeddedInAccount ? 'flex w-full flex-col gap-5' : 'mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6'}>{children}</div>
  );

  if (isLoading) {
    return wrap(
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3" aria-live="polite">
        <CometSpinner className="h-12 w-12" decorative />
        <p className="text-sm text-[#565959]">Loading your order…</p>
      </div>
    );
  }

  if (!activeOrderId || fetchError || !order) {
    return wrap(
      <>
        <div>
          <h1 className="text-2xl font-bold text-[#0F1111]">Track an order</h1>
          <p className="mt-1 text-sm text-[#565959]">Choose a recent order or enter its order number.</p>
        </div>
        {switcher}
        {activeOrderId && (
          <div role="alert" className="space-y-3 rounded-xl border border-rose-200 bg-white p-6 text-center">
            <p className="text-sm font-semibold text-rose-800">{fetchError || `We couldn't find order ${activeOrderId}.`}</p>
            <Link href="/account?tab=orders" className={btn.secondary}>
              Go to Your orders
            </Link>
          </div>
        )}
      </>
    );
  }

  const status: string = order.status;
  const cancelled = status === 'CANCELLED';
  const reached = STEP_ORDER.indexOf(status);
  const shipments: any[] = order.vendorShipments || [];
  const firstDispatch = shipments.map((s) => s.dispatchedAt).filter(Boolean).sort()[0] || null;
  const lastDelivery = shipments.map((s) => s.deliveredAt).filter(Boolean).sort().pop() || null;
  const addr = order.shippingAddress;
  const isCod = (order.paymentMethod || '').toUpperCase() === 'COD';
  const canCancel = ['PENDING', 'CONFIRMED', 'PROCESSING'].includes(status);

  const steps = cancelled
    ? [
        { label: 'Order placed', date: fmt(order.createdAt, true), done: true },
        { label: 'Cancelled', date: '', done: true, fail: true },
      ]
    : [
        { label: 'Order placed', date: fmt(order.createdAt, true), done: true },
        { label: 'Confirmed by the seller', date: '', done: reached >= 1 },
        { label: 'Shipped', date: fmt(firstDispatch), done: reached >= 3 },
        { label: 'Out for delivery', date: '', done: reached >= 4 },
        { label: 'Delivered', date: fmt(lastDelivery), done: reached >= 5 },
      ];
  const current = steps.map((s) => s.done).lastIndexOf(true);

  return wrap(
    <>
      {switcher}

      <article className="overflow-hidden rounded-xl border border-[#D5D9D9] bg-white">
        <header className="flex flex-col gap-2 border-b border-[#EAEDED] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#0F1111]">Order #{order.orderNumber}</h1>
            <p className="text-sm text-[#565959]">Placed {fmt(order.createdAt, true)}</p>
          </div>
          <span
            className={`self-start rounded-full px-3 py-1 text-sm font-semibold sm:self-auto ${
              cancelled ? 'bg-rose-50 text-rose-800' : status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-800' : 'bg-sky-50 text-sky-800'
            }`}
          >
            {STATUS_LABEL[status] || status}
          </span>
        </header>

        <div className="grid gap-6 p-5 lg:grid-cols-[1fr,18rem]">
          {/* Progress */}
          <ol className="space-y-0" aria-label="Order progress">
            {steps.map((step, i) => (
              <li key={step.label} className="relative flex gap-3 pb-5 last:pb-0" aria-current={i === current ? 'step' : undefined}>
                {i < steps.length - 1 && (
                  <span className={`absolute left-[11px] top-6 h-[calc(100%-1.5rem)] w-0.5 ${steps[i + 1].done ? 'bg-[#067D62]' : 'bg-[#E3E6E6]'}`} aria-hidden="true" />
                )}
                <span
                  className={`relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs ${
                    (step as any).fail ? 'bg-rose-600 text-white' : step.done ? 'bg-[#067D62] text-white' : 'border border-[#D5D9D9] bg-white text-[#565959]'
                  }`}
                >
                  {(step as any).fail ? <X className="h-3.5 w-3.5" aria-hidden="true" /> : step.done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
                </span>
                <div className="text-sm">
                  <p className={step.done ? 'font-medium text-[#0F1111]' : 'text-[#565959]'}>{step.label}</p>
                  {step.done && step.date && <p className="text-xs text-[#565959]">{step.date}</p>}
                </div>
              </li>
            ))}
          </ol>

          {/* Address and payment */}
          <aside className="space-y-4 text-sm">
            {addr && (
              <div>
                <h2 className="flex items-center gap-1.5 text-xs font-medium text-[#565959]">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> Delivering to
                </h2>
                <p className="mt-1 font-semibold text-[#0F1111]">{addr.fullName}</p>
                <p className="text-[#565959]">
                  {addr.streetAddress}
                  {addr.locality ? `, ${addr.locality}` : ''}
                  <br />
                  {addr.city}, {addr.state} <span className="tabular-nums">{addr.postalCode}</span>
                </p>
              </div>
            )}
            <div>
              <h2 className="text-xs font-medium text-[#565959]">Payment</h2>
              <p className="mt-1 text-[#0F1111]">
                <span className="font-semibold tabular-nums">{formatINR(Number(order.totalAmount))}</span> ·{' '}
                {isCod ? (status === 'DELIVERED' ? 'Paid on delivery' : 'Pay on delivery') : 'Paid online'}
              </p>
              {Number(order.refundedAmount || 0) > 0 && (
                <p className="text-[#067D62]">Refunded {formatINR(Number(order.refundedAmount))}</p>
              )}
            </div>
          </aside>
        </div>

        {/* Packages */}
        <section className="border-t border-[#EAEDED] px-5 py-4" aria-labelledby="packages-heading">
          <h2 id="packages-heading" className="text-base font-semibold text-[#0F1111]">
            {shipments.length > 1 ? `${shipments.length} packages` : 'Package'}
          </h2>
          <ul className="mt-3 space-y-3" role="list">
            {shipments.map((s, i) => {
              const url = getCourierTrackingUrl(s.courierPartner, s.trackingNumber);
              return (
                <li key={s.id || i} className="rounded-lg border border-[#EAEDED] p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-[#0F1111]">
                      {shipments.length > 1 ? `Package ${i + 1} from ` : 'From '}
                      {s.vendor?.storeName || 'the seller'}
                    </p>
                    <span className="text-[#565959]">{shipmentLabel(s.status || '')}</span>
                  </div>
                  {s.trackingNumber ? (
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[#565959]">
                      <Truck className="h-4 w-4" aria-hidden="true" />
                      {s.courierPartner || 'Courier'}
                      <span className="tabular-nums text-[#0F1111]">{s.trackingNumber}</span>
                      <button type="button" onClick={() => copy(s.trackingNumber)} className="inline-flex items-center gap-0.5 text-[#007185] hover:underline">
                        {copied === s.trackingNumber ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                        {copied === s.trackingNumber ? 'Copied' : 'Copy'}
                      </button>
                      {url && (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[#007185] hover:underline">
                          Track on courier site <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        </a>
                      )}
                    </p>
                  ) : (
                    !cancelled && <p className="mt-1 text-[#565959]">Tracking appears here once the seller ships it.</p>
                  )}
                  {(s.dispatchedAt || s.deliveredAt) && (
                    <p className="mt-1 text-xs text-[#565959]">
                      {s.dispatchedAt && `Shipped ${fmt(s.dispatchedAt)}`}
                      {s.dispatchedAt && s.deliveredAt && ' · '}
                      {s.deliveredAt && `Delivered ${fmt(s.deliveredAt)}`}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {/* Items */}
        <section className="border-t border-[#EAEDED] px-5 py-4" aria-labelledby="items-heading">
          <h2 id="items-heading" className="text-base font-semibold text-[#0F1111]">
            Items ({order.items?.length || 0})
          </h2>
          <ul className="mt-3 divide-y divide-[#EAEDED]" role="list">
            {(order.items || []).map((it: any) => (
              <li key={it.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[#EAEDED] bg-[#F7F8F8]">
                  {it.image ? (
                    <Image src={it.image} alt="" fill className="object-contain p-1" />
                  ) : (
                    <Package className="absolute inset-0 m-auto h-5 w-5 text-[#8A8F8F]" aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  {it.slug ? (
                    <Link href={`/products/${it.slug}`} className="font-semibold text-[#0F1111] hover:text-[#007185] hover:underline">
                      {it.title}
                    </Link>
                  ) : (
                    <p className="font-semibold text-[#0F1111]">{it.title}</p>
                  )}
                  <p className="text-[#565959]">
                    {[it.size && !['N/A', 'Standard'].includes(it.size) && `Size ${it.size}`, it.color && it.color !== 'N/A' && it.color, `Qty ${it.quantity}`]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  <p className="text-[#565959]">
                    <span className="font-semibold tabular-nums text-[#0F1111]">{formatINR(Number(it.price))}</span> · Sold by {it.sellerName}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Actions */}
        <footer className="flex flex-wrap gap-2 border-t border-[#EAEDED] bg-[#F7F8F8] px-5 py-4">
          {canCancel && (
            <Link href={`/orders/${order.id}/cancel`} className={btn.secondary}>
              Cancel order
            </Link>
          )}
          {status === 'DELIVERED' && (
            <Link href="/account?tab=orders" className={btn.secondary}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Return or replace items
            </Link>
          )}
          {(status === 'SHIPPED' || status === 'OUT_FOR_DELIVERY' || status === 'DELIVERED') && (
            <a href={`/orders/${encodeURIComponent(order.orderNumber)}/invoice`} target="_blank" rel="noopener noreferrer" className={btn.secondary}>
              <FileText className="h-4 w-4" aria-hidden="true" />
              Invoice
            </a>
          )}
          <Link
            href={`/support?topic=ORDER&order=${encodeURIComponent(order.orderNumber)}#support-contact-form`}
            className={btn.secondary}
          >
            <HelpCircle className="h-4 w-4" aria-hidden="true" />
            Get help with this order
          </Link>
        </footer>
      </article>
    </>
  );
}
