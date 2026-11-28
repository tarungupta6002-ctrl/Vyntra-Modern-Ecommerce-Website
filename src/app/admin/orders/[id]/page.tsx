'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Package,
  Truck,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  CreditCard,
  MapPin,
  User,
  Phone,
  Mail,
  ShieldCheck,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Store,
  Tag,
  Receipt,
  Layers,
} from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { getCourierTrackingUrl } from '@/lib/courier-tracking';

interface OrderItemDetail {
  id: string;
  productId: string;
  variantId: string;
  title: string;
  brand: string;
  slug: string;
  sku: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  originalPrice: number;
  status: string;
  vendorName: string;
  vendorId: string;
  isSellerOffer: boolean;
  image: string;
  returnRequest?: any;
}

interface CancellationRefundInfo {
  status: 'INITIATED' | 'GATEWAY_PENDING' | 'CONFIRMED' | 'FAILED' | 'RECONCILIATION_REQUIRED';
  amount: number;
  razorpayRefundId: string | null;
  failureReason: string | null;
  attempts: number;
  createdAt: string;
  processedAt: string | null;
}

const REFUND_STATUS_LABEL: Record<CancellationRefundInfo['status'], string> = {
  INITIATED: 'Sending to Razorpay',
  GATEWAY_PENDING: 'Awaiting Razorpay confirmation',
  CONFIRMED: 'Refunded',
  FAILED: 'Failed',
  RECONCILIATION_REQUIRED: 'Needs check',
};

const refundNeedsRetry = (r: CancellationRefundInfo | null) =>
  !!r && (r.status === 'FAILED' || r.status === 'RECONCILIATION_REQUIRED');

const TONE_CLASS = {
  emerald: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
  sky: 'bg-sky-50 text-sky-900 border border-sky-200',
  rose: 'bg-rose-50 text-rose-800 border border-rose-200',
  amber: 'bg-amber-50 text-amber-900 border border-amber-200',
};

/**
 * What the payment badge should say. The order is marked REFUNDED as soon as Razorpay accepts the
 * refund, but the money only lands once Razorpay confirms it, so the refund record decides the label.
 */
function paymentStatusView(order: { paymentStatus: string; cancellationRefund: CancellationRefundInfo | null }) {
  const r = order.cancellationRefund;
  if (r) {
    if (refundNeedsRetry(r)) return { label: 'Refund failed', tone: 'rose' as const };
    if (r.status !== 'CONFIRMED') return { label: 'Refund initiated', tone: 'sky' as const };
  }
  if (order.paymentStatus === 'REFUNDED') return { label: 'Refunded', tone: 'sky' as const };
  if (order.paymentStatus === 'PARTIALLY_REFUNDED') return { label: 'Partially refunded', tone: 'sky' as const };
  if (order.paymentStatus === 'PAID') return { label: 'Paid', tone: 'emerald' as const };
  return { label: order.paymentStatus.replace(/_/g, ' ').toLowerCase(), tone: 'amber' as const };
}

