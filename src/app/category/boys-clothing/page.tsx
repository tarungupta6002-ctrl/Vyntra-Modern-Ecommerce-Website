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
// DATA & TYPES FOR BOYS' CLOTHING
// ============================================================================
interface BoysSubCategory {
  name: string;
  slug: string;
}

const BOYS_SUBCATEGORIES: BoysSubCategory[] = [
  { name: 'All Boys Clothing', slug: 'all' },
  { name: 'T-Shirts & Polos', slug: 't-shirts' },
  { name: 'Shirts', slug: 'shirts' },
  { name: 'Clothing Sets', slug: 'clothing-sets' },
  { name: 'Innerwear', slug: 'innerwear' },
  { name: 'Sportswear', slug: 'sportswear' },
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
  '11 - 12 years',
  '12 - 13 years',
  '13 - 14 years',
  '14 - 15 years',
];

interface ColorSwatch {
  name: string;
  hex: string;
}

interface BoysClothingProduct {
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
  deliveryDate: string;
  swatches?: ColorSwatch[];
  sizes: string[];
}

const BOYS_PRODUCTS : BoysClothingProduct[] = [];

// ============================================================================
// MAIN INNER COMPONENT
// ============================================================================
function BoysClothingContent() {
  const { products: liveDbProducts, dynamicBrands } = useCategoryProducts({ categoryKey: 'boys-clothing' });
  const searchParams = useSearchParams();
  const subParam = searchParams.get('sub') || 'all';

  const [activeCategory, setActiveCategory] = useState<string>(subParam);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState<string | null>(null);
  const [selectedAgeSizes, setSelectedAgeSizes] = useState<string[]>([]);
  const [primeOnly, setPrimeOnly] = useState<boolean>(false);
  const [discountMin, setDiscountMin] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<string>('featured');
  const [mobileFilterOpen, setMobileFilterOpen] = useState<boolean>(false);

  // Cart Store
  const addItem = useCartStore((state) => state.addItem);
  const [addedId, setAddedId] = useState<string | null>(null);

  const handleAddToCart = (product: any) => {
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
      size: product.sizes?.[0] || '4 - 5 years',
      color: product.swatches?.[0]?.name || 'Standard',
      vendorName: 'Vyntra Kids Studio',
    });
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1800);
  };

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const [liveProducts, setLiveProducts] = useState<BoysClothingProduct[]>([]);

  // Fetch live vendor products from database
  useEffect(() => {
    fetch('/api/products?category=boys-clothing')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const dbItems: BoysClothingProduct[] = json.data.map((p: any) => ({
            id: p.id,
            title: p.title,
            brand: p.brand || 'Vyntra Partner',
            category: p.category || 't-shirts',
            price: p.price,
            originalPrice: p.originalPrice || Math.round(p.price * 1.5),
            discount: p.discount || '35% off',
            rating: p.rating || 4.5,
            reviews: p.reviewCount || 12,
            image: p.image || '/images/products/placeholder.jpg',
            slug: p.slug,
            isPrime: p.isExpress ?? true,
            deliveryDate: 'Tomorrow, 11 AM',
            sizes: ['3 - 4 years', '4 - 5 years', '5 - 6 years'],
          }));
          setLiveProducts(dbItems);
        }
      })
      .catch((err) => console.warn('Could not fetch live boys products:', err));
  }, []);

  const toggleAgeSize = (size: string) => {
    setSelectedAgeSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return liveDbProducts.filter((product) => {
      // Subcategory filter
      if (activeCategory !== 'all') {
        if (activeCategory === 't-shirts' && product.category !== 't-shirts') return false;
        if (activeCategory === 'shirts' && product.category !== 'shirts') return false;
        if (activeCategory === 'clothing-sets' && product.category !== 'clothing-sets') return false;
        if (activeCategory === 'innerwear' && product.category !== 'innerwear') return false;
        if (activeCategory === 'sportswear' && product.category !== 'sportswear') return false;
      }

      // Brand filter
      if (selectedBrands.length > 0 && !selectedBrands.includes(product.brand)) {
        return false;
      }

      // Prime filter
      if (primeOnly && !product.isPrime) {
        return false;
      }

      // Price filter
      if (selectedPriceRange) {
        if (selectedPriceRange === 'under-300' && product.price >= 300) return false;
        if (selectedPriceRange === '300-500' && (product.price < 300 || product.price > 500)) return false;
        if (selectedPriceRange === '500-1000' && (product.price < 500 || product.price > 1000)) return false;
        if (selectedPriceRange === '1000-1500' && (product.price < 1000 || product.price > 1500)) return false;
        if (selectedPriceRange === 'over-1500' && product.price <= 1500) return false;
      }

      // Age size filter
      if (selectedAgeSizes.length > 0) {
        const hasSize = (product.sizes || []).some((sz: string) => selectedAgeSizes.includes(sz));
        if (!hasSize) return false;
      }

      // Discount filter
      if (discountMin !== null) {
        const discMatch = product.discount.match(/(\d+)%/);
        const discVal = discMatch ? parseInt(discMatch[1], 10) : 0;
        if (discVal < discountMin) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      if (sortBy === 'rating') return b.rating - a.rating;
      return 0; // featured
    });
  }, [
    liveDbProducts,
    activeCategory,
    selectedBrands,
    selectedPriceRange,
    selectedAgeSizes,
    primeOnly,
    discountMin,
    sortBy,
  ]);

  const clearAllFilters = () => {
    setActiveCategory('all');
    setSelectedBrands([]);
    setSelectedPriceRange(null);
    setSelectedAgeSizes([]);
    setPrimeOnly(false);
    setDiscountMin(null);
    setSortBy('featured');
  };

  const hasActiveFilters =
    activeCategory !== 'all' ||
    selectedBrands.length > 0 ||
    selectedPriceRange !== null ||
    selectedAgeSizes.length > 0 ||
    primeOnly ||
    discountMin !== null;

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      {/* Fashion Department Navigation Bar */}
      <FashionDepartmentSubNav activeItem="kids" />

      {/* Main Container */}
      <main className="max-w-[1500px] mx-auto px-3 sm:px-5 py-3">
        {/* Amazon-style Breadcrumbs */}
        <div className="flex items-center flex-wrap gap-1 text-[12px] text-zinc-600 mb-2">
          <Link href="/" className="hover:text-amber-700 hover:underline">
            Home
          </Link>
          <span className="text-zinc-400">›</span>
          <Link href="/products?category=fashion" className="hover:text-amber-700 hover:underline">
            Fashion
          </Link>
          <span className="text-zinc-400">›</span>
          <Link href="/category/kids" className="hover:text-amber-700 hover:underline">
            Kids
          </Link>
          <span className="text-zinc-400">›</span>
          <span className="font-semibold text-zinc-800">Boys</span>
          <span className="text-zinc-400">›</span>
          <span className="font-bold text-zinc-900">
            {activeCategory === 'all'
              ? 'Clothing'
              : BOYS_SUBCATEGORIES.find((s) => s.slug === activeCategory)?.name || 'Clothing'}
          </span>
        </div>

        {/* Top Header Result Bar */}
        <div className="border-b border-zinc-200 pb-2 mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-[14px] text-zinc-900 font-normal">
              1-12 of over 2,000 results for{' '}
              <span className="font-bold text-amber-700">Boys clothing</span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileFilterOpen(true)}
              className="lg:hidden flex items-center gap-1.5 px-3 py-1 text-xs border border-zinc-300 rounded-md bg-zinc-50"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters ({[selectedBrands.length, selectedAgeSizes.length, primeOnly ? 1 : 0].reduce((a, b) => a + b, 0)})</span>
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

        {/* Content Layout: Left Sidebar + Product Grid */}
        <div className="flex gap-6 items-start">
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
                    href="/category/kids"
                    className="hover:text-amber-700 hover:underline flex items-center text-zinc-600"
                  >
                    ‹ Clothing & Accessories
                  </Link>
                </li>
                <li className="pl-2 font-bold text-zinc-900">
                  Boys clothing
                </li>
                <li className="pl-4">
                  <span className="font-semibold text-zinc-800">Boys</span>
                  <ul className="pl-2 mt-1 space-y-1">
                    {BOYS_SUBCATEGORIES.map((cat) => (
                      <li key={cat.slug}>
                        <button
                          onClick={() => setActiveCategory(cat.slug)}
                          className={`text-left hover:text-amber-700 hover:underline block ${
                            activeCategory === cat.slug
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
                <li className="pt-2.5 mt-2 border-t border-zinc-200">
                  <Link
                    href="/category/girls-clothing"
                    className="hover:text-amber-700 hover:underline flex items-center justify-between text-xs font-semibold text-zinc-700"
                  >
                    <span>Girls Clothing</span>
                    <span className="text-zinc-400">›</span>
                  </Link>
                </li>
              </ul>
            </div>

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

            {/* Price Filter */}
            <div className="border-t border-zinc-200 pt-3">
              <div className="font-bold text-zinc-900 text-[13px] mb-1.5">Price</div>
              <ul className="space-y-1 text-zinc-700">
                {[
                  { label: 'Under ₹300', val: 'under-300' },
                  { label: '₹300 - ₹500', val: '300-500' },
                  { label: '₹500 - ₹1,000', val: '500-1000' },
                  { label: '₹1,000 - ₹1,500', val: '1000-1500' },
                  { label: 'Over ₹1,500', val: 'over-1500' },
                ].map((item) => (
                  <li key={item.val}>
                    <button
                      onClick={() =>
                        setSelectedPriceRange(selectedPriceRange === item.val ? null : item.val)
                      }
                      className={`hover:text-amber-700 hover:underline block ${
                        selectedPriceRange === item.val
                          ? 'font-bold text-amber-700'
                          : 'text-zinc-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Customer Reviews */}
            <div className="border-t border-zinc-200 pt-3">
              <div className="font-bold text-zinc-900 text-[13px] mb-1.5">Customer Review</div>
              <div className="space-y-1 text-zinc-700">
                <button
                  onClick={() => setSortBy('rating')}
                  className="flex items-center gap-1 hover:text-amber-700 group"
                >
                  <div className="flex text-amber-400 text-xs">
                    {'★★★★☆'}
                  </div>
                  <span className="text-xs text-zinc-600 group-hover:underline">& Up</span>
                </button>
              </div>
            </div>

            {/* Deals & Discounts */}
            <div className="border-t border-zinc-200 pt-3">
              <div className="font-bold text-zinc-900 text-[13px] mb-1.5">Deals & Discounts</div>
              <ul className="space-y-1 text-zinc-700">
                <li>
                  <button
                    onClick={() => setDiscountMin(discountMin === 10 ? null : 10)}
                    className={`hover:text-amber-700 hover:underline ${
                      discountMin === 10 ? 'font-bold text-amber-700' : ''
                    }`}
                  >
                    All Discounts
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setDiscountMin(discountMin === 50 ? null : 50)}
                    className={`hover:text-amber-700 hover:underline ${
                      discountMin === 50 ? 'font-bold text-amber-700' : ''
                    }`}
                  >
                    Today&apos;s Deals
                  </button>
                </li>
              </ul>
            </div>

            {/* Discount Percentage */}
            <div className="border-t border-zinc-200 pt-3">
              <div className="font-bold text-zinc-900 text-[13px] mb-1.5">Discount</div>
              <ul className="space-y-1 text-zinc-700">
                {[10, 25, 35, 50, 60, 70].map((disc) => (
                  <li key={disc}>
                    <button
                      onClick={() => setDiscountMin(discountMin === disc ? null : disc)}
                      className={`hover:text-amber-700 hover:underline ${
                        discountMin === disc ? 'font-bold text-amber-700' : ''
                      }`}
                    >
                      {disc}% Off or more
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pay On Delivery */}
            <div className="border-t border-zinc-200 pt-3">
              <div className="font-bold text-zinc-900 text-[13px] mb-1.5">Pay On Delivery</div>
              <label className="flex items-center gap-2 cursor-pointer hover:text-amber-700">
                <input
                  type="checkbox"
                  className="rounded border-zinc-300 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                />
                <span className="text-zinc-700 text-xs">Eligible for Pay On Delivery</span>
              </label>
            </div>

            {/* Availability */}
            <div className="border-t border-zinc-200 pt-3">
              <div className="font-bold text-zinc-900 text-[13px] mb-1.5">Availability</div>
              <label className="flex items-center gap-2 cursor-pointer hover:text-amber-700">
                <input
                  type="checkbox"
                  className="rounded border-zinc-300 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                />
                <span className="text-zinc-700 text-xs">Include Out of Stock</span>
              </label>
            </div>

            {/* Material */}
            <div className="border-t border-zinc-200 pt-3">
              <div className="font-bold text-zinc-900 text-[13px] mb-1.5">Material</div>
              <div className="space-y-1">
                <label className="flex items-center gap-2 cursor-pointer hover:text-amber-700">
                  <input
                    type="checkbox"
                    className="rounded border-zinc-300 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                  />
                  <span className="text-zinc-700 text-xs">Cotton</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-amber-700">
                  <input
                    type="checkbox"
                    className="rounded border-zinc-300 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                  />
                  <span className="text-zinc-700 text-xs">Synthetic</span>
                </label>
              </div>
            </div>

            {/* Amazon Fashion */}
            <div className="border-t border-zinc-200 pt-3">
              <div className="font-bold text-zinc-900 text-[13px] mb-1.5">Amazon Fashion</div>
              <div className="space-y-1 text-xs">
                <label className="flex items-center gap-2 cursor-pointer hover:text-amber-700">
                  <input
                    type="checkbox"
                    className="rounded border-zinc-300 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                  />
                  <span>Top Brands</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-amber-700">
                  <input
                    type="checkbox"
                    className="rounded border-zinc-300 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                  />
                  <span>Made for Amazon</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-amber-700">
                  <input
                    type="checkbox"
                    className="rounded border-zinc-300 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                  />
                  <span>Premium Brands</span>
                </label>
              </div>
            </div>

            {/* Children's Clothing Size */}
            <div className="border-t border-zinc-200 pt-3">
              <div className="font-bold text-zinc-900 text-[13px] mb-1.5">
                Children&apos;s Clothing Size
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {AGE_SIZES.map((size) => (
                  <label
                    key={size}
                    className="flex items-center gap-2 cursor-pointer hover:text-amber-700"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAgeSizes.includes(size)}
                      onChange={() => toggleAgeSize(size)}
                      className="rounded border-zinc-300 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                    />
                    <span className="text-xs text-zinc-800">{size}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Clear All Filters Button */}
            {hasActiveFilters && (
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
          {/* MAIN PRODUCT CATALOG GRID */}
          {/* ============================================================== */}
          <div className="flex-1">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-16 bg-zinc-50 rounded-lg border border-zinc-200">
                <h3 className="text-base font-semibold text-zinc-800 mb-1">
                  No matching boy&apos;s clothing found
                </h3>
                <p className="text-xs text-zinc-500 mb-4">
                  Try clearing some filters to view more boys clothing items.
                </p>
                <button
                  onClick={clearAllFilters}
                  className="px-4 py-1.5 bg-amber-400 hover:bg-amber-500 text-zinc-900 font-medium text-xs rounded-full shadow-sm"
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="group bg-white border border-zinc-200 hover:border-zinc-300 rounded-sm p-2 flex flex-col justify-between hover:shadow-md transition-shadow relative"
                  >
                    <div>
                      {/* Image Container */}
                      <Link
                        href={`/products/${product.slug || product.id}`}
                        className="relative aspect-[4/5] w-full bg-zinc-50 rounded-sm overflow-hidden flex items-center justify-center mb-2 block cursor-pointer"
                      >
                        <Image
                          src={product.image}
                          alt={product.title}
                          fill
                          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                          className="object-contain p-2 group-hover:scale-105 transition-transform duration-200"
                        />
                        {product.isAmazonChoice && (
                          <span className="absolute top-1 left-1 bg-zinc-900 text-white text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold">
                            Amazon&apos;s Choice
                          </span>
                        )}
                      </Link>

                      {/* Swatches Row */}
                      {product.swatches && product.swatches.length > 0 && (
                        <div className="flex items-center gap-1 mb-1.5 overflow-hidden">
                          {product.swatches.slice(0, 4).map((swatch: any, sIdx: number) => (
                            <span
                              key={sIdx}
                              title={swatch.name}
                              className="w-3 h-3 rounded-full border border-zinc-300 shadow-xs inline-block"
                              style={{ backgroundColor: swatch.hex }}
                            />
                          ))}
                          {product.swatches.length > 4 && (
                            <span className="text-[10px] text-zinc-500 font-medium">
                              +{product.swatches.length - 4}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Brand & Title Link */}
                      <Link href={`/products/${product.slug || product.id}`} className="block group/title">
                        <div className="text-[12px] font-bold text-zinc-900 uppercase tracking-tight line-clamp-1">
                          {product.brand}
                        </div>

                        {/* Title */}
                        <h2 className="text-[12px] text-zinc-700 line-clamp-2 group-hover/title:text-amber-700 hover:text-amber-700 leading-snug cursor-pointer my-0.5">
                          {product.title}
                        </h2>
                      </Link>

                      {/* Ratings & Bought Count */}
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

                      {product.boughtPastMonth && (
                        <div className="text-[10px] text-zinc-500 mb-1">
                          {product.boughtPastMonth}
                        </div>
                      )}

                      {/* Limited Time Deal Badge */}
                      {product.isLimitedDeal && (
                        <div className="inline-block bg-[#cc0c39] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-xs mb-1">
                          Limited time deal
                        </div>
                      )}

                      {/* Price Row */}
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-[11px] align-super text-zinc-900 font-semibold">₹</span>
                        <span className="text-base font-bold text-zinc-900 leading-none">
                          {product.price.toLocaleString('en-IN')}
                        </span>
                        {product.unitPriceNotice && (
                          <span className="text-[10px] text-zinc-500">
                            ({product.unitPriceNotice})
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        <span>M.R.P: </span>
                        <span className="line-through">₹{product.originalPrice.toLocaleString('en-IN')}</span>
                        <span className="ml-1 text-zinc-700 font-semibold">({product.discount})</span>
                      </div>

                      {/* Prime Badge & Delivery */}
                      {product.isPrime && (
                        <div className="mt-1 flex items-center">
                          <span className="text-[#00a8e1] font-bold text-[11px] italic">
                            ✓prime
                          </span>
                        </div>
                      )}

                      <div className="text-[10px] text-zinc-600 mt-0.5 line-clamp-2">
                        {product.deliveryDate}
                      </div>
                    </div>

                    {/* Add to Cart Button */}
                    <div className="mt-3 pt-2 border-t border-zinc-100">
                      <button
                        onClick={() => handleAddToCart(product as any)}
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

      {/* ============================================================== */}
      {/* MOBILE FILTER DRAWER */}
      {/* ============================================================== */}
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

            {/* Subcategories */}
            <div>
              <div className="font-bold text-xs text-zinc-900 mb-1">Subcategory</div>
              <div className="space-y-1">
                {BOYS_SUBCATEGORIES.map((cat) => (
                  <button
                    key={cat.slug}
                    onClick={() => {
                      setActiveCategory(cat.slug);
                      setMobileFilterOpen(false);
                    }}
                    className={`block w-full text-left text-xs py-1 px-2 rounded ${
                      activeCategory === cat.slug
                        ? 'bg-amber-100 text-amber-800 font-semibold'
                        : 'text-zinc-700'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Brands */}
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

            {/* Price */}
            <div className="border-t pt-3">
              <div className="font-bold text-xs text-zinc-900 mb-1">Price</div>
              {[
                { label: 'Under ₹300', val: 'under-300' },
                { label: '₹300 - ₹500', val: '300-500' },
                { label: '₹500 - ₹1,000', val: '500-1000' },
                { label: '₹1,000 - ₹1,500', val: '1000-1500' },
                { label: 'Over ₹1,500', val: 'over-1500' },
              ].map((item) => (
                <button
                  key={item.val}
                  onClick={() =>
                    setSelectedPriceRange(selectedPriceRange === item.val ? null : item.val)
                  }
                  className={`block w-full text-left text-xs py-1 ${
                    selectedPriceRange === item.val ? 'font-bold text-amber-700' : 'text-zinc-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
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

// Default Export wrapped in Suspense for useSearchParams
export default function BoysClothingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white p-8 text-center text-sm text-zinc-500">
          Loading Boys Clothing...
        </div>
      }
    >
      <BoysClothingContent />
    </Suspense>
  );
}
