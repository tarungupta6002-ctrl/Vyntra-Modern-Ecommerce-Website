import React from 'react';
import { Star, CheckCircle } from 'lucide-react';
import { DetailedProduct } from '@/data/products';

interface ProductReviewsSectionProps {
  product: DetailedProduct;
}

export function ProductReviewsSection({ product }: ProductReviewsSectionProps) {
  return (
    <div id="customer-reviews" className="space-y-6 pt-4 border-t border-[#D5D9D9]">
      <div className="flex items-center gap-2 pb-3 border-b border-[#D5D9D9]">
        <Star className="h-5 w-5 text-[#FFA41C] fill-[#FFA41C]" />
        <h2 className="text-xl font-headline font-bold text-[#0F1111]">
          Customer Reviews ({product.reviewCount})
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left: Star Breakdown */}
        <div className="md:col-span-4 space-y-3">
          <div className="flex items-baseline gap-2">
            <div className="flex items-center text-[#FFA41C]">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="h-5 w-5 fill-[#FFA41C]" />
              ))}
            </div>
            <span className="text-xl font-bold text-[#0F1111]">
              {product.rating.toFixed(1)} out of 5
            </span>
          </div>
          <p className="text-xs text-[#565959]">{product.reviewCount} global ratings</p>

          <div className="space-y-1.5 pt-2">
            {[
              { star: 5, pct: 78 },
              { star: 4, pct: 16 },
              { star: 3, pct: 4 },
              { star: 2, pct: 1 },
              { star: 1, pct: 1 },
            ].map((row) => (
              <div key={row.star} className="flex items-center gap-3 text-xs">
                <span className="text-[#007185] hover:underline w-12 font-medium">
                  {row.star} star
                </span>
                <div
                  className="flex-1 h-3 rounded-full bg-[#EAEDED] overflow-hidden"
                  role="progressbar"
                  aria-valuenow={row.pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${row.star} star ratings account for ${row.pct}%`}
                >
                  <div
                    className="h-full bg-[#FFA41C] rounded-full transition-all duration-300"
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
                <span className="text-[#565959] w-8 text-right font-mono">{row.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Reviews List */}
        <div className="md:col-span-8 space-y-4">
          {product.reviews.list && product.reviews.list.length > 0 ? (
            product.reviews.list.map((rev) => (
              <div key={rev.id} className="p-4 rounded-xl border border-[#D5D9D9] bg-white space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#800020]/10 text-[#800020] font-bold text-xs flex items-center justify-center">
                    {rev.initials || 'VP'}
                  </div>
                  <span className="text-xs font-bold text-[#0F1111]">{rev.author}</span>
                  {rev.verified && (
                    <span className="text-[10px] text-[#067D62] font-semibold flex items-center gap-0.5">
                      <CheckCircle className="h-3 w-3" />
                      <span>Verified Purchase</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex text-[#FFA41C]">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-3 w-3 ${s <= rev.rating ? 'fill-[#FFA41C]' : 'text-[#D5D9D9]'}`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-[#0F1111]">{rev.title}</span>
                </div>
                <p className="text-xs text-[#0F1111] leading-relaxed">{rev.text}</p>
                <span className="text-[10px] text-[#565959]">Reviewed in India on {rev.date}</span>
              </div>
            ))
          ) : (
            <div className="p-8 text-center border border-dashed border-[#D5D9D9] rounded-xl text-xs text-[#565959]">
              No written customer reviews yet. Be the first to share your experience with this artisan piece!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
