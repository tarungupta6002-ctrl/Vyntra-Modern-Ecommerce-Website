'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Star,
  Edit2,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package,
  AlertCircle,
  X,
  ExternalLink,
} from 'lucide-react';
import { ReviewStatus } from '@prisma/client';

import { CometSpinner } from '@/components/ui/loading-spinner';
interface ReviewItem {
  id: string;
  productId: string;
  rating: number;
  title: string | null;
  comment: string;
  status: ReviewStatus;
  moderationNote: string | null;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  product: {
    id: string;
    title: string;
    slug: string;
    brand: string;
    images: { url: string; altText: string | null }[];
  };
}

export function CustomerReviewsView() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Modal State
  const [editingReview, setEditingReview] = useState<ReviewItem | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editTitle, setEditTitle] = useState('');
  const [editComment, setEditComment] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const fetchCustomerReviews = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch('/api/account/reviews');
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data?.error?.message || 'Failed to load reviews.');
      }

      setReviews(data.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load your reviews.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerReviews();
  }, []);

  const openEditModal = (review: ReviewItem) => {
    setEditingReview(review);
    setEditRating(review.rating);
    setEditTitle(review.title || '');
    setEditComment(review.comment);
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingReview) return;

    const trimmedComment = editComment.trim();
    if (!trimmedComment) {
      setEditError('Review comment is required.');
      return;
    }
    if (trimmedComment.length < 10) {
      setEditError('Review comment must be at least 10 characters long.');
      return;
    }

    try {
      setIsSubmittingEdit(true);
      setEditError(null);

      const res = await fetch(`/api/account/reviews/${editingReview.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: editRating,
          title: editTitle.trim() || undefined,
          comment: trimmedComment,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error?.message || 'Failed to update review.');
      }

      showToast('Review updated and re-submitted for moderation approval.', 'success');
      setEditingReview(null);
      fetchCustomerReviews();
    } catch (err: any) {
      setEditError(err.message || 'Failed to update review.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;

    try {
      setDeletingId(reviewId);
      const res = await fetch(`/api/account/reviews/${reviewId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error?.message || 'Failed to delete review.');
      }

      showToast('Review deleted successfully.', 'success');
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch (err: any) {
      showToast(err.message || 'Failed to delete review.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const renderStatusBadge = (status: ReviewStatus) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="h-3 w-3" /> Published
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="h-3 w-3" /> Awaiting Moderation
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
            <AlertTriangle className="h-3 w-3" /> Flagged for Review
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold animate-in fade-in slide-in-from-bottom-5 ${
            toast.type === 'success'
              ? 'bg-emerald-950 text-emerald-100 border-emerald-800'
              : toast.type === 'error'
              ? 'bg-rose-950 text-rose-100 border-rose-800'
              : 'bg-surface-container-highest text-on-surface border-surface-container'
          }`}
        >
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-surface-container">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-on-surface">
            My Product Reviews
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Your reviews and whether they are published
          </p>
        </div>
        <div className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20">
          {reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'} Submitted
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="p-12 text-center space-y-3 bg-surface-container-lowest rounded-2xl border border-surface-container">
          <CometSpinner className="h-12 w-12 mx-auto block" />
          <p className="text-xs text-on-surface-variant">Loading your reviews...</p>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchCustomerReviews}
            className="px-3 py-1 bg-white border border-rose-300 rounded font-bold hover:bg-rose-100 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && reviews.length === 0 && (
        <div className="p-12 text-center space-y-3 bg-surface-container-lowest rounded-2xl border border-surface-container">
          <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center mx-auto text-on-surface-variant">
            <Star className="h-6 w-6 text-outline-variant" />
          </div>
          <h3 className="font-headline font-bold text-base text-on-surface">No Reviews Yet</h3>
          <p className="text-xs text-on-surface-variant max-w-sm mx-auto leading-relaxed">
            You haven't reviewed any purchased products yet. Once an order is delivered, you can write a review directly from your Orders tab.
          </p>
          <div className="pt-2">
            <Link
              href="/account?tab=orders"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-headline font-bold hover:bg-primary-container transition-all shadow-sm"
            >
              <Package className="h-4 w-4" />
              <span>View Delivered Orders</span>
            </Link>
          </div>
        </div>
      )}

      {/* Reviews List */}
      {!isLoading && !error && reviews.length > 0 && (
        <div className="space-y-4">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="p-5 rounded-2xl bg-surface-container-lowest border border-surface-container shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                {/* Product Info */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-14 rounded-lg overflow-hidden relative shrink-0 bg-surface-container border border-surface-container">
                    {rev.product?.images?.[0]?.url ? (
                      <Image
                        src={rev.product.images[0].url}
                        alt={rev.product.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                        <Package className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div>
                    <Link
                      href={`/products/${rev.product?.slug || ''}`}
                      className="font-headline font-bold text-sm text-on-surface hover:text-primary transition-colors flex items-center gap-1 group"
                    >
                      <span className="truncate max-w-xs sm:max-w-md">{rev.product?.title}</span>
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                    <p className="text-[11px] text-on-surface-variant">
                      Brand: <span className="font-semibold">{rev.product?.brand}</span> &bull; Submitted on{' '}
                      {new Date(rev.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <div>{renderStatusBadge(rev.status)}</div>
              </div>

              {/* Moderation Note if rejected/flagged */}
              {rev.moderationNote && (rev.status === 'REJECTED' || rev.status === 'FLAGGED') && (
                <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container text-xs space-y-1">
                  <p className="font-bold text-on-surface flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 text-secondary" />
                    <span>Moderation Note:</span>
                  </p>
                  <p className="text-on-surface-variant">{rev.moderationNote}</p>
                </div>
              )}

              {/* Review Content */}
              <div className="space-y-1.5 pt-1 border-t border-surface-container">
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-3.5 w-3.5 ${
                          s <= rev.rating ? 'fill-secondary text-secondary' : 'text-surface-container-high'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-on-surface">{rev.rating}.0</span>
                  {rev.title && (
                    <span className="text-xs font-bold text-on-surface ml-2">&bull; {rev.title}</span>
                  )}
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">{rev.comment}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => openEditModal(rev)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors flex items-center gap-1.5"
                >
                  <Edit2 className="h-3 w-3" />
                  <span>Edit Review</span>
                </button>
                <button
                  type="button"
                  disabled={deletingId === rev.id}
                  onClick={() => handleDeleteReview(rev.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>{deletingId === rev.id ? 'Deleting...' : 'Delete'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Review Modal */}
      {editingReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-2xl border border-surface-container space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div>
                <span className="text-[10px] font-headline font-bold uppercase tracking-widest text-primary">
                  Update Feedback
                </span>
                <h3 className="font-headline font-bold text-base text-on-surface">Edit Your Review</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingReview(null)}
                className="p-1 rounded-lg hover:bg-surface-container text-on-surface-variant"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Rating */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-2">Rating</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setEditRating(star)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`h-6 w-6 ${
                          star <= editRating
                            ? 'text-secondary fill-secondary'
                            : 'text-outline-variant'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-on-surface ml-2">{editRating} / 5 Stars</span>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Headline <span className="text-on-surface-variant font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-surface-container-low rounded-xl px-3 py-2 text-xs text-on-surface border border-surface-container focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Comment */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-on-surface">Review Comment</label>
                  <span className="text-[10px] text-on-surface-variant">
                    {editComment.trim().length} / 1000
                  </span>
                </div>
                <textarea
                  rows={4}
                  maxLength={1000}
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  className="w-full bg-surface-container-low rounded-xl p-3 text-xs text-on-surface border border-surface-container focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingReview(null)}
                className="w-1/2 py-2.5 rounded-xl bg-surface-container text-on-surface text-xs font-headline font-semibold hover:bg-surface-container-high transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingEdit || editComment.trim().length < 10}
                onClick={handleSaveEdit}
                className="w-1/2 py-2.5 rounded-xl bg-primary text-white text-xs font-headline font-bold hover:bg-primary-container disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-2"
              >
                {isSubmittingEdit ? 'Saving...' : 'Save & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
