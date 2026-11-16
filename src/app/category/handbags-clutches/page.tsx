'use client';

import { useCategoryProducts } from '@/hooks/use-category-products';
import React, { useState, useMemo, useRef, useEffect, Suspense } from 'react';
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
// 1. VISUAL BUBBLES DATA (Screenshot 1)
// ============================================================================
interface HandbagBubble {
  id: string;
  name: string;
  slug: string;
  image: string;
}

const HANDBAG_BUBBLES: HandbagBubble[] = [
  {
    id: 'totes',
    name: 'Totes',
    slug: 'totes',
    image: '/images/handbags-bubbles/bubble_totes.png',
  },
  {
    id: 'shoulder-bags',
    name: 'Shoulder Bags',
    slug: 'shoulder-bags',
    image: '/images/handbags-bubbles/bubble_shoulder_bags.png',
  },
  {
    id: 'sling-bags',
    name: 'Sling Bags',
    slug: 'sling-bags',
    image: '/images/handbags-bubbles/bubble_sling_bags.png',
  },
  {
    id: 'potlis',
    name: 'Potlis',
    slug: 'potlis',
    image: '/images/handbags-bubbles/bubble_potlis.png',
  },
  {
    id: 'clutches',
    name: 'Clutches',
    slug: 'clutches',
    image: '/images/handbags-bubbles/bubble_clutches.png',
  },
  {
    id: 'satchels',
    name: 'Satchels',
    slug: 'satchels',
    image: '/images/handbags-bubbles/bubble_satchels.png',
  },
];

// Left Sidebar Subcategories (Exact match to Amazon screenshot)
const SIDEBAR_SUBCATEGORIES = [
  { name: 'All Handbags & Clutches', slug: 'all' },
  { name: 'Baguettes', slug: 'baguettes' },
  { name: 'Bowling Bags', slug: 'bowling-bags' },
  { name: 'Clutches', slug: 'clutches' },
  { name: 'Handbags', slug: 'handbags' },
  { name: "Kids'", slug: 'kids' },
  { name: "Men's", slug: 'mens' },
  { name: 'Messenger Bags', slug: 'messenger-bags' },
  { name: 'Potlis & Wristlets', slug: 'potlis' },
  { name: 'Sling & Cross-Body Bags', slug: 'sling-bags' },
  { name: "Women's Backpacks", slug: 'womens-backpacks' },
  { name: "Women's Wallets", slug: 'womens-wallets' },
];

// Top Brands On Offer (6 Cards with banners & logos)
interface BrandOfferCard {
  brand: string;
  priceTag: string;
  maxPrice: number;
  image: string;
}

const TOP_BRANDS_OFFER : BrandOfferCard[] = [];

const BRANDS_LIST: string[] = [];

interface HandbagProduct {
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
  isBestSeller?: boolean;
  deliveryDate: string;
}

const HANDBAG_PRODUCTS : HandbagProduct[] = [];

