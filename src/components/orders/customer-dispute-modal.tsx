'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  X,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Plus,
  Trash2,
  Package,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { Order, OrderItem } from '@/data/orders-data';
import { formatINR } from '@/lib/utils';
import {
  computeIstDisputeDeadline,
  isWithinDeadline,
  formatIstDateTime,
} from '@/lib/date-utils';

interface CustomerDisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  item: OrderItem;
  returnRequest: NonNullable<OrderItem['returnRequest']>;
  onSuccess: (disputeData: any) => void;
}

const DISPUTE_REASONS = [
  { value: 'DEFECT_MISDIAGNOSED', label: 'Defect / Flaw Misdiagnosed during Inspection' },
  { value: 'TRANSIT_DAMAGE', label: 'Damage Occurred During Courier Transit (Not Customer Caused)' },
  { value: 'WRONG_ITEM_CLAIM', label: 'Shipped Variant Matches Order Specification' },
  { value: 'INCORRECT_POLICY_APPLICATION', label: 'Category Return Policy Incorrectly Applied' },
  { value: 'OTHER', label: 'Other Inspection / Rejection Discrepancy' },
];

export function CustomerDisputeModal({
  isOpen,
  onClose,
  order,
  item,
  returnRequest,
  onSuccess,
}: CustomerDisputeModalProps) {
  const [reason, setReason] = useState<string>('DEFECT_MISDIAGNOSED');
  const [detailedExplanation, setDetailedExplanation] = useState<string>('');
  const [photoUrls, setPhotoUrls] = useState<string[]>(['']);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Compute 5-calendar-day dispute deadline
  const triggerDate =
    returnRequest.rejectedAt ||
    returnRequest.qcCompletedAt ||
    returnRequest.createdAt;

  let deadlineDate: Date | null = null;
  let isWindowActive = true;

  try {
    if (triggerDate) {
      deadlineDate = computeIstDisputeDeadline(triggerDate, 5);
      isWindowActive = isWithinDeadline(new Date(), deadlineDate);
    }
  } catch {
    isWindowActive = true;
  }

  const handleAddPhotoField = () => {
    if (photoUrls.length < 5) {
      setPhotoUrls([...photoUrls, '']);
    }
  };

  const handlePhotoUrlChange = (index: number, val: string) => {
    const updated = [...photoUrls];
    updated[index] = val;
    setPhotoUrls(updated);
  };

  const handleRemovePhoto = (index: number) => {
    if (photoUrls.length > 1) {
      setPhotoUrls(photoUrls.filter((_, i) => i !== index));
    } else {
      setPhotoUrls(['']);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!detailedExplanation.trim()) {
      setError('Please provide a detailed explanation of your dispute.');
      return;
    }

    if (!isWindowActive) {
      setError('The 5-calendar-day dispute window for this return request has expired.');
      return;
    }

    setIsSubmitting(true);

    try {
      const validPhotos = photoUrls.map((p) => p.trim()).filter(Boolean);

      const res = await fetch(`/api/returns/${returnRequest.id}/dispute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason,
          detailedExplanation: detailedExplanation.trim(),
          evidencePhotos: validPhotos,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || json.message || 'Failed to submit dispute');
      }

      onSuccess(json.data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while filing the dispute.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header (Pinned) */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="h-5 w-5 text-amber-400" />
            <div>
              <h2 className="text-base font-bold tracking-wide">
                Raise Return Dispute — Concierge Arbitration
              </h2>
              <p className="text-[11px] text-amber-200/80">
                Order #{order.orderNumber} • Return #{returnRequest.id.slice(-8)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-amber-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Item Summary Card */}
        <div className="px-6 py-3 bg-amber-50/50 border-b border-amber-200/60 flex items-center gap-3 shrink-0">
          <div className="relative h-12 w-12 rounded-md overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
            {item.image ? (
              <Image src={item.image} alt={item.title} fill className="object-cover" />
            ) : (
              <Package className="h-6 w-6 text-gray-400 m-auto mt-3" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{item.brand}</p>
            <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
            <p className="text-xs text-gray-500">
              Size: {item.size} • Color: {item.color} • Qty: {item.quantity} • {formatINR(item.price)}
            </p>
          </div>
          <span className="text-xs font-bold text-rose-800 bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-md shrink-0">
            {returnRequest.status.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Rejection Details & Deadline Banner */}
        <div className="px-6 py-2.5 bg-rose-50/70 border-b border-rose-200/70 text-xs text-rose-900 shrink-0 space-y-1">
          {returnRequest.vendorNotes && (
            <p>
              <strong className="font-semibold text-rose-950">Artisan/Vendor Stated Reason:</strong>{' '}
              {returnRequest.vendorNotes}
            </p>
          )}
          {deadlineDate && (
            <p className="flex items-center gap-1.5 text-[11px] text-amber-900">
              <Clock className="h-3.5 w-3.5 text-amber-700 shrink-0" />
              <span>
                {isWindowActive ? (
                  <>
                    Dispute filing window active until: <strong>{formatIstDateTime(deadlineDate)}</strong>
                  </>
                ) : (
                  <span className="text-rose-700 font-bold">
                    Dispute window expired on {formatIstDateTime(deadlineDate)}
                  </span>
                )}
              </span>
            </p>
          )}
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-700">
                <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {!isWindowActive && (
              <div className="p-3 bg-rose-100 border border-rose-300 rounded-lg text-xs text-rose-800">
                This return request has exceeded the 5-calendar-day dispute window and cannot be submitted.
              </div>
            )}

            {/* Dispute Reason */}
            <div>
              <label htmlFor="dispute-reason" className="block text-xs font-bold text-gray-800 mb-1.5 uppercase tracking-wider">
                Dispute Ground / Category <span className="text-red-500">*</span>
              </label>
              <select
                id="dispute-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={!isWindowActive || isSubmitting}
                className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-amber-900 disabled:bg-gray-100"
                required
              >
                {DISPUTE_REASONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Detailed Explanation */}
            <div>
              <label htmlFor="dispute-explanation" className="block text-xs font-bold text-gray-800 mb-1 uppercase tracking-wider">
                Detailed Explanation <span className="text-red-500">*</span>
              </label>
              <p className="text-[11px] text-gray-500 mb-1.5">
                Explain clearly why the rejection or QC failure was incorrect. Include any condition details.
              </p>
              <textarea
                id="dispute-explanation"
                rows={3}
                value={detailedExplanation}
                onChange={(e) => setDetailedExplanation(e.target.value)}
                disabled={!isWindowActive || isSubmitting}
                placeholder="e.g. The item was received with loose seams at the collar before wearing. Artisan tags were never detached..."
                className="w-full text-xs border border-gray-300 rounded-lg p-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-900 resize-none disabled:bg-gray-100"
                required
              />
            </div>

            {/* Evidence Photos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Photographic Evidence (Image URL / Proof Link)
                </label>
                {photoUrls.length < 5 && isWindowActive && (
                  <button
                    type="button"
                    onClick={handleAddPhotoField}
                    className="text-[11px] font-semibold text-amber-900 hover:text-amber-950 flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Another Link</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-gray-500">
                Provide publicly accessible photo links demonstrating intact artisan tags, original condition, or packaging.
              </p>

              {photoUrls.map((url, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => handlePhotoUrlChange(idx, e.target.value)}
                    disabled={!isWindowActive || isSubmitting}
                    placeholder="https://images.unsplash.com/... or hosted photo URL"
                    className="flex-1 text-xs border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-900 disabled:bg-gray-100"
                  />
                  {photoUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      disabled={isSubmitting}
                      className="p-2 text-gray-400 hover:text-rose-600 transition-colors"
                      title="Remove URL"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Concierge Guarantee Notice */}
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
              <CheckCircle2 className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Vyntra Concierge Arbitration independently audits vendor quality inspection photographs and physical return records. Determinations are issued within 24–48 business hours.
              </p>
            </div>
          </div>

          {/* Sticky Footer Actions */}
          <div className="shrink-0 px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200/70 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isWindowActive}
              className="px-5 py-2 text-xs font-bold text-white bg-amber-900 hover:bg-amber-950 rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <span>Submitting Dispute...</span>
              ) : (
                <span>Submit Dispute for Review</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
