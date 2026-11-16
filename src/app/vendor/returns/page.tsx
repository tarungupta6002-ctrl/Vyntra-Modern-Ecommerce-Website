'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import {
  RotateCcw,
  RefreshCw,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Search,
  Filter,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Store,
  Calendar,
  X,
  FileText,
  UserCheck,
} from 'lucide-react';
import { formatINR } from '@/lib/utils';

interface ReturnRequestItem {
  id: string;
  orderId: string;
  orderNumber: string;
  orderItemId: string;
  type: 'RETURN_REFUND' | 'REPLACEMENT';
  status:
    | 'REQUESTED'
    | 'APPROVED'
    | 'REJECTED'
    | 'PICKED_UP'
    | 'RECEIVED_AT_WH'
    | 'QC_PASSED'
    | 'QC_FAILED'
    | 'QC_DISPUTED'
    | 'COMPLETED'
    | 'CANCELLED';
  reason: string;
  detailedReason?: string | null;
  customerNotes?: string | null;
  vendorNotes?: string | null;
  requestedQuantity: number;
  reverseCourierPartner?: string | null;
  reverseTrackingNumber?: string | null;
  replacementCourierPartner?: string | null;
  replacementTrackingNumber?: string | null;
  replacementDispatchedAt?: string | null;
  replacementDeliveredAt?: string | null;
  allocatedVariantId?: string | null;
  pickedUpAt?: string | null;
  receivedAtWarehouseAt?: string | null;
  qcPassed?: boolean | null;
  isDisputed: boolean;
  createdAt: string;
  updatedAt: string;
  customer: {
    name: string;
    email: string;
    phone?: string | null;
  };
  item: {
    title: string;
    brand: string;
    size: string;
    color: string;
    sku: string;
    unitPrice: number;
    totalPrice: number;
    orderedQuantity: number;
    image?: string | null;
  };
}

export default function VendorReturnsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-gray-500">Loading Merchant Returns Center...</div>}>
      <VendorReturnsContent />
    </Suspense>
  );
}

