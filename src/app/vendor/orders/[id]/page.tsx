'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Check, Copy, ExternalLink, Package, Phone, RefreshCw, Truck, X } from 'lucide-react';
import { VendorPageHeader, VendorStats, vendorButton } from '@/components/vendor/vendor-ui';
import { humanize } from '@/components/console/console-ui';
import { formatINR } from '@/lib/utils';
import { getCourierTrackingUrl } from '@/lib/courier-tracking';

import { CometSpinner } from '@/components/ui/loading-spinner';
interface OrderItem {
  id: string;
  productId: string;
  variantId?: string | null;
  title: string;
  brand: string;
  slug: string;
  sku: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: string;
  image: string;
}

interface VendorOrderDetails {
  id: string;
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  courierPartner?: string | null;
  trackingNumber?: string | null;
  createdAt: string;
  datePlaced: string;
  placedTime: string;
  shippingAddress: {
    fullName: string;
    phone: string;
    streetAddress: string;
    locality?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    addressType: string;
  } | null;
  vendorSubtotal: number;
  vendorTotalQuantity: number;
  items: OrderItem[];
}

/** How each item status reads, and its colour. */
const STATUS: Record<string, { label: string; tone: string }> = {
  PENDING: { label: 'To pack', tone: 'bg-amber-50 text-amber-800' },
  PROCESSING: { label: 'Packed', tone: 'bg-sky-50 text-sky-800' },
  SHIPPED: { label: 'Shipped', tone: 'bg-[#E7F4F5] text-[#005B6B]' },
  DELIVERED: { label: 'Delivered', tone: 'bg-emerald-50 text-emerald-800' },
  CANCELLED: { label: 'Cancelled', tone: 'bg-rose-50 text-rose-800' },
  RETURNED: { label: 'Returned', tone: 'bg-[#F0F2F2] text-[#0F1111]' },
};

