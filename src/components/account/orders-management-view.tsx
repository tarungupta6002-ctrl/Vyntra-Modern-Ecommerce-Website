'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  FileText,
  HelpCircle,
  Package,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Star,
  Truck,
  X,
} from 'lucide-react';
import { Order, OrderItem } from '@/data/orders-data';
import { useCartStore } from '@/store/cart-store';
import { useOrderStore } from '@/store/order-store';
import { formatINR } from '@/lib/utils';
import { formatCustomerRefundSummary } from '@/lib/refund-ui-helpers';
import { ReturnRequestModal } from '@/components/orders/return-request-modal';
import { CustomerDisputeModal } from '@/components/orders/customer-dispute-modal';
import { computeIstDisputeDeadline, isWithinDeadline } from '@/lib/date-utils';
import { getCourierTrackingUrl } from '@/lib/courier-tracking';
import { CometSpinner } from '@/components/ui/loading-spinner';

interface OrdersManagementViewProps {
  embeddedInAccount?: boolean;
}

const btn = {
  primary:
    'inline-flex items-center justify-center gap-1.5 rounded-full border border-[#FCD200] bg-[#FFD814] px-4 py-2 text-sm font-semibold text-[#0F1111] hover:bg-[#F7CA00] disabled:opacity-60',
  secondary:
    'inline-flex items-center justify-center gap-1.5 rounded-full border border-[#D5D9D9] bg-white px-4 py-2 text-sm font-semibold text-[#0F1111] hover:bg-[#F7F8F8] disabled:opacity-60',
  link: 'inline-flex items-center gap-1 text-sm font-medium text-[#007185] hover:underline',
};

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'processing', label: 'Being prepared' },
  { id: 'shipped', label: 'On the way' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'cancelled', label: 'Cancelled' },
];

/** Colour of the order status pill. */
function statusTone(order: Order): string {
  switch (order.rawStatus) {
    case 'DELIVERED':
      return 'bg-emerald-50 text-emerald-800';
    case 'SHIPPED':
    case 'OUT_FOR_DELIVERY':
      return 'bg-sky-50 text-sky-800';
    case 'CANCELLED':
      return 'bg-rose-50 text-rose-800';
    case 'RETURNED':
      return 'bg-[#F0F2F2] text-[#0F1111]';
    default:
      return 'bg-amber-50 text-amber-800';
  }
}

const RETURN_LABEL: Record<string, string> = {
  REQUESTED: 'requested',
  APPROVED: 'approved',
  PICKED_UP: 'picked up',
  RECEIVED_AT_WH: 'being checked',
  QC_PASSED: 'check passed',
  QC_FAILED: "didn't pass the check",
  QC_DISPUTED: 'under review',
  REFUND_OFFERED: 'refund offered',
  COMPLETED: 'completed',
  REJECTED: 'declined',
  CANCELLED: 'cancelled',
};

const payLabel = (method?: string) => {
  const m = (method || '').toUpperCase();
  if (m === 'COD') return 'Cash on delivery';
  if (m === 'UPI') return 'UPI';
  if (m === 'CARD' || m === 'CREDIT_CARD' || m === 'DEBIT_CARD') return 'Card';
  if (m === 'NETBANKING' || m === 'NET_BANKING') return 'Net banking';
  return 'Paid online';
};

