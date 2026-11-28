'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  Package,
  Plus,
  Store,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Clock,
  Truck,
  Barcode,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Info,
  Tag,
  ArrowLeft,
  Check,
} from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { ProductForm } from '@/components/vendor/product-form';

import { CometSpinner } from '@/components/ui/loading-spinner';
interface VariantMaster {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  catalogPrice: number;
  catalogOriginalPrice: number | null;
  size: string | null;
  color: string | null;
  imageUrl?: string | null;
  myOffer?: {
    offerVariantId: string;
    sellerSku: string;
    sellingPrice: number;
    mrpPrice: number | null;
    stock: number;
  } | null;
}

interface CatalogProduct {
  id: string;
  title: string;
  subtitle: string | null;
  slug: string;
  brand: string;
  brandRefId: string | null;
  basePrice: number;
  discountPrice: number | null;
  category: { id: string; name: string; slug: string };
  image: string;
  images: Array<{ id: string; url: string; altText: string | null; isPrimary: boolean }>;
  rating: number;
  reviewCount: number;
  hasVariants: boolean;
  variantsCount: number;
  variants: VariantMaster[];
  offersCount: number;
  lowestMarketPrice: number;
  buyBoxWinnerStoreName: string | null;
  hasMyOffer: boolean;
  myOfferId: string | null;
}

interface VariantOfferInput {
  productVariantId: string;
  sellerSku: string;
  sellingPrice: string;
  mrpPrice: string;
  stock: string;
}

