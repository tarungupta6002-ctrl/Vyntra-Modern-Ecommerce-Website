'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ChevronRight,
  Star,
  Check,
  Heart,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Truck,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { FashionDepartmentSubNav } from '@/components/layout/fashion-department-subnav';
import { SareeBannerCarousel } from '@/components/sarees/saree-banner-carousel';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';
import { useCategoryProducts, CategoryProductItem } from '@/hooks/use-category-products';

// 8 Saree Subcategories (Exact match to Flipkart Screenshot: 2 Rows x 4 Columns)
interface SareeSubcategory {
  id: string;
  name: string;
  slug: string;
  priceText: string;
  image: string;
}

const SAREE_SUBCATEGORIES: SareeSubcategory[] = [
  {
    id: 'kanjivaram',
    name: 'Kanjivaram',
    slug: 'kanjivaram',
    priceText: 'From ₹349',
    image: '/images/saree-categories/kanjivaram.jpg',
  },
  {
    id: 'silk-sarees',
    name: 'Silk Sarees',
    slug: 'silk-sarees',
    priceText: 'From ₹249',
    image: '/images/saree-categories/silk-sarees.jpg',
  },
  {
    id: 'banarasi',
    name: 'Banarasi',
    slug: 'banarasi',
    priceText: 'From ₹299',
    image: '/images/saree-categories/banarasi.jpg',
  },
  {
    id: 'bollywood-saree',
    name: 'Bollywood Saree',
    slug: 'bollywood-saree',
    priceText: 'From ₹299',
    image: '/images/saree-categories/bollywood-saree.jpg',
  },
  {
    id: 'sambalpuri',
    name: 'Samabalpuri Sarees',
    slug: 'sambalpuri',
    priceText: 'From ₹299',
    image: '/images/saree-categories/sambalpuri.jpg',
  },
  {
    id: 'embroidered',
    name: 'Embroidered',
    slug: 'embroidered',
    priceText: 'From ₹499',
    image: '/images/saree-categories/embroidered.jpg',
  },
  {
    id: 'chiffon',
    name: 'Chiffon Sarees',
    slug: 'chiffon',
    priceText: 'From ₹249',
    image: '/images/saree-categories/chiffon.jpg',
  },
  {
    id: 'handloom',
    name: 'Handloom Sarees',
    slug: 'handloom',
    priceText: 'From ₹249',
    image: '/images/saree-categories/handloom.jpg',
  },
];

