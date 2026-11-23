'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
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
import { useCategoryProducts } from '@/hooks/use-category-products';

// ============================================================================
// 1. VISUAL BUBBLES (Noticeably LARGER as requested: w-28 h-28 sm:w-34 sm:h-34)
// ============================================================================
interface ShoeBubble {
  id: string;
  name: string;
  slug: string;
  image: string;
}

const SHOE_VISUAL_BUBBLES: ShoeBubble[] = [
  {
    id: 'sneakers',
    name: 'Sneakers',
    slug: 'sneakers',
    image: '/images/mens-shoes-bubbles/sneakers.png',
  },
  {
    id: 'boots',
    name: 'Boots',
    slug: 'boots',
    image: '/images/mens-shoes-bubbles/boots.png',
  },
  {
    id: 'loafers',
    name: 'Loafers',
    slug: 'loafers',
    image: '/images/mens-shoes-bubbles/loafers.png',
  },
  {
    id: 'formal-shoes',
    name: 'Formal Shoes',
    slug: 'formal',
    image: '/images/mens-shoes-bubbles/formal.png',
  },
  {
    id: 'sandals',
    name: 'Sandals',
    slug: 'sandals',
    image: '/images/mens-shoes-bubbles/sandals.png',
  },
  {
    id: 'ethnic-footwear',
    name: 'Ethnic Footwear',
    slug: 'ethnic',
    image: '/images/mens-shoes-bubbles/ethnic.png',
  },
  {
    id: 'clogs',
    name: 'Clogs',
    slug: 'clogs',
    image: '/images/mens-shoes-bubbles/clogs.png',
  },
  {
    id: 'flip-flops',
    name: 'Flip-Flops',
    slug: 'flip-flops',
    image: '/images/mens-shoes-bubbles/flip-flops.png',
  },
  {
    id: 'kids-shoes',
    name: "Kids' Shoes",
    slug: 'kids-shoes',
    image: '/images/mens-shoes-bubbles/boys-shoes.png',
  },
];

// Left Sidebar Subcategories (Screenshot 1 & 2)
const SIDEBAR_SUBCATEGORIES = [
  { name: 'Casual Shoes', slug: 'casual' },
  { name: 'Sports & Outdoor Shoes', slug: 'sports' },
  { name: 'Formal Shoes', slug: 'formal' },
  { name: 'Sandals & Floaters', slug: 'sandals' },
  { name: 'Flip-Flops & Slippers', slug: 'flip-flops' },
  { name: 'Thong Sandals', slug: 'thong-sandals' },
  { name: 'Ethnic Footwear', slug: 'ethnic' },
  { name: 'Safety Shoes', slug: 'safety' },
  { name: "Kids' Shoes", slug: 'kids-shoes' },
];

const BRANDS_LIST: string[] = [];

// 5 Official Hero Carousel Banners (Exact match to 1024x314 aspect ratio)
const HERO_BANNERS = [
  {
    id: 'trekking-hiking',
    title: 'TREKKING & HIKING SHOES - Up To 40% Off',
    subtitle: 'Columbia, Woodland & More',
    image: '/images/mens-shoes-banners/trekking-hiking-banner.jpg',
    category: 'boots',
  },
  {
    id: 'party-ready',
    title: 'PARTY-READY FOOTWEAR - Up To 70% Off',
    subtitle: 'Louis Philippe, Fausto & More',
    image: '/images/mens-shoes-banners/party-ready-banner.jpg',
    category: 'formal',
  },
  {
    id: 'trendy-sneakers',
    title: 'TRENDY SNEAKERS - Up To 50% Off',
    subtitle: 'U.S. POLO ASSN., PUMA & More',
    image: '/images/mens-shoes-banners/trendy-sneakers-banner.jpg',
    category: 'sneakers',
  },
  {
    id: 'classy-formals',
    title: 'CLASSY FORMALS - Up To 50% Off',
    subtitle: 'Hush Puppies, Louis Philippe & More',
    image: '/images/mens-shoes-banners/classy-formals-banner.jpg',
    category: 'formal',
  },
  {
    id: 'symbol-premium',
    title: 'HANDCRAFTED, GENUINE-LEATHER SHOES - Min. 40% Off',
    subtitle: 'Symbol Premium',
    image: '/images/mens-shoes-banners/symbol-premium-banner.jpg',
    category: 'formal',
  },
];

