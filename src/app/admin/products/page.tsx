'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import {
  Package,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  X,
  Store,
  Layers,
  Sparkles,
} from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { PageHeader, StatRow, consoleButton } from '@/components/console/console-ui';

interface SellerOfferSummary {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorSlug: string;
  vendorStatus: string;
  status: string;
  condition: string;
  isBuyBoxWinner: boolean;
  minOfferPrice: number | null;
  totalStock: number;
}

interface AdminProduct {
  id: string;
  title: string;
  subtitle: string | null;
  slug: string;
  brand: string;
  basePrice: number;
  discountPrice: number | null;
  isPublished: boolean;
  status: 'PUBLISHED' | 'DRAFT';
  rating: number;
  reviewCount: number;
  category: { id: string; name: string; slug: string };
  vendor: { id: string; storeName: string; storeSlug: string; status: string };
  image: string;
  variantsCount: number;
  totalStock: number;
  sellerOffers?: SellerOfferSummary[];
  createdAt: string;
}

export default function AdminProductModerationPage() {
  const searchParams = useSearchParams();
  const initialVendor = searchParams?.get('vendorId') || searchParams?.get('vendor') || 'all';

  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [vendors, setVendors] = useState<Array<{ id: string; storeName: string; status?: string }>>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [vendorFilter, setVendorFilter] = useState(initialVendor);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Moderation Modal
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(null);
  const [moderationReason, setModerationReason] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (vendorFilter !== 'all') params.set('vendorId', vendorFilter);
      if (categoryFilter !== 'all') params.set('categoryId', categoryFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      params.set('page', String(currentPage));

      const res = await fetch(`/api/admin/products?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setProducts(json.data.products);
        setCategories(json.data.meta?.categories || []);
        setVendors(json.data.meta?.vendors || []);
        setTotalCount(json.data.pagination.totalCount);
        setTotalPages(json.data.pagination.totalPages);
      } else {
        setError(json.error?.message || 'Failed to load catalog products.');
      }
    } catch {
      setError('Unable to load product moderation data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [statusFilter, vendorFilter, categoryFilter, currentPage]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchProducts();
  };

  const handleToggleStatus = async (product: AdminProduct, targetPublished: boolean, reason?: string) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/products/${product.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isPublished: targetPublished,
          moderationReason: reason || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        const successMsg = json.data?.message || json.message || 'Product moderation status updated successfully.';
        setToastMessage({ text: successMsg, type: 'success' });
        setTimeout(() => setToastMessage(null), 5000);
        setModalOpen(false);
        setModerationReason('');
        fetchProducts();
      } else {
        alert(json.error?.message || 'Moderation action failed.');
      }
    } catch {
      alert('Network error while applying product moderation action.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Feedback */}
      {toastMessage && Boolean(toastMessage.text) && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs font-semibold shadow-sm ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="p-1 hover:opacity-70">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <PageHeader
        title="Products"
        description="Every listing on Vyntra. Check details and publish or unpublish them."
      />

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#D5D9D9] shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-2">
            {[
              { id: 'all', label: 'All Listings' },
              { id: 'published', label: 'Live / Published' },
              { id: 'draft', label: 'Draft / Unpublished' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id as any);
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === tab.id
                    ? 'bg-[#007185] text-white shadow-sm'
                    : 'bg-[#F7F8F8] text-[#565959] hover:bg-[#EAEDED] hover:text-[#0F1111]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#565959]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search piece, brand, boutique..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#D5D9D9] focus:outline-none focus:border-[#007185] bg-white"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-[#007185] text-white text-xs font-bold hover:bg-[#004B57]"
            >
              Search
            </button>
          </form>
        </div>

        {/* Category & Vendor dropdown filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#D5D9D9]/50 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[#565959] font-semibold whitespace-nowrap">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full p-1.5 rounded-lg border border-[#D5D9D9] bg-white text-xs font-medium focus:outline-none focus:border-[#007185]"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[#565959] font-semibold whitespace-nowrap">Vendor Boutique:</span>
            <select
              value={vendorFilter}
              onChange={(e) => {
                setVendorFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full p-1.5 rounded-lg border border-[#D5D9D9] bg-white text-xs font-medium focus:outline-none focus:border-[#007185]"
            >
              <option value="all">All Vendors</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.storeName} ({v.status})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-[#D5D9D9] shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-[#F7F8F8] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="p-10 text-center space-y-3">
            <AlertTriangle className="h-8 w-8 text-rose-600 mx-auto" />
            <p className="text-xs text-rose-700 font-semibold">{error}</p>
            <button
              onClick={fetchProducts}
              className="px-4 py-2 bg-[#007185] text-white text-xs font-bold rounded-lg"
            >
              Retry
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Package className="h-10 w-10 text-[#565959]/50 mx-auto" />
            <h3 className="font-headline font-bold text-sm text-[#0F1111]">
              No products found for selected criteria
            </h3>
            <p className="text-xs text-[#565959]">
              Try adjusting category or vendor filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F8F8] border-b border-[#D5D9D9] text-[#565959] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4 font-bold">Product Piece</th>
                  <th className="py-3 px-4 font-bold">Seller</th>
                  <th className="py-3 px-4 font-bold">Category</th>
                  <th className="py-3 px-4 font-bold">Price &amp; Stock</th>
                  <th className="py-3 px-4 font-bold">Moderation State</th>
                  <th className="py-3 px-4 font-bold text-right">Moderator Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D5D9D9]/60">
                {products.map((prod) => (
                  <tr key={prod.id} className="hover:bg-[#F7F8F8]/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-14 rounded-lg bg-[#F7F8F8] overflow-hidden shrink-0 border border-[#D5D9D9]">
                          <Image
                            src={prod.image}
                            alt={prod.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/products/${prod.slug}`}
                            target="_blank"
                            className="font-bold text-[#0F1111] hover:text-[#007185] transition-colors truncate block max-w-xs"
                          >
                            {prod.title}
                          </Link>
                          <span className="text-[11px] text-[#565959]">{prod.brand}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#0F1111] flex items-center gap-1">
                        <Store className="h-3 w-3 text-[#007185]" />
                        <span>{prod.vendor.storeName}</span>
                        <span className="text-[10px] text-[#565959] font-normal">(Creator)</span>
                      </div>
                      <span
                        className={`inline-block mt-0.5 text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                          prod.vendor.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        Vendor {prod.vendor.status}
                      </span>

                      {/* Multi-Seller Offers (Sell Existing) */}
                      {prod.sellerOffers && prod.sellerOffers.length > 0 && (
                        <div className="mt-2 pt-1.5 border-t border-dashed border-[#D5D9D9] space-y-1">
                          <span className="text-[10px] font-bold text-[#007185] block">
                            +{prod.sellerOffers.length} Other Seller{prod.sellerOffers.length > 1 ? 's' : ''}:
                          </span>
                          <div className="space-y-1">
                            {prod.sellerOffers.map((so) => (
                              <div
                                key={so.id}
                                className="flex items-center gap-1.5 bg-[#F7F8F8] border border-[#D5D9D9] px-2 py-0.5 rounded text-[10px]"
                              >
                                <span className="font-bold text-[#0F1111] truncate max-w-[110px]">{so.vendorName}</span>
                                {so.minOfferPrice != null && (
                                  <span className="font-bold text-emerald-700 font-mono">₹{so.minOfferPrice}</span>
                                )}
                                <span className="text-[9px] text-[#565959]">({so.totalStock} units)</span>
                                {so.isBuyBoxWinner && (
                                  <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1 rounded">Buy Box</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-[#565959]">
                      <span className="px-2 py-0.5 rounded bg-[#F7F8F8] border border-[#D5D9D9] font-medium">
                        {prod.category?.name || 'Unassigned'}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-[#0F1111]">{formatINR(prod.basePrice)}</div>
                      <div className="text-[11px] text-[#565959] mt-0.5">
                        {prod.totalStock > 0 ? (
                          <span className="text-emerald-700 font-semibold">{prod.totalStock} in stock</span>
                        ) : (
                          <span className="text-rose-700 font-semibold">Out of stock</span>
                        )}
                        <span> • {prod.variantsCount} var</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          prod.isPublished
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-zinc-100 text-zinc-700'
                        }`}
                      >
                        {prod.isPublished ? (
                          <>
                            <Eye className="h-2.5 w-2.5" />
                            <span>Live Marketplace</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-2.5 w-2.5" />
                            <span>Unpublished / Draft</span>
                          </>
                        )}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {prod.isPublished ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProduct(prod);
                              setModerationReason('');
                              setModalOpen(true);
                            }}
                            disabled={isSubmitting}
                            className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-700 hover:bg-rose-100 text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                          >
                            <ShieldAlert className="h-3 w-3" />
                            <span>Take Down</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(prod, true)}
                            disabled={isSubmitting}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Publish / Reinstate</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-[#565959]">
          <span>
            Showing page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalCount} total pieces)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg bg-white border border-[#D5D9D9] disabled:opacity-50 font-bold"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg bg-white border border-[#D5D9D9] disabled:opacity-50 font-bold"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* MODAL: TAKE DOWN / MODERATION REASON MODAL */}
      {modalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#D5D9D9] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#D5D9D9]">
              <div className="flex items-center gap-2 text-rose-700">
                <ShieldAlert className="h-5 w-5" />
                <h3 className="font-headline font-bold text-base text-[#0F1111]">
                  Take Down Product
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[#F7F8F8] text-[#565959]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-[#565959]">
              You are unpublishing <strong className="text-[#0F1111]">&quot;{selectedProduct.title}&quot;</strong> from {selectedProduct.vendor.storeName}. It will immediately become invisible to customers on the marketplace storefront.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleToggleStatus(selectedProduct, false, moderationReason);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-[11px] font-bold text-[#565959] uppercase block mb-1">
                  Moderation Reason (Optional)
                </label>
                <textarea
                  rows={3}
                  value={moderationReason}
                  onChange={(e) => setModerationReason(e.target.value)}
                  placeholder="e.g. Inappropriate imagery / Intellectual property claim / Out of compliance..."
                  className="w-full text-xs p-3 rounded-xl border border-[#D5D9D9] focus:outline-none focus:border-rose-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D5D9D9]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#F7F8F8] text-[#565959] text-xs font-bold hover:bg-[#EAEDED]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm"
                >
                  {isSubmitting ? 'Unpublishing...' : 'Confirm Take Down'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
