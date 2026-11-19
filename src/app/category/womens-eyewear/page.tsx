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
  Eye,
} from 'lucide-react';
import { FashionDepartmentSubNav } from '@/components/layout/fashion-department-subnav';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';

// ============================================================================
// 1. VISUAL BUBBLES (Extracted from Amazon Screenshot)
// ============================================================================
interface EyewearBubble {
  id: string;
  name: string;
  slug: string;
  image: string;
}

const EYEWEAR_VISUAL_BUBBLES: EyewearBubble[] = [
  {
    id: 'reading-glasses',
    name: 'Reading Glasses',
    slug: 'reading-glasses',
    image: '/images/eyewear-bubbles/reading-glasses.png',
  },
  {
    id: 'sunglasses',
    name: 'Sunglasses',
    slug: 'sunglasses',
    image: '/images/eyewear-bubbles/sunglasses.png',
  },
  {
    id: 'eyewear-frames',
    name: 'Eyewear Frames',
    slug: 'eyewear-frames',
    image: '/images/eyewear-bubbles/eyewear-frames.png',
  },
  {
    id: 'glasses-cases',
    name: 'Glasses Cases',
    slug: 'glasses-cases',
    image: '/images/eyewear-bubbles/glasses-cases.png',
  },
  {
    id: 'chains-lanyards',
    name: 'Glasses Chains & Lanyards',
    slug: 'chains-lanyards',
    image: '/images/eyewear-bubbles/chains-lanyards.png',
  },
];

// Left Sidebar Subcategories (Amazon Hierarchy)
const SIDEBAR_SUBCATEGORIES = [
  { name: 'Sunglasses', slug: 'sunglasses' },
  { name: 'Eyewear Frames', slug: 'eyewear-frames' },
  { name: 'Reading Glasses', slug: 'reading-glasses' },
  { name: 'Glasses Cases', slug: 'glasses-cases' },
  { name: 'Glasses Chains & Lanyards', slug: 'chains-lanyards' },
];

const BRANDS_LIST: string[] = [];

const FRAME_SHAPES = [
  { label: 'All Shapes', val: 'all' },
  { label: 'Aviator', val: 'aviator' },
  { label: 'Wayfarer', val: 'wayfarer' },
  { label: 'Cat Eye', val: 'cat-eye' },
  { label: 'Round & Oval', val: 'round' },
  { label: 'Rectangle & Square', val: 'rectangle' },
  { label: 'Geometric / Hexagonal', val: 'geometric' },
];

const FRAME_MATERIALS = [
  { label: 'All Materials', val: 'all' },
  { label: 'Acetate', val: 'acetate' },
  { label: 'Metal', val: 'metal' },
  { label: 'TR-90 Polymer', val: 'tr90' },
  { label: 'Titanium', val: 'titanium' },
];

// Top Brand Deals on Offer
const TOP_BRAND_DEALS: any[] = [];

// Rich Product Catalog for Eyewear
interface EyewearProduct {
  id: string;
  slug: string;
  title: string;
  brand: string;
  category: 'sunglasses' | 'eyewear-frames' | 'reading-glasses' | 'glasses-cases' | 'chains-lanyards';
  shape?: string;
  material?: string;
  price: number;
  originalPrice: number;
  discount: string;
  rating: number;
  reviews: number;
  isBestSeller?: boolean;
  isHotRelease?: boolean;
  isPrime: boolean;
  deliveryDate: string;
  image: string;
}

const EYEWEAR_PRODUCTS : EyewearProduct[] = [];

