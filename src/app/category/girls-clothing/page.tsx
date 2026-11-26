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
// DATA & TYPES FOR GIRLS' CLOTHING
// ============================================================================
interface GirlsSubCategory {
  name: string;
  slug: string;
}

const GIRLS_SUBCATEGORIES: GirlsSubCategory[] = [
  { name: 'All Girls Clothing', slug: 'all' },
  { name: 'Tops, T-Shirts & Shirts', slug: 'tops-tshirts' },
  { name: 'Dresses & Jumpsuits', slug: 'dresses' },
  { name: 'Jeans', slug: 'jeans' },
  { name: 'Ethnic Wear', slug: 'ethnic' },
  { name: 'Sleepwear', slug: 'sleepwear' },
  { name: 'Clothing Sets', slug: 'sets' },
  { name: 'Innerwear', slug: 'innerwear' },
  { name: 'Shrugs', slug: 'shrugs' },
  { name: 'Sportswear', slug: 'sportswear' },
  { name: 'Winter Wear', slug: 'winterwear' },
];

const BRANDS_LIST: string[] = [];

const AGE_SIZES = [
  '2 - 3 years',
  '3 - 4 years',
  '4 - 5 years',
  '5 - 6 years',
  '6 - 7 years',
  '7 - 8 years',
  '8 - 9 years',
  '9 - 10 years',
  '10 - 11 years',
];

interface ColorSwatch {
  name: string;
  hex: string;
}

interface GirlsClothingProduct {
  id: string;
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
  isLimitedDeal?: boolean;
  isAmazonChoice?: boolean;
  boughtPastMonth?: string;
  unitPriceNotice?: string;
  couponNotice?: string;
  deliveryDate: string;
  swatches?: ColorSwatch[];
  sizes: string[];
}

const GIRLS_PRODUCTS : GirlsClothingProduct[] = [];

