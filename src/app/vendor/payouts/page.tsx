'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Wallet,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  HelpCircle,
  FileText,
  Building2,
  ArrowUpRight,
  ExternalLink,
} from 'lucide-react';

interface VendorPayoutsData {
  storeName: string;
  platformCommissionRate: number;
  taxPolicy: {
    status: string;
    label: string;
  };
  metrics: {
    pendingBalance: number;
    pendingCommission: number;
    outstandingAdjustments?: number;
    estimatedNextPayout?: number;
    totalPaidOut: number;
    awaitingDeliveryEarnings: number;
    totalLifetimeNetEarnings: number;
  };
  items: Array<{
    id: string;
    orderId: string;
    orderNumber: string;
    orderDate: string;
    deliveryStatus: string;
    orderStatus: string;
    paymentStatus: string;
    paymentMethod: string;
    productTitle: string;
    brand: string;
    sku: string;
    size: string;
    color: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    commissionRate: number | null;
    commissionAmount: number | null;
    commissionTax: number | null;
    netEarnings: number | null;
    payoutStatus: string | null;
    isEligibleForPayout: boolean;
    isLegacy: boolean;
    payoutReference: string | null;
    paidAt: string | null;
  }>;
  adjustments?: Array<{
    id: string;
    amount: number;
    type: string;
    description: string;
    totalAllocated: number;
    outstandingBalance: number;
    createdAt: string;
  }>;
  payouts: Array<{
    id: string;
    amount: number;
    status: string;
    settlementType?: string;
    payoutMethod: string;
    payoutReference: string | null;
    periodStart: string;
    periodEnd: string;
    paidAt: string | null;
    itemCount: number;
    deductionsApplied?: number;
    createdAt: string;
  }>;
}

