'use client';

import React, { useState, useMemo, Suspense } from 'react';
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
  ArrowRight,
} from 'lucide-react';
import { FashionDepartmentSubNav } from '@/components/layout/fashion-department-subnav';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';
import { useCategoryProducts } from '@/hooks/use-category-products';
import { formatINR } from '@/lib/utils';

// Department Quick Cards
const SHOE_DEPARTMENTS = [
  {
    id: 'men',
    title: "Men's Footwear",
    subtitle: 'Sneakers, Formal Oxfords, Loafers & Sports Running',
    count: '950+ Styles',
    href: '/category/mens-shoes',
    image: '/images/shoes-bubbles/bubble_sneakers.png',
    badge: 'Trending Formals & Sports',
  },
  {
    id: 'women',
    title: "Women's Footwear",
    subtitle: 'Heels, Stilettos, Ethnic Juttis, Flats & Pumps',
    count: '820+ Styles',
    href: '/category/womens-shoes',
    image: '/images/shoes-bubbles/sandals.png',
    badge: 'Artisan Heirlooms & Chic',
  },
  {
    id: 'kids',
    title: "Kids' Footwear",
    subtitle: "Boys' & Girls' Sneakers, School Shoes & Sandals",
    count: '340+ Styles',
    href: '/category/kids-shoes',
    image: '/images/shoes-bubbles/bubble_boots.png',
    badge: 'Comfort & Durable',
  },
];

// Verified Subcategory Quick Pills (All point to real existing routes)
const POPULAR_FOOTWEAR_PILLS = [
  { name: "Men's Sneakers", href: '/category/mens-shoes?type=sneakers' },
  { name: "Women's Heels & Pumps", href: '/category/womens-shoes?sub=pumps' },
  { name: "Men's Formal Shoes", href: '/category/mens-shoes?type=formal' },
  { name: "Women's Sandals & Flats", href: '/category/womens-shoes?sub=sandals' },
  { name: "Men's Casual Loafers", href: '/category/mens-shoes?type=loafers' },
  { name: "Women's Ethnic Juttis", href: '/category/womens-shoes?sub=ethnic' },
  { name: "Boys' Footwear", href: '/category/mens-shoes?sub=kids-shoes' },
  { name: "Girls' Footwear", href: '/category/womens-shoes?sub=kids-shoes' },
];

