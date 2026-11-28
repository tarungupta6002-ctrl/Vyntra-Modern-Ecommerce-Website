'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Tag,
  Store,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Filter,
  Search,
  Trophy,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { PageHeader, StatRow, consoleButton } from '@/components/console/console-ui';

import { CometSpinner } from '@/components/ui/loading-spinner';
export const dynamic = 'force-dynamic';

interface SellerOfferItem {
  id: string;
  productId: string;
  productTitle: string;
  productSlug: string;
  vendorId: string;
  vendorStoreName: string;
  vendorRating: number;
  isVendorVerified: boolean;
  status: string;
  condition: string;
  fulfillmentType: string;
  handlingDays: number;
  isBuyBoxWinner: boolean;
  buyBoxScore?: number | null;
  sellingPrice: number;
  mrpPrice?: number | null;
  totalStock: number;
  variantsCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<SellerOfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchOffers();
  }, [statusFilter]);

  async function fetchOffers() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      params.append('limit', '50');

      const res = await fetch(`/api/admin/offers?${params.toString()}`);
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setOffers(json.data.offers || []);
      }
    } catch {
      // Offline fallback handling
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateStatus = async (offerId: string, nextStatus: string) => {
    setUpdatingId(offerId);
    try {
      const res = await fetch(`/api/admin/offers/${encodeURIComponent(offerId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, reason: `Admin offer moderation to ${nextStatus}.` }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        fetchOffers();
      } else {
        alert(json.error?.message || 'Failed to update offer status.');
      }
    } catch {
      alert('Network error while updating offer.');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOffers = offers.filter((off) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      off.productTitle.toLowerCase().includes(q) ||
      off.vendorStoreName.toLowerCase().includes(q) ||
      off.id.toLowerCase().includes(q)
    );
  });

  const activeCount = offers.filter((o) => o.status === 'ACTIVE').length;
  const suspendedCount = offers.filter((o) => o.status === 'SUSPENDED').length;
  const winnerCount = offers.filter((o) => o.isBuyBoxWinner).length;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <PageHeader
        title="Seller offers"
        description="Offers sellers have added to existing product pages, and whether each can win the Buy Box."
        actions={
          <>
          <button type="button" onClick={fetchOffers} className={consoleButton.secondary}>
            <RefreshCw className={`h-4 w-4`} />
            Refresh
          </button>
          </>
        }
      />

      <StatRow
        items={[
          { label: 'Offers', value: offers.length },
          { label: 'Active', value: activeCount, tone: 'good' },
          { label: 'Winning the Buy Box', value: winnerCount, tone: 'info' },
          { label: 'Suspended', value: suspendedCount, tone: suspendedCount > 0 ? 'warn' : 'neutral' },
        ]}
      />

      {/* Filter & Search Bar */}
      <div className="bg-white border border-[#D5D9D9] rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['ALL', 'ACTIVE', 'SUSPENDED', 'INACTIVE'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-[#007185] text-white'
                  : 'bg-[#F7F8F8] text-[#565959] hover:bg-[#E3E6E6] hover:text-[#0F1111]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#565959]" />
          <input
            type="text"
            placeholder="Search by product, vendor or offer ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#D5D9D9] rounded-lg bg-white focus:outline-none focus:border-[#007185]"
          />
        </div>
      </div>

      {/* Offers Table */}
      <div className="bg-white border border-[#D5D9D9] rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-24 text-center space-y-2">
            <CometSpinner className="h-12 w-12 mx-auto block text-[#007185]" />
            <p className="text-xs text-[#565959]">Loading marketplace offers...</p>
          </div>
        ) : filteredOffers.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <Tag className="w-10 h-10 text-[#D5D9D9] mx-auto" />
            <p className="text-sm font-bold text-[#0F1111]">No seller offers found</p>
            <p className="text-xs text-[#565959]">No offers match your current filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#F7F8F8] text-[#565959] border-b border-[#D5D9D9] font-bold">
                <tr>
                  <th className="py-3 px-4">Master Product</th>
                  <th className="py-3 px-4">Seller / Store</th>
                  <th className="py-3 px-4">Price & MRP</th>
                  <th className="py-3 px-4">Stock & SLA</th>
                  <th className="py-3 px-4">Buy Box</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D5D9D9]">
                {filteredOffers.map((off) => {
                  const isUpdating = updatingId === off.id;
                  return (
                    <tr key={off.id} className="hover:bg-[#F7F8F8]/80 transition-colors">
                      {/* Product */}
                      <td className="py-3 px-4">
                        <Link
                          href={`/products/${off.productSlug || off.productId}`}
                          target="_blank"
                          className="font-bold text-[#0F1111] hover:text-[#007185] flex items-center gap-1 group"
                        >
                          <span className="truncate max-w-[220px]" title={off.productTitle}>
                            {off.productTitle}
                          </span>
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                        <p className="text-[10px] text-[#565959] tabular-nums mt-0.5">{off.id}</p>
                      </td>

                      {/* Vendor */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-[#0F1111]">{off.vendorStoreName}</span>
                          {off.isVendorVerified && (
                            <span title="Verified seller">
                              <ShieldCheck className="w-3.5 h-3.5 text-[#007185]" />
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#565959]">★ {off.vendorRating.toFixed(1)} Rating</p>
                      </td>

                      {/* Price */}
                      <td className="py-3 px-4 tabular-nums">
                        <p className="font-bold text-[#0F1111]">{formatINR(off.sellingPrice)}</p>
                        {off.mrpPrice && off.mrpPrice > off.sellingPrice && (
                          <p className="text-[10px] text-[#565959] line-through">{formatINR(off.mrpPrice)}</p>
                        )}
                      </td>

                      {/* Stock & SLA */}
                      <td className="py-3 px-4">
                        <p className={`font-bold ${off.totalStock > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {off.totalStock > 0 ? `${off.totalStock} in stock` : 'Out of Stock'}
                        </p>
                        <p className="text-[10px] text-[#565959]">{off.handlingDays}-day handling SLA</p>
                      </td>

                      {/* Buy Box */}
                      <td className="py-3 px-4">
                        {off.isBuyBoxWinner ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-full font-bold text-[10px]">
                            <Trophy className="w-3 h-3 text-amber-600" />
                            <span>Winner</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#565959]">Competing</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            off.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : off.status === 'SUSPENDED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-[#F0F2F2] text-[#333333] border border-[#D5D9D9]'
                          }`}
                        >
                          {off.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {off.status === 'ACTIVE' ? (
                          <button
                            disabled={isUpdating}
                            onClick={() => handleUpdateStatus(off.id, 'SUSPENDED')}
                            className="px-2.5 py-1 bg-white border border-rose-300 hover:bg-rose-50 text-rose-700 rounded font-bold text-[11px] transition-colors"
                          >
                            {isUpdating ? 'Updating...' : 'Suspend'}
                          </button>
                        ) : (
                          <button
                            disabled={isUpdating}
                            onClick={() => handleUpdateStatus(off.id, 'ACTIVE')}
                            className="px-2.5 py-1 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-700 rounded font-bold text-[11px] transition-colors"
                          >
                            {isUpdating ? 'Updating...' : 'Reactivate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
