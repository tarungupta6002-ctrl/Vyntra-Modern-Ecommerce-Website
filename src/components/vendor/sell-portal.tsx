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
  Loader2,
  Tag,
  ArrowLeft,
  Check,
} from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { ProductForm } from '@/components/vendor/product-form';

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
        mrpPrice: v.myOffer?.mrpPrice ? String(v.myOffer.mrpPrice) : v.catalogOriginalPrice ? String(v.catalogOriginalPrice) : String(Math.round(v.catalogPrice * 1.3)),
        stock: v.myOffer ? String(v.myOffer.stock) : '15',
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
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & MULTI-SELLER TAB SELECTION */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D5D9D9]">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#565959] mb-1">
            <Link href="/vendor/products" className="hover:text-[#007185] flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Seller Catalog</span>
            </Link>
            <span>/</span>
            <span className="text-[#0F1111]">Add Products &amp; Offers</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-headline font-extrabold text-[#0F1111] flex items-center gap-2.5">
            <Store className="h-7 w-7 text-[#007185]" />
            <span>Vyntra Multi-Seller Portal</span>
          </h1>
          <p className="text-xs text-[#565959] mt-0.5">
            Attach your store offer to an existing catalog listing or request a brand-new master piece for governance review.
          </p>
        </div>

        <Link
          href="/vendor/products"
          className="px-4 py-2 rounded-lg bg-white border border-[#D5D9D9] hover:bg-[#F7F8F8] text-xs font-bold text-[#0F1111] transition-all self-start sm:self-auto"
        >
          Back to Listings
        </Link>
      </div>

      {/* ========================================================================= */}
      {/* 2. MODE SWITCHER TABS: Amazon-Style Choice */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tab 1: Sell an Existing Product */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('sell-existing');
            setSelectedProduct(null);
            setOfferSuccess(null);
          }}
          className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
            activeTab === 'sell-existing'
              ? 'bg-gradient-to-br from-[#007185]/5 to-transparent border-[#007185] ring-2 ring-[#007185]/20 shadow-sm'
              : 'bg-white border-[#D5D9D9] hover:border-[#007185]/60 hover:bg-[#F7F8F8]'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${activeTab === 'sell-existing' ? 'bg-[#007185] text-white' : 'bg-[#F7F8F8] text-[#565959]'}`}>
                  <Search className="h-5 w-5" />
                </div>
                <h3 className="font-headline font-bold text-base text-[#0F1111]">
                  Sell an Existing Product
                </h3>
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                Fast Track
              </span>
            </div>
            <p className="text-xs text-[#565959] leading-relaxed">
              Find an existing product in Vyntra master catalog by name, brand, or barcode. Attach your competitive price, SKU, and stock in seconds without re-taking photos.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-[#D5D9D9]/50 flex items-center justify-between text-xs font-bold text-[#007185]">
            <span>Preserves Master Catalog ID</span>
            <ChevronRight className="h-4 w-4" />
          </div>
        </button>

        {/* Tab 2: Request New Product */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('request-new');
            setSelectedProduct(null);
            setOfferSuccess(null);
          }}
          className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
            activeTab === 'request-new'
              ? 'bg-gradient-to-br from-[#800020]/5 to-transparent border-[#800020] ring-2 ring-[#800020]/20 shadow-sm'
              : 'bg-white border-[#D5D9D9] hover:border-[#800020]/60 hover:bg-[#F7F8F8]'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${activeTab === 'request-new' ? 'bg-[#800020] text-white' : 'bg-[#F7F8F8] text-[#565959]'}`}>
                  <Plus className="h-5 w-5" />
                </div>
                <h3 className="font-headline font-bold text-base text-[#0F1111]">
                  Request New Master Listing
                </h3>
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 uppercase tracking-wider">
                Admin Moderated
              </span>
            </div>
            <p className="text-xs text-[#565959] leading-relaxed">
              If your handcrafted creation does not exist in Vyntra shared catalog, submit a new product request with photos, variants, and A+ rich content for governance approval.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-[#D5D9D9]/50 flex items-center justify-between text-xs font-bold text-[#800020]">
            <span>Governance Moderation Required</span>
            <ChevronRight className="h-4 w-4" />
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
                <span>Back to Search Results</span>
              </button>

              {/* Master Product Header Card */}
              <div className="bg-white rounded-2xl border border-[#D5D9D9] p-6 shadow-sm flex flex-col md:flex-row items-start gap-6">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl border border-[#D5D9D9] overflow-hidden shrink-0 bg-[#F7F8F8] relative">
                  <img
                    src={selectedProduct.image}
                    alt={selectedProduct.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-[#007185]/10 text-[#007185] uppercase tracking-wider">
                      {selectedProduct.category.name}
                    </span>
                    <span className="text-[10px] font-mono text-[#565959] bg-[#F7F8F8] px-2 py-0.5 rounded border border-[#D5D9D9]">
                      Master ID: {selectedProduct.id}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" />
                      Approved Master Listing
                    </span>
                  </div>

                  <h2 className="text-xl font-headline font-bold text-[#0F1111]">
                    {selectedProduct.title}
                  </h2>
                  <p className="text-xs text-[#565959]">
                    Brand: <strong className="text-[#0F1111]">{selectedProduct.brand}</strong> &bull; Catalog Base Price: <strong className="text-[#0F1111]">{formatINR(selectedProduct.basePrice)}</strong>
                  </p>

                  <div className="pt-1 flex items-center gap-4 text-xs text-[#565959]">
                    <span>Active Sellers: <strong className="text-[#0F1111]">{selectedProduct.offersCount}</strong></span>
                    <span>Lowest Price: <strong className="text-[#B12704]">{formatINR(selectedProduct.lowestMarketPrice)}</strong></span>
                    {selectedProduct.buyBoxWinnerStoreName && (
                      <span>Current Buy Box: <strong className="text-[#007185]">{selectedProduct.buyBoxWinnerStoreName}</strong></span>
                    )}
                  </div>
                </div>
              </div>

              {/* Success Notification */}
              {offerSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-[#0F1111] space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-2.5 text-emerald-800 font-bold text-base">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                    <span>Seller Offer Published Successfully!</span>
                  </div>
                  <p className="text-xs text-emerald-900 leading-relaxed">
                    Your offer has been attached to the master catalog listing (Offer ID: <code className="font-mono font-bold">{offerSuccess.offerId}</code>).
                    {offerSuccess.isBuyBoxWinner && (
                      <span className="ml-1 font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                        Congratulations! Your competitive offer currently holds the Buy Box.
                      </span>
                    )}
                  </p>
                  <div className="pt-2 flex items-center gap-3">
                    <Link
                      href={`/products/${offerSuccess.productSlug}`}
                      target="_blank"
                      className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <span>View Live on Storefront</span>
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
                      Sell Another Product
                    </button>
                  </div>
                </div>
              )}

              {/* Offer Configuration Form */}
              {!offerSuccess && (
                <form onSubmit={handleSubmitOffer} className="bg-white rounded-2xl border border-[#D5D9D9] p-6 shadow-sm space-y-6">
                  <div className="border-b border-[#D5D9D9] pb-4">
                    <h3 className="text-lg font-headline font-bold text-[#0F1111] flex items-center gap-2">
                      <Tag className="h-5 w-5 text-[#007185]" />
                      <span>Configure Your Seller Offer</span>
                    </h3>
                    <p className="text-xs text-[#565959] mt-0.5">
                      Set your independent pricing, seller SKU, and inventory for each variant of this master piece.
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
                        Offer Condition
                      </label>
                      <select
                        value={condition}
                        onChange={(e) => setCondition(e.target.value as any)}
                        className="w-full h-10 px-3 bg-white border border-[#D5D9D9] rounded-lg text-xs font-medium focus:border-[#007185] focus:outline-none"
                      >
                        <option value="NEW">New (Brand New Piece)</option>
                        <option value="ARTISAN_RESTORED">Artisan Restored / Heritage</option>
                        <option value="REFURBISHED">Certified Refurbished</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#0F1111] mb-1">
                        Fulfillment Channel
                      </label>
                      <select
                        value={fulfillmentType}
                        onChange={(e) => setFulfillmentType(e.target.value as any)}
                        className="w-full h-10 px-3 bg-white border border-[#D5D9D9] rounded-lg text-xs font-medium focus:border-[#007185] focus:outline-none"
                      >
                        <option value="SELLER_FULFILLED">Seller Fulfilled (Ship from Atelier)</option>
                        <option value="VYNTRA_FULFILLED">Vyntra Fulfilled (Fulfillment Center)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#0F1111] mb-1">
                        Dispatch Window (Handling SLA)
                      </label>
                      <select
                        value={handlingDays}
                        onChange={(e) => setHandlingDays(e.target.value)}
                        className="w-full h-10 px-3 bg-white border border-[#D5D9D9] rounded-lg text-xs font-medium focus:border-[#007185] focus:outline-none"
                      >
                        <option value="1">1 Business Day (Express Prep)</option>
                        <option value="2">2 Business Days (Standard)</option>
                        <option value="3">3 Business Days</option>
                        <option value="5">5 Business Days (Made-to-Measure)</option>
                      </select>
                    </div>
                  </div>

                  {/* Variant-wise Offer Inputs */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#565959]">
                      Variant Pricing &amp; Warehouse Inventory ({selectedProduct.variants.length} Variants)
                    </h4>

                    <div className="border border-[#D5D9D9] rounded-xl overflow-hidden overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-[#F7F8F8] border-b border-[#D5D9D9] text-[#565959] uppercase tracking-wider text-[10px]">
                            <th className="p-3 font-bold">Catalog Variant</th>
                            <th className="p-3 font-bold">Catalog Price</th>
                            <th className="p-3 font-bold min-w-[150px]">Your Seller SKU *</th>
                            <th className="p-3 font-bold min-w-[130px]">Selling Price (₹) *</th>
                            <th className="p-3 font-bold min-w-[120px]">MRP Price (₹)</th>
                            <th className="p-3 font-bold min-w-[100px]">Stock Units *</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#D5D9D9]">
                          {selectedProduct.variants.map((variant) => {
                            const currentInput = variantInputs[variant.id] || {
                              productVariantId: variant.id,
                              sellerSku: '',
                              sellingPrice: '',
                              mrpPrice: '',
                              stock: '10',
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
                                    {variant.name || `${variant.size || 'Std'} / ${variant.color || 'Classic'}`}
                                  </div>
                                  <div className="text-[10px] text-[#565959] font-mono mt-0.5">
                                    Catalog SKU: {variant.sku}
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
                                    placeholder="e.g. TARUN-RED-S"
                                    className="w-full h-9 px-2.5 bg-white border border-[#D5D9D9] rounded-lg text-xs font-mono uppercase focus:border-[#007185] focus:outline-none"
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
                                      placeholder="List Price"
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
                          <Loader2 className="h-4 w-4 animate-spin text-[#0F1111]" />
                          <span>Publishing Offer &amp; Recalculating Buy Box...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 stroke-[3]" />
                          <span>Publish Seller Offer</span>
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
              <form onSubmit={handleSearch} className="bg-white rounded-2xl border border-[#D5D9D9] p-6 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-[#565959]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search master catalog by product name, brand, category, or barcode..."
                      className="w-full h-11 pl-10 pr-4 bg-white border border-[#D5D9D9] rounded-xl text-xs sm:text-sm font-medium focus:border-[#007185] focus:ring-2 focus:ring-[#007185]/20 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSearching}
                    className="w-full sm:w-auto h-11 px-6 rounded-xl bg-[#007185] hover:bg-[#005a6a] text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 shrink-0"
                  >
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    <span>Search Catalog</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-[#565959] pt-1">
                  <Info className="h-3.5 w-3.5 text-[#007185] shrink-0" />
                  <span>Tip: You can search directly by SKU or barcode to immediately locate the exact catalog master piece.</span>
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
                    {hasSearched ? `Catalog Results (${searchResults.length})` : 'Popular Master Catalog Listings'}
                  </h3>
                  <span className="text-xs text-[#565959]">
                    Select any piece to attach your independent seller offer
                  </span>
                </div>

                {isSearching ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-32 bg-white rounded-2xl border border-[#D5D9D9] p-4 animate-pulse" />
                    ))}
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-dashed border-[#D5D9D9] p-12 text-center space-y-3">
                    <Package className="h-10 w-10 text-[#565959]/40 mx-auto" />
                    <h4 className="font-headline font-bold text-base text-[#0F1111]">
                      No Matching Master Products Found
                    </h4>
                    <p className="text-xs text-[#565959] max-w-md mx-auto">
                      Could not find an existing product matching &quot;{searchQuery}&quot;. If your item is not yet in the Vyntra catalog, you can request a new master listing.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('request-new')}
                      className="px-5 py-2.5 rounded-xl bg-[#800020] text-white text-xs font-bold hover:bg-[#600018] shadow-sm transition-all inline-flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Request New Master Listing Instead</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {searchResults.map((prod) => (
                      <div
                        key={prod.id}
                        className="bg-white rounded-2xl border border-[#D5D9D9] hover:border-[#007185] p-4 shadow-sm transition-all flex items-start gap-4"
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
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-[#007185]/10 text-[#007185] uppercase">
                              {prod.category.name}
                            </span>
                            <span className="text-[10px] text-[#565959] font-medium">
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
                              <span className="line-through text-[#565959] text-[11px]">
                                {formatINR(prod.basePrice)}
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-[#565959] flex items-center gap-3 pt-1">
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
                                <span>Update My Offer</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSelectProductForOffer(prod)}
                                className="px-3.5 py-1.5 rounded-lg bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] text-xs font-bold transition-all shadow-sm border border-[#FCD200] flex items-center gap-1"
                              >
                                <Tag className="h-3 w-3" />
                                <span>Sell This Product</span>
                              </button>
                            )}

                            <Link
                              href={`/products/${prod.slug}`}
                              target="_blank"
                              className="p-1.5 text-[#565959] hover:text-[#007185] transition-colors"
                              title="Inspect live customer page"
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
      {/* 4. TAB 2: REQUEST NEW PRODUCT FLOW (ADMIN MODERATED) */}
      {/* ========================================================================= */}
      {activeTab === 'request-new' && (
        <div className="space-y-6">
          {/* Governance Notice Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3.5 text-xs text-amber-900">
            <Clock className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-headline font-bold text-sm text-[#0F1111]">
                Marketplace Governance Review Notice
              </h4>
              <p className="leading-relaxed">
                New master catalog pieces require moderation before appearing live on the customer storefront.
                Once an administrator approves your listing, it will become available for all eligible marketplace sellers to view, and your seller offer will activate automatically.
              </p>
            </div>
          </div>

          {/* Full Product Creation Architecture */}
          <ProductForm mode="create" />
        </div>
      )}
    </div>
  );
}