interface OrderDetailData {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  isCOD: boolean;
  createdAt: string;
  datePlaced: string;
  placedTime: string;
  courierPartner: string | null;
  trackingNumber: string | null;
  remittanceReference: string | null;
  settledAt: string | null;
  refundedAmount: number;
  cancellationRefund: CancellationRefundInfo | null;
  financials: {
    subtotal: number;
    discount: number;
    shippingFee: number;
    packagingFee: number;
    codFee: number;
    tax: number;
    totalAmount: number;
  };
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  shippingAddress: {
    fullName: string;
    phone: string;
    streetAddress: string;
    locality: string;
    landmark: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    addressType: string;
  } | null;
  items: OrderItemDetail[];
  vendorShipments: Array<{
    id: string;
    shipmentNumber: string;
    status: string;
    courierPartner: string | null;
    trackingNumber: string | null;
    subtotal: number;
    shippingFee: number;
    dispatchedAt: string | null;
    deliveredAt: string | null;
    vendor?: { id: string; storeName: string; storeSlug: string };
    warehouse?: { facilityName: string; city: string; state: string } | null;
    itemsCount: number;
  }>;
}

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<OrderDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedRefund, setCopiedRefund] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryMessage, setRetryMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const fetchOrderDetail = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || json.message || 'Failed to load order.');
      }
      setOrder(json.data.order);
    } catch (err: any) {
      console.error('[Admin Order Detail Error]:', err);
      setError(err.message || 'Error loading order details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchOrderDetail();
    }
  }, [orderId]);

  const retryRefund = async () => {
    if (!order || retrying) return;
    setRetrying(true);
    setRetryMessage(null);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(order.id)}/cancellation-refund`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || json.message || 'Refund retry failed.');
      }
      setRetryMessage({ ok: true, text: 'Refund sent to Razorpay again.' });
      await fetchOrderDetail();
    } catch (err: any) {
      setRetryMessage({ ok: false, text: err.message || 'Refund retry failed.' });
    } finally {
      setRetrying(false);
    }
  };

  const copyRefundId = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRefund(true);
    setTimeout(() => setCopiedRefund(false), 2000);
  };

  const copyOrderNumber = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="flex items-center gap-2 text-sm text-[#565959]">
          <Link href="/admin/orders" className="hover:text-[#007185] flex items-center gap-1 font-semibold">
            <ChevronLeft className="h-4 w-4" /> Back to orders
          </Link>
        </div>
        <div className="bg-white rounded-2xl border border-[#D5D9D9] p-12 text-center space-y-3 shadow-xs">
          <RefreshCw className="h-8 w-8 text-[#007185] animate-spin mx-auto" />
          <h2 className="text-base font-bold text-[#0F1111]">Loading Order Details...</h2>
          <p className="text-xs text-[#565959]">Retrieving customer, vendor consignment, and logistics records.</p>
        </div>
      </div>
    );
  }

  const refund = order?.cancellationRefund ?? null;
  const isCancelled = order?.status === 'CANCELLED';
  const paymentView = order ? paymentStatusView(order) : { label: '', tone: 'amber' as const };

  if (error || !order) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="flex items-center gap-2 text-sm text-[#565959]">
          <Link href="/admin/orders" className="hover:text-[#007185] flex items-center gap-1 font-semibold">
            <ChevronLeft className="h-4 w-4" /> Back to orders
          </Link>
        </div>
        <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center space-y-3 shadow-xs">
          <AlertCircle className="h-8 w-8 text-rose-600 mx-auto" />
          <p className="text-base font-bold text-rose-700">Order Not Found</p>
          <p className="text-xs text-[#565959]">{error || 'Unable to load the requested order.'}</p>
          <button
            type="button"
            onClick={fetchOrderDetail}
            className="px-4 py-2 bg-[#007185] text-white text-xs font-bold rounded-lg hover:bg-[#004B57] transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const trackingUrl = getCourierTrackingUrl(order.courierPartner, order.trackingNumber);

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6 select-none">
      {/* 1. Breadcrumbs & Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D5D9D9]">
        <div className="flex items-center gap-2 text-xs text-[#565959]">
          <Link href="/admin" className="hover:text-[#007185] hover:underline font-semibold">
            Admin Central
          </Link>
          <span>/</span>
          <Link href="/admin/orders" className="hover:text-[#007185] hover:underline font-semibold flex items-center gap-1">
            Orders
          </Link>
          <span>/</span>
          <span className="font-bold text-[#0F1111]">{order.orderNumber}</span>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href={`/admin/shipments?search=${encodeURIComponent(order.orderNumber)}`}
            className="px-3 py-1.5 rounded-lg bg-[#007185] hover:bg-[#004B57] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
            title="Manage consignment logistics and carrier tracking in Shipments"
          >
            <Truck className="h-3.5 w-3.5" />
            <span>Manage in Shipments</span>
          </Link>

          {!isCancelled && (
            <Link
              href={`/orders/${encodeURIComponent(order.orderNumber)}/invoice`}
              target="_blank"
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#F7F8F8] border border-[#D5D9D9] text-[#0F1111] text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
              title="Open the order invoice"
            >
              <FileText className="h-3.5 w-3.5 text-[#007185]" />
              <span>Invoice</span>
            </Link>
          )}

          <Link
            href={`/orders/${encodeURIComponent(order.id)}/track`}
            target="_blank"
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#F7F8F8] border border-[#D5D9D9] text-[#565959] hover:text-[#0F1111] text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
            title="View customer-facing live order tracking view"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Storefront View</span>
          </Link>
        </div>
      </div>

      {/* 2. Order Header Dossier Banner */}
      <div className="bg-white rounded-2xl border border-[#D5D9D9] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#F0F0F0] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl sm:text-2xl font-black font-headline text-[#0F1111]">
                Order {order.orderNumber}
              </span>
              <button
                type="button"
                onClick={() => copyOrderNumber(order.orderNumber)}
                className="p-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors cursor-pointer"
                title="Copy Order Number"
              >
                {copiedId ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>

              {/* Status Badge */}
              <span
                className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 ${
                  order.status === 'DELIVERED'
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : order.status === 'SHIPPED' || order.status === 'OUT_FOR_DELIVERY'
                    ? 'bg-sky-100 text-sky-900 border border-sky-300'
                    : order.status === 'PROCESSING'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : order.status === 'CANCELLED'
                    ? 'bg-rose-100 text-rose-900 border border-rose-300'
                    : 'bg-stone-100 text-stone-800 border border-stone-300'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {order.status.replace(/_/g, ' ')}
              </span>

              {/* Payment Mode Badge */}
              <span className="text-[11px] font-semibold bg-stone-100 text-stone-800 px-2 py-0.5 rounded border border-stone-200">
                {order.isCOD ? 'Cash on Delivery (COD)' : 'Prepaid (Online)'}
              </span>

              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${TONE_CLASS[paymentView.tone]}`}>
                Payment: {paymentView.label}
              </span>
            </div>

            <p className="text-xs text-[#565959] flex items-center gap-1.5 pt-0.5">
              <Calendar className="h-3.5 w-3.5 text-stone-400" />
              <span>Placed on <strong>{order.datePlaced}</strong> at <strong>{order.placedTime}</strong></span>
              <span>•</span>
              <span>{order.items.length} Product Line Item{order.items.length > 1 ? 's' : ''}</span>
            </p>
          </div>

          <div className="text-left md:text-right font-mono">
            <span className="text-[11px] uppercase font-bold text-[#565959] block">Total Consignment Value</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-[#0F1111]">
              {formatINR(order.financials.totalAmount)}
            </span>
          </div>
        </div>

        {/* Quick Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1 text-xs">
          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#565959] block">Customer</span>
            <span className="font-bold text-[#0F1111] block truncate">{order.customer.name}</span>
            <span className="text-[11px] text-[#565959] block truncate">{order.customer.email}</span>
          </div>

          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#565959] block">Destination City</span>
            <span className="font-bold text-[#0F1111] block truncate">
              {order.shippingAddress ? `${order.shippingAddress.city}, ${order.shippingAddress.state}` : 'N/A'}
            </span>
            <span className="text-[11px] text-[#565959] block font-mono">
              PIN: {order.shippingAddress?.postalCode || 'N/A'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#565959] block">Logistics Partner</span>
            <span className="font-bold text-[#0F1111] block truncate">
              {order.courierPartner || 'Unassigned / Pending Dispatch'}
            </span>
            {order.trackingNumber ? (
              <span className="text-[11px] text-[#007185] font-mono font-bold block truncate">
                AWB: {order.trackingNumber}
              </span>
            ) : (
              <span className="text-[11px] text-[#565959] block italic">Awaiting AWB</span>
            )}
          </div>

          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#565959] block">Remittance &amp; Settlement</span>
            <span className="font-bold text-[#0F1111] block truncate">
              {order.settledAt ? 'Remitted & Settled' : 'Pending Settlement'}
            </span>
            <span className="text-[11px] text-[#565959] block font-mono truncate">
              {order.remittanceReference
                ? `${order.isCOD ? 'UTR' : 'Payment ID'}: ${order.remittanceReference}`
                : order.isCOD
                ? 'No UTR Reference'
                : 'No Payment ID'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Products & Logistics (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card A: Ordered Products */}
          <div className="bg-white rounded-2xl border border-[#D5D9D9] p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D5D9D9]">
              <h2 className="text-base font-bold font-headline text-[#0F1111] flex items-center gap-2">
                <Package className="h-4 w-4 text-[#007185]" />
                <span>Ordered Product Pieces ({order.items.length})</span>
              </h2>
            </div>

            <div className="divide-y divide-[#F0F0F0] space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="pt-4 first:pt-0 flex flex-col sm:flex-row gap-4 items-start justify-between">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="relative w-20 h-24 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shrink-0">
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        unoptimized
                        className="object-cover object-top"
                      />
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-800 text-[10px] font-bold uppercase tracking-wider">
                          {item.brand}
                        </span>

                        <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-semibold flex items-center gap-1">
                          <Store className="h-3 w-3" />
                          <span>Sold by: <strong>{item.vendorName}</strong></span>
                        </span>

                        {item.isSellerOffer && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 text-[9px] font-bold">
                            Co-Seller Offer
                          </span>
                        )}
                      </div>

                      <Link
                        href={`/products/${item.slug}`}
                        target="_blank"
                        className="text-sm font-bold text-[#0F1111] hover:text-[#007185] transition-colors line-clamp-2 block leading-snug"
                      >
                        {item.title}
                      </Link>

                      <div className="flex items-center gap-3 text-xs text-[#565959] flex-wrap pt-0.5">
                        <span>Size: <strong className="text-[#0F1111] font-semibold">{item.size}</strong></span>
                        <span>•</span>
                        <span>Color: <strong className="text-[#0F1111] font-semibold">{item.color}</strong></span>
                        <span>•</span>
                        <span className="font-mono text-[11px]">SKU: {item.sku}</span>
                      </div>

                      <div className="pt-1 flex items-baseline gap-2">
                        <span className="text-sm font-extrabold font-mono text-[#0F1111]">
                          {formatINR(item.unitPrice)}
                        </span>
                        <span className="text-xs text-[#565959]">× {item.quantity} Qty</span>
                        {item.originalPrice > item.unitPrice && (
                          <span className="text-xs text-[#565959] line-through">
                            {formatINR(item.originalPrice)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right sm:self-center shrink-0 font-mono">
                    <span className="text-[10px] uppercase font-bold text-[#565959] block">Item Total</span>
                    <span className="text-base font-bold text-[#0F1111]">
                      {formatINR(item.totalPrice)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card B: Logistics, Courier & Shipments */}
          <div className="bg-white rounded-2xl border border-[#D5D9D9] p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D5D9D9]">
              <h2 className="text-base font-bold font-headline text-[#0F1111] flex items-center gap-2">
                <Truck className="h-4 w-4 text-[#007185]" />
                <span>Logistics &amp; Courier Fulfillment</span>
              </h2>

              <Link
                href={`/admin/shipments?search=${encodeURIComponent(order.orderNumber)}`}
                className="text-xs text-[#007185] hover:underline font-bold flex items-center gap-1"
              >
                <span>Open Shipments Hub</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#565959] block">Primary Carrier</span>
                <span className="text-base font-extrabold text-[#0F1111] block">
                  {order.courierPartner || 'Carrier Not Assigned Yet'}
                </span>
                {order.trackingNumber ? (
                  <span className="text-xs font-mono font-bold text-[#007185] block">
                    AWB Tracking ID: {order.trackingNumber}
                  </span>
                ) : (
                  <span className="text-xs text-[#565959] italic block">AWB will generate on dispatch</span>
                )}
              </div>

              {order.trackingNumber && trackingUrl && (
                <Link
                  href={trackingUrl}
                  target="_blank"
                  className="px-3.5 py-2 rounded-lg bg-white hover:bg-stone-100 border border-stone-300 text-stone-900 font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 shrink-0"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-[#007185]" />
                  <span>Track Carrier Website</span>
                </Link>
              )}
            </div>

            {/* Multi-Vendor Shipment Packages */}
            {order.vendorShipments && order.vendorShipments.length > 0 && (
              <div className="space-y-3 pt-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#565959] block">
                  Dispatched Vendor Consignments ({order.vendorShipments.length} Package{order.vendorShipments.length > 1 ? 's' : ''})
                </span>

                <div className="space-y-2.5">
                  {order.vendorShipments.map((vs, idx) => (
                    <div
                      key={vs.id}
                      className="p-3.5 rounded-xl border border-stone-200 bg-white shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#007185] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-[#0F1111] truncate">
                            {vs.shipmentNumber}
                          </span>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                            {vs.status}
                          </span>
                        </div>

                        <p className="text-[11px] text-[#565959] pl-7">
                          Dispatched by: <strong className="text-[#0F1111]">{vs.vendor?.storeName || 'Seller'}</strong>
                          {vs.warehouse && ` • Facility: ${vs.warehouse.facilityName} (${vs.warehouse.city})`}
                        </p>
                      </div>

                      <div className="pl-7 sm:pl-0 sm:text-right font-mono">
                        <span className="text-[10px] text-[#565959] block">Courier &amp; AWB</span>
                        <span className="text-xs font-bold text-[#0F1111] block">
                          {vs.courierPartner || 'In Process'} • {vs.trackingNumber || 'Pending'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Card C: Shipping Destination & Customer Dossier */}
          <div className="bg-white rounded-2xl border border-[#D5D9D9] p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D5D9D9]">
              <h2 className="text-base font-bold font-headline text-[#0F1111] flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#007185]" />
                <span>Delivery Address &amp; Customer Information</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Shipping Address Details */}
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#565959] block">
                  Delivery Destination ({order.shippingAddress?.addressType || 'RESIDENTIAL'})
                </span>

                {order.shippingAddress ? (
                  <div className="space-y-1 text-[#0F1111] leading-relaxed">
                    <p className="font-bold text-sm text-[#0F1111]">{order.shippingAddress.fullName}</p>
                    <p>{order.shippingAddress.streetAddress}</p>
                    {order.shippingAddress.locality && <p>{order.shippingAddress.locality}</p>}
                    {order.shippingAddress.landmark && (
                      <p className="text-[#565959] italic">Landmark: {order.shippingAddress.landmark}</p>
                    )}
                    <p className="font-semibold pt-1">
                      {order.shippingAddress.city}, {order.shippingAddress.state} — {order.shippingAddress.postalCode}
                    </p>
                    <p className="text-[#565959] font-mono pt-1 flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {order.shippingAddress.phone}
                    </p>
                  </div>
                ) : (
                  <p className="text-[#565959] italic">No shipping address recorded for this order.</p>
                )}
              </div>

              {/* Customer User Account Details */}
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#565959] block">
                  Customer
                </span>

                <div className="space-y-2 text-[#0F1111]">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-[#007185] shrink-0" />
                    <div>
                      <span className="font-bold block">{order.customer.name}</span>
                      <span className="text-[11px] text-[#565959] font-mono">User ID: {order.customer.id || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-stone-200/60">
                    <Mail className="h-3.5 w-3.5 text-[#565959] shrink-0" />
                    <span className="text-[#565959] font-medium truncate">{order.customer.email}</span>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-stone-200/60">
                    <Phone className="h-3.5 w-3.5 text-[#565959] shrink-0" />
                    <span className="text-[#565959] font-mono">{order.customer.phone}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Financial Summary & Admin actions (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 1: Complete Financial Price Breakdown */}
          <div className="bg-white rounded-2xl border border-[#D5D9D9] p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D5D9D9]">
              <h2 className="text-base font-bold font-headline text-[#0F1111] flex items-center gap-2">
                <Receipt className="h-4 w-4 text-[#007185]" />
                <span>Financial Summary</span>
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center text-[#565959]">
                <span>Items Subtotal ({order.items.length} items)</span>
                <span className="font-mono font-bold text-[#0F1111]">
                  {formatINR(order.financials.subtotal)}
                </span>
              </div>

              {order.financials.discount > 0 && (
                <div className="flex justify-between items-center text-emerald-700 font-semibold">
                  <span>Coupon &amp; Promo Savings</span>
                  <span className="font-mono">- {formatINR(order.financials.discount)}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-[#565959]">
                <span>Shipping</span>
                <span className="font-bold text-emerald-700 uppercase">
                  {order.financials.shippingFee === 0 ? 'FREE' : formatINR(order.financials.shippingFee)}
                </span>
              </div>

              {order.financials.packagingFee > 0 && (
                <div className="flex justify-between items-center text-[#565959]">
                  <span>Packaging fee</span>
                  <span className="font-mono text-[#0F1111] font-semibold">
                    {formatINR(order.financials.packagingFee)}
                  </span>
                </div>
              )}

              {order.financials.codFee > 0 && (
                <div className="flex justify-between items-center text-[#565959]">
                  <span>Cash on Delivery Verification</span>
                  <span className="font-mono text-[#0F1111] font-semibold">
                    {formatINR(order.financials.codFee)}
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-[#D5D9D9] flex justify-between items-baseline">
                <div>
                  <span className="font-headline font-black text-sm text-[#0F1111] block">Total Amount</span>
                  <span className="text-[10px] text-[#565959]">Inclusive of all GST &amp; marketplace fees</span>
                </div>
                <span className="font-headline font-black text-xl text-[#0F1111] font-mono">
                  {formatINR(order.financials.totalAmount)}
                </span>
              </div>
            </div>

            {/* Payment Method Details */}
            <div className="pt-3 border-t border-stone-200/80 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#565959] block">Payment Gateway &amp; Mode</span>
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#565959]">Method:</span>
                  <strong className="text-[#0F1111]">{order.isCOD ? 'Cash on Delivery (COD)' : order.paymentMethod}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#565959]">Payment Status:</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${TONE_CLASS[paymentView.tone]}`}>
                    {paymentView.label}
                  </span>
                </div>
                {order.remittanceReference && (
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-200 text-[11px]">
                    <span className="text-[#565959] shrink-0">{order.isCOD ? 'Remittance UTR:' : 'Razorpay Payment ID:'}</span>
                    <span className="font-mono font-bold text-[#007185] truncate">{order.remittanceReference}</span>
                  </div>
                )}
              </div>

              {refund && (
                <div
                  className={`p-3 rounded-xl border space-y-1.5 text-xs ${
                    refundNeedsRetry(refund) ? 'bg-rose-50 border-rose-200' : 'bg-sky-50/60 border-sky-200'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#565959] block">Cancellation Refund</span>
                  <div className="flex items-center justify-between">
                    <span className="text-[#565959]">Amount:</span>
                    <strong className="text-[#0F1111] font-mono">{formatINR(refund.amount)}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#565959]">Status:</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                        refund.status === 'CONFIRMED'
                          ? TONE_CLASS.emerald
                          : refundNeedsRetry(refund)
                          ? TONE_CLASS.rose
                          : TONE_CLASS.sky
                      }`}
                    >
                      {REFUND_STATUS_LABEL[refund.status]}
                    </span>
                  </div>
                  {refund.razorpayRefundId && (
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-[#565959] shrink-0">Refund ID:</span>
                      <span className="flex items-center gap-1 min-w-0">
                        <span className="font-mono font-bold text-[#007185] truncate">{refund.razorpayRefundId}</span>
                        <button
                          type="button"
                          onClick={() => copyRefundId(refund.razorpayRefundId!)}
                          className="p-0.5 rounded hover:bg-stone-200 text-stone-500 shrink-0"
                          title="Copy refund ID"
                          aria-label="Copy refund ID"
                        >
                          {copiedRefund ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#565959]">{refund.processedAt ? 'Refunded on:' : 'Started on:'}</span>
                    <span className="text-[#0F1111]">
                      {new Date(refund.processedAt || refund.createdAt).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {refundNeedsRetry(refund) && (
                    <div className="pt-1.5 border-t border-rose-200 space-y-2">
                      {refund.failureReason && (
                        <p className="text-[11px] text-rose-800 break-words">{refund.failureReason}</p>
                      )}
                      <button
                        type="button"
                        onClick={retryRefund}
                        disabled={retrying}
                        className="w-full py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-bold flex items-center justify-center gap-1.5"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${retrying ? 'animate-spin' : ''}`} />
                        <span>{retrying ? 'Retrying…' : 'Retry refund'}</span>
                      </button>
                    </div>
                  )}
                  {retryMessage && (
                    <p role="status" className={`text-[11px] font-semibold ${retryMessage.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {retryMessage.text}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Admin Quick Actions */}
          <div className="bg-white rounded-2xl border border-[#D5D9D9] p-5 sm:p-6 shadow-xs space-y-3">
            <h3 className="text-sm font-bold font-headline text-[#0F1111] uppercase tracking-wider">
              Admin actions
            </h3>

            <div className="space-y-2 pt-1 text-xs">
              {isCancelled ? (
                <p className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-[#565959] leading-relaxed">
                  This order is cancelled, so there is nothing to ship and no GST tax invoice is issued for it.
                </p>
              ) : (
                <>
              <Link
                href={`/admin/shipments?search=${encodeURIComponent(order.orderNumber)}`}
                className="w-full py-2.5 px-4 rounded-xl bg-[#007185] hover:bg-[#004B57] text-white font-bold text-center block shadow-xs transition-all flex items-center justify-center gap-2"
              >
                <Truck className="h-4 w-4" />
                <span>Update Tracking / Status in Shipments</span>
              </Link>

              <Link
                href={`/orders/${encodeURIComponent(order.orderNumber)}/invoice`}
                target="_blank"
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-stone-50 border border-[#D5D9D9] text-[#0F1111] font-bold text-center block shadow-xs transition-all flex items-center justify-center gap-2"
              >
                <FileText className="h-4 w-4 text-[#007185]" />
                <span>Print invoice</span>
              </Link>
                </>
              )}

              <Link
                href="/admin/orders"
                className="w-full py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-center block transition-all"
              >
                ← Back to All Orders Directory
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