export default function SareesStorefrontPage() {
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'low-to-high' | 'high-to-low' | 'rating'>('featured');
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({});

  // 1. Live database catalog from PostgreSQL
  const { products: liveSarees, isLoading } = useCategoryProducts({ categoryKey: 'sarees' });

  const { addItem, openCart } = useCartStore();
  const { toggleItem, isInWishlist } = useWishlistStore();

  const handleAddToCart = (product: CategoryProductItem) => {
    addItem({
      id: product.id,
      productId: product.id,
      title: product.title,
      brand: product.brand,
      variantId: `var-${product.id}`,
      size: 'Free Size',
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

  // Filter products by selected subcategory
  const filteredProducts = useMemo(() => {
    let result = [...liveSarees];

    if (selectedSubCategory !== 'all') {
      const subLower = selectedSubCategory.toLowerCase();
      result = result.filter(
        (p) =>
          p.subcategory.includes(subLower) ||
          p.subCategory.toLowerCase().includes(subLower) ||
          p.title.toLowerCase().includes(subLower)
      );
    }

    if (sortBy === 'low-to-high') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'high-to-low') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      result.sort((a, b) => b.rating - a.rating);
    }

    return result;
  }, [liveSarees, selectedSubCategory, sortBy]);

  const activeSubcategoryData = useMemo(() => {
    return SAREE_SUBCATEGORIES.find((c) => c.slug === selectedSubCategory);
  }, [selectedSubCategory]);

  return (
    <div className="w-full bg-[#FFFFFF] min-h-screen text-[#0F1111]">
      {/* 1. Department Sub-Nav Bar (Vyntra Fashion with Women Active & Mega Menu) */}
      <FashionDepartmentSubNav activeItem="women" />

      {/* 2. Top Hero Carousel (Flipkart Multi-Card Auto-Scroll Saree Banners) */}
      <div className="w-full border-b border-[#F0F0F0]">
        <SareeBannerCarousel />
      </div>

      {/* 3. Main Container for 8 Saree Visual Subcategories Grid + Product Listing */}
      <div className="w-full max-w-[1450px] mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* ========================================================================= */}
        {/* 8 SAREE SUBCATEGORIES GRID (Flipkart Exact Match: 2 Rows x 4 Columns)     */}
        {/* ========================================================================= */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[20px] sm:text-[22px] font-bold text-[#0F1111] tracking-tight">
                Shop Sarees by Fabric &amp; Style
              </h2>
              <p className="text-xs text-[#565959] mt-0.5">
                Explore handloom silk, Banarasi zari, Bollywood satins, and lightweight daily drapes
              </p>
            </div>
            {selectedSubCategory !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedSubCategory('all')}
                className="text-xs font-bold text-[#2874F0] hover:underline cursor-pointer"
              >
                View All Categories &rarr;
              </button>
            )}
          </div>

          {/* 2 Rows x 4 Columns Grid (Official Flipkart Saree Subcategories) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {SAREE_SUBCATEGORIES.map((subcat) => {
              const isSelected = selectedSubCategory === subcat.slug;
              return (
                <button
                  key={subcat.id}
                  type="button"
                  aria-label={`${subcat.name} ${subcat.priceText}`}
                  onClick={() =>
                    setSelectedSubCategory((prev) => (prev === subcat.slug ? 'all' : subcat.slug))
                  }
                  className="group flex flex-col items-center cursor-pointer select-none text-center focus:outline-none"
                >
                  {/* Card Container with Flipkart Selection Ring & Hover Elevation */}
                  <div
                    className={`relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-white transition-all duration-200 ${
                      isSelected
                        ? 'ring-3 ring-[#2874F0] shadow-lg scale-[1.02]'
                        : 'border border-[#F0F0F0] hover:border-[#D5D9D9] hover:shadow-md group-hover:scale-[1.02]'
                    }`}
                  >
                    <Image
                      src={subcat.image}
                      alt={`${subcat.name} ${subcat.priceText}`}
                      fill
                      unoptimized
                      priority
                      className="object-contain object-center group-hover:scale-[1.03] transition-transform duration-300 pointer-events-none"
                      sizes="(max-width: 640px) 180px, (max-width: 1024px) 240px, 320px"
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* PRODUCT LISTING SECTION (Filtered by selected Saree Subcategory)          */}
        {/* ========================================================================= */}
        <section className="space-y-4 pt-4 border-t border-[#E5E7EB]">
          {/* Section Header with Active Filter Indicator & Sort Dropdown */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E7E7E7]">
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-[14px] text-[#565959]">
                Showing {filteredProducts.length} of over 5,000 results for{' '}
                <span className="font-bold text-[#0F1111]">
                  {activeSubcategoryData ? activeSubcategoryData.name : 'All Sarees'}
                </span>
              </span>

              {selectedSubCategory !== 'all' && (
                <span className="inline-flex items-center gap-1.5 bg-[#E8F0FE] text-[#1967D2] text-xs px-2.5 py-1 rounded-full font-bold">
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
                className="bg-[#F0F2F2] border border-[#D5D9D9] rounded-md px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-[#2874F0] cursor-pointer"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredProducts.map((product) => {
              const isSaved = isInWishlist(product.id);
              const isAdded = addedItemIds[product.id];

              return (
                <div
                  key={product.id}
                  className="group bg-white rounded-xl border border-[#E5E7EB] hover:border-[#2874F0] hover:shadow-lg transition-all duration-200 flex flex-col justify-between overflow-hidden p-3.5 relative"
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
                        boardIds: ['all', 'sarees'],
                      })
                    }
                    className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-white/90 shadow-xs hover:bg-white transition-colors cursor-pointer"
                    title={isSaved ? 'Remove from Wishlist' : 'Add to Wishlist'}
                  >
                    <Heart
                      className={`h-4 w-4 ${
                        isSaved ? 'fill-[#E01A22] text-[#E01A22]' : 'text-stone-400 hover:text-[#E01A22]'
                      }`}
                    />
                  </button>

                  <div>
                    {/* Saree Image */}
                    <Link href={`/products/${product.slug}`}>
                      <div className="relative aspect-[3/4] w-full rounded-lg bg-[#F7F7F7] overflow-hidden mb-3">
                        <Image
                          src={product.image}
                          alt={product.title}
                          fill
                          unoptimized
                          className="object-cover object-top group-hover:scale-104 transition-transform duration-300"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 25vw"
                        />
                        {product.isBestSeller && (
                          <span className="absolute top-2 left-2 bg-[#2874F0] text-white text-[10px] font-black px-2 py-0.5 rounded-xs tracking-wider uppercase shadow-xs">
                            Best Seller
                          </span>
                        )}
                      </div>
                    </Link>

                    {/* Brand & Title */}
                    <span className="text-[12px] font-bold text-[#878787] uppercase block mb-1">
                      {product.brand}
                    </span>
                    <Link href={`/products/${product.slug}`}>
                      <h3
                        className="text-[13px] font-normal text-[#212121] hover:text-[#2874F0] line-clamp-2 leading-snug mb-1.5 cursor-pointer"
                        title={product.title}
                      >
                        {product.title}
                      </h3>
                    </Link>

                    {/* Rating Stars */}
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="flex items-center text-[#FFA41C]">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${
                              i < Math.floor(product.rating)
                                ? 'fill-[#FFA41C] text-[#FFA41C]'
                                : 'text-stone-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] text-[#878787]">
                        ({product.reviews.toLocaleString()})
                      </span>
                    </div>

                    {/* Price Section */}
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-[20px] font-black text-[#212121]">
                        &#8377;{product.price}
                      </span>
                      <span className="text-[12px] text-[#878787] line-through">
                        &#8377;{product.originalPrice}
                      </span>
                      <span className="text-[12px] text-[#388E3C] font-bold">
                        {product.discount}
                      </span>
                    </div>

                    {/* Delivery & Prime */}
                    <div className="space-y-0.5 text-[11px] text-[#565959]">
                      <span className="block text-[#212121] font-medium">
                        FREE Delivery <span className="font-bold">{product.deliveryDate}</span>
                      </span>
                    </div>
                  </div>

                  {/* Add to Cart Button */}
                  <div className="pt-3 mt-2 border-t border-[#F0F0F0]">
                    <button
                      type="button"
                      onClick={() => handleAddToCart(product)}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 ${
                        isAdded
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#FF9F00] hover:bg-[#F39700] text-white active:scale-98'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="h-3.5 w-3.5" /> Added to Cart
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="h-3.5 w-3.5" /> Add to Cart
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </section>
      </div>
    </div>
  );
}