export default function VendorOrderDetailPage({ params }: { params: { id: string } }) {
  const orderParam = params.id;
  const [order, setOrder] = useState<VendorOrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Dispatch modal state
  const [dispatchModalItem, setDispatchModalItem] = useState<OrderItem | null>(null);
  const [courierPartnerInput, setCourierPartnerInput] = useState('Delhivery');
  const [trackingNumberInput, setTrackingNumberInput] = useState('');
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [isDispatching, setIsDispatching] = useState(false);

  const fetchOrderDetail = async () => {
    setIsLoading(true);
    setErrorStatus(null);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/vendor/orders/${encodeURIComponent(orderParam)}`);
      const json = await res.json();

      if (res.ok && json.success && json.data) {
        setOrder(json.data);
      } else {
        setErrorStatus(res.status);
        setErrorMessage(json.error?.message || 'Failed to load order details');
      }
    } catch (err: any) {
      setErrorStatus(500);
      setErrorMessage(err.message || 'Network error fetching order');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetail();
  }, [orderParam]);

  const handleCopyOrderNumber = () => {
    if (!order) return;
    navigator.clipboard.writeText(order.orderNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpdateStatus = async (itemId: string, nextStatus: string) => {
    if (!order) return;
    setUpdatingItemId(itemId);
    try {
      const res = await fetch(
        `/api/vendor/orders/${encodeURIComponent(order.id)}/items/${encodeURIComponent(itemId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus }),
        }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        await fetchOrderDetail();
      } else {
        alert(json.error?.message || 'Could not update the item. Please try again.');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleConfirmDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !dispatchModalItem) return;

    if (!courierPartnerInput.trim()) {
      setDispatchError('Choose the courier.');
      return;
    }
    if (!trackingNumberInput.trim()) {
      setDispatchError('Enter the tracking number from the courier.');
      return;
    }

    setIsDispatching(true);
    setDispatchError(null);

    try {
      const res = await fetch(
        `/api/vendor/orders/${encodeURIComponent(order.id)}/items/${encodeURIComponent(dispatchModalItem.id)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'SHIPPED',
            courierPartner: courierPartnerInput.trim(),
            trackingNumber: trackingNumberInput.trim(),
          }),
        }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        setDispatchModalItem(null);
        setTrackingNumberInput('');
        await fetchOrderDetail();
      } else {
        setDispatchError(json.error?.message || 'Failed to dispatch shipment');
      }
    } catch (err: any) {
      setDispatchError(err.message || 'Network error confirming dispatch');
    } finally {
      setIsDispatching(false);
    }
  };

  // 1. Loading
  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3" role="status">
        <CometSpinner className="h-12 w-12 text-[#007185]" />
        <span className="text-sm text-[#565959]">Loading order…</span>
      </div>
    );
  }

  // 2. Not this seller's order, or not found
  if (errorStatus === 403 || errorStatus === 404 || !order) {
    return (
      <div className="mx-auto my-12 max-w-md space-y-3 rounded-xl border border-[#D5D9D9] bg-white p-8 text-center">
        <Package className="mx-auto h-8 w-8 text-[#565959]" aria-hidden="true" />
        <h1 className="text-lg font-semibold text-[#0F1111]">
          {errorStatus === 403 ? 'This order has no items from your store' : 'Order not found'}
        </h1>
        <p className="text-sm text-[#565959]">
          {errorStatus === 403
            ? `Order ${orderParam} belongs to another seller, so its details aren't shown here.`
            : errorMessage || `We couldn't find order ${orderParam}.`}
        </p>
        <Link href="/vendor/orders" className={`${vendorButton.secondary} mt-2`}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to orders
        </Link>
      </div>
    );
  }

  const isCod = order.paymentMethod === 'COD';
  const trackingUrl = order.trackingNumber ? getCourierTrackingUrl(order.courierPartner, order.trackingNumber) : null;

  // 3. The order: what to ship, where to, and the next step for each item
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/vendor/orders" className="inline-flex items-center gap-1 text-sm text-[#565959] hover:text-[#007185]">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Orders
      </Link>

      <VendorPageHeader
        title={`Order ${order.orderNumber}`}
        description={`Placed on ${order.datePlaced} at ${order.placedTime}`}
        actions={
          <>
            <button type="button" onClick={handleCopyOrderNumber} className={vendorButton.secondary}>
              {copied ? <Check className="h-4 w-4 text-[#067D62]" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              {copied ? 'Copied' : 'Copy order number'}
            </button>
            <button type="button" onClick={fetchOrderDetail} className={vendorButton.secondary}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Refresh
            </button>
          </>
        }
      />

      <VendorStats
        items={[
          { label: 'Your items', value: String(order.vendorTotalQuantity) },
          { label: 'Your share of the order', value: formatINR(order.vendorSubtotal) },
          { label: 'Payment', value: isCod ? 'Cash on delivery' : 'Paid online', tone: isCod ? ('warn' as const) : ('good' as const) },
          { label: 'Order status', value: humanize(order.orderStatus) },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Items and their next step */}
        <section className="space-y-3 lg:col-span-8" aria-labelledby="items-heading">
          <h2 id="items-heading" className="text-base font-semibold text-[#0F1111]">
            Items to ship ({order.items.length})
          </h2>

          {order.items.map((item) => {
            const isUpdating = updatingItemId === item.id;
            const status = STATUS[item.status] || { label: humanize(item.status), tone: 'bg-[#F0F2F2] text-[#0F1111]' };
            return (
              <article key={item.id} className="rounded-xl border border-[#D5D9D9] bg-white p-4">
                <div className="flex items-start gap-4">
                  <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg border border-[#EAEDED] bg-[#F7F8F8]">
                    {item.image ? (
                      <Image src={item.image} alt="" fill className="object-cover" />
                    ) : (
                      <Package className="absolute inset-0 m-auto h-6 w-6 text-[#8A8F8F]" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold leading-snug text-[#0F1111]">
                        <Link href={`/products/${item.slug}`} target="_blank" className="hover:text-[#007185] hover:underline">
                          {item.title}
                        </Link>
                      </h3>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.tone}`}>{status.label}</span>
                    </div>
                    <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#565959]">
                      {item.size && item.size !== 'Standard' && (
                        <div><dt className="inline">Size </dt><dd className="inline font-medium text-[#0F1111]">{item.size}</dd></div>
                      )}
                      {item.color && (
                        <div><dt className="inline">Colour </dt><dd className="inline font-medium text-[#0F1111]">{item.color}</dd></div>
                      )}
                      <div><dt className="inline">SKU </dt><dd className="inline tabular-nums font-medium text-[#0F1111]">{item.sku}</dd></div>
                    </dl>
                    <p className="text-sm text-[#0F1111]">
                      <span className="tabular-nums">{item.quantity}</span> × {formatINR(item.unitPrice)} ={' '}
                      <strong className="tabular-nums">{formatINR(item.totalPrice)}</strong>
                    </p>
                  </div>
                </div>

                {(item.status === 'PENDING' || item.status === 'PROCESSING' || (item.status === 'SHIPPED' && order.trackingNumber)) && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#EAEDED] pt-3">
                    {item.status === 'PENDING' && (
                      <>
                        <p className="text-sm text-[#565959]">Pack the item, then mark it packed.</p>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleUpdateStatus(item.id, 'PROCESSING')}
                          className={vendorButton.primary}
                        >
                          {isUpdating ? <CometSpinner className="h-4 w-4 text-current" decorative /> : <Package className="h-4 w-4" aria-hidden="true" />}
                          Mark packed
                        </button>
                      </>
                    )}
                    {item.status === 'PROCESSING' && (
                      <>
                        <p className="text-sm text-[#565959]">Hand it to the courier and add the tracking number.</p>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => {
                            setDispatchModalItem(item);
                            setDispatchError(null);
                          }}
                          className={vendorButton.primary}
                        >
                          <Truck className="h-4 w-4" aria-hidden="true" />
                          Add tracking and ship
                        </button>
                      </>
                    )}
                    {item.status === 'SHIPPED' && order.trackingNumber && (
                      <p className="text-sm text-[#565959]">
                        {order.courierPartner || 'Courier'} tracking{' '}
                        <span className="tabular-nums font-medium text-[#0F1111]">{order.trackingNumber}</span>
                        {trackingUrl && (
                          <>
                            {' '}
                            <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-medium text-[#007185] hover:underline">
                              Track
                              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                            </a>
                          </>
                        )}
                      </p>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </section>

        {/* Where it goes */}
        <aside className="space-y-3 lg:col-span-4" aria-labelledby="ship-to-heading">
          <h2 id="ship-to-heading" className="text-base font-semibold text-[#0F1111]">Ship to</h2>
          <div className="space-y-2 rounded-xl border border-[#D5D9D9] bg-white p-4 text-sm text-[#0F1111]">
            {order.shippingAddress ? (
              <>
                <p className="font-semibold">{order.shippingAddress.fullName}</p>
                <p className="leading-relaxed text-[#565959]">
                  {order.shippingAddress.streetAddress}
                  {order.shippingAddress.locality ? `, ${order.shippingAddress.locality}` : ''}
                  <br />
                  {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                  <span className="tabular-nums font-medium text-[#0F1111]">{order.shippingAddress.postalCode}</span>
                </p>
                <p className="flex items-center gap-1.5 pt-1">
                  <Phone className="h-4 w-4 text-[#565959]" aria-hidden="true" />
                  <a href={`tel:${order.shippingAddress.phone}`} className="tabular-nums hover:text-[#007185]">
                    {order.shippingAddress.phone}
                  </a>
                </p>
              </>
            ) : (
              <p className="text-[#565959]">No delivery address was saved with this order.</p>
            )}
          </div>
          {isCod && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Cash on delivery: the courier collects {formatINR(order.vendorSubtotal)} for your items when they're delivered.
            </p>
          )}
        </aside>
      </div>

      {/* Add tracking and ship */}
      {dispatchModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="dispatch-title" className="max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-xl border border-[#D5D9D9] bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="dispatch-title" className="text-lg font-semibold text-[#0F1111]">Add tracking and ship</h3>
                <p className="mt-1 text-sm text-[#565959]">{dispatchModalItem.title}</p>
              </div>
              <button type="button" onClick={() => setDispatchModalItem(null)} className="rounded-lg p-1 text-[#565959] hover:bg-[#F7F8F8]" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmDispatch} className="space-y-4">
              <div>
                <label htmlFor="courier" className="mb-1 block text-sm font-semibold text-[#0F1111]">Courier</label>
                <select
                  id="courier"
                  value={courierPartnerInput}
                  onChange={(e) => setCourierPartnerInput(e.target.value)}
                  className="w-full rounded-lg border border-[#D5D9D9] bg-white px-3 py-2 text-sm focus:border-[#007185] focus:outline-none focus:ring-1 focus:ring-[#007185]"
                >
                  <option value="Delhivery">Delhivery</option>
                  <option value="Blue Dart">Blue Dart</option>
                  <option value="DTDC">DTDC</option>
                  <option value="Xpressbees">Xpressbees</option>
                  <option value="Shadowfax">Shadowfax</option>
                  <option value="Ekart">Ekart</option>
                  <option value="India Post">India Post (Speed Post)</option>
                  <option value="Trackon">Trackon</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="awb" className="mb-1 block text-sm font-semibold text-[#0F1111]">Tracking (AWB) number</label>
                <input
                  id="awb"
                  type="text"
                  required
                  autoComplete="off"
                  value={trackingNumberInput}
                  onChange={(e) => setTrackingNumberInput(e.target.value)}
                  className="w-full rounded-lg border border-[#D5D9D9] px-3 py-2 text-sm tabular-nums focus:border-[#007185] focus:outline-none focus:ring-1 focus:ring-[#007185]"
                />
                <p className="mt-1 text-xs text-[#565959]">From the courier&apos;s receipt. The customer sees it on their order.</p>
              </div>

              {dispatchError && (
                <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{dispatchError}</p>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-[#EAEDED] pt-4">
                <button type="button" onClick={() => setDispatchModalItem(null)} className={vendorButton.secondary}>
                  Cancel
                </button>
                <button type="submit" disabled={isDispatching} className={vendorButton.primary}>
                  {isDispatching ? <CometSpinner className="h-4 w-4 text-current" decorative /> : <Truck className="h-4 w-4" aria-hidden="true" />}
                  Mark shipped
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