// ============================================================================
// MAIN HANDBAGS CONTENT
// ============================================================================
function HandbagsContent() {
  const { products: liveDbProducts, dynamicBrands } = useCategoryProducts({ categoryKey: 'handbags-clutches' });
  const searchParams = useSearchParams();
  const subParam = searchParams.get('sub') || 'all';

  const [selectedSubCategory, setSelectedSubCategory] = useState<string>(subParam);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [primeOnly, setPrimeOnly] = useState<boolean>(false);
  const [priceRange, setPriceRange] = useState<string>('all');
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>('featured');
  const [mobileFilterOpen, setMobileFilterOpen] = useState<boolean>(false);

  // Cart Store
  const addItem = useCartStore((state) => state.addItem);
  const [addedId, setAddedId] = useState<string | null>(null);

  const handleAddToCart = (product: HandbagProduct) => {
    addItem({
      id: product.id,
      productId: product.id,
      variantId: `${product.id}-default`,
      title: product.title,
      brand: product.brand,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      quantity: 1,
      inStock: true,
      size: 'Standard',
      color: 'Standard',
      vendorName: product.brand,
    });
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1800);
  };

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const [liveProducts, setLiveProducts] = useState<HandbagProduct[]>([]);

  // Fetch live vendor products from database
  useEffect(() => {
    fetch('/api/products?category=handbags-clutches')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const dbItems: HandbagProduct[] = json.data.map((p: any) => ({
            id: p.id,
            title: p.title,
            brand: p.brand || 'Vyntra Partner',
            category: p.category || 'totes',
            price: p.price,
            originalPrice: p.originalPrice || Math.round(p.price * 1.5),
            discount: p.discount || '30% off',
            rating: p.rating || 4.5,
            reviewCount: p.reviewCount || 10,
            image: p.image || '/images/products/placeholder.jpg',
            slug: p.slug,
            isPrime: p.isExpress ?? true,
          }));
          setLiveProducts(dbItems);
        }
      })
      .catch((err) => console.warn('Could not fetch live handbags products:', err));
  }, []);

  const clearAllFilters = () => {
    setSelectedSubCategory('all');
    setSelectedBrands([]);
    setPrimeOnly(false);
    setPriceRange('all');
    setMinRating(0);
    setSortBy('featured');
  };

  const filteredProducts = useMemo(() => {
    return liveDbProducts.filter((product) => {
      if (selectedSubCategory !== 'all' && product.category !== selectedSubCategory) {
        return false;
      }
      if (selectedBrands.length > 0 && !selectedBrands.includes(product.brand)) {
        return false;
      }
      if (primeOnly && !product.isPrime) {
        return false;
      }
      if (minRating > 0 && product.rating < minRating) {
        return false;
      }
      if (priceRange !== 'all') {
        if (priceRange === 'under-500' && product.price >= 500) return false;
        if (priceRange === '500-1000' && (product.price < 500 || product.price > 1000)) return false;
        if (priceRange === '1000-2500' && (product.price < 1000 || product.price > 2500)) return false;
        if (priceRange === '2500-5000' && (product.price < 2500 || product.price > 5000)) return false;
        if (priceRange === 'over-5000' && product.price <= 5000) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      if (sortBy === 'rating') return b.rating - a.rating;
      return 0;
    });
  }, [selectedSubCategory, selectedBrands, primeOnly, priceRange, minRating, sortBy]);

  const activeCategoryTitle = useMemo(() => {
    if (selectedSubCategory === 'all') return 'Handbags, Purses & Clutches';
    const found = SIDEBAR_SUBCATEGORIES.find((s) => s.slug === selectedSubCategory);
    return found ? found.name : 'Handbags, Purses & Clutches';
  }, [selectedSubCategory]);

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      {/* Fashion Department Navigation Bar (Active: Bags & Luggage) */}
      <FashionDepartmentSubNav activeItem="bags" />

      {/* Main Container */}
      <main className="max-w-[1500px] mx-auto px-3 sm:px-5 py-3">
        {/* Amazon-style Breadcrumb Path */}
        <div className="flex items-center flex-wrap gap-1 text-[12px] text-zinc-600 mb-2">
          <Link href="/" className="hover:text-amber-700 hover:underline">
            Home
          </Link>
          <span className="text-zinc-400">›</span>
          <Link href="/fashion" className="hover:text-amber-700 hover:underline">
            Fashion
          </Link>
          <span className="text-zinc-400">›</span>
          <Link href="/products?category=bags" className="hover:text-amber-700 hover:underline">
            Bags &amp; Luggage
          </Link>
          <span className="text-zinc-400">›</span>
          <span className="font-semibold text-zinc-800">Handbags, Purses &amp; Clutches</span>
          {selectedSubCategory !== 'all' && (
            <>
              <span className="text-zinc-400">›</span>
              <span className="font-bold text-zinc-900">{activeCategoryTitle}</span>
            </>
          )}
        </div>

        {/* Content Layout: Left Sidebar + Main Content */}
        <div className="flex gap-6 items-start mt-2">
          {/* ============================================================== */}
          {/* LEFT SIDEBAR (Desktop) */}
          {/* ============================================================== */}
          <aside className="hidden lg:block w-[210px] flex-shrink-0 text-[13px] leading-tight space-y-4">
            {/* Category Tree */}
            <div>
              <div className="font-bold text-zinc-900 text-[13px] mb-1.5">Category</div>
              <ul className="space-y-1 text-zinc-700">
                <li>
                  <Link
                    href="/products?category=bags"
                    className="hover:text-amber-700 hover:underline flex items-center text-zinc-600"
                  >
                    ‹ Shoes &amp; Handbags
                  </Link>
                </li>
                <li className="pl-2">
                  <span className="font-bold text-zinc-900">Handbags, Purses &amp; Clutches</span>
                  <ul className="pl-2 mt-1 space-y-1">
                    {SIDEBAR_SUBCATEGORIES.map((cat) => (
                      <li key={cat.slug}>
                        <button
                          onClick={() => setSelectedSubCategory(cat.slug)}
                          className={`text-left hover:text-amber-700 hover:underline block ${
                            selectedSubCategory === cat.slug
                              ? 'font-bold text-amber-700'
                              : 'text-zinc-700'
                          }`}
                        >
                          {cat.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              </ul>
            </div>

            {/* Price Filter */}
            <div className="border-t border-zinc-200 pt-3">
              <div className="font-bold text-zinc-900 text-[13px] mb-1.5">Price</div>
              <ul className="space-y-1 text-zinc-700">
                {[
                  { label: 'All Prices', val: 'all' },
                  { label: 'Under ₹500', val: 'under-500' },
                  { label: '₹500 - ₹1,000', val: '500-1000' },
                  { label: '₹1,000 - ₹2,500', val: '1000-2500' },
                  { label: '₹2,500 - ₹5,000', val: '2500-5000' },
                  { label: 'Over ₹5,000', val: 'over-5000' },
                ].map((item) => (
                  <li key={item.val}>
                    <button
                      onClick={() => setPriceRange(item.val)}
                      className={`hover:text-amber-700 hover:underline block ${
                        priceRange === item.val ? 'font-bold text-amber-700' : 'text-zinc-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Brands */}
            {dynamicBrands.length > 0 && (
<div className="border-t border-zinc-200 pt-3">
              <div className="font-bold text-zinc-900 text-[13px] mb-1.5">Brands</div>
              <div className="space-y-1">
                {dynamicBrands.map((brand) => (
                  <label
                    key={brand}
                    className="flex items-center gap-2 cursor-pointer hover:text-amber-700"
                  >
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(brand)}
                      onChange={() => toggleBrand(brand)}
                      className="rounded border-zinc-300 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                    />
                    <span className="truncate text-zinc-800">{brand}</span>
                  </label>
                ))}
              </div>
            </div>
            )}

            {/* Amazon Prime */}
            <div className="border-t border-zinc-200 pt-3">
              <div className="font-bold text-zinc-900 text-[13px] mb-1.5">Amazon Prime</div>
              <label className="flex items-center gap-2 cursor-pointer hover:text-amber-700">
                <input
                  type="checkbox"
                  checked={primeOnly}
                  onChange={(e) => setPrimeOnly(e.target.checked)}
                  className="rounded border-zinc-300 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                />
                <span className="text-[#00a8e1] font-bold text-[13px] italic flex items-center">
                  ✓prime
                </span>
              </label>
            </div>

            {/* Customer Review */}
            <div className="border-t border-zinc-200 pt-3">
              <div className="font-bold text-zinc-900 text-[13px] mb-1.5">Customer Review</div>
              <div className="space-y-1 text-zinc-700">
                <button
                  onClick={() => setMinRating(minRating === 4 ? 0 : 4)}
                  className="flex items-center gap-1 hover:text-amber-700 group"
                >
                  <div className="flex text-amber-400 text-xs">{'★★★★☆'}</div>
                  <span className="text-xs text-zinc-600 group-hover:underline">&amp; Up</span>
                </button>
              </div>
            </div>

            {/* Clear All Filters */}
            {(selectedSubCategory !== 'all' ||
              selectedBrands.length > 0 ||
              primeOnly ||
              priceRange !== 'all' ||
              minRating > 0) && (
              <div className="border-t border-zinc-200 pt-3">
                <button
                  onClick={clearAllFilters}
                  className="w-full py-1 text-xs font-semibold text-amber-700 hover:text-amber-800 border border-amber-300 rounded hover:bg-amber-50 transition"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </aside>

          {/* ============================================================== */}
          {/* MAIN CONTENT AREA */}
          {/* ============================================================== */}
          <div className="flex-1 min-w-0">
            {/* Visual Circular Bubbles (Screenshot 1: Totes, Shoulder, Sling, Potlis, Clutches, Satchels) */}
            <section className="mb-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {HANDBAG_BUBBLES.map((bubble) => {
                  const isSelected = selectedSubCategory === bubble.slug;
                  return (
                    <button
                      key={bubble.id}
                      type="button"
                      onClick={() =>
                        setSelectedSubCategory(isSelected ? 'all' : bubble.slug)
                      }
                      className="group flex flex-col items-center cursor-pointer select-none text-center focus:outline-none"
                    >
                      <div
                        className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-full transition-transform duration-200 bg-[#F4F4F4] p-1.5 flex items-center justify-center ${
                          isSelected
                            ? 'scale-105 ring-2 ring-amber-600 ring-offset-2 shadow-md'
                            : 'shadow-xs group-hover:scale-105'
                        }`}
                      >
                        <Image
                          src={bubble.image}
                          alt={bubble.name}
                          fill
                          unoptimized
                          className="object-contain p-1"
                        />
                      </div>
                      <span
                        className={`mt-2 text-xs sm:text-[13px] line-clamp-1 max-w-[120px] leading-tight ${
                          isSelected
                            ? 'text-amber-700 font-bold'
                            : 'text-zinc-800 font-medium group-hover:text-amber-700'
                        }`}
                      >
                        {bubble.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Top Brands On Offer (6 Cards matching Screenshot 1 & 2) */}
            {TOP_BRANDS_OFFER.length > 0 && (
              <section className="mb-8">
              <h2 className="text-lg font-bold text-zinc-900 mb-3 tracking-tight">
                Top brands on offer
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                {TOP_BRANDS_OFFER.map((card) => {
                  const isBrandActive = selectedBrands.includes(card.brand);
                  return (
                    <div
                      key={card.brand}
                      onClick={() => toggleBrand(card.brand)}
                      className={`cursor-pointer rounded-xs overflow-hidden border transition-all duration-200 group flex flex-col justify-between bg-white ${
                        isBrandActive
                          ? 'border-amber-600 shadow-md ring-2 ring-amber-500/50'
                          : 'border-zinc-200 hover:border-zinc-400 hover:shadow-xs'
                      }`}
                    >
                      <div className="relative aspect-[558/738] w-full overflow-hidden bg-white">
                        <Image
                          src={card.image}
                          alt={`${card.brand} - ${card.priceTag}`}
                          fill
                          unoptimized
                          className="object-contain group-hover:scale-102 transition-transform duration-200"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
)}

            {/* Section Header: Totes, sling bags & more */}
            <div className="border-t border-b border-zinc-200 py-2.5 mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  {selectedSubCategory === 'all'
                    ? 'Totes, sling bags & more'
                    : activeCategoryTitle}
                </h3>
                <span className="text-xs text-zinc-500">
                  Showing {filteredProducts.length} results
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMobileFilterOpen(true)}
                  className="lg:hidden flex items-center gap-1.5 px-3 py-1 text-xs border border-zinc-300 rounded-md bg-zinc-50"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Filters</span>
                </button>

                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-zinc-600">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="text-xs bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                  >
                    <option value="featured">Featured</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="rating">Avg. Customer Review</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Product Catalog Grid */}
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="group bg-white border border-zinc-200 hover:border-zinc-300 rounded-sm p-2 flex flex-col justify-between hover:shadow-md transition-shadow relative"
                >
                  <div>
                    {/* Image */}
                    <div className="relative aspect-square w-full bg-[#f9f9f9] rounded-sm overflow-hidden flex items-center justify-center mb-2">
                      <Image
                        src={product.image}
                        alt={product.title}
                        fill
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                        className="object-contain p-2 group-hover:scale-105 transition-transform duration-200"
                      />
                      {product.isBestSeller && (
                        <span className="absolute top-1 left-1 bg-[#e77600] text-white text-[9px] px-1.5 py-0.5 rounded-xs uppercase tracking-wider font-bold">
                          #1 Best Seller
                        </span>
                      )}
                    </div>

                    {/* Brand */}
                    <div className="text-[12px] font-bold text-zinc-900 uppercase tracking-tight line-clamp-1">
                      {product.brand}
                    </div>

                    {/* Title */}
                    <h4 className="text-[12px] text-zinc-700 line-clamp-2 hover:text-amber-700 leading-snug cursor-pointer my-0.5 font-normal">
                      {product.title}
                    </h4>

                    {/* Rating */}
                    <div className="flex items-center gap-1 text-[11px] my-1">
                      <div className="flex items-center text-amber-500">
                        <span className="font-semibold text-zinc-800 mr-0.5">
                          {product.rating}
                        </span>
                        <Star className="w-3 h-3 fill-amber-400 stroke-amber-400" />
                      </div>
                      <span className="text-zinc-500">
                        ({product.reviews >= 1000 ? `${(product.reviews / 1000).toFixed(1)}k` : product.reviews})
                      </span>
                    </div>

                    {/* Price */}
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="text-[11px] align-super text-zinc-900 font-semibold">₹</span>
                      <span className="text-base font-bold text-zinc-900 leading-none">
                        {product.price.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="text-[10px] text-zinc-500 mt-0.5">
                      <span>M.R.P: </span>
                      <span className="line-through">₹{product.originalPrice.toLocaleString('en-IN')}</span>
                      <span className="ml-1 text-zinc-700 font-semibold">({product.discount})</span>
                    </div>

                    {/* Prime */}
                    {product.isPrime && (
                      <div className="mt-1 flex items-center">
                        <span className="text-[#00a8e1] font-bold text-[11px] italic">
                          ✓prime
                        </span>
                      </div>
                    )}

                    <div className="text-[10px] text-zinc-600 mt-0.5 line-clamp-1">
                      {product.deliveryDate}
                    </div>
                  </div>

                  {/* Add to Cart */}
                  <div className="mt-3 pt-2 border-t border-zinc-100">
                    <button
                      onClick={() => handleAddToCart(product)}
                      className={`w-full py-1 px-2 rounded-full text-xs font-medium transition flex items-center justify-center gap-1 shadow-xs ${
                        addedId === product.id
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#ffd814] hover:bg-[#f7ca00] text-zinc-900'
                      }`}
                    >
                      {addedId === product.id ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Added!</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Add to Cart</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>
      </main>

      {/* Mobile Filter Drawer */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileFilterOpen(false)}
          />
          <div className="relative ml-auto w-full max-w-xs bg-white h-full overflow-y-auto p-4 z-10 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-sm text-zinc-900">Filters</h3>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="p-1 text-zinc-500 hover:text-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <div className="font-bold text-xs text-zinc-900 mb-1">Subcategory</div>
              <div className="space-y-1">
                {SIDEBAR_SUBCATEGORIES.map((cat) => (
                  <button
                    key={cat.slug}
                    onClick={() => {
                      setSelectedSubCategory(cat.slug);
                      setMobileFilterOpen(false);
                    }}
                    className={`block w-full text-left text-xs py-1 px-2 rounded ${
                      selectedSubCategory === cat.slug
                        ? 'bg-amber-100 text-amber-800 font-semibold'
                        : 'text-zinc-700'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t pt-3">
              <div className="font-bold text-xs text-zinc-900 mb-1">Brands</div>
              <div className="space-y-1">
                {dynamicBrands.map((brand) => (
                  <label key={brand} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(brand)}
                      onChange={() => toggleBrand(brand)}
                      className="rounded text-amber-600"
                    />
                    <span>{brand}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="border-t pt-3">
              <button
                onClick={() => {
                  clearAllFilters();
                  setMobileFilterOpen(false);
                }}
                className="w-full py-1.5 text-xs font-semibold text-amber-700 border border-amber-300 rounded"
              >
                Clear all filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HandbagsClutchesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white p-8 text-center text-sm text-zinc-500">
          Loading Handbags &amp; Clutches...
        </div>
      }
    >
      <HandbagsContent />
    </Suspense>
  );
}
