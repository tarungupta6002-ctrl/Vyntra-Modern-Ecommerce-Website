'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Star,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  ShieldCheck,
  User,
  Package,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  X,
  FileText,
} from 'lucide-react';
import { ReviewStatus } from '@prisma/client';
import { PageHeader, StatRow, consoleButton } from '@/components/console/console-ui';

interface AdminReview {
  id: string;
  productId: string;
  rating: number;
  title: string | null;
  comment: string;
  status: ReviewStatus;
  moderationNote: string | null;
  isVerified: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
  product: {
    id: string;
    title: string;
    slug: string;
    brand: string;
    images: { url: string; altText: string | null }[];
  };
  orderItem: {
    id: string;
    orderId: string;
    unitPrice: any;
    selectedSize: string | null;
    selectedColor: string | null;
    deliveredAt: string | null;
  } | null;
}

interface Counts {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  flagged: number;
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [counts, setCounts] = useState<Counts>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    flagged: 0,
  });
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Moderation Modal state
  const [activeModalReview, setActiveModalReview] = useState<AdminReview | null>(null);
  const [modalTargetStatus, setModalTargetStatus] = useState<ReviewStatus>('APPROVED');
  const [modalNote, setModalNote] = useState('');

  // Toast
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    show: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3500);
  };

  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`/api/admin/reviews?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data?.error?.message || 'Failed to load reviews.');
      }

      setReviews(data.data || []);
      if (data.meta?.counts) {
        setCounts(data.meta.counts);
      }
    } catch (err: any) {
      showToast(err.message || 'Error fetching reviews', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReviews();
  };

  const executeStatusUpdate = async (reviewId: string, status: ReviewStatus, note?: string) => {
    try {
      setUpdatingId(reviewId);
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          moderationNote: note,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error?.message || 'Failed to update review status.');
      }

      showToast(`Review marked as ${status}. Product aggregates recalculated.`, 'success');
      setActiveModalReview(null);
      fetchReviews();
    } catch (err: any) {
      showToast(err.message || 'Failed to update review.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const openActionModal = (review: AdminReview, status: ReviewStatus) => {
    setActiveModalReview(review);
    setModalTargetStatus(status);
    setModalNote(review.moderationNote || '');
  };

  const renderStatusBadge = (status: ReviewStatus) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="h-3 w-3" /> Approved
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="h-3 w-3" /> Pending Review
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="h-3 w-3" /> Rejected
          </span>
        );
      case 'FLAGGED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <AlertTriangle className="h-3 w-3" /> Flagged
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast.show && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold animate-in fade-in slide-in-from-bottom-5 ${
            toast.type === 'success'
              ? 'bg-emerald-950 text-emerald-100 border-emerald-800'
              : toast.type === 'error'
              ? 'bg-rose-950 text-rose-100 border-rose-800'
              : 'bg-[#232F3E] text-white border-white/20'
          }`}
        >
          <span>{toast.message}</span>
        </div>
      )}

      <PageHeader
        title="Reviews"
        description="Approve, reject or flag customer reviews before they appear on product pages."
      />

      <StatRow
        items={[
          { label: 'Reviews', value: counts.total },
          { label: 'To moderate', value: counts.pending, tone: counts.pending > 0 ? 'warn' : 'neutral' },
          { label: 'Published', value: counts.approved, tone: 'good' },
          { label: 'Rejected', value: counts.rejected },
          { label: 'Flagged', value: counts.flagged, tone: counts.flagged > 0 ? 'warn' : 'neutral' },
        ]}
      />

      {/* Controls: Search & Status Filters */}
      <div className="bg-white p-4 rounded-xl border border-[#D5D9D9] shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Status Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {[
              { label: 'All Reviews', value: 'ALL', count: counts.total },
              { label: 'Pending', value: 'PENDING', count: counts.pending },
              { label: 'Approved', value: 'APPROVED', count: counts.approved },
              { label: 'Rejected', value: 'REJECTED', count: counts.rejected },
              { label: 'Flagged', value: 'FLAGGED', count: counts.flagged },
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setSelectedStatus(tab.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  selectedStatus === tab.value
                    ? 'bg-[#0F1111] text-white shadow-sm'
                    : 'bg-[#F7F8F8] text-[#565959] hover:bg-[#EAEDED] hover:text-[#0F1111]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedStatus === tab.value ? 'bg-white/20 text-white' : 'bg-[#D5D9D9] text-[#0F1111]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-80">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-[#565959]" />
              <input
                type="text"
                placeholder="Search product, customer or text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#F7F8F8] border border-[#D5D9D9] rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#007185]"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] text-xs font-bold rounded-lg border border-[#FCD200] transition-colors"
            >
              Filter
            </button>
          </form>
        </div>
      </div>

      {/* Reviews Table / List */}
      <div className="bg-white rounded-xl border border-[#D5D9D9] shadow-sm overflow-hidden">
        {isLoading && (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-[#007185] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#565959]">Loading reviews catalog...</p>
          </div>
        )}

        {!isLoading && reviews.length === 0 && (
          <div className="p-12 text-center space-y-3">
            <MessageSquare className="h-10 w-10 text-[#565959]/40 mx-auto" />
            <h3 className="font-bold text-sm text-[#0F1111]">No Reviews Found</h3>
            <p className="text-xs text-[#565959]">
              {selectedStatus === 'ALL'
                ? 'No reviews have been submitted yet.'
                : `No reviews currently in ${selectedStatus} status.`}
            </p>
          </div>
        )}

        {!isLoading && reviews.length > 0 && (
          <div className="divide-y divide-[#D5D9D9]">
            {reviews.map((rev) => (
              <div key={rev.id} className="p-5 hover:bg-[#F7FAFA] transition-colors space-y-4">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  {/* Left: Product & Customer Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-14 h-16 rounded-lg overflow-hidden relative shrink-0 bg-[#EAEDED] border border-[#D5D9D9]">
                      {rev.product?.images?.[0]?.url ? (
                        <Image
                          src={rev.product.images[0].url}
                          alt={rev.product.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#565959]">
                          <Package className="h-6 w-6" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/products/${rev.product?.slug || ''}`}
                          target="_blank"
                          className="font-headline font-bold text-sm text-[#007185] hover:underline flex items-center gap-1"
                        >
                          <span>{rev.product?.title}</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                        <span className="text-xs text-[#565959]">&bull; {rev.product?.brand}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#565959]">
                        <span className="font-semibold text-[#0F1111] flex items-center gap-1">
                          <User className="h-3 w-3" /> {rev.user?.name}
                        </span>
                        <span>({rev.user?.email})</span>
                        <span>&bull;</span>
                        <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-0.5">
                          <ShieldCheck className="h-3.5 w-3.5" /> Verified Buyer
                        </span>
                        {rev.orderItem && (
                          <>
                            <span>&bull;</span>
                            <span className="text-[11px] tabular-nums text-[#565959]">
                              Order #{rev.orderItem.orderId.slice(-8).toUpperCase()}
                            </span>
                          </>
                        )}
                        <span>&bull;</span>
                        <span className="text-[11px]">
                          {new Date(rev.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Status & Quick Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <div>{renderStatusBadge(rev.status)}</div>

                    {rev.status !== 'APPROVED' && (
                      <button
                        type="button"
                        disabled={updatingId === rev.id}
                        onClick={() => openActionModal(rev, 'APPROVED')}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>Approve</span>
                      </button>
                    )}

                    {rev.status !== 'REJECTED' && (
                      <button
                        type="button"
                        disabled={updatingId === rev.id}
                        onClick={() => openActionModal(rev, 'REJECTED')}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold border border-rose-300 bg-white text-rose-700 hover:bg-rose-50 transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Reject</span>
                      </button>
                    )}

                    {rev.status !== 'FLAGGED' && (
                      <button
                        type="button"
                        disabled={updatingId === rev.id}
                        onClick={() => openActionModal(rev, 'FLAGGED')}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold border border-[#D5D9D9] bg-white text-[#0F1111] hover:bg-[#F7F8F8] transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>Flag</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Review Text Box */}
                <div className="bg-[#F7F8F8] p-3.5 rounded-lg border border-[#D5D9D9] space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`h-3.5 w-3.5 ${
                            s <= rev.rating ? 'fill-[#FF9900] text-[#FF9900]' : 'text-[#D5D9D9]'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-[#0F1111]">{rev.rating}.0 / 5.0</span>
                    {rev.title && (
                      <span className="text-xs font-bold text-[#0F1111]">&bull; {rev.title}</span>
                    )}
                  </div>
                  <p className="text-xs text-[#0F1111] leading-relaxed">{rev.comment}</p>
                </div>

                {/* Existing Moderation Note */}
                {rev.moderationNote && (
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Admin Moderation Note: </span>
                      <span>{rev.moderationNote}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Moderation Decision Modal */}
      {activeModalReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-[#D5D9D9] space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#D5D9D9]">
              <div>
                <span className="text-[10px] font-bold text-[#565959]">
                  Review Action Confirmation
                </span>
                <h3 className="font-headline font-bold text-base text-[#0F1111]">
                  Mark as {modalTargetStatus}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalReview(null)}
                className="p-1 rounded-lg hover:bg-[#F7F8F8] text-[#565959]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-[#F7F8F8] rounded-xl border border-[#D5D9D9] text-xs space-y-1">
                <p className="font-bold text-[#0F1111]">{activeModalReview.product.title}</p>
                <p className="text-[#565959]">
                  Reviewer: {activeModalReview.user.name} ({activeModalReview.rating}★)
                </p>
                <p className="text-[#0F1111] italic">&quot;{activeModalReview.comment}&quot;</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F1111] mb-1">
                  Moderation Note <span className="text-[#565959] font-normal">(Optional audit reason)</span>
                </label>
                <textarea
                  rows={3}
                  value={modalNote}
                  onChange={(e) => setModalNote(e.target.value)}
                  placeholder="e.g. Approved verified purchase / Rejected due to inappropriate language..."
                  className="w-full bg-[#F7F8F8] rounded-xl p-3 text-xs text-[#0F1111] border border-[#D5D9D9] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#007185]"
                />
              </div>

              <p className="text-[11px] text-[#565959] leading-relaxed">
                {modalTargetStatus === 'APPROVED'
                  ? 'Approving this review will immediately publish it on the public product page and include the rating in average calculations.'
                  : 'Rejecting or flagging this review will hide it from the public product page and exclude it from rating aggregates.'}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveModalReview(null)}
                className="w-1/2 py-2.5 rounded-xl bg-[#F7F8F8] border border-[#D5D9D9] text-[#0F1111] text-xs font-bold hover:bg-[#EAEDED] transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updatingId === activeModalReview.id}
                onClick={() =>
                  executeStatusUpdate(activeModalReview.id, modalTargetStatus, modalNote.trim() || undefined)
                }
                className={`w-1/2 py-2.5 rounded-xl text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 ${
                  modalTargetStatus === 'APPROVED'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : modalTargetStatus === 'REJECTED'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {updatingId === activeModalReview.id ? (
                  <span>Saving...</span>
                ) : (
                  <span>Confirm {modalTargetStatus}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
