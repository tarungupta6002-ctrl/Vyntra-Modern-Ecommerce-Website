'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  X,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Package,
  Building2,
  DollarSign,
  User,
  Scale,
} from 'lucide-react';
import { formatINR } from '@/lib/utils';

interface AdminDisputeReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnRequest: any | null;
  onSuccess: (message: string) => void;
}

export function AdminDisputeReviewModal({
  isOpen,
  onClose,
  returnRequest,
  onSuccess,
}: AdminDisputeReviewModalProps) {
  const [resolution, setResolution] = useState<'REFUND_APPROVED' | 'REPLACEMENT_APPROVED' | 'REJECTED'>('REFUND_APPROVED');
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !returnRequest) return null;

  // Parse versioned disputeNotes if available
  let parsedNotes: any = null;
  if (returnRequest.disputeNotes) {
    try {
      parsedNotes = JSON.parse(returnRequest.disputeNotes);
    } catch {
      parsedNotes = { detailedExplanation: returnRequest.disputeNotes };
    }
  }

  const claimantName = parsedNotes?.disputedBy?.name || returnRequest.user?.name || 'Customer Claimant';
  const claimantRole = parsedNotes?.disputedBy?.role || returnRequest.disputedByRole || 'CUSTOMER';
  const disputeReason = parsedNotes?.reason || 'Discrepancy in inspection or rejection policy';
  const disputeExplanation = parsedNotes?.detailedExplanation || parsedNotes?.explanation || 'No detailed explanation provided.';
  const evidencePhotos: string[] = Array.isArray(parsedNotes?.evidencePhotos) ? parsedNotes.evidencePhotos : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!adminNotes.trim()) {
      setError('Administrative resolution notes are mandatory when adjudicating a QC dispute.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/admin/returns/${returnRequest.id}/dispute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resolution,
          adminNotes: adminNotes.trim(),
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || json.message || 'Failed to adjudicate dispute');
      }

      onSuccess(`Dispute resolved as ${resolution.replace(/_/g, ' ')}.`);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while resolving dispute.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-white rounded-xl shadow-2xl border border-[#E3E6E6] overflow-hidden">
        {/* Header (Pinned) */}
        <div className="px-6 py-4 bg-[#131921] text-white flex items-center justify-between shrink-0 border-b border-[#232F3E]">
          <div className="flex items-center gap-2.5">
            <Scale className="h-5 w-5 text-[#FF9900]" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#FF9900] bg-[#232F3E] px-2 py-0.5 rounded border border-[#FF9900]/40">
                  Dispute review
                </span>
                <span className="text-[#8A8F8F] text-xs">•</span>
                <span className="text-xs tabular-nums text-[#D5D9D9]">
                  Return #{returnRequest.id.slice(-8)}
                </span>
              </div>
              <h2 className="text-base font-bold text-white mt-0.5">
                QC &amp; Rejection Dispute Adjudication — Order #{returnRequest.order?.orderNumber}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8A8F8F] hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Order & Return Context Bar */}
        <div className="bg-[#EAEDED] px-6 py-2.5 border-b border-[#D5D9D9] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs shrink-0">
          <div>
            <span className="text-[10px] font-bold text-[#565959] block">Customer</span>
            <span className="font-semibold text-[#0F1111] truncate block">
              {returnRequest.user?.name || 'Customer'}
            </span>
            <span className="text-[10px] text-[#565959] block truncate">{returnRequest.user?.email}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#565959] block">Seller</span>
            <span className="font-semibold text-[#0F1111] truncate block">
              {returnRequest.vendor?.storeName || 'Vendor'}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#565959] block">Item / Total</span>
            <span className="font-semibold text-[#0F1111] block tabular-nums">
              {formatINR(returnRequest.orderItem?.totalPrice || returnRequest.order?.totalAmount || 0)}
            </span>
            <span className="text-[10px] text-[#565959] block">
              Qty: {returnRequest.requestedQuantity}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#565959] block">Current Status</span>
            <span className="inline-block text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
              {returnRequest.status?.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-700">
                <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Vendor Rejection Record */}
            <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-lg space-y-1 text-xs">
              <span className="text-[11px] font-bold text-rose-900 block">
                Seller's inspection result
              </span>
              <p className="text-rose-950 font-medium">
                {returnRequest.vendorNotes || returnRequest.qcFailedReason || 'Rejection record noted by seller.'}
              </p>
              {returnRequest.qcNotes && (
                <p className="text-[#565959] text-[11px]">QC Notes: {returnRequest.qcNotes}</p>
              )}
            </div>

            {/* Dispute Claim & Evidence Section */}
            <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-lg space-y-3">
              <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-700" />
                  <span className="text-xs font-bold text-amber-950">
                    Claimant Formal Dispute
                  </span>
                </div>
                <span className="text-[11px] text-amber-900 font-semibold">
                  Filed by: {claimantName} ({claimantRole})
                </span>
              </div>

              <div>
                <span className="text-[11px] font-bold text-amber-900 block">Ground / Reason</span>
                <p className="text-xs font-semibold text-[#0F1111] mt-0.5">
                  {disputeReason.replace(/_/g, ' ')}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-bold text-amber-900 block">Claimant Explanation</span>
                <p className="text-xs text-[#0F1111] bg-white p-3 rounded-md border border-amber-200 mt-0.5 whitespace-pre-wrap leading-relaxed">
                  {disputeExplanation}
                </p>
              </div>

              {/* Photographic Evidence */}
              <div>
                <span className="text-[11px] font-bold text-amber-900 block mb-1.5">
                  Photographic Evidence ({evidencePhotos.length})
                </span>
                {evidencePhotos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {evidencePhotos.map((url, idx) => (
                      <div key={idx} className="relative group rounded-lg overflow-hidden border border-amber-200 bg-white p-1">
                        <div className="relative h-28 w-full rounded bg-[#F0F2F2] overflow-hidden">
                          <Image
                            src={url}
                            alt={`Dispute Evidence ${idx + 1}`}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 flex items-center justify-center gap-1 text-[11px] font-semibold text-[#007185] hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>View Full Photo {idx + 1}</span>
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#565959] italic">No external photo URLs provided by claimant.</p>
                )}
              </div>
            </div>

            {/* Arbitration Decision Selector */}
            <div>
              <label className="block text-xs font-bold text-[#0F1111] mb-2">
                Arbitration Determination <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. REFUND_APPROVED */}
                <label
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                    resolution === 'REFUND_APPROVED'
                      ? 'border-[#007185] bg-[#F0F8F9] ring-2 ring-[#007185]/20'
                      : 'border-[#E3E6E6] bg-white hover:bg-[#F7F8F8]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="radio"
                      name="resolution"
                      value="REFUND_APPROVED"
                      checked={resolution === 'REFUND_APPROVED'}
                      onChange={() => setResolution('REFUND_APPROVED')}
                      className="text-[#007185] focus:ring-[#007185]"
                    />
                    <span className="text-xs font-bold text-[#0F1111]">Approve Cash Refund</span>
                  </div>
                  <p className="text-[11px] text-[#565959] leading-snug pl-5">
                    Overrules vendor rejection. Authorizes customer refund ledger ceiling.
                  </p>
                </label>

                {/* 2. REPLACEMENT_APPROVED */}
                <label
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                    resolution === 'REPLACEMENT_APPROVED'
                      ? 'border-purple-800 bg-purple-50/60 ring-2 ring-purple-600/20'
                      : 'border-[#E3E6E6] bg-white hover:bg-[#F7F8F8]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="radio"
                      name="resolution"
                      value="REPLACEMENT_APPROVED"
                      checked={resolution === 'REPLACEMENT_APPROVED'}
                      onChange={() => setResolution('REPLACEMENT_APPROVED')}
                      className="text-purple-700 focus:ring-purple-700"
                    />
                    <span className="text-xs font-bold text-[#0F1111]">Approve Replacement</span>
                  </div>
                  <p className="text-[11px] text-[#565959] leading-snug pl-5">
                    Overrules rejection. Orders vendor to dispatch replacement piece.
                  </p>
                </label>

                {/* 3. REJECTED */}
                <label
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                    resolution === 'REJECTED'
                      ? 'border-[#0F1111] bg-[#F0F2F2] ring-2 ring-[#565959]/20'
                      : 'border-[#E3E6E6] bg-white hover:bg-[#F7F8F8]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="radio"
                      name="resolution"
                      value="REJECTED"
                      checked={resolution === 'REJECTED'}
                      onChange={() => setResolution('REJECTED')}
                      className="text-[#0F1111] focus:ring-[#0F1111]"
                    />
                    <span className="text-xs font-bold text-[#0F1111]">Dismiss Dispute</span>
                  </div>
                  <p className="text-[11px] text-[#565959] leading-snug pl-5">
                    Upholds rejection. Return remains closed/rejected without payout.
                  </p>
                </label>
              </div>
            </div>

            {/* Mandatory Concierge Resolution Notes */}
            <div>
              <label htmlFor="admin-dispute-notes" className="block text-xs font-bold text-[#0F1111] mb-1">
                Your decision and reason <span className="text-red-500">*</span>
              </label>
              <textarea
                id="admin-dispute-notes"
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                disabled={isSubmitting}
                placeholder="Document physical tag inspection records, courier transit timeline, and legal policy basis..."
                className="w-full text-xs border border-[#D5D9D9] rounded-lg p-3 text-[#0F1111] placeholder-[#8A8F8F] focus:outline-none focus:ring-1 focus:ring-[#0F1111] resize-none disabled:bg-[#F0F2F2]"
                required
              />
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="shrink-0 px-6 py-3.5 bg-[#F7F8F8] border-t border-[#E3E6E6] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-[#333333] hover:bg-[#E3E6E6]/70 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-[#131921] hover:bg-black rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <span>Recording Decision...</span>
              ) : (
                <span>Confirm Arbitration Determination</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
