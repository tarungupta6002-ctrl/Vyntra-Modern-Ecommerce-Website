'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  RotateCcw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building2,
  User,
  CreditCard,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  X,
  AlertCircle,
  FileText,
  DollarSign,
  Eye,
  ShieldAlert,
} from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { calculateRefundShares } from '@/lib/refund-math';
import { AdminReturnDetailsModal } from '@/components/admin/admin-return-details-modal';
import { AdminDisputeReviewModal } from '@/components/admin/admin-dispute-review-modal';

interface AdminReturnItem {
  id: string;
  type: string;
  status: string;
  reason: string;
  detailedReason: string | null;
  customerNotes: string | null;
  adminNotes: string | null;
  vendorNotes: string | null;
  requestedQuantity: number;
  reverseTrackingNumber: string | null;
  reverseCourierPartner: string | null;
  replacementCourierPartner: string | null;
  replacementTrackingNumber: string | null;
  replacementDispatchedAt: string | null;
  replacementDeliveredAt: string | null;
  qcPassed: boolean | null;
  qcFailedReason: string | null;
  qcNotes: string | null;
  isDisputed: boolean;
  disputeResolution: string | null;
  disputeNotes?: string | null;
  disputedByRole?: string | null;
  disputeResolvedAt?: string | null;
  nextRefundSequence: number;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
  };
  vendor: {
    id: string;
    storeName: string;
    storeSlug: string;
  };
  order: {
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
    subtotal: number;
    discount: number;
    totalAmount: number;
    refundedAmount: number;
    createdAt: string;
  };
  orderItem: {
    id: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    commissionRate: number | null;
    commissionAmount: number | null;
    netEarnings: number | null;
    payoutStatus: string | null;
    vendorPayoutId: string | null;
    product: {
      id: string;
      title: string;
      images: string[];
    };
    variant: {
      id: string;
      size: string | null;
      color: string | null;
    } | null;
  };
  refundTransactions: Array<{
    id: string;
    amount: number;
    vendorShare: number;
    platformShare: number;
    status: string;
    mode: string;
    gatewayReference: string | null;
    processedAt: string | null;
    createdAt: string;
  }>;
}

