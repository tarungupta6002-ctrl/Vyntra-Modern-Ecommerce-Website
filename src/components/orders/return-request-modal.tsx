'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Package, RefreshCw, RotateCcw, X } from 'lucide-react';
import { CometSpinner } from '@/components/ui/loading-spinner';
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
  { value: 'DAMAGED_ON_ARRIVAL', label: 'It arrived damaged' },
  { value: 'DEFECTIVE', label: "It's defective or doesn't work" },
  { value: 'WRONG_ITEM', label: 'I got the wrong item, size or colour' },
  { value: 'NOT_AS_DESCRIBED', label: "It doesn't match the description or photos" },
  { value: 'SIZE_FIT_ISSUE', label: "The size or fit isn't right" },
  { value: 'QUALITY_NOT_EXPECTED', label: "The quality isn't what I expected" },
  { value: 'BUYER_REMORSE', label: 'I changed my mind' },
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
      setError('Choose the size you want instead.');
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
        throw new Error(data.error?.message || data.message || 'Could not send your request.');
      }

      onSuccess(data.data.returnRequest.id, data.data.returnRequest.type);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Could not send your request. Please try again.');
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
    >
      <div
        ref={modalRef}
        className="relative flex max-h-[95vh] w-full max-w-xl flex-col overflow-hidden rounded-t-xl border border-[#D5D9D9] bg-white shadow-xl sm:max-h-[90vh] sm:rounded-xl"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#EAEDED] px-5 py-3.5">
          <h2 id="return-request-heading" className="text-lg font-semibold text-[#0F1111]">
            Return or replace an item
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-[#565959] hover:bg-[#F7F8F8]" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
            {/* Item */}
            <div className="flex items-center gap-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[#EAEDED] bg-[#F7F8F8]">
                {item.image ? (
                  <Image src={item.image} alt="" fill className="object-contain p-1" />
                ) : (
                  <Package className="absolute inset-0 m-auto h-6 w-6 text-[#8A8F8F]" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#0F1111]">{item.title}</p>
                <p className="text-xs text-[#565959]">
                  {[item.size && item.size !== 'N/A' && `Size ${item.size}`, item.color && item.color !== 'N/A' && item.color, `Qty ${item.quantity}`, formatINR(item.price)]
                    .filter(Boolean)
                    .join(' · ')}
                  {isCustomizedItem && ' · Made to order'}
                </p>
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">
                {error}
              </p>
            )}

            {/* Reason */}
            <div>
              <label htmlFor="return-reason" className="mb-1 block text-sm font-semibold text-[#0F1111]">
                What&apos;s wrong with it?
              </label>
              <select
                id="return-reason"
                value={reason}
                onChange={(e) => handleReasonChange(e.target.value)}
                className="w-full rounded-lg border border-[#D5D9D9] bg-white px-3 py-2 text-sm text-[#0F1111] focus:border-[#007185] focus:outline-none focus:ring-1 focus:ring-[#007185]"
                required
              >
                {REASON_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Refund or replacement */}
            <fieldset>
              <legend className="mb-1.5 text-sm font-semibold text-[#0F1111]">What would you like?</legend>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ['RETURN_REFUND', 'Refund', RotateCcw],
                    ['REPLACEMENT', 'Replacement', RefreshCw],
                  ] as const
                ).map(([value, label, Icon]) => {
                  const disabled = value === 'RETURN_REFUND' && isPreferenceReason;
                  return (
                    <label
                      key={value}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm ${
                        disabled
                          ? 'cursor-not-allowed border-[#E3E6E6] bg-[#F7F8F8] text-[#8A8F8F]'
                          : requestType === value
                          ? 'cursor-pointer border-[#007185] bg-[#007185]/5 font-semibold text-[#0F1111]'
                          : 'cursor-pointer border-[#D5D9D9] text-[#0F1111] hover:bg-[#F7F8F8]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="return-type"
                        checked={requestType === value}
                        disabled={disabled}
                        onChange={() => setRequestType(value)}
                        className="h-4 w-4 accent-[#007185]"
                      />
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {label}
                    </label>
                  );
                })}
              </div>
              {isPreferenceReason && (
                <p className="mt-1.5 text-xs text-[#565959]">
                  For a change of mind or a size, fit or quality preference you can get a replacement, for example in another size.
                  Refunds are for items that arrived damaged, defective, wrong or not as described.
                </p>
              )}
            </fieldset>

            {/* Replacement size */}
            {requestType === 'REPLACEMENT' && hasAlternativeSizes && (
              <fieldset>
                <legend className="mb-1.5 text-sm font-semibold text-[#0F1111]">
                  Replacement size <span className="font-normal text-[#565959]">(you have {item.size})</span>
                </legend>
                <div className="flex flex-wrap gap-2">
                  {sizeList.map((sizeOpt) => {
                    const isCurrent = sizeOpt === item.size;
                    const isSelected = selectedReplacementSize === sizeOpt;
                    return (
                      <button
                        key={sizeOpt}
                        type="button"
                        disabled={isCurrent}
                        aria-pressed={isSelected}
                        onClick={() => setSelectedReplacementSize(sizeOpt)}
                        className={`min-w-[3rem] rounded-lg border px-3 py-1.5 text-sm font-medium ${
                          isCurrent
                            ? 'cursor-not-allowed border-[#E3E6E6] bg-[#F7F8F8] text-[#8A8F8F]'
                            : isSelected
                            ? 'border-[#007185] bg-[#007185] text-white'
                            : 'border-[#D5D9D9] bg-white text-[#0F1111] hover:border-[#007185]'
                        }`}
                      >
                        {sizeOpt}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {/* Quantity */}
            {item.quantity > 1 && (
              <div>
                <label htmlFor="return-quantity" className="mb-1 block text-sm font-semibold text-[#0F1111]">
                  How many? <span className="font-normal text-[#565959]">(up to {item.quantity})</span>
                </label>
                <input
                  id="return-quantity"
                  type="number"
                  min={1}
                  max={item.quantity}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(item.quantity, parseInt(e.target.value) || 1)))}
                  className="w-24 rounded-lg border border-[#D5D9D9] px-3 py-2 text-sm tabular-nums focus:border-[#007185] focus:outline-none focus:ring-1 focus:ring-[#007185]"
                />
              </div>
            )}

            {/* Details */}
            <div>
              <label htmlFor="return-details" className="mb-1 block text-sm font-semibold text-[#0F1111]">
                Describe the problem <span className="font-normal text-[#565959]">(optional)</span>
              </label>
              <textarea
                id="return-details"
                rows={2}
                value={detailedReason}
                onChange={(e) => setDetailedReason(e.target.value)}
                placeholder="For example: the zip is broken, or the colour is different from the photo"
                className="w-full resize-none rounded-lg border border-[#D5D9D9] px-3 py-2 text-sm focus:border-[#007185] focus:outline-none focus:ring-1 focus:ring-[#007185]"
              />
            </div>

            <div>
              <label htmlFor="return-notes" className="mb-1 block text-sm font-semibold text-[#0F1111]">
                Note for the pickup <span className="font-normal text-[#565959]">(optional)</span>
              </label>
              <input
                id="return-notes"
                type="text"
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                placeholder="For example: please call before coming"
                className="w-full rounded-lg border border-[#D5D9D9] px-3 py-2 text-sm focus:border-[#007185] focus:outline-none focus:ring-1 focus:ring-[#007185]"
              />
            </div>

            {/* Cash on Delivery: where to send the refund */}
            {needsPayout && (
              <div className="rounded-lg border border-[#D5D9D9] bg-[#F7F8F8] p-3.5">
                <PayoutDetailsFields value={payout} onChange={setPayout} idPrefix="return-payout" />
              </div>
            )}

            <p className="text-xs text-[#565959]">
              Keep the item with its tags, accessories and box. After the seller approves the request, a courier picks it up from your
              delivery address. {requestType === 'REPLACEMENT' ? 'The replacement is sent once the item passes the seller\'s check.' : 'The refund is sent once the item passes the seller\'s check.'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[#EAEDED] bg-white px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-full border border-[#D5D9D9] bg-white px-4 py-2 text-sm font-semibold text-[#0F1111] hover:bg-[#F7F8F8]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#FCD200] bg-[#FFD814] px-5 py-2 text-sm font-semibold text-[#0F1111] hover:bg-[#F7CA00] disabled:opacity-60"
            >
              {isSubmitting && <CometSpinner className="h-4 w-4 text-current" decorative />}
              {isSubmitting ? 'Sending…' : requestType === 'REPLACEMENT' ? 'Request replacement' : 'Request refund'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
