'use client';

import { useCategoryProducts } from '@/hooks/use-category-products';
import React, { useState, useMemo, useRef, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ChevronRight,
  ChevronLeft,
  Star,
  Check,
  Heart,
  ShoppingCart,
  SlidersHorizontal,
  X,
  Sparkles,
  ShieldCheck,
  Gem,
  Award,
} from 'lucide-react';
import { FashionDepartmentSubNav } from '@/components/layout/fashion-department-subnav';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';

// ============================================================================
// 1. JEWELLERY SUBCATEGORIES (Exact match to Amazon Hierarchy in Screenshot 1)
// ============================================================================
const SIDEBAR_SUBCATEGORIES = [
  { name: 'Bangles & Bracelets', slug: 'bangles-bracelets' },
  { name: 'Pendants', slug: 'pendants' },
  { name: 'Mangalsutras & Tanmaniyas', slug: 'mangalsutras' },
  { name: 'Nose Rings & Pins', slug: 'nose-rings' },
  { name: 'Anklets', slug: 'anklets' },
  { name: 'Toe Rings', slug: 'toe-rings' },
  { name: 'Hair Accessories', slug: 'hair-accessories' },
  { name: 'Body Jewellery', slug: 'body-jewellery' },
  { name: 'Beads & Charms', slug: 'beads-charms' },
  { name: 'Loose Gemstones & Diamonds', slug: 'gemstones' },
  { name: 'Brooches & Pins', slug: 'brooches' },
  { name: 'Coins & Bars', slug: 'coins-bars' },
  { name: 'Earrings', slug: 'earrings' },
  { name: 'Jewelry Sets', slug: 'jewelry-sets' },
  { name: 'Necklaces', slug: 'necklaces' },
  { name: 'Rings', slug: 'rings' },
];

const FEATURED_PILLS = [
  { name: 'All Jewellery', slug: 'all' },
  { name: 'Gold & Diamond', slug: 'gold-diamond' },
  { name: 'Coins & Bars', slug: 'coins-bars' },
  { name: 'Pendants', slug: 'pendants' },
  { name: 'Earrings', slug: 'earrings' },
  { name: 'Jewelry Sets', slug: 'jewelry-sets' },
  { name: 'Necklaces', slug: 'necklaces' },
  { name: 'Rings', slug: 'rings' },
  { name: 'Bangles & Bracelets', slug: 'bangles-bracelets' },
  { name: 'Mangalsutras', slug: 'mangalsutras' },
  { name: 'Silver Jewellery', slug: 'silver-jewellery' },
];

// Brands (Exact match to Screenshot 2)
const BRANDS_LIST: string[] = [];

const METAL_TYPES = [
  { label: 'All Metals', val: 'all' },
  { label: '24K / 22K Gold', val: 'gold' },
  { label: '925 Sterling Silver', val: 'silver' },
  { label: 'Rose Gold', val: 'rose-gold' },
  { label: 'Gold Plated / Brass', val: 'gold-plated' },
  { label: 'Oxidised Silver', val: 'oxidised' },
];

const GEMSTONE_TYPES = [
  { label: 'All Stones', val: 'all' },
  { label: 'Real Diamond', val: 'diamond' },
  { label: 'Freshwater Pearl', val: 'pearl' },
  { label: 'Cubic Zirconia (CZ)', val: 'cz' },
  { label: 'Kundan & Polki', val: 'kundan' },
  { label: 'American Diamond', val: 'ad' },
];

// Rich Product Catalog for Women's Jewellery
interface JewelleryProduct {
  id: string;
  slug: string;
  title: string;
  brand: string;
  category: string;
  metalType?: string;
  gemstoneType?: string;
  price: number;
  originalPrice: number;
  discount: string;
  rating: number;
  reviews: number;
  boughtPastMonth?: string;
  isBestSeller?: boolean;
  isQualityVerified?: boolean;
  isPrime: boolean;
  deliveryDate: string;
  image: string;
}

const JEWELLERY_PRODUCTS : JewelleryProduct[] = [];

