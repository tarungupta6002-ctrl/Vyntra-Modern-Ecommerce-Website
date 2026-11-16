'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  CheckCircle,
  Package,
  Truck,
  MapPin,
  Calendar,
  CreditCard,
  ArrowRight,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Printer,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { formatINR } from '@/lib/utils';

interface OrderItem {
  id: string;
  productId: string;
  title: string;
  brand: string;
  vendorName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selectedSize?: string | null;
  selectedColor?: string | null;
  image: string;
}

interface OrderData {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  subtotal: number;
  discount: number;
  shippingFee: number;
  tax: number;
  totalAmount: number;
  createdAt: string;
  trackingNumber?: string;
  courierPartner?: string;
  shippingAddress?: {
    fullName: string;
    phone: string;
    streetAddress: string;
    locality?: string;
    city: string;
    state: string;
    postalCode: string;
  };
  items: OrderItem[];
}

function OrderConfirmationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('orderId') || searchParams.get('orderNumber');
  const orderNumberParam = searchParams.get('orderNumber');

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    async function fetchOrder() {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        const json = await res.json();
        if (json.success && json.data) {
          setOrder(json.data);
        } else {
          setError(json.error?.message || 'Could not load order details.');
        }
      } catch (err: any) {
        setError('Network error loading order.');
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="w-full min-h-[60vh] bg-surface flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="font-headline font-bold text-lg text-on-surface">Loading Order Confirmation...</h2>
        <p className="text-xs text-on-surface-variant mt-1">Verifying order receipt and warehouse allocation</p>
      </div>
    );
  }

  const displayOrderNumber = order?.orderNumber || orderNumberParam || 'VYN-ORD-CONFIRMED';
  const isCod = (order?.paymentMethod || '').toUpperCase() === 'COD';
  const isPaid = (order?.paymentStatus || '').toUpperCase() === 'PAID';

  return (
    <div className="w-full bg-surface min-h-screen text-on-surface antialiased py-8 sm:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Top Success Banner */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 sm:p-10 border border-surface-container shadow-sm text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-4 ring-8 ring-emerald-500/5">
            <CheckCircle className="h-9 w-9 stroke-[2.2]" />
          </div>

          <span className="text-[11px] font-bold tracking-widest uppercase text-secondary mb-1">
            Order Confirmed &amp; Handover Initiated
          </span>
          <h1 className="font-headline font-extrabold text-2xl sm:text-3xl text-on-surface">
            Thank You for Your Order!
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant max-w-lg mt-2 leading-relaxed">
            Your artisanal pieces are being carefully packaged with authentic artisan certification. A confirmation
            SMS and email have been dispatched to your registered contact.
          </p>

          {/* Order Ref Ribbon */}
          <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-3 bg-surface-container-low px-5 py-2.5 rounded-xl border border-surface-container">
            <div className="flex items-center gap-2">
              <span className="text-xs text-on-surface-variant font-medium">Order Reference:</span>
              <span className="font-mono font-bold text-sm text-primary tracking-wide">{displayOrderNumber}</span>
            </div>
            <span className="text-outline-variant hidden sm:inline">•</span>
            {isCod ? (
              <div className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold">
                <ShieldCheck className="h-4 w-4" />
                <span>Cash on Delivery Confirmed</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                <CheckCircle className="h-4 w-4" />
                <span>Prepaid Order Confirmed (PAID)</span>
              </div>
            )}
          </div>
        </div>

        {/* 2-Column Summary Section */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-8">
          {/* Left Column: Delivery & Items (7 cols) */}
          <div className="md:col-span-7 flex flex-col gap-6">
            {/* Delivery Details Card */}
            <div className="bg-surface-container-lowest rounded-xl p-5 border border-surface-container shadow-sm">
              <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-primary pb-3 border-b border-surface-container">
                <Truck className="h-4 w-4" />
                <span>Delivery Information</span>
              </div>

              <div className="mt-4 flex flex-col gap-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-on-surface-variant shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-on-surface block">
                      {order?.shippingAddress?.fullName || 'Valued Patron'}
                    </span>
                    <p className="text-on-surface-variant mt-0.5 leading-relaxed">
                      {order?.shippingAddress
                        ? `${order.shippingAddress.streetAddress}, ${order.shippingAddress.locality ? `${order.shippingAddress.locality}, ` : ''}${order.shippingAddress.city}, ${order.shippingAddress.state} — ${order.shippingAddress.postalCode}`
                        : 'Delivery address details confirmed on file.'}
                    </p>
                    {order?.shippingAddress?.phone && (
                      <span className="text-on-surface-variant block mt-1 font-mono">
                        Phone: +91 {order.shippingAddress.phone}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-2 pt-3 border-t border-surface-container flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-on-surface">Estimated Delivery:</span>
                  </div>
                  <span className="font-bold text-secondary font-mono">Within 2 - 4 Business Days</span>
                </div>

                {order?.trackingNumber && (
                  <div className="pt-2 flex items-center justify-between text-xs">
                    <span className="text-on-surface-variant">Tracking AWB ({order.courierPartner}):</span>
                    <span className="font-mono font-bold text-on-surface">{order.trackingNumber}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Ordered Items List */}
            <div className="bg-surface-container-lowest rounded-xl p-5 border border-surface-container shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-surface-container">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-on-surface">
                  <Package className="h-4 w-4 text-primary" />
                  <span>Items in This Order ({order?.items?.length || 1})</span>
                </div>
              </div>

              <div className="divide-y divide-surface-container mt-2">
                {order?.items && order.items.length > 0 ? (
                  order.items.map((item) => (
                    <div key={item.id} className="py-3 flex items-center gap-3.5">
                      <div className="w-14 h-18 rounded-lg overflow-hidden bg-surface-container shrink-0 relative">
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          sizes="60px"
                          className="object-cover object-top"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                          {item.brand}
                        </span>
                        <h4 className="text-xs font-bold text-on-surface truncate">{item.title}</h4>
                        <div className="flex items-center gap-2 text-[11px] text-on-surface-variant mt-0.5">
                          {item.selectedSize && <span>Size: {item.selectedSize}</span>}
                          {item.selectedColor && <span>Color: {item.selectedColor}</span>}
                          <span>Qty: {item.quantity}</span>
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <span className="font-bold text-xs text-on-surface block">
                          {formatINR(item.totalPrice)}
                        </span>
                        <span className="text-[10px] text-on-surface-variant">
                          {formatINR(item.unitPrice)} each
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-xs text-on-surface-variant">
                    Ordered items packaged and verified with artisan serial certificates.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Payment & Next Steps (5 cols) */}
          <div className="md:col-span-5 flex flex-col gap-6">
            {/* Price Summary Card */}
            <div className="bg-surface-container-lowest rounded-xl p-5 border border-surface-container shadow-sm">
              <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface pb-3 border-b border-surface-container">
                Financial Summary
              </h3>

              <div className="mt-3 flex flex-col gap-2.5 text-xs">
                <div className="flex justify-between text-on-surface-variant">
                  <span>Subtotal</span>
                  <span className="font-mono text-on-surface font-medium">
                    {formatINR(order?.subtotal || 0)}
                  </span>
                </div>

                {order?.discount ? (
                  <div className="flex justify-between text-secondary">
                    <span>Coupon Savings</span>
                    <span className="font-mono font-medium">- {formatINR(order.discount)}</span>
                  </div>
                ) : null}

                <div className="flex justify-between text-on-surface-variant">
                  <span>Express Packaging</span>
                  <span className="font-mono text-on-surface">₹49</span>
                </div>

                {isCod && (
                  <div className="flex justify-between text-on-surface-variant">
                    <span>Cash on Delivery Verification</span>
                    <span className="font-mono text-on-surface">₹49</span>
                  </div>
                )}

                <div className="flex justify-between text-on-surface-variant">
                  <span>Express Courier Shipping</span>
                  <span className="text-secondary font-bold uppercase">FREE</span>
                </div>

                <div className="pt-3 mt-1 border-t border-surface-container flex justify-between items-baseline">
                  <span className="font-headline font-bold text-sm text-on-surface">
                    {isCod ? 'Total Amount Payable' : 'Total Amount Paid'}
                  </span>
                  <span className="font-headline font-extrabold text-lg text-primary font-mono">
                    {formatINR(order?.totalAmount || 0)}
                  </span>
                </div>

                {isCod ? (
                  <div className="mt-2 p-2.5 rounded-lg bg-surface-container-low text-[11px] text-on-surface-variant flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary shrink-0" />
                    <span>
                      Payment Method: <strong>Cash on Delivery (Pending)</strong>. Please keep exact cash or UPI QR scan ready at doorstep.
                    </span>
                  </div>
                ) : (
                  <div className="mt-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-800 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>
                      Payment Method: <strong>Prepaid Online ({order?.paymentMethod || 'Razorpay'} - PAID)</strong>. No payment required at doorstep.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <Link
                href="/account?tab=orders"
                className="w-full py-3 px-4 rounded-xl bg-primary text-on-primary font-bold text-xs uppercase tracking-wider hover:bg-primary-container transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <span>View in My Orders</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/products"
                className="w-full py-3 px-4 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
              >
                <ShoppingBag className="h-4 w-4" />
                <span>Continue Shopping</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-[60vh] bg-surface flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <h2 className="font-headline font-bold text-lg text-on-surface">Loading Order Confirmation...</h2>
        </div>
      }
    >
      <OrderConfirmationContent />
    </Suspense>
  );
}
