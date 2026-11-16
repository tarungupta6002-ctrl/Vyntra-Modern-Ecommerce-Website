'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Wallet,
  Settings,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Building2,
  FileText,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  ShieldCheck,
  History,
  CreditCard,
  ArrowDownLeft,
  Package,
} from 'lucide-react';

export interface SettledProductItem {
  id: string;
  orderId: string;
  orderNumber: string;
  orderDate: string;
  paymentMethod: string;
  productTitle: string;
  brand: string;
  image?: string | null;
  sku: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  commissionRate: number;
  commissionAmount: number;
  netEarnings: number;
  payoutReference: string;
  payoutDate: string | null;
  settlementType: string;
}

interface VendorSummary {
  vendorId: string;
  storeName: string;
  storeSlug: string;
  vendorStatus: string;
  contactEmail: string;
  contactName: string;
  eligibleItemCount: number;
  pendingGross: number;
  pendingCommission: number;
  pendingNetPayout: number;
  outstandingAdjustments?: number;
  projectedNetPayout?: number;
  totalPaidOut: number;
  lastPayoutDate: string | null;
  eligibleItems: Array<{
    id: string;
    orderNumber: string;
    orderDate: string;
    paymentMethod: string;
    productTitle: string;
    brand: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    commissionRate: number;
    commissionAmount: number;
    netEarnings: number;
    isLegacy: boolean;
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
  settledItems?: SettledProductItem[];
  recentPayouts: Array<{
    id: string;
    amount: number;
    settlementType?: string;
    payoutMethod: string;
    payoutReference: string;
    paidAt: string;
  }>;
}

interface AdminPayoutsData {
  platformCommissionRate: number;
  taxPolicy: {
    status: string;
    label: string;
  };
  summary: {
    totalPendingPayouts: number;
    totalPendingCommission: number;
    totalCompletedPayouts: number;
    totalEligibleItems: number;
    totalVendors: number;
  };
  vendors: VendorSummary[];
}

export default function AdminPayoutsPage() {
  const [data, setData] = useState<AdminPayoutsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedVendorId, setExpandedVendorId] = useState<string | null>(null);

