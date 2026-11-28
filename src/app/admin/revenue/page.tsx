'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  IndianRupee,
  Package,
  CreditCard,
  Building2,
  RefreshCw,
  ArrowUpRight,
  ShieldCheck,
  Percent,
  Calendar,
  Sparkles,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  Receipt,
  FileSpreadsheet,
} from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { PageHeader, StatRow, consoleButton } from '@/components/console/console-ui';

interface RevenueMetrics {
  grossGMV: number;
  totalGMV: number;
  totalRefunds: number;
  vyntraGrossRevenue: number;
  vyntraNetProfit: number;
  estimatedGatewayFees: number;
  totalCommissionsEarned: number;
  totalPackagingFees: number;
  totalCodFees: number;
  totalVendorPayoutObligation: number;
  totalOnlineOrdersAmount: number;
  totalCodOrdersAmount: number;
  totalOrdersCount: number;
  averageOrderValue: number;
  platformCommissionRate: number;
}

interface VendorContribution {
  vendorId: string;
  storeName: string;
  storeSlug: string;
  grossSales: number;
  commissionContributed: number;
  vendorNet: number;
  itemsSold: number;
  ordersCount: number;
}

interface RecentOrderRevenue {
  orderId: string;
  orderNumber: string;
  createdAt: string;
  totalAmount: number;
  subtotal: number;
  discount: number;
  packagingFee: number;
  codFee: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  itemCount: number;
  orderCommission: number;
  vendorNet: number;
  vyntraTake: number;
}

