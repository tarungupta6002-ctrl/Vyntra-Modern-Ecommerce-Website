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
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { FashionDepartmentSubNav } from '@/components/layout/fashion-department-subnav';
import { useCartStore } from '@/store/cart-store';

// ============================================================================
// 1. VISUAL BUBBLES ("bubbles thode bade bnaya karo ab se": w-28 h-28 sm:w-34 sm:h-34)
// ============================================================================
interface WalletBubble {
  id: string;
  name: string;
  slug: string;
  image: string;
}

const WALLET_BUBBLES: WalletBubble[] = [
  {
    id: 'all-wallets',
    name: 'All Wallets',
    slug: 'all',
    image: '/images/mens-wallets-bubbles/bags-luggage.png',
  },
  {
    id: 'bifold-wallets',
    name: 'Bifold Wallets',
    slug: 'bifold',
    image: '/images/mens-wallets-bubbles/mens.png',
  },
  {
    id: 'trifold-wallets',
    name: 'Trifold Wallets',
    slug: 'trifold',
    image: '/images/mens-wallets-bubbles/wallets.png',
  },
  {
    id: 'card-cases',
    name: 'Card Cases & Clips',
    slug: 'card-case',
    image: '/images/mens-wallets-bubbles/wallets-organisers.png',
  },
];

// Left Sidebar Subcategories
const SIDEBAR_SUBCATEGORIES = [
  { name: 'All Wallets', slug: 'all' },
  { name: 'Bifold Wallets', slug: 'bifold' },
  { name: 'Trifold Wallets', slug: 'trifold' },
  { name: 'Card Cases & Money Clips', slug: 'card-case' },
  { name: 'Gift Sets & Combos', slug: 'gift-set' },
];

// Brands list from official Amazon screenshot
const BRANDS_LIST: string[] = [];

const MATERIALS_LIST = [
  { label: 'All Materials', val: 'all' },
  { label: 'Genuine Leather', val: 'leather' },
  { label: 'RFID Blocking', val: 'rfid' },
  { label: 'Carbon Fiber', val: 'carbon' },
];

// Product Interface
interface WalletProduct {
  id: string;
  title: string;
  brand: string;
  price: number;
  originalPrice: number;
  discount: string;
  rating: number;
  reviews: number;
  image: string;
  category: 'bifold' | 'trifold' | 'card-case' | 'gift-set';
  material: 'leather' | 'rfid' | 'carbon';
  isPrime: boolean;
  isBestSeller?: boolean;
  deliveryDate: string;
}

const WALLET_PRODUCTS : WalletProduct[] = [];

