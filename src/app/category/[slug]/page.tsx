'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, redirect } from 'next/navigation';
import {
  ChevronRight,
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
import { formatINR } from '@/lib/utils';
import { useCategoryProducts, CategoryProductItem } from '@/hooks/use-category-products';
import { CategoryProductCard } from '@/components/products/category-product-card';

interface PageProps {
  params: {
    slug: string;
  };
}

// 5 Visual Circles (Exact match to Amazon Screenshot)
const ETHNIC_VISUAL_BUBBLES = [
  {
    id: 'kurtas',
    name: 'Kurtas & kurtis',
    slug: 'kurtas',
    image: '/images/ethnic-bubbles/kurtas-kurtis.png',
    count: '2,400+ styles',
  },
  {
    id: 'salwarsuits',
    name: 'Salwarsuits',
    slug: 'salwarsuits',
    image: '/images/ethnic-bubbles/salwar-suits.png',
    count: '1,800+ styles',
  },
  {
    id: 'ethnic-bottoms',
    name: 'Ethnic bottoms',
    slug: 'ethnic-bottoms',
    image: '/images/ethnic-bubbles/ethnic-bottoms.png',
    count: '950+ styles',
  },
  {
    id: 'dupatta',
    name: 'Dupatta',
    slug: 'dupatta',
    image: '/images/ethnic-bubbles/dupatta.png',
    count: '1,100+ styles',
  },
  {
    id: 'plus-size',
    name: 'Plus size',
    slug: 'plus-size',
    image: '/images/ethnic-bubbles/plus-size.png',
    count: '820+ styles',
  },
];

// Orange banner featured products
const ORANGE_BANNER_FEATURED: any[] = [];

// Brands in focus (Exact Amazon Screenshot Match)
const BRANDS_IN_FOCUS: any[] = [];

// Rich Product Catalogg for Women's Ethnic Wear
const ETHNIC_PRODUCTS: any[] = [];

function WomensEthnicWearContent({ params }: PageProps) {
  const searchParams = useSearchParams();
  const subParam = searchParams?.get('sub');
  const currentCategorySlug = decodeURIComponent(params?.slug || 'ethnic').toLowerCase().trim();

  // Dynamic products from PostgreSQL database
  const { products: liveDbProducts, dynamicBrands } = useCategoryProducts({ categoryKey: currentCategorySlug });

  // Navigation & Filter States
  const [activeTab, setActiveTab] = useState<'kurtas-salwar' | 'sarees-dress'>('kurtas-salwar');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>(subParam || 'all');

  useEffect(() => {
    if (subParam) {
      setSelectedSubCategory(subParam);
    }
  }, [subParam]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [primeOnly, setPrimeOnly] = useState<boolean>(false);
  const [minDiscount, setMinDiscount] = useState<number>(0);
  const [priceRange, setPriceRange] = useState<'all' | 'under-500' | '500-1000' | '1000-2500' | 'over-2500'>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'low-to-high' | 'high-to-low' | 'rating' | 'newest'>('featured');
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({});

  const { addItem, openCart } = useCartStore();
  const { items: wishlistItems, toggleItem, isInWishlist } = useWishlistStore();

  const handleAddToCart = (product: CategoryProductItem) => {
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
      vendorName: product.vendorName || product.brand,
    });
    openCart();
    setAddedItemIds((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedItemIds((prev) => ({ ...prev, [product.id]: false }));
    }, 2000);
  };

  const toggleBrand = (brandName: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brandName) ? prev.filter((b) => b !== brandName) : [...prev, brandName]
    );
  };

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    let result = [...liveDbProducts];

    if (activeTab === 'sarees-dress') {
      result = result.filter(
        (p) =>
          p.category.includes('saree') ||
          p.subcategory.includes('saree') ||
          p.category.includes('salwarsuit')
      );
    }

    if (selectedSubCategory !== 'all') {
      const sub = selectedSubCategory.toLowerCase();
      result = result.filter(
        (p) =>
          p.category.toLowerCase().includes(sub) ||
          p.subcategory.includes(sub) ||
          p.subCategory.toLowerCase().includes(sub) ||
          p.title.toLowerCase().includes(sub)
      );
    }

    if (primeOnly) {
      result = result.filter((p) => p.isPrime);
    }

    if (selectedBrands.length > 0) {
      result = result.filter((p) => selectedBrands.includes(p.brand));
    }

    // Dynamic Discount Filter (Exact Amazon % calculation)
    if (minDiscount > 0) {
      result = result.filter((p) => {
        const discountPct = Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100);
        return discountPct >= minDiscount;
      });
    }

    // Dynamic Price Range Filter
    if (priceRange === 'under-500') {
      result = result.filter((p) => p.price < 500);
    } else if (priceRange === '500-1000') {
      result = result.filter((p) => p.price >= 500 && p.price <= 1000);
    } else if (priceRange === '1000-2500') {
      result = result.filter((p) => p.price >= 1000 && p.price <= 2500);
    } else if (priceRange === 'over-2500') {
      result = result.filter((p) => p.price > 2500);
    }

    if (sortBy === 'low-to-high') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'high-to-low') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      result.sort((a, b) => b.rating - a.rating);
    }

    return result;
  }, [liveDbProducts, activeTab, selectedSubCategory, primeOnly, selectedBrands, minDiscount, priceRange, sortBy]);

  return (
    <div className="w-full bg-[#FFFFFF] min-h-screen text-[#0F1111]">
      {/* 1. Department Sub-Nav Bar (Amazon Fashion with Women Active & Mega Menu) */}
      <FashionDepartmentSubNav activeItem="women" />

      {/* 2. Main Page Layout: Compact Amazon Sidebar (210px) + Expansive Main Area */}
      <div className="w-full max-w-[1500px] mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* ========================================================================= */}
          {/* LEFT SIDEBAR: Category Hierarchy + Prime + Brands (Compact 210px width)   */}
          {/* ========================================================================= */}
          <aside className="w-full lg:w-[210px] lg:flex-shrink-0 space-y-5 lg:border-r lg:border-[#E7E7E7] lg:pr-5 select-none">
            {/* Category Tree Navigation */}
            <div>
              <span className="text-[13px] font-bold uppercase tracking-wider text-[#0F1111] block mb-2">
                Category
              </span>
              <ul className="text-[13px] space-y-1 text-[#0F1111]">
                <li>
                  <Link
                    href="/products"
                    className="text-[#007185] hover:underline flex items-center gap-1.5 py-0.5"
                  >
                    <span className="text-[#565959] text-xs">&lsaquo;</span> Clothing &amp; Accessories
                  </Link>
                </li>
                <li className="pl-3">
                  <Link
                    href="/products?category=women"
                    className="text-[#007185] hover:underline flex items-center gap-1.5 py-0.5"
                  >
                    <span className="text-[#565959] text-xs">&lsaquo;</span> Women
                  </Link>
                </li>
                <li className="pl-6 font-bold text-[#0F1111] py-0.5">
                  Ethnic Wear
                </li>

                {/* Subcategories (Directly matching Amazon Screenshot) */}
                <li className="pl-8 space-y-1.5 text-[#333333] pt-1">
                  {[
                    { name: 'Blouses', slug: 'kurtas' },
                    { name: 'Bottom Wear', slug: 'ethnic-bottoms' },
                    { name: 'Chunnis & Dupattas', slug: 'dupatta' },
                    { name: 'Dress Material', slug: 'salwarsuits' },
                    { name: 'Gowns', slug: 'kurtas' },
                    { name: 'Kurtas & Kurtis', slug: 'kurtas' },
                    { name: 'Lehenga Cholis', slug: 'salwarsuits' },
                    { name: 'Salwar Suits', slug: 'salwarsuits' },
                    { name: 'Sarees', slug: 'sarees' },
                  ].map((sub) => {
                    if (sub.name === 'Sarees') {
                      return (
                        <Link
                          key={sub.name}
                          href="/category/sarees"
                          className="block text-left text-[13px] text-[#333333] hover:text-[#007185] hover:underline transition-colors"
                        >
                          {sub.name}
                        </Link>
                      );
                    }
                    const isSelected = selectedSubCategory === sub.slug;
                    return (
                      <button
                        key={sub.name}
                        type="button"
                        onClick={() =>
                          setSelectedSubCategory((prev) => (prev === sub.slug ? 'all' : sub.slug))
                        }
                        className={`block text-left text-[13px] hover:text-[#007185] hover:underline transition-colors ${
                          isSelected ? 'font-bold text-[#C7511F]' : 'text-[#333333]'
                        }`}
                      >
                        {sub.name}
                      </button>
                    );
                  })}
                </li>
              </ul>
            </div>

            {/* Brands Filter (Live Database Brands Only) */}
            {dynamicBrands.length > 0 && (
              <div className="pt-3 border-t border-[#E7E7E7] space-y-2">
                <span className="text-[13px] font-bold text-[#0F1111] block">
                  Brands
                </span>
                <div className="space-y-1.5 text-[13px]">
                  {dynamicBrands.map((brandName) => (
                    <label
                      key={brandName}
                      className="flex items-center gap-2 cursor-pointer hover:text-[#007185] select-none py-0.5"
                    >
                      <input
                        type="checkbox"
                        checked={selectedBrands.includes(brandName)}
                        onChange={() => toggleBrand(brandName)}
                        className="rounded text-[#007185] h-3.5 w-3.5 border-[#888]"
                      />
                      <span className="text-[13px] text-[#0F1111]">{brandName}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Price Filter */}
            <div className="pt-3 border-t border-[#E7E7E7] space-y-1.5 text-[13px]">
              <span className="text-[13px] font-bold text-[#0F1111] block">
                Price
              </span>
              <ul className="space-y-1 text-[#333333]">
                <li>
                  <button
                    type="button"
                    onClick={() => setPriceRange((prev) => (prev === 'under-500' ? 'all' : 'under-500'))}
                    className={`hover:text-[#007185] hover:underline block text-left ${
                      priceRange === 'under-500' ? 'font-bold text-[#C7511F]' : ''
                    }`}
                  >
                    Under &#8377;500
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setPriceRange((prev) => (prev === '500-1000' ? 'all' : '500-1000'))}
                    className={`hover:text-[#007185] hover:underline block text-left ${
                      priceRange === '500-1000' ? 'font-bold text-[#C7511F]' : ''
                    }`}
                  >
                    &#8377;500 - &#8377;1,000
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setPriceRange((prev) => (prev === '1000-2500' ? 'all' : '1000-2500'))}
                    className={`hover:text-[#007185] hover:underline block text-left ${
                      priceRange === '1000-2500' ? 'font-bold text-[#C7511F]' : ''
                    }`}
                  >
                    &#8377;1,000 - &#8377;2,500
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setPriceRange((prev) => (prev === 'over-2500' ? 'all' : 'over-2500'))}
                    className={`hover:text-[#007185] hover:underline block text-left ${
                      priceRange === 'over-2500' ? 'font-bold text-[#C7511F]' : ''
                    }`}
                  >
                    Over &#8377;2,500
                  </button>
                </li>
              </ul>
            </div>

            {/* Discount Filter (Real-time dynamic filtering) */}
            <div className="pt-3 border-t border-[#E7E7E7] space-y-1.5 text-[13px]">
              <span className="text-[13px] font-bold text-[#0F1111] block">
                Discount
              </span>
              <ul className="space-y-1 text-[#333333]">
                {[10, 25, 50, 70].map((disc) => (
                  <li key={disc}>
                    <button
                      type="button"
                      onClick={() => setMinDiscount((prev) => (prev === disc ? 0 : disc))}
                      className={`hover:text-[#007185] hover:underline block text-left ${
                        minDiscount === disc ? 'font-bold text-[#C7511F]' : ''
                      }`}
                    >
                      {disc}% Off or more
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* ========================================================================= */}
          {/* MAIN STOREFRONT AREA: Header + Metallic Gold Tabs + 5 Circles + Orange Bar */}
          {/* ========================================================================= */}
          <main className="w-full flex-1 min-w-0 space-y-4">
            {/* Page Title (Exact match to Amazon Screenshot) */}
            <div>
              <h1 className="text-2xl sm:text-[28px] font-bold text-[#0F1111] tracking-tight">
                Womens Ethnic Wear
              </h1>
            </div>

            {/* Metallic Golden Ribbons / Tabs (Exact match to Screenshot) */}
            <div className="flex items-center gap-3 overflow-x-auto pb-1">
              {/* Tab 1: KURTAS & SALWAR SUITS */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('kurtas-salwar');
                  setSelectedSubCategory('all');
                }}
                className={`px-7 py-3 text-xs sm:text-[13px] font-black uppercase tracking-wider transition-all select-none shadow-sm cursor-pointer ${
                  activeTab === 'kurtas-salwar'
                    ? 'bg-gradient-to-r from-[#CFA43B] via-[#E5C76E] to-[#C0942C] text-[#1A1406] border-t border-l border-[#FBE89B] border-r border-b border-[#8C6B1C] shadow-[0_2px_4px_rgba(0,0,0,0.2)]'
                    : 'bg-gradient-to-r from-[#F6ECD5] via-[#FFF8E8] to-[#EBD8B2] text-[#423617] border border-[#D5C296] hover:brightness-95'
                }`}
              >
                Kurtas &amp; Salwar Suits
              </button>

              {/* Tab 2: SAREES & DRESS MATERIALS */}
              <Link
                href="/category/sarees"
                className="px-7 py-3 text-xs sm:text-[13px] font-bold uppercase tracking-wider transition-all select-none shadow-sm cursor-pointer bg-gradient-to-r from-[#F6ECD5] via-[#FFF8E8] to-[#EBD8B2] text-[#423617] border border-[#D5C296] hover:brightness-95 text-center inline-block"
              >
                Sarees &amp; Dress Materials
              </Link>
            </div>

            {/* 5 Circular Visual Categories in White Card Container (Screenshot Exact Match) */}
            <div className="bg-white border border-[#E7E7E7] rounded-lg p-5 sm:p-6 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 sm:gap-6 items-center justify-items-center">
                {ETHNIC_VISUAL_BUBBLES.map((bubble) => {
                  const isActive = selectedSubCategory === bubble.slug;
                  return (
                    <button
                      key={bubble.id}
                      type="button"
                      onClick={() =>
                        setSelectedSubCategory((prev) => (prev === bubble.slug ? 'all' : bubble.slug))
                      }
                      className="group flex flex-col items-center cursor-pointer select-none text-center"
                    >
                      {/* Amazon Halo Avatar with Pop-out Effect */}
                      <div
                        className={`relative w-24 h-24 sm:w-28 sm:h-28 transition-transform duration-200 group-hover:scale-105 ${
                          isActive ? 'scale-108 drop-shadow-md' : 'drop-shadow-xs'
                        }`}
                      >
                        <Image
                          src={bubble.image}
                          alt={bubble.name}
                          fill
                          unoptimized
                          className="object-contain transition-transform duration-300"
                          sizes="120px"
                        />
                      </div>
                      <span
                        className={`mt-2.5 text-[13px] font-medium transition-colors ${
                          isActive
                            ? 'text-[#C7511F] font-bold underline'
                            : 'text-[#0F1111] group-hover:text-[#007185]'
                        }`}
                      >
                        {bubble.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bright Orange Header Banner ("Introducing: ...") - Exact Screenshot Match */}
            {ORANGE_BANNER_FEATURED.length > 0 && (
              <div className="rounded-lg overflow-hidden bg-gradient-to-r from-[#F26522] via-[#F26522] to-[#E65516] p-4 text-white shadow-md">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  {/* Left Title section */}
                  <div className="md:col-span-3 pr-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white/80 block">
                      Brand Spotlight
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold font-headline text-white leading-tight mt-0.5">
                      Introducing:
                    </h3>
                    <p className="text-xs text-white/90 mt-1">
                      Festive ethnic designer editions at unbeatable launch prices
                    </p>
                    <span className="inline-block mt-2 text-[11px] bg-white text-[#F26522] font-black px-2.5 py-1 rounded shadow-xs">
                      Min. 60% Off
                    </span>
                  </div>

                  {/* Right side: 5 featured cards sitting on the orange banner */}
                  <div className="md:col-span-9 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {ORANGE_BANNER_FEATURED.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white text-[#0F1111] rounded-md overflow-hidden p-2 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
                      >
                        <div className="relative aspect-[3/4] w-full overflow-hidden rounded bg-stone-100 mb-1.5">
                          <Image
                            src={item.image}
                            alt={item.title}
                            fill
                            unoptimized
                            className="object-cover object-top hover:scale-105 transition-transform duration-300"
                            sizes="140px"
                          />
                        </div>
                        <div>
                          <span className="text-[11px] font-extrabold text-[#0F1111] block truncate">
                            {item.brand}
                          </span>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-[12px] font-black text-[#B12704]">
                              &#8377;{item.price}
                            </span>
                            <span className="text-[10px] text-[#565959] line-through">
                              &#8377;{item.originalPrice}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-[#CC0C39] block">
                            {item.discount}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Brands in focus (Exact match to Amazon Screenshot) */}
            {BRANDS_IN_FOCUS.length > 0 && (
              <div className="pt-2 pb-1">
                <h2 className="text-[17px] sm:text-[19px] font-bold text-[#0F1111] mb-3">
                  Brands in focus
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {BRANDS_IN_FOCUS.map((brand) => {
                    const isSelected = selectedBrands.includes(brand.brandQuery);
                    return (
                      <button
                        key={brand.id}
                        type="button"
                        onClick={() => {
                          setSelectedBrands((prev) =>
                            prev.includes(brand.brandQuery) ? [] : [brand.brandQuery]
                          );
                          setMinDiscount((prev) => (prev === brand.minDiscount ? 0 : brand.minDiscount));
                        }}
                        className="group flex flex-col items-center select-none cursor-pointer text-center"
                      >
                        {/* Image Card with gradient and white brand name */}
                        <div
                          className={`relative aspect-[3/4] w-full rounded-md overflow-hidden bg-stone-100 border transition-all duration-200 ${
                            isSelected
                              ? 'border-[#FF9900] ring-2 ring-[#FF9900] shadow-md'
                              : 'border-[#E7E7E7] hover:border-[#FF9900] hover:shadow-sm'
                          }`}
                        >
                          <Image
                            src={brand.image}
                            alt={brand.name}
                            fill
                            unoptimized
                            className="object-cover object-top group-hover:scale-104 transition-transform duration-300"
                            sizes="(max-width: 640px) 150px, 200px"
                          />
                          {/* Dark gradient overlay at bottom for brand name */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex items-end justify-center pb-2.5 px-1">
                            <span className="text-white font-extrabold text-[15px] sm:text-[16px] tracking-wide drop-shadow-sm font-headline">
                              {brand.name}
                            </span>
                          </div>
                        </div>

                        {/* Discount label below card */}
                        <span
                          className={`text-[12px] sm:text-[13px] font-bold mt-1.5 transition-colors ${
                            isSelected ? 'text-[#C7511F]' : 'text-[#0F1111] group-hover:text-[#007185]'
                          }`}
                        >
                          {brand.discountText}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Results Header: Count + Active Filter Tags + Sort By */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 pb-2 border-b border-[#E7E7E7]">
              <div>
                <span className="text-[13px] text-[#565959]">
                  Showing <span className="font-bold text-[#0F1111]">{filteredProducts.length}</span> results for{' '}
                  <span className="font-bold text-[#C7511F]">&quot;Womens Ethnic Wear&quot;</span>
                </span>
                {selectedSubCategory !== 'all' && (
                  <span className="ml-2 inline-flex items-center gap-1 bg-[#F0F2F2] text-[#0F1111] text-xs px-2 py-0.5 rounded font-medium">
                    Filter: {selectedSubCategory}
                    <button
                      type="button"
                      onClick={() => setSelectedSubCategory('all')}
                      className="text-stone-500 hover:text-black ml-1 text-xs"
                    >
                      &times;
                    </button>
                  </span>
                )}
                {minDiscount > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 bg-[#FFF4E5] text-[#C7511F] border border-[#FFD814] text-xs px-2 py-0.5 rounded font-bold">
                    Min. {minDiscount}% Off
                    <button
                      type="button"
                      onClick={() => setMinDiscount(0)}
                      className="text-[#C7511F] hover:text-black ml-1 text-xs"
                    >
                      &times;
                    </button>
                  </span>
                )}
                {selectedBrands.length > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 bg-[#E7F4F5] text-[#007185] border border-[#007185]/30 text-xs px-2 py-0.5 rounded font-medium">
                    Brand: {selectedBrands.join(', ')}
                    <button
                      type="button"
                      onClick={() => setSelectedBrands([])}
                      className="text-[#007185] hover:text-black ml-1 text-xs"
                    >
                      &times;
                    </button>
                  </span>
                )}
              </div>

              {/* Sort By Dropdown */}
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
                  <option value="rating">Avg. Customer Review</option>
                </select>
              </div>
            </div>

            {/* Empty State when 0 products exist */}
            {filteredProducts.length === 0 ? (
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-10 text-center space-y-2 my-4">
                <p className="text-base font-semibold text-stone-700">
                  No products currently available in this collection
                </p>
                <p className="text-xs text-stone-500">
                  Verified artisan partners are onboarding new catalogue pieces. Check back shortly!
                </p>
              </div>
            ) : (
              /* Main Product Cards Grid (Amazon Product Listing Style) */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map((product) => (
                  <CategoryProductCard
                    key={product.id}
                    product={product}
                    isSaved={isInWishlist(product.id)}
                    isAdded={Boolean(addedItemIds[product.id])}
                    onToggleWishlist={(p) =>
                      toggleItem({
                        id: p.id,
                        productId: p.id,
                        title: p.title,
                        brand: p.brand,
                        price: p.price,
                        originalPrice: p.originalPrice,
                        image: p.image,
                        rating: p.rating,
                        inStock: true,
                        boardIds: ['all', 'festive'],
                      })
                    }
                    onAddToCart={(p) => handleAddToCart(p)}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function WomensEthnicWearPage(props: PageProps) {
  const slug = (props.params?.slug || '').toLowerCase().trim();
  const cleanSlug = decodeURIComponent(slug).replace(/\s+/g, '-');
  if (
    cleanSlug === 'mens-clothing' ||
    cleanSlug === 'men-clothing' ||
    cleanSlug === 'men' ||
    cleanSlug === 'mens'
  ) {
    redirect('/category/mens-clothing');
  }

  if (
    cleanSlug === 'kids' ||
    cleanSlug === 'kid' ||
    cleanSlug === 'kids-clothing'
  ) {
    redirect('/category/boys-clothing');
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <WomensEthnicWearContent {...props} />
    </Suspense>
  );
}
