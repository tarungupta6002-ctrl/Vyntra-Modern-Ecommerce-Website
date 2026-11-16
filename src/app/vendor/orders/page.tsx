'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Package,
  Truck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Filter,
  ArrowRight,
  ExternalLink,
  MapPin,
  Phone,
  RefreshCw,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Store,
  Calendar,
} from 'lucide-react';
import { formatINR } from '@/lib/utils';

interface VendorOrderItem {
  id: string;
  productId: string;
  variantId?: string | null;
  title: string;
  brand: string;
  slug: string;
  sku: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  image: string;
  createdAt: string;
}

interface VendorOrder {
  id: string;
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
  datePlaced: string;
  placedTime: string;
  shippingAddress: {
    fullName: string;
    phone: string;
    streetAddress: string;
    locality?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    addressType: string;
    formatted: string;
  } | null;
  vendorSubtotal: number;
  vendorTotalQuantity: number;
  items: VendorOrderItem[];
}

interface VendorMetrics {
  totalOrders: number;
  totalUnitsSold: number;
  pendingCount: number;
  processingCount: number;
  shippedCount: number;
  deliveredCount: number;
  cancelledCount: number;
  totalRevenue: number;
}

interface VendorSession {
  userId: string;
  email: string;
  name?: string;
  role: string;
  isVendor: boolean;
  vendorProfile: {
    id: string;
    storeName: string;
    storeSlug: string;
    status: string;
    isVerified: boolean;
  } | null;
  vendorApplication?: {
    id: string;
    storeName: string;
    status: string;
    rejectionReason: string | null;
    createdAt: string;
  } | null;
}

function VendorOrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('orderId') || searchParams.get('search') || '';

  const [session, setSession] = useState<VendorSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [metrics, setMetrics] = useState<VendorMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);
  const [searchInput, setSearchInput] = useState<string>(initialSearch);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Status updating state
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // 1. Fetch Vendor Session
  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch('/api/vendor/me');
        const data = await res.json();
        if (data.success && data.data) {
          setSession(data.data);
        }
      } catch (e) {
        console.error('Failed to fetch vendor session:', e);
      } finally {
        setSessionLoading(false);
      }
    }
    fetchSession();
  }, []);

  // 2. Fetch Vendor Orders
  const fetchOrders = async (targetPage = page, targetStatus = statusFilter, targetSearch = searchQuery) => {
    setIsLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      query.set('page', String(targetPage));
      query.set('limit', '10');
      if (targetStatus && targetStatus !== 'all') {
        query.set('status', targetStatus.toUpperCase());
      }
      if (targetSearch.trim()) {
        query.set('search', targetSearch.trim());
      }

      const res = await fetch(`/api/vendor/orders?${query.toString()}`);
      const json = await res.json();

      if (json.success && json.data) {
        setOrders(json.data.orders || []);
        setMetrics(json.data.metrics || null);
        setPage(json.data.pagination.page);
        setTotalPages(json.data.pagination.totalPages);
        setTotalCount(json.data.pagination.totalCount);
      } else {
        setError(json.error?.message || 'Failed to load vendor orders');
      }
    } catch (err: any) {
      setError('Network error while loading orders.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session?.isVendor && session.vendorProfile) {
      fetchOrders(1, statusFilter, searchQuery);
    }
  }, [session, statusFilter, searchQuery]);

  // 3. Handle Status Transition
  const handleUpdateStatus = async (orderId: string, itemId: string, nextStatus: string) => {
    setUpdatingItemId(itemId);
    try {
      const res = await fetch(`/api/vendor/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(itemId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json();

      if (json.success) {
        showToast(json.message || `Item status updated to ${nextStatus}`, 'success');
        // Refresh orders list and metrics seamlessly
        fetchOrders(page, statusFilter, searchQuery);
      } else {
        showToast(json.error?.message || 'Failed to update item status', 'error');
      }
    } catch (e: any) {
      showToast('Error updating item status', 'error');
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleCopyOrderNumber = (orderNum: string) => {
    navigator.clipboard.writeText(orderNum);
    setCopiedOrderId(orderNum);
    showToast(`Order number ${orderNum} copied`, 'success');
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setPage(1);
  };

  const handleClearFilters = () => {
    setStatusFilter('all');
    setSearchQuery('');
    setSearchInput('');
    setPage(1);
  };

  // Session Loading
  if (sessionLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-8 h-8 border-4 border-[#FFD814] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-[#565959] font-medium">Verifying seller credentials...</span>
      </div>
    );
  }

  // Pending Review State
  const isPending =
    session?.vendorProfile?.status === 'PENDING' ||
    session?.vendorApplication?.status === 'SUBMITTED' ||
    session?.vendorApplication?.status === 'UNDER_REVIEW';

  if (isPending && !session?.isVendor) {
    const storeName =
      session?.vendorApplication?.storeName ||
      session?.vendorProfile?.storeName ||
      'Your Atelier';

    return (
      <div className="max-w-xl mx-auto my-12 bg-white rounded-xl border border-amber-200/80 p-8 text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <Clock className="h-6 w-6 animate-pulse" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
          Application Under Review
        </div>
        <h2 className="text-xl font-bold text-[#0F1111]">{storeName} — Fulfillment Desk Locked</h2>
        <p className="text-xs text-[#565959] leading-relaxed">
          Your merchant application for <strong>{storeName}</strong> is currently awaiting administrative review in Admin Central.
          Signed in as: <strong className="text-[#0F1111]">{session?.email}</strong>.
          Once approved, your order fulfillment queue will activate automatically.
        </p>
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/vendor/products"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] text-xs font-bold shadow-sm"
          >
            <span>View Application Status</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#F7F8F8] border border-[#D5D9D9] hover:bg-[#EAEDED] text-[#0F1111] text-xs font-semibold"
          >
            <span>Return to Storefront</span>
          </Link>
        </div>
      </div>
    );
  }

  // Not a Vendor -> Direct to Seller Onboarding
  if (!session?.isVendor || !session.vendorProfile) {
    if (typeof window !== 'undefined') {
      router.replace('/become-seller');
    }
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <RefreshCw className="h-8 w-8 text-[#FF9900] animate-spin mb-4" />
        <p className="text-sm font-semibold text-[#0F1111]">Redirecting to Seller Onboarding...</p>
        <p className="text-xs text-[#565959] mt-1">Please complete your merchant setup to access Seller Central.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200 ${
            toast.type === 'success'
              ? 'bg-[#007185] text-white'
              : 'bg-rose-600 text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#FFD814]" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header & Store Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#D5D9D9]">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-extrabold text-[#0F1111] tracking-tight">
              {session.vendorProfile.storeName} — Seller Central
            </h1>
            <span className="bg-[#E7F4F5] text-[#007185] border border-[#007185]/30 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verified Merchant
            </span>
          </div>
          <p className="text-xs text-[#565959] mt-1">
            Order Fulfillment Desk &bull; Signed in as: <strong className="text-[#0F1111]">{session.email}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fetchOrders(page, statusFilter, searchQuery)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-[#D5D9D9] hover:bg-[#F7FAFA] text-xs font-semibold text-[#0F1111] shadow-sm transition-all"
            title="Refresh Orders"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            href="/vendor/products"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#007185] hover:bg-[#004B57] text-white text-xs font-bold shadow-sm transition-all"
          >
            <Package className="h-4 w-4" />
            <span>Manage Inventory</span>
          </Link>
        </div>
      </div>

      {/* KPI Metrics Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-[#D5D9D9] shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#565959]">
            Total Orders
          </span>
          <div className="text-2xl font-extrabold text-[#0F1111] mt-2">
            {metrics ? metrics.totalOrders : '—'}
          </div>
          <span className="text-[11px] text-[#565959] mt-1">
            {metrics ? `${metrics.totalUnitsSold} items ordered` : 'All-time'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#D5D9D9] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              Needs Prep
            </span>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <div className="text-2xl font-extrabold text-amber-700 mt-2">
            {metrics ? metrics.pendingCount : '—'}
          </div>
          <span className="text-[11px] text-[#565959] mt-1">Pending confirmation</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#D5D9D9] shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#007185]">
            In Preparation
          </span>
          <div className="text-2xl font-extrabold text-[#007185] mt-2">
            {metrics ? metrics.processingCount : '—'}
          </div>
          <span className="text-[11px] text-[#565959] mt-1">Artisan packaging</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#D5D9D9] shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
            Dispatched
          </span>
          <div className="text-2xl font-extrabold text-indigo-700 mt-2">
            {metrics ? metrics.shippedCount : '—'}
          </div>
          <span className="text-[11px] text-[#565959] mt-1">Handed to courier</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#D5D9D9] shadow-sm flex flex-col justify-between col-span-2 lg:col-span-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F1111]">
            Vendor Net Revenue
          </span>
          <div className="text-2xl font-extrabold text-[#007185] font-mono mt-2">
            {metrics ? formatINR(metrics.totalRevenue) : '—'}
          </div>
          <span className="text-[11px] text-[#565959] mt-1">Net realized value (Returns deducted)</span>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#D5D9D9] shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'All Orders' },
              { id: 'pending', label: 'Pending Prep', count: metrics?.pendingCount },
              { id: 'processing', label: 'In Packing', count: metrics?.processingCount },
              { id: 'shipped', label: 'Dispatched', count: metrics?.shippedCount },
              { id: 'delivered', label: 'Delivered', count: metrics?.deliveredCount },
              { id: 'cancelled', label: 'Cancelled', count: metrics?.cancelledCount },
            ].map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab.id);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#131921] text-white shadow-sm'
                      : 'bg-[#F7F8F8] text-[#565959] hover:bg-[#EAEDED] hover:text-[#0F1111]'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isActive
                          ? 'bg-[#FFD814] text-[#0F1111]'
                          : 'bg-[#D5D9D9] text-[#565959]'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-sm w-full">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search Order #, Customer, or Product..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#D5D9D9] focus:outline-none focus:border-[#007185] bg-white text-[#0F1111]"
              />
              <Search className="h-3.5 w-3.5 text-[#565959] absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] text-xs font-bold rounded-lg shadow-xs transition-colors shrink-0"
            >
              Filter
            </button>
            {(searchQuery || statusFilter !== 'all') && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs text-[#007185] hover:underline font-semibold shrink-0"
              >
                Reset
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Orders List Content */}
      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-[#D5D9D9] p-6 h-56" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 bg-white rounded-xl border border-rose-200 text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
          <p className="text-sm font-bold text-rose-900">{error}</p>
          <button
            type="button"
            onClick={() => fetchOrders(page, statusFilter, searchQuery)}
            className="text-xs font-bold text-[#007185] underline"
          >
            Retry Loading
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#D5D9D9] p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#EAEDED] text-[#565959] flex items-center justify-center mx-auto">
            <Package className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-[#0F1111]">No Orders Found</h3>
          <p className="text-xs text-[#565959] max-w-sm mx-auto leading-relaxed">
            {searchQuery
              ? `No orders matching "${searchQuery}" found in your store catalog. Cross-vendor order data is isolated and restricted.`
              : statusFilter !== 'all'
              ? 'No orders matched your current search or status filter. Try resetting your filters.'
              : 'Customer orders containing products from your store will appear here for preparation and dispatch.'}
          </p>
          {(searchQuery || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-4 py-2 bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] text-xs font-bold rounded-lg shadow-sm"
            >
              Show All Orders
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-xl border border-[#D5D9D9] shadow-sm overflow-hidden"
            >
              {/* Order Card Header */}
              <div className="bg-[#131921] text-white p-4 sm:px-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/10">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-[#CCCCCC]">Order #</span>
                    <span className="font-extrabold text-sm text-[#FFD814] font-mono">
                      {order.orderNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyOrderNumber(order.orderNumber)}
                      className="p-1 hover:bg-white/10 rounded text-white/70 hover:text-white transition-colors"
                      title="Copy Order Number"
                    >
                      {copiedOrderId === order.orderNumber ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  <span className="text-white/20 hidden sm:inline">•</span>
                  <div className="flex items-center gap-1 text-xs text-[#CCCCCC]">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Placed on {order.datePlaced} at {order.placedTime}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <Link
                    href={`/vendor/orders/${order.orderNumber}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#232F3E] hover:bg-[#37475A] text-xs font-semibold text-[#FFD814] border border-[#FFD814]/30 transition-colors"
                  >
                    <span>View Details</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded bg-white/10 text-[#FFD814] border border-white/20">
                    {order.paymentMethod === 'COD' ? 'CASH ON DELIVERY (COD)' : 'PREPAID'}
                  </span>
                  <span className="text-xs font-mono font-extrabold text-white">
                    Subtotal: {formatINR(order.vendorSubtotal)}
                  </span>
                </div>
              </div>

              {/* Order Content Grid: Shipping Details + Vendor's Items */}
              <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left 4 Cols: Fulfillment Shipping Address */}
                <div className="lg:col-span-4 bg-[#F7F8F8] rounded-xl p-4 border border-[#D5D9D9] flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#007185]">
                      <MapPin className="h-4 w-4" />
                      <span>Customer Delivery Details</span>
                    </div>

                    {order.shippingAddress ? (
                      <div className="space-y-1 text-xs text-[#444653]">
                        <span className="font-bold text-sm text-[#0F1111] block">
                          {order.shippingAddress.fullName}
                        </span>
                        <p className="leading-relaxed">
                          {order.shippingAddress.streetAddress}
                          {order.shippingAddress.locality ? `, ${order.shippingAddress.locality}` : ''}
                          <br />
                          {order.shippingAddress.city}, {order.shippingAddress.state} —{' '}
                          <strong className="text-[#0F1111]">{order.shippingAddress.postalCode}</strong>
                        </p>
                        <div className="flex items-center gap-1.5 pt-1 text-[#0F1111] font-semibold">
                          <Phone className="h-3.5 w-3.5 text-[#565959]" />
                          <span>{order.shippingAddress.phone}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-[#565959] italic">
                        Standard delivery address recorded.
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#D5D9D9] flex items-center justify-between text-[11px] text-[#565959]">
                    <span>Fulfillment Status:</span>
                    <span className="font-bold text-[#0F1111]">
                      {order.items.every((i) => i.status === 'SHIPPED')
                        ? 'Consignment Dispatched'
                        : order.items.some((i) => i.status === 'PROCESSING')
                        ? 'Packing in Progress'
                        : order.items.some((i) => i.status === 'PENDING')
                        ? 'Action Required (Pending)'
                        : 'Completed'}
                    </span>
                  </div>
                </div>

                {/* Right 8 Cols: Vendor's Own Items in this Order */}
                <div className="lg:col-span-8 space-y-4">
                  <div className="flex items-center justify-between text-xs pb-1 border-b border-[#EAEDED]">
                    <span className="font-bold uppercase tracking-wider text-[#565959]">
                      Your Products in Consignment ({order.items.length})
                    </span>
                    <span className="text-[#565959]">
                      Total Qty: <strong className="text-[#0F1111]">{order.vendorTotalQuantity}</strong>
                    </span>
                  </div>

                  <div className="space-y-3">
                    {order.items.map((item) => {
                      const isUpdating = updatingItemId === item.id;

                      return (
                        <div
                          key={item.id}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3.5 rounded-xl border border-[#D5D9D9] hover:border-[#007185]/40 transition-all bg-white"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-16 h-20 rounded-lg overflow-hidden bg-[#F7F8F8] shrink-0 relative border border-[#EAEDED]">
                              <Image
                                src={item.image}
                                alt={item.title}
                                fill
                                className="object-cover"
                              />
                            </div>

                            <div className="space-y-0.5 min-w-0">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#007185] bg-[#E7F4F5] px-1.5 py-0.2 rounded">
                                {item.brand}
                              </span>
                              <h4 className="text-xs font-bold text-[#0F1111] truncate max-w-sm leading-snug">
                                {item.title}
                              </h4>
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#565959]">
                                <span>Size: <strong className="text-[#0F1111]">{item.size}</strong></span>
                                <span>•</span>
                                <span>Color: <strong className="text-[#0F1111]">{item.color}</strong></span>
                                <span>•</span>
                                <span>SKU: <strong className="font-mono text-[#0F1111]">{item.sku}</strong></span>
                              </div>
                              <div className="text-xs font-bold text-[#0F1111] pt-1">
                                Qty {item.quantity} × {formatINR(item.unitPrice)} ={' '}
                                <span className="text-[#007185] font-mono">{formatINR(item.totalPrice)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Fulfillment Actions & Status Pill */}
                          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#EAEDED]">
                            {/* Status Pill */}
                            <div>
                              {item.status === 'PENDING' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  <Clock className="h-3 w-3" />
                                  Pending Prep
                                </span>
                              )}
                              {item.status === 'PROCESSING' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                  <Package className="h-3 w-3" />
                                  Packing / Prep
                                </span>
                              )}
                              {item.status === 'SHIPPED' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                                  <Truck className="h-3 w-3" />
                                  Dispatched
                                </span>
                              )}
                              {item.status === 'DELIVERED' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Delivered
                                </span>
                              )}
                              {item.status === 'CANCELLED' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                  <AlertCircle className="h-3 w-3" />
                                  Cancelled
                                </span>
                              )}
                            </div>

                            {/* Sequential Transition Actions */}
                            <div>
                              {item.status === 'PENDING' && (
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => handleUpdateStatus(order.id, item.id, 'PROCESSING')}
                                  className="px-3.5 py-1.5 rounded-lg bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] text-xs font-bold shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
                                >
                                  {isUpdating ? (
                                    <div className="w-3 h-3 border-2 border-[#0F1111] border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Package className="h-3.5 w-3.5" />
                                  )}
                                  <span>Start Packing</span>
                                </button>
                              )}

                              {item.status === 'PROCESSING' && (
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => handleUpdateStatus(order.id, item.id, 'SHIPPED')}
                                  className="px-3.5 py-1.5 rounded-lg bg-[#007185] hover:bg-[#004B57] text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
                                >
                                  {isUpdating ? (
                                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Truck className="h-3.5 w-3.5" />
                                  )}
                                  <span>Mark Dispatched</span>
                                </button>
                              )}

                              {item.status === 'SHIPPED' && (
                                <span className="text-[11px] text-[#565959] italic">
                                  In courier custody
                                </span>
                              )}

                              {item.status === 'DELIVERED' && (
                                <span className="text-[11px] text-emerald-700 font-medium">
                                  Fulfillment closed
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-[#D5D9D9] shadow-sm text-xs">
              <span className="text-[#565959]">
                Showing page <strong className="text-[#0F1111]">{page}</strong> of{' '}
                <strong className="text-[#0F1111]">{totalPages}</strong> ({totalCount} total items)
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1 || isLoading}
                  onClick={() => fetchOrders(page - 1, statusFilter, searchQuery)}
                  className="px-3 py-1.5 rounded-lg border border-[#D5D9D9] text-[#0F1111] font-semibold hover:bg-[#F7FAFA] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages || isLoading}
                  onClick={() => fetchOrders(page + 1, statusFilter, searchQuery)}
                  className="px-3 py-1.5 rounded-lg border border-[#D5D9D9] text-[#0F1111] font-semibold hover:bg-[#F7FAFA] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function VendorOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <div className="w-8 h-8 border-4 border-[#FFD814] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-[#565959] font-medium">Loading orders fulfillment desk...</span>
        </div>
      }
    >
      <VendorOrdersContent />
    </Suspense>
  );
}
