'use client';

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
import { useWishlistStore } from '@/store/wishlist-store';

// ============================================================================
// 1. VISUAL BUBBLES (Extracted from Amazon Screenshot 1)
// ============================================================================
interface MenBubble {
  id: string;
  name: string;
  slug: string;
  image: string;
}

const MEN_VISUAL_BUBBLES: MenBubble[] = [
  {
    id: 'winterwear',
    name: 'Winterwear',
    slug: 'winterwear',
    image: '/images/mens-bubbles/winterwear.png',
  },
  {
    id: 't-shirts',
    name: 'T-shirts',
    slug: 't-shirts',
    image: '/images/mens-bubbles/t-shirts.png',
  },
  {
    id: 'polos',
    name: 'Polos',
    slug: 'polos',
    image: '/images/mens-bubbles/polos.png',
  },
  {
    id: 'shirts',
    name: 'Shirts',
    slug: 'shirts',
    image: '/images/mens-bubbles/shirts.png',
  },
  {
    id: 'denims',
    name: 'Denims',
    slug: 'denims',
    image: '/images/mens-bubbles/denims.png',
  },
  {
    id: 'trousers',
    name: 'Trousers',
    slug: 'trousers',
    image: '/images/mens-bubbles/trousers.png',
  },
  {
    id: 'shorts',
    name: 'Shorts',
    slug: 'shorts',
    image: '/images/mens-bubbles/shorts.png',
  },
];

// Left Sidebar Subcategories (Screenshot 1)
const SIDEBAR_SUBCATEGORIES = [
  { name: 'T-shirts, Polos & Shirts', slug: 't-shirts' },
  { name: 'Jeans', slug: 'denims' },
  { name: 'Trousers', slug: 'trousers' },
  { name: 'Shorts', slug: 'shorts' },
  { name: 'Suits & Blazers', slug: 'suits' },
  { name: 'Sportswear', slug: 'sportswear' },
  { name: 'Innerwear', slug: 'innerwear' },
  { name: 'Sleep & Lounge Wear', slug: 'sleepwear' },
  { name: 'Accessories', slug: 'accessories' },
  { name: 'Ethnic Wear', slug: 'ethnic' },
  { name: 'Swimwear', slug: 'swimwear' },
  { name: 'Rainwear', slug: 'rainwear' },
  { name: 'Unstitched Fabric', slug: 'unstitched' },
  { name: 'Sunglasses & Spectacle Frames', slug: 'eyewear' },
  { name: 'Overalls', slug: 'overalls' },
  { name: 'Winter Wear', slug: 'winterwear' },
];

// Brands (Screenshot 2)
const BRANDS_LIST: string[] = [];

// "What's new" Spotlight Items (Screenshot 2 Orange Section)
const WHATS_NEW_ITEMS: any[] = [];

// "Brands In Focus" Cards (Screenshot 2)
const BRANDS_IN_FOCUS: any[] = [];

// Rich Product Catalog for Men's Clothing
interface MenProduct {
  id: string;
  slug: string;
  title: string;
  brand: string;
  category: string;
  price: number;
  originalPrice: number;
  discount: string;
  rating: number;
  reviews: number;
  isBestSeller?: boolean;
  isPrime: boolean;
  deliveryDate: string;
  image: string;
}

const MENS_PRODUCTS: MenProduct[] = [];

