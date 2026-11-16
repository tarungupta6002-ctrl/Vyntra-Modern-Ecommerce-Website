'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Home,
  ChevronRight,
  Zap,
  Timer,
  ShieldCheck,
  IndianRupee,
  Ruler,
  HelpCircle,
  CheckCircle2,
  Lock,
  LockOpen,
  ArrowRight,
  Truck,
  RotateCcw,
  Plane,
  X,
  AlertTriangle,
  Info,
  Clock,
  Wallet,
  CreditCard,
  Building2,
  Sparkles,
  RefreshCw,
  Send,
  MessageSquare,
  FileText,
  BadgeCheck,
} from 'lucide-react';
import { Order, OrderItem } from '@/data/orders-data';
import { useOrderStore } from '@/store/order-store';
import { usePaymentVaultStore } from '@/store/payment-vault-store';
import { formatINR } from '@/lib/utils';

interface OrderCancellationViewProps {
  orderId?: string;
}

export function OrderCancellationView({ orderId = 'VYN-ORD-91044' }: OrderCancellationViewProps) {
  const router = useRouter();
  const { getOrder, cancelOrder } = useOrderStore();
  const paymentVault = usePaymentVaultStore();

  // Load current order
  const localOrder = useMemo(() => {
    return getOrder(orderId);
  }, [orderId, getOrder]);

  const [remoteOrder, setRemoteOrder] = useState<any>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrder() {
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`);
        const json = await res.json();
        if (json.success && json.data) {
          setRemoteOrder(json.data);
          if (json.data.items && json.data.items.length > 0) {
            setSelectedItemIds(json.data.items.map((it: any) => it.id));
          }
        } else {
          setFetchError(json.error?.message || 'You are not authorized to view or cancel this order.');
        }
      } catch (e: any) {
        setFetchError('Failed to load order for cancellation.');
      }
    }
    loadOrder();
  }, [orderId]);

  const order: Order | undefined = remoteOrder
    ? {
        id: remoteOrder.id,
        orderNumber: remoteOrder.orderNumber,
        datePlaced: new Date(remoteOrder.createdAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        totalAmount: remoteOrder.totalAmount,
        totalItems: remoteOrder.items?.length || 1,
        status:
          remoteOrder.status?.toLowerCase() === 'cancelled'
            ? 'cancelled'
            : remoteOrder.status?.toLowerCase() === 'shipped'
            ? 'shipped'
            : 'processing',
        statusLabel: remoteOrder.statusLabel || 'Order Confirmed',
        items:
          remoteOrder.items?.map((it: any) => ({
            id: it.id,
            productId: it.productId,
            title: it.title,
            brand: it.brand,
            categoryTag: 'Authentic Handcraft',
            size: it.selectedSize || 'Standard',
            color: it.selectedColor || 'Artisanal',
            quantity: it.quantity,
            price: it.totalPrice,
            originalPrice: it.totalPrice,
            discount: 'Included',
            image: it.image,
            sellerName: it.vendorName,
            shippingMethod: 'Express Courier Transit',
          })) || [],
      }
    : fetchError
    ? undefined
    : localOrder;

  // Selected item IDs for cancellation (default to the first item: Nehru Jacket)
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(() => {
    if (order?.items && order.items.length > 0) {
      return [order.items[0].id];
    }
    return ['item-91044-1'];
  });

  // Selected Cancellation Reason
  const [cancelReason, setCancelReason] = useState<string>('Delivery date too late');
  const [additionalRemarks, setAdditionalRemarks] = useState<string>(
    'Need garment before Nov 14th evening puja.'
  );

  // Selected Refund Destination
  const [refundDestination, setRefundDestination] = useState<'vault' | 'source' | 'bank'>('vault');

  // Legal Checkbox on main page
  const [legalConfirmed, setLegalConfirmed] = useState<boolean>(true);

  // Modal State: Final Confirmation Modal
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalLegalChecked, setModalLegalChecked] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Success State
  const [cancellationResult, setCancellationResult] = useState<{
    refId: string;
    totalRefund: number;
    baseRefund: number;
    bonus: number;
    destinationLabel: string;
  } | null>(null);

  // Quick Modals: Size Swap & Rush Delivery
  const [swapModalOpen, setSwapModalOpen] = useState<boolean>(false);
  const [selectedSwapSize, setSelectedSwapSize] = useState<string>('42 (L)');
  const [swapSuccess, setSwapSuccess] = useState<boolean>(false);

  const [rushModalOpen, setRushModalOpen] = useState<boolean>(false);
  const [rushSuccess, setRushSuccess] = useState<boolean>(false);

  // Accessible focus trap ref
  const modalRef = useRef<HTMLDivElement>(null);

  // Keyboard listener: Escape closes modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (modalOpen && !isSubmitting) setModalOpen(false);
        if (swapModalOpen) setSwapModalOpen(false);
        if (rushModalOpen) setRushModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalOpen, isSubmitting, swapModalOpen, rushModalOpen]);

  // If order items changed, ensure selection validity
  const orderItems = order?.items || [];
  const selectedItems = useMemo(() => {
    return orderItems.filter((it) => selectedItemIds.includes(it.id));
  }, [orderItems, selectedItemIds]);

  // Financial calculations
  const baseRefundAmount = useMemo(() => {
    return selectedItems.reduce((acc, it) => acc + it.price, 0);
  }, [selectedItems]);

  const vaultBonus = useMemo(() => {
    if (refundDestination === 'vault') {
      return Math.round(baseRefundAmount * 0.05 * 100) / 100;
    }
    return 0;
  }, [baseRefundAmount, refundDestination]);

  const netRefundPayable = baseRefundAmount + vaultBonus;

  // Toggle item selection
  const handleToggleItem = (itemId: string) => {
    setSelectedItemIds((prev) => {
      if (prev.includes(itemId)) {
        // Prevent deselecting all items
        if (prev.length === 1) return prev;
        return prev.filter((id) => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedItemIds.length === orderItems.length) {
      // Keep at least the first item
      if (orderItems.length > 0) setSelectedItemIds([orderItems[0].id]);
    } else {
      setSelectedItemIds(orderItems.map((it) => it.id));
    }
  };

  // Open confirmation modal
  const handleOpenConfirmModal = () => {
    if (selectedItems.length === 0) return;
    setSubmissionError(null);
    setModalOpen(true);
  };

  // Submit Final Cancellation
  const handleFinalSubmit = async () => {
    if (isSubmitting) return;
    if (!modalLegalChecked) {
      setSubmissionError('Please accept the cancellation terms to proceed.');
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const activeOrderId = order?.id || orderId;
      const res = await cancelOrder(
        activeOrderId,
        selectedItemIds,
        cancelReason,
        refundDestination,
        additionalRemarks
      );

      let destLabel = 'VYNTRA Vault (+5% Festive Bonus)';
      if (refundDestination === 'source') {
        destLabel = 'Original Payment Source (Visa •••• 4012)';
      } else if (refundDestination === 'bank') {
        destLabel = 'Direct Bank Account (IMPS ••••5621)';
      }

      setCancellationResult({
        refId: res.refId,
        totalRefund: res.totalRefund,
        baseRefund: res.refundAmount,
        bonus: res.bonus,
        destinationLabel: destLabel,
      });

      setModalOpen(false);
    } catch (err: any) {
      setSubmissionError(err?.message || 'Failed to process cancellation. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If already cancelled or success state reached
  if (cancellationResult) {
    return (
      <div className="w-full bg-[#faf8ff] min-h-screen text-[#0F1111] antialiased py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Breadcrumb Bar */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#565959] mb-6">
            <Link href="/" className="hover:text-[#007185] transition-colors flex items-center gap-1">
              <Home className="h-3.5 w-3.5" />
              <span>Home</span>
            </Link>
            <span className="opacity-40">/</span>
            <Link href="/account" className="hover:text-[#007185] transition-colors">
              My Account
            </Link>
            <span className="opacity-40">/</span>
            <Link href="/account?tab=orders" className="hover:text-[#007185] transition-colors">
              My Orders
            </Link>
            <span className="opacity-40">/</span>
            <span className="text-[#007185] font-bold">Cancellation Confirmed</span>
          </nav>

          {/* Success Receipt Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-[#D5D9D9] text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-50/50">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase tracking-wider">
                <BadgeCheck className="h-3.5 w-3.5" />
                Cancellation Confirmed &amp; Payout Processed
              </span>
              <h1 className="font-headline font-extrabold text-2xl sm:text-3xl text-[#0F1111]">
                Instant Refund Released
              </h1>
              <p className="text-xs sm:text-sm text-[#444653] max-w-lg mx-auto leading-relaxed">
                Your cancellation request for Order <strong className="text-[#0F1111]">#{order?.orderNumber?.replace('#', '') || orderId}</strong> has been authorized by our automated ledger.
              </p>
            </div>

            {/* Payout Summary Box */}
            <div className="bg-[#F7F8F8] rounded-2xl p-5 sm:p-6 text-left border border-[#D5D9D9] space-y-4 max-w-lg mx-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[#D5D9D9]">
                <span className="text-xs text-[#565959] font-medium">Unique Transaction Reference:</span>
                <span className="font-mono text-xs font-bold text-[#007185]">{cancellationResult.refId}</span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#565959] block">Refund Amount Credited:</span>
                  <span className="font-headline font-extrabold text-2xl text-[#007185]">
                    ₹{cancellationResult.totalRefund.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  {cancellationResult.bonus > 0 && (
                    <span className="text-[11px] font-bold text-[#FF9900] block mt-0.5">
                      Includes ₹{cancellationResult.bonus.toFixed(2)} Festive Vault Bonus
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[#565959] block">
                    Settlement Speed
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                    <Zap className="h-3 w-3" />
                    Instant 0-Sec
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#D5D9D9] text-xs text-[#444653] flex items-center justify-between">
                <span>Destination Channel:</span>
                <strong className="text-[#0F1111]">{cancellationResult.destinationLabel}</strong>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/account?tab=orders"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#007185] hover:bg-[#004B57] text-white font-headline font-bold text-xs tracking-wide shadow-md transition-colors text-center"
              >
                View Orders History
              </Link>
              <Link
                href="/account?tab=payments"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#D5D9D9] hover:bg-[#dae2fd] text-[#0F1111] font-headline font-bold text-xs transition-colors text-center"
              >
                Check Vyntra Vault Balance
              </Link>
            </div>

            <p className="text-[11px] text-[#565959]">
              An encrypted SMS &amp; tax credit notice has been dispatched to your verified mobile number.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If order is already delivered, cancellation is not possible - show return guidance
  if (order?.status === 'delivered') {
    return (
      <div className="w-full bg-[#faf8ff] min-h-screen text-[#0F1111] antialiased py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#565959] mb-6">
            <Link href="/account" className="hover:text-[#007185] transition-colors">
              My Account
            </Link>
            <span className="opacity-40">/</span>
            <Link href="/account?tab=orders" className="hover:text-[#007185] transition-colors">
              My Orders
            </Link>
            <span className="opacity-40">/</span>
            <span className="text-[#007185] font-bold">Cancellation Not Permitted</span>
          </nav>

          <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-lg border border-[#D5D9D9] text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-50/50">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase tracking-wider">
                Delivered to Doorstep
              </span>
              <h1 className="font-headline font-extrabold text-2xl text-[#0F1111]">
                Order Already Delivered
              </h1>
              <p className="text-xs sm:text-sm text-[#444653] max-w-md mx-auto leading-relaxed">
                Order <strong className="text-[#0F1111]">#{order.orderNumber || order.id}</strong> has already been delivered to your doorstep. Delivered orders cannot be cancelled online.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 text-left space-y-1 max-w-md mx-auto">
              <p className="font-bold flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-700" />
                <span>Need to return or exchange?</span>
              </p>
              <p className="text-[11px] text-amber-800 leading-normal">
                You can easily initiate a 7-day doorstep Return or Size Exchange from your Orders page with free reverse pickup.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/account?tab=orders"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#007185] hover:bg-[#005B6B] text-white text-xs font-bold shadow-sm transition-all"
              >
                Go to My Orders &amp; Return
              </Link>
              <Link
                href="/account?tab=overview"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-300 text-xs font-bold text-[#0F1111] transition-all"
              >
                Return to Account Overview
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#faf8ff] min-h-screen text-[#0F1111] antialiased py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1400px] mx-auto">
        {/* ========================================================= */}
        {/* 1. BREADCRUMB BAR */}
        {/* ========================================================= */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#565959] font-medium mb-6">
          <Link href="/" className="hover:text-[#007185] transition-colors flex items-center gap-1">
            <Home className="h-3.5 w-3.5" />
            <span>Home</span>
          </Link>
          <span className="opacity-40">/</span>
          <Link href="/account" className="hover:text-[#007185] transition-colors">
            My Account
          </Link>
          <span className="opacity-40">/</span>
          <Link href="/account?tab=orders" className="hover:text-[#007185] transition-colors">
            My Orders
          </Link>
          <span className="opacity-40">/</span>
          <Link
            href={`/orders/${order?.orderNumber?.replace('#', '') || orderId}/tracking`}
            className="hover:text-[#007185] transition-colors font-medium"
          >
            Order #{order?.orderNumber?.replace('#', '') || orderId}
          </Link>
          <span className="opacity-40">/</span>
          <span className="text-[#007185] font-bold">Cancel Items &amp; Instant Refund</span>
        </nav>

        {/* ========================================================= */}
        {/* 2. EDITORIAL URGENCY CALLOUT HEADER */}
        {/* ========================================================= */}
        <header className="bg-white rounded-2xl p-6 sm:p-8 mb-8 shadow-sm border border-[#D5D9D9] relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-[#FFE4B5]/30 to-transparent pointer-events-none" />

          <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div className="flex flex-col gap-2 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFE4B5] text-[#0F1111] text-[11px] font-bold uppercase tracking-wider">
                  <Zap className="h-3.5 w-3.5 text-[#904d00]" />
                  Packing in Progress • Eligible for 1-Click Instant Cancellation
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#D5D9D9] text-[#007185] text-[11px] font-semibold">
                  <Timer className="h-3.5 w-3.5" />
                  Dispatch in ~2 Hours
                </span>
              </div>

              <h1 className="font-headline font-extrabold text-2xl sm:text-3xl text-[#0F1111] tracking-tight leading-tight">
                Cancel Order &amp; Select Instant Refund Method
              </h1>

              <p className="text-xs sm:text-sm text-[#444653] flex items-center flex-wrap gap-x-2 gap-y-1">
                <span className="font-semibold text-[#0F1111]">
                  Order #{order?.orderNumber?.replace('#', '') || 'VYN-ORD-91044'}
                </span>
                <span className="opacity-40">•</span>
                <span>Placed on {order?.datePlaced || 'Nov 11, 2025'}, {order?.placedTime || '03:42 PM IST'}</span>
                <span className="opacity-40">•</span>
                <span className="inline-flex items-center gap-1 text-[#007185] font-medium">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#007185]" />
                  RBI-Tokenized Instant IMPS or Vyntra Vault credit guaranteed
                </span>
              </p>
            </div>

            {/* Quick Summary Stat Chip */}
            <div className="flex items-center gap-4 bg-[#F7F8F8] px-5 py-3.5 rounded-xl border border-[#D5D9D9] self-start xl:self-center shrink-0">
              <div className="w-10 h-10 rounded-full bg-[#004B57] text-white flex items-center justify-center shrink-0">
                <IndianRupee className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-wider font-bold text-[#565959]">
                  Selected Refund Total
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-headline font-bold text-xl text-[#007185]">
                    ₹{baseRefundAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  {refundDestination === 'vault' && (
                    <span className="text-[11px] text-[#904d00] font-bold">
                      +₹{vaultBonus.toFixed(2)} Vault Bonus
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ========================================================= */}
        {/* 3. MAIN MULTI-COLUMN CANCELLATION GRID */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {/* ======================================================= */}
          {/* LEFT COLUMN: Item Selection & Reason Manifest (7 cols)  */}
          {/* ======================================================= */}
          <div className="xl:col-span-7 flex flex-col gap-6">
            {/* Section 1: Item Checklist Manifest */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-[#D5D9D9] flex flex-col gap-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#D5D9D9]">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#007185] text-white font-headline text-xs font-bold flex items-center justify-center">
                      1
                    </span>
                    <h2 className="font-headline font-bold text-base text-[#0F1111]">
                      Select Items to Cancel
                    </h2>
                  </div>
                  <p className="text-xs text-[#444653] ml-8 mt-0.5">
                    Uncheck any item you still wish to receive from this package.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs text-[#007185] font-semibold hover:underline"
                >
                  {selectedItemIds.length === orderItems.length
                    ? 'Deselect (Retain 1)'
                    : `Select All (${orderItems.length} Items)`}
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-4">
                {orderItems.map((item, idx) => {
                  const isSelected = selectedItemIds.includes(item.id);
                  return (
                    <div key={item.id} className="space-y-3">
                      <article
                        className={`rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all border ${
                          isSelected
                            ? 'bg-[#F7F8F8] border-[#b8c4ff]'
                            : 'bg-white border-[#D5D9D9] opacity-80'
                        }`}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <label className="relative flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleItem(item.id)}
                              className="w-5 h-5 rounded accent-[#007185] cursor-pointer text-[#007185]"
                            />
                          </label>

                          <div className="w-20 h-24 rounded-lg bg-[#faf8ff] overflow-hidden shrink-0 relative border border-[#D5D9D9]">
                            <Image
                              src={item.image}
                              alt={item.title}
                              fill
                              sizes="80px"
                              className="object-cover"
                            />
                            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#007185] text-white">
                              {item.size}
                            </span>
                          </div>

                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                  isSelected
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-[#D5D9D9] text-[#444653]'
                                }`}
                              >
                                {isSelected ? 'Cancelling' : 'Retained in Shipment'}
                              </span>
                              <span className="text-[11px] text-[#565959]">
                                SKU: {item.productId || `VYN-SKU-${idx + 1}`}
                              </span>
                            </div>

                            <h3 className="font-headline font-bold text-sm text-[#0F1111] truncate">
                              {item.title}
                            </h3>
                            <p className="text-xs text-[#444653]">
                              {item.color} • Size: {item.size}
                            </p>

                            <div className="flex items-center gap-2 mt-2">
                              <span className="font-bold text-sm text-[#0F1111]">
                                ₹{item.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                              {item.originalPrice > item.price && (
                                <span className="text-xs text-[#565959] line-through">
                                  ₹{item.originalPrice.toLocaleString('en-IN')}
                                </span>
                              )}
                              {item.discount && (
                                <span className="text-[11px] font-semibold text-[#904d00]">
                                  {item.discount}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-[#D5D9D9]">
                          <span className="text-xs text-[#565959] font-medium">Qty: 0{item.quantity}</span>
                          <span
                            className={`text-xs font-bold mt-1 ${
                              isSelected ? 'text-[#007185]' : 'text-[#565959]'
                            }`}
                          >
                            {isSelected ? `Refundable: ₹${item.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'Not Cancelled'}
                          </span>
                        </div>
                      </article>

                      {/* Upsell / Size Swap Alert Banner for first item */}
                      {idx === 0 && isSelected && (
                        <div className="bg-[#D5D9D9] rounded-xl p-3.5 flex items-center justify-between gap-3 border border-[#b8c4ff]/50">
                          <div className="flex items-center gap-2.5">
                            <Ruler className="h-5 w-5 text-[#FF9900] shrink-0" />
                            <div className="text-xs text-[#0F1111]">
                              <span className="font-bold">Need size 42 (L) instead?</span>
                              <span className="text-[#444653] ml-1">
                                Our 180-second Doorstep Size Swap reserves inventory without cancelling.
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSwapModalOpen(true)}
                            className="shrink-0 px-3 py-1.5 rounded-lg bg-white hover:bg-[#F7F8F8] text-xs font-bold text-[#007185] transition-colors shadow-xs"
                          >
                            Swap Size
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Subtotal Banner */}
              <div className="flex items-center justify-between pt-3 border-t border-[#D5D9D9] px-1">
                <span className="text-xs uppercase tracking-wider text-[#565959] font-bold">
                  Line Items Selected for Cancellation:
                </span>
                <span className="font-headline font-bold text-sm text-[#0F1111]">
                  {selectedItems.length} of {orderItems.length} Items (₹{baseRefundAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })})
                </span>
              </div>
            </section>

            {/* Section 2: Cancellation Reason Form */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-[#D5D9D9] flex flex-col gap-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[#D5D9D9]">
                <span className="w-6 h-6 rounded-full bg-[#007185] text-white font-headline text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <h2 className="font-headline font-bold text-base text-[#0F1111]">
                  Reason for Cancellation
                </h2>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-xs font-semibold text-[#444653] uppercase tracking-wider">
                  Select Primary Reason
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    {
                      title: 'Delivery date too late',
                      desc: 'Need item before festive celebration dates.',
                    },
                    {
                      title: 'Ordered by mistake',
                      desc: 'Duplicate purchase or changed mind.',
                    },
                    {
                      title: 'Incorrect size or color',
                      desc: 'Selected wrong variant during checkout.',
                    },
                    {
                      title: 'Found better price elsewhere',
                      desc: 'Price dropped or alternative offer discovered.',
                    },
                  ].map((r) => {
                    const isChecked = cancelReason === r.title;
                    return (
                      <label
                        key={r.title}
                        className={`flex items-start gap-3 p-3.5 rounded-xl cursor-pointer transition-all border ${
                          isChecked
                            ? 'bg-[#e2e7ff] border-[#007185] shadow-xs'
                            : 'bg-[#F7F8F8] border-[#D5D9D9] hover:bg-[#D5D9D9]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="cancel_reason"
                          checked={isChecked}
                          onChange={() => setCancelReason(r.title)}
                          className="mt-0.5 accent-[#007185] text-[#007185]"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-[#0F1111]">{r.title}</span>
                          <span className="text-[11px] text-[#444653] leading-tight mt-0.5">{r.desc}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Additional Remarks */}
              <div className="flex flex-col gap-2 mt-2">
                <label
                  htmlFor="cancellation-notes"
                  className="text-xs font-semibold text-[#444653] flex items-center justify-between"
                >
                  <span>Additional Remarks (Optional)</span>
                  <span className="text-[11px] font-normal text-[#565959]">Max 250 characters</span>
                </label>
                <textarea
                  id="cancellation-notes"
                  rows={2}
                  maxLength={250}
                  value={additionalRemarks}
                  onChange={(e) => setAdditionalRemarks(e.target.value)}
                  placeholder="e.g., Need garment before Nov 14th evening puja ritual in Bangalore..."
                  className="w-full p-3 rounded-xl bg-[#F7F8F8] text-xs text-[#0F1111] focus:outline-none focus:bg-white border border-[#D5D9D9] focus:border-[#007185] transition-all placeholder:text-[#565959]"
                />
              </div>
            </section>

            {/* Section 3: Interactive Instant Refund Destination Selection */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-[#D5D9D9] flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#D5D9D9]">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#007185] text-white font-headline text-xs font-bold flex items-center justify-center">
                    3
                  </span>
                  <h2 className="font-headline font-bold text-base text-[#0F1111]">
                    Choose Instant Refund Destination
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] text-[#904d00] font-bold bg-[#FFE4B5] px-2.5 py-1 rounded-full">
                  <ShieldCheck className="h-3 w-3" />
                  Zero Deduction Policy
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {/* Option A: VYNTRA Vault (Recommended + 5% Bonus) */}
                <div
                  onClick={() => setRefundDestination('vault')}
                  className={`rounded-2xl p-5 cursor-pointer transition-all border ${
                    refundDestination === 'vault'
                      ? 'bg-[#e2e7ff] border-[#007185] shadow-md ring-2 ring-[#007185]/10'
                      : 'bg-white border-[#D5D9D9] hover:bg-[#F7F8F8]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <input
                        type="radio"
                        id="radio-vault"
                        name="refund_destination"
                        checked={refundDestination === 'vault'}
                        onChange={() => setRefundDestination('vault')}
                        className="mt-1 accent-[#007185] text-[#007185]"
                      />
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="font-headline font-bold text-sm text-[#0F1111]">
                            VYNTRA Vault (Instant Credit + 5% Bonus)
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-[#904d00] text-white">
                            Recommended
                          </span>
                        </div>
                        <p className="text-xs text-[#444653] max-w-xl leading-relaxed">
                          Credited in <strong className="text-[#0F1111]">0 seconds</strong>. Includes an exclusive{' '}
                          <strong className="text-[#904d00]">5% Festive Bonus (₹{vaultBonus.toFixed(2)})</strong> usable
                          immediately on all bridal, apparel &amp; luxury collections. Never expires. Transferable to bank on demand.
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-[11px] font-medium text-[#007185] mt-1">
                          <span className="flex items-center gap-1">
                            <Zap className="h-3.5 w-3.5 text-[#FF9900]" /> Instant Availability
                          </span>
                          <span className="flex items-center gap-1">
                            <Sparkles className="h-3.5 w-3.5 text-[#FF9900]" /> 100% Usable on Next Cart
                          </span>
                          <span className="flex items-center gap-1">
                            <ShieldCheck className="h-3.5 w-3.5" /> RBI Compliant Escrow
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-headline font-extrabold text-lg text-[#007185]">
                        ₹{(baseRefundAmount + (baseRefundAmount * 0.05)).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                      <div className="text-[11px] text-[#904d00] font-bold">
                        (₹{baseRefundAmount.toLocaleString('en-IN')} + ₹{(baseRefundAmount * 0.05).toFixed(2)} bonus)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Option B: Original Payment Source (Card) */}
                <div
                  onClick={() => setRefundDestination('source')}
                  className={`rounded-2xl p-5 cursor-pointer transition-all border ${
                    refundDestination === 'source'
                      ? 'bg-[#e2e7ff] border-[#007185] shadow-md ring-2 ring-[#007185]/10'
                      : 'bg-white border-[#D5D9D9] hover:bg-[#F7F8F8]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <input
                        type="radio"
                        id="radio-source"
                        name="refund_destination"
                        checked={refundDestination === 'source'}
                        onChange={() => setRefundDestination('source')}
                        className="mt-1 accent-[#007185] text-[#007185]"
                      />
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-headline font-bold text-sm text-[#0F1111]">
                            Original Payment Source
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#D5D9D9] text-[#565959]">
                            Visa •••• 4012
                          </span>
                        </div>
                        <p className="text-xs text-[#444653] max-w-xl leading-relaxed">
                          HDFC Regalia Credit Card (Ending in 4012). Automated IMPS reverse settlement initiated instantaneously.
                          Typically reflects within 15–30 minutes (max 2 business banking cycles).
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-[#565959] mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" /> 15-30 Mins Avg Credit
                          </span>
                          <span className="flex items-center gap-1">
                            <Send className="h-3.5 w-3.5" /> SMS UTR Tracking
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-headline font-bold text-base text-[#0F1111]">
                        ₹{baseRefundAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[11px] text-[#565959]">Standard Reversal</div>
                    </div>
                  </div>
                </div>

                {/* Option C: Direct Verified Bank Account */}
                <div
                  onClick={() => setRefundDestination('bank')}
                  className={`rounded-2xl p-5 cursor-pointer transition-all border ${
                    refundDestination === 'bank'
                      ? 'bg-[#e2e7ff] border-[#007185] shadow-md ring-2 ring-[#007185]/10'
                      : 'bg-white border-[#D5D9D9] hover:bg-[#F7F8F8]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <input
                        type="radio"
                        id="radio-bank"
                        name="refund_destination"
                        checked={refundDestination === 'bank'}
                        onChange={() => setRefundDestination('bank')}
                        className="mt-1 accent-[#007185] text-[#007185]"
                      />
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-headline font-bold text-sm text-[#0F1111]">
                            Direct Verified Bank Account (IMPS Transfer)
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#dae2fd] text-[#007185] flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Penny Drop Verified
                          </span>
                        </div>
                        <p className="text-xs text-[#444653] max-w-xl leading-relaxed">
                          HDFC Bank Ltd • Account ending in ••••••••5621 (IFSC: HDFC0000060, Arya Sharma). Instant IMPS wire transfer
                          released directly upon confirmation.
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-[#565959] mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" /> Under 2 Hours
                          </span>
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" /> Direct Bank IMPS
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-headline font-bold text-base text-[#0F1111]">
                        ₹{baseRefundAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[11px] text-[#565959]">Direct Wire</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* ======================================================= */}
          {/* RIGHT COLUMN: Financial Audit & Action Triggers (5 cols)*/}
          {/* ======================================================= */}
          <div className="xl:col-span-5 flex flex-col gap-6">
            {/* Refund Calculation Audit Card */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-[#D5D9D9] flex flex-col gap-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#D5D9D9]">
                <h2 className="font-headline font-bold text-base text-[#0F1111]">
                  Refund Calculation Audit
                </h2>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#D5D9D9] text-[#007185]">
                  Zero Fees
                </span>
              </div>

              <div className="flex flex-col gap-3 text-xs">
                <div className="flex items-center justify-between text-[#444653]">
                  <span>Item Price ({selectedItems.map((i) => i.title.split(' ')[0]).join(', ') || 'Selected Items'})</span>
                  <span className="font-medium text-[#0F1111]">
                    ₹{baseRefundAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[#444653]">
                  <span className="flex items-center gap-1">
                    Festive Voucher (FESTIVE20)
                    <Info className="h-3 w-3 text-[#565959]" />
                  </span>
                  <span className="font-medium text-[#007185]">₹0.00 (Retained)</span>
                </div>

                <div className="flex items-center justify-between text-[#444653]">
                  <span>Royal Tier Complimentary Shipping</span>
                  <span className="font-medium text-[#0F1111]">₹0.00</span>
                </div>

                <div className="flex items-center justify-between text-[#444653]">
                  <span>Marketplace Cancellation Penalty</span>
                  <span className="font-medium text-[#904d00]">₹0.00 (Waived)</span>
                </div>

                {/* Vault Bonus Row */}
                {refundDestination === 'vault' && (
                  <div className="flex items-center justify-between text-[#904d00] font-semibold bg-[#FFE4B5]/40 px-3 py-2 rounded-xl border border-[#FFE4B5]">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-[#FF9900]" />
                      5% Vyntra Vault Credit Bonus
                    </span>
                    <span>+₹{vaultBonus.toFixed(2)}</span>
                  </div>
                )}

                {/* Net Refund Payable */}
                <div className="pt-3 border-t border-[#D5D9D9] flex items-baseline justify-between">
                  <div className="flex flex-col">
                    <span className="font-headline font-bold text-sm text-[#0F1111]">
                      Net Refund Payable
                    </span>
                    <span className="text-[11px] text-[#565959]">Automated ledger transfer</span>
                  </div>
                  <div className="text-right">
                    <span className="font-headline font-extrabold text-2xl text-[#007185]">
                      ₹{netRefundPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Timeline Micro-chart (Inline SVG) */}
              <div className="bg-[#F7F8F8] rounded-xl p-4 flex flex-col gap-2.5 border border-[#D5D9D9]">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#565959]">
                  <span>Instant Processing Pipeline</span>
                  <span className="text-[#007185]">100% Automated</span>
                </div>

                <svg className="w-full h-8" fill="none" viewBox="0 0 360 32" xmlns="http://www.w3.org/2000/svg">
                  <line x1="20" y1="16" x2="340" y2="16" stroke="#c4c5d5" strokeWidth="2" strokeDasharray="4 4" />
                  <line x1="20" y1="16" x2="180" y2="16" stroke="#007185" strokeWidth="2.5" />
                  {/* Step 1 */}
                  <circle cx="20" cy="16" r="8" fill="#007185" />
                  <circle cx="20" cy="16" r="4" fill="#ffffff" />
                  {/* Step 2 */}
                  <circle cx="180" cy="16" r="8" fill="#007185" />
                  <path d="M177 16L179 18L183 14" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  {/* Step 3 */}
                  <circle cx="340" cy="16" r="8" fill="#dae2fd" />
                  <circle cx="340" cy="16" r="4" fill="#565959" />
                </svg>

                <div className="flex justify-between text-[10px] text-[#444653] font-medium">
                  <span>1. Instant Auth</span>
                  <span className="text-[#007185] font-bold">2. Restock Ledger</span>
                  <span>3. Balance Released</span>
                </div>
              </div>

              {/* Legal Acceptance Checkbox */}
              <label className="flex items-start gap-3 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={legalConfirmed}
                  onChange={(e) => setLegalConfirmed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded accent-[#007185] text-[#007185] cursor-pointer shrink-0"
                />
                <span className="text-xs text-[#444653] leading-relaxed">
                  I confirm cancellation of{' '}
                  <strong className="text-[#0F1111]">
                    {selectedItems.map((i) => i.title).join(' & ') || 'selected items'}
                  </strong>
                  . I acknowledge that reserved festive inventory will be released immediately back to the marketplace.
                </span>
              </label>

              {/* Primary Action Button -> Opens Final Confirmation Modal */}
              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  type="button"
                  id="primary-confirm-btn"
                  disabled={!legalConfirmed || selectedItems.length === 0}
                  onClick={handleOpenConfirmModal}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#007185] hover:bg-[#004B57] text-white font-headline font-bold text-sm tracking-wide shadow-md transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span>
                    Confirm Cancellation &amp;{' '}
                    {refundDestination === 'vault'
                      ? `Credit ₹${netRefundPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })} to Vault`
                      : refundDestination === 'source'
                      ? `Refund ₹${netRefundPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })} to Card`
                      : `IMPS ₹${netRefundPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })} to Bank`}
                  </span>
                </button>

                <Link
                  href="/account?tab=orders"
                  className="w-full py-2.5 px-4 rounded-xl text-center font-headline font-semibold text-xs text-[#444653] hover:text-[#0F1111] hover:bg-[#D5D9D9] transition-colors"
                >
                  Keep My Order (Do Not Cancel)
                </Link>
              </div>

              {/* Rush Express Alternative Prompt */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#D5D9D9] text-xs text-[#0F1111] border border-[#b8c4ff]/40">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-[#904d00]" />
                  <span>Need this earlier instead?</span>
                </div>
                <button
                  type="button"
                  onClick={() => setRushModalOpen(true)}
                  className="text-[#007185] font-bold hover:underline flex items-center gap-1"
                >
                  <span>Request Rush Delivery</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </section>

            {/* Royal Assurance & Customer Protections Module */}
            <section className="bg-white rounded-2xl p-5 shadow-sm border border-[#D5D9D9] flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#dae2fd] text-[#007185] flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-[#0F1111]">
                    RBI Master Direction Compliance
                  </h3>
                  <p className="text-[11px] text-[#444653]">
                    Regulated under Automated Tokenized Electronic Settlements.
                  </p>
                </div>
              </div>

              <p className="text-xs text-[#444653] leading-relaxed">
                An automated IMPS UTR transaction hash will be generated instantaneously upon cancellation. You will
                receive an SMS and encrypted confirmation email within 60 seconds with your reference ID.
              </p>

              {/* Royal Concierge Liaison Callout */}
              <div className="bg-[#F7F8F8] rounded-xl p-3.5 flex items-center justify-between gap-3 border border-[#D5D9D9]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#004B57] text-white font-bold text-xs flex items-center justify-center">
                    KN
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#0F1111]">Kavita Nair</span>
                    <span className="text-[11px] text-[#444653]">Royal Concierge Apparel Liaison</span>
                  </div>
                </div>
                <Link
                  href="/account?tab=support"
                  className="px-2.5 py-1 rounded-lg bg-white border border-[#D5D9D9] text-[11px] font-bold text-[#007185] hover:bg-[#D5D9D9] transition-colors flex items-center gap-1"
                >
                  <MessageSquare className="h-3 w-3" />
                  <span>Help Desk</span>
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* 4. FINAL CONFIRMATION MODAL (STITCH SCREEN 4cada62e6305...)  */}
      {/* ============================================================= */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-300 animate-in fade-in"
        >
          <div
            ref={modalRef}
            className="bg-white w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl shadow-2xl border border-[#c4c5d5]/30 overflow-hidden flex flex-col max-h-[90vh] transition-all"
          >
            {/* Mobile Drag Indicator Handle */}
            <div className="flex sm:hidden justify-center pt-3 pb-1 shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-[#c4c5d5]/60" />
            </div>

            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-[#D5D9D9] flex items-start justify-between gap-4 shrink-0 bg-[#F7F8F8]/40">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
                  <h3
                    id="modal-title"
                    className="font-headline font-extrabold text-lg sm:text-xl text-[#0F1111] tracking-tight"
                  >
                    Confirm Cancellation &amp; Instant Payout
                  </h3>
                </div>
                <p className="text-xs text-[#444653]">
                  Order #{order?.orderNumber?.replace('#', '') || 'VYN-ORD-91044'} •{' '}
                  <span className="text-rose-600 font-medium">Action is irreversible once processed</span>
                </p>
              </div>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={() => !isSubmitting && setModalOpen(false)}
                className="p-1.5 rounded-lg text-[#565959] hover:text-[#0F1111] hover:bg-[#D5D9D9] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex flex-col gap-5">
              {/* Submission Error Alert */}
              {submissionError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{submissionError}</span>
                </div>
              )}

              {/* Items Summary in Modal */}
              <div className="bg-[#F7F8F8] rounded-xl p-4 flex flex-col gap-3 border border-[#D5D9D9]">
                {selectedItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3.5">
                    <div className="w-16 h-20 rounded-lg bg-white overflow-hidden shrink-0 border border-[#c4c5d5]/30 relative">
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-headline font-bold text-sm text-[#0F1111] truncate">
                          {item.title}
                        </span>
                        <span className="font-headline font-bold text-sm text-[#0F1111]">
                          ₹{item.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <span className="text-xs text-[#444653]">
                        {item.color} • Size {item.size} • Qty: {item.quantity}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#565959]">
                        <HelpCircle className="h-3 w-3" />
                        <span>Reason: {cancelReason}</span>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="h-px bg-[#c4c5d5]/30 my-0.5" />

                {/* Refund Destination Row */}
                <div className="flex items-center justify-between text-xs bg-white p-3 rounded-xl border border-[#D5D9D9]">
                  <div className="flex flex-col">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-[#565959]">
                      Refund Destination
                    </span>
                    <span className="font-bold text-[#0F1111] flex items-center gap-1 mt-0.5">
                      {refundDestination === 'vault' ? (
                        <>
                          <Wallet className="h-3.5 w-3.5 text-[#FF9900]" />
                          VYNTRA Vault (+5% Festive Bonus)
                        </>
                      ) : refundDestination === 'source' ? (
                        <>
                          <CreditCard className="h-3.5 w-3.5 text-[#007185]" />
                          Original Payment Source (Visa •••• 4012)
                        </>
                      ) : (
                        <>
                          <Building2 className="h-3.5 w-3.5 text-[#007185]" />
                          Direct Bank Account (IMPS ••••5621)
                        </>
                      )}
                    </span>
                  </div>

                  <div className="text-right flex flex-col items-end">
                    <span className="font-headline font-extrabold text-base text-[#007185]">
                      ₹{netRefundPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Instant 0-Sec Transfer
                    </span>
                  </div>
                </div>
              </div>

              {/* Retention / Expedite Banner */}
              <div className="bg-[#FFE4B5]/30 border border-[#FFE4B5] rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <Plane className="h-5 w-5 text-[#904d00] shrink-0 mt-0.5" />
                  <div className="text-xs text-[#0F1111]">
                    <p className="font-bold">Would you rather expedite delivery?</p>
                    <p className="text-[#444653] text-[11px] leading-snug mt-0.5">
                      Priority Air Express Dispatch is complimentary for Royal Members. Guaranteed arrival by{' '}
                      <span className="font-semibold text-[#904d00]">Tomorrow, Nov 12, 02:00 PM</span>.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setRushModalOpen(true);
                  }}
                  className="shrink-0 w-full sm:w-auto px-3.5 py-2 rounded-lg bg-[#904d00] text-white text-xs font-bold hover:bg-[#663500] transition-colors text-center shadow-xs"
                >
                  Keep Order &amp; Expedite
                </button>
              </div>

              {/* Modal Checkbox */}
              <label className="flex items-start gap-3 p-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={modalLegalChecked}
                  onChange={(e) => setModalLegalChecked(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded accent-[#007185] text-[#007185] cursor-pointer shrink-0"
                />
                <span className="text-xs text-[#444653] leading-relaxed">
                  I understand that reserved festive inventory will be released immediately and{' '}
                  <strong className="text-[#0F1111]">
                    ₹{netRefundPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </strong>{' '}
                  will be credited directly to my{' '}
                  {refundDestination === 'vault' ? 'VYNTRA Vault with instant spending eligibility' : 'selected destination account'}
                  .
                </span>
              </label>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-5 sm:p-6 border-t border-[#D5D9D9] bg-[#F7F8F8]/40 flex flex-col gap-3 shrink-0">
              <div className="flex flex-col-reverse sm:flex-row items-center gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setModalOpen(false)}
                  className="w-full sm:flex-1 py-3 px-4 rounded-xl border border-[#c4c5d5]/60 bg-white hover:bg-[#F7F8F8] text-xs font-headline font-bold text-[#0F1111] transition-colors text-center disabled:opacity-50"
                >
                  Nevermind, Keep My Order
                </button>

                <button
                  type="button"
                  disabled={isSubmitting || !modalLegalChecked}
                  onClick={handleFinalSubmit}
                  className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-[#007185] hover:bg-[#004B57] text-white text-xs font-headline font-bold tracking-wide transition-all shadow-md flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Authorizing Ledger...</span>
                    </>
                  ) : (
                    <>
                      <LockOpen className="h-4 w-4 group-hover:scale-110 transition-transform" />
                      <span>
                        Yes, Cancel &amp; Credit ₹{netRefundPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#565959]">
                <ShieldCheck className="h-3.5 w-3.5 text-[#007185]" />
                <span>100% Encrypted Ledger • Instant IMPS / Vault Settlement Reference will be generated</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* 5. SIZE SWAP MODAL */}
      {/* ============================================================= */}
      {swapModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#D5D9D9] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D5D9D9]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF9900]">
                  Doorstep Size Swap Protocol
                </span>
                <h3 className="font-headline font-bold text-base text-[#0F1111]">
                  Swap Size Without Cancelling
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSwapModalOpen(false);
                  setSwapSuccess(false);
                }}
                className="p-1 rounded-lg hover:bg-[#F7F8F8] text-[#565959]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {swapSuccess ? (
              <div className="py-4 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h4 className="font-headline font-bold text-sm text-[#0F1111]">Size Swap Reserved!</h4>
                <p className="text-xs text-[#444653]">
                  Priority Courier logistics has reserved <strong className="text-[#0F1111]">Size {selectedSwapSize}</strong> for your delivery run. Your original order remains active.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSwapModalOpen(false);
                    setSwapSuccess(false);
                    router.push('/account?tab=orders');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#007185] text-white text-xs font-bold"
                >
                  View in My Orders
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSwapSuccess(true);
                }}
                className="space-y-4 text-xs"
              >
                <p className="text-[#444653]">
                  Select your requested replacement size. The courier executive will carry this replacement size to your doorstep:
                </p>

                <div className="grid grid-cols-3 gap-2">
                  {['38 (S)', '42 (L)', '44 (XL)'].map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setSelectedSwapSize(sz)}
                      className={`p-3 rounded-xl border text-center font-bold transition-all ${
                        selectedSwapSize === sz
                          ? 'border-[#007185] bg-[#e2e7ff] text-[#007185] shadow-xs'
                          : 'border-[#D5D9D9] bg-[#F7F8F8] text-[#0F1111] hover:bg-[#D5D9D9]'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>

                <div className="p-3 bg-[#F7F8F8] rounded-xl text-[11px] text-[#444653]">
                  Doorstep fit trial takes 5–10 minutes while delivery rider waits. If perfect, hand over size 40.
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSwapModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-[#D5D9D9] text-[#0F1111] font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#007185] text-white font-bold hover:bg-[#004B57] shadow-sm"
                  >
                    Confirm Size Swap
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* 6. RUSH DELIVERY MODAL */}
      {/* ============================================================= */}
      {rushModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#D5D9D9] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D5D9D9]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#904d00]">
                  Royal Member Privilege
                </span>
                <h3 className="font-headline font-bold text-base text-[#0F1111]">
                  Request Priority Air Express
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRushModalOpen(false);
                  setRushSuccess(false);
                }}
                className="p-1 rounded-lg hover:bg-[#F7F8F8] text-[#565959]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {rushSuccess ? (
              <div className="py-4 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h4 className="font-headline font-bold text-sm text-[#0F1111]">Priority Air Confirmed!</h4>
                <p className="text-xs text-[#444653]">
                  Your shipment has been prioritized with Express Air Transit. Guaranteed delivery by Tomorrow, 02:00 PM.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setRushModalOpen(false);
                    setRushSuccess(false);
                    router.push('/account?tab=orders');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#007185] text-white text-xs font-bold"
                >
                  Back to Orders
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setRushSuccess(true);
                }}
                className="space-y-4 text-xs"
              >
                <p className="text-[#444653]">
                  As an active Royal Member, you can expedite this package to same-day/next-day air express with zero surcharge:
                </p>

                <div className="p-3 bg-[#D5D9D9] rounded-xl space-y-1 border border-[#b8c4ff]/50">
                  <span className="font-bold text-[#007185] block">Complimentary Priority Air Dispatch</span>
                  <span className="text-[11px] text-[#444653]">
                    Upgraded from Standard Ground • Expected tomorrow before 02:00 PM
                  </span>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setRushModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-[#D5D9D9] text-[#0F1111] font-semibold"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#007185] text-white font-bold hover:bg-[#004B57] shadow-sm flex items-center gap-1.5"
                  >
                    <Plane className="h-3.5 w-3.5" />
                    <span>Confirm Priority Dispatch</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
