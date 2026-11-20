'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Flame,
  Star,
  Zap,
  CheckCircle,
  Truck,
  RotateCcw,
  ShieldCheck,
  Headphones,
  Lock,
  Heart,
  ShoppingBag,
  Sparkles,
  Copy,
  Clock,
  Layers,
  Check,
} from 'lucide-react';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';

// 1. Live Countdown Ticker Component (Isolated leaf component to prevent full page re-renders)
function FlashDealCountdown() {
  const [timeLeft, setTimeLeft] = useState({
    hours: '04',
    minutes: '28',
    seconds: '42',
  });

  useEffect(() => {
    let totalSeconds = 4 * 3600 + 28 * 60 + 42;
    const interval = setInterval(() => {
      if (totalSeconds > 0) {
        totalSeconds--;
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        setTimeLeft({
          hours: String(h).padStart(2, '0'),
          minutes: String(m).padStart(2, '0'),
          seconds: String(s).padStart(2, '0'),
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 bg-surface-container-lowest px-4 py-2 rounded-xl shadow-sm border border-outline-variant/30 hover:border-secondary-container/40 transition-colors">
      <span className="relative flex h-3 w-3 mr-1">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary-container opacity-75" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-secondary-container" />
      </span>
      <span className="text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold">
        Offer Closes In:
      </span>
      <div className="flex items-center gap-1 text-base font-bold text-on-surface font-mono">
        <span className="bg-surface-container px-2 py-0.5 rounded text-on-surface font-bold">
          {timeLeft.hours}
        </span>
        <span className="animate-pulse text-secondary-container">:</span>
        <span className="bg-surface-container px-2 py-0.5 rounded text-on-surface font-bold">
          {timeLeft.minutes}
        </span>
        <span className="animate-pulse text-secondary-container">:</span>
        <span className="bg-surface-container px-2 py-0.5 rounded text-on-surface font-bold">
          {timeLeft.seconds}
        </span>
      </div>
    </div>
  );
}

export default function VyntraHomepage() {
  const { addItem, openCart } = useCartStore();
  const { addItem: addWishlistItem, removeItem: removeWishlistItem, isInWishlist } = useWishlistStore();

  // 2. Interactive Toast Notification State
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    icon?: string;
  }>({
    show: false,
    message: '',
  });

  const showToast = (message: string, icon = 'check_circle') => {
    setToast({ show: true, message, icon });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3200);
  };

  // 3. Scroll Reveal Observer
  useEffect(() => {
    const revealElements = document.querySelectorAll('.reveal-on-scroll');
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.05, rootMargin: '60px 0px 60px 0px' }
      );
      revealElements.forEach((el) => observer.observe(el));
      return () => observer.disconnect();
    } else {
      revealElements.forEach((el) => el.classList.add('is-visible'));
    }
  }, []);

  // 4. Wishlist State per product
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({
    'prod-1': false,
    'prod-2': true,
    'prod-3': false,
    'prod-4': false,
  });

  const toggleWishlist = (id: string, name: string) => {
    const isCurrently = !!wishlist[id];
    if (isCurrently) {
      removeWishlistItem(id);
      showToast(`Removed ${name} from Wishlist`, 'favorite_border');
    } else {
      addWishlistItem({
        id,
        productId: id,
        title: name,
        brand: 'Vyntra Curated',
        price: 2499,
        originalPrice: 4999,
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCpwrNsj5YPVo1vY-tBQP-nqo5OW28cUelkKu1fAIXjy8j8ybHKnia7QJpGxGZhojsR8aMRp25Fed9Hz54OYs2zdU1dPdeWd0iIfWJP9sfnGF9N9j1pnBt57PEOxYqJDmj9ZWoNqXngWuiQYKDA45JQ5i5iQ3m6yVpn2Anz1lWxSbLNQDloCdeRUkTjPUkUaXvgnwcXMatjaiNym-yhEVb5gjtPFsoJ7AJMY4cyuN4',
        inStock: true,
        boardIds: ['all'],
      });
      showToast(`Saved ${name} to your Wishlist!`, 'favorite');
    }
    setWishlist((prev) => ({ ...prev, [id]: !isCurrently }));
  };

  // 5. Selected Sizes for Apparel
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({
    'prod-2': 'M',
  });

  // 6. Active Category Filter Chip & Filtering
  const [activeChip, setActiveChip] = useState('Top Curated');

  // Helper to match products by category/taxonomy
  const matchesCategory = (
    product: { category?: string; subCategory?: string; id?: string; title?: string },
    chip: string
  ): boolean => {
    if (chip === 'Top Curated') return true;
    const cat = (product.category || '').toLowerCase();
    const sub = (product.subCategory || '').toLowerCase();
    const title = (product.title || '').toLowerCase();
    const id = (product.id || '').toLowerCase();

    if (chip === 'Fashion') {
      return (
        cat.includes('fashion') ||
        cat.includes('ethnic') ||
        cat.includes('cloth') ||
        cat.includes('apparel') ||
        sub.includes('kurta') ||
        sub.includes('ethnic') ||
        sub.includes('apparel') ||
        sub.includes('fashion') ||
        id === 'prod-2' ||
        title.includes('kurta') ||
        title.includes('linen')
      );
    }

    if (chip === 'Audio & Wearables') {
      return (
        cat.includes('audio') ||
        cat.includes('electronic') ||
        cat.includes('wearable') ||
        cat.includes('watch') ||
        sub.includes('headphone') ||
        sub.includes('audio') ||
        sub.includes('wearable') ||
        sub.includes('watch') ||
        id === 'prod-1' ||
        id === 'prod-3' ||
        title.includes('headphone') ||
        title.includes('watch')
      );
    }

    if (chip === 'Clean Skincare') {
      return (
        cat.includes('beauty') ||
        cat.includes('skin') ||
        cat.includes('skincare') ||
        cat.includes('ayurved') ||
        sub.includes('skin') ||
        sub.includes('beauty') ||
        sub.includes('elixir') ||
        id === 'prod-4' ||
        title.includes('kumkumadi') ||
        title.includes('elixir')
      );
    }

    return false;
  };

  // 7. Added to Bag button feedback state
  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});

  // 8. Dynamic Featured Products from Backend API / Prisma DB
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/products?limit=4')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setFeaturedProducts(json.data);
        }
      })
      .catch((err) => {
        console.warn('[Homepage Products Fetch Error, using fallback]:', err);
      });
  }, []);

  // Filter dynamic products when available
  const displayedDynamicProducts = useMemo(() => {
    return featuredProducts.filter((prod) => matchesCategory(prod, activeChip));
  }, [featuredProducts, activeChip]);

  // Fallback product visibility flags
  const showFallbackProd1 = matchesCategory(
    { id: 'prod-1', category: 'Audio & Wearables', subCategory: 'audio', title: 'Apex Pro' },
    activeChip
  );
  const showFallbackProd2 = matchesCategory(
    { id: 'prod-2', category: 'Fashion', subCategory: 'ethnic', title: 'Kurta' },
    activeChip
  );
  const showFallbackProd3 = matchesCategory(
    { id: 'prod-3', category: 'Audio & Wearables', subCategory: 'smartwatch', title: 'Smartwatch' },
    activeChip
  );
  const showFallbackProd4 = matchesCategory(
    { id: 'prod-4', category: 'Clean Skincare', subCategory: 'skincare', title: 'Kumkumadi' },
    activeChip
  );

  const fallbackMatchCount =
    (showFallbackProd1 ? 1 : 0) +
    (showFallbackProd2 ? 1 : 0) +
    (showFallbackProd3 ? 1 : 0) +
    (showFallbackProd4 ? 1 : 0);

  const handleFilterChipClick = (chip: string) => {
    setActiveChip(chip);
    const count =
      featuredProducts.length > 0
        ? featuredProducts.filter((p) => matchesCategory(p, chip)).length
        : (matchesCategory({ id: 'prod-1', category: 'Audio & Wearables', subCategory: 'audio', title: 'Apex Pro' }, chip) ? 1 : 0) +
          (matchesCategory({ id: 'prod-2', category: 'Fashion', subCategory: 'ethnic', title: 'Kurta' }, chip) ? 1 : 0) +
          (matchesCategory({ id: 'prod-3', category: 'Audio & Wearables', subCategory: 'smartwatch', title: 'Smartwatch' }, chip) ? 1 : 0) +
          (matchesCategory({ id: 'prod-4', category: 'Clean Skincare', subCategory: 'skincare', title: 'Kumkumadi' }, chip) ? 1 : 0);

    if (count > 0) {
      showToast(
        chip === 'Top Curated'
          ? `Showing all curated products (${count})`
          : `Filtered by: ${chip} (${count} product${count > 1 ? 's' : ''})`,
        'tune'
      );
    }
  };

  const handleAddToCart = (product: {
    id: string;
    title: string;
    brand: string;
    price: number;
    originalPrice: number;
    image: string;
    vendorName?: string;
  }) => {
    addItem({
      id: `${product.id}-${Date.now()}`,
      productId: product.id,
      title: product.title,
      brand: product.brand,
      variantId: `var-${product.id}`,
      size: selectedSizes[product.id] || 'Standard',
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      vendorName: product.vendorName || 'Vyntra Direct',
    });

    setAddedItems((prev) => ({ ...prev, [product.id]: true }));
    showToast(`${product.title} added to your Bag!`);
    setTimeout(() => {
      setAddedItems((prev) => ({ ...prev, [product.id]: false }));
    }, 1800);
  };

  // 8. Copy coupon code handler
  const handleCopyCoupon = (code: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
    showToast(`Coupon code ${code} copied to clipboard!`, 'content_copy');
  };

  return (
    <div className="w-full flex flex-col bg-surface overflow-x-hidden">
      {/* ======================================================== */}
      {/* 1. EDITORIAL HERO SECTION */}
      {/* ======================================================== */}
      <section className="relative w-full max-w-[1360px] mx-auto px-4 lg:px-10 pt-4 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Column: Editorial Statement */}
          <div className="lg:col-span-7 flex flex-col justify-between bg-surface-container-low rounded-xl p-6 lg:p-10 relative overflow-hidden shadow-sm border border-outline-variant/40 hover:shadow-md transition-shadow duration-300">
            <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
            <div className="absolute -left-20 -bottom-20 w-72 h-72 rounded-full bg-secondary-container/15 blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 bg-surface-container-lowest px-3 py-1 rounded-full shadow-sm mb-4 border border-outline-variant/30 hover:border-primary/40 transition-colors">
                <span className="w-2 h-2 rounded-full bg-secondary-container animate-pulse" />
                <span className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold font-sans">
                  New Season Discovery 2025
                </span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-[56px] text-on-surface tracking-tight leading-[1.05] max-w-xl font-extrabold">
                Discover More. <br />
                <span className="text-[#007185] italic font-normal">Live Better.</span>
              </h1>

              <p className="text-base lg:text-lg text-on-surface-variant mt-4 max-w-lg leading-relaxed font-body">
                Your everyday essentials, latest trends, and extraordinary finds — handpicked with quiet luxury and honest Indian craft, all in one seamless universe.
              </p>
            </div>

            <div className="relative z-10 pt-8 space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="#trending-section"
                  className="inline-flex items-center gap-2 bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] border border-[#FCD200] text-sm font-bold px-6 py-3 rounded-md shadow-sm transition-all duration-150 hover:-translate-y-0.5 active:scale-95 group"
                >
                  <span>Explore VYNTRA</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </a>

                <a
                  href="#lifestyles"
                  className="inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFA] text-[#0F1111] text-sm font-semibold px-6 py-3 rounded-md shadow-sm transition-all duration-150 border border-[#D5D9D9] active:scale-95"
                >
                  <Zap className="h-4 w-4 text-[#FF9900]" />
                  <span>Shop What&apos;s Trending</span>
                </a>
              </div>

              {/* Trust & Proof Points */}
              <div className="pt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-surface-container-lowest p-3 rounded-lg shadow-sm flex items-center gap-2.5 border border-outline-variant/30 hover:border-outline-variant/80 hover:-translate-y-0.5 transition-all duration-200">
                  <Star className="h-5 w-5 text-secondary-container fill-secondary-container shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-on-surface">4.9 / 5.0</span>
                    <span className="text-[10px] text-on-surface-variant font-medium">
                      100k+ Indian Buyers
                    </span>
                  </div>
                </div>

                <div className="bg-surface-container-lowest p-3 rounded-lg shadow-sm flex items-center gap-2.5 border border-outline-variant/30 hover:border-outline-variant/80 hover:-translate-y-0.5 transition-all duration-200">
                  <Zap className="h-5 w-5 text-[#B45309] shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-on-surface">Same-Day Metro</span>
                    <span className="text-[10px] text-on-surface-variant font-medium">
                      12 Cities in India
                    </span>
                  </div>
                </div>

                <div className="bg-surface-container-lowest p-3 rounded-lg shadow-sm col-span-2 sm:col-span-1 flex items-center gap-2.5 border border-outline-variant/30 hover:border-outline-variant/80 hover:-translate-y-0.5 transition-all duration-200">
                  <ShieldCheck className="h-5 w-5 text-secondary-container shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-on-surface">100% Genuine</span>
                    <span className="text-[10px] text-on-surface-variant font-medium">
                      Zero-Counterfeit
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Composition with Dynamic Tag Pills */}
          <div className="lg:col-span-5 relative min-h-[460px] rounded-xl overflow-hidden shadow-sm group border border-outline-variant/30">
            <div
              className="w-full h-full bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuATya0XrGZz-BrcZxqlky_dh8-3eLgms9yn99t6R4qTSkg0Z36m5J6zTzrIkkwk_trr3XhmEF7vg3lwuJoBAFw0LGAJ87ctHUyFXxixsa3obRG_-731YH7krSyypXgog6i9dCZO_qIGY0QMHo1u205Oa21CoqZoBDKAOzlWGxDEDQx9HOmXkEufGxjknXHhK2jbWV3Y3PVwgs5YLhyLxKP1HIvS76rQ9AQjtUQzW_k')",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/75 via-transparent to-transparent pointer-events-none" />

            {/* Floating Tag Pill 1: Kurta */}
            <div
              onClick={() => {
                handleAddToCart({
                  id: 'hero-kurta',
                  title: 'Raw Organic Linen Handcrafted Kurta',
                  brand: 'Vyntra Artisan Edit',
                  price: 1899,
                  originalPrice: 3499,
                  image:
                    'https://lh3.googleusercontent.com/aida-public/AB6AXuATya0XrGZz-BrcZxqlky_dh8-3eLgms9yn99t6R4qTSkg0Z36m5J6zTzrIkkwk_trr3XhmEF7vg3lwuJoBAFw0LGAJ87ctHUyFXxixsa3obRG_-731YH7krSyypXgog6i9dCZO_qIGY0QMHo1u205Oa21CoqZoBDKAOzlWGxDEDQx9HOmXkEufGxjknXHhK2jbWV3Y3PVwgs5YLhyLxKP1HIvS76rQ9AQjtUQzW_k',
                  vendorName: 'Jaipur Textile Collective',
                });
              }}
              className="animate-float-slow absolute top-10 left-6 bg-surface-container-lowest/95 backdrop-blur-md px-4 py-2 rounded-xl shadow-xl flex items-center gap-3 border border-outline-variant/30 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-secondary-container" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wide text-on-surface-variant font-bold font-sans">
                  Raw Organic Linen
                </span>
                <span className="text-sm font-bold text-on-surface font-headline">
                  Handcrafted Kurta ₹1,899
                </span>
              </div>
            </div>

            {/* Floating Tag Pill 2: Headphones */}
            <div
              onClick={() => {
                handleAddToCart({
                  id: 'hero-headphones',
                  title: 'ANC Apex Pro High-Fidelity Wireless Headphones',
                  brand: 'Kinetix Audio',
                  price: 4499,
                  originalPrice: 8999,
                  image:
                    'https://lh3.googleusercontent.com/aida-public/AB6AXuDP2xrfkhe3LslFL7nC-6jsMKgIBZJSi-4_YvbfkNyliZrvns1v5FUwsuuhKAMXBY5OV9UfvBkdsKtFi7Ajg8d6MwS-xLQHMsZvy8WYYdOIIthV5b1UzfIH6PwCMM3dPiSEVo1Gfxr9WYO1yMc2NkFx3PphQf_R_dlrgGjwMTvCh5gDwI8cGuaN3cmQsAetPcWcBtT8WbMgDph4DmP9I5fdHEXP8zIe9f4UlTX-h6U',
                  vendorName: 'Apex Electronics Hub',
                });
              }}
              className="animate-float-alt absolute bottom-16 right-6 bg-surface-container-lowest/95 backdrop-blur-md px-4 py-2 rounded-xl shadow-xl flex items-center gap-3 border border-outline-variant/30 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center text-primary-container">
                <Headphones className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-secondary font-bold font-sans">
                  50% Drop Today
                </span>
                <span className="text-sm font-bold text-on-surface font-headline">
                  ANC Apex Pro ₹4,499
                </span>
              </div>
            </div>

            <div className="absolute bottom-4 left-6 text-white text-[10px] uppercase tracking-widest opacity-80 pointer-events-none font-semibold">
              Curated Catalog No. 04 / India Edit
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. CATEGORY DISCOVERY (8 Visual Rich Cards) */}
      {/* ======================================================== */}
      <section className="reveal-on-scroll w-full max-w-[1360px] mx-auto px-4 lg:px-10 py-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-2">
          <div>
            <div className="flex items-center gap-1.5 text-accent text-xs uppercase tracking-wider font-bold mb-1">
              <Layers className="h-4 w-4" />
              <span>Curated Universes</span>
            </div>
            <h2 className="font-headline text-2xl lg:text-3xl font-bold text-on-surface">
              Shop by Category
            </h2>
          </div>
          <p className="text-sm text-on-surface-variant max-w-md">
            Carefully structured lifestyle taxonomy. From homegrown handloom fabrics to international high-fidelity audio engineering.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            {
              title: 'Fashion',
              count: '4,200+ Styles',
              badge: 'Hot',
              badgeColor: 'bg-secondary-container text-white',
              img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA8iQpBPtg9CP3HCP1xiRGSBD8Hknx2pWfMnPD-36uOh73o4fcM_5rENIxQAhQFvGSKUOrDI25zFr5C3Q-SlOJ5ow0TkRk8wW_06kPiXI2K2MVmAkAw93dXYLL5kjUb-aMlRKPNZYByXIKL_QreE9YFeb5G-w6sDntkqfMsNaK3KW9aijqtAylRh3CXWwqwHeVcbaNj4sGxGQDHk7gesiVqhlue_YJ9QQA25HGrVKU',
              href: '/category/fashion',
            },
            {
              title: 'Electronics',
              count: '1.8k+ Items',
              badge: 'Pro Tech',
              badgeColor: 'bg-primary text-[#0F1111] font-bold',
              img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDP2xrfkhe3LslFL7nC-6jsMKgIBZJSi-4_YvbfkNyliZrvns1v5FUwsuuhKAMXBY5OV9UfvBkdsKtFi7Ajg8d6MwS-xLQHMsZvy8WYYdOIIthV5b1UzfIH6PwCMM3dPiSEVo1Gfxr9WYO1yMc2NkFx3PphQf_R_dlrgGjwMTvCh5gDwI8cGuaN3cmQsAetPcWcBtT8WbMgDph4DmP9I5fdHEXP8zIe9f4UlTX-h6U',
              href: '/category/electronics',
            },
            {
              title: 'Beauty',
              count: '950+ Pure SKUs',
              badge: 'Clean',
              badgeColor: 'bg-tertiary-fixed text-on-tertiary-fixed font-bold',
              img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC_mVrsUOrivjmiHAl1miF4XiYJXrJPG18FC35-7zl927u_uK1ApTMFXYhBettbCK_g2uX8b4X_0fSSsrwFdNblhIus8UK3n-m6PD5x4LqA4MqeFgh2JDR16ZnLu8v34YY0oB8aDHVgbNXwIhFKUxnXF-EeRw9ml6bJJXc3A87sGmUNsKaRMXX9F-AUaG0wxOE8Q-vCMuVUtOQH9vEC8pAwfV6BTEWBdUvBHjPhmTg',
              href: '/category/beauty',
            },
            {
              title: 'Home & Living',
              count: '2,100+ Pieces',
              img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuABb7WY__T1HheiyMbHVePBxBNq9jsG530Vj9pNiBwP-9Z375iicRbI905SlyJCGPEiqzKZmPAJ-f_nu4E0Vl0Cb0W83NxUO_EUclyy0YkLSxJnZWWcfTa2KLN6ll4TNI1b07NVMaj0L9GrAclS8y_EImKqCJiKpF8A0I-j_uysj2yC7eIdDdem5T5POMf-IGSe8TaxE6scX-QjELVZtSJ5pdiJGQTfm3_ZtJesEzU',
              href: '/category/home-living',
            },
            {
              title: 'Footwear',
              count: '1,400+ Pairs',
              img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCcLN5Rnogwa-sL_Kzp6dnV7Q88Kf6Qm14L2JNbOcwAEuIr0jofWNkHhMLhosJdTqmAeGxd0msmn080lY7uweNaBv8D4tb-4Qd3IY0maNObRkDISqKq28eYPxchUq15KZGhFFzd0T_WdWpwTXN9tyG5ftIE2sFcw9l4L8YkAGn9NHDzHDseKov5YkTIV2mqoe8zGrWWAfASNEDKwvMlIDal-YhcyCggtyaEPIZz2zA',
              href: '/category/footwear',
            },
            {
              title: 'Accessories',
              count: '3,600+ Items',
              img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBAEqgIYkgMOZzKBnaRRGuV8St84lMc2zSCEevf4HdV7QmCdXFpedOY0y-_8JVA37M9Mrl3DLeJQitO92ybOvMvomSwjAaws99phvd1hmnC4TRGg4UZ6TFrs2XXZJgs3JCRsaX5D8sVK9bQRF4f1weSZiFpT9XjjcXKD_OCmRmR5VO6MAqoLJKxVfa5h36IYaVGztrVQkkAQ8asZwKU-UzDaIHOsF_-DjdTJrfRoVg',
              href: '/category/accessories',
            },
            {
              title: 'Fitness',
              count: '800+ Equips',
              img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC2AiomLFP7eNqU0kbVqu9_1KjTzShdQthQfR5uJXWbCREN0jHpLs0qehZubl-__61PT2Fv5Jf1-NrsKqOqZaxDayjEvKFjM3Pl2irr3HpzsMP-P8tcNCELWjEWMIC8-xnUJsAd8p7HGEua2vHKA4K54yQTgfQ3BXU5xRre-mi-qDmO2V5tAKIiQBSO4GCQhtElKIrbtRUQSwqoP9JFm-cql1XXz5Ayja7Lz1a766g',
              href: '/category/fitness',
            },
            {
              title: 'Essentials',
              count: '1,250+ Drops',
              img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAPSJrnePiY5oRVRC_DDYwuG2Fwhk32Uni7uYNSIfg8jJuBfCdPFECdluqA0dT_6qjtyUuzxtMUSYlcqeTA3J_mkb-i-TmjsA8xGlB4-LhZnwaCeT9jc5BCEnIcCJeG-saVv-dc366qQTJGkv2nI5uuZkmdu1BuQUYtHQFtnwtSf0lY4sUDltMOHFPC9MTYsoddhbFcEMUo5pN2EzBi7OeyxQnrCD0HjkIVpvFkFwI',
              href: '/category/essentials',
            },
          ].map((cat) => (
            <Link
              key={cat.title}
              href={cat.href}
              prefetch={true}
              className="group flex flex-col bg-surface-container-low hover:bg-surface-container rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] border border-outline-variant/40 hover:border-primary/40 cursor-pointer"
            >
              <div className="relative h-28 w-full bg-surface-container-high overflow-hidden">
                <div
                  className="w-full h-full bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-110"
                  style={{ backgroundImage: `url('${cat.img}')` }}
                />
                {cat.badge && (
                  <span
                    className={`absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm ${cat.badgeColor}`}
                  >
                    {cat.badge}
                  </span>
                )}
              </div>
              <div className="p-3 text-center">
                <h3 className="text-sm font-bold text-on-surface group-hover:text-accent transition-colors">
                  {cat.title}
                </h3>
                <span className="text-[10px] text-on-surface-variant font-medium">
                  {cat.count}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. FLASH SALE & LIGHTNING DEALS (Interactive Ticker) */}
      {/* ======================================================== */}
      <section
        className="reveal-on-scroll w-full max-w-[1360px] mx-auto px-4 lg:px-10 py-8"
        id="lightning-deals-section"
      >
        <div className="bg-surface-container-low rounded-xl p-6 lg:p-10 shadow-sm relative overflow-hidden border border-outline-variant/40 hover:border-secondary-container/40 transition-all duration-300">
          <div className="absolute right-0 top-0 w-96 h-96 bg-secondary-container/15 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-4 border-b-0 relative z-10">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="shimmer-badge flex items-center gap-1 bg-secondary-container text-white px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider shadow-sm cursor-pointer">
                <Flame className="h-4 w-4 animate-pulse" />
                Lightning Deals
              </span>
              <h2 className="font-headline text-xl lg:text-2xl font-bold text-on-surface">
                Steals Ending Shortly
              </h2>
            </div>

            {/* Live Countdown Ticker */}
            <FlashDealCountdown />
          </div>

          {/* Deals Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
            {/* Deal 1 */}
            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-outline-variant/30 hover:border-secondary-container/50 group">
              <div className="flex gap-4">
                <div className="w-24 h-24 rounded-lg bg-surface-container-low shrink-0 overflow-hidden relative">
                  <div
                    className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                    style={{
                      backgroundImage:
                        "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCR7AJClTZ5JGCTNkMdU5HU_Ho57T8ypyVNS9sFkndsjs0HI9G3b316gQ73lkXGbjxDXQWnceIA26xc-_Fk6xB41ZfAvLeP6sYwy4GIXdzMuMIpHaLJYC2ufXTlHi8jY8-E23p0h6a2DCi5HLoqu2Uo4Jh-9ELQIBf-SqLHZ2-6M2I8_vuEdaqiOk3c1tiSNUduWnSCCeP6LPkDBQk6dKvDKm_rzJHrXAT_nF7Nzho')",
                    }}
                  />
                  <span className="absolute top-1 left-1 bg-secondary-container text-white text-[10px] font-bold px-1 rounded shadow-sm">
                    -60%
                  </span>
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[10px] text-on-surface-variant uppercase font-bold">
                    Kinetix Pulse 3
                  </span>
                  <h4 className="text-sm font-bold text-on-surface truncate group-hover:text-accent transition-colors">
                    Ultra-Slim GPS Fitness Tracker
                  </h4>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-sm font-extrabold text-on-surface font-mono">
                      ₹1,599
                    </span>
                    <span className="text-xs text-outline line-through font-mono">
                      ₹3,999
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex justify-between items-center text-[10px] mb-1.5">
                  <span className="text-secondary font-bold flex items-center gap-0.5">
                    <Zap className="h-3 w-3" /> Only 4 Units Left
                  </span>
                  <span className="text-on-surface-variant font-medium">88% Claimed</span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                  <div
                    className="h-full bg-secondary-container rounded-full transition-all duration-500"
                    style={{ width: '88%' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleAddToCart({
                      id: 'deal-1',
                      title: 'Ultra-Slim GPS Fitness Tracker',
                      brand: 'Kinetix Pulse',
                      price: 1599,
                      originalPrice: 3999,
                      image:
                        'https://lh3.googleusercontent.com/aida-public/AB6AXuCR7AJClTZ5JGCTNkMdU5HU_Ho57T8ypyVNS9sFkndsjs0HI9G3b316gQ73lkXGbjxDXQWnceIA26xc-_Fk6xB41ZfAvLeP6sYwy4GIXdzMuMIpHaLJYC2ufXTlHi8jY8-E23p0h6a2DCi5HLoqu2Uo4Jh-9ELQIBf-SqLHZ2-6M2I8_vuEdaqiOk3c1tiSNUduWnSCCeP6LPkDBQk6dKvDKm_rzJHrXAT_nF7Nzho',
                      vendorName: 'Kinetix Labs',
                    })
                  }
                  className="w-full mt-3 bg-secondary-container hover:bg-secondary text-white text-xs py-2.5 rounded-lg font-bold shadow-sm transition-all duration-200 active:scale-95 flex items-center justify-center gap-1 hover:shadow-md"
                >
                  <Zap className="h-4 w-4" />
                  <span>
                    {addedItems['deal-1'] ? 'Claimed ✓' : 'Claim Lightning Deal'}
                  </span>
                </button>
              </div>
            </div>

            {/* Deal 2 */}
            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-outline-variant/30 hover:border-secondary-container/50 group">
              <div className="flex gap-4">
                <div className="w-24 h-24 rounded-lg bg-surface-container-low shrink-0 overflow-hidden relative">
                  <div
                    className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                    style={{
                      backgroundImage:
                        "url('https://lh3.googleusercontent.com/aida-public/AB6AXuC7P80ElBO5FxwOYVyGnQtzb4STZYEIb8lqOMjI0rWxaShLe5JuWWQDrZEXhWJ3fJmJWKBhNO8f6DQs0to2vZ9r_B-zXRSedc7WCuiuTyXQwWgQMEtDtEHGjBdcL1bEOFWf6RKVPCXcNGCFN3X7FB6g74yvDhML7pnVLdlE2E-VYx4dyUwUJYdDmZNRmA8aCtQdVgHOnzd-bJvWPkwZNX9zQGGBLrZUbtrYwDjmQzc')",
                    }}
                  />
                  <span className="absolute top-1 left-1 bg-secondary-container text-white text-[10px] font-bold px-1 rounded shadow-sm">
                    -50%
                  </span>
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[10px] text-on-surface-variant uppercase font-bold">
                    Forest Nectar
                  </span>
                  <h4 className="text-sm font-bold text-on-surface truncate group-hover:text-accent transition-colors">
                    Glow Kumkumadi Oil (30ml)
                  </h4>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-sm font-extrabold text-on-surface font-mono">
                      ₹1,299
                    </span>
                    <span className="text-xs text-outline line-through font-mono">
                      ₹2,599
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex justify-between items-center text-[10px] mb-1.5">
                  <span className="text-secondary font-bold flex items-center gap-0.5">
                    <Truck className="h-3 w-3" /> Express Dispatched
                  </span>
                  <span className="text-on-surface-variant font-medium">72% Claimed</span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                  <div
                    className="h-full bg-secondary-container rounded-full transition-all duration-500"
                    style={{ width: '72%' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleAddToCart({
                      id: 'deal-2',
                      title: 'Glow Kumkumadi Oil (30ml)',
                      brand: 'Forest Nectar',
                      price: 1299,
                      originalPrice: 2599,
                      image:
                        'https://lh3.googleusercontent.com/aida-public/AB6AXuC7P80ElBO5FxwOYVyGnQtzb4STZYEIb8lqOMjI0rWxaShLe5JuWWQDrZEXhWJ3fJmJWKBhNO8f6DQs0to2vZ9r_B-zXRSedc7WCuiuTyXQwWgQMEtDtEHGjBdcL1bEOFWf6RKVPCXcNGCFN3X7FB6g74yvDhML7pnVLdlE2E-VYx4dyUwUJYdDmZNRmA8aCtQdVgHOnzd-bJvWPkwZNX9zQGGBLrZUbtrYwDjmQzc',
                      vendorName: 'Pure Ayurveda Collective',
                    })
                  }
                  className="w-full mt-3 bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] border border-[#FCD200] text-[14px] py-[5px] px-[11px] h-[31px] rounded-full font-normal shadow-sm transition-all duration-150 active:scale-95 flex items-center justify-center"
                >
                  <span>
                    {addedItems['deal-2'] ? 'Added ✓' : 'Add to cart'}
                  </span>
                </button>
              </div>
            </div>

            {/* Deal 3 */}
            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-outline-variant/30 hover:border-secondary-container/50 group">
              <div className="flex gap-4">
                <div className="w-24 h-24 rounded-lg bg-surface-container-low shrink-0 overflow-hidden relative">
                  <div
                    className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                    style={{
                      backgroundImage:
                        "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCZ3-0drvQIJ255qXJvWQtPaFSjxjBlR_LRHSEQv-TYTZUEdgu4ujQWU-rilV5nR3JOMC3K4dRxjcMBDhVxk1y5LmTvwZ4xBd5dJiWbi0c4bAmzf8RVWQS6uuXgzfp-QSdRd2Hgf1no4284INWvWAxEkIEz8XFsWInm5yOmOhnRNdJIZFLDbqFE092mKNpxUybJxCc4R_4dK2tU1_gMtL_krnnZAKNC-z7vKPa3TuQ')",
                    }}
                  />
                  <span className="absolute top-1 left-1 bg-secondary-container text-white text-[10px] font-bold px-1 rounded shadow-sm">
                    -45%
                  </span>
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[10px] text-on-surface-variant uppercase font-bold">
                    Kala Living
                  </span>
                  <h4 className="text-sm font-bold text-on-surface truncate group-hover:text-accent transition-colors">
                    Teakwood 15W Fast Pad
                  </h4>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-sm font-extrabold text-on-surface font-mono">
                      ₹1,850
                    </span>
                    <span className="text-xs text-outline line-through font-mono">
                      ₹3,400
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex justify-between items-center text-[10px] mb-1.5">
                  <span className="text-secondary font-bold flex items-center gap-0.5">
                    <Zap className="h-3 w-3" /> 9 Left at this price
                  </span>
                  <span className="text-on-surface-variant font-medium">64% Claimed</span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                  <div
                    className="h-full bg-secondary-container rounded-full transition-all duration-500"
                    style={{ width: '64%' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleAddToCart({
                      id: 'deal-3',
                      title: 'Teakwood 15W Fast Pad',
                      brand: 'Kala Living',
                      price: 1850,
                      originalPrice: 3400,
                      image:
                        'https://lh3.googleusercontent.com/aida-public/AB6AXuCZ3-0drvQIJ255qXJvWQtPaFSjxjBlR_LRHSEQv-TYTZUEdgu4ujQWU-rilV5nR3JOMC3K4dRxjcMBDhVxk1y5LmTvwZ4xBd5dJiWbi0c4bAmzf8RVWQS6uuXgzfp-QSdRd2Hgf1no4284INWvWAxEkIEz8XFsWInm5yOmOhnRNdJIZFLDbqFE092mKNpxUybJxCc4R_4dK2tU1_gMtL_krnnZAKNC-z7vKPa3TuQ',
                      vendorName: 'Kala Studio Bengaluru',
                    })
                  }
                  className="w-full mt-3 bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] border border-[#FCD200] text-[14px] py-[5px] px-[11px] h-[31px] rounded-full font-normal shadow-sm transition-all duration-150 active:scale-95 flex items-center justify-center"
                >
                  <span>
                    {addedItems['deal-3'] ? 'Added ✓' : 'Add to cart'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. TRENDING PRODUCTS GRID (4 Detailed Product Cards) */}
      {/* ======================================================== */}
      <section
        className="reveal-on-scroll w-full max-w-[1360px] mx-auto px-4 lg:px-10 py-10"
        id="trending-section"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-accent text-xs uppercase tracking-wider font-bold mb-1">
              <Zap className="h-4 w-4" />
              <span>Verified Bestsellers</span>
            </div>
            <h2 className="font-headline text-2xl lg:text-3xl font-bold text-on-surface">
              Trending on VYNTRA Right Now
            </h2>
          </div>

          {/* Interactive Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {['Top Curated', 'Fashion', 'Audio & Wearables', 'Clean Skincare'].map(
              (chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleFilterChipClick(chip)}
                  className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 active:scale-95 ${
                    activeChip === chip
                      ? 'bg-[#FFD814] text-[#0F1111] shadow-sm'
                      : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {chip}
                </button>
              )
            )}
          </div>
        </div>

        {/* 4-Column Product Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.length > 0 ? (
            displayedDynamicProducts.length > 0 ? (
              displayedDynamicProducts.slice(0, 4).map((prod) => {
              const isFavorited = wishlist[prod.id];
              const isJustAdded = addedItems[prod.id];
              return (
                <div
                  key={prod.id}
                  className="group flex flex-col bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 border border-outline-variant/30 hover:border-primary/40"
                >
                  <div className="relative w-full aspect-[3/4] bg-surface-container-low overflow-hidden">
                    <Link
                      href={`/products/${prod.slug || 'handcrafted-premium-linen-kurta'}`}
                      className="block w-full h-full"
                    >
                      <div
                        className="w-full h-full bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-105"
                        style={{
                          backgroundImage: `url('${prod.image}')`,
                        }}
                      />
                    </Link>
                    <div className="absolute top-3 left-3 flex flex-col gap-1 pointer-events-none">
                      {prod.discount && (
                        <span className="bg-secondary-container text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider shadow-sm">
                          {prod.discount}
                        </span>
                      )}
                      {prod.badge && (
                        <span className="bg-primary-fixed text-[#0F1111] text-[10px] px-2 py-0.5 rounded font-bold uppercase">
                          {prod.badge}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleWishlist(prod.id, prod.title)}
                      className={`absolute top-3 right-3 w-8 h-8 rounded-full bg-surface-container-lowest/80 backdrop-blur-md flex items-center justify-center transition-all duration-200 shadow-sm active:scale-125 ${
                        isFavorited
                          ? 'text-secondary-container'
                          : 'text-on-surface-variant hover:text-secondary-container'
                      }`}
                      title="Wishlist toggle"
                    >
                      <Heart
                        className="h-4 w-4"
                        fill={isFavorited ? 'currentColor' : 'none'}
                      />
                    </button>
                  </div>

                  <div className="p-4 flex flex-col flex-1 justify-between">
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-on-surface-variant mb-1">
                        <span className="uppercase font-semibold tracking-wider">
                          {prod.brand}
                        </span>
                        <div className="flex items-center gap-0.5 text-on-surface font-bold">
                          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                          <span>{prod.rating || 4.8}</span>
                          <span className="text-outline font-normal">
                            ({prod.reviewCount || 120})
                          </span>
                        </div>
                      </div>
                      <Link href={`/products/${prod.slug || 'handcrafted-premium-linen-kurta'}`}>
                        <h3 className="font-headline text-sm font-bold text-on-surface line-clamp-2 leading-snug group-hover:text-accent transition-colors">
                          {prod.title}
                        </h3>
                      </Link>
                    </div>

                    <div className="pt-4">
                      <div className="flex items-baseline gap-2">
                        <span className="text-base font-extrabold text-on-surface font-mono">
                          ₹{prod.price?.toLocaleString('en-IN')}
                        </span>
                        {prod.originalPrice > prod.price && (
                          <span className="text-xs text-outline line-through font-mono">
                            ₹{prod.originalPrice?.toLocaleString('en-IN')}
                          </span>
                        )}
                        {prod.originalPrice > prod.price && (
                          <span className="text-[11px] text-secondary font-bold">
                            Save ₹{(prod.originalPrice - prod.price)?.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-1">
                        <span className="bg-tertiary-fixed text-on-tertiary-fixed text-[10px] px-1.5 py-0.5 rounded font-semibold">
                          Next Day Free Delivery
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleAddToCart({
                            id: prod.id,
                            title: prod.title,
                            brand: prod.brand,
                            price: prod.price,
                            originalPrice: prod.originalPrice,
                            image: prod.image,
                            vendorName: prod.vendor?.name || prod.brand,
                          })
                        }
                        className="w-full mt-3 bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] border border-[#FCD200] text-[14px] py-[5px] px-[11px] h-[31px] rounded-full font-normal shadow-sm transition-all duration-150 active:scale-95 flex items-center justify-center"
                      >
                        <span>{isJustAdded ? 'Added ✓' : 'Add to cart'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-12 px-4 flex flex-col items-center justify-center text-center bg-surface-container-low rounded-xl border border-outline-variant/30">
              <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant mb-3">
                <Sparkles className="h-6 w-6 text-on-surface-variant" />
              </div>
              <h3 className="font-headline text-base sm:text-lg font-bold text-on-surface mb-1">
                No products found in {activeChip}
              </h3>
              <p className="text-xs sm:text-sm text-on-surface-variant max-w-md mb-4">
                We couldn&apos;t find any items matching this category right now.
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveChip('Top Curated');
                  showToast('Showing all curated products', 'tune');
                }}
                className="px-4 py-2 bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] border border-[#FCD200] rounded-full text-xs font-bold transition-all active:scale-95 shadow-sm"
              >
                Reset to Top Curated
              </button>
            </div>
          )
        ) : fallbackMatchCount > 0 ? (
          <>
            {/* Product 1 */}
            {showFallbackProd1 && (
              <div className="group flex flex-col bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 border border-outline-variant/30 hover:border-primary/40">
            <div className="relative w-full aspect-[3/4] bg-surface-container-low overflow-hidden">
              <div
                className="w-full h-full bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-105"
                style={{
                  backgroundImage:
                    "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCO_0SBO4wOQpdfwdVNjScqbXfcFC8rAK84vqhKjzYAk-Cww2JAVIFrYoR9ziwNF0KHgWpjj69cb-c3f8JqO2Xn343pnxdvDfo_7AhNhze0kgPUl501f4OzAOrjzZeCSudYgSPV2-u28Y2kvYhZjQGBTgOJzQaLUZj-aNVuBhkULhZ24WoMEGiHUJrPotT8IrsDD00yosG4Yz6ykMTis921nXuR-8TlPqmB8THSxFw')",
                }}
              />
              <div className="absolute top-3 left-3 flex flex-col gap-1">
                <span className="bg-secondary-container text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider shadow-sm">
                  50% OFF
                </span>
                <span className="bg-primary-fixed text-[#0F1111] text-[10px] px-2 py-0.5 rounded font-bold uppercase">
                  Bestseller
                </span>
              </div>
              <button
                type="button"
                onClick={() => toggleWishlist('prod-1', 'Apex Pro Wireless Headphones')}
                className={`absolute top-3 right-3 w-8 h-8 rounded-full bg-surface-container-lowest/80 backdrop-blur-md flex items-center justify-center transition-all duration-200 shadow-sm active:scale-125 ${
                  wishlist['prod-1']
                    ? 'text-secondary-container'
                    : 'text-on-surface-variant hover:text-secondary-container'
                }`}
                title="Wishlist toggle"
              >
                <Heart
                  className="h-4 w-4"
                  fill={wishlist['prod-1'] ? 'currentColor' : 'none'}
                />
              </button>
            </div>

            <div className="p-4 flex flex-col flex-1 justify-between">
              <div>
                <div className="flex items-center justify-between text-[11px] text-on-surface-variant mb-1">
                  <span className="uppercase font-semibold tracking-wider">
                    Sonorous Audio
                  </span>
                  <div className="flex items-center gap-0.5 text-on-surface font-bold">
                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                    <span>4.8</span>
                    <span className="text-outline font-normal">(1,240)</span>
                  </div>
                </div>
                <h3 className="font-headline text-sm font-bold text-on-surface line-clamp-2 leading-snug group-hover:text-accent transition-colors">
                  Apex Pro Hybrid Noise-Cancelling Wireless Headphones
                </h3>
              </div>

              <div className="pt-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-extrabold text-on-surface font-mono">
                    ₹4,499
                  </span>
                  <span className="text-xs text-outline line-through font-mono">
                    ₹8,999
                  </span>
                  <span className="text-[11px] text-secondary font-bold">
                    Save ₹4,500
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1">
                  <span className="bg-tertiary-fixed text-on-tertiary-fixed text-[10px] px-1.5 py-0.5 rounded font-semibold">
                    Next Day Free Delivery
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleAddToCart({
                      id: 'prod-1',
                      title: 'Apex Pro Hybrid Noise-Cancelling Headphones',
                      brand: 'Sonorous Audio',
                      price: 4499,
                      originalPrice: 8999,
                      image:
                        'https://lh3.googleusercontent.com/aida-public/AB6AXuCO_0SBO4wOQpdfwdVNjScqbXfcFC8rAK84vqhKjzYAk-Cww2JAVIFrYoR9ziwNF0KHgWpjj69cb-c3f8JqO2Xn343pnxdvDfo_7AhNhze0kgPUl501f4OzAOrjzZeCSudYgSPV2-u28Y2kvYhZjQGBTgOJzQaLUZj-aNVuBhkULhZ24WoMEGiHUJrPotT8IrsDD00yosG4Yz6ykMTis921nXuR-8TlPqmB8THSxFw',
                      vendorName: 'Sonorous Flagship Store',
                    })
                  }
                  className="w-full mt-3 bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] border border-[#FCD200] text-[14px] py-[5px] px-[11px] h-[31px] rounded-full font-normal shadow-sm transition-all duration-150 active:scale-95 flex items-center justify-center"
                >
                  <span>
                    {addedItems['prod-1'] ? 'Added ✓' : 'Add to cart'}
                  </span>
                </button>
              </div>
            </div>
          </div>
            )}

            {/* Product 2 (with Size Selectors) */}
            {showFallbackProd2 && (
              <div className="group flex flex-col bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 border border-outline-variant/30 hover:border-primary/40">
            <div className="relative w-full aspect-[3/4] bg-surface-container-low overflow-hidden">
              <div
                className="w-full h-full bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-105"
                style={{
                  backgroundImage:
                    "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAYfuYMHb5ydF4mt44nirF_fmeBBwP6jmLzxYmTutlVJCsds9Y1EVNP5BlhyBoCs66umZuaMKy3F7MXxsZ2KmJUIo1-ajofZf7XUFeKH_2elEMRDfVBTSEALYphlqvLR-CZ7kxP3bvVLm3Y6NOpewj894RGACQrUoU8tmWiYQghW2ceV1rOTkLlkrHDOE1ZINkCZ3ppUVX1udVqwN2Oi1MVqHkjLswJGFgjQs2ofrU')",
                }}
              />
              <div className="absolute top-3 left-3 flex flex-col gap-1">
                <span className="bg-secondary-container text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider shadow-sm">
                  50% OFF
                </span>
                <span className="bg-primary-fixed text-[#0F1111] text-[10px] px-2 py-0.5 rounded font-bold uppercase">
                  Trending
                </span>
              </div>
              <button
                type="button"
                onClick={() => toggleWishlist('prod-2', 'Ethnoc Pure Linen Kurta Set')}
                className={`absolute top-3 right-3 w-8 h-8 rounded-full bg-surface-container-lowest/80 backdrop-blur-md flex items-center justify-center transition-all duration-200 shadow-sm active:scale-125 ${
                  wishlist['prod-2']
                    ? 'text-secondary-container'
                    : 'text-on-surface-variant hover:text-secondary-container'
                }`}
                title="Wishlist toggle"
              >
                <Heart
                  className="h-4 w-4"
                  fill={wishlist['prod-2'] ? 'currentColor' : 'none'}
                />
              </button>
            </div>

            <div className="p-4 flex flex-col flex-1 justify-between">
              <div>
                <div className="flex items-center justify-between text-[11px] text-on-surface-variant mb-1">
                  <span className="uppercase font-semibold tracking-wider">
                    Avanya Studio
                  </span>
                  <div className="flex items-center gap-0.5 text-on-surface font-bold">
                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                    <span>4.6</span>
                    <span className="text-outline font-normal">(950)</span>
                  </div>
                </div>
                <h3 className="font-headline text-sm font-bold text-on-surface line-clamp-2 leading-snug group-hover:text-accent transition-colors">
                  Ethnoc Handcrafted Pure Linen Kurta &amp; Trouser Set
                </h3>

                {/* Size Selector Group */}
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-on-surface-variant font-medium mr-1">
                    Sizes:
                  </span>
                  {['S', 'M', 'L', 'XL'].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() =>
                        setSelectedSizes((prev) => ({ ...prev, 'prod-2': size }))
                      }
                      className={`w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center transition-all ${
                        selectedSizes['prod-2'] === size
                          ? 'bg-[#007185] text-white shadow-sm'
                          : 'bg-surface-container text-on-surface hover:border hover:border-[#007185]'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-extrabold text-on-surface font-mono">
                    ₹1,899
                  </span>
                  <span className="text-xs text-outline line-through font-mono">
                    ₹3,799
                  </span>
                  <span className="text-[11px] text-[#B12704] font-bold">
                    50% Savings
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1">
                  <span className="bg-[#E7F4F5] text-[#007185] text-[10px] px-1.5 py-0.5 rounded font-semibold border border-[#BDE3E8]">
                    100% Khadi Certified
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleAddToCart({
                      id: 'prod-2',
                      title: 'Ethnoc Handcrafted Pure Linen Kurta Set',
                      brand: 'Avanya Studio',
                      price: 1899,
                      originalPrice: 3799,
                      image:
                        'https://lh3.googleusercontent.com/aida-public/AB6AXuAYfuYMHb5ydF4mt44nirF_fmeBBwP6jmLzxYmTutlVJCsds9Y1EVNP5BlhyBoCs66umZuaMKy3F7MXxsZ2KmJUIo1-ajofZf7XUFeKH_2elEMRDfVBTSEALYphlqvLR-CZ7kxP3bvVLm3Y6NOpewj894RGACQrUoU8tmWiYQghW2ceV1rOTkLlkrHDOE1ZINkCZ3ppUVX1udVqwN2Oi1MVqHkjLswJGFgjQs2ofrU',
                      vendorName: 'Jaipur Khadi Weaver Collective',
                    })
                  }
                  className="w-full mt-3 bg-[#FF9900] hover:bg-[#FA8900] text-[#0F1111] border border-[#FF8F00] text-xs py-2.5 rounded-md font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all duration-150 active:scale-95"
                >
                  <Zap className="h-4 w-4" />
                  <span>
                    {addedItems['prod-2'] ? 'Added ✓' : 'Add to Cart'}
                  </span>
                </button>
              </div>
            </div>
          </div>
            )}

            {/* Product 3 */}
            {showFallbackProd3 && (
              <div className="group flex flex-col bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 border border-outline-variant/30 hover:border-primary/40">
            <div className="relative w-full aspect-[3/4] bg-surface-container-low overflow-hidden">
              <div
                className="w-full h-full bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-105"
                style={{
                  backgroundImage:
                    "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBs0APuMtE_djueigXLt6w1IS_X4ks7HalG7w29cGZ4s9LPcq_tySLwqHwWzZY3bckOZ4otgOVlwNWADQ_gEhq5BMExxCohbFijs1uG41KhpdFjv2lmcp6K-kDuDlwTHMQqTGI6jzwKi9qhcPBxcMYaea7ztC1pqkfBW9tmul63Or-5eEt8pYmVtkBjHNQfR4gHtarSIcHoQrBY434MpKIi_AxHqg8mgXtnqTYLd_0')",
                }}
              />
              <div className="absolute top-3 left-3 flex flex-col gap-1">
                <span className="bg-secondary-container text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider shadow-sm">
                  50% OFF
                </span>
                <span className="bg-surface-container-highest text-on-surface text-[10px] px-2 py-0.5 rounded font-bold uppercase">
                  New Gen
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  toggleWishlist('prod-3', 'Series 7 Titanium AMOLED Smartwatch')
                }
                className={`absolute top-3 right-3 w-8 h-8 rounded-full bg-surface-container-lowest/80 backdrop-blur-md flex items-center justify-center transition-all duration-200 shadow-sm active:scale-125 ${
                  wishlist['prod-3']
                    ? 'text-secondary-container'
                    : 'text-on-surface-variant hover:text-secondary-container'
                }`}
                title="Wishlist toggle"
              >
                <Heart
                  className="h-4 w-4"
                  fill={wishlist['prod-3'] ? 'currentColor' : 'none'}
                />
              </button>
            </div>

            <div className="p-4 flex flex-col flex-1 justify-between">
              <div>
                <div className="flex items-center justify-between text-[11px] text-on-surface-variant mb-1">
                  <span className="uppercase font-semibold tracking-wider">
                    Kinetix Labs
                  </span>
                  <div className="flex items-center gap-0.5 text-on-surface font-bold">
                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                    <span>4.7</span>
                    <span className="text-outline font-normal">(410)</span>
                  </div>
                </div>
                <h3 className="font-headline text-sm font-bold text-on-surface line-clamp-2 leading-snug group-hover:text-accent transition-colors">
                  Minimalist Series 7 Titanium AMOLED Smartwatch
                </h3>
              </div>

              <div className="pt-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-extrabold text-on-surface font-mono">
                    ₹2,999
                  </span>
                  <span className="text-xs text-outline line-through font-mono">
                    ₹5,999
                  </span>
                  <span className="text-[11px] text-secondary font-bold">
                    ₹3,000 Off
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1">
                  <span className="bg-tertiary-fixed text-on-tertiary-fixed text-[10px] px-1.5 py-0.5 rounded font-semibold">
                    7-Day Battery Life
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleAddToCart({
                      id: 'prod-3',
                      title: 'Minimalist Series 7 Titanium Smartwatch',
                      brand: 'Kinetix Labs',
                      price: 2999,
                      originalPrice: 5999,
                      image:
                        'https://lh3.googleusercontent.com/aida-public/AB6AXuBs0APuMtE_djueigXLt6w1IS_X4ks7HalG7w29cGZ4s9LPcq_tySLwqHwWzZY3bckOZ4otgOVlwNWADQ_gEhq5BMExxCohbFijs1uG41KhpdFjv2lmcp6K-kDuDlwTHMQqTGI6jzwKi9qhcPBxcMYaea7ztC1pqkfBW9tmul63Or-5eEt8pYmVtkBjHNQfR4gHtarSIcHoQrBY434MpKIi_AxHqg8mgXtnqTYLd_0',
                      vendorName: 'Apex Electronics Hub',
                    })
                  }
                  className="w-full mt-3 bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] border border-[#FCD200] text-[14px] py-[5px] px-[11px] h-[31px] rounded-full font-normal shadow-sm transition-all duration-150 active:scale-95 flex items-center justify-center"
                >
                  <span>
                    {addedItems['prod-3'] ? 'Added ✓' : 'Add to cart'}
                  </span>
                </button>
              </div>
            </div>
          </div>
            )}

            {/* Product 4 */}
            {showFallbackProd4 && (
              <div className="group flex flex-col bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 border border-outline-variant/30 hover:border-primary/40">
            <div className="relative w-full aspect-[3/4] bg-surface-container-low overflow-hidden">
              <div
                className="w-full h-full bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-105"
                style={{
                  backgroundImage:
                    "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCAFcKLHNHwdca7UTjt8qTpgJp-AeqKOjI-3sDPs2wT4WjffGTif59Szgw-aPGqJd1K3BVS17qyu5FtfAqWm0LY-GHjAjuBu35FNzHEc6jcaDrAAgdXupelkqqTN298mtVdN-nTaqJHSKtuNEcKQRybO2gHU80cqfPcc6yXwHnYlAK-OPiSO_MurIT28EoO2zPnsRP7J6RVJoMPSW3XwIwsDehKiHtb4gLoRgxgQOk')",
                }}
              />
              <div className="absolute top-3 left-3 flex flex-col gap-1">
                <span className="bg-secondary-container text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider shadow-sm">
                  50% OFF
                </span>
                <span className="bg-tertiary-fixed text-on-tertiary-fixed text-[10px] px-2 py-0.5 rounded font-bold uppercase">
                  100% Ayurvedic
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  toggleWishlist('prod-4', 'Cold-Pressed Kumkumadi Radiance Elixir')
                }
                className={`absolute top-3 right-3 w-8 h-8 rounded-full bg-surface-container-lowest/80 backdrop-blur-md flex items-center justify-center transition-all duration-200 shadow-sm active:scale-125 ${
                  wishlist['prod-4']
                    ? 'text-secondary-container'
                    : 'text-on-surface-variant hover:text-secondary-container'
                }`}
                title="Wishlist toggle"
              >
                <Heart
                  className="h-4 w-4"
                  fill={wishlist['prod-4'] ? 'currentColor' : 'none'}
                />
              </button>
            </div>

            <div className="p-4 flex flex-col flex-1 justify-between">
              <div>
                <div className="flex items-center justify-between text-[11px] text-on-surface-variant mb-1">
                  <span className="uppercase font-semibold tracking-wider">
                    Forest Nectar
                  </span>
                  <div className="flex items-center gap-0.5 text-on-surface font-bold">
                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                    <span>4.9</span>
                    <span className="text-outline font-normal">(3,120)</span>
                  </div>
                </div>
                <h3 className="font-headline text-sm font-bold text-on-surface line-clamp-2 leading-snug group-hover:text-accent transition-colors">
                  Cold-Pressed Kumkumadi Radiance &amp; Glow Night Elixir
                </h3>
              </div>

              <div className="pt-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-extrabold text-on-surface font-mono">
                    ₹1,299
                  </span>
                  <span className="text-xs text-outline line-through font-mono">
                    ₹2,599
                  </span>
                  <span className="text-[11px] text-secondary font-bold">
                    ₹1,300 Off
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1">
                  <span className="bg-tertiary-fixed text-on-tertiary-fixed text-[10px] px-1.5 py-0.5 rounded font-semibold">
                    Kashmiri Saffron Infused
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleAddToCart({
                      id: 'prod-4',
                      title: 'Cold-Pressed Kumkumadi Radiance Elixir',
                      brand: 'Forest Nectar',
                      price: 1299,
                      originalPrice: 2599,
                      image:
                        'https://lh3.googleusercontent.com/aida-public/AB6AXuCAFcKLHNHwdca7UTjt8qTpgJp-AeqKOjI-3sDPs2wT4WjffGTif59Szgw-aPGqJd1K3BVS17qyu5FtfAqWm0LY-GHjAjuBu35FNzHEc6jcaDrAAgdXupelkqqTN298mtVdN-nTaqJHSKtuNEcKQRybO2gHU80cqfPcc6yXwHnYlAK-OPiSO_MurIT28EoO2zPnsRP7J6RVJoMPSW3XwIwsDehKiHtb4gLoRgxgQOk',
                      vendorName: 'Pure Ayurveda Collective',
                    })
                  }
                  className="w-full mt-3 bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] border border-[#FCD200] text-[14px] py-[5px] px-[11px] h-[31px] rounded-full font-normal shadow-sm transition-all duration-150 active:scale-95 flex items-center justify-center"
                >
                  <span>
                    {addedItems['prod-4'] ? 'Added ✓' : 'Add to cart'}
                  </span>
                </button>
              </div>
            </div>
          </div>
            )}
          </>
        ) : (
          <div className="col-span-full py-12 px-4 flex flex-col items-center justify-center text-center bg-surface-container-low rounded-xl border border-outline-variant/30">
            <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant mb-3">
              <Sparkles className="h-6 w-6 text-on-surface-variant" />
            </div>
            <h3 className="font-headline text-base sm:text-lg font-bold text-on-surface mb-1">
              No products found in {activeChip}
            </h3>
            <p className="text-xs sm:text-sm text-on-surface-variant max-w-md mb-4">
              We couldn&apos;t find any items matching this category right now.
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveChip('Top Curated');
                showToast('Showing all curated products', 'tune');
              }}
              className="px-4 py-2 bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] border border-[#FCD200] rounded-full text-xs font-bold transition-all active:scale-95 shadow-sm"
            >
              Reset to Top Curated
            </button>
          </div>
        )}
      </div>
      </section>

      {/* ======================================================== */}
      {/* 5. FEATURED EDITORIAL CAMPAIGN (VYNTRA Living Edit 2025) */}
      {/* ======================================================== */}
      <section className="reveal-on-scroll w-full max-w-[1360px] mx-auto px-4 lg:px-10 py-10">
        <div className="bg-surface-container-low rounded-xl overflow-hidden shadow-sm grid grid-cols-1 lg:grid-cols-12 items-stretch border border-outline-variant/40 hover:shadow-md transition-shadow duration-300">
          <div className="lg:col-span-6 p-6 lg:p-10 flex flex-col justify-between">
            <div>
              <span className="text-xs text-accent font-bold uppercase tracking-wider block mb-2 font-sans">
                VYNTRA Living Edit 2025
              </span>
              <h2 className="font-display text-3xl sm:text-4xl text-on-surface font-extrabold leading-[1.1] mb-4">
                Small Upgrades. <br />
                <span className="text-secondary">Big Everyday Difference.</span>
              </h2>
              <p className="text-sm sm:text-base text-on-surface-variant max-w-md mb-6 leading-relaxed">
                We believe extraordinary days begin with thoughtfully crafted tools. Experience workspace pieces, natural linen sleepwear, and grounding artisanal ceramics curated specifically for modern Indian living.
              </p>

              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary-container shrink-0 mt-0.5">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-on-surface">
                      Curated Quality Over Infinite Clutter
                    </h4>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      We reject 80% of submitted catalog listings to ensure every piece meets high durability and aesthetics standards.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-tertiary-fixed flex items-center justify-center text-tertiary shrink-0 mt-0.5">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-on-surface">
                      Direct Handcrafted Artisan Alliances
                    </h4>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      Over 40+ rural textile and ceramic cooperatives partnered with direct fair-wage transparency.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] border border-[#FCD200] text-sm font-bold px-6 py-3 rounded-md shadow-sm transition-all duration-150 hover:-translate-y-0.5 active:scale-95 group"
              >
                <span>Shop the Curated Edit</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6 relative min-h-[420px] bg-surface-container group overflow-hidden">
            <div
              className="w-full h-full bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAELQyq1CRNkLEoj5waqV2VZWw6G-lM_UzzM3VeUXJ-5REJchAfPTUz-DWreoDe76NEbRYpi2S7m7lJgBLlGQUT1l8izaiNJZYu3l_5DqMCwJ2zeVVXrlwXQ_0GT5YNtKTrh60VQRosQZbzOgtUdvPJ4vJQIFI1526uCk0VhAhiKhaj-biDiSv5bfVjoaWUEBR6WwFDTeSmiG_XT0-HbfH-BBmeEhlDoNwyGJ21mrs')",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/45 to-transparent pointer-events-none" />

            <div className="absolute bottom-6 left-6 right-6 bg-surface-container-lowest/90 backdrop-blur-md p-4 rounded-xl shadow-lg flex items-center justify-between border border-outline-variant/30 hover:bg-surface-container-lowest transition-all">
              <div className="flex items-center gap-3">
                <span className="text-2xl text-[#B45309] font-serif font-black">“</span>
                <div>
                  <p className="text-xs text-on-surface italic leading-snug">
                    &ldquo;The pieces in this edit made working from home feel like an inspiring boutique hotel.&rdquo;
                  </p>
                  <span className="text-[10px] text-on-surface-variant font-bold block mt-1">
                    — Priya S., Architect, Mumbai
                  </span>
                </div>
              </div>
              <span className="hidden sm:inline-block bg-primary text-[#0F1111] text-[10px] px-2 py-1 rounded font-bold shadow-sm shrink-0">
                Editor&apos;s Pick
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 6. SHOP BY LIFESTYLE (5 Bento Tiles) */}
      {/* ======================================================== */}
      <section
        className="reveal-on-scroll w-full max-w-[1360px] mx-auto px-4 lg:px-10 py-10"
        id="lifestyles"
      >
        <div className="text-center max-w-2xl mx-auto mb-8">
          <span className="text-xs text-accent font-bold uppercase tracking-wider font-sans">
            Intuitive Navigation
          </span>
          <h2 className="font-headline text-2xl lg:text-3xl font-bold text-on-surface mt-1">
            Shop by Your Lifestyle
          </h2>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-2">
            Whether you are optimizing your deep-work desk setup, packing for a weekend getaway in the hills, or unwinding with evening wellness rituals.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Card 1 (Span 3) */}
          <Link
            href="/lifestyle/work-productivity"
            className="lg:col-span-3 group relative h-80 rounded-xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-end p-6 text-white"
          >
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBo_s_u4zPgDDNP-DmBfslKhhMrRcA5JZDKbFajaxdi7bgh7ff6Stt7duOoz6jC97ZclAYpa2s1eo9-2oWY_Ug3pV-fubz8m4Z53fuLtEe5t6Mhf4FgwrBuCQsYzYxj-Oo4I4yiRM6D1s-L2-XBfl70YFZHpcF4LUCpoSGzKvs9hkT_1HVCt61eT-lwh_y2_Wwm8VirlR8kzq5QF2cPEN5Z-Zfa4_byJG6Uxf2ttBg')",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/90 via-[#0f172a]/35 to-transparent" />
            <div className="relative z-10">
              <span className="bg-primary text-[#0F1111] px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold mb-1.5 inline-block">
                Deep Focus
              </span>
              <h3 className="font-headline text-xl font-bold mb-1">
                Work &amp; Productivity
              </h3>
              <p className="text-xs text-surface-container opacity-90 mb-1">
                Noise-cancelling tech, ergonomic desks, and cable essentials.
              </p>
              <span className="text-xs font-bold inline-flex items-center gap-1 group-hover:underline text-amber-300">
                Explore 140+ Items <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
              </span>
            </div>
          </Link>

          {/* Card 2 (Span 3) */}
          <Link
            href="/lifestyle/weekend-escapes"
            className="lg:col-span-3 group relative h-80 rounded-xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-end p-6 text-white"
          >
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBYxAWAvf94O1N7g20BJoTHeoO93UzyNsHFP5T5bBrvduS2F_SBw4QniR8VchY2xm3aOWFNRzsbtH56MTNRLeynJRZfnnInEv653-gVZx6umWjYlcpzByAIW8lmfZi9cPDY2t6Jq-N2MjFtwMroaNv4CDdeD1u3XBH_NF9MIiakNRVuveCLG0Y1dh4-JPoOqgFV6bDbHix9nQY2ApNf-qZQBapR2s8J711GK-RBL30')",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/90 via-[#0f172a]/35 to-transparent" />
            <div className="relative z-10">
              <span className="bg-secondary-container px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold mb-1.5 inline-block text-white">
                Unwind
              </span>
              <h3 className="font-headline text-xl font-bold mb-1">
                Weekend Escapes
              </h3>
              <p className="text-xs text-surface-container opacity-90 mb-1">
                Breathable cotton, durable weekender totes, and slip-on loafers.
              </p>
              <span className="text-xs font-bold inline-flex items-center gap-1 group-hover:underline text-amber-300">
                Explore 85+ Items <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
              </span>
            </div>
          </Link>

          {/* Card 3 (Span 2) */}
          <Link
            href="/lifestyle/home-refresh"
            className="lg:col-span-2 group relative h-72 rounded-xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-end p-4 text-white"
          >
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCrm9eLcU1y-jUSwNwMi7MlRskQqsQ3g5fvfI327JlfjwOdPslf6W840y6qCrdLR5V18t-3NL5-uRT9Jh-BthJ0resxHOiSDRyRt4T0etvm-AorMXQ2I7eunRUqdZx1x49HbSIpSpP9ddsUMIOCgPkCt9UTRa0mrows3Yyvvli3w18hpdhjllbZQmNU-_qGFqGDqM3a_5J6DL-uKzk1Y-CwybWR0LRvEy9O5SefH6k')",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/90 via-[#0f172a]/45 to-transparent" />
            <div className="relative z-10">
              <h3 className="font-headline text-base font-bold mb-1 group-hover:text-amber-200 transition-colors">
                Home Refresh
              </h3>
              <p className="text-xs text-surface-container opacity-90">
                Studio pottery &amp; organic linen.
              </p>
            </div>
          </Link>

          {/* Card 4 (Span 2) */}
          <Link
            href="/lifestyle/tech-upgrade"
            className="lg:col-span-2 group relative h-72 rounded-xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-end p-4 text-white"
          >
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCVv_W3FXdioC25RP2Z1iXl4GUbeuXkd4yVLBmslL4jYeaUNwnEBOvuTcJRWxT8yZOJQavInfXWcDx83t8VzU40NJfHzznP4OP8u3VLuOqHjB-RgxJyoevi2ZzOVsxhSkRLcDKF7rxQstGChwcdDQ-zt97GZOzbGA-S6BxnDA_sOahLOucpgr_UOoNEOcyrhGzk5JybpDa7aVfhCmIw75X1mmbao8MUc2Hy84wGVUk')",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/90 via-[#0f172a]/45 to-transparent" />
            <div className="relative z-10">
              <h3 className="font-headline text-base font-bold mb-1 group-hover:text-amber-200 transition-colors">
                Tech Upgrade
              </h3>
              <p className="text-xs text-surface-container opacity-90">
                Smart gadgets &amp; power hubs.
              </p>
            </div>
          </Link>

          {/* Card 5 (Span 2) */}
          <Link
            href="/lifestyle/self-care"
            className="lg:col-span-2 group relative h-72 rounded-xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-end p-4 text-white"
          >
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDiP8P2rHoiPviC2alnlyBWIs2XVf3qirdJXM6VvtS2Z2VENiGg0YjBO0A81HsAfvxGZ2F5zYYaZ6Wu7HmGY1tijENg_BE60Eenruw2PQPmPN65ulOF8bbVo38-irIoRglRT3kDAIoj2bXv01AXrpTKpKaq2K8K9is-2QUQD4kFpQtrd7Ky0jEXABDwlAovXTGuKwYpLpsO6f4Zh1LruiSzN9iG-NZehuHUKVzld4o')",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/90 via-[#0f172a]/45 to-transparent" />
            <div className="relative z-10">
              <h3 className="font-headline text-base font-bold mb-1 group-hover:text-amber-200 transition-colors">
                Self-Care Rituals
              </h3>
              <p className="text-xs text-surface-container opacity-90">
                Ayurveda &amp; aromatherapies.
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 7. BRAND STORY & PHILOSOPHY (The VYNTRA Standard) */}
      {/* ======================================================== */}
      <section className="reveal-on-scroll w-full bg-surface-container-low py-12 my-8 border-y border-outline-variant/40">
        <div className="max-w-[1360px] mx-auto px-4 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-1.5 text-accent text-xs uppercase tracking-wider font-bold mb-2">
                <Sparkles className="h-4 w-4" />
                <span>The VYNTRA Standard</span>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl text-on-surface font-extrabold leading-[1.08] mb-4">
                Shopping Should Feel Like <br />
                <span className="text-accent italic">Discovery</span>, Not Overwhelm.
              </h2>
              <p className="text-sm sm:text-base text-on-surface-variant mb-4 leading-relaxed">
                Most Indian marketplaces bombard you with countdown clocks on junk goods and million-item feeds designed to induce exhaustion. VYNTRA was created on the opposite conviction: honest curation, exceptional build standards, and calm discovery.
              </p>

              {/* 4 Metrics Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                <div className="bg-surface-container-lowest p-3.5 rounded-xl shadow-sm text-center border border-outline-variant/30 hover:border-primary/40 hover:-translate-y-1 transition-all duration-200">
                  <span className="font-headline text-2xl lg:text-3xl font-extrabold text-primary-container block">
                    10k+
                  </span>
                  <p className="text-[11px] text-on-surface-variant font-bold mt-1">
                    Curated SKUs
                  </p>
                </div>
                <div className="bg-surface-container-lowest p-3.5 rounded-xl shadow-sm text-center border border-outline-variant/30 hover:border-primary/40 hover:-translate-y-1 transition-all duration-200">
                  <span className="font-headline text-2xl lg:text-3xl font-extrabold text-primary-container block">
                    99.4%
                  </span>
                  <p className="text-[11px] text-on-surface-variant font-bold mt-1">
                    On-Time Dispatched
                  </p>
                </div>
                <div className="bg-surface-container-lowest p-3.5 rounded-xl shadow-sm text-center border border-outline-variant/30 hover:border-tertiary/40 hover:-translate-y-1 transition-all duration-200">
                  <span className="font-headline text-2xl lg:text-3xl font-extrabold text-tertiary block">
                    100%
                  </span>
                  <p className="text-[11px] text-on-surface-variant font-bold mt-1">
                    Authentic Guarantee
                  </p>
                </div>
                <div className="bg-surface-container-lowest p-3.5 rounded-xl shadow-sm text-center border border-outline-variant/30 hover:border-secondary/40 hover:-translate-y-1 transition-all duration-200">
                  <span className="font-headline text-2xl lg:text-3xl font-extrabold text-secondary block">
                    0%
                  </span>
                  <p className="text-[11px] text-on-surface-variant font-bold mt-1">
                    Spam Guarantee
                  </p>
                </div>
              </div>
            </div>

            {/* Jaipur Textile Collective Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative w-full h-[480px] rounded-xl overflow-hidden shadow-xl border border-outline-variant/40 group">
                <div
                  className="w-full h-full bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105"
                  style={{
                    backgroundImage:
                      "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDwo2rUXK5g8xPy-aAzsA2P2DjXrbyosQzmIiltY9JOB3ceKdV68WgA3e22XtUCd5W_qGsRKNtaxBDQ5GF23oszVSwJ8c50Y0R1aQnpK8W8XjykgSR_7bUvCXcKPw2wFa01F_jrjkH8RTbTg44U5-XSxJ4krzlBZP9o6g2wsGU5bAEsRb4SVsT4fVUDofbBJ0ghghr6yc4GQh6YBSvryyfDkTh3FsHO1EWqYxNJ2HQ')",
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/85 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <span className="text-[10px] text-secondary-container font-bold uppercase tracking-wider">
                    Artisan Direct Initiative
                  </span>
                  <h4 className="font-headline text-lg font-bold mt-1">
                    Jaipur Textile Collective
                  </h4>
                  <p className="text-xs opacity-90 mt-1">
                    Partnering directly with over 350 rural weavers to deliver zero-middleman fair prices straight to your doorstep.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 8. TRUST & SECURITY ASSURANCE SECTION */}
      {/* ======================================================== */}
      <section className="reveal-on-scroll w-full max-w-[1360px] mx-auto px-4 lg:px-10 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm flex items-start gap-4 border border-outline-variant/30 hover:border-primary/40 hover:-translate-y-1 hover:shadow-md transition-all duration-200">
            <div className="w-12 h-12 rounded-xl bg-primary-fixed text-primary-container flex items-center justify-center shrink-0">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-on-surface">Secure UPI &amp; Cards</h4>
              <p className="text-xs text-on-surface-variant mt-1">
                256-bit encrypted checkout with Google Pay, PhonePe, Paytm, and all major Indian cards.
              </p>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm flex items-start gap-4 border border-outline-variant/30 hover:border-secondary/40 hover:-translate-y-1 hover:shadow-md transition-all duration-200">
            <div className="w-12 h-12 rounded-xl bg-secondary-fixed text-secondary flex items-center justify-center shrink-0">
              <RotateCcw className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-on-surface">7-Day Doorstep Returns</h4>
              <p className="text-xs text-on-surface-variant mt-1">
                Hassle-free pickup directly from your address. Instant refund directly to your source account.
              </p>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm flex items-start gap-4 border border-outline-variant/30 hover:border-tertiary/40 hover:-translate-y-1 hover:shadow-md transition-all duration-200">
            <div className="w-12 h-12 rounded-xl bg-tertiary-fixed text-tertiary flex items-center justify-center shrink-0">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-on-surface">Express 24-48h Delivery</h4>
              <p className="text-xs text-on-surface-variant mt-1">
                Priority transit hubs across Mumbai, Delhi NCR, Bangalore, Hyderabad &amp; 15,000+ pin codes.
              </p>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm flex items-start gap-4 border border-outline-variant/30 hover:border-outline/50 hover:-translate-y-1 hover:shadow-md transition-all duration-200">
            <div className="w-12 h-12 rounded-xl bg-surface-container-highest text-on-surface flex items-center justify-center shrink-0">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-on-surface">100% Genuine Guaranteed</h4>
              <p className="text-xs text-on-surface-variant mt-1">
                Direct tie-ups with authorized brand distributors. 2x money-back guarantee on counterfeits.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 9. VIP CLUB NEWSLETTER & PROMO COPY */}
      {/* ======================================================== */}
      <section className="reveal-on-scroll w-full max-w-[1360px] mx-auto px-4 lg:px-10 py-10 mb-8">
        <div className="bg-gradient-to-br from-[#0F2756] via-[#1A3A78] to-[#1E3A8A] text-white rounded-2xl p-6 lg:p-12 shadow-xl relative overflow-hidden">
          <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-primary rounded-full blur-3xl opacity-40 pointer-events-none" />
          <div className="absolute top-0 right-1/3 w-64 h-64 bg-secondary-container rounded-full blur-3xl opacity-20 pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-md text-[11px] text-amber-300 mb-3 border border-white/15">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span className="font-bold tracking-wide">VYNTRA Insider Club</span>
              </div>

              <h2 className="font-display text-3xl sm:text-4xl leading-tight font-extrabold text-white mb-2">
                Get the Good Stuff First.
              </h2>
              <p className="text-sm sm:text-base text-blue-100/90 max-w-lg">
                Join 120,000+ design lovers receiving private Friday drops, artisan spotlight edits, and unannounced sale alerts.
              </p>

              {/* Click-to-copy Coupon Strip */}
              <div
                onClick={() => handleCopyCoupon('FIRST15')}
                className="mt-4 inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg border border-white/15 hover:bg-white/20 transition-all cursor-pointer group active:scale-95 select-none"
              >
                <span className="text-xs text-amber-300 font-bold">First Order Benefit:</span>
                <span className="text-xs font-mono bg-amber-400 text-slate-900 px-2 py-0.5 rounded font-extrabold shadow-sm flex items-center gap-1">
                  FIRST15
                  <Copy className="h-3 w-3 opacity-70" />
                </span>
                <span className="text-[11px] text-blue-100/90 font-medium">
                  flat 15% instant off (Click to copy)
                </span>
              </div>
            </div>

            <div className="lg:col-span-5">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  showToast(
                    'Welcome to the VIP Club! Use code FIRST15 on checkout.',
                    'celebration'
                  );
                }}
                className="flex flex-col sm:flex-row gap-2"
              >
                <input
                  type="email"
                  placeholder="Enter your email or WhatsApp number"
                  required
                  className="flex-1 h-12 bg-surface-container-lowest text-on-surface px-4 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-secondary-container shadow-md"
                />
                <button
                  type="submit"
                  className="h-12 px-6 bg-secondary-container hover:bg-secondary text-white text-sm font-bold rounded-lg shadow-md transition-all duration-200 active:scale-95 whitespace-nowrap flex items-center justify-center gap-1.5 group"
                >
                  <span>Join Club</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </button>
              </form>
              <p className="text-[10px] text-blue-200/70 mt-2">
                Zero spam. One weekly email every Thursday evening. Unsubscribe with 1-click anytime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 10. GLOBAL FLOATING TOAST NOTIFICATION */}
      {/* ======================================================== */}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 ${
          toast.show ? 'opacity-100 translate-y-0 toast-enter' : 'opacity-0 translate-y-4'
        }`}
      >
        <div className="bg-[#283044] text-[#eef0ff] px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-white/10 text-sm pointer-events-auto">
          <CheckCircle className="h-5 w-5 text-secondary-container shrink-0" />
          <span className="font-medium">{toast.message}</span>
        </div>
      </div>
    </div>
  );
}