function MensWalletsContent() {
  const { products: liveDbProducts, dynamicBrands } = useCategoryProducts({ categoryKey: 'mens-wallets' });
  const searchParams = useSearchParams();
  const subCategoryParam = searchParams.get('sub') || 'all';

  // State
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>(subCategoryParam);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [primeOnly, setPrimeOnly] = useState<boolean>(false);
  const [priceRange, setPriceRange] = useState<string>('all');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('all');
  const [minRating, setMinRating] = useState<number>(0);
  const [minDiscount, setMinDiscount] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>('featured');

  // Store integration
  const addItem = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.openCart);

  // Wishlist
  const [wishlist, setWishlist] = useState<string[]>([]);
  const toggleWishlist = (id: string) => {
    setWishlist((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Scroll references
  const bubbleScrollRef = useRef<HTMLDivElement>(null);
  const bestSellerScrollRef = useRef<HTMLDivElement>(null);
  const productGridRef = useRef<HTMLDivElement>(null);

  const scrollBubbles = (direction: 'left' | 'right') => {
    if (bubbleScrollRef.current) {
      const scrollAmount = direction === 'left' ? -350 : 350;
      bubbleScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const scrollBestSellers = (direction: 'left' | 'right') => {
    if (bestSellerScrollRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      bestSellerScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

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

  const clearAllFilters = () => {
    setSelectedSubCategory('all');
    setSelectedBrands([]);
    setPrimeOnly(false);
    setPriceRange('all');
    setSelectedMaterial('all');
    setMinRating(0);
    setMinDiscount(0);
  };

  const hasActiveFilters =
    selectedSubCategory !== 'all' ||
    selectedBrands.length > 0 ||
    primeOnly ||
    priceRange !== 'all' ||
    selectedMaterial !== 'all' ||
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
        selectedBrands.some((b) => b.toLowerCase() === p.brand.toLowerCase())
      );
    }

    if (primeOnly) {
      result = result.filter((p) => p.isPrime);
    }

    if (selectedMaterial !== 'all') {
      result = result.filter((p) => p.material === selectedMaterial);
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
      else if (priceRange === '1000-2000') result = result.filter((p) => p.price >= 1000 && p.price <= 2000);
      else if (priceRange === 'over-2000') result = result.filter((p) => p.price > 2000);
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
    selectedSubCategory,
    selectedBrands,
    primeOnly,
    selectedMaterial,
    priceRange,
    minRating,
    minDiscount,
    sortBy,
  ]);

  const bestSellerProducts = useMemo(() => {
    return WALLET_PRODUCTS.filter((p) => p.isBestSeller);
  }, []);

  const activeSubcategoryData = useMemo(() => {
    return SIDEBAR_SUBCATEGORIES.find((b) => b.slug === selectedSubCategory);
  }, [selectedSubCategory]);

  return (
    <div className="w-full bg-[#FFFFFF] min-h-screen text-[#0F1111]">
      {/* 1. Department Sub-Nav Bar (Active item: Men) */}
      <FashionDepartmentSubNav activeItem="men" />

      {/* 2. Fashion Breadcrumbs: Fashion > Men's > Wallets > Subcategory */}
      <div className="border-b border-[#E7E7E7] bg-[#FAFAFA] py-2 px-4 sm:px-6">
        <div className="max-w-[1450px] mx-auto flex items-center gap-1.5 text-xs text-[#565959] flex-wrap">
          <Link href="/products?category=fashion" className="hover:text-[#C45500] hover:underline">
            Fashion
          </Link>
          <ChevronRight className="h-3 w-3 text-stone-400" />
          <Link href="/category/mens-clothing" className="hover:text-[#C45500] hover:underline">
            Men&apos;s
          </Link>
          <ChevronRight className="h-3 w-3 text-stone-400" />
          <button
            type="button"
            onClick={() => setSelectedSubCategory('all')}
            className={`hover:text-[#C45500] hover:underline cursor-pointer ${
              selectedSubCategory === 'all' ? 'font-semibold text-[#0F1111]' : 'text-[#565959]'
            }`}
          >
            Wallets
          </button>
          {activeSubcategoryData && activeSubcategoryData.slug !== 'all' && (
            <>
              <ChevronRight className="h-3 w-3 text-stone-400" />
              <span className="font-semibold text-[#C45500]">{activeSubcategoryData.name}</span>
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
            {/* Category Tree: Fashion > Men's > Wallets > Subcategories */}
            <div>
              <Link
                href="/products?category=fashion"
                className="text-xs text-[#565959] hover:text-[#C45500] hover:underline flex items-center gap-1 mb-1"
              >
                &lsaquo; Fashion
              </Link>
              <Link
                href="/category/mens-clothing"
                className="text-xs text-[#565959] hover:text-[#C45500] hover:underline flex items-center gap-1 mb-1.5 pl-1.5"
              >
                &lsaquo; Men&apos;s
              </Link>
              <div className="pl-3 mb-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedSubCategory('all')}
                  className={`text-xs font-bold uppercase tracking-wide cursor-pointer text-left ${
                    selectedSubCategory === 'all' ? 'text-[#C45500]' : 'text-[#0F1111] hover:text-[#C45500]'
                  }`}
                >
                  Wallets
                </button>
              </div>
              <ul className="space-y-1 text-xs pl-4 border-l-2 border-[#007185]/30 ml-3">
                {SIDEBAR_SUBCATEGORIES.map((cat) => {
                  const isActive = selectedSubCategory === cat.slug;
                  return (
                    <li key={cat.slug}>
                      <button
                        type="button"
                        onClick={() => setSelectedSubCategory(cat.slug)}
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

            {/* Amazon Prime Filter (Exact from screenshot) */}
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

            {/* Brands Filter (Exact list from screenshot) */}
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

            {/* Customer Review Filter (Exact from screenshot) */}
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

            {/* Price Filter */}
            <div className="border-t border-[#E7E7E7] pt-4">
              <h4 className="text-xs font-bold text-[#0F1111] mb-2">Price</h4>
              <div className="space-y-1 text-xs">
                {[
                  { label: 'All Prices', val: 'all' },
                  { label: 'Under ₹500', val: 'under-500' },
                  { label: '₹500 - ₹1,000', val: '500-1000' },
                  { label: '₹1,000 - ₹2,000', val: '1000-2000' },
                  { label: 'Over ₹2,000', val: 'over-2000' },
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

            {/* Material Filter */}
            <div className="border-t border-[#E7E7E7] pt-4">
              <h4 className="text-xs font-bold text-[#0F1111] mb-2">Material</h4>
              <div className="space-y-1 text-xs">
                {MATERIALS_LIST.map((mat) => (
                  <button
                    key={mat.val}
                    type="button"
                    onClick={() => setSelectedMaterial(mat.val)}
                    className={`block w-full text-left py-0.5 hover:text-[#C45500] cursor-pointer ${
                      selectedMaterial === mat.val
                        ? 'font-bold text-[#C45500]'
                        : 'text-[#0F1111]'
                    }`}
                  >
                    {mat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Discount Filter */}
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
          {/* MAIN STOREFRONT AREA */}
          {/* ========================================================================= */}
          <main className="flex-1 min-w-0 space-y-7">
            {/* 1. Page Title (Exact from screenshot: "Mens Wallets") */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0F1111] tracking-tight">
                Mens Wallets
              </h1>
            </div>

            {/* 2. Featured Categories Section (Exact from screenshot) */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#0F1111]">
                Featured categories
              </h2>

              {/* Noticeably LARGER Bubbles (as requested: w-28 h-28 sm:w-34 sm:h-34) */}
              <div className="relative group/bubbles pt-1">
                {/* Left Arrow Button */}
                <button
                  type="button"
                  onClick={() => scrollBubbles('left')}
                  className="hidden sm:flex absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/95 shadow-md border border-stone-200 items-center justify-center text-stone-700 hover:text-black hover:bg-white hover:scale-105 active:scale-95 transition-all opacity-0 group-hover/bubbles:opacity-100 cursor-pointer"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                {/* 4 Exact Visual Bubbles from Screenshot */}
                <div
                  ref={bubbleScrollRef}
                  className="flex items-start gap-6 sm:gap-8 overflow-x-auto pb-4 scroll-smooth scroll-on-interaction"
                >
                  {WALLET_BUBBLES.map((bubble) => {
                    const isSelected = selectedSubCategory === bubble.slug;
                    return (
                      <button
                        key={bubble.id}
                        type="button"
                        onClick={() => {
                          setSelectedSubCategory(bubble.slug);
                          if (productGridRef.current) {
                            productGridRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                        }}
                        className="group flex flex-col items-center flex-shrink-0 cursor-pointer select-none text-center focus:outline-none"
                      >
                        {/* Generously Sized Bubble circle: w-28 h-28 sm:w-32 sm:h-32 md:w-34 md:h-34 */}
                        <div
                          className={`relative w-28 h-28 sm:w-32 sm:h-32 md:w-34 md:h-34 rounded-full transition-transform duration-200 bg-[#F5F5F5] p-2 shadow-xs group-hover:scale-105 group-hover:shadow-md border border-stone-100 ${
                            isSelected
                              ? 'scale-105 ring-2 ring-[#007185] ring-offset-2 shadow-md'
                              : ''
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
                          className={`mt-2.5 text-xs sm:text-[13px] font-semibold max-w-[130px] leading-tight transition-colors ${
                            isSelected
                              ? 'text-[#C45500] font-bold underline decoration-2 underline-offset-4'
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
              </div>
            </section>

            {/* 3. "Best sellers" Section (Exact from screenshot with "See more" link) */}
            <section className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-[#E7E7E7] pb-2">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-xl font-bold text-[#0F1111]">Best sellers</h2>
                  <button
                    type="button"
                    onClick={() => {
                      if (productGridRef.current) {
                        productGridRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                    className="text-xs text-[#007185] hover:text-[#C45500] hover:underline font-medium cursor-pointer"
                  >
                    See more
                  </button>
                </div>
              </div>

              {/* Best Sellers Horizontal Carousel */}
              <div className="relative group/bestsellers">
                <button
                  type="button"
                  onClick={() => scrollBestSellers('left')}
                  className="hidden sm:flex absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/95 shadow-md border border-stone-200 items-center justify-center text-stone-700 hover:text-black hover:bg-white hover:scale-105 active:scale-95 transition-all opacity-0 group-hover/bestsellers:opacity-100 cursor-pointer"
                  aria-label="Scroll bestsellers left"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <div
                  ref={bestSellerScrollRef}
                  className="flex gap-4 overflow-x-auto pb-4 scroll-smooth scroll-on-interaction"
                >
                  {bestSellerProducts.map((product) => {
                    const isWishlisted = wishlist.includes(product.id);

                    return (
                      <div
                        key={`bestseller-${product.id}`}
                        className="group flex-shrink-0 w-[220px] bg-white border border-[#E7E7E7] hover:border-stone-400 rounded-lg p-3 transition-all hover:shadow-md relative flex flex-col justify-between"
                      >
                        {/* Wishlist Heart */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleWishlist(product.id);
                          }}
                          className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-white/90 hover:bg-white shadow-xs flex items-center justify-center text-stone-500 hover:text-red-500 transition-colors cursor-pointer"
                          aria-label="Add to wishlist"
                        >
                          <Heart
                            className={`h-4 w-4 ${
                              isWishlisted ? 'fill-red-500 text-red-500' : ''
                            }`}
                          />
                        </button>

                        <div>
                          {/* Image */}
                          <div className="relative aspect-square w-full bg-[#FAFAFA] rounded-md overflow-hidden mb-2.5">
                            <Image
                              src={product.image}
                              alt={product.title}
                              fill
                              unoptimized
                              className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                              sizes="220px"
                            />
                          </div>

                          {/* Brand & Title */}
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#565959] block">
                            {product.brand}
                          </span>
                          <h4 className="text-xs font-medium text-[#0F1111] line-clamp-2 mt-0.5 group-hover:text-[#007185] transition-colors leading-snug">
                            {product.title}
                          </h4>

                          {/* Ratings */}
                          <div className="flex items-center gap-1.5 mt-1 text-[#DE7921]">
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
                            <span className="text-[11px] text-[#007185]">
                              {product.reviews.toLocaleString()}
                            </span>
                          </div>

                          {/* Price */}
                          <div className="flex items-baseline gap-1.5 mt-1.5">
                            <span className="text-sm font-bold text-[#0F1111]">
                              ₹{product.price.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[11px] text-[#565959] line-through">
                              ₹{product.originalPrice.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[11px] font-bold text-[#CC0C39]">
                              ({product.discount})
                            </span>
                          </div>

                          {/* Prime */}
                          {product.isPrime && (
                            <div className="mt-1 text-xs text-[#007185] font-bold italic">
                              ✓prime
                            </div>
                          )}
                        </div>

                        {/* Add to Cart */}
                        <div className="mt-2.5 pt-2 border-t border-stone-100">
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
                                color: 'Classic',
                                price: product.price,
                                originalPrice: product.originalPrice,
                                image: product.image,
                                quantity: 1,
                                vendorName: 'Vyntra Leather Studio',
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
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => scrollBestSellers('right')}
                  className="hidden sm:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/95 shadow-md border border-stone-200 items-center justify-center text-stone-700 hover:text-black hover:bg-white hover:scale-105 active:scale-95 transition-all opacity-0 group-hover/bestsellers:opacity-100 cursor-pointer"
                  aria-label="Scroll bestsellers right"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </section>

            {/* 4. Products Catalog Section */}
            <section ref={productGridRef} id="products-catalog" className="space-y-4 pt-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E7E7E7] pb-3">
                <div>
                  <h3 className="text-lg font-bold text-[#0F1111] flex items-center gap-2">
                    <span>Explore Men&apos;s Wallets &amp; Card Holders</span>
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap text-xs text-[#565959] mt-0.5">
                    <span>Showing {filteredProducts.length} results</span>
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
                      <div className="relative aspect-square w-full bg-[#f8f8f8] rounded-md overflow-hidden mb-3">
                        <Image
                          src={product.image}
                          alt={product.title}
                          fill
                          unoptimized
                          className="object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 640px) 300px, 240px"
                        />
                      </div>

                      {/* Brand & Title */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#565959] block">
                            {product.brand}
                          </span>
                          <h4 className="text-xs font-medium text-[#0F1111] line-clamp-2 mt-0.5 group-hover:text-[#007185] transition-colors leading-snug">
                            {product.title}
                          </h4>

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
                                ✓prime
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
                                color: 'Classic',
                                price: product.price,
                                originalPrice: product.originalPrice,
                                image: product.image,
                                quantity: 1,
                                vendorName: 'Vyntra Leather Studio',
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

export default function MensWalletsPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-screen flex items-center justify-center text-sm text-stone-500">
          Loading Men&apos;s Wallets Storefront...
        </div>
      }
    >
      <MensWalletsContent />
    </Suspense>
  );
}