// ============================================================================
// MAIN COMPONENT
// ============================================================================
function MensClothingContent() {
  const searchParams = useSearchParams();
  const subParam = searchParams?.get('sub') || 'all';

  // Dynamic live products from DB
  const [dbProducts, setDbProducts] = useState<MenProduct[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState(true);

  // Filters state
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>(subParam);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [primeOnly, setPrimeOnly] = useState<boolean>(false);
  const [priceRange, setPriceRange] = useState<string>('all');
  const [minRating, setMinRating] = useState<number>(0);
  const [minDiscount, setMinDiscount] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>('featured');
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [addedItemNotice, setAddedItemNotice] = useState<string | null>(null);

  // Fetch live products from database API
  React.useEffect(() => {
    let isMounted = true;
    async function fetchLiveProducts() {
      try {
        setIsLoadingDb(true);
        const res = await fetch('/api/products?limit=100');
        const json = await res.json();
        const rawList = Array.isArray(json.data)
          ? json.data
          : Array.isArray(json.data?.products)
          ? json.data.products
          : [];

        if (json.success && rawList.length > 0) {
          const liveItems: MenProduct[] = rawList
            .filter((p: any) => {
              const cat = (p.category || '').toLowerCase();
              const title = (p.title || '').toLowerCase();
              const sub = (p.subCategory || '').toLowerCase();
              const brand = (p.brand || '').toLowerCase();

              // Strictly exclude any women's, girls', or non-men items
              const isWomenItem =
                cat.includes('women') ||
                sub.includes('women') ||
                title.includes('women') ||
                cat.includes('saree') ||
                sub.includes('saree') ||
                title.includes('saree') ||
                cat.includes('lingerie') ||
                sub.includes('lingerie') ||
                title.includes('lingerie') ||
                cat.includes('lehenga') ||
                sub.includes('lehenga') ||
                title.includes('lehenga') ||
                cat.includes('bra') ||
                cat.includes('panty') ||
                cat.includes('girl') ||
                sub.includes('girl') ||
                title.includes('girl');

              if (isWomenItem) return false;

              // Check if it belongs to Men's clothing using word boundaries
              const hasMenTerm =
                /\b(men|mens|men's)\b/i.test(cat) ||
                /\b(men|mens|men's)\b/i.test(sub) ||
                /\b(men|mens|men's)\b/i.test(title);

              const hasMenApparelKeyword =
                cat.includes('shirt') ||
                sub.includes('shirt') ||
                title.includes('shirt') ||
                cat.includes('t-shirt') ||
                title.includes('t-shirt') ||
                cat.includes('jean') ||
                title.includes('jean') ||
                cat.includes('denim') ||
                title.includes('denim') ||
                cat.includes('trouser') ||
                title.includes('trouser') ||
                cat.includes('polo') ||
                title.includes('polo') ||
                cat.includes('flannel') ||
                title.includes('flannel') ||
                cat.includes('kurta') ||
                title.includes('kurta') ||
                brand.includes('deemoon');

              return hasMenTerm || hasMenApparelKeyword;
            })
            .map((p: any) => {
              const isShirt =
                p.category?.toLowerCase().includes('shirt') ||
                p.title?.toLowerCase().includes('shirt') ||
                p.subCategory?.toLowerCase().includes('shirt');
              const isDenim =
                p.category?.toLowerCase().includes('jean') ||
                p.category?.toLowerCase().includes('denim') ||
                p.title?.toLowerCase().includes('jean');
              const isTrouser =
                p.category?.toLowerCase().includes('trouser') ||
                p.category?.toLowerCase().includes('pant') ||
                p.title?.toLowerCase().includes('trouser');
              const isPolo =
                p.category?.toLowerCase().includes('polo') ||
                p.title?.toLowerCase().includes('polo');
              const isWinter =
                p.category?.toLowerCase().includes('winter') ||
                p.title?.toLowerCase().includes('jacket') ||
                p.title?.toLowerCase().includes('sweater');

              const catSlug = isShirt
                ? 'shirts'
                : isDenim
                ? 'denims'
                : isTrouser
                ? 'trousers'
                : isPolo
                ? 'polos'
                : isWinter
                ? 'winterwear'
                : 'shirts';

              return {
                id: p.id,
                slug: p.slug,
                title: p.title,
                brand: p.brand || 'Vyntra Partner',
                category: catSlug,
                price: Number(p.price),
                originalPrice: Number(p.originalPrice || p.price),
                discount: p.discount || '',
                rating: Number(p.rating) || 4.5,
                reviews: Number(p.reviewCount) || 1,
                isBestSeller: true,
                isPrime: false, // no real express-delivery data yet
                deliveryDate: 'Tomorrow, 11 AM',
                image: p.image,
              };
            });

          if (isMounted) {
            setDbProducts(liveItems);
          }
        }
      } catch (err) {
        console.error('Failed to load live database products for men clothing:', err);
      } finally {
        if (isMounted) setIsLoadingDb(false);
      }
    }
    fetchLiveProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  // Combined Catalog: Database live products first!
  const allCatalogProducts = useMemo(() => {
    const dbSlugs = new Set(dbProducts.map((p) => p.slug));
    const dedupedMock = MENS_PRODUCTS.filter((p) => !dbSlugs.has(p.slug));
    return [...dbProducts, ...dedupedMock];
  }, [dbProducts]);

  // Dynamic Brands List: Aggregated from live products + defaults
  const dynamicBrands = useMemo(() => {
    const fromProducts = allCatalogProducts.map((p) => p.brand).filter(Boolean);
    return Array.from(new Set([...fromProducts, ...BRANDS_LIST]));
  }, [allCatalogProducts]);

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
      size: 'L',
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
    let result = [...allCatalogProducts];

    if (selectedSubCategory !== 'all') {
      result = result.filter((p) => {
        if (selectedSubCategory === 'shirts') {
          return (
            p.category === 'shirts' ||
            p.category === 't-shirts' ||
            p.title.toLowerCase().includes('shirt')
          );
        }
        if (selectedSubCategory === 't-shirts' || selectedSubCategory === 'polos') {
          return (
            p.category === selectedSubCategory ||
            p.title.toLowerCase().includes('t-shirt') ||
            p.title.toLowerCase().includes('polo')
          );
        }
        if (selectedSubCategory === 'denims') {
          return (
            p.category === 'denims' ||
            p.title.toLowerCase().includes('jean') ||
            p.title.toLowerCase().includes('denim')
          );
        }
        if (selectedSubCategory === 'trousers') {
          return (
            p.category === 'trousers' ||
            p.title.toLowerCase().includes('trouser') ||
            p.title.toLowerCase().includes('chino') ||
            p.title.toLowerCase().includes('pant')
          );
        }
        return p.category === selectedSubCategory;
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
    allCatalogProducts,
    selectedSubCategory,
    selectedBrands,
    primeOnly,
    priceRange,
    minRating,
    minDiscount,
    sortBy,
  ]);

  const activeSubcategoryData = useMemo(() => {
    return MEN_VISUAL_BUBBLES.find((b) => b.slug === selectedSubCategory);
  }, [selectedSubCategory]);

  return (
    <div className="w-full bg-[#FFFFFF] min-h-screen text-[#0F1111]">
      {/* 1. Department Sub-Nav Bar (Active item: Men) */}
      <FashionDepartmentSubNav activeItem="men" />

      {/* 2. Amazon Fashion Breadcrumbs */}
      <div className="border-b border-[#E7E7E7] bg-[#FAFAFA] py-2 px-4 sm:px-6">
        <div className="max-w-[1450px] mx-auto flex items-center gap-1.5 text-xs text-[#565959]">
          <Link href="/products?category=fashion" className="hover:text-[#C45500] hover:underline">
            Vyntra Fashion
          </Link>
          <ChevronRight className="h-3 w-3 text-stone-400" />
          <Link href="/products?category=men" className="hover:text-[#C45500] hover:underline">
            Men
          </Link>
          <ChevronRight className="h-3 w-3 text-stone-400" />
          <span className="font-semibold text-[#0F1111]">Clothing</span>
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
                  <ChevronLeft className="h-3 w-3" /> Clothing &amp; Accessories
                </Link>
                <div className="font-bold text-[#0F1111] pl-3 py-0.5 text-[13px]">
                  Men
                </div>
              </div>

              {/* Subcategories list */}
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

            {/* Brands Filter (Screenshot 2) */}
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

            {/* Discount Filter */}
            <div className="border-t border-[#E7E7E7] pt-4">
              <h4 className="text-xs font-bold text-[#0F1111] mb-2">Deals &amp; Discounts</h4>
              <div className="space-y-1 text-xs">
                {[
                  { label: 'All Discounts', val: 0 },
                  { label: '10% Off or more', val: 10 },
                  { label: '25% Off or more', val: 25 },
                  { label: '50% Off or more', val: 50 },
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
          {/* MAIN STOREFRONT AREA: Bubbles + Prime Banner + Whats New + Brands In Focus */}
          {/* ========================================================================= */}
          <main className="flex-1 min-w-0 space-y-7">
            {/* 1. CIRCULAR VISUAL BUBBLES SECTION (8 Bubbles with Auto-hiding Scrollbar) */}
            <section className="relative group/bubbles pt-1">
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
                {MEN_VISUAL_BUBBLES.map((bubble) => {
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
                      {/* Bubble image - larger prominent size */}
                      <div
                        className={`relative w-28 h-28 sm:w-32 sm:h-32 md:w-34 md:h-34 rounded-full transition-transform duration-200 bg-[#F7F7F7] p-1 group-hover:scale-105 ${
                          isSelected
                            ? 'scale-108 ring-3 ring-[#007185] ring-offset-2 shadow-md'
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
                className="hidden sm:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/95 shadow-md border border-stone-200 items-center justify-center text-stone-700 hover:text-black hover:bg-white hover:scale-105 active:scale-95 transition-all opacity-0 group-hover/bubbles:opacity-100 cursor-pointer"
                aria-label="Scroll right"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </section>



            {/* 3. "INTRODUCING: WHAT'S NEW" ORANGE SHOWCASE SECTION (Screenshot 2) */}
            <section className="bg-gradient-to-r from-[#E75A22] via-[#F05A28] to-[#EA580C] rounded-2xl p-3.5 sm:p-4 text-white shadow-md">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                {/* Hero Box */}
                <div className="md:col-span-3 flex flex-col justify-center items-start pl-2">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-amber-200">
                    Brand Spotlight
                  </span>
                  <h3 className="text-xl sm:text-2xl font-extrabold leading-tight tracking-tight mt-0.5">
                    Introducing:
                  </h3>
                  <p className="text-base sm:text-lg font-bold text-white/95">
                    What&apos;s new
                  </p>
                  <p className="text-xs text-white/80 mt-1">
                    Fresh drops &amp; signature cotton essentials
                  </p>
                </div>

                {/* 4 Cards Row */}
                <div className="md:col-span-9 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {WHATS_NEW_ITEMS.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-lg p-2 text-[#0F1111] flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow group cursor-pointer"
                    >
                      <div className="relative aspect-[4/3] w-full rounded overflow-hidden bg-stone-50 mb-1.5">
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          unoptimized
                          className="object-contain group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div>
                        <h4 className="text-[11px] font-medium line-clamp-1 leading-tight text-[#0F1111]">
                          {item.title}
                        </h4>
                        <div className="mt-1 flex items-baseline gap-1.5">
                          <span className="text-sm font-bold text-[#B12704]">
                            ₹{item.price}
                          </span>
                          <span className="text-[10px] text-[#565959] line-through">
                            ₹{item.originalPrice}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(item);
                        }}
                        className="mt-2 w-full py-1 bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] text-[11px] font-semibold rounded-full shadow-xs active:scale-95 transition-all text-center"
                      >
                        {addedItemNotice === item.id ? '✓ Added' : 'Add to Cart'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* 4. "BRANDS IN FOCUS" DEAL ROW (Screenshot 2: 6 Cards) */}
            <section className="space-y-3">
              <h2 className="text-[17px] sm:text-[19px] font-bold text-[#0F1111] tracking-tight">
                Brands In Focus
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
                {BRANDS_IN_FOCUS.map((brand) => {
                  const isAct = selectedBrands.includes(brand.brand);
                  return (
                    <button
                      key={brand.id}
                      type="button"
                      onClick={() => toggleBrand(brand.brand)}
                      className={`group relative rounded-xl overflow-hidden bg-white text-left transition-all duration-300 flex flex-col justify-between cursor-pointer border ${
                        isAct
                          ? 'ring-3 ring-[#007185] border-transparent shadow-lg scale-[1.03]'
                          : 'border-stone-200 hover:border-stone-400 hover:shadow-md hover:scale-[1.02]'
                      }`}
                    >
                      <div className="relative aspect-[360/290] w-full overflow-hidden bg-stone-100">
                        <Image
                          src={brand.image}
                          alt={brand.brand}
                          fill
                          unoptimized
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 5. PRODUCT CATALOG GRID */}
            <section className="space-y-4 pt-2">
              {/* Results Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-200 gap-3">
                <div>
                  <h1 className="text-base sm:text-lg font-bold text-[#0F1111]">
                    {activeSubcategoryData
                      ? activeSubcategoryData.name
                      : "Men's Clothing"}
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
                    aria-label="Sort men products by"
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
                          <div className="relative aspect-square w-full rounded-md overflow-hidden bg-white border border-stone-100 mb-3 group">
                            <Link href={`/products/${product.slug}`} className="block w-full h-full">
                              <Image
                                src={product.image}
                                alt={product.title}
                                fill
                                unoptimized
                                className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                              />
                            </Link>

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
                          <Link href={`/products/${product.slug}`}>
                            <h3 className="text-xs sm:text-[13px] font-medium text-[#0F1111] line-clamp-2 leading-tight hover:text-[#C45500] cursor-pointer mt-0.5">
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
                                Vyntra Express
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
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function MensClothingPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-screen bg-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-800" />
        </div>
      }
    >
      <MensClothingContent />
    </Suspense>
  );
}