export function OrdersManagementView({ embeddedInAccount = false }: OrdersManagementViewProps) {
  const { addItem } = useCartStore();
  const { orders: storeOrders, isLoading, fetchOrders, totalCount, totalPages } = useOrderStore();
  const [mounted, setMounted] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setMounted(true);
    fetchOrders({ page: currentPage, status: selectedStatus, search: searchQuery });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, selectedStatus]);

  const sourceOrders = mounted ? storeOrders : [];

  const [activeOrderModal, setActiveOrderModal] = useState<Order | null>(null);
  const [modalType, setModalType] = useState<'cancellation' | 'review' | 'price_details' | null>(null);
  const [returnItemModal, setReturnItemModal] = useState<{ order: Order; item: OrderItem } | null>(null);
  const [disputeModal, setDisputeModal] = useState<{
    order: Order;
    item: OrderItem;
    returnRequest: NonNullable<OrderItem['returnRequest']>;
  } | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [selectedReviewItem, setSelectedReviewItem] = useState<OrderItem | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const [toast, setToast] = useState<{ show: boolean; message: string; type?: 'success' | 'info' | 'error' }>({ show: false, message: '' });
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
  };

  const refresh = () => fetchOrders({ page: currentPage, status: selectedStatus, search: searchQuery });

  const handleCopyOrderId = (orderNumber: string) => {
    navigator.clipboard?.writeText(orderNumber).catch(() => {});
    showToast(`Order number ${orderNumber} copied`, 'info');
  };

  const handleReorder = (item: OrderItem) => {
    addItem({
      id: `reorder-${item.id}-${Date.now()}`,
      productId: item.productId,
      title: item.title,
      brand: item.brand,
      variantId: (item as any).variantId || `var-${item.id}`,
      size: item.size,
      color: item.color,
      price: item.price,
      originalPrice: item.originalPrice,
      quantity: 1,
      image: item.image,
      vendorName: item.sellerName,
    });
    showToast(`Added ${item.title} to your cart`, 'success');
  };

  const openReview = (order: Order, item: OrderItem) => {
    setActiveOrderModal(order);
    setSelectedReviewItem(item);
    setReviewRating(5);
    setReviewTitle('');
    setReviewComment('');
    setReviewError(null);
    setModalType('review');
  };

  const handleAcceptRefund = async (returnId: string) => {
    setAcceptingId(returnId);
    try {
      const res = await fetch(`/api/returns/${returnId}/accept-refund`, { method: 'POST' });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error?.message || 'Could not accept the refund offer.');
      showToast('Refund accepted. Track it under Returns.', 'success');
      refresh();
    } catch (err: any) {
      showToast(err.message || 'Could not accept the refund offer.', 'error');
    } finally {
      setAcceptingId(null);
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedReviewItem) {
      setReviewError('Choose the item to review.');
      return;
    }
    const trimmedComment = reviewComment.trim();
    if (trimmedComment.length < 10) {
      setReviewError('Write at least 10 characters.');
      return;
    }
    if (trimmedComment.length > 1000) {
      setReviewError('Keep the review under 1000 characters.');
      return;
    }
    try {
      setIsSubmittingReview(true);
      setReviewError(null);
      const res = await fetch(`/api/products/${selectedReviewItem.productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderItemId: selectedReviewItem.id,
          rating: reviewRating,
          title: reviewTitle.trim() || undefined,
          comment: trimmedComment,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setReviewError(data?.error?.message || 'Could not send your review. Please try again.');
        return;
      }
      setModalType(null);
      showToast('Thanks! Your review will appear once it has been checked.', 'success');
      refresh();
    } catch (err: any) {
      setReviewError(err?.message || 'Could not send your review. Please try again.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const filteredOrders = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return sourceOrders.filter((order) => {
      if (selectedStatus !== 'all' && order.status !== selectedStatus) return false;
      if (!q) return true;
      return (
        order.orderNumber.toLowerCase().includes(q) ||
        order.items.some((item) => [item.title, item.brand, item.sellerName].some((v) => (v || '').toLowerCase().includes(q)))
      );
    });
  }, [sourceOrders, selectedStatus, searchQuery]);

  const count = totalCount || sourceOrders.length;

  return (
    <div className="flex w-full flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-[#0F1111]">Your orders</h1>
        <p className="text-sm text-[#565959]">
          {count === 0 ? 'Orders you place appear here.' : `${count} ${count === 1 ? 'order' : 'orders'}. Track, return or review them here.`}
        </p>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Filter orders">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selectedStatus === tab.id}
              onClick={() => {
                setSelectedStatus(tab.id);
                setCurrentPage(1);
              }}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium ${
                selectedStatus === tab.id ? 'bg-[#0F1111] text-white' : 'border border-[#D5D9D9] bg-white text-[#0F1111] hover:bg-[#F7F8F8]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <form
          className="relative w-full md:w-80"
          onSubmit={(e) => {
            e.preventDefault();
            setCurrentPage(1);
            fetchOrders({ page: 1, status: selectedStatus, search: searchQuery });
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#565959]" aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product or order number"
            aria-label="Search orders"
            className="w-full rounded-full border border-[#D5D9D9] bg-white py-2 pl-9 pr-3 text-sm focus:border-[#007185] focus:outline-none focus:ring-1 focus:ring-[#007185]"
          />
        </form>
      </div>

      {/* Orders */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[#D5D9D9] bg-white py-16" aria-live="polite">
          <CometSpinner className="h-12 w-12" decorative />
          <p className="text-sm text-[#565959]">Loading your orders…</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="space-y-3 rounded-xl border border-dashed border-[#D5D9D9] bg-white p-10 text-center">
          <Package className="mx-auto h-8 w-8 text-[#8A8F8F]" aria-hidden="true" />
          <h2 className="text-base font-semibold text-[#0F1111]">
            {searchQuery || selectedStatus !== 'all' ? 'No orders match' : "You haven't ordered anything yet"}
          </h2>
          <p className="mx-auto max-w-sm text-sm text-[#565959]">
            {searchQuery || selectedStatus !== 'all'
              ? 'Try another filter or search.'
              : 'Fashion, mobiles, electronics, appliances and books from sellers across India.'}
          </p>
          {searchQuery || selectedStatus !== 'all' ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedStatus('all');
                setCurrentPage(1);
                fetchOrders({ page: 1, status: 'all', search: '' });
              }}
              className={btn.secondary}
            >
              Show all orders
            </button>
          ) : (
            <Link href="/products" className={btn.primary}>
              Start shopping
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-4" role="list">
          {filteredOrders.map((order) => (
            <li key={order.id}>
              <OrderCard
                order={order}
                onCopy={handleCopyOrderId}
                onPriceDetails={() => {
                  setActiveOrderModal(order);
                  setModalType('price_details');
                }}
                onCancellation={() => {
                  setActiveOrderModal(order);
                  setModalType('cancellation');
                }}
                onReturn={(item) => setReturnItemModal({ order, item })}
                onDispute={(item) => item.returnRequest && setDisputeModal({ order, item, returnRequest: item.returnRequest })}
                onAcceptRefund={handleAcceptRefund}
                acceptingId={acceptingId}
                onReview={(item) => openReview(order, item)}
                onBuyAgain={handleReorder}
              />
            </li>
          ))}
        </ul>
      )}

      {/* Pagination */}
      {(totalPages || 1) > 1 && (
        <nav className="flex items-center justify-between gap-3 border-t border-[#EAEDED] pt-4" aria-label="Order pages">
          <p className="text-sm text-[#565959]">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} className={btn.secondary}>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Previous
            </button>
            <button
              type="button"
              disabled={currentPage >= (totalPages || 1)}
              onClick={() => setCurrentPage((p) => Math.min(totalPages || 1, p + 1))}
              className={btn.secondary}
            >
              Next
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </nav>
      )}

      {/* Help */}
      <section className="flex flex-col items-start justify-between gap-3 rounded-xl border border-[#D5D9D9] bg-white p-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-base font-semibold text-[#0F1111]">Need help with an order?</h2>
          <p className="text-sm text-[#565959]">Send us a request. We reply in your account and by email.</p>
        </div>
        <Link href="/support#support-contact-form" className={btn.secondary}>
          <HelpCircle className="h-4 w-4" aria-hidden="true" />
          Contact customer service
        </Link>
      </section>

      {/* Price details */}
      {modalType === 'price_details' && activeOrderModal && (
        <PriceDetailsDialog order={activeOrderModal} onClose={() => setModalType(null)} />
      )}

      {/* Cancellation details */}
      {modalType === 'cancellation' && activeOrderModal && (
        <CancellationDialog order={activeOrderModal} onClose={() => setModalType(null)} />
      )}

      {/* Review */}
      {modalType === 'review' && activeOrderModal && selectedReviewItem && (
        <Dialog title="Write a review" onClose={() => setModalType(null)}>
          <div className="flex items-center gap-3">
            <ItemThumb src={selectedReviewItem.image} className="h-14 w-14" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#0F1111]">{selectedReviewItem.title}</p>
              {selectedReviewItem.brand && <p className="text-xs text-[#565959]">{selectedReviewItem.brand}</p>}
            </div>
          </div>

          {reviewError && (
            <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {reviewError}
            </p>
          )}

          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-[#0F1111]">Your rating</legend>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewRating(star)}
                  aria-label={`${star} star${star === 1 ? '' : 's'}`}
                  aria-pressed={reviewRating === star}
                  className="rounded p-1"
                >
                  <Star className={`h-7 w-7 ${star <= reviewRating ? 'fill-[#FFA41C] text-[#FFA41C]' : 'text-[#D5D9D9]'}`} />
                </button>
              ))}
              <span className="ml-1 text-sm text-[#565959]">{reviewRating} of 5</span>
            </div>
          </fieldset>

          <div>
            <label htmlFor="review-title" className="mb-1 block text-sm font-semibold text-[#0F1111]">
              Headline <span className="font-normal text-[#565959]">(optional)</span>
            </label>
            <input
              id="review-title"
              type="text"
              maxLength={100}
              value={reviewTitle}
              onChange={(e) => setReviewTitle(e.target.value)}
              placeholder="Sum it up in a few words"
              className="w-full rounded-lg border border-[#D5D9D9] px-3 py-2 text-sm focus:border-[#007185] focus:outline-none focus:ring-1 focus:ring-[#007185]"
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="review-text" className="text-sm font-semibold text-[#0F1111]">
                Your review
              </label>
              <span className="text-xs text-[#565959]">{reviewComment.trim().length} / 1000</span>
            </div>
            <textarea
              id="review-text"
              rows={4}
              maxLength={1000}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="What did you like or not like? How is the quality, fit or performance?"
              className="w-full rounded-lg border border-[#D5D9D9] px-3 py-2 text-sm focus:border-[#007185] focus:outline-none focus:ring-1 focus:ring-[#007185]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalType(null)} className={btn.secondary}>
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmittingReview || reviewComment.trim().length < 10}
              onClick={handleSubmitReview}
              className={btn.primary}
            >
              {isSubmittingReview && <CometSpinner className="h-4 w-4 text-current" decorative />}
              Submit review
            </button>
          </div>
        </Dialog>
      )}

      {returnItemModal && (
        <ReturnRequestModal
          order={returnItemModal.order}
          item={returnItemModal.item}
          isOpen
          onClose={() => setReturnItemModal(null)}
          onSuccess={(_, type) => {
            showToast(`${type === 'REPLACEMENT' ? 'Replacement' : 'Return'} requested. Track it under Returns.`, 'success');
            refresh();
          }}
        />
      )}

      {disputeModal && (
        <CustomerDisputeModal
          isOpen
          order={disputeModal.order}
          item={disputeModal.item}
          returnRequest={disputeModal.returnRequest}
          onClose={() => setDisputeModal(null)}
          onSuccess={() => {
            setDisputeModal(null);
            showToast('Dispute sent. Vyntra will review it.', 'success');
            refresh();
          }}
        />
      )}

      {toast.show && (
        <div
          role="status"
          className={`fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full px-4 py-2.5 text-sm font-medium text-white shadow-lg ${
            toast.type === 'error' ? 'bg-rose-700' : 'bg-[#0F1111]'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ItemThumb({ src, className = 'h-20 w-20', dim = false }: { src?: string; className?: string; dim?: boolean }) {
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-lg border border-[#EAEDED] bg-[#F7F8F8] ${className}`}>
      {src ? (
        <Image src={src} alt="" fill className={`object-contain p-1 ${dim ? 'opacity-60 grayscale' : ''}`} />
      ) : (
        <Package className="absolute inset-0 m-auto h-6 w-6 text-[#8A8F8F]" aria-hidden="true" />
      )}
    </div>
  );
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-t-xl border border-[#D5D9D9] bg-white p-5 shadow-xl sm:rounded-xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#0F1111]">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-[#565959] hover:bg-[#F7F8F8]" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function OrderCard({
  order,
  onCopy,
  onPriceDetails,
  onCancellation,
  onReturn,
  onDispute,
  onAcceptRefund,
  acceptingId,
  onReview,
  onBuyAgain,
}: {
  order: Order;
  onCopy: (orderNumber: string) => void;
  onPriceDetails: () => void;
  onCancellation: () => void;
  onReturn: (item: OrderItem) => void;
  onDispute: (item: OrderItem) => void;
  onAcceptRefund: (returnId: string) => void;
  acceptingId: string | null;
  onReview: (item: OrderItem) => void;
  onBuyAgain: (item: OrderItem) => void;
}) {
  const refundSummary = formatCustomerRefundSummary(order as any);
  const address = (order as any).shippingAddress;
  const cancelled = order.status === 'cancelled';
  const shipments = order.vendorShipments || [];
  const trackHref = `/account?tab=tracking&orderId=${encodeURIComponent(order.orderNumber || order.id)}`;
  const shippedOrDelivered = order.status === 'shipped' || order.status === 'delivered';
  const isCancellable = Boolean((order as any).isCancellable);

  return (
    <article className="overflow-hidden rounded-xl border border-[#D5D9D9] bg-white">
      {/* Order summary */}
      <div className="flex flex-col gap-3 border-b border-[#EAEDED] bg-[#F7F8F8] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:flex sm:flex-wrap">
          <div>
            <dt className="text-xs text-[#565959]">Placed</dt>
            <dd className="font-medium text-[#0F1111]">{order.datePlaced}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#565959]">Total</dt>
            <dd className="font-medium tabular-nums text-[#0F1111]">{formatINR(order.totalAmount)}</dd>
          </div>
          {address?.fullName && (
            <div>
              <dt className="text-xs text-[#565959]">Ship to</dt>
              <dd className="font-medium text-[#0F1111]">{address.fullName}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-[#565959]">Order</dt>
            <dd className="flex items-center gap-1 font-medium tabular-nums text-[#0F1111]">
              #{order.orderNumber}
              <button type="button" onClick={() => onCopy(order.orderNumber)} className="rounded p-0.5 text-[#565959] hover:text-[#007185]" aria-label="Copy order number">
                <Copy className="h-3.5 w-3.5" />
              </button>
            </dd>
          </div>
        </dl>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {!cancelled && (
            <button type="button" onClick={onPriceDetails} className={btn.link}>
              <Receipt className="h-4 w-4" aria-hidden="true" />
              Price details
            </button>
          )}
          {shippedOrDelivered && (
            <a
              href={`/orders/${encodeURIComponent((order.orderNumber || order.id).replace(/^#/, ''))}/invoice`}
              target="_blank"
              rel="noopener noreferrer"
              className={btn.link}
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              Invoice
            </a>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="flex flex-col gap-3 px-4 pt-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div>
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusTone(order)}`}>{order.statusLabel}</span>
          <p className="mt-1.5 text-sm text-[#0F1111]">
            {order.status === 'processing' && `The seller is preparing your order.${isCancellable ? ' You can still cancel it.' : ''}`}
            {order.rawStatus === 'SHIPPED' && 'Your order is on its way.'}
            {order.rawStatus === 'OUT_FOR_DELIVERY' && 'Your order is out for delivery.'}
            {order.status === 'delivered' && 'Delivered. You can return or replace eligible items within the return window.'}
            {order.rawStatus === 'CANCELLED' &&
              (refundSummary.hasRefund
                ? `Cancelled. ${refundSummary.badgeLabel}.`
                : (order.paymentMethod || '').toUpperCase() === 'COD'
                ? 'Cancelled. It was cash on delivery, so nothing was charged.'
                : 'Cancelled.')}
            {order.rawStatus === 'RETURNED' && 'Returned and refunded.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {(order.status === 'processing' || order.status === 'shipped') && (
            <Link href={trackHref} className={btn.primary}>
              <Truck className="h-4 w-4" aria-hidden="true" />
              Track order
            </Link>
          )}
          {order.status === 'processing' && isCancellable && (
            <Link href={`/orders/${order.id}/cancel`} className={btn.secondary}>
              Cancel order
            </Link>
          )}
          {cancelled && (
            <button type="button" onClick={onCancellation} className={btn.secondary}>
              Cancellation details
            </button>
          )}
          {order.status === 'delivered' && (
            <Link href={trackHref} className={btn.secondary}>
              Delivery details
            </Link>
          )}
        </div>
      </div>

      {/* Packages from several sellers */}
      {shipments.length > 1 && (
        <ul className="mx-4 mt-3 space-y-1.5 rounded-lg border border-[#EAEDED] p-3 text-sm sm:mx-5" role="list">
          {shipments.map((shp, i) => {
            const url = getCourierTrackingUrl(shp.courierPartner, shp.trackingNumber);
            return (
              <li key={shp.id || i} className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[#0F1111]">
                  Package {i + 1} from {shp.vendor?.storeName || 'seller'}
                  <span className="text-[#565959]"> · {(shp.status || '').replace(/_/g, ' ').toLowerCase()}</span>
                </span>
                {shp.trackingNumber && (
                  <span className="text-[#565959]">
                    {shp.courierPartner} <span className="tabular-nums">{shp.trackingNumber}</span>
                    {url && (
                      <a href={url} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-0.5 text-[#007185] hover:underline">
                        Track <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    )}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Items, each with its own actions */}
      <ul className="divide-y divide-[#EAEDED]" role="list">
        {order.items.map((item) => (
          <li key={item.id} className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-3 px-4 py-4 sm:grid-cols-[auto,1fr,11rem] sm:px-5">
            <ItemThumb src={item.image} dim={cancelled} />
            <div className="min-w-0 flex-1 space-y-1">
              {item.slug ? (
                <Link href={`/products/${item.slug}`} className="text-sm font-semibold leading-snug text-[#0F1111] hover:text-[#007185] hover:underline">
                  {item.title}
                </Link>
              ) : (
                <p className="text-sm font-semibold leading-snug text-[#0F1111]">{item.title}</p>
              )}
              <p className="text-sm text-[#565959]">
                {[
                  item.size && !['N/A', 'Standard'].includes(item.size) && `Size ${item.size}`,
                  item.color && item.color !== 'N/A' && item.color,
                  `Qty ${item.quantity}`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              <p className="text-sm">
                <span className={`font-semibold tabular-nums ${cancelled ? 'text-[#565959] line-through' : 'text-[#0F1111]'}`}>{formatINR(item.price)}</span>
                {item.originalPrice > item.price && <span className="ml-2 text-xs text-[#565959] line-through">{formatINR(item.originalPrice)}</span>}
                <span className="ml-2 text-xs text-[#565959]">Sold by {item.sellerName}</span>
              </p>
              <ItemReturnState item={item} order={order} onDispute={onDispute} onAcceptRefund={onAcceptRefund} acceptingId={acceptingId} />
            </div>
            <ItemActions order={order} item={item} onReturn={onReturn} onReview={onReview} onBuyAgain={onBuyAgain} />
          </li>
        ))}
      </ul>
    </article>
  );
}

/** Where an item's return stands, with the step the customer can take (accept a refund, dispute). */
function ItemReturnState({
  item,
  order,
  onDispute,
  onAcceptRefund,
  acceptingId,
}: {
  item: OrderItem;
  order: Order;
  onDispute: (item: OrderItem) => void;
  onAcceptRefund: (returnId: string) => void;
  acceptingId: string | null;
}) {
  const ret = item.returnRequest;
  if (!ret) {
    if (order.status === 'delivered' && item.returnWindowOpen && item.returnDeadline) {
      return (
        <p className="text-xs text-[#565959]">
          Return or replace by {new Date(item.returnDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </p>
      );
    }
    return null;
  }

  const what = ret.type === 'REPLACEMENT' ? 'Replacement' : 'Return';
  const failed = ret.status === 'REJECTED' || ret.status === 'QC_FAILED';
  let canDispute = false;
  if (failed && !ret.isDisputed) {
    const trigger = ret.rejectedAt || ret.qcCompletedAt || ret.createdAt;
    try {
      canDispute = isWithinDeadline(new Date(), computeIstDisputeDeadline(trigger, 5));
    } catch {
      canDispute = false;
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      <Link
        href="/account?tab=returns"
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
          failed ? 'bg-rose-50 text-rose-800' : ret.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
        } hover:underline`}
      >
        <RotateCcw className="h-3 w-3" aria-hidden="true" />
        {ret.status === 'REFUND_OFFERED' ? 'Replacement unavailable, refund offered' : `${what} ${RETURN_LABEL[ret.status] || ret.status.toLowerCase()}`}
      </Link>
      {ret.status === 'REFUND_OFFERED' && (
        <button type="button" onClick={() => onAcceptRefund(ret.id)} disabled={acceptingId === ret.id} className={`${btn.primary} px-3 py-1 text-xs`}>
          {acceptingId === ret.id && <CometSpinner className="h-4 w-4 text-current" decorative />}
          Accept refund
        </button>
      )}
      {canDispute && (
        <button type="button" onClick={() => onDispute(item)} className={`${btn.secondary} px-3 py-1 text-xs`}>
          <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
          Dispute this
        </button>
      )}
      {failed && !canDispute && !ret.isDisputed && <span className="text-xs text-[#565959]">The 5-day dispute window has closed.</span>}
    </div>
  );
}

function ItemActions({
  order,
  item,
  onReturn,
  onReview,
  onBuyAgain,
}: {
  order: Order;
  item: OrderItem;
  onReturn: (item: OrderItem) => void;
  onReview: (item: OrderItem) => void;
  onBuyAgain: (item: OrderItem) => void;
}) {
  const delivered = order.status === 'delivered' && (!item.status || item.status === 'DELIVERED');
  const canReturn = delivered && !item.returnRequest && item.returnWindowOpen;
  const reviewed = item.hasReviewed || Boolean(item.review);
  return (
    <div className="col-span-2 flex flex-row flex-wrap gap-2 sm:col-span-1 sm:flex-col">
      {item.slug && (order.status === 'delivered' || order.status === 'cancelled') && (
        <button type="button" onClick={() => onBuyAgain(item)} className={btn.secondary}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Buy again
        </button>
      )}
      {canReturn && (
        <button type="button" onClick={() => onReturn(item)} className={btn.secondary}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Return or replace
        </button>
      )}
      {delivered &&
        (reviewed ? (
          <span className="inline-flex items-center justify-center gap-1 px-2 py-2 text-sm text-[#067D62]">
            <Check className="h-4 w-4" aria-hidden="true" />
            Reviewed
          </span>
        ) : (
          <button type="button" onClick={() => onReview(item)} className={btn.secondary}>
            <Star className="h-4 w-4" aria-hidden="true" />
            Write a review
          </button>
        ))}
    </div>
  );
}

/** What the order cost, from the order's own amounts. */
function PriceDetailsDialog({ order, onClose }: { order: Order; onClose: () => void }) {
  const items = order.items.reduce((s, it) => s + it.price * (it.quantity || 1), 0);
  const subtotal = Number(order.subtotal ?? items);
  const mrp = order.items.reduce((s, it) => s + Math.max(it.originalPrice || 0, it.price) * (it.quantity || 1), 0);
  const discount = Number(order.discount || 0);
  const shipping = Number(order.shippingFee || 0);
  const tax = Number(order.tax || 0);
  const total = Number(order.totalAmount || 0);
  const isCod = (order.paymentMethod || '').toUpperCase() === 'COD';
  // Fees are not stored separately: whatever the total holds beyond items, coupon, delivery and tax.
  const fees = Math.max(0, Math.round((total - (subtotal - discount + shipping + tax)) * 100) / 100);
  const packaging = Math.min(49, fees);
  const codFee = isCod ? Math.min(49, Math.max(0, fees - packaging)) : 0;
  const other = Math.max(0, Math.round((fees - packaging - codFee) * 100) / 100);

  const row = (label: string, value: string, tone = 'text-[#0F1111]') => (
    <div className="flex items-center justify-between">
      <dt className="text-[#565959]">{label}</dt>
      <dd className={`tabular-nums ${tone}`}>{value}</dd>
    </div>
  );

  return (
    <Dialog title="Price details" onClose={onClose}>
      <dl className="space-y-2 text-sm">
        {mrp > subtotal + 0.5 && row('MRP of items', formatINR(mrp))}
        {mrp > subtotal + 0.5 && row('Discount on MRP', `−${formatINR(mrp - subtotal)}`, 'text-[#067D62]')}
        {row(`Items (${order.totalItems})`, formatINR(subtotal))}
        {discount > 0 && row('Coupon', `−${formatINR(discount)}`, 'text-[#067D62]')}
        {row('Delivery', shipping > 0 ? formatINR(shipping) : 'Free')}
        {packaging > 0 && row('Packaging fee', formatINR(packaging))}
        {codFee > 0 && row('Cash on delivery fee', formatINR(codFee))}
        {other > 0 && row('Other charges', formatINR(other))}
        {tax > 0 && row('Tax', formatINR(tax))}
        <div className="flex items-center justify-between border-t border-[#EAEDED] pt-2 text-base font-semibold">
          <dt className="text-[#0F1111]">Order total</dt>
          <dd className="tabular-nums text-[#0F1111]">{formatINR(total)}</dd>
        </div>
        {row('Payment', payLabel(order.paymentMethod))}
        {Number(order.refundedAmount || 0) > 0 && row('Refunded', formatINR(Number(order.refundedAmount)), 'text-[#067D62]')}
      </dl>
      <p className="text-xs text-[#565959]">Prices include taxes.</p>
    </Dialog>
  );
}

/** Who cancelled (when known) and where any refund stands. */
function CancellationDialog({ order, onClose }: { order: Order; onClose: () => void }) {
  const summary = formatCustomerRefundSummary(order as any);
  const cxl = order.cancellationRefund || null;
  const isCod = (order.paymentMethod || '').toUpperCase() === 'COD';
  const by = cxl?.initiatedBy || order.cancelledBy;
  const cancelledBy = by === 'CUSTOMER' ? 'You' : by === 'VENDOR' ? 'The seller' : by ? 'Vyntra' : null;
  const failed = cxl?.status === 'FAILED' || cxl?.status === 'RECONCILIATION_REQUIRED';
  const date = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
  const state = !cxl
    ? null
    : cxl.status === 'CONFIRMED'
    ? `Refunded${cxl.processedAt ? ` on ${date(cxl.processedAt)}` : ''}.`
    : failed
    ? "Your refund is delayed. We're retrying it; you don't need to do anything."
    : `Refund started on ${date(cxl.createdAt)}. Banks usually show it within 5–7 working days.`;

  const row = (label: string, value: React.ReactNode) => (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-[#565959]">{label}</dt>
      <dd className="text-right text-[#0F1111]">{value}</dd>
    </div>
  );

  return (
    <Dialog title={`Order #${order.orderNumber} cancelled`} onClose={onClose}>
      <dl className="space-y-2 text-sm">
        {cancelledBy && row('Cancelled by', cancelledBy)}
        {row('Order total', <span className="tabular-nums">{formatINR(order.totalAmount)}</span>)}
        {isCod && !summary.hasRefund ? (
          row('Refund', 'None needed: it was cash on delivery, so nothing was charged.')
        ) : (
          <>
            {row('Refunded', <span className="tabular-nums font-semibold">{summary.refundedAmountFormatted}</span>)}
            {row('Refunded to', cxl ? 'Your original payment method' : summary.refundDestinationLabel)}
            {(cxl?.reference || summary.verifiedReferenceNumber) &&
              row('Reference', <span className="break-all tabular-nums">{cxl?.reference || summary.verifiedReferenceNumber}</span>)}
          </>
        )}
      </dl>
      {state && <p className={`text-sm ${failed ? 'text-amber-800' : 'text-[#0F1111]'}`}>{state}</p>}
      <div className="flex justify-end">
        <button type="button" onClick={onClose} className={btn.secondary}>
          Close
        </button>
      </div>
    </Dialog>
  );
}
