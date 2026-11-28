'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Store,
  Clock,
  Package,
  CheckCircle2,
  AlertTriangle,
  ShoppingBag,
  CreditCard,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Copy,
  X,
  Eye,
} from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { PageHeader, StatRow, consoleButton } from '@/components/console/console-ui';

interface AdminKPIs {
  totalCustomers: number;
  totalVendors: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  totalProducts: number;
  publishedProducts: number;
  draftProducts: number;
  totalOrders: number;
  codOrdersCount: number;
  codTotalAmount: number;
  grossMarketplaceVolume: number;
}

interface RecentApp {
  id: string;
  storeName: string;
  applicantName: string;
  applicantEmail: string;
  status: string;
  submittedAt: string;
}

interface VerifiedVendor {
  id: string;
  merchantId?: string;
  storeName: string;
  storeSlug: string;
  status: string;
  isVerified: boolean;
  commissionRate: number;
  productsCount: number;
  ordersCount: number;
  createdAt: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  gstNumber?: string | null;
  panNumber?: string | null;
  bankName?: string | null;
  bankAccountLast4?: string | null;
  ifscCode?: string | null;
  payoutsEnabled?: boolean;
}

export default function AdminOverviewPage() {
  const [kpis, setKpis] = useState<AdminKPIs | null>(null);
  const [recentApps, setRecentApps] = useState<RecentApp[]>([]);
  const [verifiedVendors, setVerifiedVendors] = useState<VerifiedVendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<VerifiedVendor | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/metrics');
      const json = await res.json();
      if (json.success && json.data) {
        setKpis(json.data.kpis);
        setRecentApps(json.data.recentApplications || []);
        setVerifiedVendors(json.data.verifiedVendors || []);
      } else {
        setError(json.error?.message || 'Failed to load administrative metrics.');
      }
    } catch (e: any) {
      setError('Unable to connect to administrative metrics service.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        title="Overview"
        description="What needs your attention across the marketplace."
        actions={
          <>
          <button type="button" onClick={fetchMetrics} disabled={isLoading} className={consoleButton.secondary}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          </>
        }
      />

      {/* Pending Application Alert Banner */}
      {kpis && kpis.pendingApplications > 0 && (
        <div className="p-4 sm:p-5 rounded-xl bg-amber-50 border border-amber-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-headline font-bold text-amber-900">
                {kpis.pendingApplications} Vendor Application{kpis.pendingApplications > 1 ? 's' : ''} Awaiting Review
              </h2>
              <p className="text-xs text-amber-700 leading-relaxed mt-0.5">
                New merchant onboarding requests require administrative audit before storefront catalog access is granted.
              </p>
            </div>
          </div>
          <Link
            href="/admin/vendors?tab=applications"
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-all text-center shrink-0 flex items-center justify-center gap-1.5"
          >
            <span>Review Applications</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      <StatRow
        items={[
          { label: 'Sellers', value: isLoading ? '…' : kpis?.totalVendors ?? 0, hint: 'Approved and selling', href: '/admin/vendors?tab=verified' },
          {
            label: 'Applications to review',
            value: isLoading ? '…' : kpis?.pendingApplications ?? 0,
            tone: (kpis?.pendingApplications ?? 0) > 0 ? 'warn' : 'neutral',
            href: '/admin/vendors?tab=applications',
          },
          {
            label: 'Live products',
            value: isLoading ? '…' : kpis?.publishedProducts ?? 0,
            tone: 'good',
            hint: isLoading ? undefined : `of ${kpis?.totalProducts ?? 0} listed`,
            href: '/admin/products',
          },
          {
            label: 'Orders',
            value: isLoading ? '…' : kpis?.totalOrders ?? 0,
            hint: isLoading ? undefined : `Cash on Delivery ${formatINR(kpis?.codTotalAmount ?? 0)}`,
            href: '/admin/orders',
          },
        ]}
      />

      {/* Approved sellers */}
      <div className="bg-white rounded-xl border border-[#D5D9D9] p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D5D9D9]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-headline font-bold text-base text-[#0F1111]">
                  Approved sellers
                </h3>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  {verifiedVendors.length} Active
                </span>
              </div>
              <p className="text-xs text-[#565959]">
                Sellers who can list products on Vyntra
              </p>
            </div>
          </div>
          <Link
            href="/admin/vendors?tab=verified"
            className="text-xs font-bold text-[#007185] hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <span>All sellers</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3 py-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-[#F7F8F8] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : verifiedVendors.length === 0 ? (
          <div className="py-10 text-center text-xs text-[#565959] bg-[#F7F8F8] rounded-xl border border-dashed border-[#D5D9D9]">
            <Store className="h-8 w-8 text-[#565959]/40 mx-auto mb-2" />
            <p className="font-semibold text-sm text-[#0F1111]">No approved sellers yet.</p>
            <p className="text-xs text-[#565959] mt-0.5">Approve an application to add a seller.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#D5D9D9] text-[#565959] text-[10px]">
                  <th className="pb-3 font-bold">Storefront Name</th>
                  <th className="pb-3 font-bold">Owner / Merchant</th>
                  <th className="pb-3 font-bold">Verification Status</th>
                  <th className="pb-3 font-bold text-center">Commission</th>
                  <th className="pb-3 font-bold text-center">Live Products</th>
                  <th className="pb-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D5D9D9]/50">
                {verifiedVendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-[#F7F8F8]/80 transition-colors">
                    {/* Storefront Info */}
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-[#007185]/10 text-[#007185] flex items-center justify-center font-bold text-xs shrink-0 border border-[#007185]/20">
                          {vendor.storeName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-[#0F1111] flex items-center gap-1.5">
                            <span>{vendor.storeName}</span>
                            {vendor.isVerified && (
                              <span title="Verified seller">
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] tabular-nums text-[#565959]">
                              slug: {vendor.storeSlug}
                            </span>
                            <span className="text-[10px] tabular-nums font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-900 border border-amber-300">
                              {vendor.merchantId || `VYN-SELLER-${vendor.id.slice(-5).toUpperCase()}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Owner Details */}
                    <td className="py-3.5 pr-4">
                      <div className="font-semibold text-[#0F1111]">{vendor.ownerName}</div>
                      <div className="text-[11px] text-[#565959] tabular-nums">{vendor.ownerEmail}</div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 pr-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                        <span>{vendor.status}</span>
                      </span>
                    </td>

                    {/* Commission Rate */}
                    <td className="py-3.5 text-center tabular-nums font-bold text-[#0F1111]">
                      {vendor.commissionRate}%
                    </td>

                    {/* Live Products */}
                    <td className="py-3.5 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#F7F8F8] border border-[#D5D9D9] text-[#0F1111]">
                        {vendor.productsCount} items
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 text-right space-x-2">
                      <Link
                        href={`/admin/vendors/${vendor.id}`}
                        className="px-2.5 py-1 rounded bg-[#007185] hover:bg-[#004B57] text-white text-[11px] font-bold shadow-sm transition-all inline-flex items-center gap-1"
                        title="View Full Vendor Details, Warehouses & Listed Products"
                      >
                        <Eye className="h-3 w-3" />
                        <span>Details</span>
                      </Link>
                      <Link
                        href={`/admin/products?vendor=${encodeURIComponent(vendor.id)}`}
                        className="px-2.5 py-1 rounded bg-[#F7F8F8] hover:bg-[#EAEDED] text-[#007185] border border-[#D5D9D9] text-[11px] font-bold transition-all inline-flex items-center gap-1"
                      >
                        <Package className="h-3 w-3" />
                        <span>Catalog</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2-Column Section: Recent Applications & Quick Administrative Links */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 8 Cols: Recent Vendor Applications */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-[#D5D9D9] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#D5D9D9]">
            <div>
              <h3 className="font-headline font-bold text-base text-[#0F1111]">
                Recent seller applications
              </h3>
              <p className="text-xs text-[#565959]">
                Newest first
              </p>
            </div>
            <Link
              href="/admin/vendors?tab=applications"
              className="text-xs font-bold text-[#007185] hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-[#F7F8F8] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : recentApps.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#565959]">
              No seller applications yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#D5D9D9] text-[#565959] text-[10px]">
                    <th className="pb-2.5 font-bold">Boutique / Store</th>
                    <th className="pb-2.5 font-bold">Applicant</th>
                    <th className="pb-2.5 font-bold">Status</th>
                    <th className="pb-2.5 font-bold">Date</th>
                    <th className="pb-2.5 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D5D9D9]/50">
                  {recentApps.map((app) => (
                    <tr key={app.id} className="hover:bg-[#F7F8F8]/80 transition-colors">
                      <td className="py-3 font-bold text-[#0F1111]">{app.storeName}</td>
                      <td className="py-3 text-[#565959]">
                        <div>{app.applicantName}</div>
                        <div className="text-[10px] text-outline tabular-nums">{app.applicantEmail}</div>
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            app.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : app.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {app.status}
                        </span>
                      </td>
                      <td className="py-3 text-[#565959]">
                        {new Date(app.submittedAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          href={`/admin/vendors?tab=applications&search=${encodeURIComponent(app.storeName)}`}
                          className="px-2.5 py-1 rounded bg-[#007185] hover:bg-[#004B57] text-white text-[11px] font-bold shadow-sm transition-all"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right 4 Cols: Quick Administrative Links & Moderation Controls */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-white rounded-xl border border-[#D5D9D9] p-5 shadow-sm space-y-3">
            <h3 className="font-headline font-bold text-sm text-[#0F1111]">
              Shortcuts
            </h3>
            <div className="flex flex-col gap-2 pt-1">
              <Link
                href="/admin/vendors?tab=verified"
                className="p-3 rounded-xl border border-[#D5D9D9] hover:border-[#007185] hover:bg-[#F7F8F8] transition-all flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5 font-bold text-[#0F1111]">
                  <Store className="h-4 w-4 text-emerald-700" />
                  <span>All sellers</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-[#565959]" />
              </Link>

              <Link
                href="/admin/vendors?tab=applications"
                className="p-3 rounded-xl border border-[#D5D9D9] hover:border-[#007185] hover:bg-[#F7F8F8] transition-all flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5 font-bold text-[#0F1111]">
                  <Clock className="h-4 w-4 text-amber-700" />
                  <span>Seller applications</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-[#565959]" />
              </Link>

              <Link
                href="/admin/products"
                className="p-3 rounded-xl border border-[#D5D9D9] hover:border-[#007185] hover:bg-[#F7F8F8] transition-all flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5 font-bold text-[#0F1111]">
                  <Package className="h-4 w-4 text-[#007185]" />
                  <span>Products</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-[#565959]" />
              </Link>

              <Link
                href="/products"
                className="p-3 rounded-xl border border-[#D5D9D9] hover:border-[#007185] hover:bg-[#F7F8F8] transition-all flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5 font-bold text-[#0F1111]">
                  <ExternalLink className="h-4 w-4 text-[#565959]" />
                  <span>View storefront</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-[#565959]" />
              </Link>
            </div>
          </div>

          <div className="bg-[#131921] text-white rounded-xl p-5 shadow-sm space-y-2 border border-[#232F3E]">
            <span className="text-[10px] font-bold text-[#FFD814]">
              Security Policy
            </span>
            <h4 className="font-headline font-bold text-sm">
              Role &amp; Seller Separation Enforced
            </h4>
            <p className="text-xs text-white/70 leading-relaxed">
              Vendors cannot approve themselves or elevate roles. Orders cannot be fulfilled until profile status is marked APPROVED.
            </p>
          </div>
        </div>
      </div>

      {/* VERIFIED VENDOR DOSSIER MODAL */}
      {selectedVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-2xl border border-[#D5D9D9] space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-[#D5D9D9]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-[#007185] flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    Seller details
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {selectedVendor.status}
                  </span>
                </div>
                <h3 className="font-headline font-bold text-xl text-[#0F1111]">
                  {selectedVendor.storeName}
                </h3>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[11px] tabular-nums text-[#565959]">
                    /{selectedVendor.storeSlug}
                  </span>
                  {/* Unique Merchant ID with Copy */}
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300 tabular-nums text-[11px] font-bold">
                    <span>{selectedVendor.merchantId || `VYN-SELLER-${selectedVendor.id.slice(-5).toUpperCase()}`}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const id = selectedVendor.merchantId || `VYN-SELLER-${selectedVendor.id.slice(-5).toUpperCase()}`;
                        navigator.clipboard.writeText(id);
                        setCopiedId(true);
                        setTimeout(() => setCopiedId(false), 2000);
                      }}
                      className="p-0.5 hover:text-black transition-colors"
                      title="Copy Merchant ID"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                    {copiedId && <span className="text-[10px] text-emerald-700 font-sans">Copied!</span>}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedVendor(null)}
                className="p-1 rounded-lg hover:bg-[#F7F8F8] text-[#565959]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Dossier Body */}
            <div className="space-y-4 text-xs">
              {/* Owner & Legal Identity */}
              <div className="p-3.5 rounded-xl bg-[#F7F8F8] border border-[#D5D9D9] space-y-2">
                <span className="text-[10px] font-bold text-[#565959] block">
                  Owner &amp; Authorised Contact
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[#565959] block text-[10px]">Full Legal Name:</span>
                    <span className="font-bold text-[#0F1111] text-xs">
                      {selectedVendor.ownerName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#565959] block text-[10px]">Registered Role:</span>
                    <span className="font-semibold text-[#0F1111] text-xs">
                      VERIFIED VENDOR
                    </span>
                  </div>
                  <div>
                    <span className="text-[#565959] block text-[10px]">Registered Email:</span>
                    <span className="tabular-nums font-semibold text-[#0F1111] break-all">
                      {selectedVendor.ownerEmail}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#565959] block text-[10px]">Phone Number:</span>
                    <span className="tabular-nums font-semibold text-[#0F1111]">
                      {selectedVendor.ownerPhone || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tax & Compliance Identifiers */}
              <div className="grid grid-cols-2 gap-3 tabular-nums">
                <div className="p-3 rounded-xl bg-[#F7F8F8] border border-[#D5D9D9]">
                  <span className="text-[10px] font-bold text-[#565959] block font-sans">
                    GSTIN
                  </span>
                  <span className="font-bold text-[#0F1111]">
                    {selectedVendor.gstNumber || 'Not provided'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#F7F8F8] border border-[#D5D9D9]">
                  <span className="text-[10px] font-bold text-[#565959] block font-sans">
                    PAN Card
                  </span>
                  <span className="font-bold text-[#0F1111]">
                    {selectedVendor.panNumber || 'Not provided'}
                  </span>
                </div>
              </div>

              {/* Bank Settlement & Payout Info */}
              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-amber-900 font-bold text-[11px]">
                    <CreditCard className="h-3.5 w-3.5 text-amber-700" />
                    <span>Payout &amp; Settlement Account</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {selectedVendor.payoutsEnabled ? 'Payouts Active' : 'COD Settlement'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[#565959] block text-[10px]">Settlement Bank:</span>
                    <span className="font-bold text-[#0F1111]">
                      {selectedVendor.bankName || 'Not provided'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#565959] block text-[10px]">IFSC Code:</span>
                    <span className="tabular-nums font-bold text-[#0F1111]">
                      {selectedVendor.ifscCode || 'Not provided'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#565959] block text-[10px]">Account Number:</span>
                    <span className="tabular-nums font-bold text-[#0F1111]">
                      {selectedVendor.bankAccountLast4 ? `•••• •••• ${selectedVendor.bankAccountLast4}` : 'Not provided'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#565959] block text-[10px]">Settlement Frequency:</span>
                    <span className="font-semibold text-[#0F1111]">
                      T+2 Days (Automated NEFT)
                    </span>
                  </div>
                </div>
              </div>

              {/* Commercial Metrics */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-[#F7F8F8] border border-[#D5D9D9]">
                  <span className="text-[10px] font-bold text-[#565959] block">
                    Commission
                  </span>
                  <span className="tabular-nums font-bold text-base text-[#0F1111]">
                    {selectedVendor.commissionRate}%
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#F7F8F8] border border-[#D5D9D9]">
                  <span className="text-[10px] font-bold text-[#565959] block">
                    Active Catalog
                  </span>
                  <span className="tabular-nums font-bold text-base text-[#0F1111]">
                    {selectedVendor.productsCount} items
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#F7F8F8] border border-[#D5D9D9]">
                  <span className="text-[10px] font-bold text-[#565959] block">
                    Total Orders
                  </span>
                  <span className="tabular-nums font-bold text-base text-[#0F1111]">
                    {selectedVendor.ordersCount}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-3 border-t border-[#D5D9D9] flex items-center justify-between gap-2">
              <div className="text-[11px] text-[#565959]">
                Verified since{' '}
                {new Date(selectedVendor.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/products?vendor=${encodeURIComponent(selectedVendor.id)}`}
                  className="px-3.5 py-2 rounded-lg bg-[#F7F8F8] hover:bg-[#EAEDED] text-[#007185] border border-[#D5D9D9] text-xs font-bold transition-all inline-flex items-center gap-1.5"
                >
                  <Package className="h-3.5 w-3.5" />
                  <span>Manage Catalog</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setSelectedVendor(null)}
                  className="px-4 py-2 rounded-lg bg-[#007185] hover:bg-[#004B57] text-white text-xs font-bold shadow-sm transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
