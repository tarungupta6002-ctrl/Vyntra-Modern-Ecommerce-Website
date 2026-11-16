'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ChevronRight,
  ChevronLeft,
  Star,
  Check,
  Heart,
  ShoppingCart,
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  Truck,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { FashionDepartmentSubNav } from '@/components/layout/fashion-department-subnav';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';
import { useCategoryProducts } from '@/hooks/use-category-products';

// 7 Western Wear Visual Bubbles (Amazon Halo Pop-Out Style)
interface WesternBubble {
  id: string;
  name: string;
  slug: string;
  image: string;
}

const WESTERN_VISUAL_BUBBLES: WesternBubble[] = [
  {
    id: 'dresses',
    name: 'Dresses',
    slug: 'dresses',
    image: '/images/western-bubbles/dresses.png',
  },
  {
    id: 'tops',
    name: 'Tops',
    slug: 'tops',
    image: '/images/western-bubbles/tops.png',
  },
  {
    id: 'shirts',
    name: 'Shirts',
    slug: 'shirts',
    image: '/images/western-bubbles/shirts.png',
  },
  {
    id: 'trousers',
    name: 'Trousers',
    slug: 'trousers',
    image: '/images/western-bubbles/trousers.png',
  },
  {
    id: 'denim',
    name: 'Denim',
    slug: 'denim',
    image: '/images/western-bubbles/denim.png',
  },
  {
    id: 'shorts',
    name: 'Shorts',
    slug: 'shorts',
    image: '/images/western-bubbles/shorts.png',
  },
  {
    id: 'skirts',
    name: 'Skirts',
    slug: 'skirts',
    image: '/images/western-bubbles/skirts.png',
  },
];

// Left Sidebar Western Wear Subcategories (from Amazon screenshot)
const SIDEBAR_SUBCATEGORIES = [
  { name: 'Tops, T-Shirts & Shirts', slug: 'tops' },
  { name: 'Dresses & Jumpsuits', slug: 'dresses' },
  { name: 'Trousers', slug: 'trousers' },
  { name: 'Jeans & Jeggings', slug: 'denim' },
  { name: 'Skirts & Shorts', slug: 'shorts' },
  { name: 'Suits & Blazers', slug: 'suits-blazers' },
  { name: 'Shrugs', slug: 'shrugs' },
  { name: 'Leggings', slug: 'leggings' },
  { name: 'Rainwear', slug: 'rainwear' },
  { name: 'Ponchos & Capes', slug: 'ponchos' },
  { name: 'Winter Wear', slug: 'winter-wear' },
];

// 4 Premium Edit Showcase Items (from Amazon screenshot)
const PREMIUM_EDIT_PRODUCTS: any[] = [];

// Rich Western Wear Catalog (Covering all subcategories)
const WESTERN_PRODUCTS: any[] = [];

const BRANDS_LIST: string[] = [];

type WesternProduct = typeof WESTERN_PRODUCTS[0];

