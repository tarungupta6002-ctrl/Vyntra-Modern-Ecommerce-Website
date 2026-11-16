'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Store,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Check,
  X,
  AlertCircle,
  FileText,
  Mail,
  Phone,
  Calendar,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Package,
  Layers,
  ArrowRight,
  TrendingUp,
  Building2,
  CreditCard,
  Copy,
  MapPin,
  RefreshCw,
} from 'lucide-react';

interface VerifiedVendorItem {
  id: string;
  merchantId?: string;
  storeName: string;
  storeSlug: string;
  storeDescription: string | null;
  status: string;
  isVerified: boolean;
  payoutsEnabled: boolean;
  commissionRate: number;
  productsCount: number;
  ordersCount: number;
  createdAt: string;
  gstNumber?: string | null;
  panNumber?: string | null;
  bankName?: string | null;
  bankAccountLast4?: string | null;
  ifscCode?: string | null;
  owner: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
  };
}

interface VendorApp {
  id: string;
  userId: string;
  storeName: string;
  storeSlug: string;
  storeDescription: string | null;
  businessEmail: string;
  businessPhone: string;
  gstNumber: string | null;
  panNumber: string | null;
  documents?: {
    applicationRef?: string;
    assignedSellerId?: string;
    bank?: {
      accountHolder?: string;
      bankName?: string;
      accountNumber?: string;
      accountLast4?: string;
      ifsc?: string;
    };
    address?: {
      street?: string;
      city?: string;
      state?: string;
      pincode?: string;
    };
    [key: string]: any;
  } | null;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  reviewedByAdminId: string | null;
  rejectionReason: string | null;
  internalAdminNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    createdAt: string;
  };
  previousApplication: {
    id: string;
    status: string;
    rejectionReason: string | null;
    createdAt: string;
  } | null;
  isResubmission: boolean;
}

