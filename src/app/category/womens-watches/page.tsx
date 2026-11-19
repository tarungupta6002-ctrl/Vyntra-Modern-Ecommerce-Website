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
} from 'lucide-react';
import { FashionDepartmentSubNav } from '@/components/layout/fashion-department-subnav';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';

// ============================================================================
// 1. VISUAL BUBBLES (Extracted from Amazon Screenshot)
// ============================================================================
interface WatchBubble {
  id: string;
  name: string;
  slug: string;
  image: string;
}

const WATCH_VISUAL_BUBBLES: WatchBubble[] = [
  {
    id: 'premium-studio',
    name: 'Premium studio',
    slug: 'premium-studio',
    image: '/images/watches-bubbles/premium-studio.png',
  },
  {
    id: 'classics',
    name: 'Classics',
    slug: 'classics',
    image: '/images/watches-bubbles/classics.png',
  },
  {
    id: 'smartwatches',
    name: 'Smartwatches',
    slug: 'smartwatches',
    image: '/images/watches-bubbles/smartwatches.png',
  },
  {
    id: 'value-picks',
    name: 'Value picks',
    slug: 'value-picks',
    image: '/images/watches-bubbles/value-picks.png',
  },
  {
    id: 'exclusives',
    name: 'Exclusives',
    slug: 'exclusives',
    image: '/images/watches-bubbles/exclusives.png',
  },
  {
    id: 'new-launches',
    name: 'New launches',
    slug: 'new-launches',
    image: '/images/watches-bubbles/new-launches.png',
  },
  {
    id: 'kids',
    name: 'Kids',
    slug: 'kids',
    image: '/images/watches-bubbles/kids.png',
  },
];

// Left Sidebar Subcategories
const SIDEBAR_SUBCATEGORIES = [
  { name: 'Wrist Watches', slug: 'wrist-watches' },
  { name: 'Fashion Smartwatches', slug: 'smartwatches' },
  { name: 'Pocket & Fob Watch', slug: 'pocket-watches' },
];

const BRANDS_LIST: string[] = [];

const BAND_MATERIALS = [
  { label: 'All Materials', val: 'all' },
  { label: 'Stainless Steel', val: 'stainless-steel' },
  { label: 'Leather', val: 'leather' },
  { label: 'Mesh / Milanese', val: 'mesh' },
  { label: 'Silicon', val: 'silicon' },
  { label: 'Ceramic', val: 'ceramic' },
];

const DIAL_COLORS = [
  { label: 'All', val: 'all', bg: 'bg-stone-200' },
  { label: 'Rose Gold', val: 'rose-gold', bg: 'bg-[#B76E79]' },
  { label: 'Gold', val: 'gold', bg: 'bg-[#D4AF37]' },
  { label: 'Silver', val: 'silver', bg: 'bg-[#C0C0C0]' },
  { label: 'Black', val: 'black', bg: 'bg-[#1C1C1C]' },
  { label: 'Pearl / White', val: 'white', bg: 'bg-[#FDFBF7] border border-stone-300' },
  { label: 'Blue', val: 'blue', bg: 'bg-[#1D3557]' },
  { label: 'Emerald Green', val: 'green', bg: 'bg-[#0B6623]' },
];

// Premium Edit Cards (From Screenshot 2)
const PREMIUM_EDIT_CARDS: any[] = [];

// Rich Product Catalog for Women's Watches
interface WatchProduct {
  id: string;
  slug: string;
  title: string;
  brand: string;
  category: 'wrist-watches' | 'smartwatches' | 'pocket-watches' | 'premium-studio' | 'classics' | 'value-picks' | 'exclusives' | 'new-launches' | 'kids';
  bandMaterial?: string;
  dialColor?: string;
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

const WATCHES_PRODUCTS : WatchProduct[] = [];

// ============================================================================
// MAIN WATCHES CONTENT COMPONENT
// ============================================================================
function WomensWatchesContent() {
  const { products: liveDbProducts, dynamicBrands } = useCategoryProducts({ categoryKey: 'womens-watches' });
  const searchParams = useSearchParams();
  const subParam = searchParams?.get('sub') || 'all';

  // Filters state
  const [activeGender, setActiveGender] = useState<'women' | 'men'>('women');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>(subParam);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<string>('all');
  const [selectedDialColor, setSelectedDialColor] = useState<string>('all');
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
    setSelectedMaterial('all');
    setSelectedDialColor('all');
    setPrimeOnly(false);
    setPriceRange('all');
    setMinRating(0);
    setMinDiscount(0);
  };

