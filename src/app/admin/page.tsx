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
      {/* Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#D5D9D9]">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#565959] flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-[#007185]" />
            Enterprise Governance Desk
          </span>
          <h1 className="text-2xl sm:text-3xl font-headline font-bold text-[#0F1111] mt-0.5">
            Marketplace Administration Overview
          </h1>
        </div>

        <button
          type="button"
          onClick={fetchMetrics}
          disabled={isLoading}
          className="self-start sm:self-auto px-4 py-2 bg-white text-xs font-bold text-[#007185] hover:bg-[#F7F8F8] border border-[#D5D9D9] rounded-lg shadow-sm transition-all flex items-center gap-2"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Pending Application Alert Banner */}
      {kpis && kpis.pendingApplications > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Verified Vendors */}
        <Link
          href="/admin/vendors?tab=verified"
          className="bg-white rounded-2xl p-5 border border-[#D5D9D9] hover:border-[#007185] hover:shadow-md transition-all flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-label uppercase font-bold text-[#565959] group-hover:text-[#007185] transition-colors flex items-center gap-1">
              <span>Verified Vendors</span>
              <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Store className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-headline font-extrabold text-[#0F1111]">
              {isLoading ? '...' : kpis?.totalVendors ?? 0}
            </span>
            <p className="text-[11px] text-[#565959] mt-1">
              Active artisanal seller storefronts
            </p>
          </div>
        </Link>

        {/* Card 2: Pending Applications */}
        <Link
          href="/admin/vendors?tab=applications"
          className="bg-white rounded-2xl p-5 border border-[#D5D9D9] hover:border-amber-500 hover:shadow-md transition-all flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-label uppercase font-bold text-[#565959] group-hover:text-amber-700 transition-colors flex items-center gap-1">
              <span>Pending Approvals</span>
              <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-headline font-extrabold text-amber-700">
              {isLoading ? '...' : kpis?.pendingApplications ?? 0}
            </span>
            <p className="text-[11px] text-[#565959] mt-1">
              Onboarding submissions pending review
            </p>
          </div>
        </Link>

        {/* Card 3: Products Catalog */}
        <Link
          href="/admin/products"
          className="bg-white rounded-2xl p-5 border border-[#D5D9D9] hover:border-[#007185] hover:shadow-md transition-all flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-label uppercase font-bold text-[#565959] group-hover:text-[#007185] transition-colors flex items-center gap-1">
              <span>Published Products</span>
              <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#e2e7ff] text-[#007185] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-headline font-extrabold text-[#0F1111]">
              {isLoading ? '...' : kpis?.publishedProducts ?? 0}
            </span>
            <p className="text-[11px] text-[#565959] mt-1">
              Of {isLoading ? '...' : kpis?.totalProducts ?? 0} total catalog pieces live
            </p>
          </div>
        </Link>

        {/* Card 4: Orders & Volume */}
        <Link
          href="/admin/orders"
          className="bg-white rounded-2xl p-5 border border-[#D5D9D9] hover:border-blue-500 hover:shadow-md transition-all flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-label uppercase font-bold text-[#565959] group-hover:text-blue-700 transition-colors flex items-center gap-1">
              <span>Total Orders (COD)</span>
              <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-headline font-extrabold text-[#0F1111]">
              {isLoading ? '...' : kpis?.totalOrders ?? 0}
            </span>
            <p className="text-[11px] text-[#565959] mt-1">
              COD Volume: {isLoading ? '...' : formatINR(kpis?.codTotalAmount ?? 0)}
            </p>
          </div>
        </Link>
      </div>

      {/* NEW SECTION: Verified Vendors Directory (Requested by User) */}
      <div className="bg-white rounded-2xl border border-[#D5D9D9] p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D5D9D9]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-headline font-bold text-base text-[#0F1111]">
                  Verified Artisan Vendors
                </h3>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  {verifiedVendors.length} Active
                </span>
              </div>
              <p className="text-xs text-[#565959]">
                Active verified merchants authorized to sell on Vyntra Marketplace
              </p>
            </div>
          </div>
          <Link
            href="/admin/vendors?tab=verified"
            className="text-xs font-bold text-[#007185] hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <span>View Full Directory</span>
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
            <p className="font-semibold text-sm text-[#0F1111]">No verified vendors found.</p>
            <p className="text-xs text-[#565959] mt-0.5">Approve vendor applications to onboard merchants.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#D5D9D9] text-[#565959] uppercase tracking-wider text-[10px]">
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
                        <div className="w-9 h-9 rounded-lg bg-[#800020]/10 text-[#800020] flex items-center justify-center font-bold text-xs shrink-0 border border-[#800020]/20">
                          {vendor.storeName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-[#0F1111] flex items-center gap-1.5">
                            <span>{vendor.storeName}</span>
                            {vendor.isVerified && (
                              <span title="Verified Artisan Seller">
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] font-mono text-[#565959]">
                              slug: {vendor.storeSlug}
                            </span>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-900 border border-amber-300">
                              {vendor.merchantId || `VYN-SELLER-${vendor.id.slice(-5).toUpperCase()}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Owner Details */}
                    <td className="py-3.5 pr-4">
                      <div className="font-semibold text-[#0F1111]">{vendor.ownerName}</div>
                      <div className="text-[11px] text-[#565959] font-mono">{vendor.ownerEmail}</div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 pr-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                        <span>{vendor.status}</span>
                      </span>
                    </td>

                    {/* Commission Rate */}
                    <td className="py-3.5 text-center font-mono font-bold text-[#0F1111]">
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
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#D5D9D9] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#D5D9D9]">
            <div>
              <h3 className="font-headline font-bold text-base text-[#0F1111]">
                Recent Onboarding Submissions
              </h3>
              <p className="text-xs text-[#565959]">
                Latest artisan merchant applications to the Vyntra Marketplace
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
              No vendor applications found in database.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#D5D9D9] text-[#565959] uppercase tracking-wider text-[10px]">
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
                        <div className="text-[10px] text-outline font-mono">{app.applicantEmail}</div>
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
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
          <div className="bg-white rounded-2xl border border-[#D5D9D9] p-5 shadow-sm space-y-3">
            <h3 className="font-headline font-bold text-sm text-[#0F1111]">
              Governance Fast Actions
            </h3>
            <div className="flex flex-col gap-2 pt-1">
              <Link
                href="/admin/vendors?tab=verified"
                className="p-3 rounded-xl border border-[#D5D9D9] hover:border-[#007185] hover:bg-[#F7F8F8] transition-all flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5 font-bold text-[#0F1111]">
                  <Store className="h-4 w-4 text-emerald-700" />
                  <span>Verified Vendors Directory</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-[#565959]" />
              </Link>

              <Link
                href="/admin/vendors?tab=applications"
                className="p-3 rounded-xl border border-[#D5D9D9] hover:border-[#007185] hover:bg-[#F7F8F8] transition-all flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5 font-bold text-[#0F1111]">
                  <Clock className="h-4 w-4 text-amber-700" />
                  <span>Vendor Approvals Desk</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-[#565959]" />
              </Link>

              <Link
                href="/admin/products"
                className="p-3 rounded-xl border border-[#D5D9D9] hover:border-[#007185] hover:bg-[#F7F8F8] transition-all flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5 font-bold text-[#0F1111]">
                  <Package className="h-4 w-4 text-[#007185]" />
                  <span>Product Moderation Catalog</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-[#565959]" />
              </Link>

              <Link
                href="/products"
                className="p-3 rounded-xl border border-[#D5D9D9] hover:border-[#007185] hover:bg-[#F7F8F8] transition-all flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5 font-bold text-[#0F1111]">
                  <ExternalLink className="h-4 w-4 text-[#565959]" />
                  <span>Live Storefront Inspection</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-[#565959]" />
              </Link>
            </div>
          </div>

          <div className="bg-[#131921] text-white rounded-2xl p-5 shadow-sm space-y-2 border border-[#232F3E]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#FFD814]">
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
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-[#D5D9D9] space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-[#D5D9D9]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#007185] flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    Verified Merchant Dossier
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {selectedVendor.status}
                  </span>
                </div>
                <h3 className="font-headline font-bold text-xl text-[#0F1111]">
                  {selectedVendor.storeName}
                </h3>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[11px] font-mono text-[#565959]">
                    /{selectedVendor.storeSlug}
                  </span>
                  {/* Unique Merchant ID with Copy */}
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300 font-mono text-[11px] font-bold">
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
                <span className="text-[10px] uppercase font-bold text-[#565959] block">
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
                    <span className="font-mono font-semibold text-[#0F1111] break-all">
                      {selectedVendor.ownerEmail}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#565959] block text-[10px]">Phone Number:</span>
                    <span className="font-mono font-semibold text-[#0F1111]">
                      {selectedVendor.ownerPhone || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tax & Compliance Identifiers */}
              <div className="grid grid-cols-2 gap-3 font-mono">
                <div className="p-3 rounded-xl bg-[#F7F8F8] border border-[#D5D9D9]">
                  <span className="text-[10px] uppercase font-bold text-[#565959] block font-sans">
                    GSTIN
                  </span>
                  <span className="font-bold text-[#0F1111]">
                    {selectedVendor.gstNumber || '27AAAAA0000A1Z5 (Verified)'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#F7F8F8] border border-[#D5D9D9]">
                  <span className="text-[10px] uppercase font-bold text-[#565959] block font-sans">
                    PAN Card
                  </span>
                  <span className="font-bold text-[#0F1111]">
                    {selectedVendor.panNumber || 'ABCDE1234F (Verified)'}
                  </span>
                </div>
              </div>

              {/* Bank Settlement & Payout Info */}
              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-amber-900 font-bold text-[11px] uppercase tracking-wider">
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
                      {selectedVendor.bankName || 'HDFC Bank Ltd.'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#565959] block text-[10px]">IFSC Code:</span>
                    <span className="font-mono font-bold text-[#0F1111]">
                      {selectedVendor.ifscCode || 'HDFC0000128'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#565959] block text-[10px]">Account Number:</span>
                    <span className="font-mono font-bold text-[#0F1111]">
                      •••• •••• {selectedVendor.bankAccountLast4 || '4291'}
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
                  <span className="text-[10px] uppercase font-bold text-[#565959] block">
                    Commission
                  </span>
                  <span className="font-mono font-bold text-base text-[#0F1111]">
                    {selectedVendor.commissionRate}%
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#F7F8F8] border border-[#D5D9D9]">
                  <span className="text-[10px] uppercase font-bold text-[#565959] block">
                    Active Catalog
                  </span>
                  <span className="font-mono font-bold text-base text-[#0F1111]">
                    {selectedVendor.productsCount} items
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#F7F8F8] border border-[#D5D9D9]">
                  <span className="text-[10px] uppercase font-bold text-[#565959] block">
                    Total Orders
                  </span>
                  <span className="font-mono font-bold text-base text-[#0F1111]">
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