export default function AdminRevenuePage() {
  const [range, setRange] = useState<'today' | '7d' | '30d' | 'all'>('all');
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [vendors, setVendors] = useState<VendorContribution[]>([]);
  const [orders, setOrders] = useState<RecentOrderRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRevenueData = async (selectedRange = range) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/revenue?range=${selectedRange}`);
      const json = await res.json();
      if (json.success && json.data) {
        setMetrics(json.data.metrics);
        setVendors(json.data.vendorContributions || []);
        setOrders(json.data.recentOrderLedger || []);
      } else {
        setError(json.error?.message || 'Failed to load platform revenue analytics.');
      }
    } catch (err: any) {
      setError('Network error while connecting to revenue services.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenueData(range);
  }, [range]);

  const commissionPercent = metrics?.vyntraGrossRevenue
    ? Math.round((metrics.totalCommissionsEarned / metrics.vyntraGrossRevenue) * 100)
    : 0;
  const packagingPercent = metrics?.vyntraGrossRevenue
    ? Math.round((metrics.totalPackagingFees / metrics.vyntraGrossRevenue) * 100)
    : 0;
  const codPercent = metrics?.vyntraGrossRevenue
    ? Math.round((metrics.totalCodFees / metrics.vyntraGrossRevenue) * 100)
    : 0;

  return (
    <div className="space-y-8 antialiased">
      <PageHeader
        title="Revenue"
        description="Vyntra's earnings: commission, packaging and COD fees, less payment gateway costs."
        actions={
        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          {/* Time Range Pills */}
          <div className="inline-flex rounded-xl bg-[#F7F8F8] p-1 border border-[#D5D9D9]">
            {(
              [
                { id: 'today', label: 'Today' },
                { id: '7d', label: '7 Days' },
                { id: '30d', label: '30 Days' },
                { id: 'all', label: 'All Time' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setRange(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  range === t.id
                    ? 'bg-[#131921] text-white shadow-sm'
                    : 'text-[#565959] hover:text-[#0F1111] hover:bg-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => fetchRevenueData(range)}
            disabled={loading}
            className="p-2.5 rounded-xl border border-[#D5D9D9] bg-white hover:bg-[#F7F8F8] text-[#0F1111] transition-all disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        }
      />

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Vyntra Net Profit */}
        <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-950 text-white rounded-xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[160px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-200">
              Vyntra Net In-Hand Profit
            </span>
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-emerald-300" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold tabular-nums tracking-tight">
              {formatINR(metrics?.vyntraNetProfit || 0)}
            </div>
            <p className="text-[11px] text-emerald-200/90 mt-1 flex items-center gap-1">
              <span>Gross platform revenue minus ~2% payment gateway cost</span>
            </p>
          </div>
        </div>

        {/* Card 2: Total Gross Platform Revenue */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#D5D9D9] flex flex-col justify-between min-h-[160px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#565959]">
              Total Platform Revenue
            </span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold tabular-nums text-[#0F1111] tracking-tight">
              {formatINR(metrics?.vyntraGrossRevenue || 0)}
            </div>
            <p className="text-[11px] text-[#565959] mt-1">
              Commissions + Express Packaging + COD Charges
            </p>
          </div>
        </div>

        {/* Card 3: Marketplace GMV */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#D5D9D9] flex flex-col justify-between min-h-[160px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#565959]">
              Gross Merchandise Value (GMV)
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold tabular-nums text-[#0F1111] tracking-tight">
              {formatINR(metrics?.totalGMV || 0)}
            </div>
            <p className="text-[11px] text-[#565959] mt-1">
              Net GMV ({metrics?.totalOrdersCount || 0} orders • {formatINR(metrics?.totalRefunds || 0)} refunds deducted)
            </p>
          </div>
        </div>

        {/* Card 4: Vendor Payouts Obligation */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#D5D9D9] flex flex-col justify-between min-h-[160px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#565959]">
              Total Vendor Share
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold tabular-nums text-[#0F1111] tracking-tight">
              {formatINR(metrics?.totalVendorPayoutObligation || 0)}
            </div>
            <p className="text-[11px] text-[#565959] mt-1">
              Total seller earnings ready/disbursed across vendors
            </p>
          </div>
        </div>
      </div>

      {/* 2-Column Section: Revenue Streams Breakdown & Payment Channels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Revenue Stream Breakdown (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl p-6 shadow-sm border border-[#D5D9D9]">
          <div className="flex items-center justify-between pb-4 border-b border-[#D5D9D9]">
            <div>
              <h2 className="font-headline font-bold text-base text-[#0F1111]">
                Platform Revenue Streams (Where Vyntra Earns)
              </h2>
              <p className="text-xs text-[#565959] mt-0.5">
                Exact breakdown of every rupee earned by Vyntra Marketplace
              </p>
            </div>
            <span className="text-xs tabular-nums font-bold text-primary">
              Take Rate: {metrics?.totalGMV ? ((metrics.vyntraGrossRevenue / metrics.totalGMV) * 100).toFixed(1) : 0}%
            </span>
          </div>

          <div className="mt-5 space-y-4">
            {/* Stream 1: Commissions */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-primary shrink-0" />
                  <span className="font-bold text-[#0F1111]">Marketplace Seller Commissions ({metrics?.platformCommissionRate || 10}%)</span>
                </div>
                <div className="tabular-nums text-right">
                  <span className="font-bold text-[#0F1111]">{formatINR(metrics?.totalCommissionsEarned || 0)}</span>
                  <span className="text-xs text-[#565959] ml-1.5">({commissionPercent}%)</span>
                </div>
              </div>
              <div className="w-full h-2.5 bg-[#F7F8F8] rounded-full overflow-hidden border border-[#E7E7E7]">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${commissionPercent}%` }}
                />
              </div>
            </div>

            {/* Stream 2: Express Packaging */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-600 shrink-0" />
                  <span className="font-bold text-[#0F1111]">Packaging fees (₹49 per order)</span>
                </div>
                <div className="tabular-nums text-right">
                  <span className="font-bold text-[#0F1111]">{formatINR(metrics?.totalPackagingFees || 0)}</span>
                  <span className="text-xs text-[#565959] ml-1.5">({packagingPercent}%)</span>
                </div>
              </div>
              <div className="w-full h-2.5 bg-[#F7F8F8] rounded-full overflow-hidden border border-[#E7E7E7]">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                  style={{ width: `${packagingPercent}%` }}
                />
              </div>
            </div>

            {/* Stream 3: COD Verification */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                  <span className="font-bold text-[#0F1111]">Cash on Delivery Verification Fees (₹49/COD)</span>
                </div>
                <div className="tabular-nums text-right">
                  <span className="font-bold text-[#0F1111]">{formatINR(metrics?.totalCodFees || 0)}</span>
                  <span className="text-xs text-[#565959] ml-1.5">({codPercent}%)</span>
                </div>
              </div>
              <div className="w-full h-2.5 bg-[#F7F8F8] rounded-full overflow-hidden border border-[#E7E7E7]">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${codPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Gateway Deductions Footnote */}
          <div className="mt-6 p-4 rounded-xl bg-[#F7F8F8] border border-[#D5D9D9] flex items-start justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-[#0F1111] block">Payment Gateway Transaction Costs (Overhead)</span>
              <p className="text-[11px] text-[#565959] mt-0.5">
                Razorpay standard domestic gateway rate (~2.0% on prepaid transactions).
              </p>
            </div>
            <div className="text-right tabular-nums font-bold text-rose-700 shrink-0">
              - {formatINR(metrics?.estimatedGatewayFees || 0)}
            </div>
          </div>

          {/* Refund Protection Note */}
          <div className="mt-3 p-4 rounded-xl bg-rose-50/70 border border-rose-200/80 flex items-start justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-rose-950 block">Customer Refunds &amp; Returns Reversals</span>
              <p className="text-[11px] text-rose-800 mt-0.5">
                Refunded items and returned orders are strictly subtracted from GMV and net revenue. Vyntra retains ₹0 commission on refunded items.
              </p>
            </div>
            <div className="text-right tabular-nums font-bold text-rose-700 shrink-0">
              - {formatINR(metrics?.totalRefunds || 0)}
            </div>
          </div>
        </div>

        {/* Right: Payment Channels & Conversion (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl p-6 shadow-sm border border-[#D5D9D9]">
          <h2 className="font-headline font-bold text-base text-[#0F1111] pb-4 border-b border-[#D5D9D9]">
            Payment Mode Distribution
          </h2>

          <div className="mt-5 space-y-4">
            {/* Online (Razorpay) */}
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <span className="font-bold text-xs text-emerald-950 block">Prepaid / Razorpay Gateway</span>
                  <span className="text-[11px] text-emerald-800">Card, UPI, Netbanking</span>
                </div>
              </div>
              <div className="text-right tabular-nums">
                <span className="font-bold text-sm text-emerald-950 block">
                  {formatINR(metrics?.totalOnlineOrdersAmount || 0)}
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold">100% Upfront</span>
              </div>
            </div>

            {/* COD */}
            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <span className="font-bold text-xs text-amber-950 block">Cash on Delivery (COD)</span>
                  <span className="text-[11px] text-amber-800">Settled post courier delivery</span>
                </div>
              </div>
              <div className="text-right tabular-nums">
                <span className="font-bold text-sm text-amber-950 block">
                  {formatINR(metrics?.totalCodOrdersAmount || 0)}
                </span>
                <span className="text-[10px] text-amber-700 font-semibold">Doorstep Remittance</span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[#D5D9D9] flex items-center justify-between text-xs text-[#565959]">
            <span>Active Platform Commission:</span>
            <span className="tabular-nums font-bold text-[#0F1111]">{metrics?.platformCommissionRate || 10.0}% Global</span>
          </div>
        </div>
      </div>

      {/* Vendor Revenue Contribution Leaderboard */}
      <div className="bg-white rounded-xl shadow-sm border border-[#D5D9D9] overflow-hidden">
        <div className="p-6 border-b border-[#D5D9D9] flex items-center justify-between">
          <div>
            <h2 className="font-headline font-bold text-base text-[#0F1111]">
              Vendor Contribution Leaderboard
            </h2>
            <p className="text-xs text-[#565959] mt-0.5">
              Which merchant stores are generating the highest revenue &amp; commissions for Vyntra
            </p>
          </div>
          <Link
            href="/admin/payouts"
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            <span>Manage Vendor Payouts</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F8F8] text-[#565959] font-bold border-b border-[#D5D9D9]">
              <tr>
                <th className="py-3 px-6">Merchant Store</th>
                <th className="py-3 px-4">Units Sold</th>
                <th className="py-3 px-4">Orders Handled</th>
                <th className="py-3 px-4">Gross Sales (GMV)</th>
                <th className="py-3 px-4 text-emerald-800 font-bold">Commission to Vyntra</th>
                <th className="py-3 px-6 text-right">Net Seller Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D5D9D9]">
              {vendors.length > 0 ? (
                vendors.map((v, idx) => (
                  <tr key={v.vendorId} className="hover:bg-[#F7F8F8]/60 transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#131921] text-white text-[10px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-[#0F1111] block">{v.storeName}</span>
                          <span className="text-[10px] text-[#565959] tabular-nums">ID: {v.storeSlug}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 tabular-nums font-medium">{v.itemsSold} pcs</td>
                    <td className="py-3.5 px-4 tabular-nums font-medium">{v.ordersCount} orders</td>
                    <td className="py-3.5 px-4 tabular-nums font-bold text-[#0F1111]">{formatINR(v.grossSales)}</td>
                    <td className="py-3.5 px-4 tabular-nums font-extrabold text-emerald-700 bg-emerald-50/40">
                      + {formatINR(v.commissionContributed)}
                    </td>
                    <td className="py-3.5 px-6 text-right tabular-nums font-medium text-[#565959]">
                      {formatINR(v.vendorNet)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#565959]">
                    No vendor sales recorded in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order-by-Order Revenue Ledger */}
      <div className="bg-white rounded-xl shadow-sm border border-[#D5D9D9] overflow-hidden">
        <div className="p-6 border-b border-[#D5D9D9] flex items-center justify-between">
          <div>
            <h2 className="font-headline font-bold text-base text-[#0F1111]">
              Recent Order Revenue Ledger
            </h2>
            <p className="text-xs text-[#565959] mt-0.5">
              Exact revenue attribution, packaging fee, and Vyntra net cut per order
            </p>
          </div>
          <Link
            href="/admin/orders"
            className="text-xs font-bold text-[#007185] hover:underline flex items-center gap-1"
          >
            <span>All Orders</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F8F8] text-[#565959] font-bold border-b border-[#D5D9D9]">
              <tr>
                <th className="py-3 px-6">Order Number</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Order Total</th>
                <th className="py-3 px-4">Vendor Share</th>
                <th className="py-3 px-4 text-emerald-800">Vyntra Cut (Comm + Pkg)</th>
                <th className="py-3 px-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D5D9D9]">
              {orders.length > 0 ? (
                orders.map((o) => (
                  <tr key={o.orderId} className="hover:bg-[#F7F8F8]/60 transition-colors">
                    <td className="py-3.5 px-6">
                      <Link
                        href={`/admin/orders/${o.orderId}`}
                        className="tabular-nums font-bold text-primary hover:underline"
                      >
                        {o.orderNumber}
                      </Link>
                      <span className="block text-[10px] text-[#565959]">
                        {o.itemCount} item(s)
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#565959]">
                      {new Date(o.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#0F1111]">
                      {o.paymentMethod}
                    </td>
                    <td className="py-3.5 px-4 tabular-nums font-bold text-[#0F1111]">
                      {formatINR(o.totalAmount)}
                    </td>
                    <td className="py-3.5 px-4 tabular-nums text-[#565959]">
                      {formatINR(o.vendorNet)}
                    </td>
                    <td className="py-3.5 px-4 tabular-nums font-extrabold text-emerald-700 bg-emerald-50/40">
                      + {formatINR(o.vyntraTake)}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#565959]">
                    No completed orders found in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