function GirlsClothingContent() {
  const { products: liveDbProducts, dynamicBrands } = useCategoryProducts({ categoryKey: 'girls-clothing' });
  const searchParams = useSearchParams();
  const subParam = searchParams.get('sub') || 'all';

  // Filters State
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>(subParam);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [primeOnly, setPrimeOnly] = useState<boolean>(false);
  const [priceRange, setPriceRange] = useState<string>('all');
  const [minRating, setMinRating] = useState<number>(0);
  const [dealsOnly, setDealsOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('featured');

  // Selected Swatches state per product
  const [activeSwatches, setActiveSwatches] = useState<Record<string, number>>({});

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

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const clearAllFilters = () => {
    setSelectedSubCategory('all');
    setSelectedBrands([]);
    setSelectedSizes([]);
    setPrimeOnly(false);
    setPriceRange('all');
    setMinRating(0);
    setDealsOnly(false);
  };

  const hasActiveFilters =
    selectedSubCategory !== 'all' ||
    selectedBrands.length > 0 ||
    selectedSizes.length > 0 ||
    primeOnly ||
    priceRange !== 'all' ||
    minRating > 0 ||
    dealsOnly;

  // Filter & Sort
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

    if (selectedSizes.length > 0) {
      result = result.filter((p) =>
        (p.sizes || []).some((s: string) => selectedSizes.includes(s))
      );
    }

    if (primeOnly) {
      result = result.filter((p) => p.isPrime);
    }

    if (dealsOnly) {
      result = result.filter((p) => p.isLimitedDeal || p.isAmazonChoice);
    }

    if (minRating > 0) {
      result = result.filter((p) => p.rating >= minRating);
    }

    if (priceRange !== 'all') {
      if (priceRange === 'under-300') result = result.filter((p) => p.price < 300);
      else if (priceRange === '300-500') result = result.filter((p) => p.price >= 300 && p.price <= 500);
      else if (priceRange === '500-1000') result = result.filter((p) => p.price >= 500 && p.price <= 1000);
      else if (priceRange === '1000-1500') result = result.filter((p) => p.price >= 1000 && p.price <= 1500);
      else if (priceRange === 'over-1500') result = result.filter((p) => p.price > 1500);
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
    selectedSizes,
    primeOnly,
    dealsOnly,
    priceRange,
    minRating,
    sortBy,
  ]);

  const activeSubcategoryData = useMemo(() => {
    return GIRLS_SUBCATEGORIES.find((c) => c.slug === selectedSubCategory);
  }, [selectedSubCategory]);

  return (
    <div className="w-full bg-[#FFFFFF] min-h-screen text-[#0F1111]">
      {/* 1. Department Sub-Nav Bar (Active item: Kids) */}
      <FashionDepartmentSubNav activeItem="kids" />

      {/* 2. Breadcrumbs: Fashion > Kids > Girls > Clothing */}
      <div className="border-b border-[#E7E7E7] bg-[#FAFAFA] py-2 px-4 sm:px-6">
        <div className="max-w-[1450px] mx-auto flex items-center gap-1.5 text-xs text-[#565959] flex-wrap">
          <Link href="/products?category=fashion" className="hover:text-[#C45500] hover:underline">
            Fashion
          </Link>
          <ChevronRight className="h-3 w-3 text-stone-400" />
          <Link href="/products?category=kids" className="hover:text-[#C45500] hover:underline">
            Kids
          </Link>
          <ChevronRight className="h-3 w-3 text-stone-400" />
          <Link href="/category/girls-clothing" className="hover:text-[#C45500] hover:underline">
            Girls
          </Link>
          <ChevronRight className="h-3 w-3 text-stone-400" />
          <button
            type="button"
            onClick={() => setSelectedSubCategory('all')}
            className={`hover:text-[#C45500] hover:underline cursor-pointer ${
              selectedSubCategory === 'all' ? 'font-semibold text-[#0F1111]' : 'text-[#565959]'
            }`}
          >
            Clothing
          </button>
          {activeSubcategoryData && activeSubcategoryData.slug !== 'all' && (
            <>
              <ChevronRight className="h-3 w-3 text-stone-400" />
              <span className="font-semibold text-[#C45500]">{activeSubcategoryData.name}</span>
            </>
          )}
        </div>
      </div>

      {/* 3. Introduction Banner (Exact match to Screenshot 1: GIRLS' FASHION) */}
      <section className="border-b border-[#E7E7E7] bg-white py-3 px-4 sm:px-6">
        <div className="max-w-[1450px] mx-auto">
          <h1 className="text-sm font-bold text-[#C45500] uppercase tracking-wider mb-1.5">
            GIRLS&apos; FASHION
          </h1>
          <p className="text-[11.5px] leading-relaxed text-[#565959] max-w-[1400px]">
            Our girls&apos; clothing collection includes a plethora of dresses, jumpsuits, tops, t-shirts, girls&apos; jeans, skirts, shorts, salwar suits, tights and leggings, lehenga cholis, girls&apos; shararas, anarkalis, night dresses, jackets, winterwear, and much more, to dress your fashionistas for each of their moods, events, and needs. While our curations are designed basis the latest kids&apos; trends on international fashion charts, we ensure they are comfortable enough for extended wear time. If your girls are budding fashion influencers, and have an early interest in personal style or just playing dress-up (thanks to the rise of fashion influencers across social media channels), they&apos;ll love to browse through our endless scroll of the coolest fashion pieces. For summers, we have cute tops and breezy dresses for your girls to get sunshine-ready, and for the colder months, they will surely be able to pick out a stylish jacket or hoodie to stay cosy in. For those fun kids&apos; parties and birthday celebrations, we have stunning partywear dresses and gowns for her to stand out in her friends&apos; circle, and for those family functions, our range of Indian wear and daily ethnic picks will keep your daughters sorted. Some of our favourite girls&apos; clothing brands are Ed-a-Mamma, UCB, ATUN, USPA Kids, Allen Solly Junior, BIBA Girls, MAX, Unlimited, Cherokee and more.
          </p>
        </div>
      </section>

      {/* 4. Main Two-Column Layout */}
      <div className="max-w-[1450px] mx-auto px-3 sm:px-6 py-4">
        <div className="flex gap-6 items-start">
          {/* ========================================================================= */}
          {/* LEFT SIDEBAR: Amazon Compact Width (210px) */}
          {/* ========================================================================= */}
          <aside className="w-[210px] flex-shrink-0 hidden md:block space-y-5 text-sm">
            {/* Category Hierarchy */}
            <div>
              <Link
                href="/products?category=kids"
                className="text-xs text-[#565959] hover:text-[#C45500] hover:underline flex items-center gap-1 mb-1"
              >
                &lsaquo; Clothing &amp; Accessories
              </Link>
              <h3 className="text-xs font-bold text-[#0F1111] uppercase tracking-wide pl-2 mb-1">
                Girls clothing
              </h3>
              <div className="text-xs font-semibold text-[#0F1111] pl-3 mb-1.5">
                Girls
              </div>
              <ul className="space-y-1 text-xs pl-4 border-l-2 border-[#007185]/30 ml-2">
                {GIRLS_SUBCATEGORIES.map((cat) => {
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
              <div className="pt-2.5 mt-2.5 border-t border-stone-200 pl-2">
                <Link
                  href="/category/boys-clothing"
                  className="hover:text-[#C45500] hover:underline flex items-center justify-between text-xs font-semibold text-stone-700"
                >
                  <span>Boys Clothing</span>
                  <span className="text-stone-400">&rsaquo;</span>
                </Link>
              </div>
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

            {/* Price Filter (Screenshot 2) */}
            <div className="border-t border-[#E7E7E7] pt-4">
              <h4 className="text-xs font-bold text-[#0F1111] mb-2">Price</h4>
              <div className="space-y-1 text-xs">
                {[
                  { label: 'All Prices', val: 'all' },
                  { label: 'Under ₹300', val: 'under-300' },
                  { label: '₹300 - ₹500', val: '300-500' },
                  { label: '₹500 - ₹1,000', val: '500-1000' },
                  { label: '₹1,000 - ₹1,500', val: '1000-1500' },
                  { label: 'Over ₹1,500', val: 'over-1500' },
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

            {/* Customer Review Filter */}
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

            {/* Deals & Discounts (Screenshot 2) */}
            <div className="border-t border-[#E7E7E7] pt-4">
              <h4 className="text-xs font-bold text-[#0F1111] mb-2">Deals &amp; Discounts</h4>
              <div className="space-y-1 text-xs">
                <button
                  type="button"
                  onClick={() => setDealsOnly((prev) => !prev)}
                  className={`block w-full text-left py-0.5 hover:text-[#C45500] cursor-pointer ${
                    dealsOnly ? 'font-bold text-[#C45500]' : 'text-[#0F1111]'
                  }`}
                >
                  Today&apos;s Deals &amp; Offers
                </button>
              </div>
            </div>

            {/* Children's Clothing Size (Screenshot 2) */}
            <div className="border-t border-[#E7E7E7] pt-4">
              <h4 className="text-xs font-bold text-[#0F1111] mb-2">Children&apos;s Clothing Size</h4>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {AGE_SIZES.map((sz) => {
                  const isChecked = selectedSizes.includes(sz);
                  return (
                    <label
                      key={sz}
                      className="flex items-center gap-2 cursor-pointer text-xs select-none hover:text-[#C45500]"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSize(sz)}
                        className="rounded text-[#007185] focus:ring-[#007185] h-3.5 w-3.5"
                      />
                      <span className={isChecked ? 'font-bold text-[#0F1111]' : 'text-[#333333]'}>
                        {sz}
                      </span>
                    </label>
                  );
                })}
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
          {/* MAIN STOREFRONT AREA: Products Grid (Exact Match to Screenshots)          */}
          {/* ========================================================================= */}
          <main className="flex-1 min-w-0 space-y-4">
            {/* Header: Results count + Sort By */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E7E7E7] pb-3">
              <div>
                <p className="text-sm font-medium text-[#0F1111]">
                  1-{filteredProducts.length} of over 8,000 results for{' '}
                  <span className="text-[#C45500] font-bold">
                    &quot;{activeSubcategoryData?.name || 'Girls clothing'}&quot;
                  </span>
                </p>

                {/* Filter tags if active */}
                {selectedBrands.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap mt-2 text-xs">
                    <span className="text-[#565959]">Filtered by brand:</span>
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

              {/* Sort By Dropdown */}
              <div className="flex items-center gap-2 text-xs flex-shrink-0">
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

            {/* Products Grid (Exact 3-5 Column Amazon Product Cards) */}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map((product) => {
                const isWishlisted = wishlist.includes(product.id);
                const activeSwatchIdx = activeSwatches[product.id] || 0;

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

                    {/* Amazon's Choice Badge */}
                    {product.isAmazonChoice && (
                      <div className="absolute top-3 left-3 z-10 bg-[#0F1111] text-white text-[10px] font-bold px-2 py-0.5 rounded-2xs tracking-tight shadow-xs flex items-center gap-1">
                        <span className="text-[#F59E0B]">Amazon&apos;s</span>
                        <span className="text-white">Choice</span>
                      </div>
                    )}

                    {/* Product Image */}
                    <Link
                      href={`/products/${product.slug || product.id}`}
                      className="relative aspect-[3/4] w-full bg-[#f8f8f8] rounded-md overflow-hidden mb-2.5 block cursor-pointer"
                    >
                      <Image
                        src={product.image}
                        alt={product.title}
                        fill
                        unoptimized
                        className="object-contain p-2 group-hover:scale-104 transition-transform duration-300"
                        sizes="(max-width: 640px) 300px, 240px"
                      />
                    </Link>

                    {/* Color Swatches (Exact from screenshots) */}
                    {product.swatches && product.swatches.length > 0 && (
                      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                        {product.swatches.map((swatch, idx) => (
                          <button
                            key={swatch.name}
                            type="button"
                            title={swatch.name}
                            onClick={() =>
                              setActiveSwatches((prev) => ({ ...prev, [product.id]: idx }))
                            }
                            className={`w-3.5 h-3.5 rounded-full border transition-all cursor-pointer ${
                              activeSwatchIdx === idx
                                ? 'ring-2 ring-[#007185] ring-offset-1 scale-110 border-white'
                                : 'border-stone-300 hover:scale-105'
                            }`}
                            style={{ backgroundColor: swatch.hex }}
                          />
                        ))}
                      </div>
                    )}

                    {/* Brand & Title */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <Link href={`/products/${product.slug || product.id}`} className="block group/title">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#565959] block">
                            {product.brand}
                          </span>
                          <h3 className="text-xs font-medium text-[#0F1111] line-clamp-2 mt-0.5 group-hover/title:text-[#007185] group-hover:text-[#007185] transition-colors leading-snug cursor-pointer">
                            {product.title}
                          </h3>
                        </Link>

                        {/* Ratings & Bought Count */}
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

                        {product.boughtPastMonth && (
                          <span className="text-[11px] text-[#565959] block mt-0.5">
                            {product.boughtPastMonth}
                          </span>
                        )}

                        {/* Limited Time Deal Badge */}
                        {product.isLimitedDeal && (
                          <div className="mt-1.5 inline-block bg-[#CC0C39] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-2xs">
                            Limited time deal
                          </div>
                        )}

                        {/* Price & Unit Breakdown */}
                        <div className="flex items-baseline gap-1.5 mt-1.5 flex-wrap">
                          <span className="text-base font-bold text-[#0F1111]">
                            ₹{product.price.toLocaleString('en-IN')}
                          </span>
                          {product.unitPriceNotice && (
                            <span className="text-[11px] text-[#565959]">
                              ({product.unitPriceNotice})
                            </span>
                          )}
                          <span className="text-xs text-[#565959] line-through">
                            ₹{product.originalPrice.toLocaleString('en-IN')}
                          </span>
                          <span className="text-xs font-bold text-[#CC0C39]">
                            ({product.discount})
                          </span>
                        </div>

                        {/* Coupon notice */}
                        {product.couponNotice && (
                          <div className="text-[11px] text-[#007600] font-medium mt-0.5">
                            {product.couponNotice}
                          </div>
                        )}

                        {/* Prime & Delivery */}
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-[#565959]">
                          {product.isPrime && (
                            <span className="font-bold italic text-[#007185] text-xs">
                              Vyntra Express
                            </span>
                          )}
                          <span className="text-[11px]">Get it by <strong className="text-[#0F1111]">{product.deliveryDate}</strong></span>
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
                              size: product.sizes?.[0] || 'Standard',
                              color: product.swatches?.[activeSwatchIdx]?.name || 'Standard',
                              price: product.price,
                              originalPrice: product.originalPrice,
                              image: product.image,
                              quantity: 1,
                              vendorName: 'Vyntra Kids Studio',
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
          </main>
        </div>
      </div>
    </div>
  );
}

export default function GirlsClothingPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-screen flex items-center justify-center text-sm text-stone-500">
          Loading Girls&apos; Clothing Storefront...
        </div>
      }
    >
      <GirlsClothingContent />
    </Suspense>
  );
}