export default function AdminReturnsManagementPage() {
  const [returnRequests, setReturnRequests] = useState<AdminReturnItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Active Refund Modal State
  const [activeReturn, setActiveReturn] = useState<AdminReturnItem | null>(null);
  const [refundCalculation, setRefundCalculation] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [refundAmountInput, setRefundAmountInput] = useState<string>('');
  const [utrReferenceInput, setUtrReferenceInput] = useState<string>('');
  const [adminNotesInput, setAdminNotesInput] = useState<string>('');
  const [isConfirmedCheckbox, setIsConfirmedCheckbox] = useState(false);
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  // Full Amazon-Style Return Details Modal State
  const [detailsModalId, setDetailsModalId] = useState<string | null>(null);
  const [detailsData, setDetailsData] = useState<any | null>(null);
  const [isLoadingFullDetails, setIsLoadingFullDetails] = useState(false);

  // Active Dispute Review Modal State
  const [disputeReviewModal, setDisputeReviewModal] = useState<AdminReturnItem | null>(null);
  const [disputeSuccessToast, setDisputeSuccessToast] = useState<string | null>(null);

  const handleOpenDetailsModal = async (retId: string) => {
    setDetailsModalId(retId);
    setIsLoadingFullDetails(true);
    setDetailsData(null);
    try {
      const res = await fetch(`/api/admin/returns/${retId}`);
      const json = await res.json();
      if (json.success) {
        setDetailsData(json.data);
      }
    } catch (e) {
      console.error('Failed to load return details', e);
    } finally {
      setIsLoadingFullDetails(false);
    }
  };

  const fetchReturns = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (typeFilter !== 'ALL') params.set('type', typeFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      params.set('page', page.toString());
      params.set('limit', '15');

      const res = await fetch(`/api/admin/returns?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to fetch returns');
      }

      setReturnRequests(json.data.returnRequests);
      setTotalPages(json.data.totalPages);
      setTotalCount(json.data.totalCount);
    } catch (err: any) {
      setError(err.message || 'Error loading returns');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, [statusFilter, typeFilter, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchReturns();
  };

  const openRefundModal = async (ret: AdminReturnItem) => {
    setActiveReturn(ret);
    setModalError(null);
    setModalSuccess(null);
    setIsConfirmedCheckbox(false);
    setUtrReferenceInput('');
    setAdminNotesInput('');
    setIsLoadingDetails(true);

    try {
      const res = await fetch(`/api/admin/returns/${ret.id}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to load return calculations');
      }
      setRefundCalculation(json.data.calculations);
      setRefundAmountInput(json.data.calculations.maxRefundable.toString());
    } catch (err: any) {
      setModalError(err.message || 'Failed to calculate allowable refund');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const closeRefundModal = () => {
    setActiveReturn(null);
    setRefundCalculation(null);
    setModalError(null);
    setModalSuccess(null);
  };

  // Live shares calculation
  const parsedRefundAmount = parseFloat(refundAmountInput) || 0;
  const commRate = Number(refundCalculation?.commissionRate || activeReturn?.orderItem?.commissionRate || 0);
  let liveShares = { platformShare: 0, vendorShare: 0 };
  if (parsedRefundAmount > 0) {
    try {
      liveShares = calculateRefundShares(parsedRefundAmount, commRate);
    } catch {
      // Ignore intermediate typing errors
    }
  }

  const handleProcessRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReturn) return;

    if (!utrReferenceInput.trim() || utrReferenceInput.trim().length < 4) {
      setModalError('A valid verified bank settlement reference / UTR is mandatory (min 4 characters).');
      return;
    }

    if (parsedRefundAmount <= 0) {
      setModalError('Refund amount must be strictly greater than ₹0.00.');
      return;
    }

    if (parsedRefundAmount > refundCalculation?.maxRefundable) {
      setModalError(`Refund amount cannot exceed allowable cap of ${formatINR(refundCalculation.maxRefundable)}.`);
      return;
    }

    if (!isConfirmedCheckbox) {
      setModalError('You must confirm that the manual bank refund transfer has been completed.');
      return;
    }

    setIsSubmittingRefund(true);
    setModalError(null);
    setModalSuccess(null);

    try {
      const clientRequestId = `req_adm_ref_${activeReturn.id}_seq${activeReturn.nextRefundSequence}_${Date.now()}`;

      const res = await fetch(`/api/admin/returns/${activeReturn.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientRequestId,
          referenceNumber: utrReferenceInput.trim(),
          amount: parsedRefundAmount,
          adminNotes: adminNotesInput.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Refund processing failed');
      }

      setModalSuccess(
        `Refund of ${formatINR(parsedRefundAmount)} confirmed successfully. Ref: ${utrReferenceInput.trim()}`
      );
      // Refresh list in background
      fetchReturns();
      setTimeout(() => {
        closeRefundModal();
      }, 1500);
    } catch (err: any) {
      setModalError(err.message || 'Refund settlement failed');
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  const handleConfirmDelivery = async (ret: AdminReturnItem) => {
    if (!confirm(`Confirm delivery for replacement order #${ret.order.orderNumber}? This will mark the request as COMPLETED.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/returns/${ret.id}/delivery`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to confirm delivery');
      }
      alert('Replacement delivery confirmed successfully!');
      fetchReturns();
    } catch (err: any) {
      alert(err.message || 'Error confirming delivery');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'QC_PASSED':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold px-2 py-0.5 rounded-full">QC Passed</span>;
      case 'QC_FAILED':
        return <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold px-2 py-0.5 rounded-full">QC Failed</span>;
      case 'QC_DISPUTED':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold px-2 py-0.5 rounded-full">Disputed</span>;
      case 'COMPLETED':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold px-2 py-0.5 rounded-full">Completed</span>;
      case 'APPROVED':
        return <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold px-2 py-0.5 rounded-full">Approved</span>;
      case 'REJECTED':
        return <span className="bg-zinc-100 text-zinc-700 border border-zinc-300 text-[11px] font-bold px-2 py-0.5 rounded-full">Rejected</span>;
      case 'RECEIVED_AT_WH':
        return <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold px-2 py-0.5 rounded-full">At Warehouse</span>;
      default:
        return <span className="bg-zinc-100 text-zinc-600 text-[11px] font-bold px-2 py-0.5 rounded-full">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#D5D9D9] shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#565959] uppercase tracking-wider font-semibold">
            <ShieldCheck className="h-4 w-4 text-[#800020]" />
            <span>Marketplace Governance</span>
          </div>
          <h1 className="text-2xl font-bold font-headline text-[#0F1111] mt-1">
            Returns, Replacements &amp; Admin Refunds
          </h1>
          <p className="text-xs text-[#565959] mt-0.5">
            Audit customer return claims, inspect QC results, and execute manual bank refunds with strict ceiling checks.
          </p>
        </div>

        <button
          onClick={fetchReturns}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg border border-[#D5D9D9] bg-[#F7F8F8] hover:bg-[#EAEDED] text-[#0F1111] transition-all"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#D5D9D9] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#565959]" />
          <input
            type="text"
            placeholder="Search order #, customer, vendor, AWB..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-[#D5D9D9] focus:outline-none focus:border-[#800020] focus:ring-1 focus:ring-[#800020]"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-[#565959]">
            <Filter className="h-3.5 w-3.5" />
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs py-2 px-3 rounded-lg border border-[#D5D9D9] bg-white focus:outline-none focus:border-[#800020]"
          >
            <option value="ALL">All Statuses ({totalCount})</option>
            <option value="QC_PASSED">QC Passed (Refund Eligible)</option>
            <option value="QC_DISPUTED">Disputed</option>
            <option value="RECEIVED_AT_WH">Received at Warehouse</option>
            <option value="APPROVED">Approved</option>
            <option value="REQUESTED">Requested</option>
            <option value="COMPLETED">Completed</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs py-2 px-3 rounded-lg border border-[#D5D9D9] bg-white focus:outline-none focus:border-[#800020]"
          >
            <option value="ALL">All Types</option>
            <option value="RETURN_REFUND">Return &amp; Refund</option>
            <option value="REPLACEMENT">Replacement</option>
          </select>
        </div>
      </div>

      {/* Main Table View */}
      <div className="bg-white rounded-xl border border-[#D5D9D9] shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-[#565959] space-y-2">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-[#800020]" />
            <p className="text-xs font-semibold">Loading marketplace return requests...</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center text-rose-600 space-y-2">
            <AlertCircle className="h-8 w-8 mx-auto" />
            <p className="text-xs font-bold">{error}</p>
          </div>
        ) : returnRequests.length === 0 ? (
          <div className="py-16 text-center text-[#565959] space-y-2">
            <RotateCcw className="h-8 w-8 mx-auto text-zinc-300" />
            <p className="text-sm font-bold text-[#0F1111]">No return requests found</p>
            <p className="text-xs">Adjust your search filters or status criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F7F8F8] border-b border-[#D5D9D9] text-[#565959] font-semibold">
                  <th className="py-3 px-4">Request / Date</th>
                  <th className="py-3 px-4">Order &amp; Customer</th>
                  <th className="py-3 px-4">Product &amp; Vendor</th>
                  <th className="py-3 px-4">Status &amp; QC</th>
                  <th className="py-3 px-4 text-right">Order Fin. / Refunded</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D5D9D9]/60">
                {returnRequests.map((ret) => {
                  const isEligibleForRefund =
                    ret.status === 'QC_PASSED' ||
                    (ret.status === 'QC_DISPUTED' && ret.disputeResolution === 'REFUND_APPROVED');
                  const alreadyRefunded = ret.refundTransactions
                    .filter((t) => t.status === 'CONFIRMED')
                    .reduce((sum, t) => sum + Number(t.amount), 0);

                  return (
                    <tr key={ret.id} className="hover:bg-[#F7F8F8]/50 transition-colors">
                      {/* Request ID & Date */}
                      <td className="py-3 px-4 align-top">
                        <div>
                          <button
                            type="button"
                            onClick={() => handleOpenDetailsModal(ret.id)}
                            className="font-mono font-bold text-[#007185] hover:underline text-left block"
                            title="Click to view comprehensive order ledger"
                          >
                            #{ret.id.slice(-8)}
                          </button>
                        </div>
                        <div className="text-[10px] text-[#565959]">
                          {new Date(ret.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="mt-1">
                          <span
                            className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                              ret.type === 'REPLACEMENT'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {ret.type === 'REPLACEMENT' ? 'Replacement' : 'Return & Refund'}
                          </span>
                        </div>
                      </td>

                      {/* Order & Customer */}
                      <td className="py-3 px-4 align-top">
                        <div className="font-bold text-[#007185] hover:underline">
                          <Link href={`/admin/orders`}>{ret.order.orderNumber}</Link>
                        </div>
                        <div className="text-[#0F1111] font-medium mt-0.5">
                          {ret.user.name || 'Customer'}
                        </div>
                        <div className="text-[10px] text-[#565959]">{ret.user.email}</div>
                        <div className="mt-1 text-[10px] text-zinc-500 font-mono">
                          Payment: {ret.order.paymentMethod} ({ret.order.paymentStatus})
                        </div>
                      </td>

                      {/* Product & Vendor */}
                      <td className="py-3 px-4 align-top max-w-xs">
                        <div className="font-bold text-[#0F1111] line-clamp-1">
                          {ret.orderItem.product.title}
                        </div>
                        <div className="text-[11px] text-[#565959] flex items-center gap-1 mt-0.5">
                          <Building2 className="h-3 w-3 text-zinc-400" />
                          <span>{ret.vendor.storeName}</span>
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-1">
                          Qty: {ret.requestedQuantity} &bull; Price: {formatINR(ret.orderItem.unitPrice)}
                        </div>
                        <div className="text-[10px] text-[#800020] font-semibold mt-0.5">
                          Reason: {ret.reason.replace(/_/g, ' ')}
                        </div>
                      </td>

                      {/* Status & QC */}
                      <td className="py-3 px-4 align-top">
                        <div>{getStatusBadge(ret.status)}</div>
                        {ret.qcPassed !== null && (
                          <div className="text-[10px] text-[#565959] mt-1">
                            QC: <strong className={ret.qcPassed ? 'text-emerald-700' : 'text-rose-700'}>
                              {ret.qcPassed ? 'PASSED' : 'FAILED'}
                            </strong>
                          </div>
                        )}
                        {ret.reverseTrackingNumber && (
                          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                            AWB: {ret.reverseTrackingNumber}
                          </div>
                        )}
                      </td>

                      {/* Order Financials & Refund History */}
                      <td className="py-3 px-4 align-top text-right">
                        <div className="font-bold text-[#0F1111]">
                          Item: {formatINR(ret.orderItem.totalPrice)}
                        </div>
                        <div className="text-[10px] text-[#565959]">
                          Order Total: {formatINR(ret.order.totalAmount)}
                        </div>
                        <div className="mt-1 text-[10px]">
                          Refunded: <span className="font-bold text-rose-700">{formatINR(alreadyRefunded)}</span>
                        </div>
                        {ret.refundTransactions.length > 0 && (
                          <div className="text-[9px] text-zinc-500 font-mono mt-0.5">
                            {ret.refundTransactions.length} transaction(s)
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 align-top text-center">
                        <div className="flex flex-col items-center gap-1.5 min-w-[110px]">
                          <button
                            type="button"
                            onClick={() => handleOpenDetailsModal(ret.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#D5D9D9] bg-white hover:bg-[#F7FAFA] text-[#0F1111] text-xs font-semibold shadow-xs transition-colors w-full justify-center"
                            title="View Complete Amazon-Style Order & Refund Ledger"
                          >
                            <Eye className="h-3 w-3 text-[#007185]" />
                            <span>View Details</span>
                          </button>

                          {ret.status === 'QC_DISPUTED' && (
                            <button
                              type="button"
                              onClick={() => setDisputeReviewModal(ret)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-all w-full justify-center"
                              title="Review customer/vendor evidence and adjudicate dispute"
                            >
                              <ShieldAlert className="h-3.5 w-3.5" />
                              <span>Review Dispute</span>
                            </button>
                          )}
                          {ret.disputeResolution && (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded w-full justify-center text-center">
                              Arbitrated: {ret.disputeResolution.replace(/_/g, ' ')}
                            </span>
                          )}

                          {ret.type === 'REPLACEMENT' ? (
                            ret.status === 'QC_PASSED' ? (
                              ret.replacementDispatchedAt ? (
                                ret.replacementDeliveredAt ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded w-full justify-center">
                                    <CheckCircle2 className="h-3 w-3" />
                                    <span>Delivered</span>
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleConfirmDelivery(ret)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm transition-all w-full justify-center"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span>Confirm Delivery</span>
                                  </button>
                                )
                              ) : (
                                <span className="text-[10px] text-purple-700 font-semibold bg-purple-50 px-2 py-1 rounded w-full justify-center text-center">
                                  Awaiting Merchant Dispatch
                                </span>
                              )
                            ) : ret.status === 'COMPLETED' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded w-full justify-center">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Delivered &amp; Settled</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-zinc-400 font-medium italic">
                                In Reverse Transit
                              </span>
                            )
                          ) : isEligibleForRefund ? (
                            <button
                              onClick={() => openRefundModal(ret)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#800020] hover:bg-[#600018] text-white text-xs font-bold shadow-sm transition-all w-full justify-center"
                            >
                              <DollarSign className="h-3.5 w-3.5" />
                              <span>Process Refund</span>
                            </button>
                          ) : ret.status === 'COMPLETED' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded w-full justify-center">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Settled</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-zinc-400 font-medium italic">
                              Awaiting QC
                            </span>
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
      </div>

      {/* Admin Refund Settlement Modal */}
      {activeReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#D5D9D9] shadow-2xl p-6 space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#D5D9D9] pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-[#800020] font-bold uppercase tracking-wider">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Admin Manual Bank Settlement</span>
                </div>
                <h2 className="text-xl font-bold font-headline text-[#0F1111] mt-1">
                  Process Refund &bull; Order #{activeReturn.order.orderNumber}
                </h2>
                <p className="text-xs text-[#565959]">
                  Return Request #{activeReturn.id.slice(-8)} &bull; Customer: {activeReturn.user.name} ({activeReturn.user.email})
                </p>
              </div>
              <button
                onClick={closeRefundModal}
                disabled={isSubmittingRefund}
                className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isLoadingDetails ? (
              <div className="py-12 text-center text-[#565959] space-y-2">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto text-[#800020]" />
                <p className="text-xs font-semibold">Calculating allowable refund ceilings and platform shares...</p>
              </div>
            ) : modalError && !refundCalculation ? (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            ) : (
              <form onSubmit={handleProcessRefundSubmit} className="space-y-5">
                {modalError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                {modalSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{modalSuccess}</span>
                  </div>
                )}

                {/* Financial Ceiling Breakdown Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F7F8F8] p-4 rounded-xl border border-[#D5D9D9]">
                  <div>
                    <span className="text-[10px] text-[#565959] block">Item Gross</span>
                    <span className="text-xs font-bold text-[#0F1111]">
                      {formatINR(refundCalculation?.itemGrossTotal || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#565959] block">Allocated Discount</span>
                    <span className="text-xs font-bold text-amber-700">
                      -{formatINR(refundCalculation?.itemAllocatedDiscount || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#565959] block">Effective Item Cap</span>
                    <span className="text-xs font-bold text-[#0F1111]">
                      {formatINR(refundCalculation?.effectiveItemCeiling || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#565959] block">Max Refundable</span>
                    <span className="text-xs font-bold text-emerald-700">
                      {formatINR(refundCalculation?.maxRefundable || 0)}
                    </span>
                  </div>
                </div>

                {/* Live Share Allocation Preview */}
                <div className="bg-emerald-50/60 border border-emerald-200/80 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-950">Target Refund Amount:</span>
                    <span className="font-mono font-bold text-emerald-900 text-sm">
                      {formatINR(parsedRefundAmount)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-emerald-200/60 text-xs">
                    <div>
                      <span className="text-[10px] text-emerald-800 block">
                        Platform Commission Reversal ({commRate}%):
                      </span>
                      <span className="font-mono font-bold text-emerald-900">
                        {formatINR(liveShares.platformShare)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-800 block">Vendor Share Debit:</span>
                      <span className="font-mono font-bold text-emerald-900">
                        {formatINR(liveShares.vendorShare)}
                      </span>
                    </div>
                  </div>
                  <div className="text-[10px] text-emerald-700 pt-1 flex items-center justify-between">
                    <span>Paise-exact identity guarantee:</span>
                    <span className="font-bold">
                      {formatINR(liveShares.platformShare + liveShares.vendorShare)} = {formatINR(parsedRefundAmount)}
                    </span>
                  </div>
                </div>

                {/* Inputs */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#0F1111] mb-1">
                      Refund Amount (₹) <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={refundCalculation?.maxRefundable || 1}
                      value={refundAmountInput}
                      onChange={(e) => setRefundAmountInput(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-[#D5D9D9] focus:outline-none focus:border-[#800020] focus:ring-1 focus:ring-[#800020]"
                      placeholder="Enter refund amount"
                    />
                    <p className="text-[10px] text-[#565959] mt-0.5">
                      Maximum allowable ceiling for this item is {formatINR(refundCalculation?.maxRefundable || 0)}.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0F1111] mb-1">
                      Actual Bank UTR / Settlement Reference <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={utrReferenceInput}
                      onChange={(e) => setUtrReferenceInput(e.target.value)}
                      required
                      minLength={4}
                      maxLength={60}
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-[#D5D9D9] focus:outline-none focus:border-[#800020] focus:ring-1 focus:ring-[#800020]"
                      placeholder="e.g. VYNTRA-REF-9928172648"
                    />
                    <p className="text-[10px] text-[#565959] mt-0.5">
                      Enter the actual bank transaction reference or UTR provided by the payment gateway/bank.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0F1111] mb-1">
                      Admin Audit Notes (Optional)
                    </label>
                    <textarea
                      value={adminNotesInput}
                      onChange={(e) => setAdminNotesInput(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[#D5D9D9] focus:outline-none focus:border-[#800020]"
                      placeholder="e.g. Customer bank account transfer approved per QC report."
                    />
                  </div>

                  <div className="pt-1">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isConfirmedCheckbox}
                        onChange={(e) => setIsConfirmedCheckbox(e.target.checked)}
                        className="mt-0.5 rounded border-[#D5D9D9] text-[#800020] focus:ring-[#800020]"
                      />
                      <span className="text-xs text-[#0F1111]">
                        I confirm that the manual bank refund transfer of{' '}
                        <strong>{formatINR(parsedRefundAmount)}</strong> has been verified and this settlement transaction is authentic.
                      </span>
                    </label>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#D5D9D9]">
                  <button
                    type="button"
                    onClick={closeRefundModal}
                    disabled={isSubmittingRefund}
                    className="px-4 py-2 text-xs font-bold rounded-lg border border-[#D5D9D9] text-[#0F1111] hover:bg-[#F7F8F8] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingRefund || !isConfirmedCheckbox || parsedRefundAmount <= 0}
                    className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg bg-[#800020] hover:bg-[#600018] text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isSubmittingRefund ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Committing Settlement...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Confirm &amp; Settle Refund</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Amazon-Style Order & Refund Details Modal */}
      <AdminReturnDetailsModal
        isOpen={!!detailsModalId}
        onClose={() => setDetailsModalId(null)}
        returnRequestId={detailsModalId || ''}
        data={detailsData}
        isLoading={isLoadingFullDetails}
        onOpenRefundAction={(ret) => {
          const matchingRet = returnRequests.find((r) => r.id === ret.id) || ret;
          openRefundModal(matchingRet);
        }}
        onConfirmDeliveryAction={(ret) => {
          const matchingRet = returnRequests.find((r) => r.id === ret.id) || ret;
          handleConfirmDelivery(matchingRet);
        }}
      />

      {/* Concierge Dispute Review & Arbitration Modal */}
      {disputeReviewModal && (
        <AdminDisputeReviewModal
          isOpen={true}
          returnRequest={disputeReviewModal}
          onClose={() => setDisputeReviewModal(null)}
          onSuccess={(msg) => {
            setDisputeSuccessToast(msg);
            setTimeout(() => setDisputeSuccessToast(null), 4000);
            fetchReturns();
          }}
        />
      )}

      {/* Toast Notification */}
      {disputeSuccessToast && (
        <div className="fixed bottom-6 right-6 bg-[#131921] text-white px-5 py-3 rounded-xl shadow-2xl text-xs z-50 flex items-center gap-2.5 border border-[#FF9900]/40 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="h-4 w-4 text-[#FF9900] shrink-0" />
          <span className="font-semibold">{disputeSuccessToast}</span>
        </div>
      )}
    </div>
  );
}