export default function WesternWearPage() {
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [primeOnly, setPrimeOnly] = useState<boolean>(false);
  const [minDiscount, setMinDiscount] = useState<number>(0);
  const [priceRange, setPriceRange] = useState<'all' | 'under-500' | '500-1000' | '1000-2000' | 'over-2000'>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'low-to-high' | 'high-to-low' | 'rating' | 'newest'>('featured');
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({});

  const bubbleScrollRef = React.useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState<boolean>(false);
  const scrollTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleBubbleScroll = () => {
    setIsScrolling(true);
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 1000);
  };

  const scrollBubbles = (direction: 'left' | 'right') => {
    if (bubbleScrollRef.current) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      bubbleScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const { addItem, openCart } = useCartStore();
  const { toggleItem, isInWishlist } = useWishlistStore();

  const handleAddToCart = (product: {
    id: string;
    title: string;
    brand: string;
    price: number;
    originalPrice: number;
    image: string;
  }) => {
    addItem({
      id: product.id,
      productId: product.id,
      title: product.title,
      brand: product.brand,
      variantId: `var-${product.id}`,
      size: 'M',
      color: 'Default',
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      quantity: 1,
      vendorName: product.brand,
    });
    openCart();
    setAddedItemIds((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedItemIds((prev) => ({ ...prev, [product.id]: false }));
    }, 2000);
  };

  // Live database catalog from PostgreSQL
  const { products: liveWesternProducts, dynamicBrands } = useCategoryProducts({ categoryKey: 'western-wear' });

  const toggleBrand = (brandName: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brandName) ? prev.filter((b) => b !== brandName) : [...prev, brandName]
    );
  };

  // Filter products dynamically
  const filteredProducts = useMemo(() => {
    let result = [...liveWesternProducts];

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

    if (minDiscount > 0) {
      result = result.filter((p) => {
        const discNum = Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100);
        return discNum >= minDiscount;
      });
    }

    if (priceRange === 'under-500') {
      result = result.filter((p) => p.price < 500);
    } else if (priceRange === '500-1000') {
      result = result.filter((p) => p.price >= 500 && p.price <= 1000);
    } else if (priceRange === '1000-2000') {
      result = result.filter((p) => p.price > 1000 && p.price <= 2000);
    } else if (priceRange === 'over-2000') {
      result = result.filter((p) => p.price > 2000);
    }

    if (sortBy === 'low-to-high') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'high-to-low') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      result.sort((a, b) => b.rating - a.rating);
    }

    return result;
  }, [selectedSubCategory, selectedBrands, primeOnly, minDiscount, priceRange, sortBy]);

  const activeSubcategoryData = useMemo(() => {
    return WESTERN_VISUAL_BUBBLES.find((b) => b.slug === selectedSubCategory);
  }, [selectedSubCategory]);

  return (
    <div className="w-full bg-[#FFFFFF] min-h-screen text-[#0F1111]">
      {/* 1. Department Sub-Nav Bar (Vyntra Fashion with Women Active) */}
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
          <span className="font-semibold text-[#0F1111]">Western Wear</span>
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
                <div className="font-bold text-[#0F1111] pl-4 py-0.5 text-[13px]">
                  Western Wear
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
                  className="rounded text-[#007185] focus:ring-[#007185] h-4 w-4"
                />
                <span className="inline-flex items-center text-xs font-extrabold text-[#007185]">
                  <span className="text-[#00A8E1] mr-0.5">✓</span>prime
                </span>
              </label>
            </div>

            {/* Brands Filter */}
            {dynamicBrands.length > 0 && (
<div className="border-t border-[#E7E7E7] pt-4">
              <h4 className="text-xs font-bold text-[#0F1111] mb-2">Brands</h4>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {Array.from(new Set([...dynamicBrands, ...BRANDS_LIST])).map((brand) => {
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
                  { label: '₹1,000 - ₹2,000', val: '1000-2000' },
                  { label: 'Over ₹2,000', val: 'over-2000' },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setPriceRange(item.val as any)}
                    className={`block w-full text-left py-0.5 hover:text-[#C45500] hover:underline cursor-pointer ${
                      priceRange === item.val ? 'font-bold text-[#C45500]' : 'text-[#0F1111]'
                    }`}
                  >
                    {item.label}
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
                  { label: '25% Off or more', val: 25 },
                  { label: '50% Off or more', val: 50 },
                  { label: '60% Off or more', val: 60 },
                  { label: '70% Off or more', val: 70 },
                ].map((d) => (
                  <button
                    key={d.val}
                    type="button"
                    onClick={() => setMinDiscount(d.val)}
                    className={`block w-full text-left py-0.5 hover:text-[#C45500] hover:underline cursor-pointer ${
                      minDiscount === d.val ? 'font-bold text-[#C45500]' : 'text-[#0F1111]'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear All Filters Button */}
            {(selectedSubCategory !== 'all' ||
              selectedBrands.length > 0 ||
              primeOnly ||
              minDiscount > 0 ||
              priceRange !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSelectedSubCategory('all');
                  setSelectedBrands([]);
                  setPrimeOnly(false);
                  setMinDiscount(0);
                  setPriceRange('all');
                }}
                className="w-full py-1.5 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-md transition-colors"
              >
                Clear all filters
              </button>
            )}
          </aside>

          {/* ========================================================================= */}
          {/* RIGHT MAIN CONTENT AREA (Wide Expansive Showcase)                         */}
          {/* ========================================================================= */}
          <main className="w-full flex-1 min-w-0 space-y-7">
            {/* 1. 7 CIRCULAR VISUAL BUBBLES WITH DYNAMIC SCROLLBAR & CHEVRONS */}
            <section className="w-full relative group/bubbles">
              {/* Left Arrow Button */}
              <button
                type="button"
                onClick={() => scrollBubbles('left')}
                className="hidden sm:flex absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/95 shadow-md border border-stone-200 items-center justify-center text-stone-700 hover:text-black hover:bg-white hover:scale-105 active:scale-95 transition-all opacity-0 group-hover/bubbles:opacity-100 cursor-pointer"
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Scrollable Container (Scrollbar only appears during scroll or hover) */}
              <div
                ref={bubbleScrollRef}
                onScroll={handleBubbleScroll}
                className={`flex items-center overflow-x-auto pb-2 gap-3 sm:gap-6 scroll-smooth scroll-on-interaction ${
                  isScrolling ? 'is-scrolling' : ''
                }`}
              >
                {WESTERN_VISUAL_BUBBLES.map((bubble) => {
                  const isSelected = selectedSubCategory === bubble.slug;
                  return (
                    <button
                      key={bubble.id}
                      type="button"
                      onClick={() =>
                        setSelectedSubCategory((prev) => (prev === bubble.slug ? 'all' : bubble.slug))
                      }
                      className="group flex flex-col items-center flex-shrink-0 cursor-pointer select-none text-center focus:outline-none"
                    >
                      {/* Amazon Halo Pop-out Bubble Container */}
                      <div
                        className={`relative w-24 h-24 sm:w-28 sm:h-28 transition-transform duration-200 group-hover:scale-105 ${
                          isSelected ? 'scale-110 drop-shadow-md' : 'drop-shadow-xs'
                        }`}
                      >
                        <Image
                          src={bubble.image}
                          alt={bubble.name}
                          fill
                          unoptimized
                          priority
                          className="object-contain transition-transform duration-300 pointer-events-none"
                          sizes="(max-width: 640px) 96px, 120px"
                        />
                      </div>

                      {/* Bubble Label */}
                      <span
                        className={`mt-1.5 text-xs sm:text-[13px] transition-colors ${
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

            {/* 2. "THE PREMIUM EDIT" DARK FEATURED SECTION */}
            {PREMIUM_EDIT_PRODUCTS.length > 0 && (
              <section className="w-full bg-[#1A1F2C] rounded-2xl p-4 sm:p-5 text-white shadow-md">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                {/* Left Card: The Premium Edit Banner */}
                <div className="md:col-span-3 relative aspect-[4/5] rounded-xl overflow-hidden bg-black/40 border border-white/10 group cursor-pointer">
                  <Image
                    src="/images/western-wear/premium-edit-banner.jpg"
                    alt="The Premium Edit"
                    fill
                    unoptimized
                    className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
                    sizes="240px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4">
                    <span className="text-xs uppercase tracking-widest text-amber-300 font-semibold">
                      Curated Luxury
                    </span>
                    <h3 className="text-xl font-serif font-bold text-white leading-tight">
                      The Premium Edit
                    </h3>
                  </div>
                </div>

                {/* Right Side: Horizontal Product Cards Grid */}
                <div className="md:col-span-9 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  {PREMIUM_EDIT_PRODUCTS.map((prod) => {
                    const isSaved = isInWishlist(prod.id);
                    const isAdded = addedItemIds[prod.id];

                    return (
                      <div
                        key={prod.id}
                        className="group bg-white rounded-xl p-2.5 text-[#0F1111] shadow-xs hover:shadow-lg transition-all flex flex-col justify-between relative border border-stone-200"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            toggleItem({
                              id: prod.id,
                              productId: prod.id,
                              title: prod.title,
                              brand: prod.brand,
                              price: prod.price,
                              originalPrice: prod.originalPrice,
                              image: prod.image,
                              rating: prod.rating,
                              inStock: true,
                              boardIds: ['all', 'western-wear'],
                            })
                          }
                          className="absolute top-3.5 right-3.5 z-10 p-1 rounded-full bg-white/90 shadow-xs hover:bg-white"
                        >
                          <Heart
                            className={`h-3.5 w-3.5 ${
                              isSaved ? 'fill-[#E01A22] text-[#E01A22]' : 'text-stone-400'
                            }`}
                          />
                        </button>

                        <div>
                          {/* Image */}
                          <div className="relative aspect-[3/4] w-full rounded-lg bg-stone-50 overflow-hidden mb-2">
                            <Image
                              src={prod.image}
                              alt={prod.title}
                              fill
                              unoptimized
                              className="object-contain object-center group-hover:scale-105 transition-transform"
                            />
                          </div>

                          {/* Brand & Title */}
                          <div className="text-[11px] font-bold text-[#565959] uppercase tracking-wide">
                            {prod.brand}
                          </div>
                          <div className="text-xs font-medium text-[#0F1111] line-clamp-1 mt-0.5">
                            {prod.title}
                          </div>

                          {/* Price */}
                          <div className="mt-1.5 flex items-baseline gap-1.5">
                            <span className="text-sm font-bold text-[#0F1111]">
                              ₹{prod.price.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-[#565959] line-through">
                              ₹{prod.originalPrice.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>

                        {/* Add to Cart Button */}
                        <button
                          type="button"
                          onClick={() => handleAddToCart(prod)}
                          className="mt-2.5 w-full py-1 text-[11px] font-bold rounded-md bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          {isAdded ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-800" />
                              <span>Added</span>
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="h-3 w-3" />
                              <span>Add</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
)}

            {/* 3. PRODUCT LISTING SECTION (Filtered by selected category / filters) */}
            <section className="space-y-4 pt-2">
              {/* Filter Count & Sort Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E7E7E7]">
                <div className="flex items-center flex-wrap gap-2">
                  <span className="text-[13px] text-[#565959]">
                    Showing <span className="font-bold text-[#0F1111]">{filteredProducts.length}</span> results for{' '}
                    <span className="font-bold text-[#0F1111]">
                      {activeSubcategoryData ? activeSubcategoryData.name : 'Western Wear'}
                    </span>
                  </span>

                  {selectedSubCategory !== 'all' && (
                    <span className="inline-flex items-center gap-1.5 bg-[#E8F0FE] text-[#1967D2] text-xs px-2.5 py-0.5 rounded-full font-bold">
                      {activeSubcategoryData?.name}
                      <button
                        type="button"
                        onClick={() => setSelectedSubCategory('all')}
                        className="hover:text-red-600 text-sm leading-none ml-1 cursor-pointer"
                        title="Clear filter"
                      >
                        &times;
                      </button>
                    </span>
                  )}
                </div>

                {/* Sort Dropdown */}
                <div className="flex items-center gap-2 text-xs text-[#0F1111]">
                  <span className="text-[#565959]">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-[#F0F2F2] border border-[#D5D9D9] rounded-md px-2.5 py-1 text-xs font-medium focus:outline-none focus:border-[#007185] cursor-pointer"
                  >
                    <option value="featured">Featured</option>
                    <option value="low-to-high">Price: Low to High</option>
                    <option value="high-to-low">Price: High to Low</option>
                    <option value="rating">Customer Review</option>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map((product) => {
                  const isSaved = isInWishlist(product.id);
                  const isAdded = addedItemIds[product.id];

                  return (
                    <div
                      key={product.id}
                      className="group bg-white rounded-lg border border-[#E5E7EB] hover:border-[#007185] hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden p-3 relative"
                    >
                      {/* Wishlist Heart Icon */}
                      <button
                        type="button"
                        onClick={() =>
                          toggleItem({
                            id: product.id,
                            productId: product.id,
                            title: product.title,
                            brand: product.brand,
                            price: product.price,
                            originalPrice: product.originalPrice,
                            image: product.image,
                            rating: product.rating,
                            inStock: true,
                            boardIds: ['all', 'western-wear'],
                          })
                        }
                        className="absolute top-3.5 right-3.5 z-10 p-1.5 rounded-full bg-white/90 shadow-xs hover:bg-white transition-colors cursor-pointer"
                        title={isSaved ? 'Remove from Wishlist' : 'Add to Wishlist'}
                      >
                        <Heart
                          className={`h-4 w-4 ${
                            isSaved ? 'fill-[#E01A22] text-[#E01A22]' : 'text-stone-400 hover:text-[#E01A22]'
                          }`}
                        />
                      </button>

                      <div>
                        {/* Image */}
                        <div className="relative aspect-[3/4] w-full rounded-md bg-[#F7F7F7] overflow-hidden mb-2.5">
                          <Image
                            src={product.image}
                            alt={product.title}
                            fill
                            unoptimized
                            className="object-contain object-center group-hover:scale-105 transition-transform duration-300"
                            sizes="(max-width: 640px) 100vw, 240px"
                          />
                          {product.isBestSeller && (
                            <div className="absolute top-2 left-2 bg-[#E67A00] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-xs tracking-wider uppercase">
                              Best Seller
                            </div>
                          )}
                        </div>

                        {/* Brand */}
                        <div className="text-xs font-bold text-[#565959] uppercase tracking-wide">
                          {product.brand}
                        </div>

                        {/* Title */}
                        <h4 className="text-xs sm:text-[13px] font-medium text-[#0F1111] line-clamp-2 mt-0.5 leading-snug group-hover:text-[#007185]">
                          {product.title}
                        </h4>

                        {/* Star Rating & Reviews */}
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="flex items-center text-[#DE7922]">
                            <Star className="h-3.5 w-3.5 fill-[#DE7922]" />
                            <span className="text-xs font-bold ml-1 text-[#0F1111]">
                              {product.rating}
                            </span>
                          </div>
                          <span className="text-xs text-[#007185]">({product.reviews})</span>
                        </div>

                        {/* Prime Badge */}
                        {product.isPrime && (
                          <div className="mt-1 flex items-center gap-1">
                            <span className="text-[11px] font-extrabold text-[#007185]">
                              <span className="text-[#00A8E1]">✓</span>prime
                            </span>
                            <span className="text-[11px] text-[#565959] font-medium">
                              {product.deliveryDate}
                            </span>
                          </div>
                        )}

                        {/* Price & Discounts */}
                        <div className="mt-2 flex items-baseline gap-2">
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
                      </div>

                      {/* Add to Cart Button */}
                      <button
                        type="button"
                        onClick={() => handleAddToCart(product)}
                        className="mt-3 w-full py-1.5 px-3 rounded-full text-xs font-bold bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        {isAdded ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-800" />
                            <span>Added to Cart</span>
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="h-3.5 w-3.5" />
                            <span>Add to Cart</span>
                          </>
                        )}
                      </button>
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
