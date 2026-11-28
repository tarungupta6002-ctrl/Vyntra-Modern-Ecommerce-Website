'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Truck,
  Package,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  Shield,
  RefreshCw,
  Edit2,
  X,
  Check,
  Eye,
  ShoppingBag,
} from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { getCourierTrackingUrl } from '@/lib/courier-tracking';
import { PageHeader, StatRow, consoleButton, humanize } from '@/components/console/console-ui';

import { CometSpinner } from '@/components/ui/loading-spinner';
interface AdminOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  totalAmount: number;
  courierPartner: string | null;
  trackingNumber: string | null;
  remittanceReference?: string | null;
  settledAt?: string | null;
  user?: {
    id: string;
    name: string | null;
    email: string;
  };
  customer?: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
  };
  shippingAddress: {
    fullName: string;
    phone: string;
    city: string;
    state: string;
    postalCode: string;
  } | null;
  items: Array<{
    id: string;
    status: string;
    quantity: number;
    unitPrice: number;
    title?: string;
    vendorName?: string;
    product?: {
      title: string;
    };
    vendor?: {
      storeName: string;
    };
  }>;
}

export default function AdminOrdersManagementPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // COD Remittance Modal State
  const [remittanceOrder, setRemittanceOrder] = useState<AdminOrder | null>(null);
  const [remittanceRefInput, setRemittanceRefInput] = useState('');
  const [isSubmittingRemittance, setIsSubmittingRemittance] = useState(false);
  const [remittanceSuccess, setRemittanceSuccess] = useState<string | null>(null);

  const openRemittanceModal = (order: AdminOrder) => {
    setRemittanceOrder(order);
    setRemittanceRefInput(order.remittanceReference || '');
    setRemittanceSuccess(null);
  };

  const handleRemittanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remittanceOrder) return;

    if (!remittanceRefInput.trim()) {
      alert('Please enter a valid courier remittance reference or bank UTR number.');
      return;
    }

    setIsSubmittingRemittance(true);
    setRemittanceSuccess(null);
    try {
      const res = await fetch(`/api/admin/orders/${remittanceOrder.id}/remittance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remittanceReference: remittanceRefInput.trim(),
        }),
      });

      const json = await res.json();
      if (json.success) {
        setRemittanceSuccess(`COD Remittance confirmed for #${remittanceOrder.orderNumber}! Payment marked PAID.`);
        setTimeout(() => {
          setRemittanceOrder(null);
          fetchOrders();
        }, 1200);
      } else {
        alert(json.error?.message || 'Failed to confirm COD remittance.');
      }
    } catch (e: any) {
      alert(e.message || 'Error confirming remittance.');
    } finally {
      setIsSubmittingRemittance(false);
    }
  };

  const fetchOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      if (selectedStatus && selectedStatus !== 'ALL') {
        params.set('status', selectedStatus);
      }
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }

      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setOrders(json.data.orders);
        setTotalPages(json.data.pagination.totalPages || 1);
        setTotalCount(json.data.pagination.totalCount || 0);
      } else {
        setError(json.error?.message || 'Failed to fetch admin orders.');
      }
    } catch (e: any) {
      setError(e.message || 'Network error fetching orders.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="All customer orders, their payments and each seller’s part."
        actions={
          <>
          <button type="button" onClick={() => fetchOrders()} disabled={isLoading} className={consoleButton.secondary}>
            {isLoading ? <CometSpinner className="h-4 w-4 text-current" decorative /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
          </>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-[#D5D9D9] space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 text-[#565959] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order #, Customer, AWB..."
              className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-[#D5D9D9] focus:outline-none focus:ring-2 focus:ring-[#FF9900]/30 text-[#0F1111]"
            />
          </form>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {['ALL', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setSelectedStatus(st);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-md font-bold whitespace-nowrap transition-colors ${
                  selectedStatus === st
                    ? 'bg-[#131921] text-[#FFD814]'
                    : 'bg-[#F7F8F8] text-[#0F1111] border border-[#D5D9D9] hover:bg-white'
                }`}
              >
                {st === 'ALL' ? 'All' : humanize(st)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-sm border border-[#D5D9D9] overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#565959]">
            <CometSpinner className="h-12 w-12 mx-auto mb-2 block text-[#007185]" />
            Loading platform consignments...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-600 space-y-2">
            <AlertCircle className="h-6 w-6 mx-auto" />
            <p>{error}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#565959] space-y-2">
            <Package className="h-8 w-8 text-[#D5D9D9] mx-auto" />
            <p className="font-bold text-sm text-[#0F1111]">No orders found matching the filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F7F8F8] border-b border-[#D5D9D9] text-[#565959] font-bold">
                  <th className="py-3.5 px-4">Order # &amp; Date</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Vendor Items</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Logistics / AWB</th>
                  <th className="py-3.5 px-4 text-right">Total</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAEDED]">
                {orders.map((ord) => {
                  const trackingUrl = getCourierTrackingUrl(ord.courierPartner, ord.trackingNumber);
                  return (
                    <tr key={ord.id} className="hover:bg-[#F9FAFA] transition-colors">
                      <td className="py-4 px-4 tabular-nums">
                        <span className="font-bold text-[#0F1111] block">#{ord.orderNumber}</span>
                        <span className="text-[11px] text-[#565959]">
                          {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="font-bold text-[#0F1111] block">
                          {ord.shippingAddress?.fullName || ord.user?.name || ord.customer?.name || 'Customer'}
                        </span>
                        <span className="text-[11px] text-[#565959] block">
                          {ord.user?.email || ord.customer?.email || 'No email provided'}
                        </span>
                        {ord.shippingAddress && (
                          <span className="text-[11px] text-[#565959]">
                            {ord.shippingAddress.city}, {ord.shippingAddress.state} {ord.shippingAddress.postalCode}
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          {ord.items?.map((it) => {
                            const itemTitle = it.product?.title || it.title || 'Product';
                            const vendorName = it.vendor?.storeName || it.vendorName || 'Seller';
                            return (
                              <div key={it.id} className="flex items-center gap-1.5 text-[11px]">
                                <span className="font-semibold text-[#0F1111] truncate max-w-[140px]" title={itemTitle}>
                                  {itemTitle}
                                </span>
                                <span className="text-[#565959]">×{it.quantity}</span>
                                <span className="text-[10px] font-bold text-[#007185] bg-[#E2E7FF] px-1.5 py-0.2 rounded">
                                  {vendorName}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            ord.status === 'DELIVERED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ord.status === 'SHIPPED' || ord.status === 'OUT_FOR_DELIVERY'
                              ? 'bg-[#FFE4B5] text-[#0F1111]'
                              : ord.status === 'CANCELLED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {humanize(ord.status)}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        {ord.courierPartner ? (
                          <div className="space-y-0.5">
                            <span className="font-bold text-[#0F1111] block">{ord.courierPartner}</span>
                            {ord.trackingNumber && (
                              <div className="flex items-center gap-1">
                                <span className="tabular-nums text-[11px] text-[#565959]">{ord.trackingNumber}</span>
                                {trackingUrl && (
                                  <a
                                    href={trackingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#007185] hover:underline"
                                    title="Track via carrier portal"
                                  >
                                    <ExternalLink className="h-3 w-3 inline" />
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#757684] italic">Unassigned</span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <span className="font-bold text-sm text-[#0F1111] block">
                          {formatINR(Number(ord.totalAmount))}
                        </span>
                        <div className="flex flex-col items-end gap-0.5 mt-0.5">
                          <span className="text-[10px] text-[#565959] font-semibold">
                            {ord.paymentMethod} •{' '}
                            <span
                              className={
                                ord.paymentStatus === 'PAID'
                                  ? 'text-emerald-700 font-bold'
                                  : 'text-amber-700 font-bold'
                              }
                            >
                              {humanize(ord.paymentStatus)}
                            </span>
                          </span>

                          {ord.paymentMethod === 'COD' && ord.status === 'DELIVERED' && ord.paymentStatus === 'PENDING' && (
                            <span className="inline-block text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded mt-0.5">
                              Remittance Pending
                            </span>
                          )}

                          {ord.paymentMethod === 'COD' && ord.paymentStatus === 'PAID' && ord.remittanceReference && (
                            <span
                              className="text-[10px] text-[#007185] tabular-nums truncate max-w-[150px]"
                              title={`UTR: ${ord.remittanceReference}`}
                            >
                              UTR: {ord.remittanceReference}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <Link
                            href={`/admin/orders/${ord.id}`}
                            className="w-full px-3 py-1.5 rounded-lg bg-white hover:bg-[#F7F8F8] text-[#0F1111] hover:text-[#007185] font-bold text-xs border border-[#D5D9D9] transition-all inline-flex items-center justify-center gap-1.5 shadow-2xs"
                          >
                            <Eye className="h-3.5 w-3.5 text-[#007185]" />
                            <span>View Order Details</span>
                          </Link>

                          {ord.paymentMethod === 'COD' && ord.status === 'DELIVERED' && ord.paymentStatus === 'PENDING' && (
                            <button
                              type="button"
                              onClick={() => openRemittanceModal(ord)}
                              className="w-full px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition-all inline-flex items-center justify-center gap-1 shadow-sm whitespace-nowrap"
                              title="Confirm courier cash remittance and settle payment"
                            >
                              <CheckCircle className="h-3 w-3" />
                              <span>Settle COD</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[#EAEDED] flex items-center justify-between text-xs text-[#565959]">
            <span>Showing page {page} of {totalPages} ({totalCount} total orders)</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-[#D5D9D9] bg-white disabled:opacity-40 font-bold hover:bg-[#F7F8F8]"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-[#D5D9D9] bg-white disabled:opacity-40 font-bold hover:bg-[#F7F8F8]"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* COD Remittance Confirmation Modal */}
      {remittanceOrder && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-[#D5D9D9] space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAEDED]">
              <div>
                <span className="text-[10px] font-bold text-emerald-700">
                  Financial Settlement
                </span>
                <h3 className="font-bold text-base text-[#0F1111]">
                  Confirm COD Remittance
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRemittanceOrder(null)}
                className="p-1 rounded-lg hover:bg-[#EAEDED] text-[#565959]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {remittanceSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <Check className="h-4 w-4" />
                <span>{remittanceSuccess}</span>
              </div>
            )}

            <div className="bg-[#F7F8F8] p-3.5 rounded-xl border border-[#D5D9D9] text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[#565959]">Order Number:</span>
                <span className="font-bold tabular-nums text-[#0F1111]">#{remittanceOrder.orderNumber}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#565959]">Total Cash Amount:</span>
                <span className="font-bold text-emerald-700">{formatINR(Number(remittanceOrder.totalAmount))}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#565959]">Courier / Logistics:</span>
                <span className="font-semibold text-[#0F1111]">{remittanceOrder.courierPartner || 'Logistics Partner'}</span>
              </div>
              {remittanceOrder.trackingNumber && (
                <div className="flex items-center justify-between">
                  <span className="text-[#565959]">Tracking AWB:</span>
                  <span className="tabular-nums text-[#565959]">{remittanceOrder.trackingNumber}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleRemittanceSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-[#0F1111] block mb-1.5">
                  Courier Remittance UTR / Reference Number <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={remittanceRefInput}
                  onChange={(e) => setRemittanceRefInput(e.target.value)}
                  placeholder="e.g. DEL-REMIT-991823 or UTR-SBIN-88912"
                  className="w-full py-2.5 px-3 rounded-lg border border-[#D5D9D9] text-[#0F1111] tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
                <p className="text-[11px] text-[#565959] mt-1">
                  Enter the bank deposit UTR or courier remittance batch voucher confirming cash has cleared.
                </p>
              </div>

              <div className="pt-3 border-t border-[#EAEDED] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRemittanceOrder(null)}
                  className="px-4 py-2.5 rounded-lg bg-[#F7F8F8] border border-[#D5D9D9] font-bold text-[#0F1111] hover:bg-[#EAEDED]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRemittance}
                  className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm disabled:opacity-50"
                >
                  {isSubmittingRemittance ? 'Confirming...' : 'Confirm Settlement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