function VendorReturnsContent() {
  const searchParams = useSearchParams();

  const [returns, setReturns] = useState<ReturnRequestItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [countsByStatus, setCountsByStatus] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals state
  const [actionItem, setActionItem] = useState<ReturnRequestItem | null>(null);
  const [modalAction, setModalAction] = useState<'APPROVE' | 'REJECT' | 'LOGISTICS' | 'QC' | 'DISPATCH' | null>(null);
  const [qcResult, setQcResult] = useState<'PASS' | 'FAIL'>('PASS');
  const [conditionDetails, setConditionDetails] = useState('');
  const [failedReason, setFailedReason] = useState('');
  const [evidencePhotosText, setEvidencePhotosText] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [vendorNotes, setVendorNotes] = useState('');
  const [reverseCourier, setReverseCourier] = useState('');
  const [reverseTracking, setReverseTracking] = useState('');
  const [forwardCourier, setForwardCourier] = useState('');
  const [forwardTracking, setForwardTracking] = useState('');
  const [nextShipmentStatus, setNextShipmentStatus] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Feedback toast
  const [toast, setToast] = useState<{ show: boolean; message: string; type?: 'success' | 'error' }>({
    show: false,
    message: '',
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 4000);
  };

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', '10');
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (typeFilter !== 'ALL') params.set('type', typeFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/vendor/returns?${params.toString()}`);
      const json = await res.json();

      if (json.success && json.data) {
        setReturns(json.data.returns || []);
        setTotalCount(json.data.totalCount || 0);
        setTotalPages(json.data.totalPages || 1);
        setCountsByStatus(json.data.countsByStatus || {});
      } else {
        setReturns([]);
      }
    } catch (err) {
      console.error('Failed to fetch returns:', err);
      setReturns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, [currentPage, statusFilter, typeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchReturns();
  };

  const handleOpenAction = (
    item: ReturnRequestItem,
    action: 'APPROVE' | 'REJECT' | 'LOGISTICS' | 'QC' | 'DISPATCH'
  ) => {
    setActionItem(item);
    setModalAction(action);
    setActionError(null);
    setRejectionReason('');
    setVendorNotes(item.vendorNotes || '');
    setReverseCourier(item.reverseCourierPartner || 'Delhivery Surface Logistics');
    setReverseTracking(item.reverseTrackingNumber || '');
    setQcResult('PASS');
    setConditionDetails('Items examined. Original tags intact, suitable for restocking.');
    setFailedReason('');
    setEvidencePhotosText('');

    setForwardCourier(item.replacementCourierPartner || 'Bluedart Express');
    setForwardTracking(item.replacementTrackingNumber || '');

    if (action === 'LOGISTICS') {
      if (item.status === 'APPROVED') {
        setNextShipmentStatus('PICKED_UP');
      } else if (item.status === 'PICKED_UP') {
        setNextShipmentStatus('RECEIVED_AT_WH');
      } else {
        setNextShipmentStatus(item.status);
      }
    }
  };

  const handleCloseModal = () => {
    setActionItem(null);
    setModalAction(null);
    setActionError(null);
  };

  const handleSubmitAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionItem || !modalAction) return;

    setIsSubmitting(true);
    setActionError(null);

    try {
      if (modalAction === 'DISPATCH') {
        if (!forwardCourier.trim()) {
          setActionError('Forward courier partner name is required.');
          setIsSubmitting(false);
          return;
        }
        if (!forwardTracking.trim() || forwardTracking.trim().length < 4) {
          setActionError('A valid forward AWB/tracking number is required (min 4 characters).');
          setIsSubmitting(false);
          return;
        }

        const res = await fetch(`/api/vendor/returns/${actionItem.id}/dispatch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courierPartner: forwardCourier.trim(),
            trackingNumber: forwardTracking.trim(),
            vendorNotes: vendorNotes.trim() || undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error?.message || data.message || 'Replacement dispatch failed');
        }

        showToast(data.data.message || 'Replacement dispatched successfully!', 'success');
        handleCloseModal();
        fetchReturns();
        return;
      }

      if (modalAction === 'QC') {
        if (!conditionDetails.trim()) {
          setActionError('Condition details are required for QC inspection.');
          setIsSubmitting(false);
          return;
        }
        if (qcResult === 'FAIL' && !failedReason.trim()) {
          setActionError('A specific failure reason is required when QC fails.');
          setIsSubmitting(false);
          return;
        }

        const photos = evidencePhotosText
          .split('\n')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        const res = await fetch(`/api/vendor/returns/${actionItem.id}/qc`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            result: qcResult,
            conditionDetails: conditionDetails.trim(),
            failedReason: qcResult === 'FAIL' ? failedReason.trim() : undefined,
            notes: vendorNotes.trim() || undefined,
            evidencePhotos: photos,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error?.message || data.message || 'QC submission failed');
        }

        showToast(data.data.message || 'Quality Check submitted successfully!', 'success');
        handleCloseModal();
        fetchReturns();
        return;
      }

      let payload: any = {};

      if (modalAction === 'APPROVE') {
        payload = {
          status: 'APPROVED',
          vendorNotes: vendorNotes.trim() || undefined,
          reverseCourierPartner: reverseCourier.trim() || undefined,
          reverseTrackingNumber: reverseTracking.trim() || undefined,
        };
      } else if (modalAction === 'REJECT') {
        if (!rejectionReason.trim()) {
          setActionError('A detailed rejection reason is required.');
          setIsSubmitting(false);
          return;
        }
        payload = {
          status: 'REJECTED',
          rejectionReason: rejectionReason.trim(),
        };
      } else if (modalAction === 'LOGISTICS') {
        payload = {
          status: nextShipmentStatus || undefined,
          reverseCourierPartner: reverseCourier.trim() || undefined,
          reverseTrackingNumber: reverseTracking.trim() || undefined,
          vendorNotes: vendorNotes.trim() || undefined,
        };
      }

      const res = await fetch(`/api/vendor/returns/${actionItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || data.message || 'Operation failed');
      }

      showToast(data.data.message || 'Return request updated successfully!', 'success');
      handleCloseModal();
      fetchReturns();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Returns &amp; Replacements</h1>
            <span className="bg-gray-100 text-gray-800 text-xs font-bold px-2 py-0.5 rounded-full">
              Phase 12
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Review customer doorstep return/exchange requests, assign reverse couriers, and track inbound shipments.
          </p>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 bg-amber-50 border border-amber-200 rounded-lg text-center">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-700">Pending Review</span>
            <span className="text-base font-extrabold text-amber-900">{countsByStatus['REQUESTED'] || 0}</span>
          </div>
          <div className="px-3.5 py-2 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-blue-700">In Transit</span>
            <span className="text-base font-extrabold text-blue-900">
              {(countsByStatus['APPROVED'] || 0) + (countsByStatus['PICKED_UP'] || 0)}
            </span>
          </div>
          <div className="px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700">Received at WH</span>
            <span className="text-base font-extrabold text-emerald-900">{countsByStatus['RECEIVED_AT_WH'] || 0}</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by order number, customer name, title, or AWB..."
            className="w-full text-xs pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        </form>

        <div className="flex items-center gap-2">
          {/* Status Select */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-800 font-medium focus:outline-none focus:ring-1 focus:ring-gray-900"
          >
            <option value="ALL">All Statuses</option>
            <option value="REQUESTED">Pending Review ({countsByStatus['REQUESTED'] || 0})</option>
            <option value="APPROVED">Approved ({countsByStatus['APPROVED'] || 0})</option>
            <option value="PICKED_UP">Picked Up ({countsByStatus['PICKED_UP'] || 0})</option>
            <option value="RECEIVED_AT_WH">Received at WH ({countsByStatus['RECEIVED_AT_WH'] || 0})</option>
            <option value="REJECTED">Rejected ({countsByStatus['REJECTED'] || 0})</option>
          </select>

          {/* Type Select */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-800 font-medium focus:outline-none focus:ring-1 focus:ring-gray-900"
          >
            <option value="ALL">All Types</option>
            <option value="RETURN_REFUND">Returns (Refund)</option>
            <option value="REPLACEMENT">Replacements (Exchange)</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-500">
            <div className="inline-block animate-spin h-6 w-6 border-2 border-gray-900 border-t-transparent rounded-full mb-2"></div>
            <p>Fetching merchant return requests...</p>
          </div>
        ) : returns.length === 0 ? (
          <div className="p-12 text-center">
            <RotateCcw className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-800">No return requests found</p>
            <p className="text-xs text-gray-500 mt-1">
              There are currently no return or replacement requests matching your active filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 uppercase tracking-wider font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Request / Date</th>
                  <th className="py-3 px-4">Order / Customer</th>
                  <th className="py-3 px-4">Item Details</th>
                  <th className="py-3 px-4">Type &amp; Reason</th>
                  <th className="py-3 px-4">Status &amp; Reverse Tracking</th>
                  <th className="py-3 px-4 text-right">Merchant Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {returns.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50/70 transition-colors">
                    {/* Request / Date */}
                    <td className="py-3.5 px-4 align-top">
                      <p className="font-mono font-bold text-gray-900">#{req.id.slice(-6)}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {new Date(req.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </td>

                    {/* Order / Customer */}
                    <td className="py-3.5 px-4 align-top">
                      <p className="font-semibold text-gray-900">{req.orderNumber}</p>
                      <p className="text-[11px] text-gray-600">{req.customer.name}</p>
                      <p className="text-[10px] text-gray-400 truncate max-w-[140px]">{req.customer.email}</p>
                    </td>

                    {/* Item Details */}
                    <td className="py-3.5 px-4 align-top max-w-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="relative h-11 w-11 rounded bg-gray-100 flex-shrink-0 border border-gray-200 overflow-hidden">
                          {req.item.image ? (
                            <Image src={req.item.image} alt={req.item.title} fill className="object-cover" />
                          ) : (
                            <Package className="h-5 w-5 text-gray-400 m-auto mt-3" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{req.item.title}</p>
                          <p className="text-[11px] text-gray-500">
                            Size: {req.item.size} • Color: {req.item.color} • Qty: {req.requestedQuantity}
                          </p>
                          <p className="text-[11px] font-mono text-gray-700">{formatINR(req.item.totalPrice)}</p>
                        </div>
                      </div>
                    </td>

                    {/* Type & Reason */}
                    <td className="py-3.5 px-4 align-top">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-1 ${
                          req.type === 'REPLACEMENT'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}
                      >
                        {req.type === 'REPLACEMENT' ? <RefreshCw className="h-3 w-3" /> : <RotateCcw className="h-3 w-3" />}
                        <span>{req.type === 'REPLACEMENT' ? 'Replacement' : 'Return Refund'}</span>
                      </span>
                      <p className="font-medium text-gray-900">{req.reason.replace(/_/g, ' ')}</p>
                      {req.detailedReason && (
                        <p className="text-[11px] text-gray-500 italic mt-0.5 line-clamp-1" title={req.detailedReason}>
                          &quot;{req.detailedReason}&quot;
                        </p>
                      )}
                      {req.customerNotes && (
                        <p className="text-[11px] text-purple-700 font-semibold mt-0.5" title={req.customerNotes}>
                          {req.customerNotes}
                        </p>
                      )}
                    </td>

                    {/* Status & Reverse Tracking */}
                    <td className="py-3.5 px-4 align-top">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          req.status === 'REQUESTED'
                            ? 'bg-amber-100 text-amber-800'
                            : req.status === 'APPROVED'
                            ? 'bg-blue-100 text-blue-800'
                            : req.status === 'PICKED_UP'
                            ? 'bg-indigo-100 text-indigo-800'
                            : req.status === 'RECEIVED_AT_WH'
                            ? 'bg-emerald-100 text-emerald-800'
                            : req.status === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {req.status.replace(/_/g, ' ')}
                      </span>

                      {req.reverseTrackingNumber ? (
                        <div className="mt-1 text-[11px] text-gray-600">
                          <p className="font-medium text-gray-800">{req.reverseCourierPartner || 'Courier'}</p>
                          <p className="font-mono text-[10px] text-gray-500">{req.reverseTrackingNumber}</p>
                        </div>
                      ) : req.status === 'APPROVED' ? (
                        <p className="text-[10px] text-amber-600 mt-1">Awaiting AWB assignment</p>
                      ) : null}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 align-top text-right">
                      {req.status === 'REQUESTED' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenAction(req, 'APPROVE')}
                            className="px-2.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors shadow-sm"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenAction(req, 'REJECT')}
                            className="px-2.5 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      ) : req.status === 'APPROVED' || req.status === 'PICKED_UP' ? (
                        <button
                          type="button"
                          onClick={() => handleOpenAction(req, 'LOGISTICS')}
                          className="px-3 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded transition-colors"
                        >
                          Update Tracking
                        </button>
                      ) : req.status === 'RECEIVED_AT_WH' ? (
                        <button
                          type="button"
                          onClick={() => handleOpenAction(req, 'QC')}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors shadow-sm flex items-center gap-1 ml-auto"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>Perform QC</span>
                        </button>
                      ) : req.status === 'QC_PASSED' ? (
                        req.type === 'REPLACEMENT' ? (
                          req.replacementDispatchedAt ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded">
                              <Truck className="h-3.5 w-3.5 text-purple-600" />
                              <span>Dispatched</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenAction(req, 'DISPATCH')}
                              className="px-3 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded transition-colors shadow-sm flex items-center gap-1 ml-auto"
                            >
                              <Truck className="h-3.5 w-3.5" />
                              <span>Dispatch Item</span>
                            </button>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Restocked</span>
                          </span>
                        )
                      ) : req.status === 'QC_FAILED' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded">
                          <XCircle className="h-3.5 w-3.5 text-red-600" />
                          <span>QC Failed</span>
                        </span>
                      ) : req.status === 'QC_DISPUTED' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded">
                          <AlertCircle className="h-3.5 w-3.5 text-purple-600" />
                          <span>Dispute Active</span>
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs italic">No actions</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
            <span>
              Showing page {currentPage} of {totalPages} ({totalCount} total)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="p-1 rounded border bg-white disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="p-1 rounded border bg-white disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Vendor Action Modal */}
      {actionItem && modalAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-gray-900 text-white flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-wide">
                {modalAction === 'APPROVE' && 'Approve Return Request'}
                {modalAction === 'REJECT' && 'Reject Return Request'}
                {modalAction === 'LOGISTICS' && 'Update Reverse Shipment Tracking'}
                {modalAction === 'QC' && 'Quality Check (QC) Inspection'}
                {modalAction === 'DISPATCH' && 'Dispatch Forward Replacement Item'}
              </h2>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitAction} className="p-6 space-y-4">
              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Item Info Box */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs space-y-1">
                <p className="font-semibold text-gray-900">{actionItem.item.title}</p>
                <p className="text-gray-500">
                  Order #{actionItem.orderNumber} • Customer: {actionItem.customer.name}
                </p>
                <p className="text-gray-700">
                  Reason: <span className="font-medium">{actionItem.reason.replace(/_/g, ' ')}</span>
                </p>
                {actionItem.customerNotes && (
                  <p className="text-purple-800 font-semibold pt-1 border-t border-gray-200 mt-1">
                    Customer Request: {actionItem.customerNotes}
                  </p>
                )}
              </div>

              {/* APPROVE Fields */}
              {modalAction === 'APPROVE' && (
                <>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Reverse Logistics Courier Partner
                      </label>
                      <input
                        type="text"
                        value={reverseCourier}
                        onChange={(e) => setReverseCourier(e.target.value)}
                        placeholder="e.g. Delhivery Surface Logistics / BlueDart"
                        className="w-full text-xs border border-gray-300 rounded px-3 py-2 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Return AWB / Tracking Number
                      </label>
                      <input
                        type="text"
                        value={reverseTracking}
                        onChange={(e) => setReverseTracking(e.target.value)}
                        placeholder="e.g. DEL-REV-987654321"
                        className="w-full text-xs font-mono border border-gray-300 rounded px-3 py-2 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Artisan / Warehouse Notes</label>
                      <textarea
                        rows={2}
                        value={vendorNotes}
                        onChange={(e) => setVendorNotes(e.target.value)}
                        placeholder="Optional instructions for warehouse receipt inspection..."
                        className="w-full text-xs border border-gray-300 rounded p-2 text-gray-900 resize-none"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* REJECT Fields */}
              {modalAction === 'REJECT' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Mandatory Rejection Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Explain specifically why this return or replacement is declined (e.g. hygiene seal tampered, item altered)..."
                      className="w-full text-xs border border-gray-300 rounded p-2 text-gray-900 resize-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <p className="text-[11px] text-gray-500">
                    This rejection reason will be recorded on the customer&apos;s order audit trail.
                  </p>
                </div>
              )}

              {/* LOGISTICS Fields */}
              {modalAction === 'LOGISTICS' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Advance Shipment Status</label>
                    <select
                      value={nextShipmentStatus}
                      onChange={(e) => setNextShipmentStatus(e.target.value)}
                      className="w-full text-xs border border-gray-300 rounded px-3 py-2 bg-white text-gray-900"
                    >
                      <option value={actionItem.status}>Current: {actionItem.status.replace(/_/g, ' ')}</option>
                      {actionItem.status === 'APPROVED' && <option value="PICKED_UP">Mark as Picked Up (In Transit)</option>}
                      {(actionItem.status === 'APPROVED' || actionItem.status === 'PICKED_UP') && (
                        <option value="RECEIVED_AT_WH">Mark as Received at Warehouse</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Reverse Courier</label>
                    <input
                      type="text"
                      value={reverseCourier}
                      onChange={(e) => setReverseCourier(e.target.value)}
                      className="w-full text-xs border border-gray-300 rounded px-3 py-2 text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">AWB / Tracking Number</label>
                    <input
                      type="text"
                      value={reverseTracking}
                      onChange={(e) => setReverseTracking(e.target.value)}
                      className="w-full text-xs font-mono border border-gray-300 rounded px-3 py-2 text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Warehouse Notes</label>
                    <input
                      type="text"
                      value={vendorNotes}
                      onChange={(e) => setVendorNotes(e.target.value)}
                      className="w-full text-xs border border-gray-300 rounded px-3 py-2 text-gray-900"
                    />
                  </div>
                </div>
              )}

              {/* QC INSPECTION Fields */}
              {modalAction === 'QC' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                      QC Inspection Decision <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setQcResult('PASS')}
                        className={`py-2 px-3 text-xs font-bold rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                          qcResult === 'PASS'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>QC PASS (Restock)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setQcResult('FAIL')}
                        className={`py-2 px-3 text-xs font-bold rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                          qcResult === 'FAIL'
                            ? 'bg-red-600 text-white border-red-600 shadow-sm'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <XCircle className="h-4 w-4" />
                        <span>QC FAIL (Defective)</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Product Condition &amp; Seal Details <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={conditionDetails}
                      onChange={(e) => setConditionDetails(e.target.value)}
                      placeholder="e.g. Fabric weave verified, artisan seal and tags present..."
                      className="w-full text-xs border border-gray-300 rounded p-2 text-gray-900 resize-none"
                    />
                  </div>

                  {qcResult === 'FAIL' && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Specific Failure Reason <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={failedReason}
                        onChange={(e) => setFailedReason(e.target.value)}
                        placeholder="e.g. Altered hem, missing tags, perfume odor"
                        className="w-full text-xs border border-red-300 rounded px-3 py-2 text-gray-900 focus:ring-1 focus:ring-red-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Inspection Evidence Photos (URLs, one per line)
                    </label>
                    <textarea
                      rows={2}
                      value={evidencePhotosText}
                      onChange={(e) => setEvidencePhotosText(e.target.value)}
                      placeholder="https://... (Inspection photos)"
                      className="w-full text-xs font-mono border border-gray-300 rounded p-2 text-gray-900 resize-none"
                    />
                  </div>

                  <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded text-[11px] text-indigo-900">
                    <p>
                      {qcResult === 'PASS'
                        ? `Passing QC will atomically restore ${actionItem.requestedQuantity} unit(s) to active ProductInventory.`
                        : 'Failing QC will reject restocking. The customer can dispute this decision with concierge support.'}
                    </p>
                  </div>
                </div>
              )}

              {/* DISPATCH REPLACEMENT Fields */}
              {modalAction === 'DISPATCH' && (
                <div className="space-y-3">
                  <div className="p-2.5 bg-purple-50 border border-purple-200 rounded text-[11px] text-purple-900">
                    <p className="font-semibold">Forward Replacement Dispatch</p>
                    <p className="mt-0.5">
                      Confirming dispatch will release the reserved stock and deduct {actionItem.requestedQuantity} unit(s) from your active inventory.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Courier Partner <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={forwardCourier}
                      onChange={(e) => setForwardCourier(e.target.value)}
                      placeholder="e.g. Bluedart, Delhivery, DTDC"
                      className="w-full text-xs border border-gray-300 rounded px-3 py-2 text-gray-900 focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Forward AWB / Tracking Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={forwardTracking}
                      onChange={(e) => setForwardTracking(e.target.value)}
                      placeholder="e.g. BLU-99281726"
                      className="w-full text-xs font-mono border border-gray-300 rounded px-3 py-2 text-gray-900 focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Dispatch Notes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={vendorNotes}
                      onChange={(e) => setVendorNotes(e.target.value)}
                      placeholder="e.g. Handed over to courier hub..."
                      className="w-full text-xs border border-gray-300 rounded p-2 text-gray-900 resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="px-3.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-4 py-1.5 text-xs font-bold text-white rounded shadow-sm transition-all disabled:opacity-50 ${
                    modalAction === 'REJECT' || (modalAction === 'QC' && qcResult === 'FAIL')
                      ? 'bg-red-600 hover:bg-red-700'
                      : modalAction === 'QC'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : modalAction === 'DISPATCH'
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'bg-gray-900 hover:bg-black'
                  }`}
                >
                  {isSubmitting
                    ? 'Processing...'
                    : modalAction === 'REJECT'
                    ? 'Confirm Rejection'
                    : modalAction === 'QC'
                    ? qcResult === 'PASS'
                      ? 'Confirm QC Pass & Restock'
                      : 'Confirm QC Failure'
                    : modalAction === 'DISPATCH'
                    ? 'Confirm & Dispatch Replacement'
                    : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toast */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 transform transition-all duration-300 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl text-xs z-50 flex items-center gap-2.5 max-w-sm border border-white/10 animate-in fade-in">
          {toast.type === 'error' ? (
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          )}
          <span className="flex-1 font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
