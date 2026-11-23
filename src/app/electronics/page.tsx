'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Laptop,
  Headphones,
  Tablet,
  Gamepad2,
  Camera,
  Sparkles,
  SlidersHorizontal,
  X,
  ChevronRight,
  ShieldCheck,
  Zap,
  Truck,
  RotateCcw,
  Search,
  Check,
  Star,
  ArrowUpDown,
  Cpu,
  HardDrive,
  CreditCard,
  ShoppingCart,
  Heart,
  ExternalLink,
} from 'lucide-react';
import { CategoryProductCard } from '@/components/products/category-product-card';
import { CategoryProductItem, useCategoryProducts } from '@/hooks/use-category-products';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';
import {
  ELECTRONICS_SUBCATEGORIES,
  ELECTRONICS_BRANDS,
} from '@/data/electronics-fallback';

// Helper function to extract RAM spec from product
function extractRamSpec(p: CategoryProductItem): string | null {
  if (p.specs?.ram) return p.specs.ram;
  const match = p.title.match(/(\d+)\s*(?:GB|gb)\s*(?:RAM|LPDDR|DDR)/i);
  if (match) return `${match[1]} GB`;
  return null;
}

// Helper function to extract Storage capacity from product
function extractStorageSpec(p: CategoryProductItem): string[] {
  const result: string[] = [];
  if (p.specs?.storage) result.push(p.specs.storage);
  if (Array.isArray(p.sizes)) {
    p.sizes.forEach((s) => {
      if (typeof s === 'string' && (s.includes('GB') || s.includes('TB'))) {
        result.push(s.trim());
      }
    });
  }
  const match = p.title.match(/(\d+\s*(?:GB|TB))\s*(?:SSD|Storage|ROM)/i);
  if (match && !result.includes(match[1])) {
    result.push(match[1].trim());
  }
  return Array.from(new Set(result));
}

// Helper function to extract Processor family from product
function extractProcessorSpec(p: CategoryProductItem): string | null {
  if (p.specs?.processor) return p.specs.processor;
  const title = (p.title || '').toLowerCase();
  if (title.includes('core ultra') || title.includes('intel core') || title.includes('intel')) {
    return 'Intel Core';
  }
  if (title.includes('ryzen') || title.includes('amd')) {
    return 'AMD Ryzen';
  }
  if (title.includes('m1') || title.includes('m2') || title.includes('m3') || title.includes('m4') || title.includes('apple silicon')) {
    return 'Apple Silicon';
  }
  return null;
}

function ElectronicsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL query params
  const initialSubCat = searchParams.get('subcategory') || 'all';
  const initialBrand = searchParams.get('brand') || '';
  const initialSearch = searchParams.get('q') || searchParams.get('search') || '';

  // Core state
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>(initialSubCat);
  const [selectedBrands, setSelectedBrands] = useState<string[]>(initialBrand ? [initialBrand] : []);
  const [selectedRam, setSelectedRam] = useState<string[]>([]);
  const [selectedStorage, setSelectedStorage] = useState<string[]>([]);
  const [selectedProcessors, setSelectedProcessors] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<string>('all');
  const [customMinPrice, setCustomMinPrice] = useState<string>('');
  const [customMaxPrice, setCustomMaxPrice] = useState<string>('');
  const [appliedCustomPrice, setAppliedCustomPrice] = useState<{ min: number | null; max: number | null }>({
    min: null,
    max: null,
  });
  const [minRating, setMinRating] = useState<number>(0);
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [onlyExpress, setOnlyExpress] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('featured');
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);
  const [brandSearchTerm, setBrandSearchTerm] = useState<string>('');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState<boolean>(false);
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({});

  // Sync state with URL query parameters whenever user searches or navigates
  useEffect(() => {
    const q = searchParams.get('q') || searchParams.get('search') || '';
    setSearchQuery(q);
    const sub = searchParams.get('subcategory') || 'all';
    setSelectedSubCategory(sub);
    const br = searchParams.get('brand') || '';
    if (br) {
      setSelectedBrands([br]);
    }
  }, [searchParams]);

  const { addItem, openCart } = useCartStore();
  const { toggleItem, isInWishlist } = useWishlistStore();

  const handleAddToCart = (product: CategoryProductItem) => {
    addItem({
      id: product.id,
      productId: product.id,
      title: product.title,
      brand: product.brand,
      variantId: `var-${product.id}`,
      size: product.sizes?.[0] || 'Standard Edition',
      color: 'Standard Edition',
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      quantity: 1,
      vendorName: product.vendorName || 'Tarun Store',
    });

    setAddedItemIds((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedItemIds((prev) => ({ ...prev, [product.id]: false }));
    }, 2000);
    openCart();
  };

  // Live database products with fallback support
  const { products: liveDbProducts, isLoading } = useCategoryProducts({
    categoryKey: 'electronics',
    extraKeywords: ['laptop', 'macbook', 'audio', 'headphone', 'earbud', 'tablet', 'ipad', 'gaming', 'camera'],
  });

  // Real database products only (no dummy products or fake ratings)
  // Strictly filter out mobiles and smartwatches (smartphones have their own dedicated /mobiles department)
  const products: CategoryProductItem[] = useMemo(() => {
    return (liveDbProducts || []).filter((p) => {
      const cat = (p.category || '').toLowerCase();
      const sub = (p.subcategory || p.subCategory || '').toLowerCase();
      const title = (p.title || '').toLowerCase();
      const slug = (p.slug || '').toLowerCase();
      const isMobile =
        cat === 'mobiles' ||
        cat === 'smartphones' ||
        sub === 'mobiles' ||
        sub === 'smartphones' ||
        title.includes('iphone') ||
        title.includes('smartphone') ||
        title.includes('galaxy s2');
      const isWatch =
        cat.includes('watch') ||
        sub.includes('watch') ||
        title.includes('smartwatch') ||
        title.includes('smart watch') ||
        title.includes('apple watch') ||
        slug.includes('smartwatch');
      return !isMobile && !isWatch;
    });
  }, [liveDbProducts]);

  // Derived brands count directly from real database products
  const availableBrandsWithCount = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      if (p.brand) {
        counts[p.brand] = (counts[p.brand] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([name, count]) => ({
        name,
        count,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  // Filtered brands by brand search term
  const displayedBrands = useMemo(() => {
    if (!brandSearchTerm.trim()) return availableBrandsWithCount;
    const term = brandSearchTerm.toLowerCase();
    return availableBrandsWithCount.filter((b) => b.name.toLowerCase().includes(term));
  }, [availableBrandsWithCount, brandSearchTerm]);

  // Derived Hardware Spec options from real products
  const availableRamOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      const ram = extractRamSpec(p);
      if (ram) {
        counts[ram] = (counts[ram] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([ram, count]) => ({ ram, count }));
  }, [products]);

  const availableStorageOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      const storages = extractStorageSpec(p);
      storages.forEach((s) => {
        counts[s] = (counts[s] || 0) + 1;
      });
    });
    return Object.entries(counts).map(([storage, count]) => ({ storage, count }));
  }, [products]);

  const availableProcessorOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      const proc = extractProcessorSpec(p);
      if (proc) {
        counts[proc] = (counts[proc] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([proc, count]) => ({ proc, count }));
  }, [products]);

  // Active filter count calculation
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedSubCategory !== 'all') count++;
    if (selectedBrands.length > 0) count += selectedBrands.length;
    if (selectedRam.length > 0) count += selectedRam.length;
    if (selectedStorage.length > 0) count += selectedStorage.length;
    if (selectedProcessors.length > 0) count += selectedProcessors.length;
    if (priceRange !== 'all') count++;
    if (appliedCustomPrice.min !== null || appliedCustomPrice.max !== null) count++;
    if (minRating > 0) count++;
    if (onlyInStock) count++;
    if (onlyExpress) count++;
    if (searchQuery.trim().length > 0) count++;
    return count;
  }, [
    selectedSubCategory,
    selectedBrands,
    selectedRam,
    selectedStorage,
    selectedProcessors,
    priceRange,
    appliedCustomPrice,
    minRating,
    onlyInStock,
    onlyExpress,
    searchQuery,
  ]);

  const clearAllFilters = () => {
    setSelectedSubCategory('all');
    setSelectedBrands([]);
    setSelectedRam([]);
    setSelectedStorage([]);
    setSelectedProcessors([]);
    setPriceRange('all');
    setCustomMinPrice('');
    setCustomMaxPrice('');
    setAppliedCustomPrice({ min: null, max: null });
    setMinRating(0);
    setOnlyInStock(false);
    setOnlyExpress(false);
    setSearchQuery('');
  };

  const handleBrandToggle = (brandName: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brandName) ? prev.filter((b) => b !== brandName) : [...prev, brandName]
    );
  };

  const handleRamToggle = (ram: string) => {
    setSelectedRam((prev) =>
      prev.includes(ram) ? prev.filter((r) => r !== ram) : [...prev, ram]
    );
  };

  const handleStorageToggle = (storage: string) => {
    setSelectedStorage((prev) =>
      prev.includes(storage) ? prev.filter((s) => s !== storage) : [...prev, storage]
    );
  };

  const handleProcessorToggle = (proc: string) => {
    setSelectedProcessors((prev) =>
      prev.includes(proc) ? prev.filter((p) => p !== proc) : [...prev, proc]
    );
  };

  const applyCustomPrice = () => {
    const min = customMinPrice.trim() !== '' && !isNaN(Number(customMinPrice)) ? Number(customMinPrice) : null;
    const max = customMaxPrice.trim() !== '' && !isNaN(Number(customMaxPrice)) ? Number(customMaxPrice) : null;
    setAppliedCustomPrice({ min, max });
    setPriceRange('custom');
  };

  // Filtered and Sorted Products
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Subcategory Filter
    if (selectedSubCategory !== 'all') {
      list = list.filter((p) => {
        const cat = (p.category || '').toLowerCase();
        const sub = (p.subcategory || p.subCategory || '').toLowerCase();
        const title = (p.title || '').toLowerCase();

        if (selectedSubCategory === 'laptops') {
          return cat.includes('laptop') || sub.includes('laptop') || title.includes('laptop') || title.includes('notebook') || title.includes('macbook');
        }
        if (selectedSubCategory === 'audio-headphones') {
          return cat.includes('audio') || sub.includes('audio') || cat.includes('headphone') || sub.includes('headphone') || title.includes('headphone') || title.includes('earbud') || title.includes('speaker') || title.includes('audio');
        }
        if (selectedSubCategory === 'tablets-ipads') {
          return cat.includes('tablet') || sub.includes('tablet') || title.includes('tablet') || title.includes('ipad');
        }
        if (selectedSubCategory === 'gaming-accessories') {
          return cat.includes('gaming') || sub.includes('gaming') || title.includes('gaming') || title.includes('keyboard') || title.includes('mouse') || title.includes('controller');
        }
        if (selectedSubCategory === 'cameras-photography') {
          return cat.includes('camera') || sub.includes('camera') || title.includes('camera') || title.includes('lens') || title.includes('dslr');
        }
        return cat === selectedSubCategory.toLowerCase() || sub === selectedSubCategory.toLowerCase();
      });
    }

    // Brand Filter
    if (selectedBrands.length > 0) {
      list = list.filter((p) =>
        selectedBrands.some((b) => b.toLowerCase() === (p.brand || '').toLowerCase())
      );
    }

    // RAM Filter
    if (selectedRam.length > 0) {
      list = list.filter((p) => {
        const ram = extractRamSpec(p);
        return ram ? selectedRam.includes(ram) : false;
      });
    }

    // Storage Filter
    if (selectedStorage.length > 0) {
      list = list.filter((p) => {
        const storages = extractStorageSpec(p);
        return storages.some((s) => selectedStorage.includes(s));
      });
    }

    // Processor Filter
    if (selectedProcessors.length > 0) {
      list = list.filter((p) => {
        const proc = extractProcessorSpec(p);
        return proc ? selectedProcessors.includes(proc) : false;
      });
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q) ||
          p.subcategory?.toLowerCase().includes(q)
      );
    }

    // Price Range Filter
    if (priceRange === 'under-10000') {
      list = list.filter((p) => p.price < 10000);
    } else if (priceRange === '10000-30000') {
      list = list.filter((p) => p.price >= 10000 && p.price <= 30000);
    } else if (priceRange === '30000-60000') {
      list = list.filter((p) => p.price >= 30000 && p.price <= 60000);
    } else if (priceRange === '60000-100000') {
      list = list.filter((p) => p.price >= 60000 && p.price <= 100000);
    } else if (priceRange === 'over-100000') {
      list = list.filter((p) => p.price > 100000);
    } else if (priceRange === 'custom') {
      if (appliedCustomPrice.min !== null) {
        list = list.filter((p) => p.price >= appliedCustomPrice.min!);
      }
      if (appliedCustomPrice.max !== null) {
        list = list.filter((p) => p.price <= appliedCustomPrice.max!);
      }
    }

    // Customer Rating Filter
    if (minRating > 0) {
      list = list.filter((p) => (p.rating || 0) >= minRating);
    }

    // In Stock Only
    if (onlyInStock) {
      list = list.filter((p) => p.inStock);
    }

    // Vyntra Express Only
    if (onlyExpress) {
      list = list.filter((p) => p.isPrime);
    }

    // Sorting
    if (sortBy === 'price-low') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'newest') {
      list.sort((a, b) => b.id.localeCompare(a.id));
    }

    return list;
  }, [
    products,
    selectedSubCategory,
    selectedBrands,
    selectedRam,
    selectedStorage,
    selectedProcessors,
    searchQuery,
    priceRange,
    appliedCustomPrice,
    minRating,
    onlyInStock,
    onlyExpress,
    sortBy,
  ]);

  const renderSubCategoryIcon = (icon: string) => {
    switch (icon) {
      case 'Laptop':
        return <Laptop className="w-4 h-4 shrink-0" />;
      case 'Headphones':
        return <Headphones className="w-4 h-4 shrink-0" />;
      case 'Tablet':
        return <Tablet className="w-4 h-4 shrink-0" />;
      case 'Gamepad2':
        return <Gamepad2 className="w-4 h-4 shrink-0" />;
      case 'Camera':
        return <Camera className="w-4 h-4 shrink-0" />;
      default:
        return <Sparkles className="w-4 h-4 shrink-0" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A]">
      {/* 1. Breadcrumb Bar */}
      <div className="w-full bg-[#FAFAFA] border-b border-[#E7E7E7]">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-2 text-xs text-[#565959] flex items-center gap-1.5 flex-wrap">
          <Link href="/" className="hover:text-[#007185] hover:underline transition-colors">
            Home
          </Link>
          <ChevronRight className="h-3 w-3 text-[#888888]" />
          <Link href="/electronics" className="hover:text-[#007185] hover:underline font-semibold text-[#0F1111] transition-colors">
            Electronics
          </Link>
          {selectedSubCategory !== 'all' && (
            <>
              <ChevronRight className="h-3 w-3 text-[#888888]" />
              <span className="font-bold text-[#007185]">
                {ELECTRONICS_SUBCATEGORIES.find((s) => s.slug === selectedSubCategory)?.name ||
                  selectedSubCategory}
              </span>
            </>
          )}
        </div>
      </div>

      {/* 2. Page Header & Promotional Hero */}
      <section className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 pt-3 pb-2">
        {/* Title Bar with Trust Indicators */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 mb-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#007185] mb-0.5">
              <Laptop className="h-3.5 w-3.5" />
              <span>Official Electronics Department</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-headline text-[#0F1111] tracking-tight">
              Electronics &amp; Smart Gadgets
            </h1>
          </div>

          {/* Quick Stats Badges */}
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#E7E7E7] text-[#0F1111] font-medium shadow-2xs">
              <ShieldCheck className="h-3.5 w-3.5 text-[#007600]" />
              100% Genuine Brands
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#E7E7E7] text-[#0F1111] font-medium shadow-2xs">
              <RotateCcw className="h-3.5 w-3.5 text-[#007185]" />
              7 Days Return
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#E7E7E7] text-[#0F1111] font-medium shadow-2xs">
              <Truck className="h-3.5 w-3.5 text-[#E67A00]" />
              Vyntra Express Delivery
            </span>
          </div>
        </div>

        {/* Compact, High-Visibility Promotional Hero Banner */}
        <div className="relative w-full rounded-2xl overflow-hidden shadow-sm bg-[#071526] mb-4 border border-white/10 group">
          <div
            style={{
              background: 'linear-gradient(135deg, #071526 0%, #0F1E36 50%, #162B4D 100%)',
            }}
            className="w-full relative min-h-[160px] sm:min-h-[175px] md:min-h-[185px] p-4 sm:p-5 md:p-6 lg:p-7 text-white flex flex-col md:flex-row items-center justify-between gap-5 overflow-hidden"
          >
            {/* Ambient lighting glows */}
            <div
              aria-hidden="true"
              className="absolute -right-8 -bottom-8 w-80 h-80 rounded-full bg-[#FFD814]/15 blur-3xl pointer-events-none"
            />
            <div
              aria-hidden="true"
              className="absolute right-1/3 top-0 w-72 h-72 rounded-full bg-[#007185]/25 blur-3xl pointer-events-none"
            />

            {/* High-Visibility Modern Tech Laptop Illustration (Crisp, Non-Cluttered) */}
            <div
              aria-hidden="true"
              className="hidden lg:flex absolute right-[280px] xl:right-[320px] bottom-2 items-end justify-center pointer-events-none select-none"
            >
              <div className="relative w-56 h-36 flex items-center justify-center">
                {/* Ambient glow behind laptop */}
                <div className="absolute inset-0 bg-[#007185]/35 blur-2xl rounded-full" />
                
                {/* SVG Laptop Graphic with Glowing Screen & Metallic Base */}
                <svg
                  viewBox="0 0 240 160"
                  className="w-full h-full drop-shadow-[0_12px_24px_rgba(0,113,133,0.45)]"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="heroScreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#007185" stopOpacity="0.85" />
                      <stop offset="50%" stopColor="#0A192F" stopOpacity="0.95" />
                      <stop offset="100%" stopColor="#FFD814" stopOpacity="0.6" />
                    </linearGradient>
                    <linearGradient id="heroBaseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#1E293B" />
                      <stop offset="50%" stopColor="#475569" />
                      <stop offset="100%" stopColor="#1E293B" />
                    </linearGradient>
                  </defs>

                  {/* Screen Lid Outer Shell */}
                  <rect x="36" y="16" width="168" height="108" rx="8" fill="#0F172A" stroke="#007185" strokeWidth="2.5" />
                  
                  {/* Screen Bezel */}
                  <rect x="42" y="22" width="156" height="96" rx="4" fill="#070E18" />
                  
                  {/* Glowing Screen Surface */}
                  <rect x="44" y="24" width="152" height="92" rx="3" fill="url(#heroScreenGrad)" />
                  
                  {/* Tech Data Wave Lines */}
                  <path d="M 48 70 Q 120 40 192 62" stroke="#FFD814" strokeWidth="2" strokeOpacity="0.85" fill="none" />
                  <path d="M 48 85 Q 120 58 192 78" stroke="#38BDF8" strokeWidth="2" strokeOpacity="0.9" fill="none" />
                  <circle cx="120" cy="20" r="1.5" fill="#38BDF8" />

                  {/* Laptop Base */}
                  <path d="M 16 124 L 224 124 L 214 138 L 26 138 Z" fill="url(#heroBaseGrad)" stroke="#64748B" strokeWidth="1" />
                  
                  {/* Trackpad Opening */}
                  <rect x="100" y="125" width="40" height="3" rx="1.5" fill="#CBD5E1" />
                </svg>
              </div>
            </div>

            {/* Left Content Column */}
            <div className="space-y-2.5 max-w-xl xl:max-w-2xl z-10 w-full">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs bg-[#FFD814] text-[#0F1111]">
                  <Sparkles className="h-3 w-3" />
                  Festive Tech Deals
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-200 bg-white/10 px-2.5 py-0.5 rounded-full backdrop-blur-xs border border-white/15">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#34D399]" />
                  Brand Sealed Warranty
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl lg:text-[27px] font-extrabold tracking-tight text-white leading-tight">
                Next-Gen AI Laptops, Studio Audio &amp; PC Gaming
              </h2>

              <p className="text-xs sm:text-sm font-bold text-[#FFD814] flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 shrink-0" />
                <span>Up to 35% Off • Intel Core Ultra AI PCs &amp; Flagship Tech</span>
              </p>

              {/* Action Buttons */}
              <div className="pt-1 flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedSubCategory('laptops')}
                  className="px-4 py-2 rounded-xl bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] font-bold transition-all shadow-sm active:scale-98 flex items-center gap-1.5 border border-[#FCD200]"
                >
                  <Laptop className="h-3.5 w-3.5" />
                  <span>Shop Laptops</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSubCategory('audio-headphones')}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition-all border border-white/25 flex items-center gap-1.5 backdrop-blur-xs active:scale-98"
                >
                  <Headphones className="h-3.5 w-3.5" />
                  <span>Explore Audio</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSubCategory('all')}
                  className="px-3 py-2 text-stone-300 hover:text-white text-xs underline font-medium transition-colors"
                >
                  View All Tech
                </button>
              </div>
            </div>

            {/* Right Side: Trust & Benefit Cards (Vyntra Express, Genuine, Return, EMI) */}
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5 w-full md:w-auto z-10 shrink-0">
              <div className="bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 hover:border-[#FFD814]/30 rounded-xl p-2.5 sm:p-3 text-center min-w-[125px] backdrop-blur-md transition-all shadow-xs">
                <Truck className="w-4 h-4 mx-auto text-[#FFD814] mb-1" />
                <span className="text-[11px] sm:text-xs font-bold block text-white">Vyntra Express</span>
                <span className="text-[9px] sm:text-[10px] text-slate-300">Fast 24-48H Delivery</span>
              </div>
              <div className="bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 hover:border-emerald-400/30 rounded-xl p-2.5 sm:p-3 text-center min-w-[125px] backdrop-blur-md transition-all shadow-xs">
                <ShieldCheck className="w-4 h-4 mx-auto text-emerald-400 mb-1" />
                <span className="text-[11px] sm:text-xs font-bold block text-white">100% Genuine</span>
                <span className="text-[9px] sm:text-[10px] text-slate-300">Brand Sealed Warranty</span>
              </div>
              <div className="bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 hover:border-sky-400/30 rounded-xl p-2.5 sm:p-3 text-center min-w-[125px] backdrop-blur-md transition-all shadow-xs">
                <RotateCcw className="w-4 h-4 mx-auto text-sky-400 mb-1" />
                <span className="text-[11px] sm:text-xs font-bold block text-white">7-Day Return</span>
                <span className="text-[9px] sm:text-[10px] text-slate-300">Hassle-Free Replacement</span>
              </div>
              <div className="bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 hover:border-purple-400/30 rounded-xl p-2.5 sm:p-3 text-center min-w-[125px] backdrop-blur-md transition-all shadow-xs">
                <Sparkles className="w-4 h-4 mx-auto text-purple-400 mb-1" />
                <span className="text-[11px] sm:text-xs font-bold block text-white">No Cost EMI</span>
                <span className="text-[9px] sm:text-[10px] text-slate-300">Up to 24 Months</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Subcategory Pills Bar (Smooth Horizontal Scroll on Mobile) */}
      <section className="bg-white/95 backdrop-blur-md border-b border-[#D5D9D9] sticky top-[100px] lg:top-[105px] z-20 shadow-xs">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
          {/* Subcategory Pills Container */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none touch-pan-x -mx-4 px-4 sm:mx-0 sm:px-0 py-0.5">
            {ELECTRONICS_SUBCATEGORIES.map((sub) => {
              const active = selectedSubCategory === sub.slug;
              return (
                <button
                  key={sub.id}
                  onClick={() => setSelectedSubCategory(sub.slug)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border shrink-0 ${
                    active
                      ? 'bg-[#007185] text-white border-[#007185] shadow-xs ring-2 ring-[#007185]/20'
                      : 'bg-white text-[#0F1111] border-[#D5D9D9] hover:bg-[#F7F8F8] hover:border-[#007185] hover:text-[#007185] active:scale-98'
                  }`}
                >
                  {renderSubCategoryIcon(sub.icon)}
                  <span>{sub.name}</span>
                  {sub.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full uppercase font-black tracking-wider ${
                        active ? 'bg-[#FFD814] text-[#0F1111]' : 'bg-[#FFF3CD] text-[#7A4B00]'
                      }`}
                    >
                      {sub.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Search */}
          <div className="relative min-w-[220px] max-w-[280px] hidden lg:block shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#565959]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in Electronics..."
              className="w-full pl-8 pr-7 py-1.5 bg-white border border-[#D5D9D9] rounded-lg text-xs text-[#0F1111] placeholder:text-[#565959] focus:outline-none focus:border-[#007185] focus:ring-1 focus:ring-[#007185] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#565959] hover:text-[#0F1111]"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-5">
        {/* Results Header / Mobile Filter Toggle / Sort Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-[#E7E7E7] mb-4 gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#D5D9D9] hover:border-[#007185] rounded-lg text-xs font-semibold shadow-xs text-[#0F1111] transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#007185]" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#007185] text-white text-[10px] flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>
            <p className="text-xs sm:text-sm text-[#565959]">
              Showing <span className="font-bold text-[#0F1111]">{filteredProducts.length}</span>{' '}
              {filteredProducts.length === 1 ? 'gadget' : 'gadgets'} in Electronics
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="flex items-center gap-1.5 bg-white border border-[#D5D9D9] rounded-lg px-2.5 py-1.5 shadow-2xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#565959]" />
              <label htmlFor="sort-select" className="text-xs text-[#565959] font-medium">Sort by:</label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs bg-transparent focus:outline-none font-semibold text-[#0F1111] cursor-pointer"
              >
                <option value="featured">Featured Deals</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Customer Rating</option>
                <option value="newest">Newest Tech Arrivals</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Filter Chips Bar */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap pb-4 pt-1">
            <span className="text-xs text-[#565959] font-bold">Active Filters:</span>

            {selectedSubCategory !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#007185]/10 text-[#007185] text-xs font-semibold border border-[#007185]/20">
                <span>Category: {ELECTRONICS_SUBCATEGORIES.find((s) => s.slug === selectedSubCategory)?.name || selectedSubCategory}</span>
                <button onClick={() => setSelectedSubCategory('all')} className="hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedBrands.map((b) => (
              <span key={b} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 text-[#0F1111] text-xs font-medium border border-stone-200">
                <span>Brand: {b}</span>
                <button onClick={() => handleBrandToggle(b)} className="hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {selectedRam.map((r) => (
              <span key={r} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 text-[#0F1111] text-xs font-medium border border-stone-200">
                <span>RAM: {r}</span>
                <button onClick={() => handleRamToggle(r)} className="hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {selectedStorage.map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 text-[#0F1111] text-xs font-medium border border-stone-200">
                <span>Storage: {s}</span>
                <button onClick={() => handleStorageToggle(s)} className="hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {selectedProcessors.map((p) => (
              <span key={p} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 text-[#0F1111] text-xs font-medium border border-stone-200">
                <span>Chip: {p}</span>
                <button onClick={() => handleProcessorToggle(p)} className="hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {priceRange !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 text-[#0F1111] text-xs font-medium border border-stone-200">
                <span>
                  {priceRange === 'under-10000' && 'Under ₹10,000'}
                  {priceRange === '10000-30000' && '₹10,000 - ₹30,000'}
                  {priceRange === '30000-60000' && '₹30,000 - ₹60,000'}
                  {priceRange === '60000-100000' && '₹60,000 - ₹1,00,000'}
                  {priceRange === 'over-100000' && 'Over ₹1,00,000'}
                  {priceRange === 'custom' && `₹${appliedCustomPrice.min || 0} - ₹${appliedCustomPrice.max || 'Any'}`}
                </span>
                <button onClick={() => { setPriceRange('all'); setAppliedCustomPrice({ min: null, max: null }); }} className="hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {minRating > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 text-xs font-medium border border-amber-200">
                <span>{minRating}★ &amp; Above</span>
                <button onClick={() => setMinRating(0)} className="hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {onlyInStock && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 text-[#0F1111] text-xs font-medium border border-stone-200">
                <span>In Stock Only</span>
                <button onClick={() => setOnlyInStock(false)} className="hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {onlyExpress && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#007185]/10 text-[#007185] text-xs font-semibold border border-[#007185]/20">
                <span>Vyntra Express</span>
                <button onClick={() => setOnlyExpress(false)} className="hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {searchQuery && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 text-[#0F1111] text-xs font-medium border border-stone-200">
                <span>&quot;{searchQuery}&quot;</span>
                <button onClick={() => setSearchQuery('')} className="hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              onClick={clearAllFilters}
              className="text-xs text-[#007185] hover:text-[#C7511F] hover:underline font-bold ml-1 transition-colors"
            >
              Clear all ({activeFiltersCount})
            </button>
          </div>
        )}

        {/* Layout Grid: Sidebar Filters + Products */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Desktop Sidebar Filters: Clean, Natural Page Scroll, Zero Nested Scrollbars */}
          <aside className="hidden lg:block space-y-5 bg-white p-5 rounded-2xl border border-[#D5D9D9] shadow-2xs self-start sticky top-[115px]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
              <span className="font-bold text-sm text-[#0F1111] flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#007185]" />
                Refine Selection
              </span>
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-[#007185] hover:text-[#C7511F] hover:underline font-bold transition-colors"
                >
                  Reset ({activeFiltersCount})
                </button>
              )}
            </div>

            {/* Brands Filter */}
            {availableBrandsWithCount.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#565959]">Brands</h4>
                {availableBrandsWithCount.length > 5 && (
                  <div className="relative mb-1">
                    <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Find brand..."
                      value={brandSearchTerm}
                      onChange={(e) => setBrandSearchTerm(e.target.value)}
                      className="w-full pl-7 pr-2 py-1 text-xs border border-[#D5D9D9] rounded focus:outline-none focus:border-[#007185]"
                    />
                  </div>
                )}
                <div className="space-y-1">
                  {displayedBrands.map(({ name, count }) => {
                    const isChecked = selectedBrands.includes(name);
                    return (
                      <label
                        key={name}
                        onClick={() => handleBrandToggle(name)}
                        className="flex items-center justify-between text-xs text-[#0F1111] hover:text-[#007185] cursor-pointer py-1 px-1 rounded hover:bg-[#F7F8F8] transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                              isChecked
                                ? 'bg-[#007185] border-[#007185] text-white'
                                : 'border-[#D5D9D9] bg-white'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="font-medium">{name}</span>
                        </div>
                        <span className="text-[11px] text-[#565959]">({count})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Price Filter */}
            <div className="space-y-2.5 pt-3 border-t border-[#E7E7E7]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#565959]">Price</h4>
              <div className="space-y-1.5 text-xs text-[#0F1111]">
                {[
                  { id: 'all', label: 'All Prices' },
                  { id: 'under-10000', label: 'Under ₹10,000' },
                  { id: '10000-30000', label: '₹10,000 - ₹30,000' },
                  { id: '30000-60000', label: '₹30,000 - ₹60,000' },
                  { id: '60000-100000', label: '₹60,000 - ₹1,00,000' },
                  { id: 'over-100000', label: 'Over ₹1,00,000' },
                ].map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-center gap-2 cursor-pointer py-0.5 hover:text-[#007185] transition-colors"
                  >
                    <input
                      type="radio"
                      name="priceRange"
                      checked={priceRange === opt.id}
                      onChange={() => {
                        setPriceRange(opt.id);
                        setAppliedCustomPrice({ min: null, max: null });
                      }}
                      className="accent-[#007185]"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>

              {/* Custom Min/Max */}
              <div className="flex items-center gap-1.5 pt-1.5">
                <input
                  type="number"
                  placeholder="Min ₹"
                  value={customMinPrice}
                  onChange={(e) => setCustomMinPrice(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-[#D5D9D9] rounded focus:outline-none focus:border-[#007185]"
                />
                <span className="text-[#565959] text-xs">-</span>
                <input
                  type="number"
                  placeholder="Max ₹"
                  value={customMaxPrice}
                  onChange={(e) => setCustomMaxPrice(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-[#D5D9D9] rounded focus:outline-none focus:border-[#007185]"
                />
                <button
                  type="button"
                  onClick={applyCustomPrice}
                  className="px-2.5 py-1 text-xs font-bold bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] rounded border border-[#FCD200] shadow-2xs"
                >
                  Go
                </button>
              </div>
            </div>

            {/* Hardware Specifications: RAM */}
            {availableRamOptions.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-[#E7E7E7]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#565959] flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-[#007185]" />
                  <span>RAM / Memory</span>
                </h4>
                <div className="space-y-1 text-xs">
                  {availableRamOptions.map(({ ram, count }) => {
                    const isChecked = selectedRam.includes(ram);
                    return (
                      <label
                        key={ram}
                        onClick={() => handleRamToggle(ram)}
                        className="flex items-center justify-between text-xs text-[#0F1111] hover:text-[#007185] cursor-pointer py-1 px-1 rounded hover:bg-[#F7F8F8] transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                              isChecked
                                ? 'bg-[#007185] border-[#007185] text-white'
                                : 'border-[#D5D9D9] bg-white'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span>{ram}</span>
                        </div>
                        <span className="text-[11px] text-[#565959]">({count})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Hardware Specifications: Storage */}
            {availableStorageOptions.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-[#E7E7E7]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#565959] flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-[#007185]" />
                  <span>Storage Capacity</span>
                </h4>
                <div className="space-y-1 text-xs">
                  {availableStorageOptions.map(({ storage, count }) => {
                    const isChecked = selectedStorage.includes(storage);
                    return (
                      <label
                        key={storage}
                        onClick={() => handleStorageToggle(storage)}
                        className="flex items-center justify-between text-xs text-[#0F1111] hover:text-[#007185] cursor-pointer py-1 px-1 rounded hover:bg-[#F7F8F8] transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                              isChecked
                                ? 'bg-[#007185] border-[#007185] text-white'
                                : 'border-[#D5D9D9] bg-white'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span>{storage}</span>
                        </div>
                        <span className="text-[11px] text-[#565959]">({count})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Hardware Specifications: Processor */}
            {availableProcessorOptions.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-[#E7E7E7]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#565959]">Processor Family</h4>
                <div className="space-y-1 text-xs">
                  {availableProcessorOptions.map(({ proc, count }) => {
                    const isChecked = selectedProcessors.includes(proc);
                    return (
                      <label
                        key={proc}
                        onClick={() => handleProcessorToggle(proc)}
                        className="flex items-center justify-between text-xs text-[#0F1111] hover:text-[#007185] cursor-pointer py-1 px-1 rounded hover:bg-[#F7F8F8] transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                              isChecked
                                ? 'bg-[#007185] border-[#007185] text-white'
                                : 'border-[#D5D9D9] bg-white'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span>{proc}</span>
                        </div>
                        <span className="text-[11px] text-[#565959]">({count})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Customer Rating */}
            <div className="space-y-2 pt-3 border-t border-[#E7E7E7]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#565959]">
                Customer Reviews
              </h4>
              <div className="space-y-1 text-xs">
                {[4, 3].map((starCount) => (
                  <button
                    key={starCount}
                    onClick={() => setMinRating((prev) => (prev === starCount ? 0 : starCount))}
                    className={`flex items-center gap-1.5 py-1 px-1 rounded hover:bg-stone-50 w-full text-left transition-colors ${
                      minRating === starCount ? 'font-bold text-[#007185] bg-[#007185]/5' : 'text-[#0F1111]'
                    }`}
                  >
                    <div className="flex text-[#FFA41C]">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < starCount ? 'fill-[#FFA41C] text-[#FFA41C]' : 'text-stone-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span>&amp; Up</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Service & Stock */}
            <div className="space-y-2 pt-3 border-t border-[#E7E7E7]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#565959]">
                Fulfillment &amp; Availability
              </h4>
              <label className="flex items-center gap-2 text-xs text-[#0F1111] cursor-pointer hover:text-[#007185]">
                <input
                  type="checkbox"
                  checked={onlyExpress}
                  onChange={(e) => setOnlyExpress(e.target.checked)}
                  className="rounded accent-[#007185]"
                />
                <span className="font-semibold text-[#007185]">Vyntra Express</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-[#0F1111] cursor-pointer hover:text-[#007185]">
                <input
                  type="checkbox"
                  checked={onlyInStock}
                  onChange={(e) => setOnlyInStock(e.target.checked)}
                  className="rounded accent-[#007185]"
                />
                <span>In Stock Only</span>
              </label>
            </div>
          </aside>

          {/* Adaptive Products Section: Adapts dynamically to 1, 2, or 3+ products */}
          <section className="lg:col-span-3 min-w-0">
            {filteredProducts.length === 0 ? (
              /* Empty State */
              <div className="bg-white rounded-2xl border border-[#D5D9D9] p-10 sm:p-14 text-center space-y-4 shadow-2xs">
                <div className="w-16 h-16 rounded-full bg-[#F7F8F8] border border-[#D5D9D9] mx-auto flex items-center justify-center text-[#007185]">
                  <Laptop className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-[#0F1111]">No Electronics Matching Your Selection</h3>
                <p className="text-xs sm:text-sm text-[#565959] max-w-md mx-auto">
                  We could not find any gadgets matching your selected criteria. Try adjusting your
                  filters or searching for a different keyword.
                </p>
                <button
                  onClick={clearAllFilters}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] border border-[#FCD200] rounded-xl text-xs font-bold shadow-xs transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset All Filters</span>
                </button>
              </div>
            ) : filteredProducts.length === 1 ? (
              /* Case 1: SINGLE PRODUCT FEATURED SHOWCASE CARD (Eliminates excessive empty right-side whitespace) */
              (() => {
                const product = filteredProducts[0];
                const formattedPrice =
                  typeof product.price === 'number'
                    ? product.price.toLocaleString('en-IN')
                    : String(product.price);
                const formattedOriginalPrice =
                  typeof product.originalPrice === 'number'
                    ? product.originalPrice.toLocaleString('en-IN')
                    : String(product.originalPrice);
                const savings =
                  product.originalPrice && product.originalPrice > product.price
                    ? (product.originalPrice - product.price).toLocaleString('en-IN')
                    : null;
                const ram = extractRamSpec(product);
                const storages = extractStorageSpec(product);
                const proc = extractProcessorSpec(product);
                const isSaved = isInWishlist(product.id);
                const isAdded = Boolean(addedItemIds[product.id]);

                return (
                  <div className="w-full bg-white rounded-2xl border border-[#E7E7E7] hover:border-[#FF9900] hover:shadow-md transition-all duration-300 p-5 sm:p-6 lg:p-7 relative overflow-hidden">
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
                          boardIds: ['all', 'tech'],
                        })
                      }
                      className="absolute top-5 right-5 z-10 p-2 rounded-full bg-white/90 border border-stone-200/80 shadow-xs hover:bg-white hover:scale-110 active:scale-95 transition-all"
                      title={isSaved ? 'Remove from Wishlist' : 'Add to Wishlist'}
                      aria-label={isSaved ? `Remove ${product.title} from Wishlist` : `Add ${product.title} to Wishlist`}
                    >
                      <Heart
                        className={`h-5 w-5 transition-colors ${
                          isSaved ? 'fill-[#E01A22] text-[#E01A22]' : 'text-stone-400 hover:text-[#E01A22]'
                        }`}
                      />
                    </button>

                    {/* Wide 2-Column Balanced Showcase */}
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6 lg:gap-8">
                      {/* Left: Centered Square Image Container */}
                      <Link href={`/products/${product.slug}`} className="block shrink-0 w-full md:w-72 lg:w-80">
                        <div className="relative aspect-square w-full rounded-2xl bg-white border border-stone-200/80 p-5 flex items-center justify-center overflow-hidden group">
                          <Image
                            src={product.image}
                            alt={product.title}
                            fill
                            unoptimized
                            className="object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                            sizes="(max-width: 768px) 100vw, 320px"
                          />
                          {/* Choice / Launch Ribbon */}
                          {product.isBestSeller && (
                            <span className="absolute top-3 left-3 bg-[#E67A00] text-white text-[10px] font-black px-2.5 py-0.5 rounded-xs tracking-wider uppercase shadow-xs">
                              Best Seller
                            </span>
                          )}
                          {product.badge === 'New Launch' && (
                            <span className="absolute top-3 left-3 bg-[#007185] text-white text-[10px] font-black px-2.5 py-0.5 rounded-xs tracking-wider uppercase shadow-xs">
                              New Launch
                            </span>
                          )}
                          {product.isAmazonChoice && (
                            <span className="absolute top-3 left-3 bg-[#232F3E] text-white text-[10px] font-black px-2.5 py-0.5 rounded-xs tracking-wider uppercase shadow-xs">
                              Vyntra&apos;s Choice
                            </span>
                          )}
                        </div>
                      </Link>

                      {/* Right: Specifications, Details, Pricing & Buy Controls */}
                      <div className="flex-1 w-full space-y-3.5">
                        {/* Brand & Category Hierarchy */}
                        <div className="flex items-center gap-2 flex-wrap pr-10">
                          <span className="text-xs font-bold text-[#565959] uppercase tracking-wider">
                            {product.brand}
                          </span>
                          <span className="text-stone-300">•</span>
                          <span className="text-xs font-semibold text-[#007185] bg-[#007185]/10 px-2.5 py-0.5 rounded-full">
                            {product.subCategory || 'Laptops & Ultrabooks'}
                          </span>
                          <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                            100% Genuine
                          </span>
                        </div>

                        {/* Title with comfortable 3-4 line readability */}
                        <Link
                          href={`/products/${product.slug}`}
                          className="text-base sm:text-lg lg:text-xl font-bold text-[#0F1111] hover:text-[#007185] hover:underline line-clamp-3 sm:line-clamp-4 leading-snug block transition-colors"
                          title={product.title}
                        >
                          {product.title}
                        </Link>

                        {/* Rating Stars & Authenticity */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {(product.reviews || 0) > 0 ? (
                            <>
                              <div className="flex items-center text-[#FFA41C]">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${
                                      i < Math.floor(product.rating)
                                        ? 'fill-[#FFA41C] text-[#FFA41C]'
                                        : 'text-stone-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-xs text-[#007185] font-semibold hover:underline cursor-pointer">
                                {product.reviews.toLocaleString('en-IN')} ratings
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-[#565959] font-medium flex items-center gap-1.5">
                              <span className="inline-block w-2 h-2 rounded-full bg-[#007600]" />
                              <span>Brand Verified • Official Manufacturer Packaging</span>
                            </span>
                          )}
                        </div>

                        {/* Key Hardware Spec Tags */}
                        <div className="flex items-center gap-2 flex-wrap pt-0.5">
                          {ram && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-stone-100 text-[#0F1111] text-xs font-medium border border-stone-200">
                              <Cpu className="w-3.5 h-3.5 text-[#007185]" />
                              <span>{ram} RAM</span>
                            </span>
                          )}
                          {storages.length > 0 && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-stone-100 text-[#0F1111] text-xs font-medium border border-stone-200">
                              <HardDrive className="w-3.5 h-3.5 text-[#007185]" />
                              <span>{storages.join(' / ')}</span>
                            </span>
                          )}
                          {proc && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-stone-100 text-[#0F1111] text-xs font-medium border border-stone-200">
                              <span>{proc}</span>
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-stone-100 text-[#0F1111] text-xs font-medium border border-stone-200">
                            <span>Windows 11 Home</span>
                          </span>
                        </div>

                        {/* Price Hierarchy */}
                        <div className="pt-1">
                          {product.isLimitedDeal && (
                            <span className="inline-block bg-[#CC0C39] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-xs mb-1">
                              Limited time deal
                            </span>
                          )}
                          <div className="flex items-baseline gap-2.5 flex-wrap">
                            <span className="text-sm font-semibold text-[#0F1111] self-start mt-0.5">&#8377;</span>
                            <span className="text-2xl sm:text-3xl font-black text-[#0F1111] leading-none tracking-tight">
                              {formattedPrice}
                            </span>
                            {product.originalPrice && product.originalPrice > product.price && (
                              <>
                                <span className="text-xs sm:text-sm text-[#565959]">
                                  M.R.P: <span className="line-through">&#8377;{formattedOriginalPrice}</span>
                                </span>
                                <span className="text-xs sm:text-sm font-bold text-[#CC0C39]">
                                  ({product.discount})
                                </span>
                              </>
                            )}
                          </div>
                          {savings && (
                            <p className="text-xs text-[#007600] font-bold mt-1">
                              You save &#8377;{savings} ({product.discount})
                            </p>
                          )}
                        </div>

                        {/* Vyntra Express Delivery & Warranty */}
                        <div className="space-y-1 text-xs text-[#565959] pt-1">
                          <span className="font-extrabold text-[#007185] tracking-tight flex items-center gap-1.5">
                            <span className="inline-block w-2 h-2 rounded-full bg-[#00A8E8]" />
                            <span>Vyntra Express</span>
                            <span className="text-stone-300">•</span>
                            <span className="text-[#0F1111] font-semibold">FREE Delivery {product.deliveryDate || 'Tomorrow, 11 AM'}</span>
                          </span>
                          <p className="text-[11px] text-[#565959]">
                            Eligible for 7-Day Replacement Guarantee &amp; 1 Year Brand Warranty
                          </p>
                        </div>

                        {/* Action CTA Buttons */}
                        <div className="pt-3 flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleAddToCart(product)}
                            className={`px-8 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm active:scale-98 ${
                              isAdded
                                ? 'bg-[#007600] text-white border border-[#007600]'
                                : 'bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] border border-[#FCD200]'
                            }`}
                          >
                            {isAdded ? (
                              <>
                                <Check className="h-4 w-4" />
                                <span>Added to Cart</span>
                              </>
                            ) : (
                              <>
                                <ShoppingCart className="h-4 w-4" />
                                <span>Add to Cart</span>
                              </>
                            )}
                          </button>

                          <Link
                            href={`/products/${product.slug}`}
                            className="px-5 py-2.5 rounded-xl bg-white hover:bg-stone-50 text-[#0F1111] font-semibold text-xs sm:text-sm border border-[#D5D9D9] transition-all flex items-center gap-1.5 shadow-2xs"
                          >
                            <span>View Full Specs</span>
                            <ChevronRight className="w-4 h-4 text-[#565959]" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : filteredProducts.length === 2 ? (
              /* Case 2: 2 PRODUCTS = 2 BALANCED FULL-WIDTH COLUMNS */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {filteredProducts.map((product) => (
                  <CategoryProductCard
                    key={product.id}
                    product={product}
                    imageAspectRatio="square"
                    fulfillmentBadge="Vyntra Express"
                    titleClamp="4"
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
                        boardIds: ['all', 'tech'],
                      })
                    }
                    onAddToCart={(p) => handleAddToCart(p)}
                  />
                ))}
              </div>
            ) : (
              /* Case 3: 3+ PRODUCTS = RESPONSIVE 3-COLUMN GRID */
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredProducts.map((product) => (
                  <CategoryProductCard
                    key={product.id}
                    product={product}
                    imageAspectRatio="square"
                    fulfillmentBadge="Vyntra Express"
                    titleClamp="3"
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
                        boardIds: ['all', 'tech'],
                      })
                    }
                    onAddToCart={(p) => handleAddToCart(p)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Mobile Drawer Filter Modal */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="relative ml-auto w-full max-w-xs bg-white h-full shadow-2xl p-5 overflow-y-auto z-10 flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
                <span className="font-bold text-sm text-[#0F1111] flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#007185]" />
                  Refine Filters
                </span>
                <button
                  onClick={() => setMobileFiltersOpen(false)}
                  className="p-1 rounded-full text-[#565959] hover:text-[#0F1111]"
                  title="Close filters"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Brands */}
              {availableBrandsWithCount.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#565959] mb-2">
                    Brands
                  </h4>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {availableBrandsWithCount.map(({ name, count }) => {
                      const isChecked = selectedBrands.includes(name);
                      return (
                        <label
                          key={name}
                          onClick={() => handleBrandToggle(name)}
                          className="flex items-center justify-between text-xs py-1"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center ${
                                isChecked
                                  ? 'bg-[#007185] border-[#007185] text-white'
                                  : 'border-[#D5D9D9] bg-white'
                              }`}
                            >
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="font-medium text-[#0F1111]">{name}</span>
                          </div>
                          <span className="text-[#565959]">({count})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Price */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#565959] mb-2">
                  Price
                </h4>
                <div className="space-y-1 text-xs text-[#0F1111]">
                  {[
                    { id: 'all', label: 'All Prices' },
                    { id: 'under-10000', label: 'Under ₹10,000' },
                    { id: '10000-30000', label: '₹10,000 - ₹30,000' },
                    { id: '30000-60000', label: '₹30,000 - ₹60,000' },
                    { id: '60000-100000', label: '₹60,000 - ₹1,00,000' },
                    { id: 'over-100000', label: 'Over ₹1,00,000' },
                  ].map((opt) => (
                    <label key={opt.id} className="flex items-center gap-2 py-0.5">
                      <input
                        type="radio"
                        name="mobilePriceRange"
                        checked={priceRange === opt.id}
                        onChange={() => {
                          setPriceRange(opt.id);
                          setAppliedCustomPrice({ min: null, max: null });
                        }}
                        className="accent-[#007185]"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* RAM */}
              {availableRamOptions.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#565959] mb-2">
                    RAM / Memory
                  </h4>
                  <div className="space-y-1 text-xs">
                    {availableRamOptions.map(({ ram, count }) => {
                      const isChecked = selectedRam.includes(ram);
                      return (
                        <label
                          key={ram}
                          onClick={() => handleRamToggle(ram)}
                          className="flex items-center justify-between text-xs py-1"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center ${
                                isChecked
                                  ? 'bg-[#007185] border-[#007185] text-white'
                                  : 'border-[#D5D9D9] bg-white'
                              }`}
                            >
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="font-medium text-[#0F1111]">{ram}</span>
                          </div>
                          <span className="text-[#565959]">({count})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Service & Stock */}
              <div className="pt-2 border-t border-[#E7E7E7] space-y-2">
                <label className="flex items-center gap-2 text-xs text-[#0F1111]">
                  <input
                    type="checkbox"
                    checked={onlyExpress}
                    onChange={(e) => setOnlyExpress(e.target.checked)}
                    className="accent-[#007185] rounded"
                  />
                  <span className="font-semibold text-[#007185]">Vyntra Express</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-[#0F1111]">
                  <input
                    type="checkbox"
                    checked={onlyInStock}
                    onChange={(e) => setOnlyInStock(e.target.checked)}
                    className="accent-[#007185] rounded"
                  />
                  <span>In Stock Only</span>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E7E7E7] flex gap-2">
              <button
                onClick={clearAllFilters}
                className="w-1/2 py-2 border border-[#D5D9D9] hover:bg-stone-50 rounded-xl text-xs font-semibold text-[#565959]"
              >
                Reset All
              </button>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="w-1/2 py-2 bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] border border-[#FCD200] rounded-xl text-xs font-bold shadow-xs"
              >
                Apply ({filteredProducts.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ElectronicsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007185]"></div>
        </div>
      }
    >
      <ElectronicsContent />
    </Suspense>
  );
}
