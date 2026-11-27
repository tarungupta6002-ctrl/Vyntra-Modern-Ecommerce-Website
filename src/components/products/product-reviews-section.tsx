'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Star, CheckCircle, X, ThumbsUp, Sparkles, Filter } from 'lucide-react';
import { DetailedProduct, CustomerReview } from '@/data/products';

interface ProductReviewsSectionProps {
  product: DetailedProduct;
  /** Clothing / footwear: enables fit questions and the fit summary. */
  isFashion?: boolean;
}

export function ProductReviewsSection({ product, isFashion }: ProductReviewsSectionProps) {
  // State for all reviews (initial mock/DB + user-submitted reviews)
  const [reviewsList, setReviewsList] = useState<CustomerReview[]>(product.reviews?.list || []);
  const [selectedStarFilter, setSelectedStarFilter] = useState<number | null>(null);

  // Review Modal State
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [userRating, setUserRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [userTitle, setUserTitle] = useState('');
  const [userComment, setUserComment] = useState('');
  const [userAuthor, setUserAuthor] = useState('');
  const [userFit, setUserFit] = useState<'Runs Small' | 'True to Size' | 'Runs Large'>('True to Size');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fit questions only make sense for clothing & footwear (decided by the product page).
  const isFashionCategory = Boolean(isFashion);

  // Storage key for client-side persistence
  const storageKey = `vyntra_product_reviews_${product.slug || product.id}`;

  // Load any previously persisted reviews on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: CustomerReview[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge avoiding duplicates by id
          const existingIds = new Set((product.reviews?.list || []).map((r) => r.id));
          const newOnly = parsed.filter((r) => !existingIds.has(r.id));
          setReviewsList([...newOnly, ...(product.reviews?.list || [])]);
        }
      }
    } catch {
      // LocalStorage not available or parse error
    }
  }, [product.slug, product.id, storageKey, product.reviews?.list]);

  // Try to prefill reviewer name from logged in user if available
  useEffect(() => {
    try {
      const userRaw = localStorage.getItem('user_auth') || localStorage.getItem('vyntra_user');
      if (userRaw) {
        const u = JSON.parse(userRaw);
        if (u.name) setUserAuthor(u.name);
      }
    } catch {
      // Ignore
    }
  }, []);

  // Compute stats dynamically based on current list
  const currentTotal = Math.max(product.reviewCount || 0, reviewsList.length);
  const calculatedAvg =
    reviewsList.length > 0
      ? reviewsList.reduce((acc, r) => acc + r.rating, 0) / reviewsList.length
      : product.rating;

  // Star Breakdown percentages
  const starCounts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviewsList.forEach((r) => {
    const star = Math.min(5, Math.max(1, Math.round(r.rating)));
    starCounts[star] = (starCounts[star] || 0) + 1;
  });

  const starBreakdown = [5, 4, 3, 2, 1].map((s) => {
    const count = starCounts[s] || 0;
    const pct = reviewsList.length > 0 ? Math.round((count / reviewsList.length) * 100) : 0;
    return { star: s, pct, count };
  });

  // Filter reviews by star if user clicked breakdown
  const displayedReviews = selectedStarFilter
    ? reviewsList.filter((r) => Math.round(r.rating) === selectedStarFilter)
    : reviewsList;

  // Handle Review Submission
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = userTitle.trim();
    const trimmedComment = userComment.trim();

    if (!userRating || userRating < 1 || userRating > 5) {
      setErrorMessage('Please select a star rating between 1 and 5.');
      return;
    }
    if (trimmedComment.length < 10) {
      setErrorMessage('Please write at least 10 characters in your review feedback.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const authorName = userAuthor.trim() || 'Verified Customer';
      const initials = authorName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('') || 'VC';

      const dateStr = new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      const newReview: CustomerReview = {
        id: `user_rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        author: authorName,
        initials,
        rating: userRating,
        title: trimmedTitle || 'Great product experience',
        text: isFashionCategory && userFit ? `${trimmedComment} (Fit: ${userFit})` : trimmedComment,
        verified: true,
        location: 'India',
        date: dateStr,
        helpfulCount: 0,
      };

      const updated = [newReview, ...reviewsList];
      setReviewsList(updated);

      // Persist locally
      try {
        const stored = localStorage.getItem(storageKey);
        const existing: CustomerReview[] = stored ? JSON.parse(stored) : [];
        localStorage.setItem(storageKey, JSON.stringify([newReview, ...existing]));
      } catch {
        // Ignore storage write issues
      }

      // Optimistically attempt API submission in background
      fetch(`/api/products/${product.slug || product.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: userRating,
          title: trimmedTitle,
          comment: trimmedComment,
          fit: isFashionCategory ? userFit : undefined,
        }),
      }).catch(() => {
        // Safe catch for offline/DB asleep
      });

      // Reset form and close modal
      setIsWriteModalOpen(false);
      setUserTitle('');
      setUserComment('');
      setUserRating(5);
      setToastMessage('Thank you! Your verified customer review has been added.');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not save review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const ratingLabels: Record<number, string> = {
    1: '1 Star — Disappointed / Poor',
    2: '2 Stars — Below Expectations',
    3: '3 Stars — Average / Fair',
    4: '4 Stars — Good Quality',
    5: '5 Stars — Excellent / Loved it',
  };

  return (
    <div id="customer-reviews" className="space-y-6 pt-6 border-t border-[#D5D9D9]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#067D62] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-bottom duration-300">
          <CheckCircle className="h-4 w-4 shrink-0 text-white" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 hover:opacity-75"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#D5D9D9] flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-[#FFA41C] fill-[#FFA41C]" />
          <h2 className="text-xl font-headline font-bold text-[#0F1111]">
            Customer Reviews ({currentTotal})
          </h2>
        </div>

        {/* Quick Write CTA in Header for Mobile */}
        <button
          type="button"
          onClick={() => setIsWriteModalOpen(true)}
          className="sm:hidden px-3 py-1.5 rounded-lg border border-[#D5D9D9] bg-white text-xs font-bold text-[#0F1111] hover:bg-stone-50 shadow-2xs active:scale-95 cursor-pointer"
        >
          Write a Review
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* ======================================================== */}
        {/* LEFT COLUMN: Star Breakdown, Fit & Review CTA */}
        {/* ======================================================== */}
        <div className="md:col-span-4 space-y-5">
          {/* Rating Summary */}
          {currentTotal === 0 ? (
            <div className="space-y-1">
              <p className="text-lg font-bold text-[#0F1111]">No reviews yet</p>
              <p className="text-xs text-[#565959]">Be the first to share what you think.</p>
            </div>
          ) : (
          <>
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <div className="flex items-center text-[#FFA41C]">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`h-5 w-5 ${
                      s <= Math.round(calculatedAvg) ? 'fill-[#FFA41C]' : 'text-stone-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-2xl font-bold text-[#0F1111]">
                {calculatedAvg.toFixed(1)} out of 5
              </span>
            </div>
            <p className="text-xs text-[#565959]">
              {currentTotal} customer {currentTotal === 1 ? 'rating' : 'ratings'}
            </p>
          </div>

          {/* Star Percentage Bars */}
          <div className="space-y-2 pt-1">
            {starBreakdown.map((row) => (
              <button
                key={row.star}
                type="button"
                onClick={() =>
                  setSelectedStarFilter(selectedStarFilter === row.star ? null : row.star)
                }
                className={`w-full flex items-center gap-3 text-xs text-left p-1 rounded-md transition-all cursor-pointer ${
                  selectedStarFilter === row.star ? 'bg-[#007185]/10 font-bold' : 'hover:bg-stone-50'
                }`}
                title={`Filter by ${row.star} star reviews`}
              >
                <span className="text-[#007185] hover:underline w-12 font-medium shrink-0">
                  {row.star} star
                </span>
                <div
                  className="flex-1 h-3 rounded-full bg-[#EAEDED] overflow-hidden"
                  role="progressbar"
                  aria-valuenow={row.pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full bg-[#FFA41C] rounded-full transition-all duration-300"
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
                <span className="text-[#565959] w-9 text-right font-mono text-[11px]">
                  {row.pct}%
                </span>
              </button>
            ))}
          </div>
          </>
          )}

          {/* Fit summary: only from real review data */}
          {isFashionCategory && product.reviews?.fitAccuracy && currentTotal > 0 && (
            <div className="p-3.5 bg-stone-50 rounded-xl border border-[#E7E7E7] space-y-1.5 text-xs">
              <div className="flex items-center justify-between font-bold text-[#0F1111]">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                  Customer Fit Rating
                </span>
                <span className="text-[#067D62]">
                  {product.reviews.fitAccuracy.label} ({product.reviews.fitAccuracy.pct}%)
                </span>
              </div>
              <p className="text-[11px] text-[#565959] leading-relaxed">
                {product.reviews.fitAccuracy.note}
              </p>
            </div>
          )}

          {/* Review This Product CTA Box (Classic Amazon / Vyntra Style) */}
          <div className="pt-4 border-t border-[#D5D9D9] space-y-2.5">
            <h3 className="text-sm font-bold text-[#0F1111]">Review this product</h3>
            <p className="text-xs text-[#565959] leading-relaxed">
              {isFashionCategory
                ? 'Share your thoughts with other customers to help them choose the right size and quality.'
                : 'Share your thoughts with other customers.'}
            </p>
            <button
              type="button"
              onClick={() => setIsWriteModalOpen(true)}
              className="w-full py-2 px-4 rounded-lg border border-[#D5D9D9] bg-white hover:bg-stone-50 text-xs font-bold text-[#0F1111] shadow-2xs transition-all active:scale-95 cursor-pointer text-center"
            >
              Write a product review
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: Reviews List & Star Filter Pill */}
        {/* ======================================================== */}
        <div className="md:col-span-8 space-y-4">
          {/* Active Star Filter Pill */}
          {selectedStarFilter && (
            <div className="flex items-center justify-between bg-stone-100 px-3.5 py-2 rounded-lg text-xs text-[#0F1111]">
              <span className="flex items-center gap-1.5 font-semibold">
                <Filter className="h-3.5 w-3.5 text-[#007185]" />
                Showing {selectedStarFilter}-star reviews only ({displayedReviews.length})
              </span>
              <button
                type="button"
                onClick={() => setSelectedStarFilter(null)}
                className="text-xs text-[#007185] hover:underline font-bold"
              >
                Clear filter
              </button>
            </div>
          )}

          {/* Reviews List */}
          {displayedReviews && displayedReviews.length > 0 ? (
            displayedReviews.map((rev) => (
              <div
                key={rev.id}
                className="p-4 rounded-xl border border-[#D5D9D9] bg-white space-y-2.5 shadow-2xs transition-all hover:border-[#B5B9B9]"
              >
                {/* Author Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#800020]/10 text-[#800020] font-bold text-xs flex items-center justify-center">
                      {rev.initials || 'VC'}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#0F1111] block leading-tight">
                        {rev.author}
                      </span>
                      {rev.verified && (
                        <span className="text-[10px] text-[#067D62] font-semibold flex items-center gap-1 mt-0.5">
                          <CheckCircle className="h-3 w-3" />
                          <span>Verified Purchase</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Rating & Review Title */}
                <div className="flex items-center gap-2">
                  <div className="flex text-[#FFA41C]">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-3.5 w-3.5 ${
                          s <= rev.rating ? 'fill-[#FFA41C]' : 'text-[#D5D9D9]'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-[#0F1111]">{rev.title}</span>
                </div>

                {/* Review Text */}
                <p className="text-xs text-[#0F1111] leading-relaxed whitespace-pre-line">
                  {rev.text}
                </p>

                {/* Date and Helpful Badge */}
                <div className="flex items-center justify-between pt-1 text-[11px] text-[#565959] border-t border-stone-100">
                  <span>Reviewed in India on {rev.date}</span>
                  {rev.helpfulCount !== undefined && rev.helpfulCount > 0 && (
                    <span className="flex items-center gap-1 text-[10px]">
                      <ThumbsUp className="h-3 w-3 text-stone-400" />
                      {rev.helpfulCount} people found this helpful
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center border border-dashed border-[#D5D9D9] rounded-xl text-xs text-[#565959] space-y-3 bg-stone-50">
              <Star className="h-8 w-8 text-stone-300 mx-auto" />
              <p>
                {selectedStarFilter
                  ? `No ${selectedStarFilter}-star reviews yet for this product.`
                  : 'No written customer reviews yet. Be the first to share your experience!'}
              </p>
              {selectedStarFilter ? (
                <button
                  type="button"
                  onClick={() => setSelectedStarFilter(null)}
                  className="text-xs text-[#007185] hover:underline font-bold cursor-pointer"
                >
                  View all reviews
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsWriteModalOpen(true)}
                  className="px-4 py-2 rounded-lg bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] text-xs font-bold shadow-xs cursor-pointer"
                >
                  Write the First Review
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* WRITE A PRODUCT REVIEW MODAL */}
      {/* ======================================================== */}
      {isWriteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#D5D9D9] space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#007185]">
                  Verified Purchase Feedback
                </span>
                <h3 className="font-bold text-base text-[#0F1111]">
                  Write a Customer Review
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsWriteModalOpen(false)}
                className="p-1 rounded-lg hover:bg-stone-100 text-[#565959] cursor-pointer"
                aria-label="Close review dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Product Summary Banner */}
            <div className="p-3 rounded-xl bg-stone-50 border border-[#E7E7E7] flex items-center gap-3">
              <div className="w-12 h-14 rounded-lg overflow-hidden relative shrink-0 bg-white border border-[#D5D9D9]">
                {product.images && product.images[0]?.src && (
                  <Image
                    src={product.images[0].src}
                    alt={product.title}
                    fill
                    className="object-cover"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[#0F1111] truncate">{product.title}</p>
                <p className="text-[11px] text-[#565959]">
                  Brand: {product.brand} &bull; {product.category?.toUpperCase()}
                </p>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {errorMessage}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmitReview} className="space-y-4">
              {/* Star Rating Picker */}
              <div>
                <label className="block text-xs font-bold text-[#0F1111] mb-1.5">
                  Overall Rating <span className="text-rose-600">*</span>
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => setUserRating(star)}
                      className="p-1 hover:scale-110 transition-transform cursor-pointer"
                      aria-label={`Rate ${star} star`}
                    >
                      <Star
                        className={`h-7 w-7 transition-colors ${
                          star <= (hoverRating ?? userRating)
                            ? 'text-[#FFA41C] fill-[#FFA41C]'
                            : 'text-stone-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-semibold text-[#007185] ml-2">
                    {ratingLabels[hoverRating ?? userRating]}
                  </span>
                </div>
              </div>

              {/* Fashion Category Fit Feedback */}
              {isFashionCategory && (
                <div>
                  <label className="block text-xs font-bold text-[#0F1111] mb-1.5">
                    How was the fit? <span className="text-[#565959] font-normal">(Optional)</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Runs Small', 'True to Size', 'Runs Large'] as const).map((fitOpt) => (
                      <button
                        key={fitOpt}
                        type="button"
                        onClick={() => setUserFit(fitOpt)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all text-center cursor-pointer ${
                          userFit === fitOpt
                            ? 'bg-[#007185] text-white border-[#007185] shadow-xs'
                            : 'bg-stone-50 hover:bg-stone-100 text-[#0F1111] border-[#D5D9D9]'
                        }`}
                      >
                        {fitOpt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Review Headline / Title */}
              <div>
                <label className="block text-xs font-bold text-[#0F1111] mb-1">
                  Add a headline <span className="text-[#565959] font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={userTitle}
                  onChange={(e) => setUserTitle(e.target.value)}
                  placeholder="What's most important to know? e.g. Flawless fabric & perfect fit"
                  className="w-full bg-stone-50 rounded-lg px-3 py-2 text-xs text-[#0F1111] border border-[#D5D9D9] focus:bg-white focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900]"
                />
              </div>

              {/* Written Review */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#0F1111]">
                    Add a written review <span className="text-rose-600">*</span>
                  </label>
                  <span className="text-[10px] text-[#565959]">
                    {userComment.trim().length} / 1000 (min 10)
                  </span>
                </div>
                <textarea
                  rows={4}
                  maxLength={1000}
                  value={userComment}
                  onChange={(e) => setUserComment(e.target.value)}
                  placeholder="What did you like or dislike? How was the fit, material quality, and craftsmanship?"
                  className="w-full bg-stone-50 rounded-lg p-3 text-xs text-[#0F1111] border border-[#D5D9D9] focus:bg-white focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900]"
                />
              </div>

              {/* Reviewer Name */}
              <div>
                <label className="block text-xs font-bold text-[#0F1111] mb-1">
                  Your Public Name <span className="text-[#565959] font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  maxLength={50}
                  value={userAuthor}
                  onChange={(e) => setUserAuthor(e.target.value)}
                  placeholder="e.g. Tarun G. (or leave blank for Verified Customer)"
                  className="w-full bg-stone-50 rounded-lg px-3 py-2 text-xs text-[#0F1111] border border-[#D5D9D9] focus:bg-white focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#E7E7E7]">
                <button
                  type="button"
                  onClick={() => setIsWriteModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-[#0F1111] hover:bg-stone-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || userComment.trim().length < 10}
                  className="px-5 py-2 rounded-lg bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] text-xs font-bold transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
