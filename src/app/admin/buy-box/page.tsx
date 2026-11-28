'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Trophy,
  ShieldCheck,
  TrendingDown,
  AlertCircle,
  Clock,
  Sparkles,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { PageHeader, StatRow, consoleButton } from '@/components/console/console-ui';

import { CometSpinner } from '@/components/ui/loading-spinner';
export const dynamic = 'force-dynamic';

interface CompetingOffer {
  offerId: string;
  vendorId: string;
  vendorStoreName: string;
  sellingPrice: number;
  stock: number;
  isBuyBoxWinner: boolean;
  compositeScore: number;
  scoreBreakdown: {
    pricePenalty: number;
    deliveryPenalty: number;
    ratingPenalty: number;
    verificationBonus: number;
    isOutOfStock: boolean;
  };
}

interface MonitoredProduct {
  productId: string;
  title: string;
  slug: string;
  totalOffersCount: number;
  winnerOfferId: string | null;
  winnerVendorName: string | null;
  winnerPrice: number | null;
  competingOffers: CompetingOffer[];
}

export default function AdminBuyBoxPage() {
  const [products, setProducts] = useState<MonitoredProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBuyBoxData();
  }, []);

  async function fetchBuyBoxData() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/buy-box');
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setProducts(json.data.products || []);
      }
    } catch {
      // Offline fallback handling
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <PageHeader
        title="Buy Box"
        description="Which seller’s offer customers see first on each product, and why."
        actions={
          <>
          <button type="button" onClick={fetchBuyBoxData} className={consoleButton.secondary}>
            <RefreshCw className="h-4 w-4" />
            Recalculate
          </button>
          </>
        }
      />

      {/* Info Card explaining the scoring formula */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-950 flex items-start gap-3 shadow-sm">
        <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Algorithmic Scoring Rules (Lower Score Wins Buy Box):</p>
          <p className="mt-1 leading-relaxed text-[#0F1111]/80">
            <strong>Formula:</strong> <code>Score = PricePenalty + RatingPenalty + DeliveryPenalty + VerificationBonus</code>
            <br />
            • <strong>Price:</strong> 50 × ((Price - MinPrice) / MinPrice) [capped at 50 pts]
            • <strong>Rating:</strong> 5 × (5.0 - SellerRating) [capped at 20 pts]
            • <strong>Delivery:</strong> 3 × (HandlingDays - 1) [capped at 25 pts]
            • <strong>Verified seller:</strong> −5 points for verified sellers. Out-of-stock offers are immediately disqualified (+Infinity).
          </p>
        </div>
      </div>

      {/* Monitored Products List */}
      {loading ? (
        <div className="bg-white border border-[#D5D9D9] rounded-xl p-16 text-center space-y-2">
          <CometSpinner className="h-12 w-12 mx-auto block text-[#007185]" />
          <p className="text-xs text-[#565959]">Evaluating Buy Box rankings...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white border border-[#D5D9D9] rounded-xl p-16 text-center space-y-2">
          <Trophy className="w-10 h-10 text-[#D5D9D9] mx-auto" />
          <p className="text-sm font-bold text-[#0F1111]">No active multi-seller products</p>
          <p className="text-xs text-[#565959]">Attach seller offers to catalog listings to observe competition.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {products.map((prod) => (
            <div key={prod.productId} className="bg-white border border-[#D5D9D9] rounded-xl shadow-sm overflow-hidden">
              {/* Product Header */}
              <div className="p-4 bg-[#F7F8F8] border-b border-[#D5D9D9] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <Link
                    href={`/products/${prod.slug}`}
                    target="_blank"
                    className="font-bold text-sm text-[#0F1111] hover:text-[#007185] flex items-center gap-1.5 group"
                  >
                    <span>{prod.title}</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                  <p className="text-[11px] text-[#565959] mt-0.5">
                    {prod.competingOffers.length} competing seller offers currently analyzed
                  </p>
                </div>

                {prod.winnerVendorName && (
                  <div className="flex items-center gap-2 bg-amber-100 border border-amber-300 text-amber-900 px-3 py-1.5 rounded-lg text-xs font-bold">
                    <Trophy className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Winner: {prod.winnerVendorName} ({formatINR(prod.winnerPrice || 0)})</span>
                  </div>
                )}
              </div>

              {/* Competing Offers Breakdown Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-white text-[#565959] border-b border-[#D5D9D9] text-[11px]">
                    <tr>
                      <th className="py-2.5 px-4 font-bold">Seller Store</th>
                      <th className="py-2.5 px-4 font-bold">Selling Price</th>
                      <th className="py-2.5 px-4 font-bold">Stock</th>
                      <th className="py-2.5 px-4 font-bold">Price Penalty</th>
                      <th className="py-2.5 px-4 font-bold">Rating Penalty</th>
                      <th className="py-2.5 px-4 font-bold">SLA Penalty</th>
                      <th className="py-2.5 px-4 font-bold">Verified bonus</th>
                      <th className="py-2.5 px-4 font-bold">Final Score</th>
                      <th className="py-2.5 px-4 font-bold">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D5D9D9]">
                    {prod.competingOffers.map((offer) => (
                      <tr
                        key={offer.offerId}
                        className={offer.isBuyBoxWinner ? 'bg-amber-50/50 font-medium' : 'hover:bg-[#F7F8F8]'}
                      >
                        <td className="py-3 px-4">
                          <span className="font-bold text-[#0F1111]">{offer.vendorStoreName}</span>
                          <p className="text-[10px] text-[#565959] tabular-nums">{offer.offerId}</p>
                        </td>
                        <td className="py-3 px-4 tabular-nums font-bold text-[#0F1111]">
                          {formatINR(offer.sellingPrice)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={offer.stock > 0 ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                            {offer.stock > 0 ? `${offer.stock} units` : 'OOS'}
                          </span>
                        </td>
                        <td className="py-3 px-4 tabular-nums">+{offer.scoreBreakdown.pricePenalty}</td>
                        <td className="py-3 px-4 tabular-nums">+{offer.scoreBreakdown.ratingPenalty}</td>
                        <td className="py-3 px-4 tabular-nums">+{offer.scoreBreakdown.deliveryPenalty}</td>
                        <td className="py-3 px-4 tabular-nums text-emerald-700 font-bold">
                          {offer.scoreBreakdown.verificationBonus < 0
                            ? `${offer.scoreBreakdown.verificationBonus} pts`
                            : '0 pts'}
                        </td>
                        <td className="py-3 px-4 tabular-nums font-extrabold text-[#0F1111]">
                          {offer.scoreBreakdown.isOutOfStock ? 'Disqualified (OOS)' : offer.compositeScore.toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          {offer.isBuyBoxWinner ? (
                            <span className="inline-flex items-center gap-1 text-amber-800 font-extrabold text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                              <span>Featured Buy Box</span>
                            </span>
                          ) : (
                            <span className="text-[#565959] text-[11px]">Competing Seller</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
