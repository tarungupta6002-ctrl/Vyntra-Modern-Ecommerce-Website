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
  Watch,
  Activity,
} from 'lucide-react';
import { FashionDepartmentSubNav } from '@/components/layout/fashion-department-subnav';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';
import { useCategoryProducts } from '@/hooks/use-category-products';
import { formatINR } from '@/lib/utils';

// Department Gateway Cards
const WATCH_DEPARTMENTS = [
  {
    id: 'men',
    title: "Men's Watches",
    subtitle: 'Chronographs, Stainless Steel, Analog Classics & Automatic Movements',
    count: '880+ Models',
    href: '/category/mens-watches',
    badge: 'Precision & Heritage',
  },
  {
    id: 'women',
    title: "Women's Watches",
    subtitle: 'Rose Gold Bracelets, Minimalist Dials, Diamond Accents & Jewelry Timepieces',
    count: '920+ Models',
    href: '/category/womens-watches',
    badge: 'Luxury Dials & Chic',
  },
  {
    id: 'smartwatches',
    title: 'Smartwatches & Fitness Wearables',
    subtitle: 'Bluetooth Calling, AMOLED Displays, Sleep & Heart Telemetry',
    count: '420+ Models',
    href: '#smartwatches',
    badge: 'Connected Tech',
  },
];

// Verified Quick Subcategory Pills
const POPULAR_WATCH_PILLS = [
  { name: "Men's Chronographs", href: '/category/mens-watches?sub=classics' },
  { name: "Women's Rose Gold Dials", href: '/category/womens-watches?sub=wrist-watches' },
  { name: "Men's Luxury Studio", href: '/category/mens-watches?sub=premium' },
  { name: "Women's Diamond Accents", href: '/category/womens-watches?sub=premium-studio' },
  { name: "Men's Smartwatches", href: '/category/mens-watches?sub=smartwatches' },
  { name: "Women's Smartwatches", href: '/category/womens-watches?sub=smartwatches' },
  { name: "Everyday Classics", href: '/category/mens-watches?sub=value-picks' },
];

function WatchesHubContent() {
  const { addItem, openCart } = useCartStore();
  const { toggleItem: toggleWishlist, isInWishlist } = useWishlistStore();
  const [activeGenderTab, setActiveGenderTab] = useState<'all' | 'men' | 'women'>('all');

  // Load real catalog watches using verified hooks
  const { products: menWatches } = useCategoryProducts({ categoryKey: 'mens-watches' });
  const { products: womenWatches } = useCategoryProducts({ categoryKey: 'womens-watches' });

  // Merge real catalog watches cleanly
  const combinedProducts = useMemo(() => {
    if (activeGenderTab === 'men') return menWatches;
    if (activeGenderTab === 'women') return womenWatches;

    const list: typeof menWatches = [];
    const maxLen = Math.max(menWatches.length, womenWatches.length);
    for (let i = 0; i < maxLen; i++) {
      if (menWatches[i]) list.push(menWatches[i]);
      if (womenWatches[i]) list.push(womenWatches[i]);
    }
    return list;
  }, [menWatches, womenWatches, activeGenderTab]);

  return (
    <div className="w-full bg-[#FAFAFA] min-h-screen text-[#0F1111] antialiased">
      {/* 1. Fashion Sub-nav */}
      <FashionDepartmentSubNav />

      {/* 2. Breadcrumbs */}
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
          <span className="font-semibold text-[#0F1111]">Watches &amp; Timepieces Studio</span>
        </div>
      </div>

      <div className="max-w-[1450px] mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* 3. Header Hero */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E7E7E7] shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-wider font-bold text-[#007185] block mb-1">
                Gender-Neutral Timepiece Studio
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold font-headline text-[#0F1111] tracking-tight">
                Watches &amp; Wearables Studio
              </h1>
              <p className="text-xs sm:text-sm text-[#565959] mt-1 max-w-2xl">
                Discover world-class horology and connected wearables across Men&apos;s and Women&apos;s collections. From precision Swiss chronographs and elegant rose gold dials to next-gen AMOLED fitness smartwatches.
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
                  All Watches
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

        {/* 4. Three Primary Gateway Cards (Men, Women, Smartwatches) */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#565959] mb-3">
            Shop By Department
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {WATCH_DEPARTMENTS.map((dept) => (
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
                  <span>Explore Collection</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 5. Popular Watch Pills */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#565959] mb-3">
            Popular Timepiece Styles
          </h2>
          <div className="flex flex-wrap gap-2">
            {POPULAR_WATCH_PILLS.map((pill) => (
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

        {/* 6. Smartwatches Dedicated Spotlight Section */}
        <div id="smartwatches" className="scroll-mt-24 bg-gradient-to-r from-[#002B32] to-[#004B57] text-white rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[#FFD814] text-xs font-bold uppercase tracking-wider mb-2">
                <Activity className="h-3.5 w-3.5" />
                <span>Next-Gen Smartwatches &amp; Trackers</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold font-headline">
                Connected Wearable Technology
              </h3>
              <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-xl">
                Bluetooth HD calling, continuous SpO2, real-time stress telemetry, and 100+ sports modes crafted with aerospace alloy and silicone bands.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                href="/category/mens-watches?sub=smartwatches"
                className="px-4 py-2.5 rounded-xl bg-white text-[#004B57] hover:bg-[#F0F2F2] font-bold text-xs shadow-sm transition-colors"
              >
                Shop Men&apos;s Smartwatches
              </Link>
              <Link
                href="/category/womens-watches?sub=smartwatches"
                className="px-4 py-2.5 rounded-xl bg-[#FF9900] text-[#0F1111] hover:bg-[#FA8900] font-bold text-xs shadow-sm transition-colors"
              >
                Shop Women&apos;s Smartwatches
              </Link>
            </div>
          </div>
        </div>

        {/* 7. Real Live Watches Catalog Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-bold text-[#0F1111]">
              Trending Watches Across Catalog ({combinedProducts.length} Models)
            </h2>
            <span className="text-xs text-[#565959]">
              Verified Vyntra Horology Selection
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
                        brand: p.brand || 'Vyntra Horology',
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
                          brand: p.brand || 'Vyntra Horology',
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

export default function WatchesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAFAFA]" />}>
      <WatchesHubContent />
    </Suspense>
  );
}