// ============================================================================
// MAIN EYEWEAR CONTENT COMPONENT
// ============================================================================
function WomensEyewearContent() {
  const { products: liveDbProducts, dynamicBrands } = useCategoryProducts({ categoryKey: 'womens-eyewear' });
  const searchParams = useSearchParams();
  const subParam = searchParams?.get('sub') || 'all';

  // Filters state
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>(subParam);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedShape, setSelectedShape] = useState<string>('all');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('all');
  const [primeOnly, setPrimeOnly] = useState<boolean>(false);
  const [priceRange, setPriceRange] = useState<string>('all');
  const [minRating, setMinRating] = useState<number>(0);
  const [minDiscount, setMinDiscount] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>('featured');
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [addedItemNotice, setAddedItemNotice] = useState<string | null>(null);

  // Auto-hiding horizontal scrollbar
  const bubbleScrollRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const addItem = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.openCart);

  const handleBubbleScroll = () => {
    setIsScrolling(true);
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 1000);
  };

  const scrollBubbles = (direction: 'left' | 'right') => {
    if (bubbleScrollRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      bubbleScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

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

  const handleAddToCart = (product: any) => {
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
    setSelectedShape('all');
    setSelectedMaterial('all');
    setPrimeOnly(false);
    setPriceRange('all');
    setMinRating(0);
    setMinDiscount(0);
  };

  const hasActiveFilters =
    selectedSubCategory !== 'all' ||
    selectedBrands.length > 0 ||
    selectedShape !== 'all' ||
    selectedMaterial !== 'all' ||
    primeOnly ||
    priceRange !== 'all' ||
    minRating > 0 ||
    minDiscount > 0;

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    let result = [...liveDbProducts];

    if (selectedSubCategory !== 'all') {
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

    if (selectedBrands.length > 0) {
      result = result.filter((p) => selectedBrands.includes(p.brand));
    }

    if (selectedShape !== 'all') {
      result = result.filter((p) => p.shape === selectedShape);
    }

    if (selectedMaterial !== 'all') {
      result = result.filter((p) => p.material === selectedMaterial);
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
      if (priceRange === 'under-500') result = result.filter((p) => p.price < 500);
      else if (priceRange === '500-1000') result = result.filter((p) => p.price >= 500 && p.price <= 1000);
      else if (priceRange === '1000-2500') result = result.filter((p) => p.price >= 1000 && p.price <= 2500);
      else if (priceRange === '2500-5000') result = result.filter((p) => p.price >= 2500 && p.price <= 5000);
      else if (priceRange === 'over-5000') result = result.filter((p) => p.price > 5000);
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
    selectedShape,
    selectedMaterial,
    primeOnly,
    priceRange,
    minRating,
    minDiscount,
    sortBy,
  ]);

  const hotNewReleases = useMemo(() => {
    return EYEWEAR_PRODUCTS.filter((p) => p.isHotRelease);
  }, []);

  const activeSubcategoryData = useMemo(() => {
    return EYEWEAR_VISUAL_BUBBLES.find((b) => b.slug === selectedSubCategory);
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
          <span className="font-semibold text-[#0F1111]">Sunglasses &amp; Spectacle Frames</span>
        </div>
      </div>

      {/* 3. Main Layout: Narrow Amazon Sidebar (210px) + Expansive Main Area */}
      <div className="max-w-[1450px] mx-auto px-4 sm:px-6 py-5">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* ========================================================================= */}
          {/* LEFT SIDEBAR: Categories & Filters (Compact Amazon Width: 210px)           */}
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
                  <ChevronLeft className="h-3 w-3" /> Clothing &amp; Accessories
                </Link>
                <Link
                  href="/products?category=women"
                  className="flex items-center gap-1 hover:text-[#C45500] hover:underline pl-2"
                >
                  <ChevronLeft className="h-3 w-3" /> Women
                </Link>
                <div className="font-bold text-[#0F1111] pl-4 py-0.5 text-[13px] leading-tight">
                  Sunglasses &amp; Spectacle Frames
                </div>
              </div>

              {/* Subcategories list */}
              <ul className="mt-2 pl-6 space-y-1.5 text-xs text-[#0F1111]">
                {SIDEBAR_SUBCATEGORIES.map((cat) => {
                  const isActive = selectedSubCategory === cat.slug;
                  return (
                    <li key={cat.name}>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedSubCategory((prev) => (prev === cat.slug ? 'all' : cat.slug))
                        }
                        className={`text-left hover:text-[#C45500] hover:underline transition-colors cursor-pointer ${
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

            {/* Amazon Prime Filter */}
            <div className="border-t border-[#E7E7E7] pt-4">
              <h4 className="text-xs font-bold text-[#0F1111] mb-2">Amazon Prime</h4>
              <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                <input
                  type="checkbox"
                  checked={primeOnly}
                  onChange={(e) => setPrimeOnly(e.target.checked)}
                  className="rounded text-[#007185] focus:ring-[#007185] h-3.5 w-3.5"
                />
                <span className="font-bold italic text-[#007185] text-sm tracking-tight">
                  ✓prime
                </span>
              </label>
            </div>

            {/* Brands Filter */}
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

            {/* Price Filter */}
            <div className="border-t border-[#E7E7E7] pt-4">
              <h4 className="text-xs font-bold text-[#0F1111] mb-2">Price</h4>
              <div className="space-y-1 text-xs">
                {[
                  { label: 'All Prices', val: 'all' },
                  { label: 'Under ₹500', val: 'under-500' },
                  { label: '₹500 - ₹1,000', val: '500-1000' },
                  { label: '₹1,000 - ₹2,500', val: '1000-2500' },
                  { label: '₹2,500 - ₹5,000', val: '2500-5000' },
                  { label: 'Over ₹5,000', val: 'over-5000' },
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

            {/* Frame Shape Filter */}
            <div className="border-t border-[#E7E7E7] pt-4">
              <h4 className="text-xs font-bold text-[#0F1111] mb-2">Frame Shape</h4>
              <div className="space-y-1 text-xs">
                {FRAME_SHAPES.map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setSelectedShape(item.val)}
                    className={`block w-full text-left py-0.5 hover:text-[#C45500] cursor-pointer ${
                      selectedShape === item.val
                        ? 'font-bold text-[#C45500]'
                        : 'text-[#0F1111]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Frame Material Filter */}
            <div className="border-t border-[#E7E7E7] pt-4">
              <h4 className="text-xs font-bold text-[#0F1111] mb-2">Frame Material</h4>
              <div className="space-y-1 text-xs">
                {FRAME_MATERIALS.map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setSelectedMaterial(item.val)}
                    className={`block w-full text-left py-0.5 hover:text-[#C45500] cursor-pointer ${
                      selectedMaterial === item.val
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
          {/* MAIN STOREFRONT AREA: Featured Categories + Hot Releases + Product Grid   */}
          {/* ========================================================================= */}
          <main className="flex-1 min-w-0 space-y-7">
            {/* 1. "FEATURED CATEGORIES" CIRCULAR BUBBLES SECTION (Exact match to Amazon) */}
            <section className="relative group/bubbles">
              <h2 className="text-[19px] sm:text-[21px] font-bold text-[#0F1111] mb-4 tracking-tight">
                Featured categories
              </h2>

              {/* Left Arrow Button */}
              <button
                type="button"
                onClick={() => scrollBubbles('left')}
                className="hidden sm:flex absolute -left-3 top-[58%] -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/95 shadow-md border border-stone-200 items-center justify-center text-stone-700 hover:text-black hover:bg-white hover:scale-105 active:scale-95 transition-all opacity-0 group-hover/bubbles:opacity-100 cursor-pointer"
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Scrollable Container (Auto-hiding scrollbar) */}
              <div
                ref={bubbleScrollRef}
                onScroll={handleBubbleScroll}
                className={`flex items-center overflow-x-auto pb-3 gap-6 sm:gap-10 scroll-smooth scroll-on-interaction ${
                  isScrolling ? 'is-scrolling' : ''
                }`}
              >
                {EYEWEAR_VISUAL_BUBBLES.map((bubble) => {
                  const isSelected = selectedSubCategory === bubble.slug;
                  return (
                    <button
                      key={bubble.id}
                      type="button"
                      onClick={() =>
                        setSelectedSubCategory((prev) =>
                          prev === bubble.slug ? 'all' : bubble.slug
                        )
                      }
                      className="group flex flex-col items-center flex-shrink-0 cursor-pointer select-none text-center focus:outline-none"
                    >
                      {/* Bubble image */}
                      <div
                        className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-full transition-transform duration-200 group-hover:scale-105 ${
                          isSelected
                            ? 'scale-110 ring-3 ring-[#007185] ring-offset-2 shadow-md'
                            : 'shadow-xs'
                        }`}
                      >
                        <Image
                          src={bubble.image}
                          alt={bubble.name}
                          fill
                          unoptimized
                          priority
                          className="object-contain rounded-full transition-transform duration-300 pointer-events-none"
                          sizes="(max-width: 640px) 96px, 120px"
                        />
                      </div>

                      {/* Bubble Label */}
                      <span
                        className={`mt-2 text-xs sm:text-[13px] max-w-[110px] leading-tight transition-colors ${
                          isSelected
                            ? 'font-bold text-[#C7511F] underline decoration-2 underline-offset-4'
                            : 'font-medium text-[#0F1111] group-hover:text-[#007185]'
                        }`}
                      >
                        {bubble.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Right Arrow Button */}
              <button
                type="button"
                onClick={() => scrollBubbles('right')}
                className="hidden sm:flex absolute -right-3 top-[58%] -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/95 shadow-md border border-stone-200 items-center justify-center text-stone-700 hover:text-black hover:bg-white hover:scale-105 active:scale-95 transition-all opacity-0 group-hover/bubbles:opacity-100 cursor-pointer"
                aria-label="Scroll right"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </section>

            {/* 2. "HOT NEW RELEASES" SECTION (Only shown when items exist) */}
            {hotNewReleases.length > 0 && (
              <section className="space-y-3 bg-[#FAFAFA] p-4 sm:p-5 rounded-xl border border-stone-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[17px] sm:text-[19px] font-bold text-[#0F1111] tracking-tight">
                      Hot new releases
                    </h2>
                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                      <Sparkles className="w-3 h-3 text-amber-600" /> Trending Now
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedSubCategory('all')}
                    className="text-xs text-[#007185] hover:text-[#C45500] hover:underline font-medium cursor-pointer"
                  >
                    See more
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {hotNewReleases.slice(0, 4).map((item) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-lg p-2.5 border border-stone-200 hover:shadow-md transition-shadow flex flex-col justify-between"
                    >
                      <div className="relative aspect-square w-full rounded-md overflow-hidden bg-stone-50 mb-2">
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          unoptimized
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                        <span className="absolute top-1.5 left-1.5 bg-[#B12704] text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                          Hot Release
                        </span>
                      </div>

                      <div>
                        <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                          {item.brand}
                        </p>
                        <h3 className="text-xs font-medium text-[#0F1111] line-clamp-2 leading-tight hover:text-[#C45500] cursor-pointer mt-0.5">
                          {item.title}
                        </h3>
                        <div className="flex items-center gap-1 mt-1">
                          <div className="flex text-[#DE7921]">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${
                                  i < Math.floor(item.rating)
                                    ? 'fill-[#DE7921]'
                                    : 'text-stone-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] text-[#565959]">({item.reviews})</span>
                        </div>
                        <div className="mt-1 flex items-baseline gap-1.5">
                          <span className="text-sm font-bold text-[#0F1111]">
                            ₹{item.price.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[11px] text-[#565959] line-through">
                            ₹{item.originalPrice.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddToCart(item)}
                        className="mt-2.5 w-full bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] text-xs font-medium py-1.5 rounded-full cursor-pointer shadow-xs active:scale-95 transition-all text-center"
                      >
                        {addedItemNotice === item.id ? '✓ Added' : 'Add to Cart'}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 3. TOP EYEWEAR BRANDS ON OFFER (Only shown when deals exist) */}
            {TOP_BRAND_DEALS.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-[17px] sm:text-[19px] font-bold text-[#0F1111] tracking-tight">
                  Top brands on offer
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 sm:gap-3">
                  {TOP_BRAND_DEALS.map((deal) => {
                    const isBrandActive = selectedBrands.includes(deal.brand);
                    return (
                      <button
                        key={deal.id}
                        type="button"
                        onClick={() => toggleBrand(deal.brand)}
                        className={`group relative rounded-xl overflow-hidden transition-all duration-200 text-left bg-white border flex flex-col justify-between ${
                          isBrandActive
                            ? 'ring-3 ring-[#007185] border-transparent shadow-md scale-[1.03]'
                            : 'border-stone-200 hover:border-stone-400 hover:shadow-md hover:scale-[1.02]'
                        }`}
                      >
                        <div className="relative aspect-[4/5] w-full overflow-hidden bg-stone-100">
                          <Image
                            src={deal.image}
                            alt={deal.brand}
                            fill
                            unoptimized
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                          <span
                            className={`absolute top-2 left-2 text-[10px] font-bold text-white px-2 py-0.5 rounded shadow-sm ${deal.tagBg}`}
                          >
                            {deal.tag}
                          </span>
                          <div className="absolute bottom-2 left-2 right-2 text-white">
                            <p className="text-xs font-bold leading-tight">{deal.brand}</p>
                            <p className="text-sm font-extrabold text-[#FFE600]">{deal.offer}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 4. PRODUCT CATALOG GRID */}
            <section className="space-y-4 pt-2">
              {/* Results Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-200 gap-3">
                <div>
                  <h1 className="text-base sm:text-lg font-bold text-[#0F1111]">
                    {activeSubcategoryData
                      ? activeSubcategoryData.name
                      : "Women's Sunglasses & Eyewear"}
                  </h1>
                  <p className="text-xs text-[#565959] mt-0.5">
                    Showing {filteredProducts.length} results
                    {hasActiveFilters && ' (filtered)'}
                  </p>
                </div>

                {/* Sort Dropdown */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[#565959]">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    aria-label="Sort products by"
                    className="border border-stone-300 bg-[#F0F2F2] rounded-md px-2.5 py-1 text-xs text-[#0F1111] focus:ring-[#007185] focus:border-[#007185] cursor-pointer"
                  >
                    <option value="featured">Featured</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="rating">Avg. Customer Review</option>
                  </select>
                </div>
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
                      ✓prime
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
                  {selectedShape !== 'all' && (
                    <span className="inline-flex items-center gap-1 bg-stone-100 border border-stone-300 rounded-full px-2.5 py-0.5 text-xs text-[#0F1111]">
                      Shape: {selectedShape}
                      <button
                        type="button"
                        onClick={() => setSelectedShape('all')}
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

              {/* Product Cards Grid */}
              {filteredProducts.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <p className="text-base text-stone-600">
                    No products matched your active filters.
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredProducts.map((product) => {
                    const isWish = wishlist.includes(product.id);
                    return (
                      <div
                        key={product.id}
                        className="group relative bg-white border border-stone-200 hover:border-stone-400 rounded-lg p-3 hover:shadow-lg transition-all flex flex-col justify-between"
                      >
                        <div>
                          {/* Image & Badges */}
                          <div className="relative aspect-square w-full rounded-md overflow-hidden bg-stone-50 mb-3">
                            <Image
                              src={product.image}
                              alt={product.title}
                              fill
                              unoptimized
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
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

                            {/* Best Seller / Hot Badge */}
                            {product.isBestSeller && (
                              <span className="absolute top-2 left-2 bg-[#E67A00] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs">
                                Best Seller
                              </span>
                            )}
                          </div>

                          {/* Brand & Title */}
                          <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                            {product.brand}
                          </p>
                          <h3 className="text-xs sm:text-[13px] font-medium text-[#0F1111] line-clamp-2 leading-tight hover:text-[#C45500] cursor-pointer mt-0.5">
                            {product.title}
                          </h3>

                          {/* Rating & Reviews */}
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <div className="flex text-[#DE7921]">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3.5 w-3.5 ${
                                    i < Math.floor(product.rating)
                                      ? 'fill-[#DE7921]'
                                      : 'text-stone-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-[#007185] hover:underline cursor-pointer">
                              {product.reviews.toLocaleString()}
                            </span>
                          </div>

                          {/* Price & Discount */}
                          <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-base sm:text-lg font-bold text-[#0F1111]">
                              ₹{product.price.toLocaleString('en-IN')}
                            </span>
                            <span className="text-xs text-[#565959] line-through">
                              ₹{product.originalPrice.toLocaleString('en-IN')}
                            </span>
                            <span className="text-xs font-semibold text-[#CC0C39]">
                              ({product.discount})
                            </span>
                          </div>

                          {/* Prime Badge & Delivery */}
                          <div className="mt-1 space-y-0.5">
                            {product.isPrime && (
                              <span className="font-bold italic text-[#007185] text-xs">
                                ✓prime
                              </span>
                            )}
                            <p className="text-[11px] text-[#565959]">
                              Get it by{' '}
                              <span className="font-bold text-[#0F1111]">
                                {product.deliveryDate}
                              </span>
                            </p>
                            <p className="text-[11px] text-[#565959]">
                              FREE Delivery by Vyntra
                            </p>
                          </div>
                        </div>

                        {/* Add to Cart Button */}
                        <div className="mt-3 pt-2">
                          <button
                            type="button"
                            onClick={() => handleAddToCart(product as any)}
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
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function WomensEyewearPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-screen bg-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-800" />
        </div>
      }
    >
      <WomensEyewearContent />
    </Suspense>
  );
}