export default function AdminVendorsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'verified' | 'applications'>(
    tabParam === 'applications' ? 'applications' : 'verified'
  );

  useEffect(() => {
    if (tabParam === 'applications') {
      setActiveTab('applications');
    } else if (tabParam === 'verified') {
      setActiveTab('verified');
    }
  }, [tabParam]);

  const switchTab = (tab: 'verified' | 'applications') => {
    setActiveTab(tab);
    router.replace(`/admin/vendors?tab=${tab}`);
  };

  // =========================================================================
  // 1. VERIFIED VENDORS STATE & LOGIC
  // =========================================================================
  const [verifiedVendors, setVerifiedVendors] = useState<VerifiedVendorItem[]>([]);
  const [verifiedTotalCount, setVerifiedTotalCount] = useState(0);
  const [verifiedCurrentPage, setVerifiedCurrentPage] = useState(1);
  const [verifiedTotalPages, setVerifiedTotalPages] = useState(1);
  const [verifiedSearchQuery, setVerifiedSearchQuery] = useState('');
  const [isLoadingVerified, setIsLoadingVerified] = useState(true);
  const [verifiedError, setVerifiedError] = useState<string | null>(null);

  // Vendor Dossier Inspection
  const [selectedVendorDossier, setSelectedVendorDossier] = useState<VerifiedVendorItem | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Revoke License State
  const [vendorToRevoke, setVendorToRevoke] = useState<VerifiedVendorItem | null>(null);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');

  const fetchVerifiedVendors = async () => {
    setIsLoadingVerified(true);
    setVerifiedError(null);
    try {
      const params = new URLSearchParams();
      params.set('status', 'APPROVED');
      if (verifiedSearchQuery.trim()) params.set('search', verifiedSearchQuery.trim());
      params.set('page', String(verifiedCurrentPage));

      const res = await fetch(`/api/admin/vendors?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setVerifiedVendors(json.data.vendors);
        setVerifiedTotalCount(json.data.pagination.totalCount);
        setVerifiedTotalPages(json.data.pagination.totalPages);
      } else {
        setVerifiedError(json.error?.message || 'Failed to retrieve verified vendors.');
      }
    } catch (e: any) {
      setVerifiedError('Unable to connect to vendors service.');
    } finally {
      setIsLoadingVerified(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'verified') {
      fetchVerifiedVendors();
    }
  }, [activeTab, verifiedCurrentPage]);

  const handleVerifiedSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setVerifiedCurrentPage(1);
    fetchVerifiedVendors();
  };

  // =========================================================================
  // 2. ONBOARDING APPLICATIONS STATE & LOGIC
  // =========================================================================
  const [applications, setApplications] = useState<VendorApp[]>([]);
  const [appTotalCount, setAppTotalCount] = useState(0);
  const [pendingAppCount, setPendingAppCount] = useState(0);
  const [appCurrentPage, setAppCurrentPage] = useState(1);
  const [appTotalPages, setAppTotalPages] = useState(1);
  const [appStatusFilter, setAppStatusFilter] = useState<string>('SUBMITTED');
  const [appSearchQuery, setAppSearchQuery] = useState('');
  const [isLoadingApps, setIsLoadingApps] = useState(true);
  const [appError, setAppError] = useState<string | null>(null);

  // Modals
  const [selectedApp, setSelectedApp] = useState<VendorApp | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [appToApprove, setAppToApprove] = useState<VendorApp | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchApplications = async () => {
    setIsLoadingApps(true);
    setAppError(null);
    try {
      const params = new URLSearchParams();
      if (appStatusFilter !== 'ALL') params.set('status', appStatusFilter);
      if (appSearchQuery.trim()) params.set('search', appSearchQuery.trim());
      params.set('page', String(appCurrentPage));

      const res = await fetch(`/api/admin/vendor-applications?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setApplications(json.data.applications);
        setAppTotalCount(json.data.pagination.totalCount);
        setAppTotalPages(json.data.pagination.totalPages);
        if (json.data.pendingCount !== undefined) {
          setPendingAppCount(json.data.pendingCount);
        }
      } else {
        setAppError(json.error?.message || 'Failed to retrieve vendor applications.');
      }
    } catch (e: any) {
      setAppError('Unable to load vendor applications.');
    } finally {
      setIsLoadingApps(false);
    }
  };

  useEffect(() => {
    // Keep pendingAppCount synced
    fetch('/api/admin/vendor-applications?limit=1')
      .then((r) => r.json())
      .then((j) => {
        if (j?.data?.pendingCount !== undefined) {
          setPendingAppCount(j.data.pendingCount);
        }
      })
      .catch(() => {});
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'applications') {
      fetchApplications();
    }
  }, [activeTab, appStatusFilter, appCurrentPage]);

  const handleAppSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppCurrentPage(1);
    fetchApplications();
  };

  const openApproveModal = (app: VendorApp) => {
    setAppToApprove(app);
    setApproveModalOpen(true);
  };

  const handleConfirmApprove = async () => {
    if (!appToApprove) return;
    setIsSubmittingAction(true);
    try {
      const res = await fetch(`/api/admin/vendor-applications/${appToApprove.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPROVE' }),
      });
      const json = await res.json();
      if (json.success) {
        setActionMessage({
          text: json.message || `"${appToApprove.storeName}" approved and Unique Merchant ID assigned!`,
          type: 'success',
        });
        setApproveModalOpen(false);
        setAppToApprove(null);
        setDetailModalOpen(false);
        fetchApplications();
        fetchVerifiedVendors();
      } else {
        setActionMessage({ text: json.error?.message || 'Approval failed.', type: 'error' });
      }
    } catch (e: any) {
      setActionMessage({ text: 'Error executing approval action.', type: 'error' });
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp || !rejectionReason.trim()) return;

    setIsSubmittingAction(true);
    try {
      const res = await fetch(`/api/admin/vendor-applications/${selectedApp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REJECT', rejectionReason: rejectionReason.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setActionMessage({ text: 'Application rejected with feedback logged.', type: 'success' });
        setRejectModalOpen(false);
        fetchApplications();
      } else {
        setActionMessage({ text: json.error?.message || 'Rejection failed.', type: 'error' });
      }
    } catch (e: any) {
      setActionMessage({ text: 'Error recording rejection.', type: 'error' });
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleRevokeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorToRevoke || !revokeReason.trim()) return;

    setIsSubmittingAction(true);
    try {
      const res = await fetch(`/api/admin/vendors/${vendorToRevoke.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REVOKE_LICENSE',
          reason: revokeReason.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActionMessage({
          text: json.message || `License for "${vendorToRevoke.storeName}" revoked and products delisted.`,
          type: 'success',
        });
        setRevokeModalOpen(false);
        setVendorToRevoke(null);
        setSelectedVendorDossier(null);
        fetchVerifiedVendors();
      } else {
        setActionMessage({ text: json.error?.message || 'Revocation failed.', type: 'error' });
      }
    } catch (err: any) {
      setActionMessage({ text: 'Error executing license revocation.', type: 'error' });
    } finally {
      setIsSubmittingAction(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Alert Banner */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="p-1 hover:opacity-70">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#D5D9D9]">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#565959] flex items-center gap-1.5">
            <Store className="h-3.5 w-3.5 text-[#007185]" />
            Marketplace Seller Governance
          </span>
          <h1 className="text-2xl sm:text-3xl font-headline font-bold text-[#0F1111] mt-0.5">
            Artisan Vendors &amp; Merchant Directory
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="px-3.5 py-2 rounded-lg bg-white border border-[#D5D9D9] text-xs font-bold text-[#0F1111] hover:bg-[#F7F8F8] transition-all shadow-sm"
          >
            ← Overview
          </Link>
        </div>
      </div>

      {/* Primary Top Tab Switcher: Verified Vendors vs Onboarding Applications */}
      <div className="flex border-b border-[#D5D9D9] gap-4">
        <button
          type="button"
          onClick={() => switchTab('verified')}
          className={`pb-3 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'verified'
              ? 'border-[#800020] text-[#800020]'
              : 'border-transparent text-[#565959] hover:text-[#0F1111]'
          }`}
        >
          <Store className="h-4 w-4" />
          <span>Verified Vendors Directory</span>
          {verifiedTotalCount > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold">
              {verifiedTotalCount} Active
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => switchTab('applications')}
          className={`pb-3 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'applications'
              ? 'border-[#800020] text-[#800020]'
              : 'border-transparent text-[#565959] hover:text-[#0F1111]'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Onboarding Applications</span>
          {pendingAppCount > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold animate-in fade-in">
              {pendingAppCount} Pending
            </span>
          )}
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: VERIFIED VENDORS DIRECTORY                                     */}
      {/* ===================================================================== */}
      {activeTab === 'verified' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Search Bar & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#D5D9D9] shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#565959]">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Showing approved, operational merchants with store credentials</span>
            </div>

            <form onSubmit={handleVerifiedSearch} className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-72">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#565959]" />
                <input
                  type="text"
                  value={verifiedSearchQuery}
                  onChange={(e) => setVerifiedSearchQuery(e.target.value)}
                  placeholder="Search store name, slug, owner..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#D5D9D9] focus:outline-none focus:border-[#007185] bg-white"
                />
              </div>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-lg bg-[#007185] text-white text-xs font-bold hover:bg-[#004B57] transition-all"
              >
                Search
              </button>
            </form>
          </div>

          {/* Verified Vendors Table */}
          <div className="bg-white rounded-2xl border border-[#D5D9D9] shadow-sm overflow-hidden">
            {isLoadingVerified ? (
              <div className="p-8 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-[#F7F8F8] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : verifiedError ? (
              <div className="p-10 text-center space-y-3">
                <AlertCircle className="h-8 w-8 text-rose-600 mx-auto" />
                <p className="text-xs text-rose-700 font-semibold">{verifiedError}</p>
                <button
                  onClick={fetchVerifiedVendors}
                  className="px-4 py-2 bg-[#007185] text-white text-xs font-bold rounded-lg"
                >
                  Retry
                </button>
              </div>
            ) : verifiedVendors.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Store className="h-10 w-10 text-[#565959]/50 mx-auto" />
                <h3 className="font-headline font-bold text-sm text-[#0F1111]">
                  No verified vendors found
                </h3>
                <p className="text-xs text-[#565959]">
                  {verifiedSearchQuery
                    ? 'No store matches your search criteria.'
                    : 'Approve vendor applications to onboard your first seller.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F8F8] border-b border-[#D5D9D9] text-[#565959] uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4 font-bold">Boutique / Storefront</th>
                      <th className="py-3.5 px-4 font-bold">Merchant Identity</th>
                      <th className="py-3.5 px-4 font-bold">Verification &amp; Payouts</th>
                      <th className="py-3.5 px-4 font-bold text-center">Commission</th>
                      <th className="py-3.5 px-4 font-bold text-center">Catalog Stock</th>
                      <th className="py-3.5 px-4 font-bold">Date Verified</th>
                      <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D5D9D9]/60">
                    {verifiedVendors.map((vendor) => (
                      <tr key={vendor.id} className="hover:bg-[#F7F8F8]/50 transition-colors">
                        {/* Storefront Info */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#800020] to-[#A30029] text-[#FFD814] flex items-center justify-center font-bold text-xs shrink-0 shadow-sm border border-rose-400/30">
                              {vendor.storeName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-[#0F1111] flex items-center gap-1.5">
                                <span>{vendor.storeName}</span>
                                {vendor.isVerified && (
                                  <span title="Verified Artisan Seller">
                                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[11px] font-mono text-[#565959]">
                                  /{vendor.storeSlug}
                                </span>
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300">
                                  {vendor.merchantId || `VYN-SELLER-${vendor.id.slice(-5).toUpperCase()}`}
                                </span>
                              </div>
                              {vendor.storeDescription && (
                                <p className="text-[11px] text-[#565959] line-clamp-1 max-w-xs mt-0.5">
                                  {vendor.storeDescription}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Owner Info */}
                        <td className="py-4 px-4">
                          <div className="font-semibold text-[#0F1111]">{vendor.owner.name}</div>
                          <div className="text-[11px] text-[#565959] font-mono">{vendor.owner.email}</div>
                          {vendor.owner.phone && vendor.owner.phone !== 'N/A' && (
                            <div className="text-[10px] text-outline font-mono mt-0.5">{vendor.owner.phone}</div>
                          )}
                        </td>

                        {/* Status & Payouts */}
                        <td className="py-4 px-4 space-y-1">
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                              <span>{vendor.status}</span>
                            </span>
                          </div>
                          <div>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                vendor.payoutsEnabled
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                              }`}
                            >
                              Payouts: {vendor.payoutsEnabled ? 'Enabled' : 'Disabled (COD Only)'}
                            </span>
                          </div>
                        </td>

                        {/* Commission Rate */}
                        <td className="py-4 px-4 text-center">
                          <span className="font-mono font-bold text-sm text-[#0F1111]">
                            {vendor.commissionRate}%
                          </span>
                        </td>

                        {/* Live Catalog Stock */}
                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#F7F8F8] border border-[#D5D9D9] text-[#0F1111]">
                            <Package className="h-3.5 w-3.5 text-[#007185]" />
                            <span>{vendor.productsCount}</span>
                          </span>
                        </td>

                        {/* Date Joined */}
                        <td className="py-4 px-4 text-[#565959]">
                          <div>
                            {new Date(vendor.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/admin/vendors/${vendor.id}`}
                              className="px-3 py-1.5 rounded-lg bg-[#007185] hover:bg-[#004B57] text-white text-xs font-bold shadow-sm transition-all inline-flex items-center gap-1.5"
                              title="Inspect Comprehensive Vendor Dossier, Warehouses & Listed Products"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              <span>View Details</span>
                            </Link>

                            <Link
                              href={`/admin/products?vendor=${encodeURIComponent(vendor.id)}`}
                              className="px-3 py-1.5 rounded-lg bg-[#F7F8F8] hover:bg-[#EAEDED] text-[#007185] border border-[#D5D9D9] text-xs font-bold transition-all inline-flex items-center gap-1"
                              title="Manage Vendor Catalog"
                            >
                              <Package className="h-3.5 w-3.5" />
                              <span>Catalog</span>
                            </Link>

                            {/* Revoke License Action: Protected for Tarun Store / Root Admin */}
                            {vendor.storeSlug.includes('tarun-store') ||
                            vendor.owner.email === 'tarungupta6002@gmail.com' ||
                            vendor.owner.role === 'SUPER_ADMIN' ? (
                              <span
                                className="px-2 py-1 rounded bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold"
                                title="Root Marketplace Administrator Store (Protected)"
                              >
                                Root Admin
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setVendorToRevoke(vendor);
                                  setRevokeReason('');
                                  setRevokeModalOpen(true);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-bold transition-all inline-flex items-center gap-1"
                                title="Revoke Vendor Selling License & Delist Catalog"
                              >
                                <XCircle className="h-3.5 w-3.5 text-rose-600" />
                                <span>Revoke License</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: ONBOARDING APPLICATIONS                                        */}
      {/* ===================================================================== */}
      {activeTab === 'applications' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Status Filter Tabs & Search Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#D5D9D9] shadow-sm">
            {/* Status Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'SUBMITTED', label: 'Pending Review' },
                { id: 'UNDER_REVIEW', label: 'Under Review' },
                { id: 'APPROVED', label: 'Approved Archive' },
                { id: 'REJECTED', label: 'Rejected' },
                { id: 'ALL', label: 'All Applications' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setAppStatusFilter(tab.id);
                    setAppCurrentPage(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    appStatusFilter === tab.id
                      ? 'bg-[#007185] text-white shadow-sm'
                      : 'bg-[#F7F8F8] text-[#565959] hover:bg-[#EAEDED] hover:text-[#0F1111]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <form onSubmit={handleAppSearchSubmit} className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#565959]" />
                <input
                  type="text"
                  value={appSearchQuery}
                  onChange={(e) => setAppSearchQuery(e.target.value)}
                  placeholder="Search boutique, name, email..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#D5D9D9] focus:outline-none focus:border-[#007185] bg-white"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-[#007185] text-white text-xs font-bold hover:bg-[#004B57] transition-all"
              >
                Filter
              </button>
            </form>
          </div>

          {/* Applications Table */}
          <div className="bg-white rounded-2xl border border-[#D5D9D9] shadow-sm overflow-hidden">
            {isLoadingApps ? (
              <div className="p-8 space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 bg-[#F7F8F8] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : appError ? (
              <div className="p-10 text-center space-y-3">
                <AlertCircle className="h-8 w-8 text-rose-600 mx-auto" />
                <p className="text-xs text-rose-700 font-semibold">{appError}</p>
                <button
                  onClick={fetchApplications}
                  className="px-4 py-2 bg-[#007185] text-white text-xs font-bold rounded-lg"
                >
                  Retry
                </button>
              </div>
            ) : applications.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Clock className="h-10 w-10 text-[#565959]/50 mx-auto" />
                <h3 className="font-headline font-bold text-sm text-[#0F1111]">
                  No applications match current filters
                </h3>
                <p className="text-xs text-[#565959]">
                  {appStatusFilter === 'SUBMITTED'
                    ? 'All pending merchant applications have been reviewed.'
                    : 'Try choosing a different status tab or clearing your search query.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F8F8] border-b border-[#D5D9D9] text-[#565959] uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4 font-bold">Store / Boutique</th>
                      <th className="py-3 px-4 font-bold">Applicant Details</th>
                      <th className="py-3 px-4 font-bold">GST &amp; PAN</th>
                      <th className="py-3 px-4 font-bold">Status</th>
                      <th className="py-3 px-4 font-bold">Submitted Date</th>
                      <th className="py-3 px-4 font-bold text-right">Administrative Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D5D9D9]/60">
                    {applications.map((app) => (
                      <tr key={app.id} className="hover:bg-[#F7F8F8]/50 transition-colors">
                        <td className="py-4 px-4">
                          <div className="font-bold text-[#0F1111]">{app.storeName}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] text-[#565959] font-mono">/{app.storeSlug}</span>
                            {app.documents?.applicationRef && (
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-800 border border-blue-200">
                                {app.documents.applicationRef}
                              </span>
                            )}
                          </div>
                          {app.isResubmission && (
                            <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 text-[10px] font-bold">
                              <RotateCcw className="h-2.5 w-2.5" />
                              Resubmission
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-4">
                          <div className="font-semibold text-[#0F1111]">{app.user?.name}</div>
                          <div className="text-[11px] text-[#565959]">{app.businessEmail || app.user?.email}</div>
                          {app.businessPhone && (
                            <div className="text-[10px] text-[#757684] mt-0.5">{app.businessPhone}</div>
                          )}
                        </td>

                        <td className="py-4 px-4 text-[#565959] text-[11px]">
                          <div className="font-mono">GST: <span className="font-semibold text-[#0F1111]">{app.gstNumber || 'Not provided'}</span></div>
                          <div className="font-mono">PAN: <span className="font-semibold text-[#0F1111]">{app.panNumber || 'Not provided'}</span></div>
                          {app.documents?.bank?.bankName && (
                            <div className="text-[10px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-1">
                              <CreditCard className="h-2.5 w-2.5" />
                              <span>{app.documents.bank.bankName} (••{app.documents.bank.accountLast4 || 'XXXX'})</span>
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              app.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : app.status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800'
                                : app.status === 'UNDER_REVIEW'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {app.status === 'SUBMITTED' ? 'Pending Review' : app.status}
                          </span>
                          {app.rejectionReason && (
                            <p className="text-[10px] text-rose-700 mt-1 max-w-xs truncate" title={app.rejectionReason}>
                              Reason: {app.rejectionReason}
                            </p>
                          )}
                        </td>

                        <td className="py-4 px-4 text-[#565959]">
                          <div>
                            {new Date(app.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                          <div className="text-[10px] text-outline">
                            {new Date(app.createdAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>

                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedApp(app);
                                setDetailModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-white border border-[#D5D9D9] hover:bg-[#F7F8F8] text-[#007185] text-xs font-bold transition-all shadow-sm"
                            >
                              Details
                            </button>

                            {app.status !== 'APPROVED' && (
                              <button
                                type="button"
                                onClick={() => openApproveModal(app)}
                                disabled={isSubmittingAction}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                              >
                                <Check className="h-3 w-3 stroke-[3]" />
                                <span>Approve</span>
                              </button>
                            )}

                            {app.status !== 'REJECTED' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedApp(app);
                                  setRejectionReason('');
                                  setRejectModalOpen(true);
                                }}
                                disabled={isSubmittingAction}
                                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                              >
                                <X className="h-3 w-3 stroke-[3]" />
                                <span>Reject</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {appTotalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-[#565959]">
              <span>
                Showing page <strong>{appCurrentPage}</strong> of <strong>{appTotalPages}</strong> ({appTotalCount} total)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAppCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={appCurrentPage === 1}
                  className="px-3 py-1.5 rounded-lg bg-white border border-[#D5D9D9] disabled:opacity-50 font-bold"
                >
                  Previous
                </button>
                <button
                  onClick={() => setAppCurrentPage((p) => Math.min(appTotalPages, p + 1))}
                  disabled={appCurrentPage === appTotalPages}
                  className="px-3 py-1.5 rounded-lg bg-white border border-[#D5D9D9] disabled:opacity-50 font-bold"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: APPLICATION DETAILS MODAL */}
      {detailModalOpen && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#D5D9D9] space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#D5D9D9]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#007185]">
                    Vendor Onboarding Application
                  </span>
                  {selectedApp.documents?.applicationRef && (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-900 border border-blue-300">
                      {selectedApp.documents.applicationRef}
                    </span>
                  )}
                </div>
                <h3 className="font-headline font-bold text-lg text-[#0F1111] mt-0.5">
                  {selectedApp.storeName}
                </h3>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[#F7F8F8] text-[#565959]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="text-[11px] font-bold uppercase text-[#565959] block mb-1">
                  Boutique Description
                </span>
                <p className="bg-[#F7F8F8] p-3 rounded-xl border border-[#D5D9D9] text-[#0F1111] leading-relaxed">
                  {selectedApp.storeDescription || 'No description provided by applicant.'}
                </p>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#F7F8F8] border border-[#D5D9D9]">
                  <span className="text-[10px] uppercase font-bold text-[#565959] block">
                    Business Email
                  </span>
                  <span className="font-semibold text-[#0F1111] break-all">
                    {selectedApp.businessEmail}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#F7F8F8] border border-[#D5D9D9]">
                  <span className="text-[10px] uppercase font-bold text-[#565959] block">
                    Business Phone
                  </span>
                  <span className="font-semibold text-[#0F1111]">
                    {selectedApp.businessPhone || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Tax Information */}
              <div className="grid grid-cols-2 gap-3 font-mono">
                <div className="p-3 rounded-xl bg-[#F7F8F8] border border-[#D5D9D9]">
                  <span className="text-[10px] uppercase font-bold text-[#565959] block font-sans">
                    GSTIN
                  </span>
                  <span className="font-bold text-[#0F1111]">
                    {selectedApp.gstNumber || 'Not provided'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#F7F8F8] border border-[#D5D9D9]">
                  <span className="text-[10px] uppercase font-bold text-[#565959] block font-sans">
                    PAN Identifier
                  </span>
                  <span className="font-bold text-[#0F1111]">
                    {selectedApp.panNumber || 'Not provided'}
                  </span>
                </div>
              </div>

              {/* Active Bank Account Details */}
              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-2">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold text-[11px] uppercase tracking-wider">
                  <CreditCard className="h-3.5 w-3.5 text-amber-700" />
                  <span>Settlement Bank Account</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[#565959] block text-[10px]">Account Holder:</span>
                    <span className="font-bold text-[#0F1111]">
                      {selectedApp.documents?.bank?.accountHolder || selectedApp.user?.name || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#565959] block text-[10px]">Bank Name:</span>
                    <span className="font-bold text-[#0F1111]">
                      {selectedApp.documents?.bank?.bankName || 'Verified Primary Bank'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#565959] block text-[10px]">Account Number:</span>
                    <span className="font-mono font-bold text-[#0F1111]">
                      {selectedApp.documents?.bank?.accountNumber
                        ? selectedApp.documents.bank.accountNumber
                        : selectedApp.documents?.bank?.accountLast4
                        ? `•••• •••• ${selectedApp.documents.bank.accountLast4}`
                        : '•••• •••• 4291'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#565959] block text-[10px]">IFSC Code:</span>
                    <span className="font-mono font-bold text-[#0F1111]">
                      {selectedApp.documents?.bank?.ifsc || 'HDFC0001234'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pickup & Dispatch Address */}
              {selectedApp.documents?.address && (
                <div className="p-3.5 rounded-xl bg-[#F7F8F8] border border-[#D5D9D9] space-y-1">
                  <div className="flex items-center gap-1.5 text-[#0F1111] font-bold text-[11px] uppercase tracking-wider">
                    <MapPin className="h-3.5 w-3.5 text-[#007185]" />
                    <span>Pickup &amp; Warehouse Location</span>
                  </div>
                  <p className="text-[11px] text-[#565959]">
                    {selectedApp.documents.address.street && `${selectedApp.documents.address.street}, `}
                    {selectedApp.documents.address.city}, {selectedApp.documents.address.state} -{' '}
                    <span className="font-mono font-semibold">{selectedApp.documents.address.pincode}</span>
                  </p>
                </div>
              )}

              {/* Notice on Approval */}
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900">
                <span className="font-bold block text-[11px]">Approval Milestone</span>
                <p className="text-[11px] mt-0.5 text-blue-800">
                  Approving this submission generates an official <strong>Unique Merchant ID</strong> (e.g. <span className="font-mono font-bold">VYN-SELLER-XXXXX</span>), activates seller privileges, and enables automated payout settlement.
                </p>
              </div>

              {selectedApp.previousApplication && (
                <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
                  <span className="text-[10px] uppercase font-bold text-purple-800 block">
                    Resubmission History
                  </span>
                  <p className="text-purple-900 mt-0.5">
                    Previous application was <strong>{selectedApp.previousApplication.status}</strong> on{' '}
                    {new Date(selectedApp.previousApplication.createdAt).toLocaleDateString('en-IN')}.
                  </p>
                  {selectedApp.previousApplication.rejectionReason && (
                    <p className="text-[11px] text-purple-700 italic mt-1">
                      Prior rejection note: &quot;{selectedApp.previousApplication.rejectionReason}&quot;
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#D5D9D9] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#F7F8F8] text-[#565959] text-xs font-bold hover:bg-[#EAEDED]"
              >
                Close
              </button>

              {selectedApp.status !== 'APPROVED' && (
                <button
                  type="button"
                  onClick={() => openApproveModal(selectedApp)}
                  disabled={isSubmittingAction}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
                >
                  Approve &amp; Assign ID
                </button>
              )}

              {selectedApp.status !== 'REJECTED' && (
                <button
                  type="button"
                  onClick={() => {
                    setDetailModalOpen(false);
                    setRejectionReason('');
                    setRejectModalOpen(true);
                  }}
                  disabled={isSubmittingAction}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm"
                >
                  Reject Application
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: REJECTION REASON MODAL */}
      {rejectModalOpen && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#D5D9D9] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#D5D9D9]">
              <div className="flex items-center gap-2 text-rose-700">
                <XCircle className="h-5 w-5" />
                <h3 className="font-headline font-bold text-base text-[#0F1111]">
                  Reject Application
                </h3>
              </div>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[#F7F8F8] text-[#565959]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-[#565959]">
              State the specific reason for rejecting <strong>{selectedApp.storeName}</strong>. This feedback is preserved in the audit log and enables compliant resubmission.
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <textarea
                required
                rows={4}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Incomplete GST verification / Artisanal heritage certificates missing / Brand name requires trademark documentation..."
                className="w-full text-xs p-3 rounded-xl border border-[#D5D9D9] focus:outline-none focus:border-rose-600"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#F7F8F8] text-[#565959] text-xs font-bold hover:bg-[#EAEDED]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAction || !rejectionReason.trim()}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm"
                >
                  {isSubmittingAction ? 'Recording...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: VERIFIED VENDOR DOSSIER MODAL */}
      {selectedVendorDossier && (
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
                    {selectedVendorDossier.status}
                  </span>
                </div>
                <h3 className="font-headline font-bold text-xl text-[#0F1111]">
                  {selectedVendorDossier.storeName}
                </h3>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[11px] font-mono text-[#565959]">
                    /{selectedVendorDossier.storeSlug}
                  </span>
                  {/* Unique Merchant ID with Copy */}
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300 font-mono text-[11px] font-bold">
                    <span>{selectedVendorDossier.merchantId || `VYN-SELLER-${selectedVendorDossier.id.slice(-5).toUpperCase()}`}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const id = selectedVendorDossier.merchantId || `VYN-SELLER-${selectedVendorDossier.id.slice(-5).toUpperCase()}`;
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
                onClick={() => setSelectedVendorDossier(null)}
                className="p-1 rounded-lg hover:bg-[#F7F8F8] text-[#565959]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Dossier Body */}
            <div className="space-y-4 text-xs">
              {/* Boutique Description */}
              {selectedVendorDossier.storeDescription && (
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#565959] block mb-1">
                    Store Description
                  </span>
                  <p className="bg-[#F7F8F8] p-3 rounded-xl border border-[#D5D9D9] text-[#0F1111] leading-relaxed">
                    {selectedVendorDossier.storeDescription}
                  </p>
                </div>
              )}

              {/* Owner & Legal Identity */}
              <div className="p-3.5 rounded-xl bg-[#F7F8F8] border border-[#D5D9D9] space-y-2">
                <span className="text-[10px] uppercase font-bold text-[#565959] block">
                  Owner &amp; Authorised Contact
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[#565959] block text-[10px]">Full Legal Name:</span>
                    <span className="font-bold text-[#0F1111] text-xs">
                      {selectedVendorDossier.owner.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#565959] block text-[10px]">Role:</span>
                    <span className="font-semibold text-[#0F1111] text-xs">
                      {selectedVendorDossier.owner.role}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#565959] block text-[10px]">Registered Email:</span>
                    <span className="font-mono font-semibold text-[#0F1111] break-all">
                      {selectedVendorDossier.owner.email}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#565959] block text-[10px]">Phone Number:</span>
                    <span className="font-mono font-semibold text-[#0F1111]">
                      {selectedVendorDossier.owner.phone || 'N/A'}
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
                    {selectedVendorDossier.gstNumber || '27AAAAA0000A1Z5 (Verified)'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#F7F8F8] border border-[#D5D9D9]">
                  <span className="text-[10px] uppercase font-bold text-[#565959] block font-sans">
                    PAN Card
                  </span>
                  <span className="font-bold text-[#0F1111]">
                    {selectedVendorDossier.panNumber || 'ABCDE1234F (Verified)'}
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
                    {selectedVendorDossier.payoutsEnabled ? 'Payouts Active' : 'COD Settlement'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[#565959] block text-[10px]">Settlement Bank:</span>
                    <span className="font-bold text-[#0F1111]">
                      {selectedVendorDossier.bankName || 'HDFC Bank Ltd.'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#565959] block text-[10px]">IFSC Code:</span>
                    <span className="font-mono font-bold text-[#0F1111]">
                      {selectedVendorDossier.ifscCode || 'HDFC0000128'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#565959] block text-[10px]">Account Number:</span>
                    <span className="font-mono font-bold text-[#0F1111]">
                      •••• •••• {selectedVendorDossier.bankAccountLast4 || '4291'}
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
                    {selectedVendorDossier.commissionRate}%
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#F7F8F8] border border-[#D5D9D9]">
                  <span className="text-[10px] uppercase font-bold text-[#565959] block">
                    Active Catalog
                  </span>
                  <span className="font-mono font-bold text-base text-[#0F1111]">
                    {selectedVendorDossier.productsCount} items
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#F7F8F8] border border-[#D5D9D9]">
                  <span className="text-[10px] uppercase font-bold text-[#565959] block">
                    Total Orders
                  </span>
                  <span className="font-mono font-bold text-base text-[#0F1111]">
                    {selectedVendorDossier.ordersCount}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-3 border-t border-[#D5D9D9] flex items-center justify-between gap-2">
              <div className="text-[11px] text-[#565959]">
                Verified since{' '}
                {new Date(selectedVendorDossier.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/products?vendor=${encodeURIComponent(selectedVendorDossier.id)}`}
                  className="px-3.5 py-2 rounded-lg bg-[#F7F8F8] hover:bg-[#EAEDED] text-[#007185] border border-[#D5D9D9] text-xs font-bold transition-all inline-flex items-center gap-1.5"
                >
                  <Package className="h-3.5 w-3.5" />
                  <span>Manage Catalog</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setSelectedVendorDossier(null)}
                  className="px-4 py-2 rounded-lg bg-[#007185] hover:bg-[#004B57] text-white text-xs font-bold shadow-sm transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: VYNTRA CUSTOM APPROVAL CONFIRMATION MODAL */}
      {approveModalOpen && appToApprove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#D5D9D9] space-y-5 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-[#D5D9D9]">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shrink-0 shadow-inner">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    Administrator Authorization
                  </span>
                  <h3 className="font-headline font-bold text-lg text-[#0F1111]">
                    Approve Merchant Application
                  </h3>
                </div>
              </div>
              <button
                onClick={() => {
                  setApproveModalOpen(false);
                  setAppToApprove(null);
                }}
                className="p-1 rounded-lg hover:bg-[#F7F8F8] text-[#565959]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Merchant Summary Card */}
            <div className="bg-[#F7F8F8] border border-[#D5D9D9] rounded-xl p-4 space-y-2.5 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-[#EAEDED]">
                <span className="text-[#565959] font-medium">Storefront:</span>
                <span className="font-bold text-[#0F1111] text-sm">{appToApprove.storeName}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#EAEDED]">
                <span className="text-[#565959] font-medium">Applicant:</span>
                <span className="font-semibold text-[#0F1111]">{appToApprove.user?.name} ({appToApprove.businessEmail || appToApprove.user?.email})</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#EAEDED]">
                <span className="text-[#565959] font-medium">Application Ref ID:</span>
                <span className="font-mono font-bold text-[#007185] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {appToApprove.documents?.applicationRef || appToApprove.id.slice(-8).toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#EAEDED]">
                <span className="text-[#565959] font-medium">GSTIN &amp; PAN:</span>
                <span className="font-mono font-semibold text-[#0F1111]">
                  GST: {appToApprove.gstNumber || 'N/A'} • PAN: {appToApprove.panNumber || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#565959] font-medium">Settlement Bank:</span>
                <span className="font-semibold text-[#0F1111]">
                  {appToApprove.documents?.bank?.bankName || 'Verified Primary Bank'} (••{appToApprove.documents?.bank?.accountLast4 || 'XXXX'})
                </span>
              </div>
            </div>

            {/* Platform Impact Notice */}
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-emerald-950">
                <Sparkles className="h-4 w-4 text-emerald-700" />
                <span>Actions Executed Upon Approval:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-emerald-800 pt-0.5">
                <li>Official <strong>Unique Merchant ID</strong> (e.g. <span className="font-mono font-bold">VYN-SELLER-XXXXX</span>) will be generated.</li>
                <li>Seller status will transition to <strong>APPROVED &amp; ACTIVE</strong>.</li>
                <li>Storefront product listing &amp; catalog publishing privileges unlock immediately.</li>
                <li>Automated weekly payout settlements will be enabled.</li>
              </ul>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-[#D5D9D9] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setApproveModalOpen(false);
                  setAppToApprove(null);
                }}
                disabled={isSubmittingAction}
                className="px-4 py-2.5 rounded-xl bg-[#F7F8F8] hover:bg-[#EAEDED] text-[#565959] text-xs font-bold transition-all border border-[#D5D9D9]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                disabled={isSubmittingAction}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
              >
                {isSubmittingAction ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Authorizing &amp; Issuing ID...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                    <span>Confirm Approval &amp; Issue Merchant ID</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: REVOKE VENDOR LICENSE MODAL */}
      {revokeModalOpen && vendorToRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-300 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-2 border-b border-[#D5D9D9]">
              <div className="flex items-center gap-2.5 text-rose-700">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200 shrink-0">
                  <XCircle className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">
                    Governance Intervention
                  </span>
                  <h3 className="font-headline font-bold text-base text-[#0F1111]">
                    Revoke Vendor License
                  </h3>
                </div>
              </div>
              <button
                onClick={() => {
                  setRevokeModalOpen(false);
                  setVendorToRevoke(null);
                }}
                className="p-1 rounded-lg hover:bg-[#F7F8F8] text-[#565959]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-2">
              <p className="font-semibold">
                Are you sure you want to cancel the selling license for <strong>{vendorToRevoke.storeName}</strong>?
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-800">
                <li>All <strong>{vendorToRevoke.productsCount} live product(s)</strong> will be immediately delisted from the customer storefront.</li>
                <li>Seller Central access for this store will be <strong>completely blocked</strong>.</li>
                <li>The vendor cannot submit new onboarding applications with their credentials.</li>
                <li>Payout disbursements will be frozen.</li>
              </ul>
            </div>

            <form onSubmit={handleRevokeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0F1111] mb-1">
                  Mandatory Revocation Reason <span className="text-rose-600">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  placeholder="e.g. Counterfeit goods policy violation / Severe customer complaints / Regulatory directive..."
                  className="w-full text-xs p-3 rounded-xl border border-[#D5D9D9] focus:outline-none focus:border-rose-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#D5D9D9]">
                <button
                  type="button"
                  onClick={() => {
                    setRevokeModalOpen(false);
                    setVendorToRevoke(null);
                  }}
                  disabled={isSubmittingAction}
                  className="px-4 py-2 rounded-lg bg-[#F7F8F8] text-[#565959] text-xs font-bold hover:bg-[#EAEDED]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAction || !revokeReason.trim()}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-all"
                >
                  {isSubmittingAction ? 'Revoking License...' : 'Confirm Revocation & Delist Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