// Top Brands on Offer (Screenshot 3)
const TOP_BRANDS_DEALS: any[] = [];

// Rich Product Catalog for Bestsellers
interface ShoeProduct {
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
  isPrime: boolean;
  isBestSeller?: boolean;
  deliveryDate: string;
}

const SHOE_PRODUCTS : ShoeProduct[] = [];

function MensShoesContent() {
  const searchParams = useSearchParams();
  const subCategoryParam = searchParams.get('type') || searchParams.get('sub') || 'all';
  const normalizedSub =
    subCategoryParam === 'kids' || subCategoryParam === 'kids-shoes' || subCategoryParam === 'boys-shoes'
      ? 'kids-shoes'
      : subCategoryParam;

  // Filters state
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>(normalizedSub);

  useEffect(() => {
    if (subCategoryParam) {
      const norm =
        subCategoryParam === 'kids' || subCategoryParam === 'kids-shoes' || subCategoryParam === 'boys-shoes'
          ? 'kids-shoes'
          : subCategoryParam;
      setSelectedSubCategory(norm);
    }
  }, [subCategoryParam]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [primeOnly, setPrimeOnly] = useState<boolean>(false);
  const [priceRange, setPriceRange] = useState<string>('all');
  const [minRating, setMinRating] = useState<number>(0);
  const [minDiscount, setMinDiscount] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>('featured');
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [isBannerPaused, setIsBannerPaused] = useState<boolean>(false);

  // Live database catalog from PostgreSQL
  const { products: liveShoes, dynamicBrands } = useCategoryProducts({ categoryKey: 'mens-shoes' });

  // Auto-scroll hero banner every 4.5 seconds (pauses on hover)
  useEffect(() => {
    if (isBannerPaused) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_BANNERS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isBannerPaused]);

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
  const [isScrolling, setIsScrolling] = useState<boolean>(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollBubbles = (direction: 'left' | 'right') => {
    if (bubbleScrollRef.current) {
      const scrollAmount = direction === 'left' ? -350 : 350;
      bubbleScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleBubbleScroll = () => {
    setIsScrolling(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 1000);
  };

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const clearAllFilters = () => {
    setSelectedSubCategory('all');
    setSelectedBrands([]);
    setPrimeOnly(false);
    setPriceRange('all');
    setMinRating(0);
    setMinDiscount(0);
  };

  const hasActiveFilters =
    selectedSubCategory !== 'all' ||
    selectedBrands.length > 0 ||
    primeOnly ||
    priceRange !== 'all' ||
    minRating > 0 ||
    minDiscount > 0;

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    let result = [...liveShoes];

    if (selectedSubCategory !== 'all') {
      const s = selectedSubCategory.toLowerCase();
      result = result.filter(
        (p) =>
          p.category.toLowerCase().includes(s) ||
          p.subcategory.includes(s) ||
          p.subCategory.toLowerCase().includes(s) ||
          p.title.toLowerCase().includes(s)
      );
    }

    if (selectedBrands.length > 0) {
      result = result.filter((p) =>
        selectedBrands.some((b) => b.toLowerCase() === p.brand.toLowerCase())
      );
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
    liveShoes,
    selectedSubCategory,
    selectedBrands,
    primeOnly,
    priceRange,
    minRating,
    minDiscount,
    sortBy,
  ]);

  const activeSubcategoryData = useMemo(() => {
    return SHOE_VISUAL_BUBBLES.find((b) => b.slug === selectedSubCategory);
  }, [selectedSubCategory]);

  return (
    <div className="w-full bg-[#FFFFFF] min-h-screen text-[#0F1111]">
      {/* 1. Department Sub-Nav Bar (Active item: Men) */}
      <FashionDepartmentSubNav activeItem="men" />

      {/* 2. Amazon Fashion Breadcrumbs */}
      <div className="border-b border-[#E7E7E7] bg-[#FAFAFA] py-2 px-4 sm:px-6">
        <div className="max-w-[1450px] mx-auto flex items-center gap-1.5 text-xs text-[#565959]">
          <Link href="/products" className="hover:text-[#C45500] hover:underline">
            Shoes &amp; Handbags
          </Link>
          <ChevronRight className="h-3 w-3 text-stone-400" />
          <Link href="/category/mens-shoes" className="hover:text-[#C45500] hover:underline">
            Shoes
          </Link>
          <ChevronRight className="h-3 w-3 text-stone-400" />
          <span className="font-semibold text-[#0F1111]">Men&apos;s Shoes</span>
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
                className="text-xs text-[#565959] hover:text-[#C45500] hover:underline flex items-center gap-1 mb-1"
              >
                &lsaquo; Shoes &amp; Handbags
              </Link>
              <Link
                href="/category/mens-shoes"
                className="text-xs text-[#565959] hover:text-[#C45500] hover:underline flex items-center gap-1 mb-1.5 pl-1"
              >
                &lsaquo; Shoes
              </Link>
              <h3 className="text-xs font-bold text-[#0F1111] uppercase tracking-wide pl-2 mb-2">
                Men&apos;s Shoes
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

            {/* Price Filter (Screenshot 1) */}
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

            {/* Brands Filter (Screenshot 1 & 2) */}
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

            {/* Vyntra Express Filter (Screenshot 2) */}
            <div className="border-t border-[#E7E7E7] pt-4">
              <h4 className="text-xs font-bold text-[#0F1111] mb-2">Vyntra Express</h4>
              <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                <input
                  type="checkbox"
                  checked={primeOnly}
                  onChange={(e) => setPrimeOnly(e.target.checked)}
                  className="rounded text-[#007185] focus:ring-[#007185] h-3.5 w-3.5"
                />
                <span className="font-bold italic text-[#007185] text-sm tracking-tight">
                  Vyntra Express
                </span>
              </label>
            </div>

            {/* Customer Review Filter (Screenshot 2) */}
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

            {/* Colour Swatches (Screenshot 3) */}
            <div className="border-t border-[#E7E7E7] pt-4">
              <h4 className="text-xs font-bold text-[#0F1111] mb-2">Colour</h4>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { name: 'Black', bg: 'bg-black' },
                  { name: 'Brown', bg: 'bg-amber-900' },
                  { name: 'White', bg: 'bg-white border border-stone-300' },
                  { name: 'Tan', bg: 'bg-amber-700' },
                  { name: 'Blue', bg: 'bg-blue-600' },
                  { name: 'Grey', bg: 'bg-gray-500' },
                  { name: 'Red', bg: 'bg-red-600' },
                  { name: 'Navy', bg: 'bg-blue-900' },
                ].map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    title={c.name}
                    className={`w-7 h-7 rounded-sm ${c.bg} hover:scale-110 transition-transform cursor-pointer shadow-xs`}
                  />
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
          {/* MAIN STOREFRONT AREA: Noticeably Larger Bubbles + Banners + Products */}
          {/* ========================================================================= */}
          <main className="flex-1 min-w-0 space-y-7">
            {/* 1. CIRCULAR VISUAL BUBBLES SECTION (Noticeably LARGER as requested) */}
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
                {SHOE_VISUAL_BUBBLES.map((bubble) => {
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

            {/* 2. DYNAMIC HERO CAROUSEL BANNER (5 Slides, 100% Full View aspect-[1024/314]) */}
            <section
              className="relative w-full rounded-xl overflow-hidden shadow-xs border border-stone-200 bg-[#F5F2EC]"
              onMouseEnter={() => setIsBannerPaused(true)}
              onMouseLeave={() => setIsBannerPaused(false)}
            >
              <div className="relative aspect-[1024/314] w-full overflow-hidden">
                {HERO_BANNERS.map((banner, index) => {
                  const isActive = currentSlide === index;
                  return (
                    <div
                      key={banner.id}
                      className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out ${
                        isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                      }`}
                    >
                      <Image
                        src={banner.image}
                        alt={banner.title}
                        fill
                        unoptimized
                        priority={index === 0}
                        className="object-cover object-center w-full h-full"
                        sizes="(max-width: 1450px) 100vw, 1200px"
                      />
                    </div>
                  );
                })}

                {/* Banner Carousel Arrows */}
                <button
                  type="button"
                  onClick={() =>
                    setCurrentSlide((prev) =>
                      prev === 0 ? HERO_BANNERS.length - 1 : prev - 1
                    )
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow-md flex items-center justify-center text-stone-800 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentSlide((prev) => (prev + 1) % HERO_BANNERS.length)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow-md flex items-center justify-center text-stone-800 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  aria-label="Next slide"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                {/* Slider Dots */}
                <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                  {HERO_BANNERS.map((_, dot) => (
                    <button
                      key={dot}
                      type="button"
                      onClick={() => setCurrentSlide(dot)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        currentSlide === dot
                          ? 'w-7 bg-[#007185]'
                          : 'w-2 bg-stone-400/80 hover:bg-stone-700'
                      }`}
                      aria-label={`Slide ${dot + 1}`}
                    />
                  ))}
                </div>
              </div>
            </section>

            {/* 3. "TOP BRANDS ON OFFER" (6 High-Res Full Brand Cards: aspect-[558/738]) */}
            {TOP_BRANDS_DEALS.length > 0 && (
              <section className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-[#0F1111]">
                    Top brands on offer
                  </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                  {TOP_BRANDS_DEALS.map((deal) => (
                    <button
                      key={deal.id}
                      type="button"
                      onClick={() => toggleBrand(deal.brand)}
                      className="group flex flex-col rounded-xl overflow-hidden border border-stone-200 hover:shadow-lg hover:border-stone-400 transition-all text-left bg-white cursor-pointer"
                    >
                      <div className="relative aspect-[558/738] w-full bg-[#F7F7F7] overflow-hidden">
                        <Image
                          src={deal.image}
                          alt={`${deal.brand} ${deal.deal}`}
                          fill
                          unoptimized
                          priority
                          className="object-cover object-center w-full h-full group-hover:scale-103 transition-transform duration-300"
                          sizes="(max-width: 640px) 180px, (max-width: 1024px) 240px, 200px"
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* 5. "BESTSELLERS" PRODUCT CATALOG GRID (Screenshot 3) */}
            <section className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E7E7E7] pb-3">
                <div>
                  <h3 className="text-lg font-bold text-[#0F1111]">
                    Bestsellers &amp; Trending Shoes
                  </h3>
                  <p className="text-xs text-[#565959] mt-0.5">
                    Showing {filteredProducts.length} results
                    {selectedSubCategory !== 'all' && ` in "${activeSubcategoryData?.name || selectedSubCategory}"`}
                  </p>
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
                                size: 'UK 8',
                                color: 'Default',
                                price: product.price,
                                originalPrice: product.originalPrice,
                                image: product.image,
                                quantity: 1,
                                vendorName: 'Vyntra Retail',
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

export default function MensShoesPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-screen flex items-center justify-center text-sm text-stone-500">
          Loading Men&apos;s Shoes Storefront...
        </div>
      }
    >
      <MensShoesContent />
    </Suspense>
  );
}
