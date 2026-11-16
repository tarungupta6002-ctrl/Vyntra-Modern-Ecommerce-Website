'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Package,
  Truck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  MapPin,
  Phone,
  RefreshCw,
  Copy,
  Check,
  ShieldAlert,
  ShieldCheck,
  Store,
  Calendar,
  ExternalLink,
  X,
} from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { getCourierTrackingUrl } from '@/lib/courier-tracking';

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
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
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
        alert(json.error?.message || 'Failed to update status');
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
      setDispatchError('Please specify the courier partner name.');
      return;
    }
    if (!trackingNumberInput.trim()) {
      setDispatchError('Please enter a valid tracking / AWB number.');
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

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-8 h-8 border-4 border-[#FFD814] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-[#565959] font-medium">Verifying consignment authorization...</span>
      </div>
    );
  }

  // 2. 403 Forbidden: Cross-Vendor Order Access Blocked
  if (errorStatus === 403) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white rounded-2xl border border-rose-200 p-8 text-center space-y-4 shadow-sm">
        <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
          403 — Unauthorized Cross-Vendor Access
        </div>
        <h2 className="text-xl font-bold text-[#0F1111]">Consignment Access Denied</h2>
        <p className="text-xs text-[#565959] leading-relaxed">
          Order <strong>#{orderParam}</strong> belongs to another merchant atelier or does not contain products from your store.
          Under Vyntra marketplace data privacy and strict vendor isolation rules, customer delivery details and cross-vendor consignments cannot be viewed.
        </p>
        <div className="pt-3 flex items-center justify-center gap-3">
          <Link
            href="/vendor/orders"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] text-xs font-bold shadow-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Your Orders</span>
          </Link>
        </div>
      </div>
    );
  }

  // 3. 404 Not Found
  if (errorStatus === 404 || !order) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white rounded-2xl border border-[#D5D9D9] p-8 text-center space-y-4 shadow-sm">
        <div className="w-14 h-14 rounded-full bg-[#EAEDED] text-[#565959] flex items-center justify-center mx-auto">
          <Package className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-[#0F1111]">Order Not Found</h2>
        <p className="text-xs text-[#565959] leading-relaxed">
          {errorMessage || `We could not locate order #${orderParam} in the marketplace database.`}
        </p>
        <div className="pt-3">
          <Link
            href="/vendor/orders"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] text-xs font-bold shadow-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Your Orders</span>
          </Link>
        </div>
      </div>
    );
  }

  // 4. Authorized View: Render Consignment Details
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/vendor/orders"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#007185] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to All Orders</span>
        </Link>
        <button
          onClick={fetchOrderDetail}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#D5D9D9] hover:bg-[#F7FAFA] text-xs font-semibold text-[#0F1111] shadow-sm"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Details</span>
        </button>
      </div>

      {/* Main Order Card */}
      <div className="bg-white rounded-xl border border-[#D5D9D9] shadow-sm overflow-hidden">
        {/* Order Header */}
        <div className="bg-[#131921] text-white p-4 sm:px-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/10">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#CCCCCC]">Order #</span>
              <span className="font-extrabold text-sm text-[#FFD814] font-mono">
                {order.orderNumber}
              </span>
              <button
                type="button"
                onClick={handleCopyOrderNumber}
                className="p-1 hover:bg-white/10 rounded text-white/70 hover:text-white transition-colors"
                title="Copy Order Number"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
            <span className="text-white/20 hidden sm:inline">•</span>
            <div className="flex items-center gap-1 text-xs text-[#CCCCCC]">
              <Calendar className="h-3.5 w-3.5" />
              <span>Placed on {order.datePlaced} at {order.placedTime}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded bg-white/10 text-[#FFD814] border border-white/20">
              {order.paymentMethod === 'COD' ? 'CASH ON DELIVERY (COD)' : 'PREPAID'}
            </span>
            <span className="text-xs font-mono font-extrabold text-white">
              Your Subtotal: {formatINR(order.vendorSubtotal)}
            </span>
          </div>
        </div>

        {/* Content Grid */}
        <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Shipping Address */}
          <div className="lg:col-span-5 bg-[#F7F8F8] rounded-xl p-5 border border-[#D5D9D9] space-y-4">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#007185]">
              <MapPin className="h-4 w-4" />
              <span>Customer Shipping Address</span>
            </div>

            {order.shippingAddress ? (
              <div className="space-y-1.5 text-xs text-[#444653]">
                <span className="font-bold text-sm text-[#0F1111] block">
                  {order.shippingAddress.fullName}
                </span>
                <p className="leading-relaxed">
                  {order.shippingAddress.streetAddress}
                  {order.shippingAddress.locality ? `, ${order.shippingAddress.locality}` : ''}
                  <br />
                  {order.shippingAddress.city}, {order.shippingAddress.state} —{' '}
                  <strong className="text-[#0F1111]">{order.shippingAddress.postalCode}</strong>
                </p>
                <div className="flex items-center gap-1.5 pt-2 text-[#0F1111] font-semibold">
                  <Phone className="h-3.5 w-3.5 text-[#565959]" />
                  <span>{order.shippingAddress.phone}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#565959] italic">Standard delivery address on file.</p>
            )}

            <div className="pt-3 border-t border-[#D5D9D9] text-xs text-[#565959] flex justify-between">
              <span>Overall Consignment:</span>
              <span className="font-bold text-[#0F1111] uppercase">{order.orderStatus}</span>
            </div>
          </div>

          {/* Vendor's Isolated Products */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between text-xs pb-1 border-b border-[#EAEDED]">
              <span className="font-bold uppercase tracking-wider text-[#565959]">
                Your Store Items ({order.items.length})
              </span>
              <span className="text-[#565959]">
                Total Units: <strong className="text-[#0F1111]">{order.vendorTotalQuantity}</strong>
              </span>
            </div>

            <div className="space-y-3">
              {order.items.map((item) => {
                const isUpdating = updatingItemId === item.id;

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-[#D5D9D9] bg-white space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-16 h-20 rounded-lg overflow-hidden bg-[#F7F8F8] shrink-0 relative border border-[#EAEDED]">
                        <Image src={item.image} alt={item.title} fill className="object-cover" />
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#007185] bg-[#E7F4F5] px-1.5 py-0.5 rounded">
                          {item.brand}
                        </span>
                        <h4 className="text-xs font-bold text-[#0F1111] leading-snug">{item.title}</h4>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#565959]">
                          <span>Size: <strong className="text-[#0F1111]">{item.size}</strong></span>
                          <span>•</span>
                          <span>Color: <strong className="text-[#0F1111]">{item.color}</strong></span>
                          <span>•</span>
                          <span>SKU: <strong className="font-mono text-[#0F1111]">{item.sku}</strong></span>
                        </div>
                        <div className="text-xs font-bold text-[#0F1111] pt-1">
                          Qty {item.quantity} × {formatINR(item.unitPrice)} ={' '}
                          <span className="text-[#007185] font-mono">{formatINR(item.totalPrice)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status & Transition Controls */}
                    <div className="pt-3 border-t border-[#EAEDED] flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#565959]">Fulfillment Status:</span>
                        {item.status === 'PENDING' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock className="h-3 w-3" />
                            Pending Prep
                          </span>
                        )}
                        {item.status === 'PROCESSING' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                            <Package className="h-3 w-3" />
                            Processing / Packed
                          </span>
                        )}
                        {item.status === 'SHIPPED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <Truck className="h-3 w-3" />
                            Dispatched to Courier
                          </span>
                        )}
                        {item.status === 'CANCELLED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            <AlertCircle className="h-3 w-3" />
                            Cancelled
                          </span>
                        )}
                      </div>

                      {/* Transition Buttons */}
                      <div className="flex items-center gap-2">
                        {item.status === 'PENDING' && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleUpdateStatus(item.id, 'PROCESSING')}
                            className="px-3 py-1.5 rounded-lg bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] text-xs font-bold shadow-sm transition-all flex items-center gap-1"
                          >
                            {isUpdating ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Package className="h-3 w-3" />}
                            <span>Mark Packed</span>
                          </button>
                        )}
                        {item.status === 'PROCESSING' && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => {
                              setDispatchModalItem(item);
                              setDispatchError(null);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#0F1111] hover:bg-[#232F3E] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1"
                          >
                            <Truck className="h-3 w-3" />
                            <span>Dispatch / Enter AWB</span>
                          </button>
                        )}
                        {item.status === 'SHIPPED' && order.trackingNumber && (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-[#0F1111] bg-[#F7F8F8] px-2 py-0.5 rounded border border-[#D5D9D9]">
                              AWB: {order.trackingNumber} ({order.courierPartner || 'Courier'})
                            </span>
                            {getCourierTrackingUrl(order.courierPartner, order.trackingNumber) && (
                              <a
                                href={getCourierTrackingUrl(order.courierPartner, order.trackingNumber)!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#007185] hover:underline"
                              >
                                <span>Track</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Dispatch Shipment Modal */}
      {dispatchModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-[#D5D9D9] shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAEDED]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Truck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F1111]">Dispatch Shipment</h3>
                  <p className="text-[11px] text-[#565959]">Enter authentic logistics courier &amp; AWB details</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDispatchModalItem(null)}
                className="text-[#565959] hover:text-[#0F1111] p-1 rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmDispatch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0F1111] mb-1">
                  Courier Partner Name *
                </label>
                <select
                  value={courierPartnerInput}
                  onChange={(e) => setCourierPartnerInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#D5D9D9] bg-white focus:outline-none focus:ring-2 focus:ring-[#007185]"
                >
                  <option value="Delhivery">Delhivery Express</option>
                  <option value="Blue Dart">Blue Dart Express</option>
                  <option value="DTDC">DTDC Courier</option>
                  <option value="Xpressbees">Xpressbees Logistics</option>
                  <option value="Shadowfax">Shadowfax Technologies</option>
                  <option value="Ekart">Ekart Logistics</option>
                  <option value="India Post">India Post (Speed Post)</option>
                  <option value="Trackon">Trackon Courier</option>
                  <option value="Other">Other Courier Partner</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F1111] mb-1">
                  Air Waybill (AWB) / Tracking Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DEL-981044-IND or 123456789"
                  value={trackingNumberInput}
                  onChange={(e) => setTrackingNumberInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#D5D9D9] focus:outline-none focus:ring-2 focus:ring-[#007185] font-mono"
                />
                <span className="text-[10px] text-[#565959] mt-0.5 block">
                  Customer will see this real tracking AWB number in their order status.
                </span>
              </div>

              {dispatchError && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
                  {dispatchError}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#EAEDED]">
                <button
                  type="button"
                  onClick={() => setDispatchModalItem(null)}
                  className="px-4 py-2 rounded-lg border border-[#D5D9D9] hover:bg-[#F7FAFA] text-xs font-bold text-[#0F1111]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDispatching}
                  className="px-4 py-2 rounded-lg bg-[#0F1111] hover:bg-[#232F3E] text-white text-xs font-bold shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isDispatching ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Truck className="h-3 w-3" />}
                  <span>Confirm Dispatch &amp; Ship</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
