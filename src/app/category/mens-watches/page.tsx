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
  Zap,
} from 'lucide-react';
import { FashionDepartmentSubNav } from '@/components/layout/fashion-department-subnav';
import { useCartStore } from '@/store/cart-store';

// ============================================================================
// 1. VISUAL BUBBLES (Noticeably LARGER as requested: w-28 h-28 sm:w-34 sm:h-34)
// ============================================================================
interface WatchBubble {
  id: string;
  name: string;
  slug: string;
  image: string;
}

const MEN_WATCH_BUBBLES: WatchBubble[] = [
  {
    id: 'premium-studio',
    name: 'Premium studio',
    slug: 'premium',
    image: '/images/mens-watches-bubbles/premium-studio.png',
  },
  {
    id: 'smartwatches',
    name: 'Smartwatches',
    slug: 'smartwatches',
    image: '/images/mens-watches-bubbles/smartwatches.png',
  },
  {
    id: 'classics',
    name: 'Classics',
    slug: 'classics',
    image: '/images/mens-watches-bubbles/classics.png',
  },
  {
    id: 'value-picks',
    name: 'Value picks',
    slug: 'value-picks',
    image: '/images/mens-watches-bubbles/value-picks.png',
  },
  {
    id: 'exclusives',
    name: 'Exclusives',
    slug: 'exclusives',
    image: '/images/mens-watches-bubbles/exclusives.png',
  },
  {
    id: 'new-launches',
    name: 'New launches',
    slug: 'new-launches',
    image: '/images/mens-watches-bubbles/new-launches.png',
  },
  {
    id: 'kids',
    name: 'Kids',
    slug: 'kids',
    image: '/images/mens-watches-bubbles/kids.png',
  },
];

// Left Sidebar Subcategories
const SIDEBAR_SUBCATEGORIES = [
  { name: 'Wrist Watches', slug: 'wrist-watches' },
  { name: 'Fashion Smartwatches', slug: 'smartwatches' },
  { name: 'Pocket & Fob Watches', slug: 'pocket-watches' },
];

const BRANDS_LIST: string[] = [];

const DIAL_COLORS = [
  { label: 'All', val: 'all', bg: 'bg-stone-200' },
  { label: 'Blue', val: 'blue', bg: 'bg-[#1D3557]' },
  { label: 'Black', val: 'black', bg: 'bg-[#1C1C1C]' },
  { label: 'Silver', val: 'silver', bg: 'bg-[#C0C0C0]' },
  { label: 'Gold', val: 'gold', bg: 'bg-[#D4AF37]' },
  { label: 'White', val: 'white', bg: 'bg-[#FDFBF7] border border-stone-300' },
  { label: 'Brown', val: 'brown', bg: 'bg-[#5C4033]' },
  { label: 'Green', val: 'green', bg: 'bg-[#0B6623]' },
];

// 5 Luxury Brand Cards for "THE PREMIUM EDIT"
const PREMIUM_EDIT_CARDS: any[] = [];

// Rich Product Catalog for Men's Watches
interface WatchProduct {
  id: string;
  slug?: string;
  title: string;
  brand: string;
  price: number;
  originalPrice: number;
  discount: string;
  rating: number;
  reviews: number;
  image: string;
  category: string;
  dialColor: string;
  isPrime: boolean;
  isBestSeller?: boolean;
  deliveryDate: string;
}

const WATCH_PRODUCTS : WatchProduct[] = [];

