'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  X,
  Package,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building2,
  DollarSign,
  User,
  CreditCard,
  Truck,
  RotateCcw,
  ShieldCheck,
  FileText,
  Calendar,
  Layers,
  ArrowRight,
  TrendingDown,
  Info,
  ExternalLink,
} from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { resolveRefundDestination, resolveRefundReference } from '@/lib/refund-ui-helpers';

interface AdminReturnDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnRequestId: string;
  data: any | null; // returnRequest + calculations + eligibility
  isLoading: boolean;
  onOpenRefundAction: (ret: any) => void;
  onConfirmDeliveryAction: (ret: any) => void;
}

export function AdminReturnDetailsModal({
  isOpen,
  onClose,
  returnRequestId,
  data,
  isLoading,
  onOpenRefundAction,
  onConfirmDeliveryAction,
}: AdminReturnDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'financials' | 'timeline' | 'impact'>('overview');

  if (!isOpen) return null;

  const returnRequest = data?.returnRequest;
  const calculations = data?.calculations;
  const eligibility = data?.eligibility;
  const order = returnRequest?.order;
  const orderItem = returnRequest?.orderItem;
  const user = returnRequest?.user;
  const vendor = returnRequest?.vendor;
  const refundTransactions = returnRequest?.refundTransactions || [];
  const vendorAdjustments = returnRequest?.vendorAdjustments || [];

  // Financial calculations
  const orderSubtotal = Number(order?.subtotal || 0);
  const orderDiscount = Number(order?.discount || 0);
  const orderShippingFee = Number(order?.shippingFee || 0);
  const orderTax = Number(order?.tax || 0);
  const orderTotal = Number(order?.totalAmount || 0);
  const orderRefunded = Number(order?.refundedAmount || 0);
  const orderRemainingBalance = Math.max(0, Math.round((orderTotal - orderRefunded) * 100) / 100);

  const confirmedItemRefunds = Number(calculations?.confirmedItemRefunds || 0);
  const remainingItemCap = Number(calculations?.remainingItemCap || 0);
  const maxRefundable = Number(calculations?.maxRefundable || 0);
  const itemAllocatedDiscount = Number(calculations?.itemAllocatedDiscount || 0);
  const effectiveItemCeiling = Number(calculations?.effectiveItemCeiling || 0);

  // Status mapping
  const isEligibleForRefund =
    eligibility?.isEligible && maxRefundable > 0 && returnRequest?.type !== 'REPLACEMENT';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#FAFAFA] rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#D5D9D9] overflow-hidden">
        {/* ============================================================= */}
        {/* MODAL HEADER: Amazon-Style Title & Canonical IDs */}
        {/* ============================================================= */}
        <div className="bg-[#131921] text-white px-6 py-4 flex items-center justify-between border-b border-[#232F3E] shrink-0">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#FF9900] bg-[#232F3E] px-2 py-0.5 rounded border border-[#FF9900]/40">
                {returnRequest?.type === 'REPLACEMENT' ? 'Replacement Order Ledger' : 'Return & Refund Audit Ledger'}
              </span>
              <span className="text-zinc-400 text-xs">•</span>
              <span className="text-xs font-mono text-zinc-300">
                Canonical ID: <strong className="text-white">{returnRequestId}</strong>
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold font-headline text-white mt-1 flex items-center gap-2">
              <span>Order #{order?.orderNumber || 'Loading...'}</span>
              <span className="text-zinc-500 font-normal">|</span>
              <span className="text-sm font-normal text-zinc-300">
                Return #{returnRequestId.slice(-8)}
              </span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-[#232F3E] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ============================================================= */}
        {/* KPI FINANCIAL BANNER */}
        {/* ============================================================= */}
        {returnRequest && (
          <div className="bg-white border-b border-[#D5D9D9] px-6 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0 text-xs">
            <div className="border-r border-zinc-100 pr-2">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block">Order Total</span>
              <span className="text-sm sm:text-base font-bold text-zinc-900 font-mono">
                {formatINR(orderTotal)}
              </span>
            </div>
            <div className="border-r border-zinc-100 pr-2">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block">Amount Paid</span>
              <span className="text-sm sm:text-base font-bold text-emerald-700 font-mono">
                {order?.paymentStatus === 'PAID' || orderRefunded > 0 ? formatINR(orderTotal) : 'Unpaid (COD)'}
              </span>
            </div>
            <div className="border-r border-zinc-100 pr-2">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block">Refunded to Date</span>
              <span className="text-sm sm:text-base font-bold text-rose-700 font-mono">
                {formatINR(orderRefunded)}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-400 block">Refund Ceiling (This Item)</span>
              <span className="text-sm sm:text-base font-bold text-[#800020] font-mono">
                {formatINR(maxRefundable)}
              </span>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB NAVIGATION */}
        {/* ============================================================= */}
        <div className="bg-[#EAEDED] px-6 border-b border-[#D5D9D9] flex items-center gap-1 shrink-0 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-[#007185] text-[#007185] bg-white rounded-t-lg'
                : 'border-transparent text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>1. Order &amp; Return Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('items')}
            className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'items'
                ? 'border-[#007185] text-[#007185] bg-white rounded-t-lg'
                : 'border-transparent text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Package className="h-3.5 w-3.5" />
            <span>2. Product Details ({order?.items?.length || 1})</span>
          </button>
          <button
            onClick={() => setActiveTab('financials')}
            className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'financials'
                ? 'border-[#007185] text-[#007185] bg-white rounded-t-lg'
                : 'border-transparent text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <DollarSign className="h-3.5 w-3.5" />
            <span>3. Order Financial Breakdown</span>
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'timeline'
                ? 'border-[#007185] text-[#007185] bg-white rounded-t-lg'
                : 'border-transparent text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>4. History &amp; Timeline ({refundTransactions.length} Refunds)</span>
          </button>
          <button
            onClick={() => setActiveTab('impact')}
            className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'impact'
                ? 'border-[#007185] text-[#007185] bg-white rounded-t-lg'
                : 'border-transparent text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>5. Vendor Impact &amp; Deductions</span>
          </button>
        </div>

        {/* ============================================================= */}
        {/* TAB CONTENTS (SCROLLABLE BODY) */}
        {/* ============================================================= */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {isLoading || !returnRequest ? (
            <div className="py-24 text-center text-zinc-500 space-y-3">
              <div className="w-8 h-8 border-4 border-[#007185] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold">Loading complete order, product, and financial ledger...</p>
            </div>
          ) : (
            <>
              {/* ------------------------------------------------------------- */}
              {/* TAB 1: ORDER & RETURN OVERVIEW */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'overview' && (
                <div className="space-y-5 animate-in fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Order Details Card */}
                    <div className="bg-white p-5 rounded-xl border border-[#D5D9D9] shadow-sm space-y-3">
                      <div className="flex items-center gap-2 border-b border-zinc-100 pb-2.5">
                        <Package className="h-4 w-4 text-[#007185]" />
                        <h3 className="font-bold text-sm text-[#0F1111]">Order &amp; Customer Information</h3>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Order Number:</span>
                          <span className="font-mono font-bold text-zinc-900">{order?.orderNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Customer Name:</span>
                          <span className="font-medium text-zinc-900">{user?.name || 'Customer'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Customer Email:</span>
                          <span className="text-zinc-800">{user?.email || 'Not recorded'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Contact Phone:</span>
                          <span className="text-zinc-800">{user?.phone || 'Not recorded'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Order Placed Date:</span>
                          <span className="text-zinc-900">
                            {new Date(order?.createdAt).toLocaleString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Order Status:</span>
                          <span className="font-bold text-zinc-800">{order?.status}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Payment Method:</span>
                          <span className="font-bold text-zinc-900">{order?.paymentMethod}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Payment Status:</span>
                          <span
                            className={`font-bold ${
                              order?.paymentStatus === 'PAID'
                                ? 'text-emerald-700'
                                : order?.paymentStatus === 'REFUNDED'
                                ? 'text-rose-700'
                                : order?.paymentStatus === 'PARTIALLY_REFUNDED'
                                ? 'text-amber-700'
                                : 'text-zinc-700'
                            }`}
                          >
                            {order?.paymentStatus}
                          </span>
                        </div>
                        {order?.shippingAddress && (
                          <div className="pt-2 border-t border-zinc-100">
                            <span className="text-zinc-500 block mb-0.5">Shipping Destination:</span>
                            <span className="text-zinc-800 leading-tight block">
                              {order.shippingAddress.line1}, {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.postalCode}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Return Request Card */}
                    <div className="bg-white p-5 rounded-xl border border-[#D5D9D9] shadow-sm space-y-3">
                      <div className="flex items-center gap-2 border-b border-zinc-100 pb-2.5">
                        <RotateCcw className="h-4 w-4 text-[#800020]" />
                        <h3 className="font-bold text-sm text-[#0F1111]">Return Request Details</h3>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Return ID:</span>
                          <span className="font-mono font-bold text-[#800020]">{returnRequest?.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Return Type:</span>
                          <span className="font-extrabold uppercase px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-800">
                            {returnRequest?.type === 'REPLACEMENT' ? 'Replacement' : 'Return for Refund'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Return Status:</span>
                          <span className="font-bold text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded">
                            {returnRequest?.status}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Requested On:</span>
                          <span className="text-zinc-900">
                            {new Date(returnRequest?.createdAt).toLocaleString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Primary Reason:</span>
                          <span className="font-semibold text-zinc-900">{returnRequest?.reason?.replace(/_/g, ' ')}</span>
                        </div>
                        {returnRequest?.detailedReason && (
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Detailed Reason:</span>
                            <span className="text-zinc-800 max-w-[200px] text-right truncate">
                              {returnRequest.detailedReason}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Quality Check (QC):</span>
                          <span
                            className={`font-bold ${
                              returnRequest?.qcPassed === true
                                ? 'text-emerald-700'
                                : returnRequest?.qcPassed === false
                                ? 'text-rose-700'
                                : 'text-zinc-500 italic'
                            }`}
                          >
                            {returnRequest?.qcPassed === true
                              ? 'PASSED'
                              : returnRequest?.qcPassed === false
                              ? 'FAILED'
                              : 'Pending QC'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Reverse Courier / AWB:</span>
                          <span className="font-mono text-zinc-800">
                            {returnRequest?.reverseTrackingNumber || 'Not recorded'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Fulfilling Vendor:</span>
                          <span className="font-bold text-zinc-900 flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-zinc-400" />
                            {vendor?.storeName}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Customer / Admin Notes */}
                  {(returnRequest?.customerNotes || returnRequest?.adminNotes || returnRequest?.qcNotes) && (
                    <div className="bg-white p-4 rounded-xl border border-[#D5D9D9] shadow-sm text-xs space-y-2">
                      <h4 className="font-bold text-zinc-900">Recorded Notes &amp; Audit Trail</h4>
                      {returnRequest?.customerNotes && (
                        <div className="p-2.5 bg-zinc-50 rounded border border-zinc-200">
                          <span className="font-bold text-zinc-700 block mb-0.5">Customer Comment:</span>
                          <p className="text-zinc-800">{returnRequest.customerNotes}</p>
                        </div>
                      )}
                      {returnRequest?.adminNotes && (
                        <div className="p-2.5 bg-amber-50 rounded border border-amber-200">
                          <span className="font-bold text-amber-900 block mb-0.5">Admin Settlement Notes:</span>
                          <p className="text-amber-950 whitespace-pre-line font-mono text-[11px]">
                            {returnRequest.adminNotes}
                          </p>
                        </div>
                      )}
                      {returnRequest?.qcNotes && (
                        <div className="p-2.5 bg-blue-50 rounded border border-blue-200">
                          <span className="font-bold text-blue-900 block mb-0.5">QC Inspector Notes:</span>
                          <p className="text-blue-950">{returnRequest.qcNotes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* TAB 2: PRODUCT DETAILS (ALL ORDER ITEMS) */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'items' && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
                    <div>
                      <h3 className="font-bold text-sm text-[#0F1111]">Items in Order #{order?.orderNumber}</h3>
                      <p className="text-xs text-zinc-500">
                        Clearly identifying the item being returned vs. kept items.
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-zinc-600 bg-zinc-100 px-2.5 py-1 rounded">
                      Total Items: {order?.items?.length || 1}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {order?.items?.map((item: any) => {
                      const isTargetItem = item.id === orderItem?.id;
                      const hasReturn = !!item.returnRequest;
                      const itemAllocation = calculations?.allItemAllocations?.find((a: any) => a.id === item.id);
                      const couponDisc = itemAllocation ? itemAllocation.allocatedDiscount : 0;
                      const netVal = itemAllocation ? itemAllocation.effectiveItemCeiling : Number(item.totalPrice);

                      return (
                        <div
                          key={item.id}
                          className={`p-4 rounded-xl border transition-all ${
                            isTargetItem
                              ? 'bg-rose-50/50 border-rose-300 ring-1 ring-rose-300'
                              : 'bg-white border-[#D5D9D9]'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="w-14 h-16 rounded-lg bg-zinc-100 border border-zinc-200 relative overflow-hidden shrink-0">
                                {item.product?.images?.[0]?.url ? (
                                  <Image
                                    src={item.product.images[0].url}
                                    alt={item.product.title}
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-zinc-400">
                                    <Package className="h-6 w-6" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  {isTargetItem ? (
                                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-rose-600 text-white tracking-wide">
                                      This Return Item
                                    </span>
                                  ) : hasReturn ? (
                                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                                      Returned in Another Request
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                      Kept Item (Not Returned)
                                    </span>
                                  )}
                                  <span className="text-xs text-zinc-400">•</span>
                                  <span className="text-xs text-zinc-600 font-medium">
                                    Vendor: {item.vendor?.storeName || vendor?.storeName}
                                  </span>
                                </div>
                                <h4 className="font-bold text-sm text-zinc-900 truncate max-w-md">
                                  {item.product?.title || 'Artisanal Luxury Piece'}
                                </h4>
                                <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                                  <span>SKU: {item.variant?.sku || 'Not recorded'}</span>
                                  <span>Size: {item.variant?.size || item.selectedSize || 'Standard'}</span>
                                  <span>Color: {item.variant?.color || item.selectedColor || 'N/A'}</span>
                                  <span>Qty: {item.quantity}</span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right sm:self-center shrink-0 space-y-1 text-xs">
                              <div className="font-mono font-bold text-sm text-zinc-900">
                                Gross: {formatINR(Number(item.totalPrice))}
                              </div>
                              {couponDisc > 0 && (
                                <div className="text-rose-700 text-[11px] font-medium font-mono">
                                  Coupon Share: -{formatINR(couponDisc)}
                                </div>
                              )}
                              <div className="text-emerald-700 font-bold text-xs font-mono">
                                Net Value: {formatINR(netVal)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* TAB 3: COMPLETE ORDER FINANCIAL BREAKDOWN */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'financials' && (
                <div className="space-y-5 animate-in fade-in">
                  <div className="bg-white p-5 rounded-xl border border-[#D5D9D9] shadow-sm space-y-4">
                    <div className="border-b border-zinc-100 pb-3 flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-base text-[#0F1111]">Transparent Order Financial Breakdown</h3>
                        <p className="text-xs text-zinc-500">
                          Complete audit of subtotal, applied discounts, recorded fees, taxes, and cumulative refunds.
                        </p>
                      </div>
                      <span className="text-xs font-mono font-bold bg-zinc-100 text-zinc-800 px-3 py-1 rounded">
                        Invoice Total: {formatINR(orderTotal)}
                      </span>
                    </div>

                    <div className="divide-y divide-zinc-100 text-xs">
                      <div className="py-2.5 flex justify-between items-center text-zinc-700">
                        <span>Product(s) Subtotal</span>
                        <span className="font-mono font-semibold text-zinc-900">{formatINR(orderSubtotal)}</span>
                      </div>
                      <div className="py-2.5 flex justify-between items-center text-zinc-700">
                        <span>Product-Level Discounts</span>
                        <span className="font-mono text-zinc-600">₹0.00 (None Applied)</span>
                      </div>
                      <div className="py-2.5 flex justify-between items-center text-zinc-700">
                        <span>Coupon / Promotional Discount</span>
                        <span className="font-mono font-semibold text-rose-700">
                          {orderDiscount > 0 ? `-${formatINR(orderDiscount)}` : '₹0.00'}
                        </span>
                      </div>
                      <div className="py-2.5 flex justify-between items-center text-zinc-700">
                        <span>Shipping &amp; Delivery Fee</span>
                        <span className="font-mono font-semibold text-zinc-900">
                          {orderShippingFee > 0 ? formatINR(orderShippingFee) : 'FREE (Complimentary)'}
                        </span>
                      </div>
                      <div className="py-2.5 flex justify-between items-center text-zinc-500">
                        <span>Packaging Fee</span>
                        <span className="italic text-zinc-400">Not recorded</span>
                      </div>
                      <div className="py-2.5 flex justify-between items-center text-zinc-500">
                        <span>Cash on Delivery (COD) Collection Fee</span>
                        <span className="italic text-zinc-400">Not recorded</span>
                      </div>
                      <div className="py-2.5 flex justify-between items-center text-zinc-700">
                        <span>Goods &amp; Services Tax (GST)</span>
                        <span className="font-mono text-zinc-700">
                          {orderTax > 0 ? formatINR(orderTax) : 'Included in product price'}
                        </span>
                      </div>
                      <div className="py-3 flex justify-between items-center text-sm font-bold bg-zinc-50 px-3 rounded-lg border border-zinc-200 mt-2">
                        <span className="text-zinc-900">Total Order Amount (Gross Invoice)</span>
                        <span className="font-mono text-base text-[#007185]">{formatINR(orderTotal)}</span>
                      </div>
                    </div>

                    {/* Settlement & Refund Reconciliations */}
                    <div className="mt-4 pt-4 border-t border-zinc-200 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200">
                        <span className="text-[10px] uppercase font-bold text-emerald-800 block">Amount Collected</span>
                        <span className="text-base font-bold text-emerald-950 font-mono">
                          {order?.paymentStatus === 'PAID' || orderRefunded > 0 ? formatINR(orderTotal) : '₹0.00'}
                        </span>
                        <span className="text-[10px] text-emerald-700 block mt-0.5">
                          Method: {order?.paymentMethod} ({order?.paymentStatus})
                        </span>
                      </div>

                      <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200">
                        <span className="text-[10px] uppercase font-bold text-rose-800 block">Cumulative Refunded</span>
                        <span className="text-base font-bold text-rose-950 font-mono">
                          {formatINR(orderRefunded)}
                        </span>
                        <span className="text-[10px] text-rose-700 block mt-0.5">
                          {orderRefunded >= orderTotal ? '100% Fully Refunded' : orderRefunded > 0 ? 'Partially Refunded' : 'No Refunds Processed'}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-lg bg-zinc-100 border border-zinc-300">
                        <span className="text-[10px] uppercase font-bold text-zinc-600 block">Remaining Balance</span>
                        <span className="text-base font-bold text-zinc-900 font-mono">
                          {formatINR(orderRemainingBalance)}
                        </span>
                        <span className="text-[10px] text-zinc-500 block mt-0.5">
                          Item Refund Ceiling: {formatINR(maxRefundable)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* TAB 4: REFUND HISTORY & EVENT TIMELINE */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'timeline' && (
                <div className="space-y-6 animate-in fade-in">
                  {/* Refund Transactions Table */}
                  <div className="bg-white p-5 rounded-xl border border-[#D5D9D9] shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                      <div>
                        <h3 className="font-bold text-sm text-[#0F1111]">
                          Refund Transactions History ({refundTransactions.length})
                        </h3>
                        <p className="text-xs text-zinc-500">
                          Immutable ledger of all refund disbursements for this return.
                        </p>
                      </div>
                      <span className="text-xs font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded">
                        Total Refunded: {formatINR(confirmedItemRefunds)}
                      </span>
                    </div>

                    {refundTransactions.length === 0 ? (
                      <div className="py-6 text-center text-zinc-400 text-xs italic">
                        No refund transactions have been initiated or confirmed for this request.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-zinc-50 text-zinc-500 uppercase font-semibold text-[10px] border-y border-zinc-200">
                            <tr>
                              <th className="py-2.5 px-3">Transaction ID / Seq</th>
                              <th className="py-2.5 px-3">Disbursed Date</th>
                              <th className="py-2.5 px-3">Mode / Destination</th>
                              <th className="py-2.5 px-3">Reference / UTR</th>
                              <th className="py-2.5 px-3 text-right">Amount</th>
                              <th className="py-2.5 px-3 text-center">Status</th>
                              <th className="py-2.5 px-3">Processor</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 font-mono">
                            {refundTransactions.map((tx: any) => (
                              <tr key={tx.id} className="hover:bg-zinc-50/60">
                                <td className="py-2.5 px-3 font-bold text-zinc-900">
                                  <div>{tx.id.slice(-8)}</div>
                                  <div className="text-[10px] text-zinc-400 font-normal">Seq #{tx.requestSequence}</div>
                                </td>
                                <td className="py-2.5 px-3 text-zinc-700 font-sans">
                                  {tx.processedAt
                                    ? new Date(tx.processedAt).toLocaleString('en-IN', {
                                        day: 'numeric',
                                        month: 'short',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                    : 'Pending'}
                                </td>
                                <td className="py-2.5 px-3 text-zinc-800 font-sans font-medium">
                                  {tx.mode === 'MANUAL_BANK_TRANSFER'
                                    ? 'Verified Bank Account'
                                    : tx.mode === 'STORE_CREDIT'
                                    ? 'Store credit'
                                    : tx.mode === 'ORIGINAL_PAYMENT'
                                    ? 'Original Payment Source'
                                    : 'Refund destination not recorded'}
                                </td>
                                <td className="py-2.5 px-3 text-[#007185] font-bold">
                                  {tx.gatewayReference || tx.referenceNumber || 'Reference not recorded'}
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-rose-700">
                                  {formatINR(Number(tx.amount))}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      tx.status === 'CONFIRMED'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : tx.status === 'FAILED'
                                        ? 'bg-rose-100 text-rose-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {tx.status}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-zinc-400 font-sans italic text-[11px]">
                                  Not recorded (Admin Settlement)
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Return & QC Timeline */}
                  <div className="bg-white p-5 rounded-xl border border-[#D5D9D9] shadow-sm space-y-4">
                    <h3 className="font-bold text-sm text-[#0F1111]">Chronological Return &amp; QC Event Timeline</h3>
                    <div className="space-y-4 pl-2 border-l-2 border-zinc-200 text-xs">
                      {/* Event 1 */}
                      <div className="relative pl-5">
                        <div className="absolute -left-[11px] top-0 w-4 h-4 rounded-full bg-emerald-600 flex items-center justify-center text-white text-[9px]">
                          ✓
                        </div>
                        <div className="font-bold text-zinc-900">Return Requested by Customer</div>
                        <div className="text-zinc-500 text-[11px]">
                          {new Date(returnRequest.createdAt).toLocaleString('en-IN')}
                        </div>
                      </div>

                      {/* Event 2 */}
                      <div className="relative pl-5">
                        <div className={`absolute -left-[11px] top-0 w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] ${
                          returnRequest.pickedUpAt ? 'bg-emerald-600' : 'bg-zinc-300'
                        }`}>
                          {returnRequest.pickedUpAt ? '✓' : '•'}
                        </div>
                        <div className="font-bold text-zinc-900">Reverse Courier Pickup Completed</div>
                        <div className="text-zinc-500 text-[11px]">
                          {returnRequest.pickedUpAt ? new Date(returnRequest.pickedUpAt).toLocaleString('en-IN') : 'Not recorded'}
                        </div>
                      </div>

                      {/* Event 3 */}
                      <div className="relative pl-5">
                        <div className={`absolute -left-[11px] top-0 w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] ${
                          returnRequest.receivedAtWarehouseAt ? 'bg-emerald-600' : 'bg-zinc-300'
                        }`}>
                          {returnRequest.receivedAtWarehouseAt ? '✓' : '•'}
                        </div>
                        <div className="font-bold text-zinc-900">Received at Verification Hub / Warehouse</div>
                        <div className="text-zinc-500 text-[11px]">
                          {returnRequest.receivedAtWarehouseAt ? new Date(returnRequest.receivedAtWarehouseAt).toLocaleString('en-IN') : 'Not recorded'}
                        </div>
                      </div>

                      {/* Event 4 */}
                      <div className="relative pl-5">
                        <div className={`absolute -left-[11px] top-0 w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] ${
                          returnRequest.qcCompletedAt ? (returnRequest.qcPassed ? 'bg-emerald-600' : 'bg-rose-600') : 'bg-zinc-300'
                        }`}>
                          {returnRequest.qcCompletedAt ? '✓' : '•'}
                        </div>
                        <div className="font-bold text-zinc-900">
                          Quality Check (QC): {returnRequest.qcPassed ? 'PASSED' : returnRequest.qcPassed === false ? 'FAILED' : 'Pending'}
                        </div>
                        <div className="text-zinc-500 text-[11px]">
                          {returnRequest.qcCompletedAt ? new Date(returnRequest.qcCompletedAt).toLocaleString('en-IN') : 'Not recorded'}
                        </div>
                        {returnRequest.qcFailedReason && (
                          <div className="text-rose-700 text-[11px] mt-0.5">Reason: {returnRequest.qcFailedReason}</div>
                        )}
                      </div>

                      {/* Event 5 */}
                      <div className="relative pl-5">
                        <div className={`absolute -left-[11px] top-0 w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] ${
                          refundTransactions[0]?.processedAt ? 'bg-emerald-600' : 'bg-zinc-300'
                        }`}>
                          {refundTransactions[0]?.processedAt ? '✓' : '•'}
                        </div>
                        <div className="font-bold text-zinc-900">Admin Refund Processing</div>
                        <div className="text-zinc-500 text-[11px]">
                          {refundTransactions[0]?.processedAt
                            ? new Date(refundTransactions[0].processedAt).toLocaleString('en-IN')
                            : returnRequest.type === 'REPLACEMENT'
                            ? 'Not applicable (Replacement)'
                            : 'Not recorded / Pending'}
                        </div>
                      </div>

                      {/* Event 6 */}
                      {returnRequest.type === 'REPLACEMENT' && (
                        <div className="relative pl-5">
                          <div className={`absolute -left-[11px] top-0 w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] ${
                            returnRequest.replacementDeliveredAt ? 'bg-emerald-600' : 'bg-zinc-300'
                          }`}>
                            {returnRequest.replacementDeliveredAt ? '✓' : '•'}
                          </div>
                          <div className="font-bold text-zinc-900">Forward Replacement Delivery Confirmation</div>
                          <div className="text-zinc-500 text-[11px]">
                            {returnRequest.replacementDeliveredAt
                              ? new Date(returnRequest.replacementDeliveredAt).toLocaleString('en-IN')
                              : 'Not recorded / In transit'}
                          </div>
                        </div>
                      )}

                      {/* Event 7 */}
                      <div className="relative pl-5">
                        <div className={`absolute -left-[11px] top-0 w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] ${
                          returnRequest.status === 'COMPLETED' ? 'bg-emerald-600' : 'bg-zinc-300'
                        }`}>
                          {returnRequest.status === 'COMPLETED' ? '✓' : '•'}
                        </div>
                        <div className="font-bold text-zinc-900">Return Workflow Completed &amp; Closed</div>
                        <div className="text-zinc-500 text-[11px]">
                          {returnRequest.status === 'COMPLETED'
                            ? new Date(returnRequest.updatedAt).toLocaleString('en-IN')
                            : 'Pending final completion'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* TAB 5: VENDOR IMPACT & DEDUCTIONS */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'impact' && (
                <div className="space-y-5 animate-in fade-in">
                  <div className="bg-white p-5 rounded-xl border border-[#D5D9D9] shadow-sm space-y-4">
                    <div className="border-b border-zinc-100 pb-3">
                      <h3 className="font-bold text-sm text-[#0F1111]">
                        Vendor Financial Accounting &amp; Payout Linkage
                      </h3>
                      <p className="text-xs text-zinc-500">
                        Tracks vendor commission, payout settlement state, and adjustment debits recovered via payout offsets.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                        <span className="text-[10px] uppercase font-bold text-zinc-400 block">Item Gross</span>
                        <span className="text-sm font-bold text-zinc-900 font-mono">
                          {formatINR(Number(orderItem?.totalPrice || 0))}
                        </span>
                      </div>
                      <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                        <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                          Commission ({Number(orderItem?.commissionRate || 0)}%)
                        </span>
                        <span className="text-sm font-bold text-[#800020] font-mono">
                          {formatINR(Number(orderItem?.commissionAmount || 0))}
                        </span>
                      </div>
                      <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                        <span className="text-[10px] uppercase font-bold text-zinc-400 block">Vendor Net Earnings</span>
                        <span className="text-sm font-bold text-emerald-700 font-mono">
                          {formatINR(Number(orderItem?.netEarnings || 0))}
                        </span>
                      </div>
                      <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                        <span className="text-[10px] uppercase font-bold text-zinc-400 block">Payout State</span>
                        <span className="text-xs font-bold text-zinc-800">
                          {orderItem?.vendorPayoutId ? 'Settled in Payout' : orderItem?.payoutStatus || 'Pending Payout'}
                        </span>
                      </div>
                    </div>

                    {/* Vendor Adjustments List */}
                    <div className="pt-2">
                      <h4 className="font-bold text-xs text-zinc-900 mb-2">
                        Recorded Vendor Adjustments &amp; Offset Ledger ({vendorAdjustments.length})
                      </h4>
                      {vendorAdjustments.length === 0 ? (
                        <div className="p-4 text-center text-zinc-400 text-xs italic bg-zinc-50 rounded-lg border border-zinc-200">
                          No vendor debit adjustments have been created for this return.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {vendorAdjustments.map((adj: any) => {
                            const totalAllocated = (adj.allocations || []).reduce(
                              (sum: number, a: any) => sum + Number(a.amount),
                              0
                            );
                            const remainingAdj = Math.max(0, Number(adj.amount) - totalAllocated);

                            return (
                              <div key={adj.id} className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-xs space-y-2">
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-zinc-900">Debit Adjustment #{adj.id.slice(-8)}</span>
                                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                                      {adj.type}
                                    </span>
                                  </div>
                                  <span className="font-bold text-sm text-rose-700 font-mono">
                                    -{formatINR(Number(adj.amount))}
                                  </span>
                                </div>
                                <p className="text-zinc-600 text-[11px]">{adj.description}</p>
                                <div className="flex items-center gap-4 text-[11px] text-zinc-500 pt-1 border-t border-zinc-200/60 font-mono">
                                  <span>Allocated to Payouts: {formatINR(totalAllocated)}</span>
                                  <span>Remaining Balance: {formatINR(remainingAdj)}</span>
                                </div>

                                {/* Allocations Table */}
                                {adj.allocations?.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-zinc-200 text-[11px]">
                                    <span className="font-bold text-zinc-700 block mb-1">Deduction Allocations:</span>
                                    <div className="space-y-1">
                                      {adj.allocations.map((alloc: any) => (
                                        <div key={alloc.id} className="flex justify-between text-zinc-600">
                                          <span>
                                            Payout #{alloc.vendorPayoutId?.slice(-8)} ({alloc.vendorPayout?.settlementType})
                                          </span>
                                          <span className="font-mono font-bold text-zinc-800">
                                            Deducted: {formatINR(Number(alloc.amount))}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ============================================================= */}
        {/* MODAL FOOTER: CONTEXTUAL ADMIN ACTIONS */}
        {/* ============================================================= */}
        <div className="bg-white px-6 py-4 border-t border-[#D5D9D9] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Strict Role-Protected Financial Ledger</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#D5D9D9] text-zinc-700 hover:bg-zinc-50 text-xs font-semibold"
            >
              Close Ledger
            </button>

            {returnRequest?.type === 'REPLACEMENT' && returnRequest?.status === 'QC_PASSED' && returnRequest?.replacementDispatchedAt && !returnRequest?.replacementDeliveredAt && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onConfirmDeliveryAction(returnRequest);
                }}
                className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Confirm Delivery</span>
              </button>
            )}

            {isEligibleForRefund && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRefundAction(returnRequest);
                }}
                className="px-4 py-2 rounded-lg bg-[#800020] hover:bg-[#600018] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
              >
                <DollarSign className="h-4 w-4" />
                <span>Process Refund (Up to {formatINR(maxRefundable)})</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
