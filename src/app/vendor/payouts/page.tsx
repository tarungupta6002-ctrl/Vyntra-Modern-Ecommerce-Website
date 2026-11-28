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
import { VendorPageHeader, VendorStats, vendorButton } from '@/components/vendor/vendor-ui';

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
    /** Set when the item was cancelled or returned before payout: it earns nothing. */
    voidReason?: 'CANCELLED' | 'RETURNED' | null;
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

function rupees(n: number) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
      <VendorPageHeader
        title="Earnings & payouts"
        description="What each sale earned you after commission, and the payouts sent to your bank."
        actions={
          <button onClick={fetchPayouts} disabled={isLoading} className={vendorButton.secondary}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-xl border border-[#D5D9D9] bg-white px-4 py-3">
          <p className="text-xs text-[#565959]">Commission</p>
          <p className="mt-0.5 font-semibold">{data ? `${data.platformCommissionRate}% of each sale` : '—'}</p>
        </div>
        <div className="rounded-xl border border-[#D5D9D9] bg-white px-4 py-3">
          <p className="text-xs text-[#565959]">Tax on commission</p>
          <p className="mt-0.5 font-semibold text-[#B7791F]">Pending CA confirmation</p>
        </div>
        <div className="rounded-xl border border-[#D5D9D9] bg-white px-4 py-3">
          <p className="text-xs text-[#565959]">When you get paid</p>
          <p className="mt-0.5 font-semibold">After delivery and confirmed payment</p>
        </div>
      </div>

      {data && (
        <VendorStats
          items={[
            {
              label: 'Ready for payout',
              value: rupees(data.metrics.pendingBalance),
              tone: 'good',
              hint:
                (data.metrics.outstandingAdjustments ?? 0) > 0
                  ? `Less ${rupees(data.metrics.outstandingAdjustments || 0)} in deductions; about ${rupees(data.metrics.estimatedNextPayout || 0)} will be paid`
                  : 'Delivered and paid; goes in the next payout',
            },
            { label: 'Not yet delivered', value: rupees(data.metrics.awaitingDeliveryEarnings), hint: 'Earned once delivered and paid' },
            { label: 'Paid to your bank', value: rupees(data.metrics.totalPaidOut) },
            { label: 'Total earned', value: rupees(data.metrics.totalLifetimeNetEarnings), hint: 'After commission, all time' },
          ]}
        />
      )}

      {/* Tabs */}
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-[#D5D9D9]">
        {(
          [
            ['items', 'Earnings by item', data?.items.length || 0],
            ['batches', 'Payouts to bank', data?.payouts.length || 0],
            ['adjustments', 'Deductions', data?.adjustments?.length || 0],
          ] as const
        ).map(([key, label, count]) => (
          <button
            key={key}
            role="tab"
            aria-selected={activeTab === key}
            onClick={() => setActiveTab(key)}
            className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === key ? 'border-[#F2B705] text-[#0F1111]' : 'border-transparent text-[#565959] hover:text-[#0F1111]'
            }`}
          >
            {label} <span className="ml-1 text-xs font-normal text-[#6F7373]">{count}</span>
          </button>
        ))}
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
                        <span className="font-bold text-[#0F1111]">{rupees(it.totalPrice)}</span>
                        <span className="text-[10px] text-[#565959] block">
                          {rupees(it.unitPrice)} × {it.quantity}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono">
                        {it.isLegacy || it.voidReason ? (
                          <span className="text-[10px] text-[#565959] italic">—</span>
                        ) : (
                          <>
                            <span className="font-bold text-[#565959]">{rupees(it.commissionAmount ?? 0)}</span>
                            <span className="text-[10px] text-[#565959] block">({it.commissionRate}%)</span>
                          </>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono">
                        {it.isLegacy ? (
                          <span className="text-[10px] text-[#565959] italic">—</span>
                        ) : it.voidReason ? (
                          <span className="font-bold text-[#6F7373] text-sm">{rupees(0)}</span>
                        ) : (
                          <span className="font-bold text-emerald-700 text-sm">
                            {rupees(it.netEarnings ?? 0)}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {it.isLegacy ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-600 border border-neutral-200">
                            Legacy Pre-Phase-11
                          </span>
                        ) : it.voidReason ? (
                          <span
                            className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F0F2F2] text-[#565959] border border-[#D5D9D9]"
                            title="No commission is charged and nothing is paid for this item."
                          >
                            {it.voidReason === 'CANCELLED' ? 'Cancelled · no earnings' : 'Returned · no earnings'}
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