  const hasActiveFilters =
    selectedSubCategory !== 'all' ||
    selectedBrands.length > 0 ||
    selectedMaterial !== 'all' ||
    selectedDialColor !== 'all' ||
    primeOnly ||
    priceRange !== 'all' ||
    minRating > 0 ||
    minDiscount > 0;

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    let result = [...liveDbProducts];

    if (selectedSubCategory !== 'all') {
      result = result.filter(
        (p) =>
          p.category === selectedSubCategory ||
          (selectedSubCategory === 'smartwatches' && p.category === 'smartwatches') ||
          (selectedSubCategory === 'wrist-watches' && p.category !== 'smartwatches')
      );
    }

    if (selectedBrands.length > 0) {
      result = result.filter((p) => selectedBrands.includes(p.brand));
    }

    if (selectedMaterial !== 'all') {
      result = result.filter((p) => p.bandMaterial === selectedMaterial);
    }

    if (selectedDialColor !== 'all') {
      result = result.filter((p) => p.dialColor === selectedDialColor);
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
      if (priceRange === 'under-1000') result = result.filter((p) => p.price < 1000);
      else if (priceRange === '1000-2500') result = result.filter((p) => p.price >= 1000 && p.price <= 2500);
      else if (priceRange === '2500-5000') result = result.filter((p) => p.price >= 2500 && p.price <= 5000);
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
    selectedMaterial,
    selectedDialColor,
    primeOnly,
    priceRange,
    minRating,
    minDiscount,
    sortBy,
  ]);

  const activeSubcategoryData = useMemo(() => {
    return WATCH_VISUAL_BUBBLES.find((b) => b.slug === selectedSubCategory);
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
          <span className="font-semibold text-[#0F1111]">Watches</span>
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
                  <ChevronLeft className="h-3 w-3" /> Watches
                </Link>
                <div className="font-bold text-[#0F1111] pl-3 py-0.5 text-[13px]">
                  Women
                </div>
              </div>

              {/* Subcategories list */}
              <ul className="mt-2 pl-5 space-y-1.5 text-xs text-[#0F1111]">
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
                  { label: 'Under ₹1,000', val: 'under-1000' },
                  { label: '₹1,000 - ₹2,500', val: '1000-2500' },
                  { label: '₹2,500 - ₹5,000', val: '2500-5000' },
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

            {/* Band Material Filter */}
            <div className="border-t border-[#E7E7E7] pt-4">
              <h4 className="text-xs font-bold text-[#0F1111] mb-2">Band Material</h4>
              <div className="space-y-1 text-xs">
                {BAND_MATERIALS.map((item) => (
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

            {/* Dial Colour Swatches */}
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
                  { label: '40% Off or more', val: 40 },
                  { label: '50% Off or more', val: 50 },
                  { label: '60% Off or more', val: 60 },
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
          {/* MAIN STOREFRONT AREA: Gender Switch + Bubbles + Hero + Premium Edit + Grid */}
          {/* ========================================================================= */}
          <main className="flex-1 min-w-0 space-y-7">
            {/* 1. GENDER TOGGLE PILLS (Large Amazon Pill Buttons: No Icons) */}
            <div className="flex items-center justify-center gap-4 sm:gap-6 w-full max-w-[620px] mx-auto pt-1 pb-1">
              <Link
                href="/category/mens-watches"
                className="flex-1 h-11 sm:h-12 rounded-full border border-[#0F1111] bg-white text-[#0F1111] text-sm sm:text-base font-medium hover:bg-stone-50 transition-all flex items-center justify-center cursor-pointer shadow-xs active:scale-[0.99]"
              >
                Men
              </Link>
              <button
                type="button"
                className="flex-1 h-11 sm:h-12 rounded-full bg-[#000000] text-white text-sm sm:text-base font-bold transition-all flex items-center justify-center cursor-pointer shadow-sm active:scale-[0.99]"
              >
                Women
              </button>
            </div>

            {/* 2. CIRCULAR VISUAL BUBBLES SECTION (7 Bubbles with Auto-hiding Scrollbar) */}
            <section className="relative group/bubbles pt-2">
              {/* Left Arrow Button */}
              <button
                type="button"
                onClick={() => scrollBubbles('left')}
                className="hidden sm:flex absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/95 shadow-md border border-stone-200 items-center justify-center text-stone-700 hover:text-black hover:bg-white hover:scale-105 active:scale-95 transition-all opacity-0 group-hover/bubbles:opacity-100 cursor-pointer"
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Scrollable Container */}
              <div
                ref={bubbleScrollRef}
                onScroll={handleBubbleScroll}
                className={`flex items-center overflow-x-auto pb-3 gap-5 sm:gap-7 scroll-smooth scroll-on-interaction ${
                  isScrolling ? 'is-scrolling' : ''
                }`}
              >
                {WATCH_VISUAL_BUBBLES.map((bubble) => {
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
                        className={`mt-2 text-xs sm:text-[13px] max-w-[100px] leading-tight transition-colors ${
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
                className="hidden sm:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/95 shadow-md border border-stone-200 items-center justify-center text-stone-700 hover:text-black hover:bg-white hover:scale-105 active:scale-95 transition-all opacity-0 group-hover/bubbles:opacity-100 cursor-pointer"
                aria-label="Scroll right"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </section>

            {/* 3. HERO BANNER ("Watches & smartwatches | Up To 60% Off") */}
            <section className="relative w-full rounded-xl overflow-hidden shadow-sm border border-stone-200 bg-[#F9F7F4]">
              <div className="relative aspect-[1200/246] w-full">
                <Image
                  src="/images/watches/hero-banner.jpg"
                  alt="Watches & Smartwatches Up To 60% Off"
                  fill
                  unoptimized
                  priority
                  className="object-cover object-center"
                />
              </div>
            </section>

            {/* 4. "THE PREMIUM EDIT" LUXURY SECTION (Screenshot 2: 1024x170 Header + 418x615 Cards) */}
            {PREMIUM_EDIT_CARDS.length > 0 && (
              <section className="bg-[#0C1421] rounded-2xl overflow-hidden shadow-xl border border-stone-800">
              {/* Header Image (From user's upload: 1024x170) */}
              <div className="relative aspect-[1024/170] w-full">
                <Image
                  src="/images/watches-premium/premium-edit-header.jpg"
                  alt="Premium Edit"
                  fill
                  unoptimized
                  priority
                  className="object-cover object-center"
                />
              </div>

              {/* 5 Premium Brand Cards Carousel / Grid */}
              <div className="p-4 sm:p-6 pt-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
                  {PREMIUM_EDIT_CARDS.map((card) => {
                    const isAct = selectedBrands.includes(card.brand);
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => toggleBrand(card.brand)}
                        className={`group relative rounded-xl overflow-hidden bg-stone-900 text-left transition-all duration-300 flex flex-col justify-between cursor-pointer ${
                          isAct
                            ? 'ring-3 ring-[#E5C158] shadow-2xl scale-[1.03]'
                            : 'border border-stone-700/60 hover:border-[#E5C158]/80 hover:shadow-lg hover:scale-[1.02]'
                        }`}
                      >
                        <div className="relative aspect-[418/615] w-full overflow-hidden bg-stone-950">
                          <Image
                            src={card.image}
                            alt={card.brand}
                            fill
                            unoptimized
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="(max-width: 640px) 180px, 240px"
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
)}

            {/* 5. PRODUCT CATALOG GRID */}
            <section className="space-y-4 pt-2">
              {/* Results Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-200 gap-3">
                <div>
                  <h1 className="text-base sm:text-lg font-bold text-[#0F1111]">
                    {activeSubcategoryData
                      ? activeSubcategoryData.name
                      : "Women's Watches"}
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
                    aria-label="Sort watches by"
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
                  {selectedDialColor !== 'all' && (
                    <span className="inline-flex items-center gap-1 bg-stone-100 border border-stone-300 rounded-full px-2.5 py-0.5 text-xs text-[#0F1111]">
                      Dial: {selectedDialColor}
                      <button
                        type="button"
                        onClick={() => setSelectedDialColor('all')}
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
                          <Link
                            href={`/products/${product.slug || product.id}`}
                            className="relative aspect-square w-full rounded-md overflow-hidden bg-stone-50 mb-3 block cursor-pointer"
                          >
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
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleWishlist(product.id);
                              }}
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
                          </Link>

                          {/* Brand & Title */}
                          <Link href={`/products/${product.slug || product.id}`} className="block group/title">
                            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                              {product.brand}
                            </p>
                            <h3 className="text-xs sm:text-[13px] font-medium text-[#0F1111] line-clamp-2 leading-tight group-hover/title:text-[#007185] hover:text-[#C45500] cursor-pointer mt-0.5">
                              {product.title}
                            </h3>
                          </Link>

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

export default function WomensWatchesPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-screen bg-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-800" />
        </div>
      }
    >
      <WomensWatchesContent />
    </Suspense>
  );
}