function MensWatchesContent() {
  const { products: liveDbProducts, dynamicBrands } = useCategoryProducts({ categoryKey: 'mens-watches' });
  const searchParams = useSearchParams();
  const subCategoryParam = searchParams.get('sub') || 'all';

  // Filters state
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>(subCategoryParam);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [primeOnly, setPrimeOnly] = useState<boolean>(false);
  const [priceRange, setPriceRange] = useState<string>('all');
  const [selectedDialColor, setSelectedDialColor] = useState<string>('all');
  const [minRating, setMinRating] = useState<number>(0);
  const [minDiscount, setMinDiscount] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>('featured');

  // Store integration
  const addItem = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.openCart);

  // Wishlist state
  const [wishlist, setWishlist] = useState<string[]>([]);
  const toggleWishlist = (id: string) => {
    setWishlist((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Scroll references
  const bubbleScrollRef = useRef<HTMLDivElement>(null);
  const luxuryScrollRef = useRef<HTMLDivElement>(null);
  const productGridRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState<boolean>(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollBubbles = (direction: 'left' | 'right') => {
    if (bubbleScrollRef.current) {
      const scrollAmount = direction === 'left' ? -350 : 350;
      bubbleScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const scrollLuxury = (direction: 'left' | 'right') => {
    if (luxuryScrollRef.current) {
      const scrollAmount = direction === 'left' ? -380 : 380;
      luxuryScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleBubbleScroll = () => {
    setIsScrolling(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 1000);
  };

  // Toggle brand in sidebar or via tags
  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) => {
      const exists = prev.some((b) => b.toLowerCase() === brand.toLowerCase());
      if (exists) {
        return prev.filter((b) => b.toLowerCase() !== brand.toLowerCase());
      } else {
        return [...prev, brand];
      }
    });
  };

  // Luxury Brand Card Click: Single-brand focus + Auto Smooth Scroll to Product Catalog
  const handleLuxuryBrandClick = (brandName: string) => {
    const isAlreadySelected =
      selectedBrands.length === 1 &&
      selectedBrands[0].toLowerCase() === brandName.toLowerCase();

    if (isAlreadySelected) {
      setSelectedBrands([]);
    } else {
      // Clear conflicting category filters so user sees all watches from this luxury brand
      setSelectedSubCategory('all');
      setSelectedBrands([brandName]);
    }

    // Scroll smoothly to products grid
    setTimeout(() => {
      if (productGridRef.current) {
        productGridRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 80);
  };

  const clearAllFilters = () => {
    setSelectedSubCategory('all');
    setSelectedBrands([]);
    setPrimeOnly(false);
    setPriceRange('all');
    setSelectedDialColor('all');
    setMinRating(0);
    setMinDiscount(0);
  };

  const hasActiveFilters =
    selectedSubCategory !== 'all' ||
    selectedBrands.length > 0 ||
    primeOnly ||
    priceRange !== 'all' ||
    selectedDialColor !== 'all' ||
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
      result = result.filter((p) =>
        selectedBrands.some(
          (b) => b.trim().toLowerCase() === p.brand.trim().toLowerCase()
        )
      );
    }

    if (primeOnly) {
      result = result.filter((p) => p.isPrime);
    }

    if (selectedDialColor !== 'all') {
      result = result.filter((p) => p.dialColor === selectedDialColor);
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
      if (priceRange === 'under-2000') result = result.filter((p) => p.price < 2000);
      else if (priceRange === '2000-5000') result = result.filter((p) => p.price >= 2000 && p.price <= 5000);
      else if (priceRange === '5000-10000') result = result.filter((p) => p.price >= 5000 && p.price <= 10000);
      else if (priceRange === '10000-20000') result = result.filter((p) => p.price >= 10000 && p.price <= 20000);
      else if (priceRange === 'over-20000') result = result.filter((p) => p.price > 20000);
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
    primeOnly,
    selectedDialColor,
    priceRange,
    minRating,
    minDiscount,
    sortBy,
  ]);

  const activeSubcategoryData = useMemo(() => {
    return MEN_WATCH_BUBBLES.find((b) => b.slug === selectedSubCategory);
  }, [selectedSubCategory]);

  return (
    <div className="w-full bg-[#FFFFFF] min-h-screen text-[#0F1111]">
      {/* 1. Department Sub-Nav Bar (Active item: Men) */}
      <FashionDepartmentSubNav activeItem="men" />

      {/* 2. Amazon Fashion Breadcrumbs */}
      <div className="border-b border-[#E7E7E7] bg-[#FAFAFA] py-2 px-4 sm:px-6">
        <div className="max-w-[1450px] mx-auto flex items-center gap-1.5 text-xs text-[#565959]">
          <Link href="/products" className="hover:text-[#C45500] hover:underline">
            Watches
          </Link>
          <ChevronRight className="h-3 w-3 text-stone-400" />
          <span className="font-semibold text-[#0F1111]">Men</span>
          {activeSubcategoryData && (
            <>
              <ChevronRight className="h-3 w-3 text-stone-400" />
              <span className="text-[#C45500] font-semibold">{activeSubcategoryData.name}</span>
            </>
          )}
        </div>
      </div>

      {/* 3. Main Two-Column Layout */}
      <div className="max-w-[1450px] mx-auto px-3 sm:px-6 py-4">
        <div className="flex gap-6 items-start">
          {/* ========================================================================= */}
          {/* LEFT SIDEBAR: Amazon Compact Width (210px) */}
          {/* ========================================================================= */}
          <aside className="w-[210px] flex-shrink-0 hidden md:block space-y-5 text-sm">
            {/* Category Tree (Screenshot 1) */}
            <div>
              <Link
                href="/products"
                className="text-xs text-[#565959] hover:text-[#C45500] hover:underline flex items-center gap-1 mb-1.5"
              >
                &lsaquo; Watches
              </Link>
              <h3 className="text-xs font-bold text-[#0F1111] uppercase tracking-wide pl-2 mb-2">
                Men
              </h3>
              <ul className="space-y-1 text-xs pl-3 border-l-2 border-[#007185]/30">
                {SIDEBAR_SUBCATEGORIES.map((cat) => {
                  const isActive = selectedSubCategory === cat.slug;
                  return (
                    <li key={cat.slug}>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedSubCategory((prev) =>
                            prev === cat.slug ? 'all' : cat.slug
                          )
                        }
                        className={`text-left w-full hover:text-[#C45500] cursor-pointer py-0.5 transition-colors ${
                          isActive
                            ? 'font-bold text-[#C45500]'
                            : 'text-[#0F1111]'
                        }`}
                      >
                        {cat.name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Brands Filter (Screenshot 1 & 2) */}
            {dynamicBrands.length > 0 && (
<div className="border-t border-[#E7E7E7] pt-4">
              <h4 className="text-xs font-bold text-[#0F1111] mb-2">Brands</h4>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {dynamicBrands.map((brand) => {
                  const checked = selectedBrands.some(
                    (b) => b.toLowerCase() === brand.toLowerCase()
                  );
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

            {/* Price Filter (Screenshot 2) */}
            <div className="border-t border-[#E7E7E7] pt-4">
              <h4 className="text-xs font-bold text-[#0F1111] mb-2">Price</h4>
              <div className="space-y-1 text-xs">
                {[
                  { label: 'All Prices', val: 'all' },
                  { label: 'Under ₹2,000', val: 'under-2000' },
                  { label: '₹2,000 - ₹5,000', val: '2000-5000' },
                  { label: '₹5,000 - ₹10,000', val: '5000-1000' },
                  { label: '₹10,000 - ₹20,000', val: '10000-20000' },
                  { label: 'Over ₹20,000', val: 'over-20000' },
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

            {/* Dial Colour (Screenshot 3) */}
            <div className="border-t border-[#E7E7E7] pt-4">
              <h4 className="text-xs font-bold text-[#0F1111] mb-2">Dial Colour</h4>
              <div className="flex flex-wrap gap-2">
                {DIAL_COLORS.map((c) => {
                  const isAct = selectedDialColor === c.val;
                  return (
                    <button
                      key={c.val}
                      type="button"
                      title={c.label}
                      onClick={() =>
                        setSelectedDialColor((prev) => (prev === c.val ? 'all' : c.val))
                      }
                      className={`relative w-6 h-6 rounded-full ${c.bg} transition-all cursor-pointer ${
                        isAct ? 'ring-2 ring-[#007185] scale-110 shadow-sm' : 'hover:scale-105'
                      }`}
                    >
                      {isAct && (
                        <Check className="h-3 w-3 text-white absolute inset-0 m-auto drop-shadow-md" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Customer Review Filter (Screenshot 2) */}
            <div className="border-t border-[#E7E7E7] pt-4">
              <h4 className="text-xs font-bold text-[#0F1111] mb-2">Customer Reviews</h4>
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

            {/* Discount Filter (Screenshot 3) */}
            <div className="border-t border-[#E7E7E7] pt-4">
              <h4 className="text-xs font-bold text-[#0F1111] mb-2">Discount</h4>
              <div className="space-y-1 text-xs">
                {[
                  { label: 'All Discounts', val: 0 },
                  { label: '10% Off or more', val: 10 },
                  { label: '25% Off or more', val: 25 },
                  { label: '35% Off or more', val: 35 },
                  { label: '50% Off or more', val: 50 },
                  { label: '60% Off or more', val: 60 },
                  { label: '70% Off or more', val: 70 },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setMinDiscount(item.val)}
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
          {/* MAIN STOREFRONT AREA: Gender Switch + Bubbles + Hero + Premium Edit + Grid */}
          {/* ========================================================================= */}
          <main className="flex-1 min-w-0 space-y-7">
            {/* 1. GENDER TOGGLE PILLS (Large Amazon Pill Buttons: No Icons) */}
            <div className="flex items-center justify-center gap-4 sm:gap-6 w-full max-w-[620px] mx-auto pt-1 pb-1">
              <button
                type="button"
                className="flex-1 h-11 sm:h-12 rounded-full bg-[#000000] text-white text-sm sm:text-base font-bold transition-all flex items-center justify-center cursor-pointer shadow-sm active:scale-[0.99]"
              >
                Men
              </button>
              <Link
                href="/category/womens-watches"
                className="flex-1 h-11 sm:h-12 rounded-full border border-[#0F1111] bg-white text-[#0F1111] text-sm sm:text-base font-medium hover:bg-stone-50 transition-all flex items-center justify-center cursor-pointer shadow-xs active:scale-[0.99]"
              >
                Women
              </Link>
            </div>

            {/* 2. CIRCULAR VISUAL BUBBLES SECTION (Noticeably LARGER as requested) */}
            <section className="relative group/bubbles pt-1">
              {/* Left Arrow Button */}
              <button
                type="button"
                onClick={() => scrollBubbles('left')}
                className="hidden sm:flex absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/95 shadow-md border border-stone-200 items-center justify-center text-stone-700 hover:text-black hover:bg-white hover:scale-105 active:scale-95 transition-all opacity-0 group-hover/bubbles:opacity-100 cursor-pointer"
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              {/* Scrollable Container with Noticeably LARGER Bubbles */}
              <div
                ref={bubbleScrollRef}
                onScroll={handleBubbleScroll}
                className={`flex items-center overflow-x-auto pb-4 gap-6 sm:gap-8 scroll-smooth scroll-on-interaction ${
                  isScrolling ? 'is-scrolling' : ''
                }`}
              >
                {MEN_WATCH_BUBBLES.map((bubble) => {
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
                      {/* Generously Sized Bubble circle: w-28 h-28 sm:w-34 sm:h-34 */}
                      <div
                        className={`relative w-28 h-28 sm:w-32 sm:h-32 md:w-34 md:h-34 rounded-full transition-transform duration-200 bg-[#F7F7F7] p-2 ${
                          isSelected
                            ? 'scale-108 ring-3 ring-[#007185] ring-offset-2 shadow-md'
                            : 'shadow-xs group-hover:scale-105'
                        }`}
                      >
                        <Image
                          src={bubble.image}
                          alt={bubble.name}
                          fill
                          unoptimized
                          priority
                          className="object-contain p-1 rounded-full transition-transform duration-300 pointer-events-none"
                          sizes="(max-width: 640px) 112px, 136px"
                        />
                      </div>

                      {/* Bubble Label */}
                      <span
                        className={`mt-2.5 text-xs sm:text-[13px] font-semibold max-w-[110px] leading-tight transition-colors ${
                          isSelected
                            ? 'font-bold text-[#C7511F] underline decoration-2 underline-offset-4'
                            : 'text-[#0F1111] group-hover:text-[#007185]'
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
                className="hidden sm:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/95 shadow-md border border-stone-200 items-center justify-center text-stone-700 hover:text-black hover:bg-white hover:scale-105 active:scale-95 transition-all opacity-0 group-hover/bubbles:opacity-100 cursor-pointer"
                aria-label="Scroll right"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </section>

            {/* 3. HERO BANNER: CASIO & TITAN UP TO 60% OFF (Exact 1024x314 Full View - Large & Majestic) */}
            <section className="relative w-full rounded-xl overflow-hidden shadow-xs border border-stone-200 bg-[#F5F2EC]">
              <div className="relative aspect-[1024/314] w-full">
                <Image
                  src="/images/mens-watches-banners/hero-casio-titan.jpg"
                  alt="Watches & smartwatches Up To 60% Off - TITAN, CASIO & More"
                  fill
                  unoptimized
                  priority
                  className="object-cover object-center w-full h-full"
                  sizes="(max-width: 1450px) 100vw, 1200px"
                />
              </div>
            </section>

            {/* 4. "PREMIUM EDIT" (Screenshot 3: Official Luxury Header + 6 Large High-Res Cards with Interactive Brand Filtering) */}
            {PREMIUM_EDIT_CARDS.length > 0 && (
              <section className="bg-gradient-to-b from-[#111625] via-[#0D1117] to-[#161B22] rounded-2xl p-4 sm:p-5 text-white shadow-xl relative group/luxury overflow-hidden">
              {/* Official Amazon Premium Edit Header Banner */}
              <div className="relative aspect-[1024/170] w-full rounded-xl overflow-hidden mb-4 shadow-sm">
                <Image
                  src="/images/mens-watches-banners/premium-edit-header.jpg"
                  alt="PREMIUM EDIT"
                  fill
                  unoptimized
                  priority
                  className="object-cover object-center w-full h-full"
                  sizes="(max-width: 1450px) 100vw, 1200px"
                />
              </div>

              {/* Left Arrow Button */}
              <button
                type="button"
                onClick={() => scrollLuxury('left')}
                className="hidden sm:flex absolute left-2 top-[60%] -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/80 hover:bg-black text-amber-200 shadow-lg border border-amber-500/30 items-center justify-center transition-all opacity-0 group-hover/luxury:opacity-100 cursor-pointer"
                aria-label="Scroll luxury left"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              {/* 6 Prominently Sized Luxury Cards (Exact aspect-[418/615] Full View) */}
              <div
                ref={luxuryScrollRef}
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 relative z-10"
              >
                {PREMIUM_EDIT_CARDS.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => handleLuxuryBrandClick(card.brand)}
                    title={`View ${card.brand} watches`}
                    className="group/card relative flex flex-col rounded-xl overflow-hidden border border-amber-500/25 hover:border-amber-400/80 bg-[#0A0D14] hover:shadow-[0_10px_28px_rgba(212,175,55,0.3)] transition-all cursor-pointer text-left"
                  >
                    <div className="relative aspect-[418/615] w-full overflow-hidden bg-gradient-to-b from-stone-900 to-black">
                      <Image
                        src={card.image}
                        alt={`${card.brand} - ${card.deal}`}
                        fill
                        unoptimized
                        priority
                        className="object-cover object-center w-full h-full group-hover/card:scale-104 transition-transform duration-300"
                        sizes="(max-width: 640px) 200px, (max-width: 1024px) 240px, 220px"
                      />
                    </div>
                  </button>
                ))}
              </div>

              {/* Right Arrow Button */}
              <button
                type="button"
                onClick={() => scrollLuxury('right')}
                className="hidden sm:flex absolute right-2 top-[60%] -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/80 hover:bg-black text-amber-200 shadow-lg border border-amber-500/30 items-center justify-center transition-all opacity-0 group-hover/luxury:opacity-100 cursor-pointer"
                aria-label="Scroll luxury right"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </section>
)}

            {/* 5. "FEATURED BRANDS" / BESTSELLERS PRODUCT GRID */}
            <section ref={productGridRef} id="products-catalog" className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E7E7E7] pb-3">
                <div>
                  <h3 className="text-lg font-bold text-[#0F1111] flex items-center gap-2">
                    <span>Featured Watches &amp; Timepieces</span>
                    {selectedBrands.length === 1 && (
                      <span className="text-xs font-semibold text-stone-700 bg-stone-100 border border-stone-200 px-2.5 py-0.5 rounded-md">
                        {selectedBrands[0]}
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap text-xs text-[#565959] mt-0.5">
                    <span>
                      Showing {filteredProducts.length} results
                      {selectedSubCategory !== 'all' && ` in "${activeSubcategoryData?.name || selectedSubCategory}"`}
                    </span>
                    {selectedBrands.length > 0 && (
                      <div className="flex items-center gap-1.5 ml-2">
                        <span>• Filtered by brand:</span>
                        {selectedBrands.map((brand) => (
                          <button
                            key={brand}
                            type="button"
                            onClick={() => toggleBrand(brand)}
                            className="inline-flex items-center gap-1 bg-stone-100 border border-stone-300 text-stone-800 font-medium px-2 py-0.5 rounded-md hover:bg-stone-200 transition-colors cursor-pointer"
                          >
                            <span>{brand}</span>
                            <X className="h-3 w-3" />
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setSelectedBrands([])}
                          className="text-[#007185] hover:text-[#C45500] hover:underline font-semibold ml-1 cursor-pointer"
                        >
                          Show all brands
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sort By Dropdown */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[#565959]">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    aria-label="Sort products by"
                    className="bg-[#F0F2F2] hover:bg-[#E3E6E6] border border-[#D5D9D9] rounded-md px-2.5 py-1 text-xs font-medium text-[#0F1111] focus:ring-1 focus:ring-[#007185] focus:outline-none cursor-pointer"
                  >
                    <option value="featured">Featured</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="rating">Avg. Customer Review</option>
                  </select>
                </div>
              </div>

              {/* Product Cards Grid */}
              {filteredProducts.length === 0 ? (
            <div className="py-20 text-center space-y-3 bg-[#FAF8F5] rounded-xl border border-stone-200 p-8 my-4">
              <p className="text-base text-stone-700 font-semibold">
                No products currently available in this collection
              </p>
              <p className="text-xs text-stone-500">
                Verified artisan partners are onboarding new catalogue pieces. Check back shortly!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map((product) => {
                  const isWishlisted = wishlist.includes(product.id);

                  return (
                    <div
                      key={product.id}
                      className="group flex flex-col bg-white border border-[#E7E7E7] hover:border-stone-400 rounded-lg p-3 transition-all hover:shadow-md relative"
                    >
                      {/* Wishlist Heart Icon */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWishlist(product.id);
                        }}
                        className="absolute top-4 right-4 z-10 w-7 h-7 rounded-full bg-white/90 hover:bg-white shadow-xs flex items-center justify-center text-stone-500 hover:text-red-500 transition-colors cursor-pointer"
                        aria-label="Add to wishlist"
                      >
                        <Heart
                          className={`h-4 w-4 ${
                            isWishlisted ? 'fill-red-500 text-red-500' : ''
                          }`}
                        />
                      </button>

                      {/* Best Seller Badge */}
                      {product.isBestSeller && (
                        <div className="absolute top-3 left-3 z-10 bg-[#E67A00] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-2xs uppercase tracking-tight shadow-xs">
                          Best Seller
                        </div>
                      )}

                      {/* Product Image */}
                      <Link
                        href={`/products/${product.slug || product.id}`}
                        className="relative aspect-square w-full bg-[#f8f8f8] rounded-md overflow-hidden mb-3 block cursor-pointer"
                      >
                        <Image
                          src={product.image}
                          alt={product.title}
                          fill
                          unoptimized
                          className="object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 640px) 300px, 240px"
                        />
                      </Link>

                      {/* Brand & Title */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <Link href={`/products/${product.slug || product.id}`} className="block group/title">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[#565959] block">
                              {product.brand}
                            </span>
                            <h4 className="text-xs font-medium text-[#0F1111] line-clamp-2 mt-0.5 group-hover/title:text-[#007185] group-hover:text-[#007185] transition-colors leading-snug cursor-pointer">
                              {product.title}
                            </h4>
                          </Link>

                          {/* Ratings */}
                          <div className="flex items-center gap-1.5 mt-1.5 text-[#DE7921]">
                            <div className="flex">
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
                            <span className="text-[11px] text-[#007185] hover:underline cursor-pointer">
                              {product.reviews.toLocaleString()}
                            </span>
                          </div>

                          {/* Price & Discount */}
                          <div className="flex items-baseline gap-2 mt-2">
                            <span className="text-base font-bold text-[#0F1111]">
                              ₹{product.price.toLocaleString('en-IN')}
                            </span>
                            <span className="text-xs text-[#565959] line-through">
                              ₹{product.originalPrice.toLocaleString('en-IN')}
                            </span>
                            <span className="text-xs font-bold text-[#CC0C39]">
                              ({product.discount})
                            </span>
                          </div>

                          {/* Prime & Delivery */}
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-[#565959]">
                            {product.isPrime && (
                              <span className="font-bold italic text-[#007185] text-xs">
                                Vyntra Express
                              </span>
                            )}
                            <span>Get it by <strong className="text-[#0F1111]">{product.deliveryDate}</strong></span>
                          </div>
                        </div>

                        {/* Add to Cart Button */}
                        <div className="mt-3 pt-2 border-t border-stone-100">
                          <button
                            type="button"
                            onClick={() => {
                              addItem({
                                id: product.id,
                                productId: product.id,
                                title: product.title,
                                brand: product.brand,
                                variantId: `${product.id}-default`,
                                size: 'Standard',
                                color: product.dialColor,
                                price: product.price,
                                originalPrice: product.originalPrice,
                                image: product.image,
                                quantity: 1,
                                vendorName: 'Vyntra Watch Hub',
                              });
                              openCart();
                            }}
                            className="w-full py-1.5 px-3 bg-[#FFD814] hover:bg-[#F7CA00] active:bg-[#F0B800] border border-[#FCD200] rounded-full text-xs font-medium text-[#0F1111] shadow-xs hover:shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <ShoppingCart className="h-3.5 w-3.5" />
                            <span>Add to Cart</span>
                          </button>
                        </div>
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

export default function MensWatchesPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-screen flex items-center justify-center text-sm text-stone-500">
          Loading Men&apos;s Watches Storefront...
        </div>
      }
    >
      <MensWatchesContent />
    </Suspense>
  );
}