// ============================================================================
// MAIN JEWELLERY CONTENT COMPONENT
// ============================================================================
function WomensJewelleryContent() {
  const { products: liveDbProducts, dynamicBrands } = useCategoryProducts({ categoryKey: 'womens-jewellery' });
  const searchParams = useSearchParams();
  const subParam = searchParams?.get('sub') || 'all';

  // Filters state
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>(subParam);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedMetal, setSelectedMetal] = useState<string>('all');
  const [selectedStone, setSelectedStone] = useState<string>('all');
  const [primeOnly, setPrimeOnly] = useState<boolean>(false);
  const [priceRange, setPriceRange] = useState<string>('all');
  const [minRating, setMinRating] = useState<number>(0);
  const [minDiscount, setMinDiscount] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>('featured');
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [addedItemNotice, setAddedItemNotice] = useState<string | null>(null);

  const addItem = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.openCart);

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const toggleWishlist = (id: string) => {
    setWishlist((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleAddToCart = (product: JewelleryProduct) => {
    addItem({
      id: product.id,
      productId: product.id,
      title: product.title,
      brand: product.brand,
      variantId: `var-${product.id}`,
      size: 'Standard',
      color: 'Default',
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      quantity: 1,
      vendorName: product.brand,
    });
    openCart();
    setAddedItemNotice(product.id);
    setTimeout(() => setAddedItemNotice(null), 2500);
  };

  const clearAllFilters = () => {
    setSelectedSubCategory('all');
    setSelectedBrands([]);
    setSelectedMetal('all');
    setSelectedStone('all');
    setPrimeOnly(false);
    setPriceRange('all');
    setMinRating(0);
    setMinDiscount(0);
  };

  const hasActiveFilters =
    selectedSubCategory !== 'all' ||
    selectedBrands.length > 0 ||
    selectedMetal !== 'all' ||
    selectedStone !== 'all' ||
    primeOnly ||
    priceRange !== 'all' ||
    minRating > 0 ||
    minDiscount > 0;

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    let result = [...liveDbProducts];

    if (selectedSubCategory !== 'all') {
      if (selectedSubCategory === 'gold-diamond') {
        result = result.filter(
          (p) => p.metalType === 'gold' || p.gemstoneType === 'diamond'
        );
      } else if (selectedSubCategory === 'silver-jewellery') {
        result = result.filter(
          (p) => p.metalType === 'silver' || p.metalType === 'oxidised'
        );
      } else if (selectedSubCategory === 'traditional-kundan') {
        result = result.filter((p) => p.gemstoneType === 'kundan');
      } else {
        result = result.filter((p) => {
        const sub = selectedSubCategory.toLowerCase();
        return (
          p.category?.toLowerCase().includes(sub) ||
          p.subcategory?.toLowerCase().includes(sub) ||
          p.subCategory?.toLowerCase().includes(sub) ||
          p.title?.toLowerCase().includes(sub)
        );
      });
      }
    }

    if (selectedBrands.length > 0) {
      result = result.filter((p) => selectedBrands.includes(p.brand));
    }

    if (selectedMetal !== 'all') {
      result = result.filter((p) => p.metalType === selectedMetal);
    }

    if (selectedStone !== 'all') {
      result = result.filter((p) => p.gemstoneType === selectedStone);
    }

    if (primeOnly) {
      result = result.filter((p) => p.isPrime);
    }

    if (minRating > 0) {
      result = result.filter((p) => p.rating >= minRating);
    }

    if (minDiscount > 0) {
      result = result.filter((p) => {
        const discNum = parseInt(p.discount.replace('% off', ''), 10) || 0;
        return discNum >= minDiscount;
      });
    }

    if (priceRange !== 'all') {
      if (priceRange === 'under-250') result = result.filter((p) => p.price < 250);
      else if (priceRange === '250-500') result = result.filter((p) => p.price >= 250 && p.price <= 500);
      else if (priceRange === '500-1000') result = result.filter((p) => p.price >= 500 && p.price <= 1000);
      else if (priceRange === '1000-5000') result = result.filter((p) => p.price >= 1000 && p.price <= 5000);
      else if (priceRange === '5000-10000') result = result.filter((p) => p.price >= 5000 && p.price <= 10000);
      else if (priceRange === 'over-10000') result = result.filter((p) => p.price > 10000);
    }

    if (sortBy === 'price-low') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      result.sort((a, b) => b.rating - a.rating);
    }

    return result;
  }, [
    liveDbProducts,
    selectedSubCategory,
    selectedBrands,
    selectedMetal,
    selectedStone,
    primeOnly,
    priceRange,
    minRating,
    minDiscount,
    sortBy,
  ]);

  const activeSubcategoryData = useMemo(() => {
    return (
      FEATURED_PILLS.find((b) => b.slug === selectedSubCategory) ||
      SIDEBAR_SUBCATEGORIES.find((b) => b.slug === selectedSubCategory)
    );
  }, [selectedSubCategory]);

  return (
    <div className="w-full bg-[#FFFFFF] min-h-screen text-[#0F1111]">
      {/* 1. Department Sub-Nav Bar */}
      <FashionDepartmentSubNav activeItem="women" />

      {/* 2. Amazon Fashion Breadcrumbs */}
      <div className="border-b border-[#E7E7E7] bg-[#FAFAFA] py-2 px-4 sm:px-6">
        <div className="max-w-[1450px] mx-auto flex items-center gap-1.5 text-xs text-[#565959]">
          <Link href="/products?category=fashion" className="hover:text-[#C45500] hover:underline">
            Vyntra Fashion
          </Link>
          <ChevronRight className="h-3 w-3 text-stone-400" />
          <Link href="/products?category=women" className="hover:text-[#C45500] hover:underline">
            Women
          </Link>
          <ChevronRight className="h-3 w-3 text-stone-400" />
          <span className="font-semibold text-[#0F1111]">Jewellery</span>
        </div>
      </div>

      {/* 3. Main Layout: Narrow Amazon Sidebar (210px) + Expansive Main Area */}
      <div className="max-w-[1450px] mx-auto px-4 sm:px-6 py-5">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* ========================================================================= */}
          {/* LEFT SIDEBAR: Categories & Filters (Exact match to Screenshots 1 & 2)      */}
          {/* ========================================================================= */}
          <aside className="w-full lg:w-[210px] lg:flex-shrink-0 space-y-5 lg:border-r lg:border-[#E7E7E7] lg:pr-5">
            {/* Category Hierarchy */}
            <div>
              <h3 className="text-sm font-bold text-[#0F1111] mb-2 uppercase tracking-wider">
                Category
              </h3>
              <div className="text-xs space-y-1.5 text-[#565959]">
                <Link
                  href="/products?category=fashion"
                  className="flex items-center gap-1 hover:text-[#C45500] hover:underline"
                >
                  <ChevronLeft className="h-3 w-3" /> Jewellery
                </Link>
                <div className="font-bold text-[#0F1111] pl-3 py-0.5 text-[13px]">
                  Women
                </div>
              </div>

              {/* 16 Subcategories list (Exact match to Screenshot 1) */}
              <ul className="mt-2 pl-4 space-y-1 text-xs text-[#0F1111] max-h-72 overflow-y-auto pr-1">
                {SIDEBAR_SUBCATEGORIES.map((cat) => {
                  const isActive = selectedSubCategory === cat.slug;
                  return (
                    <li key={cat.name}>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedSubCategory((prev) => (prev === cat.slug ? 'all' : cat.slug))
                        }
                        className={`text-left hover:text-[#C45500] hover:underline transition-colors cursor-pointer leading-relaxed ${
                          isActive ? 'font-bold text-[#C45500]' : 'text-[#0F1111]'
                        }`}
                      >
                        {cat.name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Brands Filter (Exact match to Screenshot 2) */}
            {dynamicBrands.length > 0 && (
<div className="border-t border-[#E7E7E7] pt-4">
              <h4 className="text-xs font-bold text-[#0F1111] mb-2">Brands</h4>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {dynamicBrands.map((brand) => {
                  const checked = selectedBrands.includes(brand);
                  return (
                    <label
                      key={brand}
                      className="flex items-center gap-2 cursor-pointer text-xs select-none hover:text-[#C45500]"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleBrand(brand)}
                        className="rounded text-[#007185] focus:ring-[#007185] h-3.5 w-3.5"
                      />
                      <span className={checked ? 'font-bold text-[#0F1111]' : 'text-[#333333]'}>
                        {brand}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
            )}

            {/* Price Filter (Exact match to Screenshot 2) */}
            <div className="border-t border-[#E7E7E7] pt-4">
              <h4 className="text-xs font-bold text-[#0F1111] mb-2">Price</h4>
              <div className="space-y-1 text-xs">
                {[
                  { label: 'All Prices', val: 'all' },
                  { label: 'Under ₹250', val: 'under-250' },
                  { label: '₹250 - ₹500', val: '250-500' },
                  { label: '₹500 - ₹1,000', val: '500-1000' },
                  { label: '₹1,000 - ₹5,000', val: '1000-5000' },
                  { label: '₹5,000 - ₹10,000', val: '5000-10000' },
                  { label: 'Over ₹10,000', val: 'over-10000' },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setPriceRange(item.val)}
                    className={`block w-full text-left py-0.5 hover:text-[#C45500] cursor-pointer ${
                      priceRange === item.val
                        ? 'font-bold text-[#C45500]'
                        : 'text-[#0F1111]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Metal Type Filter */}
            <div className="border-t border-[#E7E7E7] pt-4">
              <h4 className="text-xs font-bold text-[#0F1111] mb-2">Metal Type</h4>
              <div className="space-y-1 text-xs">
                {METAL_TYPES.map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setSelectedMetal(item.val)}
                    className={`block w-full text-left py-0.5 hover:text-[#C45500] cursor-pointer ${
                      selectedMetal === item.val
                        ? 'font-bold text-[#C45500]'
                        : 'text-[#0F1111]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Gemstone Type Filter */}
            <div className="border-t border-[#E7E7E7] pt-4">
              <h4 className="text-xs font-bold text-[#0F1111] mb-2">Gemstone Type</h4>
              <div className="space-y-1 text-xs">
                {GEMSTONE_TYPES.map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setSelectedStone(item.val)}
                    className={`block w-full text-left py-0.5 hover:text-[#C45500] cursor-pointer ${
                      selectedStone === item.val
                        ? 'font-bold text-[#C45500]'
                        : 'text-[#0F1111]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Customer Review Filter */}
            <div className="border-t border-[#E7E7E7] pt-4">
              <h4 className="text-xs font-bold text-[#0F1111] mb-2">Customer Review</h4>
              <div className="space-y-1.5 text-xs">
                {[4, 3].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setMinRating((prev) => (prev === star ? 0 : star))}
                    className={`flex items-center gap-1.5 hover:text-[#C45500] cursor-pointer ${
                      minRating === star ? 'font-bold text-[#C45500]' : 'text-[#0F1111]'
                    }`}
                  >
                    <div className="flex text-[#DE7921]">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${
                            i < star ? 'fill-[#DE7921]' : 'text-stone-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs">&amp; Up</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Discount Filter */}
            <div className="border-t border-[#E7E7E7] pt-4">
              <h4 className="text-xs font-bold text-[#0F1111] mb-2">Discount</h4>
              <div className="space-y-1 text-xs">
                {[
                  { label: '10% Off or more', val: 10 },
                  { label: '25% Off or more', val: 25 },
                  { label: '35% Off or more', val: 35 },
                  { label: '50% Off or more', val: 50 },
                  { label: '70% Off or more', val: 70 },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() =>
                      setMinDiscount((prev) => (prev === item.val ? 0 : item.val))
                    }
                    className={`block w-full text-left py-0.5 hover:text-[#C45500] cursor-pointer ${
                      minDiscount === item.val
                        ? 'font-bold text-[#C45500]'
                        : 'text-[#0F1111]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear All Filters */}
            {hasActiveFilters && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="w-full py-1.5 text-xs text-[#007185] hover:text-[#C45500] hover:underline font-semibold border border-stone-300 rounded cursor-pointer"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </aside>

          {/* ========================================================================= */}
          {/* MAIN STOREFRONT AREA: Header Bar + Category Pills + Product Catalog       */}
          {/* ========================================================================= */}
          <main className="flex-1 min-w-0 space-y-6">
            {/* 1. RESULTS HEADER BAR (Exact text from Screenshot 1) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-stone-200 gap-3">
              <div>
                <p className="text-sm text-[#0F1111]">
                  1-12 of over 40,000 results for{' '}
                  <span className="font-bold text-[#C45500]">
                    {activeSubcategoryData ? activeSubcategoryData.name : 'Women'}
                  </span>
                </p>
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#565959]">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  aria-label="Sort jewellery by"
                  className="border border-stone-300 bg-[#F0F2F2] rounded-md px-2.5 py-1 text-xs text-[#0F1111] focus:ring-[#007185] focus:border-[#007185] cursor-pointer"
                >
                  <option value="featured">Featured</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Avg. Customer Review</option>
                </select>
              </div>
            </div>

            {/* 2. CATEGORY PILLS FILTER BAR */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scroll-smooth scrollbar-none">
              {FEATURED_PILLS.map((pill) => {
                const isSelected = selectedSubCategory === pill.slug;
                return (
                  <button
                    key={pill.slug}
                    type="button"
                    onClick={() =>
                      setSelectedSubCategory((prev) =>
                        prev === pill.slug ? 'all' : pill.slug
                      )
                    }
                    className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#007185] text-white shadow-xs font-semibold'
                        : 'bg-stone-100 text-[#0F1111] hover:bg-stone-200 border border-stone-200'
                    }`}
                  >
                    {pill.name}
                  </button>
                );
              })}
            </div>

            {/* Active Filter Chips */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-xs text-[#565959]">Active filters:</span>
                {selectedSubCategory !== 'all' && (
                  <span className="inline-flex items-center gap-1 bg-stone-100 border border-stone-300 rounded-full px-2.5 py-0.5 text-xs text-[#0F1111]">
                    {activeSubcategoryData?.name || selectedSubCategory}
                    <button
                      type="button"
                      onClick={() => setSelectedSubCategory('all')}
                      className="hover:text-[#C45500]"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {selectedBrands.map((b) => (
                  <span
                    key={b}
                    className="inline-flex items-center gap-1 bg-stone-100 border border-stone-300 rounded-full px-2.5 py-0.5 text-xs text-[#0F1111]"
                  >
                    {b}
                    <button
                      type="button"
                      onClick={() => toggleBrand(b)}
                      className="hover:text-[#C45500]"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {primeOnly && (
                  <span className="inline-flex items-center gap-1 bg-stone-100 border border-stone-300 rounded-full px-2.5 py-0.5 text-xs text-[#007185] font-bold italic">
                    Vyntra Express
                    <button
                      type="button"
                      onClick={() => setPrimeOnly(false)}
                      className="hover:text-[#C45500]"
                    >
                      <X className="h-3 w-3 text-[#0F1111]" />
                    </button>
                  </span>
                )}
                {priceRange !== 'all' && (
                  <span className="inline-flex items-center gap-1 bg-stone-100 border border-stone-300 rounded-full px-2.5 py-0.5 text-xs text-[#0F1111]">
                    Price: {priceRange}
                    <button
                      type="button"
                      onClick={() => setPriceRange('all')}
                      className="hover:text-[#C45500]"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {selectedMetal !== 'all' && (
                  <span className="inline-flex items-center gap-1 bg-stone-100 border border-stone-300 rounded-full px-2.5 py-0.5 text-xs text-[#0F1111]">
                    Metal: {selectedMetal}
                    <button
                      type="button"
                      onClick={() => setSelectedMetal('all')}
                      className="hover:text-[#C45500]"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-xs text-[#007185] hover:text-[#C45500] hover:underline font-semibold ml-1 cursor-pointer"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* 3. PRODUCT CATALOG GRID (Exact layout from Screenshots 1 & 2) */}
            {filteredProducts.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <p className="text-base text-stone-600">
                  No jewellery matched your active filters.
                </p>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="px-4 py-2 bg-[#FFD814] hover:bg-[#F7CA00] text-xs font-semibold rounded-full shadow-xs cursor-pointer"
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {filteredProducts.map((product) => {
                  const isWish = wishlist.includes(product.id);
                  return (
                    <div
                      key={product.id}
                      className="group relative bg-white border border-stone-200 hover:border-stone-400 rounded-lg p-3 hover:shadow-lg transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Image & Badges */}
                        <div className="relative aspect-square w-full rounded-md overflow-hidden bg-stone-50 mb-3 flex items-center justify-center">
                          <Image
                            src={product.image}
                            alt={product.title}
                            fill
                            unoptimized
                            className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />

                          {/* Wishlist Heart */}
                          <button
                            type="button"
                            onClick={() => toggleWishlist(product.id)}
                            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-xs text-stone-600 hover:text-rose-600 transition-colors z-10 cursor-pointer"
                            aria-label="Wishlist"
                          >
                            <Heart
                              className={`h-4 w-4 ${
                                isWish ? 'fill-rose-600 text-rose-600' : ''
                              }`}
                            />
                          </button>

                          {/* Best Seller Badge (Exact orange badge from Screenshot 1) */}
                          {product.isBestSeller && (
                            <span className="absolute top-2 left-2 bg-[#E67A00] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs uppercase tracking-wider">
                              Best seller
                            </span>
                          )}
                        </div>

                        {/* Brand & Title */}
                        <p className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                          {product.brand}
                        </p>
                        <h3 className="text-xs sm:text-[13px] font-medium text-[#0F1111] line-clamp-2 leading-tight hover:text-[#C45500] cursor-pointer mt-0.5">
                          {product.title}
                        </h3>

                        {/* Rating & Reviews */}
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="text-xs font-bold text-[#0F1111]">
                            {product.rating}
                          </span>
                          <div className="flex text-[#DE7921]">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${
                                  i < Math.floor(product.rating)
                                    ? 'fill-[#DE7921]'
                                    : 'text-stone-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-[#007185] hover:underline cursor-pointer">
                            ({product.reviews})
                          </span>
                        </div>

                        {/* "3K+ bought in past month" Social Proof (Screenshot 2) */}
                        {product.boughtPastMonth && (
                          <p className="text-[11px] text-[#565959] mt-0.5">
                            {product.boughtPastMonth}
                          </p>
                        )}

                        {/* Price & Discount */}
                        <div className="mt-2 flex items-baseline gap-1.5">
                          <span className="text-lg font-bold text-[#0F1111]">
                            ₹{product.price.toLocaleString('en-IN')}
                          </span>
                          <span className="text-xs text-[#565959] line-through">
                            ₹{product.originalPrice.toLocaleString('en-IN')}
                          </span>
                          <span className="text-xs text-[#565959]">
                            ({product.discount})
                          </span>
                        </div>

                        {/* Prime Badge & Delivery Details */}
                        <div className="mt-1 space-y-0.5">
                          <p className="text-xs text-[#0F1111]">
                            <span className="font-semibold">FREE delivery</span>{' '}
                            <span className="font-bold">{product.deliveryDate}</span>
                          </p>
                          {product.isQualityVerified && (
                            <p className="text-[11px] text-[#007600] font-semibold flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-[#007600]" /> Quality verified
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Add to Cart Button */}
                      <div className="mt-3 pt-2">
                        <button
                          type="button"
                          onClick={() => handleAddToCart(product)}
                          className="w-full bg-[#FFD814] hover:bg-[#F7CA00] active:scale-[0.98] text-[#0F1111] text-xs font-semibold py-2 rounded-full shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <ShoppingCart className="h-3.5 w-3.5" />
                          {addedItemNotice === product.id ? '✓ Added to Cart' : 'Add to Cart'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function WomensJewelleryPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-screen bg-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-800" />
        </div>
      }
    >
      <WomensJewelleryContent />
    </Suspense>
  );
}