function ShoesHubContent() {
  const { addItem, openCart } = useCartStore();
  const { toggleItem: toggleWishlist, isInWishlist } = useWishlistStore();
  const [activeGenderTab, setActiveGenderTab] = useState<'all' | 'men' | 'women'>('all');

  // Load real catalog products using verified hooks
  const { products: menProducts } = useCategoryProducts({ categoryKey: 'mens-shoes' });
  const { products: womenProducts } = useCategoryProducts({ categoryKey: 'womens-shoes' });

  // Merge real catalog products cleanly
  const combinedProducts = useMemo(() => {
    if (activeGenderTab === 'men') return menProducts;
    if (activeGenderTab === 'women') return womenProducts;

    const list: typeof menProducts = [];
    const maxLen = Math.max(menProducts.length, womenProducts.length);
    for (let i = 0; i < maxLen; i++) {
      if (menProducts[i]) list.push(menProducts[i]);
      if (womenProducts[i]) list.push(womenProducts[i]);
    }
    return list;
  }, [menProducts, womenProducts, activeGenderTab]);

  return (
    <div className="w-full bg-[#FAFAFA] min-h-screen text-[#0F1111] antialiased">
      {/* 1. Fashion Sub-nav */}
      <FashionDepartmentSubNav />

      {/* 2. Amazon-style Breadcrumb */}
      <div className="border-b border-[#E7E7E7] bg-[#FAFAFA] py-2 px-4 sm:px-6">
        <div className="max-w-[1450px] mx-auto flex items-center gap-1.5 text-xs text-[#565959]">
          <Link href="/" className="hover:text-[#007185] hover:underline">
            Home
          </Link>
          <ChevronRight className="h-3 w-3 text-stone-400" />
          <Link href="/products" className="hover:text-[#007185] hover:underline">
            Fashion
          </Link>
          <ChevronRight className="h-3 w-3 text-stone-400" />
          <span className="font-semibold text-[#0F1111]">Footwear &amp; Shoes Hub</span>
        </div>
      </div>

      <div className="max-w-[1450px] mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* 3. Header Hero */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E7E7E7] shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-wider font-bold text-[#007185] block mb-1">
                Gender-Neutral Footwear Studio
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold font-headline text-[#0F1111] tracking-tight">
                Footwear &amp; Shoes Studio
              </h1>
              <p className="text-xs sm:text-sm text-[#565959] mt-1 max-w-2xl">
                Explore handpicked designer footwear across Men&apos;s, Women&apos;s, and Kids&apos; curated collections. From handcrafted ethnic juttis and luxury pumps to everyday sneakers and formal oxfords.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
              <span className="text-xs text-[#565959] font-medium">Quick Filter:</span>
              <div className="inline-flex rounded-xl p-1 bg-[#F0F2F2] border border-[#D5D9D9] text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveGenderTab('all')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeGenderTab === 'all' ? 'bg-white text-[#0F1111] shadow-xs font-bold' : 'text-[#565959]'
                  }`}
                >
                  All Footwear
                </button>
                <button
                  type="button"
                  onClick={() => setActiveGenderTab('men')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeGenderTab === 'men' ? 'bg-white text-[#007185] shadow-xs font-bold' : 'text-[#565959]'
                  }`}
                >
                  Men
                </button>
                <button
                  type="button"
                  onClick={() => setActiveGenderTab('women')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeGenderTab === 'women' ? 'bg-white text-[#800020] shadow-xs font-bold' : 'text-[#565959]'
                  }`}
                >
                  Women
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Three Primary Gateway Cards (Men, Women, Kids) */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#565959] mb-3">
            Shop By Department
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {SHOE_DEPARTMENTS.map((dept) => (
              <Link
                key={dept.id}
                href={dept.href}
                className="group relative bg-white rounded-2xl p-6 border border-[#E7E7E7] shadow-xs hover:shadow-md hover:border-[#007185] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-bold text-[#007185] bg-[#E7F4F5] px-2 py-0.5 rounded-full">
                      {dept.badge}
                    </span>
                    <span className="text-[11px] text-[#565959] font-medium">{dept.count}</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#0F1111] group-hover:text-[#007185] transition-colors">
                    {dept.title}
                  </h3>
                  <p className="text-xs text-[#565959] mt-1 leading-relaxed">
                    {dept.subtitle}
                  </p>
                </div>
                <div className="mt-5 pt-4 border-t border-[#F0F2F2] flex items-center justify-between text-xs font-bold text-[#007185] group-hover:translate-x-1 transition-transform">
                  <span>Explore Department</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 5. Popular Category Pills */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#565959] mb-3">
            Popular Footwear Styles
          </h2>
          <div className="flex flex-wrap gap-2">
            {POPULAR_FOOTWEAR_PILLS.map((pill) => (
              <Link
                key={pill.name}
                href={pill.href}
                className="px-3.5 py-1.5 rounded-full bg-white border border-[#D5D9D9] hover:border-[#007185] hover:bg-[#F7FAFA] text-xs font-medium text-[#0F1111] transition-colors"
              >
                {pill.name}
              </Link>
            ))}
          </div>
        </div>

        {/* 6. Real Live Catalog Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-bold text-[#0F1111]">
              Trending Footwear Across Catalog ({combinedProducts.length} Items)
            </h2>
            <span className="text-xs text-[#565959]">
              Verified Vyntra Atelier Collection
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {combinedProducts.slice(0, 15).map((p) => {
              const inWish = isInWishlist(p.id);
              return (
                <div
                  key={p.id}
                  className="group bg-white rounded-xl border border-[#E7E7E7] p-3 flex flex-col justify-between hover:shadow-md transition-shadow relative"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleWishlist({
                        id: p.id,
                        productId: p.id,
                        slug: p.slug,
                        title: p.title,
                        price: p.price,
                        originalPrice: p.originalPrice || p.price,
                        image: p.image || '/images/placeholder.png',
                        brand: p.brand || 'Vyntra Atelier',
                        inStock: true,
                        boardIds: [],
                      });
                    }}
                    className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-white/90 hover:bg-white text-stone-400 hover:text-rose-600 shadow-xs transition-colors"
                  >
                    <Heart className={`h-4 w-4 ${inWish ? 'fill-rose-600 text-rose-600' : ''}`} />
                  </button>

                  <Link href={`/products/${p.slug}`} className="block">
                    <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-[#F8F8F8] mb-2.5">
                      <Image
                        src={p.image || '/images/placeholder.png'}
                        alt={p.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      />
                    </div>
                    <span className="text-[11px] font-bold text-[#565959] uppercase tracking-wide block truncate">
                      {p.brand}
                    </span>
                    <h4 className="text-xs font-semibold text-[#0F1111] line-clamp-2 mt-0.5 leading-snug group-hover:text-[#007185] transition-colors">
                      {p.title}
                    </h4>
                  </Link>

                  <div className="mt-2.5 pt-2 border-t border-[#F0F2F2]">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-bold text-[#0F1111]">
                        {formatINR(p.price)}
                      </span>
                      {p.originalPrice && p.originalPrice > p.price && (
                        <span className="text-[11px] text-[#565959] line-through">
                          {formatINR(p.originalPrice)}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        addItem({
                          id: `${p.id}-default`,
                          productId: p.id,
                          variantId: `${p.id}-default`,
                          title: p.title,
                          price: p.price,
                          originalPrice: p.originalPrice || p.price,
                          image: p.image || '/images/placeholder.png',
                          brand: p.brand || 'Vyntra Atelier',
                          vendorName: p.vendorName || 'Vyntra Partner',
                          size: p.sizes?.[0] || 'Standard',
                        });
                        openCart();
                      }}
                      className="w-full mt-2 py-1.5 px-3 rounded-lg bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] text-xs font-bold transition-colors shadow-2xs"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ShoesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAFAFA]" />}>
      <ShoesHubContent />
    </Suspense>
  );
}