export default function VendorPayoutsPage() {
  const [data, setData] = useState<VendorPayoutsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'items' | 'batches' | 'adjustments'>('items');

  const fetchPayouts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/vendor/payouts');
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to load earnings and payouts data.');
      }
      setData(json.data);
    } catch (err: any) {
      setError(err.message || 'Unable to load earnings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#D5D9D9] p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#007185] bg-[#E2E7FF] px-2 py-0.5 rounded">
                Seller Financials
              </span>
              <span className="text-xs text-[#565959]">•</span>
              <span className="text-xs text-[#565959]">{data?.storeName || 'Vendor Store'}</span>
            </div>
            <h1 className="text-2xl font-headline font-bold text-[#0F1111] flex items-center gap-2">
              <Wallet className="h-6 w-6 text-[#131921]" />
              Earnings &amp; Payout Settlements
            </h1>
            <p className="text-xs text-[#565959] mt-1">
              Transparent itemized product earnings, platform commission deductions, and direct bank transfer records.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchPayouts}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border border-[#D5D9D9] bg-[#F7F8F8] text-[#0F1111] hover:bg-[#EAEDED] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
          </div>
        </div>

        {/* Financial Policy Pill Bar */}
        <div className="mt-5 pt-4 border-t border-[#EAEDED] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#565959] bg-[#F9FAFA] px-3 py-2 rounded-lg border border-[#EAEDED]">
            <span className="font-semibold text-[#0F1111]">Platform Commission:</span>
            <span className="font-mono font-bold text-[#007185] bg-sky-50 px-1.5 py-0.5 rounded">
              {data ? `${data.platformCommissionRate}%` : '10.00%'}
            </span>
            <span className="text-[10px] text-[#565959]">(Configured standard)</span>
          </div>

          <div className="flex items-center gap-2 text-[#565959] bg-[#F9FAFA] px-3 py-2 rounded-lg border border-[#EAEDED]">
            <span className="font-semibold text-[#0F1111]">Commission Tax:</span>
            <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px]">
              Pending CA confirmation
            </span>
          </div>

          <div className="flex items-center gap-2 text-[#565959] bg-[#F9FAFA] px-3 py-2 rounded-lg border border-[#EAEDED]">
            <span className="font-semibold text-[#0F1111]">Payout Settlement:</span>
            <span className="text-[11px] text-[#0F1111]">Requires delivery &amp; confirmed customer payment</span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-[#D5D9D9] p-5">
            <div className="flex items-center justify-between text-xs text-[#565959] mb-1">
              <span>Ready for Payout</span>
              <Clock className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold font-headline text-emerald-700">
              ₹{data.metrics.pendingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            {(data.metrics.outstandingAdjustments ?? 0) > 0 ? (
              <p className="text-[11px] text-rose-600 mt-1.5 font-semibold">
                Less ₹{(data.metrics.outstandingAdjustments || 0).toFixed(2)} debit deductions (Est: ₹{(data.metrics.estimatedNextPayout || 0).toFixed(2)})
              </p>
            ) : (
              <p className="text-[11px] text-[#565959] mt-1.5">
                Delivered items with confirmed remittance, awaiting next settlement batch.
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-[#D5D9D9] p-5">
            <div className="flex items-center justify-between text-xs text-[#565959] mb-1">
              <span>In-Transit / Unsettled</span>
              <TrendingUp className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold font-headline text-amber-800">
              ₹{data.metrics.awaitingDeliveryEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-[#565959] mt-1.5">
              Items in transit or pending customer delivery / COD collection.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-[#D5D9D9] p-5">
            <div className="flex items-center justify-between text-xs text-[#565959] mb-1">
              <span>Total Paid Out to Bank</span>
              <CheckCircle2 className="h-4 w-4 text-[#007185]" />
            </div>
            <div className="text-2xl font-bold font-headline text-[#007185]">
              ₹{data.metrics.totalPaidOut.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-[#565959] mt-1.5">
              Successfully remitted directly to your bank account with UTR.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-[#D5D9D9] p-5">
            <div className="flex items-center justify-between text-xs text-[#565959] mb-1">
              <span>Lifetime Net Earnings</span>
              <Wallet className="h-4 w-4 text-[#131921]" />
            </div>
            <div className="text-2xl font-bold font-headline text-[#0F1111]">
              ₹{data.metrics.totalLifetimeNetEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-[#565959] mt-1.5">
              Cumulative net earnings generated from delivered product consignments.
            </p>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[#D5D9D9] pb-1">
        <button
          onClick={() => setActiveTab('items')}
          className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-2 ${
            activeTab === 'items'
              ? 'bg-white border-t border-x border-[#D5D9D9] text-[#007185] -mb-[5px] pb-3 shadow-sm'
              : 'text-[#565959] hover:text-[#0F1111]'
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          Product-wise Earnings Breakdown ({data?.items.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('batches')}
          className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-2 ${
            activeTab === 'batches'
              ? 'bg-white border-t border-x border-[#D5D9D9] text-[#007185] -mb-[5px] pb-3 shadow-sm'
              : 'text-[#565959] hover:text-[#0F1111]'
          }`}
        >
          <Building2 className="h-3.5 w-3.5" />
          Bank Settlement Batches ({data?.payouts.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('adjustments')}
          className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-2 ${
            activeTab === 'adjustments'
              ? 'bg-white border-t border-x border-[#D5D9D9] text-[#007185] -mb-[5px] pb-3 shadow-sm'
              : 'text-[#565959] hover:text-[#0F1111]'
          }`}
        >
          <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
          Debit Adjustments &amp; Offsets ({data?.adjustments?.length || 0})
        </button>
      </div>

      {/* Tab 1: Product-wise Items Table */}
      {activeTab === 'items' && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#D5D9D9] overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-[#565959]">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-[#007185]" />
              Loading product financial entries...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-xs text-rose-600 space-y-2">
              <AlertCircle className="h-6 w-6 mx-auto text-rose-500" />
              <p>{error}</p>
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#565959] space-y-2">
              <Wallet className="h-8 w-8 mx-auto text-neutral-300" />
              <p className="font-bold text-[#0F1111]">No product order items found.</p>
              <p>When customers order your products, itemized earnings and commission will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F7F8F8] border-b border-[#D5D9D9] text-[#565959] font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Order &amp; Date</th>
                    <th className="py-3 px-4">Product / SKU</th>
                    <th className="py-3 px-4">Delivery / Payment</th>
                    <th className="py-3 px-4 text-right">Selling Price</th>
                    <th className="py-3 px-4 text-right">Commission</th>
                    <th className="py-3 px-4 text-right">Net Earnings</th>
                    <th className="py-3 px-4 text-center">Payout Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAEDED]">
                  {data.items.map((it) => (
                    <tr key={it.id} className="hover:bg-[#F9FAFA] transition-colors">
                      <td className="py-3.5 px-4 font-mono">
                        <span className="font-bold text-[#0F1111] block">#{it.orderNumber}</span>
                        <span className="text-[11px] text-[#565959]">
                          {new Date(it.orderDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 max-w-[200px]">
                        <span className="font-bold text-[#0F1111] block truncate" title={it.productTitle}>
                          {it.productTitle}
                        </span>
                        <span className="text-[10px] text-[#565959] block font-mono">
                          SKU: {it.sku} • {it.size} / {it.color} • Qty: {it.quantity}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span
                            className={`inline-block w-fit px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              it.deliveryStatus === 'DELIVERED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : it.deliveryStatus === 'SHIPPED'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {it.deliveryStatus}
                          </span>
                          <span className="text-[10px] text-[#565959]">
                            {it.paymentMethod} •{' '}
                            <strong className={it.paymentStatus === 'PAID' ? 'text-emerald-700' : 'text-amber-700'}>
                              {it.paymentStatus}
                            </strong>
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono">
                        <span className="font-bold text-[#0F1111]">₹{it.totalPrice.toFixed(2)}</span>
                        <span className="text-[10px] text-[#565959] block">
                          ₹{it.unitPrice.toFixed(2)} × {it.quantity}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono">
                        {it.isLegacy ? (
                          <span className="text-[10px] text-[#565959] italic">—</span>
                        ) : (
                          <>
                            <span className="font-bold text-[#565959]">₹{it.commissionAmount?.toFixed(2)}</span>
                            <span className="text-[10px] text-[#565959] block">({it.commissionRate}%)</span>
                          </>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono">
                        {it.isLegacy ? (
                          <span className="text-[10px] text-[#565959] italic">—</span>
                        ) : (
                          <span className="font-bold text-emerald-700 text-sm">
                            ₹{it.netEarnings?.toFixed(2)}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {it.isLegacy ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-600 border border-neutral-200">
                            Legacy Pre-Phase-11
                          </span>
                        ) : it.payoutStatus === 'COMPLETED' ? (
                          <div className="flex flex-col items-center">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              SETTLED
                            </span>
                            {it.payoutReference && (
                              <span className="text-[9px] text-[#565959] font-mono mt-0.5 truncate max-w-[90px]" title={it.payoutReference}>
                                UTR: {it.payoutReference}
                              </span>
                            )}
                          </div>
                        ) : it.isEligibleForPayout ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                            Ready for Settlement
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Awaiting Delivery/Payment
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Payout Batches Table */}
      {activeTab === 'batches' && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#D5D9D9] overflow-hidden">
          {!data || data.payouts.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#565959] space-y-2">
              <Building2 className="h-8 w-8 mx-auto text-neutral-300" />
              <p className="font-bold text-[#0F1111]">No bank settlements processed yet.</p>
              <p>When platform administrators remit earnings to your bank account, official settlement receipts and UTRs will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F7F8F8] border-b border-[#D5D9D9] text-[#565959] font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Settlement Batch ID</th>
                    <th className="py-3 px-4">Remittance Date</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4">Bank UTR / Reference</th>
                    <th className="py-3 px-4 text-center">Items Settled</th>
                    <th className="py-3 px-4 text-right">Amount Remitted</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAEDED]">
                  {data.payouts.map((p) => (
                    <tr key={p.id} className="hover:bg-[#F9FAFA] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0F1111]">
                        {p.id.slice(-8).toUpperCase()}
                      </td>
                      <td className="py-3.5 px-4 text-[#565959]">
                        {p.paidAt
                          ? new Date(p.paidAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Pending'}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#0F1111]">
                        {p.payoutMethod.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-[#007185]">
                        {p.payoutReference || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="bg-[#E2E7FF] text-[#007185] font-bold px-2 py-0.5 rounded text-[11px]">
                          {p.itemCount} items
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 text-sm">
                        ₹{p.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Debit Adjustments & Deductions */}
      {activeTab === 'adjustments' && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#D5D9D9] overflow-hidden">
          {!data || !data.adjustments || data.adjustments.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#565959] space-y-2">
              <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500" />
              <p className="font-bold text-[#0F1111]">No debit adjustments or deductions recorded.</p>
              <p>Your store has no outstanding refund debits, damage fees, or penalties.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F7F8F8] border-b border-[#D5D9D9] text-[#565959] font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Adjustment ID</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Date Recorded</th>
                    <th className="py-3 px-4 text-right">Original Amount</th>
                    <th className="py-3 px-4 text-right">Deducted to Date</th>
                    <th className="py-3 px-4 text-right">Remaining Balance</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAEDED]">
                  {data.adjustments.map((adj) => (
                    <tr key={adj.id} className="hover:bg-[#F9FAFA] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0F1111]">
                        {adj.id.slice(-8).toUpperCase()}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#0F1111]">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200">
                          {adj.type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#565959] max-w-xs truncate" title={adj.description}>
                        {adj.description}
                      </td>
                      <td className="py-3.5 px-4 text-[#565959]">
                        {new Date(adj.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-600">
                        ₹{adj.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-[#007185] font-semibold">
                        ₹{adj.totalAllocated.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-[#0F1111]">
                        ₹{adj.outstandingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {adj.outstandingBalance === 0 ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                            SETTLED
                          </span>
                        ) : adj.totalAllocated > 0 ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-800">
                            PARTIALLY DEDUCTED
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                            OUTSTANDING
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
