'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  RotateCcw,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Package,
  HelpCircle,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Order, OrderItem } from '@/data/orders-data';
import { formatINR } from '@/lib/utils';
import { EMPTY_PAYOUT, PayoutDetailsFields, checkPayoutForm, type PayoutFormValue } from '@/components/orders/payout-details-fields';

interface ReturnRequestModalProps {
  order: Order;
  item: OrderItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (requestId: string, type: string) => void;
}

const REASON_OPTIONS = [
  { value: 'DAMAGED_ON_ARRIVAL', label: 'Damaged on Arrival (Transit Damage)' },
  { value: 'DEFECTIVE', label: 'Defective / Flaw in Workmanship' },
  { value: 'WRONG_ITEM', label: 'Wrong Item / Variant Delivered' },
  { value: 'SIZE_FIT_ISSUE', label: 'Size or Fit Issue' },
  { value: 'NOT_AS_DESCRIBED', label: 'Item Does Not Match Description / Images' },
  { value: 'QUALITY_NOT_EXPECTED', label: 'Quality Below Luxury Standard' },
  { value: 'BUYER_REMORSE', label: 'Changed Mind / Buyer Remorse' },
];

export function ReturnRequestModal({
  order,
  item,
  isOpen,
  onClose,
  onSuccess,
}: ReturnRequestModalProps) {
  const [requestType, setRequestType] = useState<'RETURN_REFUND' | 'REPLACEMENT'>('RETURN_REFUND');
  const [reason, setReason] = useState<string>('DAMAGED_ON_ARRIVAL');
  const [quantity, setQuantity] = useState<number>(1);
  const [detailedReason, setDetailedReason] = useState<string>('');
  const [customerNotes, setCustomerNotes] = useState<string>('');
  const [selectedReplacementSize, setSelectedReplacementSize] = useState<string>('');
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);
  const [isLoadingSizes, setIsLoadingSizes] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [payout, setPayout] = useState<PayoutFormValue>(EMPTY_PAYOUT);

  const modalRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Keyboard accessibility: Escape closes modal, focus trap & focus restore
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement | null;
      document.body.style.overflow = 'hidden';

      const timer = setTimeout(() => {
        if (!modalRef.current) return;
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
          focusable[0].focus();
        }
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
          return;
        }

        if (e.key === 'Tab') {
          if (!modalRef.current) return;
          const focusable = modalRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length === 0) {
            e.preventDefault();
            return;
          }
          const firstElement = focusable[0];
          const lastElement = focusable[focusable.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === firstElement || !modalRef.current.contains(document.activeElement)) {
              e.preventDefault();
              lastElement.focus();
            }
          } else {
            if (document.activeElement === lastElement || !modalRef.current.contains(document.activeElement)) {
              e.preventDefault();
              firstElement.focus();
            }
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'unset';
        if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
          triggerRef.current.focus();
          triggerRef.current = null;
        }
      };
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen, onClose]);

  // Fetch actual product variants to populate replacement sizes dynamically
  useEffect(() => {
    let isMounted = true;
    if (!isOpen || !item) return;

    // Reset size state on modal open
    setSelectedReplacementSize('');

    async function loadProductSizes() {
      setIsLoadingSizes(true);
      try {
        const query = encodeURIComponent(item.title);
        const res = await fetch(`/api/products?search=${query}`);
        if (res.ok) {
          const json = await res.json();
          const products = Array.isArray(json.data) ? json.data : json.data?.products || [];
          const matched = products.find((p: any) => p.id === item.productId || p.title === item.title) || products[0];

          if (matched && Array.isArray(matched.sizes)) {
            // Filter non-standard/placeholder sizes
            const parsed = matched.sizes.filter(
              (s: string) => s && s !== 'Standard' && s !== 'Default' && s !== 'N/A' && s !== 'Custom Made'
            );
            if (isMounted && parsed.length > 0) {
              setAvailableSizes(parsed);
            }
          }
        }
      } catch (err) {
        console.warn('[ReturnRequestModal] Failed to load product sizes:', err);
      } finally {
        if (isMounted) {
          setIsLoadingSizes(false);
        }
      }
    }

    loadProductSizes();

    return () => {
      isMounted = false;
    };
  }, [isOpen, item?.productId, item?.title]);

  if (!isOpen) return null;

  // Determine if this item has meaningful size variants
  const isSizedItem = Boolean(item.size && item.size !== 'N/A' && item.size !== 'Standard' && item.size !== 'Custom Made');
  const sizeList = Array.from(new Set([...(item.size ? [item.size] : []), ...availableSizes])).filter(Boolean);
  const hasAlternativeSizes = isSizedItem && sizeList.length > 1;

  const needsPayout = (order.paymentMethod || '').toUpperCase() === 'COD' && requestType === 'RETURN_REFUND';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Requirement 5: Require replacement size before submission when valid size variants exist
    if (requestType === 'REPLACEMENT' && hasAlternativeSizes && !selectedReplacementSize) {
      setError('Please select a desired replacement size before submitting your replacement request.');
      return;
    }

    // Cash on Delivery refunds go to the customer's UPI ID or bank account.
    let payoutDetails: Record<string, string> | undefined;
    if (needsPayout) {
      const check = checkPayoutForm(payout);
      if ('error' in check) {
        setError(check.error);
        return;
      }
      payoutDetails = check.body;
    }

    setIsSubmitting(true);

    try {
      // Requirement 6: Store selection in customerNotes in standard format: "Desired Replacement Size: L"
      let notesPayload = customerNotes.trim();
      if (requestType === 'REPLACEMENT' && selectedReplacementSize) {
        const sizeTag = `Desired Replacement Size: ${selectedReplacementSize}`;
        notesPayload = notesPayload ? `${sizeTag} • ${notesPayload}` : sizeTag;
      }

      const response = await fetch('/api/returns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderItemId: item.id,
          type: requestType,
          reason,
          detailedReason: detailedReason.trim() || undefined,
          customerNotes: notesPayload || undefined,
          requestedQuantity: quantity,
          payoutDetails,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Failed to submit request');
      }

      onSuccess(data.data.returnRequest.id, data.data.returnRequest.type);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPreferenceReason = reason === 'SIZE_FIT_ISSUE' || reason === 'BUYER_REMORSE' || reason === 'QUALITY_NOT_EXPECTED';
  const isCustomizedItem = Boolean((item as any).isCustomizedSnapshot || (item as any).isCustomized);

  const handleReasonChange = (newReason: string) => {
    setReason(newReason);
    if (newReason === 'SIZE_FIT_ISSUE' || newReason === 'BUYER_REMORSE' || newReason === 'QUALITY_NOT_EXPECTED') {
      setRequestType('REPLACEMENT');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="return-request-heading"
      className={
        isFullScreen
          ? 'fixed inset-0 z-50 flex flex-col bg-white animate-in fade-in duration-150'
          : 'fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200'
      }
    >
      <div
        ref={modalRef}
        className={
          isFullScreen
            ? 'relative w-full h-full flex flex-col bg-white overflow-hidden'
            : 'relative w-full max-w-2xl h-[90vh] max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden'
        }
      >
        {/* Header (Pinned) */}
        <div className="px-6 py-3.5 bg-gradient-to-r from-gray-900 to-gray-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {requestType === 'REPLACEMENT' ? (
              <RefreshCw className="h-5 w-5 text-amber-400" />
            ) : (
              <RotateCcw className="h-5 w-5 text-amber-400" />
            )}
            <h2 id="return-request-heading" className="text-base font-semibold tracking-wide">
              {requestType === 'REPLACEMENT' ? 'Request Replacement' : 'Request Return & Refund'}
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsFullScreen((prev) => !prev)}
              className="px-2 py-1 rounded-md text-gray-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5 text-xs font-medium"
              title={isFullScreen ? 'Exit Full Screen' : 'Open Full Screen'}
            >
              {isFullScreen ? (
                <>
                  <Minimize2 className="h-4 w-4 text-amber-400" />
                  <span className="hidden sm:inline">Exit Full Screen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-4 w-4 text-amber-400" />
                  <span className="hidden sm:inline">Full Screen</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Item Summary Card (Pinned) */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 shrink-0">
          <div className={`${isFullScreen ? 'max-w-3xl mx-auto' : ''} flex items-center gap-3`}>
            <div className="relative h-12 w-12 rounded-md overflow-hidden bg-gray-200 flex-shrink-0 border border-gray-200">
              {item.image ? (
                <Image src={item.image} alt={item.title} fill className="object-cover" />
              ) : (
                <Package className="h-6 w-6 text-gray-400 m-auto mt-3" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {item.brand}
                </p>
                {isCustomizedItem && (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                    Made-to-Order
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
              <p className="text-xs text-gray-500">
                Size: {item.size} • Color: {item.color} • Qty: {item.quantity} • {formatINR(item.price)}
              </p>
            </div>
          </div>
        </div>

        {/* Form with Scrollable Body & Sticky Footer */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            <div className={isFullScreen ? 'max-w-3xl mx-auto space-y-4' : 'space-y-4'}>
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-700">
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

            {/* Policy Guidance Alert */}
            {isPreferenceReason && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Policy Notice: Size or preference changes are eligible for <strong>Exchange Only</strong>.</span>
              </div>
            )}

            {/* Request Type Toggle */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                Resolution Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={isPreferenceReason}
                  onClick={() => setRequestType('RETURN_REFUND')}
                  className={`px-3 py-2.5 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                    isPreferenceReason
                      ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                      : requestType === 'RETURN_REFUND'
                      ? 'border-gray-900 bg-gray-900 text-white shadow-sm'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Return for Refund</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRequestType('REPLACEMENT')}
                  className={`px-3 py-2.5 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                    requestType === 'REPLACEMENT'
                      ? 'border-gray-900 bg-gray-900 text-white shadow-sm'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Replacement</span>
                </button>
              </div>
            </div>

            {/* Reason Select */}
            <div>
              <label htmlFor="return-reason" className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                Reason for Return / Exchange <span className="text-red-500">*</span>
              </label>
              <select
                id="return-reason"
                value={reason}
                onChange={(e) => handleReasonChange(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                required
              >
                {REASON_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Desired Replacement Size Selector - Requirements 1, 2, 3, 4, 8 */}
            {requestType === 'REPLACEMENT' && hasAlternativeSizes && (
              <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-purple-950 uppercase tracking-wider">
                    Desired Replacement Size <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-purple-800 font-medium">
                    Current: <strong className="font-bold underline">{item.size}</strong>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  {sizeList.map((sizeOpt) => {
                    const isCurrent = sizeOpt === item.size;
                    const isSelected = selectedReplacementSize === sizeOpt;

                    return (
                      <button
                        key={sizeOpt}
                        type="button"
                        disabled={isCurrent}
                        onClick={() => setSelectedReplacementSize(sizeOpt)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md border transition-all flex items-center gap-1.5 ${
                          isCurrent
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
                            : isSelected
                            ? 'bg-purple-900 text-white border-purple-950 shadow-sm ring-2 ring-purple-400'
                            : 'bg-white text-gray-800 border-purple-200 hover:border-purple-600 hover:bg-purple-50'
                        }`}
                      >
                        <span>{sizeOpt}</span>
                        {isCurrent && <span className="text-[10px] font-normal text-gray-400">(Current)</span>}
                        {isSelected && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                      </button>
                    );
                  })}
                </div>

                {selectedReplacementSize ? (
                  <p className="text-[11px] text-emerald-800 font-medium flex items-center gap-1 mt-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Will exchange <strong>Size {item.size}</strong> for <strong>Size {selectedReplacementSize}</strong>.</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-purple-700 mt-1">
                    Please select your replacement size from the available variants above.
                  </p>
                )}
              </div>
            )}

            {/* Quantity Selector (if item.quantity > 1) */}
            {item.quantity > 1 && (
              <div>
                <label htmlFor="return-quantity" className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                  Quantity to Return (Max {item.quantity})
                </label>
                <input
                  id="return-quantity"
                  type="number"
                  min={1}
                  max={item.quantity}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(item.quantity, parseInt(e.target.value) || 1)))}
                  className="w-24 text-xs border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
              </div>
            )}

            {/* Detailed Reason */}
            <div>
              <label htmlFor="return-details" className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                Specific Defect or Fit Details
              </label>
              <textarea
                id="return-details"
                rows={2}
                value={detailedReason}
                onChange={(e) => setDetailedReason(e.target.value)}
                placeholder="e.g. Seam stitching loose at left collar; fabric discoloration."
                className="w-full text-xs border border-gray-300 rounded-lg p-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 resize-none"
              />
            </div>

            {/* Customer Pickup Notes */}
            <div>
              <label htmlFor="return-notes" className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                Pickup Instructions / Notes
              </label>
              <input
                id="return-notes"
                type="text"
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                placeholder="e.g. Please call before doorstep pickup."
                className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
            </div>

            {/* Cash on Delivery: where to send the refund */}
            {needsPayout && (
              <div className="rounded-lg border border-[#D5D9D9] bg-[#F7F8F8] p-3.5">
                <PayoutDetailsFields value={payout} onChange={setPayout} idPrefix="return-payout" />
              </div>
            )}

            {/* Guarantee / Notice */}
            <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
              <ShieldCheck className="h-4 w-4 text-amber-700 flex-shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Items must be in original condition with intact artisan tags. Once approved by the vendor, doorstep reverse pickup will be arranged automatically.
              </p>
            </div>
            </div>
          </div>

          {/* Action Buttons (Sticky Footer) */}
          <div className="shrink-0 px-6 py-3.5 bg-gray-50 border-t border-gray-200">
            <div className={`${isFullScreen ? 'max-w-3xl mx-auto' : ''} flex items-center justify-end gap-3`}>
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
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold text-white bg-gray-900 hover:bg-black rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <span>Submitting...</span>
                ) : (
                  <span>{requestType === 'REPLACEMENT' ? 'Submit Replacement' : 'Submit Return Request'}</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