  // Commission Edit Modal State
  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false);
  const [newCommissionRate, setNewCommissionRate] = useState<string>('10.00');
  const [isUpdatingCommission, setIsUpdatingCommission] = useState(false);
  const [commissionSuccessMsg, setCommissionSuccessMsg] = useState<string | null>(null);

  // Settlement Processing Modal State
  const [settlementVendor, setSettlementVendor] = useState<VendorSummary | null>(null);
  const [payoutReference, setPayoutReference] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('BANK_TRANSFER');
  const [isProcessingSettlement, setIsProcessingSettlement] = useState(false);
  const [settlementError, setSettlementError] = useState<string | null>(null);

  // Modals for Product-Level Payout History, Adjustments, and All-Vendor Ledger
  const [activeHistoryModalVendor, setActiveHistoryModalVendor] = useState<VendorSummary | null>(null);
  const [activeAdjustmentsModalVendor, setActiveAdjustmentsModalVendor] = useState<VendorSummary | null>(null);
  const [allVendorsLedgerOpen, setAllVendorsLedgerOpen] = useState(false);
  const [ledgerSearch, setLedgerSearch] = useState('');

  const fetchAdminPayouts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/payouts');
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to fetch admin payouts summary.');
      }
      setData(json.data);
      setNewCommissionRate(json.data.platformCommissionRate.toFixed(2));
    } catch (err: any) {
      setError(err.message || 'Error loading platform payouts.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminPayouts();
  }, []);

  const handleUpdateCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingCommission(true);
    setCommissionSuccessMsg(null);
    try {
      const rateNum = parseFloat(newCommissionRate);
      if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) {
        throw new Error('Please enter a valid commission percentage between 0 and 100.');
      }

      const res = await fetch('/api/admin/settings/commission', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rate: rateNum }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to update commission rate.');
      }

      setCommissionSuccessMsg(`Platform commission updated to ${rateNum.toFixed(2)}%`);
      setTimeout(() => {
        setIsCommissionModalOpen(false);
        setCommissionSuccessMsg(null);
        fetchAdminPayouts();
      }, 1200);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUpdatingCommission(false);
    }
  };

  const handleProcessSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlementVendor) return;

    setIsProcessingSettlement(true);
    setSettlementError(null);

    try {
      const cleanRef = payoutReference.trim();
      if (cleanRef.length < 4) {
        throw new Error('Please enter a valid bank settlement UTR / Reference (at least 4 characters).');
      }

      const res = await fetch('/api/admin/payouts/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: settlementVendor.vendorId,
          payoutReference: cleanRef,
          payoutMethod,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to execute settlement.');
      }

      // Close modal and refresh
      setSettlementVendor(null);
      setPayoutReference('');
      await fetchAdminPayouts();
    } catch (err: any) {
      setSettlementError(err.message || 'Settlement failed. Transaction rolled back safely.');
    } finally {
      setIsProcessingSettlement(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#D5D9D9] p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#800020] bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                Platform Treasury &amp; Governance
              </span>
              <span className="text-xs text-[#565959]">•</span>
              <span className="text-xs text-[#565959]">Vendor Settlement Control</span>
            </div>
            <h1 className="text-2xl font-headline font-bold text-[#0F1111] flex items-center gap-2">
              <Wallet className="h-6 w-6 text-[#131921]" />
              Marketplace Commission &amp; Payouts
            </h1>
            <p className="text-xs text-[#565959] mt-1">
              Configure global commission rates, inspect vendor delivered balances, and execute concurrency-safe bank settlements.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/revenue"
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 transition-colors shadow-sm"
            >
              <TrendingUp className="h-3.5 w-3.5 text-emerald-700" />
              <span>Platform Revenue</span>
            </Link>
            <button
              onClick={() => setIsCommissionModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border border-[#D5D9D9] bg-white text-[#0F1111] hover:bg-[#F7F8F8] transition-colors shadow-sm"
            >
              <Settings className="h-3.5 w-3.5 text-[#007185]" />
              Configure Commission ({data ? `${data.platformCommissionRate}%` : '10%'})
            </button>
            <button
              onClick={fetchAdminPayouts}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border border-[#D5D9D9] bg-[#F7F8F8] text-[#0F1111] hover:bg-[#EAEDED] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Global Policy Notice */}
        <div className="mt-5 pt-4 border-t border-[#EAEDED] flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#0F1111]">Active Marketplace Commission:</span>
            <span className="font-mono font-bold text-[#007185] bg-sky-50 px-2 py-0.5 rounded text-xs border border-sky-200">
              {data ? `${data.platformCommissionRate.toFixed(2)}%` : '10.00%'}
            </span>
            <span className="text-[11px] text-[#565959]">(Applied to all vendors)</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#0F1111]">Commission Tax Policy:</span>
            <span className="font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200 text-[11px]">
              Not configured / Pending CA confirmation
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-[#565959]">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>COD items eligible only after verified courier remittance (paymentStatus = PAID)</span>
          </div>
        </div>
      </div>

      {/* Aggregate Metrics */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-[#D5D9D9] p-5">
            <div className="flex items-center justify-between text-xs text-[#565959] mb-1">
              <span>Pending Vendor Payouts</span>
              <Clock className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold font-headline text-emerald-700">
              ₹{data.summary.totalPendingPayouts.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-[#565959] mt-1.5">
              Net seller funds ready for disbursement across {data.summary.totalEligibleItems} delivered items.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-[#D5D9D9] p-5">
            <div className="flex items-center justify-between text-xs text-[#565959] mb-1">
              <span>Accrued Platform Commission</span>
              <TrendingUp className="h-4 w-4 text-[#007185]" />
            </div>
            <div className="text-2xl font-bold font-headline text-[#007185]">
              ₹{data.summary.totalPendingCommission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-[#565959] mt-1.5">
              Platform revenue retained from delivered and settled consignments.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-[#D5D9D9] p-5">
            <div className="flex items-center justify-between text-xs text-[#565959] mb-1">
              <span>Total Payouts Settled</span>
              <CheckCircle2 className="h-4 w-4 text-sky-600" />
            </div>
            <div className="text-2xl font-bold font-headline text-[#0F1111]">
              ₹{data.summary.totalCompletedPayouts.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-[#565959] mt-1.5">
              Cumulative historical payouts remitted with confirmed bank UTRs.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-[#D5D9D9] p-5">
            <div className="flex items-center justify-between text-xs text-[#565959] mb-1">
              <span>Active Marketplace Vendors</span>
              <Building2 className="h-4 w-4 text-[#131921]" />
            </div>
            <div className="text-2xl font-bold font-headline text-[#0F1111]">
              {data.summary.totalVendors}
            </div>
            <p className="text-[11px] text-[#565959] mt-1.5">
              Registered merchant storefronts on Vyntra Atelier.
            </p>
          </div>
        </div>
      )}

      {/* Vendors Payout Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#D5D9D9] overflow-hidden">
        <div className="p-4 border-b border-[#D5D9D9] flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-[#0F1111] flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[#007185]" />
            Vendor Payout Balances &amp; Settlement Actions
          </h2>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setAllVendorsLedgerOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#F7F8F8] hover:bg-[#EAEDED] text-[#0F1111] border border-[#D5D9D9] transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5 text-[#007185]" />
              <span>All Settled Products Ledger</span>
            </button>
            <span className="text-xs text-[#565959]">
              {data?.vendors.length || 0} registered vendors
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#565959]">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-[#007185]" />
            Loading vendor payout balances...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-600 space-y-2">
            <AlertCircle className="h-6 w-6 mx-auto text-rose-500" />
            <p>{error}</p>
          </div>
        ) : !data || data.vendors.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#565959]">
            No vendors found in the database.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F7F8F8] border-b border-[#D5D9D9] text-[#565959] font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Vendor Store</th>
                  <th className="py-3 px-4 text-center">Eligible Items</th>
                  <th className="py-3 px-4 text-right">Gross Sales</th>
                  <th className="py-3 px-4 text-right">Commission</th>
                  <th className="py-3 px-4 text-right">Net Payout Balance</th>
                  <th className="py-3 px-4 text-right">Settled to Date</th>
                  <th className="py-3 px-4 text-center">Settlement Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAEDED]">
                {data.vendors.map((v) => {
                  const isExpanded = expandedVendorId === v.vendorId;
                  const canSettle = v.pendingNetPayout > 0 && v.eligibleItemCount > 0;

                  return (
                    <React.Fragment key={v.vendorId}>
                      <tr className="hover:bg-[#F9FAFA] transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-[#0F1111] block">{v.storeName}</span>
                          <span className="text-[11px] text-[#565959] block">{v.contactEmail}</span>

                          {/* Outstanding Return Refund Debit Badge */}
                          {(v.outstandingAdjustments ?? 0) > 0 && (
                            <button
                              type="button"
                              onClick={() => setActiveAdjustmentsModalVendor(v)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 px-2 py-0.5 rounded mt-1.5 transition-colors cursor-pointer"
                              title="Click to view itemized return refund debits"
                            >
                              <AlertCircle className="h-3 w-3 text-rose-600 shrink-0" />
                              <span>Return Refund Debit: -₹{(v.outstandingAdjustments ?? 0).toFixed(2)}</span>
                            </button>
                          )}

                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <button
                              type="button"
                              onClick={() => setExpandedVendorId(isExpanded ? null : v.vendorId)}
                              className="text-[10px] font-bold text-[#007185] hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              {isExpanded ? (
                                <>
                                  Hide Queue ({v.eligibleItemCount}) <ChevronUp className="h-3 w-3" />
                                </>
                              ) : (
                                <>
                                  Queue ({v.eligibleItemCount}) <ChevronDown className="h-3 w-3" />
                                </>
                              )}
                            </button>

                            <span className="text-neutral-300">•</span>

                            <button
                              type="button"
                              onClick={() => setActiveHistoryModalVendor(v)}
                              className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <History className="h-3 w-3" />
                              <span>Payout History ({v.settledItems?.length || 0})</span>
                            </button>

                            {v.adjustments && v.adjustments.length > 0 && (
                              <>
                                <span className="text-neutral-300">•</span>
                                <button
                                  type="button"
                                  onClick={() => setActiveAdjustmentsModalVendor(v)}
                                  className="text-[10px] font-bold text-rose-600 hover:text-rose-800 hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <span>Refund Debits ({v.adjustments.length})</span>
                                </button>
                              </>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            v.eligibleItemCount > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-600'
                          }`}>
                            {v.eligibleItemCount}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-[#0F1111]">
                          ₹{v.pendingGross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono text-[#565959]">
                          ₹{v.pendingCommission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 text-sm">
                          ₹{v.pendingNetPayout.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono text-[#007185] font-semibold">
                          ₹{v.totalPaidOut.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {canSettle ? (
                            <button
                              onClick={() => {
                                setSettlementVendor(v);
                                setPayoutReference('');
                                setSettlementError(null);
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#131921] hover:bg-[#232F3E] text-[#FFD814] shadow-sm transition-all"
                            >
                              Process Settlement
                            </button>
                          ) : (
                            <span className="text-[11px] text-[#565959] italic">
                              No items ready
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* Expanded Items Drawer */}
                      {isExpanded && (
                        <tr className="bg-[#F7F8F8]">
                          <td colSpan={7} className="p-4">
                            <div className="bg-white rounded-xl border border-[#D5D9D9] p-4 space-y-3">
                              <h4 className="text-xs font-bold text-[#0F1111] flex items-center gap-1.5">
                                <FileText className="h-3.5 w-3.5 text-[#007185]" />
                                Delivered &amp; Paid Items Ready for Settlement ({v.eligibleItems.length})
                              </h4>

                              {v.eligibleItems.length === 0 ? (
                                <p className="text-xs text-[#565959] italic">
                                  No eligible items ready for settlement at this time.
                                </p>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left border-collapse text-[11px]">
                                    <thead>
                                      <tr className="border-b border-[#EAEDED] text-[#565959] font-bold">
                                        <th className="py-2 px-3">Order #</th>
                                        <th className="py-2 px-3">Product</th>
                                        <th className="py-2 px-3">Payment</th>
                                        <th className="py-2 px-3 text-right">Selling Price</th>
                                        <th className="py-2 px-3 text-right">Commission ({v.eligibleItems[0]?.commissionRate}%)</th>
                                        <th className="py-2 px-3 text-right">Net Payout</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#EAEDED]">
                                      {v.eligibleItems.map((item) => (
                                        <tr key={item.id} className="hover:bg-[#F9FAFA]">
                                          <td className="py-2 px-3 font-mono font-bold text-[#0F1111]">
                                            #{item.orderNumber}
                                          </td>
                                          <td className="py-2 px-3 font-medium text-[#0F1111]">
                                            {item.productTitle} <span className="text-[#565959]">×{item.quantity}</span>
                                          </td>
                                          <td className="py-2 px-3 text-[#565959]">
                                            {item.paymentMethod}
                                          </td>
                                          <td className="py-2 px-3 text-right font-mono">
                                            ₹{item.totalPrice.toFixed(2)}
                                          </td>
                                          <td className="py-2 px-3 text-right font-mono text-[#565959]">
                                            ₹{item.commissionAmount.toFixed(2)}
                                          </td>
                                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                                            ₹{item.netEarnings.toFixed(2)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal 1: Configure Global Commission */}
      {isCommissionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#D5D9D9] max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAEDED]">
              <h3 className="text-base font-bold text-[#0F1111] flex items-center gap-2">
                <Settings className="h-5 w-5 text-[#007185]" />
                Marketplace Commission Setting
              </h3>
              <button
                onClick={() => setIsCommissionModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateCommission} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#0F1111] mb-1">
                  Global Commission Percentage (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    value={newCommissionRate}
                    onChange={(e) => setNewCommissionRate(e.target.value)}
                    className="w-full px-3 py-2 border border-[#888C8C] rounded-lg text-sm font-mono font-bold text-[#0F1111] focus:ring-2 focus:ring-[#007185] focus:outline-none"
                    placeholder="10.00"
                  />
                  <span className="absolute right-3 top-2.5 text-sm text-[#565959] font-bold">%</span>
                </div>
                <p className="text-[11px] text-[#565959] mt-1">
                  This rate is snapshot at checkout time on all future orders across all product categories and vendors.
                </p>
              </div>

              <div className="bg-[#F7F8F8] p-3 rounded-xl border border-[#EAEDED] space-y-1 text-[11px] text-[#565959]">
                <p className="font-semibold text-[#0F1111]">Commission Tax Policy:</p>
                <p className="text-amber-800">
                  Commission GST/tax calculation is currently <strong>Not configured / Pending CA confirmation</strong>. No tax is deducted from vendor earnings until official tax policy is enacted.
                </p>
              </div>

              {commissionSuccessMsg && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-bold text-center">
                  {commissionSuccessMsg}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCommissionModalOpen(false)}
                  className="px-4 py-2 border border-[#D5D9D9] rounded-lg text-xs font-bold text-[#0F1111] hover:bg-[#F7F8F8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingCommission}
                  className="px-4 py-2 bg-[#131921] hover:bg-[#232F3E] text-[#FFD814] rounded-lg text-xs font-bold shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isUpdatingCommission && <RefreshCw className="h-3 w-3 animate-spin" />}
                  Save Commission Rate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Process Bank Settlement */}
      {settlementVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#D5D9D9] max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAEDED]">
              <h3 className="text-base font-bold text-[#0F1111] flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#007185]" />
                Execute Vendor Bank Settlement
              </h3>
              <button
                onClick={() => setSettlementVendor(null)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-[#F7F8F8] p-3.5 rounded-xl border border-[#EAEDED] space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[#565959]">Vendor Store:</span>
                  <span className="font-bold text-[#0F1111]">{settlementVendor.storeName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#565959]">Eligible Delivered Items:</span>
                  <span className="font-bold text-[#007185]">{settlementVendor.eligibleItemCount} items</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#565959]">Base Net Earnings:</span>
                  <span className="font-mono font-bold text-[#0F1111]">
                    ₹{settlementVendor.pendingNetPayout.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {(settlementVendor.outstandingAdjustments ?? 0) > 0 && (
                  <div className="flex justify-between items-center text-rose-600">
                    <span>Less Adjustment Deductions:</span>
                    <span className="font-mono font-bold">
                      -₹{Math.min(settlementVendor.pendingNetPayout, settlementVendor.outstandingAdjustments || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1 border-t border-[#EAEDED]">
                  <span className="font-bold text-[#0F1111]">
                    {(settlementVendor.projectedNetPayout ?? settlementVendor.pendingNetPayout) === 0
                      ? 'Net Settlement Amount (Internal Offset):'
                      : 'Net Payable Bank Transfer:'}
                  </span>
                  <span className="font-mono font-bold text-lg text-emerald-700">
                    ₹{(settlementVendor.projectedNetPayout ?? settlementVendor.pendingNetPayout).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {(settlementVendor.projectedNetPayout ?? settlementVendor.pendingNetPayout) === 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0" />
                    Zero-Net Internal Offset Settlement
                  </div>
                  <p className="text-[11px] text-amber-700">
                    Outstanding adjustments fully absorb this vendor&apos;s earnings. The payout will be settled internally without bank transfer. No UTR required.
                  </p>
                </div>
              )}

              <form onSubmit={handleProcessSettlement} className="space-y-4">
                {(settlementVendor.projectedNetPayout ?? settlementVendor.pendingNetPayout) > 0 ? (
                  <div>
                    <label className="block font-bold text-[#0F1111] mb-1">
                      Bank UTR / IMPS / NEFT Settlement Reference <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={payoutReference}
                      onChange={(e) => setPayoutReference(e.target.value)}
                      placeholder="e.g. HDFC2026110900019283"
                      className="w-full px-3 py-2 border border-[#888C8C] rounded-lg text-xs font-mono font-bold text-[#0F1111] focus:ring-2 focus:ring-[#007185] focus:outline-none"
                    />
                    <p className="text-[10px] text-[#565959] mt-1">
                      Enter the real transaction reference or UTR provided by your bank after executing the electronic fund transfer.
                    </p>
                  </div>
                ) : (
                  <div className="text-[11px] text-[#565959] italic bg-[#F7F8F8] p-2.5 rounded-lg border border-[#EAEDED]">
                    Settlement reference is not applicable for zero-net internal offset payouts.
                  </div>
                )}

                {(settlementVendor.projectedNetPayout ?? settlementVendor.pendingNetPayout) > 0 && (
                  <div>
                    <label className="block font-bold text-[#0F1111] mb-1">Payout Method</label>
                    <select
                      value={payoutMethod}
                      onChange={(e) => setPayoutMethod(e.target.value)}
                      className="w-full px-3 py-2 border border-[#888C8C] rounded-lg text-xs font-bold text-[#0F1111] focus:ring-2 focus:ring-[#007185] focus:outline-none"
                    >
                      <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                      <option value="UPI">UPI Direct Remittance</option>
                      <option value="CHEQUE">Banker Cheque</option>
                    </select>
                  </div>
                )}

                {settlementError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{settlementError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSettlementVendor(null)}
                    disabled={isProcessingSettlement}
                    className="px-4 py-2 border border-[#D5D9D9] rounded-lg text-xs font-bold text-[#0F1111] hover:bg-[#F7F8F8]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessingSettlement}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isProcessingSettlement && <RefreshCw className="h-3 w-3 animate-spin" />}
                    Confirm Settlement &amp; Lock Items
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Vendor Payout & Product Settlement History Modal */}
      {activeHistoryModalVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#D5D9D9] max-w-4xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAEDED] shrink-0">
              <div>
                <h3 className="text-base font-bold text-[#0F1111] flex items-center gap-2">
                  <History className="h-5 w-5 text-[#007185]" />
                  Payout History &amp; Product Ledger — {activeHistoryModalVendor.storeName}
                </h3>
                <p className="text-xs text-[#565959] mt-0.5">
                  Itemized product breakdown of all historical settlements remitted with confirmed bank UTRs.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveHistoryModalVendor(null)}
                className="text-neutral-400 hover:text-neutral-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Financial Overview Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F7F8F8] p-3.5 rounded-xl border border-[#EAEDED] shrink-0 text-xs">
              <div>
                <span className="text-[#565959] block">Total Settled to Bank</span>
                <span className="font-headline font-bold text-base text-[#007185] font-mono">
                  ₹{activeHistoryModalVendor.totalPaidOut.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-[#565959] block">Settled Products</span>
                <span className="font-headline font-bold text-base text-[#0F1111]">
                  {activeHistoryModalVendor.settledItems?.length || 0} items
                </span>
              </div>
              <div>
                <span className="text-[#565959] block">Completed Batches</span>
                <span className="font-headline font-bold text-base text-[#0F1111]">
                  {activeHistoryModalVendor.recentPayouts?.length || 0} batches
                </span>
              </div>
              <div>
                <span className="text-[#565959] block">Outstanding Debits</span>
                <span className={`font-headline font-bold text-base font-mono ${
                  (activeHistoryModalVendor.outstandingAdjustments ?? 0) > 0 ? 'text-rose-700' : 'text-emerald-700'
                }`}>
                  -₹{(activeHistoryModalVendor.outstandingAdjustments ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Scrollable Products Table */}
            <div className="flex-1 overflow-y-auto border border-[#EAEDED] rounded-xl">
              {!activeHistoryModalVendor.settledItems || activeHistoryModalVendor.settledItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#565959] italic">
                  No settled product history found for this vendor yet. Items appear here once a payout batch is confirmed.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-[#F7F8F8] border-b border-[#D5D9D9] text-[#565959] font-bold text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Order #</th>
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3 text-right">Gross Sale</th>
                      <th className="py-2.5 px-3 text-right">Commission</th>
                      <th className="py-2.5 px-3 text-right">Net Payout</th>
                      <th className="py-2.5 px-3">Bank UTR / Reference</th>
                      <th className="py-2.5 px-3">Settlement Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAEDED]">
                    {activeHistoryModalVendor.settledItems.map((item) => (
                      <tr key={item.id} className="hover:bg-[#F9FAFA] transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-[#0F1111]">
                          #{item.orderNumber}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            {item.image && (
                              <img
                                src={item.image}
                                alt={item.productTitle}
                                className="w-9 h-9 object-cover rounded border border-[#EAEDED] shrink-0"
                              />
                            )}
                            <div>
                              <p className="font-bold text-[#0F1111] line-clamp-1">{item.productTitle}</p>
                              <p className="text-[10px] text-[#565959]">
                                Size: {item.size} • Color: {item.color} • Qty: {item.quantity}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-[#0F1111]">
                          ₹{item.totalPrice.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-[#565959]">
                          <span className="block font-semibold">₹{item.commissionAmount.toFixed(2)}</span>
                          <span className="text-[10px] text-neutral-400">({item.commissionRate}%)</span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                          ₹{item.netEarnings.toFixed(2)}
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-mono text-[10px] font-bold border border-emerald-200">
                            {item.payoutReference}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[#565959] text-[11px]">
                          {item.payoutDate
                            ? new Date(item.payoutDate).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : 'Confirmed'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-end pt-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveHistoryModalVendor(null)}
                className="px-4 py-2 bg-[#131921] hover:bg-[#232F3E] text-white rounded-lg text-xs font-bold transition-colors"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Return Refund Debit Adjustments Modal */}
      {activeAdjustmentsModalVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#D5D9D9] max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAEDED]">
              <div>
                <h3 className="text-base font-bold text-[#0F1111] flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-rose-600" />
                  Return Refund Debits &amp; Adjustments — {activeAdjustmentsModalVendor.storeName}
                </h3>
                <p className="text-xs text-[#565959] mt-0.5">
                  Tracks customer refunds debited from this vendor, to be recovered from upcoming delivered payouts.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveAdjustmentsModalVendor(null)}
                className="text-neutral-400 hover:text-neutral-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs text-rose-800 font-bold block">Total Outstanding Debit Balance</span>
                <span className="text-[11px] text-rose-600">
                  This amount will be automatically offset when next orders are settled.
                </span>
              </div>
              <span className="text-xl font-bold font-mono text-rose-700">
                -₹{(activeAdjustmentsModalVendor.outstandingAdjustments ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="border border-[#EAEDED] rounded-xl overflow-hidden">
              {!activeAdjustmentsModalVendor.adjustments || activeAdjustmentsModalVendor.adjustments.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#565959] italic">
                  No return adjustments or debits recorded for this vendor.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#F7F8F8] border-b border-[#D5D9D9] text-[#565959] font-bold text-[11px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-right">Debit Amount</th>
                      <th className="py-2.5 px-3 text-right">Remaining Balance</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAEDED]">
                    {activeAdjustmentsModalVendor.adjustments.map((adj) => (
                      <tr key={adj.id} className="hover:bg-[#F9FAFA]">
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-bold text-[10px] rounded font-mono">
                            {adj.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[#0F1111] font-medium text-[11px]">
                          {adj.description}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                          -₹{adj.amount.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0F1111]">
                          ₹{adj.outstandingBalance.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            adj.outstandingBalance > 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {adj.outstandingBalance > 0 ? 'Deduction Pending' : 'Fully Recovered'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveAdjustmentsModalVendor(null)}
                className="px-4 py-2 bg-[#131921] hover:bg-[#232F3E] text-white rounded-lg text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Marketplace All Settled Products Ledger Modal */}
      {allVendorsLedgerOpen && data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#D5D9D9] max-w-5xl w-full p-6 space-y-4 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAEDED] shrink-0">
              <div>
                <h3 className="text-base font-bold text-[#0F1111] flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#007185]" />
                  Marketplace Complete Settled Products Ledger
                </h3>
                <p className="text-xs text-[#565959] mt-0.5">
                  Universal cross-vendor audit ledger of all product payouts, sales values, platform commission, and bank UTRs.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAllVendorsLedgerOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search Filter Bar */}
            <div className="flex items-center justify-between gap-3 shrink-0">
              <div className="relative flex-1 max-w-sm">
                <Search className="h-4 w-4 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  placeholder="Filter by Order #, Vendor, or Product..."
                  className="w-full pl-9 pr-3 py-1.5 border border-[#888C8C] rounded-lg text-xs text-[#0F1111] focus:ring-2 focus:ring-[#007185] focus:outline-none"
                />
              </div>
              <span className="text-xs font-bold text-[#565959]">
                Total Historical Settled: <strong className="text-[#007185]">₹{data.summary.totalCompletedPayouts.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
              </span>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto border border-[#EAEDED] rounded-xl">
              {(() => {
                const allItems = data.vendors.flatMap((v) =>
                  (v.settledItems || []).map((item) => ({ ...item, vendorName: v.storeName }))
                );
                const filtered = allItems.filter((i) => {
                  if (!ledgerSearch.trim()) return true;
                  const q = ledgerSearch.toLowerCase();
                  return (
                    i.orderNumber.toLowerCase().includes(q) ||
                    i.productTitle.toLowerCase().includes(q) ||
                    i.vendorName.toLowerCase().includes(q) ||
                    i.payoutReference.toLowerCase().includes(q)
                  );
                });

                if (filtered.length === 0) {
                  return (
                    <div className="p-8 text-center text-xs text-[#565959] italic">
                      No settled product records match your search filter.
                    </div>
                  );
                }

                return (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-[#F7F8F8] border-b border-[#D5D9D9] text-[#565959] font-bold text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Vendor</th>
                        <th className="py-2.5 px-3">Order #</th>
                        <th className="py-2.5 px-3">Product</th>
                        <th className="py-2.5 px-3 text-right">Gross Sale</th>
                        <th className="py-2.5 px-3 text-right">Commission</th>
                        <th className="py-2.5 px-3 text-right">Vendor Net</th>
                        <th className="py-2.5 px-3">Bank UTR / Ref</th>
                        <th className="py-2.5 px-3">Paid Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAEDED]">
                      {filtered.map((item) => (
                        <tr key={item.id} className="hover:bg-[#F9FAFA]">
                          <td className="py-3 px-3 font-bold text-[#0F1111]">
                            {item.vendorName}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-[#0F1111]">
                            #{item.orderNumber}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              {item.image && (
                                <img
                                  src={item.image}
                                  alt={item.productTitle}
                                  className="w-8 h-8 object-cover rounded border border-[#EAEDED] shrink-0"
                                />
                              )}
                              <div>
                                <span className="font-semibold text-[#0F1111] line-clamp-1">{item.productTitle}</span>
                                <span className="text-[10px] text-[#565959] block">
                                  Size: {item.size} • Qty: {item.quantity}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-semibold text-[#0F1111]">
                            ₹{item.totalPrice.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-[#565959]">
                            <span className="block font-semibold">₹{item.commissionAmount.toFixed(2)}</span>
                            <span className="text-[10px] text-neutral-400">({item.commissionRate}%)</span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                            ₹{item.netEarnings.toFixed(2)}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-mono text-[10px] font-bold border border-emerald-200">
                              {item.payoutReference}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-[#565959] text-[11px]">
                            {item.payoutDate
                              ? new Date(item.payoutDate).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : 'Confirmed'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>

            <div className="flex justify-end pt-2 shrink-0">
              <button
                type="button"
                onClick={() => setAllVendorsLedgerOpen(false)}
                className="px-4 py-2 bg-[#131921] hover:bg-[#232F3E] text-white rounded-lg text-xs font-bold transition-colors"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
