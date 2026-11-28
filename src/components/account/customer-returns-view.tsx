'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  RotateCcw,
  RefreshCw,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Building2,
  Search,
  Filter,
  ArrowRight,
  HelpCircle,
  Sparkles,
  Check,
  X,
} from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { getCourierTrackingUrl } from '@/lib/courier-tracking';

import { CometSpinner } from '@/components/ui/loading-spinner';
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
  adminNotes?: string | null;
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
}

export function CustomerReturnsView() {
  const [returns, setReturns] = useState<ReturnItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchReturns = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/returns?limit=50');
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setReturns(json.data.returns || []);
      } else {
        setError(json.error?.message || 'Failed to fetch return orders.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching returns.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  const formatReasonText = (reason: string) => {
    switch (reason) {
      case 'DAMAGED_ON_ARRIVAL':
        return 'Damaged on Arrival (Transit Damage)';
      case 'DEFECTIVE':
        return 'Defective / Workmanship Flaw';
      case 'WRONG_ITEM':
        return 'Wrong Item / Variant Delivered';
      case 'SIZE_FIT_ISSUE':
        return 'Size or Fit Issue';
      case 'NOT_AS_DESCRIBED':
        return 'Item Does Not Match Description';
      case 'QUALITY_NOT_EXPECTED':
        return 'Quality Below Luxury Standard';
      case 'BUYER_REMORSE':
        return 'Changed Mind / Preference';
      default:
        return reason.replace(/_/g, ' ');
    }
  };

  const filteredReturns = returns.filter((r) => {
    if (filterType === 'RETURN_REFUND' && r.type !== 'RETURN_REFUND') return false;
    if (filterType === 'REPLACEMENT' && r.type !== 'REPLACEMENT') return false;
    if (filterType === 'IN_PROGRESS' && (r.status === 'COMPLETED' || r.status === 'REJECTED' || r.status === 'CANCELLED')) return false;
    if (filterType === 'COMPLETED' && r.status !== 'COMPLETED') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.orderNumber.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.item.title.toLowerCase().includes(q) ||
        r.vendor.storeName.toLowerCase().includes(q) ||
        (r.reverseTrackingNumber && r.reverseTrackingNumber.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 shadow-sm border border-[#D5D9D9] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#007185] mb-1">
            <RotateCcw className="h-4 w-4" />
            <span>Reverse Logistics &amp; Settlements</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#0F1111]">
            Returns, Exchanges &amp; Refunds
          </h1>
          <p className="text-xs text-[#565959] mt-1 max-w-2xl leading-relaxed">
            Live reverse tracking for your returned items. Track doorstep pickup, warehouse arrival, quality check (QC), replacement dispatch, and instant bank refund credit status.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchReturns}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#F7F8F8] border border-[#D5D9D9] hover:bg-[#EAEDED] text-xs font-bold text-[#0F1111] transition-colors shrink-0 disabled:opacity-50"
        >
          {isLoading ? <CometSpinner className="h-4 w-4 text-[#007185]" decorative /> : <RefreshCw className="h-4 w-4 text-[#007185]" />}
          <span>Refresh Tracking</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#D5D9D9] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
          {[
            { id: 'ALL', label: 'All Requests' },
            { id: 'IN_PROGRESS', label: 'In Progress' },
            { id: 'RETURN_REFUND', label: 'Returns for Refund' },
            { id: 'REPLACEMENT', label: 'Replacements' },
            { id: 'COMPLETED', label: 'Completed & Settled' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterType(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg font-bold whitespace-nowrap transition-colors ${
                filterType === tab.id
                  ? 'bg-[#131921] text-[#FFD814]'
                  : 'bg-[#F7F8F8] text-[#0F1111] border border-[#D5D9D9] hover:bg-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="h-4 w-4 text-[#565959] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order #, Item, AWB..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-[#D5D9D9] focus:outline-none focus:ring-2 focus:ring-[#FF9900]/30 text-[#0F1111]"
          />
        </div>
      </div>

      {/* Main Returns List */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-[#D5D9D9] p-12 text-center text-xs text-[#565959]">
          <CometSpinner className="h-12 w-12 mx-auto mb-3 block text-[#007185]" />
          <p className="font-bold text-sm text-[#0F1111]">Retrieving Return &amp; Refund Records...</p>
          <p className="text-xs text-[#565959] mt-1">Connecting to live courier reverse logistics tracking.</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center text-xs text-rose-700 space-y-2">
          <AlertCircle className="h-7 w-7 text-rose-600 mx-auto" />
          <p className="font-bold text-sm">{error}</p>
          <button
            onClick={fetchReturns}
            className="px-4 py-2 bg-rose-50 border border-rose-300 rounded-lg font-bold text-rose-800 hover:bg-rose-100"
          >
            Try Again
          </button>
        </div>
      ) : filteredReturns.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#D5D9D9] p-12 text-center space-y-3">
          <RotateCcw className="h-10 w-10 text-neutral-300 mx-auto" />
          <h3 className="text-base font-bold text-[#0F1111]">No Return or Exchange Requests Found</h3>
          <p className="text-xs text-[#565959] max-w-md mx-auto">
            You currently do not have any items under return inspection, replacement exchange, or refund processing.
          </p>
          <Link
            href="/account?tab=orders"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] font-bold text-xs rounded-lg shadow-sm"
          >
            <span>View Delivered Orders</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredReturns.map((ret) => {
            const isRefund = ret.type === 'RETURN_REFUND';
            const confirmedRefund = ret.refunds?.find((r) => r.status === 'CONFIRMED');
            const pendingRefund = ret.refunds?.find((r) => r.status === 'INITIATED' || r.status === 'GATEWAY_PENDING');
            const reverseTrackingUrl = getCourierTrackingUrl(ret.reverseCourierPartner, ret.reverseTrackingNumber);
            const replacementTrackingUrl = getCourierTrackingUrl(ret.replacementCourierPartner, ret.replacementTrackingNumber);

            // Determine active step index (0 to 4)
            // 0: Requested
            // 1: Picked Up by Boy
            // 2: Received at WH
            // 3: QC Passed
            // 4: Refund Credited / Replacement Done
            let stepIndex = 0;
            if (ret.status === 'PICKED_UP') stepIndex = 1;
            else if (ret.status === 'RECEIVED_AT_WH') stepIndex = 2;
            else if (ret.status === 'QC_PASSED') stepIndex = 3;
            else if (ret.status === 'REFUND_OFFERED' || ret.status === 'COMPLETED' || confirmedRefund) stepIndex = 4;

            const isRejected = ret.status === 'REJECTED' || ret.status === 'QC_FAILED';

            return (
              <div
                key={ret.id}
                className="bg-white rounded-2xl border border-[#D5D9D9] shadow-sm overflow-hidden hover:border-[#007185]/40 transition-all"
              >
                {/* Card Top Bar */}
                <div className="bg-[#F7F8F8] px-5 py-3.5 border-b border-[#EAEDED] flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                        isRefund
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : 'bg-purple-50 text-purple-800 border border-purple-200'
                      }`}
                    >
                      {isRefund ? 'Return for Refund' : 'Size Replacement'}
                    </span>

                    <span className="font-mono text-[#565959]">
                      Req ID: <strong className="text-[#0F1111]">#{ret.id.slice(0, 12)}</strong>
                    </span>

                    <span className="text-[#565959]">
                      Requested on:{' '}
                      <strong className="text-[#0F1111]">
                        {new Date(ret.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[#565959]">Original Order:</span>
                    <Link
                      href="/account?tab=orders"
                      className="font-bold text-[#007185] hover:underline font-mono"
                    >
                      #{ret.orderNumber}
                    </Link>
                  </div>
                </div>

                {/* Product Dossier & Reason */}
                <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-start border-b border-[#EAEDED]">
                  {/* Product Details (Col 1-7) */}
                  <div className="md:col-span-7 flex items-start gap-4">
                    <div className="relative h-20 w-20 rounded-xl overflow-hidden bg-neutral-100 border border-[#D5D9D9] shrink-0">
                      {ret.item.image ? (
                        <Image
                          src={ret.item.image}
                          alt={ret.item.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <Package className="h-8 w-8 text-neutral-400 m-auto mt-6" />
                      )}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#007185]">
                        {ret.item.brand}
                      </span>
                      <h4 className="text-sm font-bold text-[#0F1111] leading-snug truncate">
                        {ret.item.title}
                      </h4>
                      <p className="text-xs text-[#565959]">
                        Size: <strong className="text-[#0F1111]">{ret.item.size}</strong> • Color:{' '}
                        <strong className="text-[#0F1111]">{ret.item.color}</strong> • Qty:{' '}
                        <strong className="text-[#0F1111]">{ret.requestedQuantity}</strong>
                      </p>
                      <p className="text-xs font-bold text-[#0F1111]">
                        Item Value: {formatINR(ret.item.totalPrice || ret.item.unitPrice)}
                      </p>
                      <span className="inline-block text-[10px] font-semibold text-[#565959] bg-[#F7F8F8] px-2 py-0.5 rounded border border-[#D5D9D9]">
                        Sold by: {ret.vendor.storeName}
                      </span>
                    </div>
                  </div>

                  {/* Return Reason & Notes (Col 8-12) */}
                  <div className="md:col-span-5 bg-[#F9FAFA] rounded-xl p-3.5 border border-[#EAEDED] text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[#565959] font-semibold">Reason Reported:</span>
                      <span className="font-bold text-[#0F1111] text-[11px]">
                        {formatReasonText(ret.reason)}
                      </span>
                    </div>

                    {ret.detailedReason && (
                      <div>
                        <span className="text-[11px] text-[#565959]">Customer Note:</span>
                        <p className="text-xs text-[#0F1111] italic mt-0.5">&ldquo;{ret.detailedReason}&rdquo;</p>
                      </div>
                    )}

                    {ret.customerNotes && (
                      <div className="pt-1 border-t border-[#EAEDED]">
                        <span className="text-[11px] text-[#007185] font-semibold">Pickup Instruction:</span>
                        <p className="text-xs text-[#0F1111]">{ret.customerNotes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Live Reverse Tracking Stepper */}
                <div className="p-5 sm:p-6 bg-white space-y-6">
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-[#565959] mb-4 flex items-center gap-2">
                      <Truck className="h-4 w-4 text-[#007185]" />
                      <span>Live Reverse Logistics &amp; Settlement Stepper</span>
                    </h5>

                    {/* Progress Bar & Steps */}
                    <div className="relative">
                      {/* Connecting Line */}
                      <div className="absolute top-4 left-6 right-6 h-1 bg-[#EAEDED] -z-0 hidden sm:block">
                        <div
                          className={`h-full transition-all duration-500 ${
                            isRejected
                              ? 'bg-rose-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{
                            width: `${isRejected ? 100 : (stepIndex / 4) * 100}%`,
                          }}
                        />
                      </div>

                      {/* 5 Milestones */}
                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative z-10 text-xs">
                        {/* 1. Request Submitted */}
                        <div className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2">
                          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
                            <Check className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-bold text-[#0F1111] block">1. Return Raised</span>
                            <span className="text-[11px] text-[#565959]">
                              {new Date(ret.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                            <span className="text-[10px] text-emerald-700 font-semibold block">Authorized</span>
                          </div>
                        </div>

                        {/* 2. Pickup Boy Collection */}
                        <div className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-sm shrink-0 ${
                              stepIndex >= 1
                                ? 'bg-emerald-600 text-white'
                                : 'bg-[#EAEDED] text-[#565959]'
                            }`}
                          >
                            {stepIndex >= 1 ? <Check className="h-4 w-4" /> : '2'}
                          </div>
                          <div>
                            <span className="font-bold text-[#0F1111] block">2. Doorstep Pickup</span>
                            {ret.pickedUpAt ? (
                              <span className="text-[11px] text-emerald-700 font-semibold block">
                                Picked Up by Boy
                              </span>
                            ) : (
                              <span className="text-[11px] text-amber-700 font-semibold block">
                                Pickup Scheduled
                              </span>
                            )}
                            {ret.reverseCourierPartner && (
                              <span className="text-[10px] text-[#565959] block">
                                {ret.reverseCourierPartner}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 3. In Transit to Warehouse */}
                        <div className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-sm shrink-0 ${
                              stepIndex >= 2
                                ? 'bg-emerald-600 text-white'
                                : 'bg-[#EAEDED] text-[#565959]'
                            }`}
                          >
                            {stepIndex >= 2 ? <Check className="h-4 w-4" /> : '3'}
                          </div>
                          <div>
                            <span className="font-bold text-[#0F1111] block">3. In Transit</span>
                            {ret.receivedAtWarehouseAt ? (
                              <span className="text-[11px] text-emerald-700 font-semibold block">
                                Reached WH Hub
                              </span>
                            ) : stepIndex >= 1 ? (
                              <span className="text-[11px] text-blue-700 font-semibold block">
                                On the Way to WH
                              </span>
                            ) : (
                              <span className="text-[11px] text-[#565959] block">Pending Pickup</span>
                            )}
                          </div>
                        </div>

                        {/* 4. Warehouse Quality Check (QC) */}
                        <div className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-sm shrink-0 ${
                              isRejected
                                ? 'bg-rose-600 text-white'
                                : stepIndex >= 3
                                ? 'bg-emerald-600 text-white'
                                : 'bg-[#EAEDED] text-[#565959]'
                            }`}
                          >
                            {isRejected ? (
                              <X className="h-4 w-4" />
                            ) : stepIndex >= 3 ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              '4'
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-[#0F1111] block">4. Quality Check</span>
                            {isRejected ? (
                              <span className="text-[11px] text-rose-700 font-bold block">QC Failed</span>
                            ) : ret.qcPassed ? (
                              <span className="text-[11px] text-emerald-700 font-bold block">QC Passed ✓</span>
                            ) : stepIndex >= 2 ? (
                              <span className="text-[11px] text-blue-700 font-semibold block">Inspection Ongoing</span>
                            ) : (
                              <span className="text-[11px] text-[#565959] block">Awaiting Arrival</span>
                            )}
                          </div>
                        </div>

                        {/* 5. Refund Settled / Replacement Delivered */}
                        <div className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-sm shrink-0 ${
                              stepIndex >= 4
                                ? 'bg-emerald-600 text-white'
                                : 'bg-[#EAEDED] text-[#565959]'
                            }`}
                          >
                            {stepIndex >= 4 ? <Check className="h-4 w-4" /> : '5'}
                          </div>
                          <div>
                            <span className="font-bold text-[#0F1111] block">
                              {isRefund ? '5. Refund Credited' : '5. Replacement'}
                            </span>
                            {stepIndex >= 4 ? (
                              <span className="text-[11px] text-emerald-700 font-bold block">
                                {isRefund ? 'Money Transferred' : 'Item Dispatched'}
                              </span>
                            ) : (
                              <span className="text-[11px] text-[#565959] block">
                                {isRefund ? 'Post QC Settlement' : 'Exchange Pending'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Financial Settlement & AWB Banner */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {/* Reverse Tracking Info Card */}
                    <div className="bg-[#F7F8F8] p-4 rounded-xl border border-[#D5D9D9] text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#0F1111] flex items-center gap-1.5">
                          <Truck className="h-4 w-4 text-[#007185]" />
                          <span>Reverse Courier Logistics</span>
                        </span>
                        {ret.reverseCourierPartner && (
                          <span className="font-bold text-[#007185] bg-[#E2E7FF] px-2 py-0.5 rounded text-[11px]">
                            {ret.reverseCourierPartner}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[#565959]">Reverse Tracking AWB:</span>
                          {ret.reverseTrackingNumber ? (
                            <span className="font-mono font-bold text-[#0F1111] flex items-center gap-1">
                              {ret.reverseTrackingNumber}
                              {reverseTrackingUrl && (
                                <a
                                  href={reverseTrackingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#007185] hover:underline"
                                  title="Track reverse parcel on carrier site"
                                >
                                  <ExternalLink className="h-3 w-3 inline" />
                                </a>
                              )}
                            </span>
                          ) : (
                            <span className="text-[#757684] italic">Generating Reverse AWB...</span>
                          )}
                        </div>

                        {ret.pickedUpAt && (
                          <div className="flex items-center justify-between">
                            <span className="text-[#565959]">Doorstep Picked Up On:</span>
                            <span className="font-semibold text-[#0F1111]">
                              {new Date(ret.pickedUpAt).toLocaleString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        )}

                        {ret.receivedAtWarehouseAt && (
                          <div className="flex items-center justify-between">
                            <span className="text-[#565959]">Arrived at Hub:</span>
                            <span className="font-semibold text-emerald-700">
                              {new Date(ret.receivedAtWarehouseAt).toLocaleString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Refund or Replacement Settlement Status Card */}
                    {isRefund ? (
                      <div
                        className={`p-4 rounded-xl border text-xs space-y-2 ${
                          confirmedRefund
                            ? 'bg-emerald-50/70 border-emerald-300'
                            : pendingRefund
                            ? 'bg-amber-50/70 border-amber-300'
                            : 'bg-[#F7F8F8] border-[#D5D9D9]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#0F1111] flex items-center gap-1.5">
                            <CreditCard className="h-4 w-4 text-[#007185]" />
                            <span>Bank / Account Refund Status</span>
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              confirmedRefund
                                ? 'bg-emerald-600 text-white'
                                : pendingRefund
                                ? 'bg-amber-200 text-amber-900'
                                : 'bg-neutral-200 text-neutral-800'
                            }`}
                          >
                            {confirmedRefund
                              ? 'Refund Transferred'
                              : pendingRefund
                              ? 'Transfer In Progress'
                              : 'Pending QC Approval'}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[#565959]">Total Refund Amount:</span>
                            <span className="font-bold text-sm text-[#0F1111]">
                              {formatINR(
                                confirmedRefund?.amount ||
                                  pendingRefund?.amount ||
                                  ret.item.totalPrice ||
                                  ret.item.unitPrice
                              )}
                            </span>
                          </div>

                          {confirmedRefund?.gatewayReference ? (
                            <div className="flex items-center justify-between">
                              <span className="text-[#565959]">Bank UTR / Ref Number:</span>
                              <span className="font-mono font-bold text-emerald-800 bg-emerald-100/80 px-1.5 py-0.2 rounded">
                                {confirmedRefund.gatewayReference}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <span className="text-[#565959]">Credited To:</span>
                              <span className="font-semibold text-[#0F1111]">
                                Original Payment Source / Bank Account
                              </span>
                            </div>
                          )}

                          {confirmedRefund?.processedAt ? (
                            <div className="flex items-center justify-between">
                              <span className="text-[#565959]">Transfer Cleared At:</span>
                              <span className="font-semibold text-emerald-700">
                                {new Date(confirmedRefund.processedAt).toLocaleString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          ) : (
                            <p className="text-[11px] text-[#565959] mt-1">
                              After the quality check, the refund goes to your original payment method. Banks usually take 5–7 business days.
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Replacement Info Card */
                      <div className="bg-[#F7F8F8] p-4 rounded-xl border border-[#D5D9D9] text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#0F1111] flex items-center gap-1.5">
                            <RefreshCw className="h-4 w-4 text-purple-700" />
                            <span>Exchange Package Status</span>
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-100 text-purple-800">
                            {ret.replacementTrackingNumber ? 'Dispatched' : 'Preparing New Size'}
                          </span>
                        </div>

                        <div className="space-y-1">
                          {ret.replacementCourierPartner && (
                            <div className="flex items-center justify-between">
                              <span className="text-[#565959]">Courier:</span>
                              <span className="font-bold text-[#0F1111]">{ret.replacementCourierPartner}</span>
                            </div>
                          )}

                          {ret.replacementTrackingNumber && (
                            <div className="flex items-center justify-between">
                              <span className="text-[#565959]">Forward AWB:</span>
                              <span className="font-mono font-bold text-[#007185] flex items-center gap-1">
                                {ret.replacementTrackingNumber}
                                {replacementTrackingUrl && (
                                  <a
                                    href={replacementTrackingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#007185] hover:underline"
                                    title="Track replacement parcel"
                                  >
                                    <ExternalLink className="h-3 w-3 inline" />
                                  </a>
                                )}
                              </span>
                            </div>
                          )}

                          <p className="text-[11px] text-[#565959]">
                            QC pass hone ke baad naya exchange size piece direct dispatch kar diya jata hai.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