export function SellPortal() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Mode: 'sell-existing' (default) vs 'request-new'
  const initialMode = searchParams.get('mode') === 'request-new' ? 'request-new' : 'sell-existing';
  const [activeTab, setActiveTab] = useState<'sell-existing' | 'request-new'>(initialMode);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<CatalogProduct[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Selected product for offer attachment
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);

  // Offer Form State
  const [condition, setCondition] = useState<'NEW' | 'REFURBISHED' | 'ARTISAN_RESTORED'>('NEW');
  const [fulfillmentType, setFulfillmentType] = useState<'SELLER_FULFILLED' | 'VYNTRA_FULFILLED'>('SELLER_FULFILLED');
  const [handlingDays, setHandlingDays] = useState('2');
  const [variantInputs, setVariantInputs] = useState<Record<string, VariantOfferInput>>({});
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [offerSuccess, setOfferSuccess] = useState<{
    offerId: string;
    productSlug: string;
    isBuyBoxWinner: boolean;
  } | null>(null);

  // Handle Search Execution
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSearching(true);
    setSearchError(null);
    setHasSearched(true);

    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.set('q', searchQuery.trim());
      }
      params.set('limit', '25');

      const res = await fetch(`/api/vendor/catalog/search?${params.toString()}`);
      const json = await res.json();

      if (res.ok && json.success) {
        setSearchResults(json.data.items || []);
      } else {
        setSearchError(json.error?.message || 'Failed to search catalog.');
        setSearchResults([]);
      }
    } catch (err: any) {
      setSearchError('Network error connecting to shared catalog.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Initial popular search on mount
  useEffect(() => {
    if (activeTab === 'sell-existing' && !hasSearched) {
      handleSearch();
    }
  }, [activeTab]);

  // When a product is selected to attach an offer
  const handleSelectProductForOffer = (prod: CatalogProduct) => {
    setSelectedProduct(prod);
    setOfferError(null);
    setOfferSuccess(null);

    // Initialize variant inputs with defaults
    const initialInputs: Record<string, VariantOfferInput> = {};
    prod.variants.forEach((v) => {
      const defaultSku = `${prod.brand.slice(0, 3).toUpperCase()}-${v.size || 'STD'}-${v.color || 'CLR'}-${Date.now().toString().slice(-4)}`.replace(/\s+/g, '');
      initialInputs[v.id] = {
        productVariantId: v.id,
        sellerSku: v.myOffer?.sellerSku || defaultSku,
        sellingPrice: v.myOffer ? String(v.myOffer.sellingPrice) : String(v.catalogPrice),
        // MRP is what the seller states; never invent one (that would fake a discount).
        mrpPrice: v.myOffer?.mrpPrice ? String(v.myOffer.mrpPrice) : v.catalogOriginalPrice ? String(v.catalogOriginalPrice) : '',
        stock: v.myOffer ? String(v.myOffer.stock) : '',
      };
    });
    setVariantInputs(initialInputs);

    // Scroll to offer configuration
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle Offer Submission
  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    setIsSubmittingOffer(true);
    setOfferError(null);

    try {
      const formattedVariants = Object.values(variantInputs).map((v) => ({
        productVariantId: v.productVariantId,
        sellerSku: v.sellerSku.trim().toUpperCase(),
        sellingPrice: parseFloat(v.sellingPrice),
        mrpPrice: v.mrpPrice ? parseFloat(v.mrpPrice) : null,
        stock: parseInt(v.stock, 10) || 0,
      }));

      // Validation
      for (const fv of formattedVariants) {
        if (!fv.sellerSku) {
          throw new Error('Every variant must specify a unique Seller SKU.');
        }
        if (isNaN(fv.sellingPrice) || fv.sellingPrice <= 0) {
          throw new Error(`Invalid selling price for SKU '${fv.sellerSku}'. Must be greater than 0.`);
        }
        if (fv.mrpPrice && fv.mrpPrice < fv.sellingPrice) {
          throw new Error(`MRP Price cannot be less than selling price for SKU '${fv.sellerSku}'.`);
        }
        if (isNaN(fv.stock) || fv.stock < 0) {
          throw new Error(`Stock for SKU '${fv.sellerSku}' cannot be negative.`);
        }
      }

      const payload = {
        productId: selectedProduct.id,
        condition,
        fulfillmentType,
        handlingDays: parseInt(handlingDays, 10) || 2,
        variants: formattedVariants,
      };

      const res = await fetch('/api/vendor/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setOfferSuccess({
          offerId: json.data.id,
          productSlug: selectedProduct.slug,
          isBuyBoxWinner: Boolean(json.data.isBuyBoxWinner),
        });
      } else {
        setOfferError(json.error?.message || 'Failed to publish seller offer.');
      }
    } catch (err: any) {
      setOfferError(err.message || 'An unexpected error occurred while saving your offer.');
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-24 animate-in fade-in duration-200">
      <div className="border-b border-[#D5D9D9] pb-5">
        <Link href="/vendor/products" className="inline-flex items-center gap-1 text-sm text-[#565959] hover:text-[#007185]">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Products
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-[#0F1111]">Add a product</h1>
        <p className="mt-1 text-sm text-[#565959]">
          If the product is already on Vyntra, add your price and stock to it. Otherwise create a new listing.
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 2. Existing product or new listing */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tab 1: Sell an Existing Product */}
        <button
          type="button"
          aria-pressed={activeTab === 'sell-existing'}
          onClick={() => {
            setActiveTab('sell-existing');
            setSelectedProduct(null);
            setOfferSuccess(null);
          }}
          className={`p-5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
            activeTab === 'sell-existing'
              ? 'bg-[#007185]/5 border-[#007185] ring-1 ring-[#007185]'
              : 'bg-white border-[#D5D9D9] hover:border-[#007185]/60 hover:bg-[#F7F8F8]'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${activeTab === 'sell-existing' ? 'bg-[#007185] text-white' : 'bg-[#F7F8F8] text-[#565959]'}`}>
                  <Search className="h-5 w-5" />
                </div>
                <h2 className="text-base font-semibold text-[#0F1111]">It&apos;s already on Vyntra</h2>
              </div>
            </div>
            <p className="text-sm text-[#565959]">
              Find the product and add your own price, SKU and stock. The photos and details are already there.
            </p>
          </div>
        </button>

        {/* Tab 2: Request New Product */}
        <button
          type="button"
          aria-pressed={activeTab === 'request-new'}
          onClick={() => {
            setActiveTab('request-new');
            setSelectedProduct(null);
            setOfferSuccess(null);
          }}
          className={`p-5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
            activeTab === 'request-new'
              ? 'bg-[#007185]/5 border-[#007185] ring-1 ring-[#007185]'
              : 'bg-white border-[#D5D9D9] hover:border-[#007185]/60 hover:bg-[#F7F8F8]'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${activeTab === 'request-new' ? 'bg-[#007185] text-white' : 'bg-[#F7F8F8] text-[#565959]'}`}>
                  <Plus className="h-5 w-5" />
                </div>
                <h2 className="text-base font-semibold text-[#0F1111]">It&apos;s a new product</h2>
              </div>
            </div>
            <p className="text-sm text-[#565959]">
              Create the listing yourself: category, photos, variants, size chart and description.
            </p>
          </div>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 3. TAB 1: SELL EXISTING PRODUCT FLOW */}
      {/* ========================================================================= */}
      {activeTab === 'sell-existing' && (
        <div className="space-y-6">
          {/* A. If a product is currently selected for offer creation */}
          {selectedProduct ? (
            <div className="space-y-6">
              {/* Back to Results */}
              <button
                type="button"
                onClick={() => {
                  setSelectedProduct(null);
                  setOfferSuccess(null);
                }}
                className="text-xs font-bold text-[#007185] hover:underline flex items-center gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to results</span>
              </button>

              {/* Master Product Header Card */}
              <div className="bg-white rounded-xl border border-[#D5D9D9] p-6 shadow-sm flex flex-col md:flex-row items-start gap-6">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl border border-[#D5D9D9] overflow-hidden shrink-0 bg-[#F7F8F8] relative">
                  <img
                    src={selectedProduct.image}
                    alt={selectedProduct.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-md bg-[#007185]/10 text-[#007185]">
                      {selectedProduct.category.name}
                    </span>

                  </div>

                  <h2 className="text-xl font-headline font-bold text-[#0F1111]">
                    {selectedProduct.title}
                  </h2>
                  <p className="text-xs text-[#565959]">
                    Brand: <strong className="text-[#0F1111]">{selectedProduct.brand}</strong>, listed at <strong className="text-[#0F1111]">{formatINR(selectedProduct.basePrice)}</strong>
                  </p>

                  <div className="pt-1 flex items-center gap-4 text-xs text-[#565959]">
                    <span>Sellers: <strong className="text-[#0F1111]">{selectedProduct.offersCount}</strong></span>
                    <span>Lowest price: <strong className="text-[#0F1111]">{formatINR(selectedProduct.lowestMarketPrice)}</strong></span>
                    {selectedProduct.buyBoxWinnerStoreName && (
                      <span>Shown first: <strong className="text-[#0F1111]">{selectedProduct.buyBoxWinnerStoreName}</strong></span>
                    )}
                  </div>
                </div>
              </div>

              {/* Success Notification */}
              {offerSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-[#0F1111] space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-2.5 text-emerald-800 font-bold text-base">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                    <span>Your offer is live</span>
                  </div>
                  <p className="text-xs text-emerald-900 leading-relaxed">
                    Shoppers can now buy this product from you.
                    {offerSuccess.isBuyBoxWinner && ' Your offer is the one shown first on the product page.'}
                  </p>
                  <div className="pt-2 flex items-center gap-3">
                    <Link
                      href={`/products/${offerSuccess.productSlug}`}
                      target="_blank"
                      className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <span>View product page</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProduct(null);
                        setOfferSuccess(null);
                        handleSearch();
                      }}
                      className="px-4 py-2 rounded-lg bg-white border border-emerald-300 hover:bg-emerald-100/50 text-xs font-bold text-emerald-900 transition-all"
                    >
                      Sell another product
                    </button>
                  </div>
                </div>
              )}

              {/* Offer Configuration Form */}
              {!offerSuccess && (
                <form onSubmit={handleSubmitOffer} className="bg-white rounded-xl border border-[#D5D9D9] p-6 shadow-sm space-y-6">
                  <div className="border-b border-[#D5D9D9] pb-4">
                    <h3 className="text-lg font-headline font-bold text-[#0F1111] flex items-center gap-2">
                      <Tag className="h-5 w-5 text-[#007185]" />
                      <span>Your price and stock</span>
                    </h3>
                    <p className="text-xs text-[#565959] mt-0.5">
                      For each variant you sell. Leave a variant&apos;s stock at 0 if you don&apos;t have it.
                    </p>
                  </div>

                  {offerError && (
                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                      <span>{offerError}</span>
                    </div>
                  )}

                  {/* General Offer Settings (Condition & Fulfillment) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#0F1111] mb-1">
                        Condition
                      </label>
                      <select
                        value={condition}
                        onChange={(e) => setCondition(e.target.value as any)}
                        className="w-full h-10 px-3 bg-white border border-[#D5D9D9] rounded-lg text-xs font-medium focus:border-[#007185] focus:outline-none"
                      >
                        <option value="NEW">New</option>
                        <option value="REFURBISHED">Refurbished</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#0F1111] mb-1">
                        Shipping
                      </label>
                      <select
                        value={fulfillmentType}
                        onChange={(e) => setFulfillmentType(e.target.value as any)}
                        className="w-full h-10 px-3 bg-white border border-[#D5D9D9] rounded-lg text-xs font-medium focus:border-[#007185] focus:outline-none"
                      >
                        <option value="SELLER_FULFILLED">I ship it from my pickup address</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#0F1111] mb-1">
                        Ready to ship within
                      </label>
                      <select
                        value={handlingDays}
                        onChange={(e) => setHandlingDays(e.target.value)}
                        className="w-full h-10 px-3 bg-white border border-[#D5D9D9] rounded-lg text-xs font-medium focus:border-[#007185] focus:outline-none"
                      >
                        <option value="1">1 working day</option>
                        <option value="2">2 working days</option>
                        <option value="3">3 working days</option>
                        <option value="5">5 working days</option>
                      </select>
                    </div>
                  </div>

                  {/* Variant-wise Offer Inputs */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold text-[#565959]">
                      Variants ({selectedProduct.variants.length})
                    </h4>

                    <div className="border border-[#D5D9D9] rounded-xl overflow-hidden overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-[#F7F8F8] border-b border-[#D5D9D9] text-[#565959] text-xs">
                            <th className="p-3 font-semibold">Variant</th>
                            <th className="p-3 font-semibold">Listed price</th>
                            <th className="p-3 font-semibold min-w-[150px]">Your SKU *</th>
                            <th className="p-3 font-semibold min-w-[130px]">Your price (₹) *</th>
                            <th className="p-3 font-semibold min-w-[120px]">MRP (₹)</th>
                            <th className="p-3 font-semibold min-w-[100px]">Stock *</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#D5D9D9]">
                          {selectedProduct.variants.map((variant) => {
                            const currentInput = variantInputs[variant.id] || {
                              productVariantId: variant.id,
                              sellerSku: '',
                              sellingPrice: '',
                              mrpPrice: '',
                              stock: '0',
                            };

                            const updateField = (field: keyof VariantOfferInput, value: string) => {
                              setVariantInputs((prev) => ({
                                ...prev,
                                [variant.id]: {
                                  ...prev[variant.id],
                                  [field]: value,
                                },
                              }));
                            };

                            return (
                              <tr key={variant.id} className="hover:bg-[#F7F8F8]/50">
                                <td className="p-3">
                                  <div className="font-bold text-[#0F1111]">
                                    {variant.name || [variant.size, variant.color].filter(Boolean).join(' / ') || 'Standard'}
                                  </div>
                                  <div className="text-xs text-[#565959] tabular-nums mt-0.5">
                                    SKU {variant.sku}
                                    {variant.barcode && ` • Barcode: ${variant.barcode}`}
                                  </div>
                                </td>

                                <td className="p-3 font-medium text-[#565959]">
                                  {formatINR(variant.catalogPrice)}
                                </td>

                                <td className="p-3">
                                  <input
                                    type="text"
                                    required
                                    value={currentInput.sellerSku}
                                    onChange={(e) => updateField('sellerSku', e.target.value)}
                                    placeholder="Your own code"
                                    className="w-full h-9 px-2.5 bg-white border border-[#D5D9D9] rounded-lg text-xs tabular-nums focus:border-[#007185] focus:outline-none"
                                  />
                                </td>

                                <td className="p-3">
                                  <div className="relative">
                                    <span className="absolute left-2.5 top-2 text-[#565959] text-xs">₹</span>
                                    <input
                                      type="number"
                                      required
                                      min="1"
                                      step="1"
                                      value={currentInput.sellingPrice}
                                      onChange={(e) => updateField('sellingPrice', e.target.value)}
                                      className="w-full h-9 pl-6 pr-2.5 bg-white border border-[#D5D9D9] rounded-lg text-xs font-bold text-[#0F1111] focus:border-[#007185] focus:outline-none"
                                    />
                                  </div>
                                </td>

                                <td className="p-3">
                                  <div className="relative">
                                    <span className="absolute left-2.5 top-2 text-[#565959] text-xs">₹</span>
                                    <input
                                      type="number"
                                      min="1"
                                      step="1"
                                      value={currentInput.mrpPrice}
                                      onChange={(e) => updateField('mrpPrice', e.target.value)}
                                      placeholder="Optional"
                                      className="w-full h-9 pl-6 pr-2.5 bg-white border border-[#D5D9D9] rounded-lg text-xs text-[#565959] focus:border-[#007185] focus:outline-none"
                                    />
                                  </div>
                                </td>

                                <td className="p-3">
                                  <input
                                    type="number"
                                    required
                                    min="0"
                                    step="1"
                                    value={currentInput.stock}
                                    onChange={(e) => updateField('stock', e.target.value)}
                                    className="w-full h-9 px-2.5 bg-white border border-[#D5D9D9] rounded-lg text-xs font-bold text-[#0F1111] focus:border-[#007185] focus:outline-none"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Submission Actions */}
                  <div className="pt-4 border-t border-[#D5D9D9] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setSelectedProduct(null)}
                      className="px-4 py-2 rounded-lg border border-[#D5D9D9] hover:bg-[#F7F8F8] text-xs font-bold text-[#0F1111]"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmittingOffer}
                      className="px-6 py-2.5 rounded-lg bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] text-xs font-extrabold shadow-sm transition-all flex items-center gap-2 border border-[#FCD200]"
                    >
                      {isSubmittingOffer ? (
                        <>
                          <CometSpinner className="h-4 w-4 text-[#0F1111]" decorative />
                          <span>Publishing…</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 stroke-[3]" />
                          <span>Publish my offer</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* B. Master Catalog Search Bar & Results */
            <div className="space-y-6">
              {/* Search Bar Input */}
              <form onSubmit={handleSearch} className="bg-white rounded-xl border border-[#D5D9D9] p-6 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-[#565959]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by product name, brand, category or barcode"
                      aria-label="Search products on Vyntra"
                      className="w-full h-11 pl-10 pr-4 bg-white border border-[#D5D9D9] rounded-xl text-xs sm:text-sm font-medium focus:border-[#007185] focus:ring-2 focus:ring-[#007185]/20 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSearching}
                    className="w-full sm:w-auto h-11 px-6 rounded-xl bg-[#007185] hover:bg-[#005a6a] text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 shrink-0"
                  >
                    {isSearching ? (
                      <CometSpinner className="h-4 w-4 text-current" decorative />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    <span>Search</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#565959] pt-1">
                  <Info className="h-3.5 w-3.5 text-[#007185] shrink-0" />
                  <span>Searching by SKU or barcode finds the exact product.</span>
                </div>
              </form>

              {searchError && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{searchError}</span>
                </div>
              )}

              {/* Search Results Display */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline font-bold text-sm text-[#0F1111]">
                    {hasSearched ? `${searchResults.length} ${searchResults.length === 1 ? 'result' : 'results'}` : 'Recently listed'}
                  </h3>
                  <span className="text-xs text-[#565959]">
                    Choose a product to add your offer
                  </span>
                </div>

                {isSearching ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-12" aria-live="polite">
                    <CometSpinner className="h-12 w-12" decorative />
                    <p className="text-sm text-[#565959]">Loading…</p>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="bg-white rounded-xl border border-dashed border-[#D5D9D9] p-12 text-center space-y-3">
                    <Package className="h-10 w-10 text-[#565959]/40 mx-auto" />
                    <h4 className="font-headline font-bold text-base text-[#0F1111]">
                      Nothing found
                    </h4>
                    <p className="text-xs text-[#565959] max-w-md mx-auto">
                      {searchQuery.trim()
                        ? <>No product on Vyntra matches &ldquo;{searchQuery.trim()}&rdquo;. If yours is new, create a listing for it.</>
                        : 'There are no products on Vyntra yet. Create a listing for yours.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('request-new')}
                      className="px-5 py-2.5 rounded-xl bg-[#FFD814] text-[#0F1111] text-xs font-bold hover:bg-[#F7CA00] shadow-sm transition-all inline-flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Create a new listing</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {searchResults.map((prod) => (
                      <div
                        key={prod.id}
                        className="bg-white rounded-xl border border-[#D5D9D9] hover:border-[#007185] p-4 shadow-sm transition-all flex items-start gap-4"
                      >
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl border border-[#D5D9D9] overflow-hidden shrink-0 bg-[#F7F8F8] relative">
                          <img
                            src={prod.image}
                            alt={prod.title}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-[#007185]/10 text-[#007185]">
                              {prod.category.name}
                            </span>
                            <span className="text-xs text-[#565959] font-medium">
                              {prod.brand}
                            </span>
                          </div>

                          <h4 className="font-headline font-bold text-sm text-[#0F1111] line-clamp-1">
                            {prod.title}
                          </h4>

                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-bold text-[#0F1111]">
                              From {formatINR(prod.lowestMarketPrice)}
                            </span>
                            {prod.discountPrice && (
                              <span className="line-through text-[#565959] text-xs">
                                {formatINR(prod.basePrice)}
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-[#565959] flex items-center gap-3 pt-1">
                            <span>{prod.offersCount} {prod.offersCount === 1 ? 'seller' : 'sellers'}</span>
                            <span>&bull;</span>
                            <span>{prod.variantsCount} {prod.variantsCount === 1 ? 'variant' : 'variants'}</span>
                          </div>

                          <div className="pt-2 flex items-center gap-2">
                            {prod.hasMyOffer ? (
                              <button
                                type="button"
                                onClick={() => handleSelectProductForOffer(prod)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 text-xs font-bold transition-all flex items-center gap-1"
                              >
                                <Check className="h-3 w-3" />
                                <span>Update my offer</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSelectProductForOffer(prod)}
                                className="px-3.5 py-1.5 rounded-lg bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] text-xs font-bold transition-all shadow-sm border border-[#FCD200] flex items-center gap-1"
                              >
                                <Tag className="h-3 w-3" />
                                <span>Sell this</span>
                              </button>
                            )}

                            <Link
                              href={`/products/${prod.slug}`}
                              target="_blank"
                              className="p-1.5 text-[#565959] hover:text-[#007185] transition-colors"
                              title="Open the product page"
                              aria-label={`Open ${prod.title}`}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. New product: the full listing form */}
      {/* ========================================================================= */}
      {activeTab === 'request-new' && (
        <div className="space-y-6">
          <ProductForm mode="create" embedded />
        </div>
      )}
    </div>
  );
}
