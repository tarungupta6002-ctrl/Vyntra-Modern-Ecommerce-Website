'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { matchesSearchQuery, DEPARTMENT_WORDS } from '@/lib/search';
import {
  Refrigerator,
  WashingMachine,
  Wind,
  Flame,
  Home,
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
  Layers,
  Wrench,
} from 'lucide-react';
import { CategoryProductCard } from '@/components/products/category-product-card';
import { CategoryProductItem, useCategoryProducts } from '@/hooks/use-category-products';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';
import {
  FALLBACK_APPLIANCES,
  APPLIANCE_SUBCATEGORIES,
  APPLIANCE_BRANDS,
  APPLIANCE_ENERGY_RATINGS,
} from '@/data/appliances-fallback';

function AppliancesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL query params
  const initialSubCat = searchParams.get('subcategory') || 'all';
  const initialBrand = searchParams.get('brand') || '';
  const initialSearch = searchParams.get('q') || searchParams.get('search') || '';

  // State
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>(initialSubCat);
  const [selectedBrands, setSelectedBrands] = useState<string[]>(initialBrand ? [initialBrand] : []);
  const [selectedEnergyRatings, setSelectedEnergyRatings] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<string>('all');
  const [customMinPrice, setCustomMinPrice] = useState<string>('');
  const [customMaxPrice, setCustomMaxPrice] = useState<string>('');
  const [minRating, setMinRating] = useState<number>(0);
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [onlyPrime, setOnlyPrime] = useState<boolean>(false);
  const [freeInstallationOnly, setFreeInstallationOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('featured');
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState<boolean>(false);
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({});

  const { addItem, openCart } = useCartStore();
  const { toggleItem, isInWishlist } = useWishlistStore();

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

  const handleAddToCart = (product: CategoryProductItem) => {
    addItem({
      id: product.id,
      productId: product.id,
      title: product.title,
      brand: product.brand,
      variantId: `var-${product.id}`,
      size: product.sizes?.[0] || 'Standard Edition',
      color: 'Classic Inox',
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
    categoryKey: 'appliances',
    extraKeywords: [
      'refrigerator',
      'fridge',
      'washing machine',
      'washer',
      'dryer',
      'air conditioner',
      'ac',
      'microwave',
      'chimney',
      'dishwasher',
      'water purifier',
      'geyser',
      'vacuum cleaner',
      'oven',
    ],
  });

  // Combine live database items with realistic Amazon India fallback appliances
  const products: CategoryProductItem[] = useMemo(() => {
    const rawList = [...(liveDbProducts || [])];
    
    // Add fallback items if not already present in live database
    FALLBACK_APPLIANCES.forEach((fb) => {
      const exists = rawList.some(
        (p) =>
          p.id === fb.id ||
          p.slug === fb.slug ||
          p.title.toLowerCase() === fb.title.toLowerCase()
      );
      if (!exists) {
        rawList.push(fb);
      }
    });

    // Strictly filter for appliances only (exclude pure mobiles and fashion)
    return rawList.filter((p) => {
      const cat = (p.category || '').toLowerCase();
      const sub = (p.subcategory || p.subCategory || '').toLowerCase();
      const title = (p.title || '').toLowerCase();

      const isMobile =
        cat === 'mobiles' ||
        cat === 'smartphones' ||
        sub === 'mobiles' ||
        sub === 'smartphones' ||
        title.includes('iphone') ||
        title.includes('galaxy s2') ||
        /\b(5g phone|smartphone)\b/i.test(title);

      const isApparel =
        cat.includes('apparel') ||
        cat.includes('fashion') ||
        cat.includes('clothing') ||
        cat.includes('footwear');

      return !isMobile && !isApparel;
    });
  }, [liveDbProducts]);

  // Derived brands count directly from products
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

  // Active filter count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedSubCategory !== 'all') count++;
    if (selectedBrands.length > 0) count += selectedBrands.length;
    if (selectedEnergyRatings.length > 0) count += selectedEnergyRatings.length;
    if (priceRange !== 'all') count++;
    if (customMinPrice || customMaxPrice) count++;
    if (minRating > 0) count++;
    if (onlyInStock) count++;
    if (onlyPrime) count++;
    if (freeInstallationOnly) count++;
    if (searchQuery.trim().length > 0) count++;
    return count;
  }, [
    selectedSubCategory,
    selectedBrands,
    selectedEnergyRatings,
    priceRange,
    customMinPrice,
    customMaxPrice,
    minRating,
    onlyInStock,
    onlyPrime,
    freeInstallationOnly,
    searchQuery,
  ]);

  const clearAllFilters = () => {
    setSelectedSubCategory('all');
    setSelectedBrands([]);
    setSelectedEnergyRatings([]);
    setPriceRange('all');
    setCustomMinPrice('');
    setCustomMaxPrice('');
    setMinRating(0);
    setOnlyInStock(false);
    setOnlyPrime(false);
    setFreeInstallationOnly(false);
    setSearchQuery('');
  };

  const handleBrandToggle = (brandName: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brandName) ? prev.filter((b) => b !== brandName) : [...prev, brandName]
    );
  };

  const handleEnergyToggle = (rating: string) => {
    setSelectedEnergyRatings((prev) =>
      prev.includes(rating) ? prev.filter((r) => r !== rating) : [...prev, rating]
    );
  };

  // Filtered and Sorted Products
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Subcategory Filter
    if (selectedSubCategory !== 'all') {
      list = list.filter((p) => {
        const sub = (p.subcategory || p.subCategory || '').toLowerCase();
        const cat = (p.category || '').toLowerCase();
        const title = (p.title || '').toLowerCase();

        if (selectedSubCategory === 'refrigerators') {
          return sub.includes('refrigerator') || cat.includes('refrigerator') || title.includes('refrigerator') || title.includes('fridge');
        }
        if (selectedSubCategory === 'washing-machines') {
          return sub.includes('washing') || cat.includes('washing') || title.includes('washing machine') || title.includes('washer');
        }
        if (selectedSubCategory === 'air-conditioners') {
          return sub.includes('air-conditioner') || cat.includes('air-conditioner') || title.includes('air conditioner') || /\bac\b/i.test(title);
        }
        if (selectedSubCategory === 'kitchen-appliances') {
          return (
            sub.includes('kitchen') ||
            title.includes('microwave') ||
            title.includes('chimney') ||
            title.includes('air fryer') ||
            title.includes('induction') ||
            title.includes('oven')
          );
        }
        if (selectedSubCategory === 'home-appliances') {
          return (
            sub.includes('home') ||
            title.includes('water purifier') ||
            title.includes('vacuum') ||
            title.includes('geyser')
          );
        }

        return sub === selectedSubCategory.toLowerCase() || cat === selectedSubCategory.toLowerCase();
      });
    }

    // Brand Filter
    if (selectedBrands.length > 0) {
      list = list.filter((p) =>
        selectedBrands.some((b) => b.toLowerCase() === (p.brand || '').toLowerCase())
      );
    }

    // Energy Star Rating Filter
    if (selectedEnergyRatings.length > 0) {
      list = list.filter((p) => {
        const specsText = JSON.stringify(p.specs || {}).toLowerCase();
        const titleText = (p.title || '').toLowerCase();
        return selectedEnergyRatings.some((r) => {
          const lowerR = r.toLowerCase();
          return specsText.includes(lowerR) || titleText.includes(lowerR);
        });
      });
    }

    // Search Query
    if (searchQuery.trim()) {
      list = list.filter((p) =>
        matchesSearchQuery(
          searchQuery,
          [p.title, p.brand, p.subcategory, p.subCategory, ...Object.values(p.specs || {}).map(String)],
          DEPARTMENT_WORDS.appliances
        )
      );
    }

    // Free Installation Only
    if (freeInstallationOnly) {
      list = list.filter(
        (p) =>
          p.deliveryDate?.toLowerCase().includes('installation') ||
          JSON.stringify(p.specs || {}).toLowerCase().includes('installation')
      );
    }

    // Price Range Filter
    if (priceRange === 'under-10000') {
      list = list.filter((p) => p.price < 10000);
    } else if (priceRange === '10000-25000') {
      list = list.filter((p) => p.price >= 10000 && p.price <= 25000);
    } else if (priceRange === '25000-50000') {
      list = list.filter((p) => p.price >= 25000 && p.price <= 50000);
    } else if (priceRange === '50000-100000') {
      list = list.filter((p) => p.price >= 50000 && p.price <= 100000);
    } else if (priceRange === 'over-100000') {
      list = list.filter((p) => p.price > 100000);
    }

    // Custom Price Filter
    if (customMinPrice && !isNaN(Number(customMinPrice))) {
      list = list.filter((p) => p.price >= Number(customMinPrice));
    }
    if (customMaxPrice && !isNaN(Number(customMaxPrice))) {
      list = list.filter((p) => p.price <= Number(customMaxPrice));
    }

    // Customer Rating Filter
    if (minRating > 0) {
      list = list.filter((p) => (p.rating || 0) >= minRating);
    }

    // In Stock Only
    if (onlyInStock) {
      list = list.filter((p) => p.inStock);
    }

    // Prime Only
    if (onlyPrime) {
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
    selectedEnergyRatings,
    searchQuery,
    freeInstallationOnly,
    priceRange,
    customMinPrice,
    customMaxPrice,
    minRating,
    onlyInStock,
    onlyPrime,
    sortBy,
  ]);

  const renderSubCategoryIcon = (icon: string) => {
    switch (icon) {
      case 'Refrigerator':
        return <Refrigerator className="w-5 h-5" />;
      case 'WashingMachine':
        return <WashingMachine className="w-5 h-5" />;
      case 'Wind':
        return <Wind className="w-5 h-5" />;
      case 'Flame':
        return <Flame className="w-5 h-5" />;
      case 'Home':
        return <Home className="w-5 h-5" />;
      default:
        return <Sparkles className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A]">
      {/* 1. Breadcrumb Bar */}
      <div className="w-full bg-[#FAFAFA] border-b border-[#E7E7E7]">
        <div className="w-full max-w-[1400px] mx-auto px-4 py-2.5 text-xs text-[#565959] flex items-center gap-1.5 flex-wrap">
          <Link href="/" className="hover:text-[#007185] hover:underline">
            Home
          </Link>
          <ChevronRight className="h-3 w-3 text-[#888888]" />
          <Link href="/appliances" className="hover:text-[#007185] hover:underline font-semibold text-[#0F1111]">
            Appliances
          </Link>
          {selectedSubCategory !== 'all' && (
            <>
              <ChevronRight className="h-3 w-3 text-[#888888]" />
              <span className="font-bold text-[#007185]">
                {APPLIANCE_SUBCATEGORIES.find((s) => s.slug === selectedSubCategory)?.name ||
                  selectedSubCategory}
              </span>
            </>
          )}
        </div>
      </div>

      {/* 2. Page Header & Promotional Hero */}
      <section className="w-full max-w-[1400px] mx-auto px-4 pt-4 pb-2">
        {/* Title Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#007185] mb-1">
              <Refrigerator className="h-4 w-4" />
              <span>Official Major &amp; Home Appliances Department</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-headline text-[#0F1111] tracking-tight">
              Major &amp; Home Appliances
            </h1>
            <p className="text-xs sm:text-sm text-[#565959] mt-0.5">
              Explore 5-star energy efficient refrigerators, smart washing machines, inverter ACs, and kitchen essentials with certified installation.
            </p>
          </div>

          {/* Quick Stats Badges */}
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#E7E7E7] text-[#0F1111] font-medium shadow-2xs">
              <Wrench className="h-3.5 w-3.5 text-[#007185]" />
              Free Certified Installation
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#E7E7E7] text-[#0F1111] font-medium shadow-2xs">
              <ShieldCheck className="h-3.5 w-3.5 text-[#007600]" />
              10-Year Motor Warranty
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#E7E7E7] text-[#0F1111] font-medium shadow-2xs">
              <Truck className="h-3.5 w-3.5 text-[#E67A00]" />
              Scheduled Delivery
            </span>
          </div>
        </div>

        {/* Dynamic Promotional Hero Banner (Amazon India Festive Style) */}
        <div className="relative w-full rounded-2xl overflow-hidden shadow-md bg-[#0F1111] transition-all duration-500 mb-6 border border-white/10 group">
          <div
            style={{
              background: 'linear-gradient(135deg, #1C2331 0%, #2E384D 50%, #151B26 100%)',
            }}
            className="w-full relative min-h-[220px] sm:min-h-[240px] p-6 sm:p-8 md:p-10 text-white flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden"
          >
            {/* Ambient lighting glows */}
            <div
              aria-hidden="true"
              className="absolute -right-12 -bottom-12 w-96 h-96 rounded-full bg-[#FFD814]/10 blur-3xl pointer-events-none"
            />
            <div
              aria-hidden="true"
              className="absolute right-1/3 top-0 w-72 h-72 rounded-full bg-[#007185]/20 blur-3xl pointer-events-none"
            />

            {/* Content */}
            <div className="space-y-3 max-w-2xl z-10 w-full">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-xs bg-[#FFD814] text-[#0F1111]">
                  <Sparkles className="h-3 w-3" />
                  Great Indian Appliance Fest
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-200 bg-white/10 px-2.5 py-0.5 rounded-full backdrop-blur-xs border border-white/10">
                  <Wrench className="h-3.5 w-3.5 text-[#FFD814]" />
                  Free Scheduled Installation &amp; Demo
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white leading-tight">
                Upgrade Your Home: Inverter ACs, Smart Refrigerators &amp; Front-Load Washers
              </h2>

              <p className="text-sm sm:text-base font-bold text-[#FFD814] flex items-center gap-2">
                <Zap className="h-4 w-4 shrink-0" />
                <span>Up to 55% Off • Extra ₹5,000 Exchange Bonus on Old Appliances</span>
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSubCategory('refrigerators');
                    window.scrollTo({ top: 400, behavior: 'smooth' });
                  }}
                  className="px-4 py-2 bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] font-bold rounded-lg shadow-xs transition-colors"
                >
                  Explore Refrigerators
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSubCategory('washing-machines');
                    window.scrollTo({ top: 400, behavior: 'smooth' });
                  }}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg border border-white/20 transition-colors"
                >
                  Washing Machines
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSubCategory('air-conditioners');
                    window.scrollTo({ top: 400, behavior: 'smooth' });
                  }}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg border border-white/20 transition-colors"
                >
                  Air Conditioners
                </button>
              </div>
            </div>

            {/* Quick Hero Banner Badge */}
            <div className="relative shrink-0 hidden md:flex flex-col items-center justify-center p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs w-64 text-center">
              <span className="text-xs uppercase font-bold text-stone-300">Certified Assurance</span>
              <span className="text-2xl font-black text-white mt-1">10-Year Warranty</span>
              <p className="text-[11px] text-stone-300 mt-1">On Digital Inverter Compressors &amp; EcoSilence Motors</p>
              <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[#FFD814] font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>100% Brand Backed</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Subcategory Quick Selection Carousel */}
        <div className="mb-6 overflow-x-auto pb-2 scrollbar-none">
          <div className="flex items-center gap-2.5 min-w-max">
            {APPLIANCE_SUBCATEGORIES.map((cat) => {
              const isSelected = selectedSubCategory === cat.slug;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedSubCategory(cat.slug);
                    const params = new URLSearchParams(searchParams.toString());
                    if (cat.slug === 'all') {
                      params.delete('subcategory');
                    } else {
                      params.set('subcategory', cat.slug);
                    }
                    router.push(`/appliances?${params.toString()}`);
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all duration-200 shadow-2xs ${
                    isSelected
                      ? 'bg-[#007185] text-white border-[#007185] shadow-xs scale-102'
                      : 'bg-white text-[#0F1111] border-[#D5D9D9] hover:border-[#007185] hover:bg-stone-50'
                  }`}
                >
                  <span className={isSelected ? 'text-white' : 'text-[#007185]'}>
                    {renderSubCategoryIcon(cat.icon)}
                  </span>
                  <span>{cat.name}</span>
                  {cat.badge && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-[#FFD814] text-[#0F1111]'
                          : 'bg-[#B12704]/10 text-[#B12704]'
                      }`}
                    >
                      {cat.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Main Two-Column Layout (Filters Left, Products Right) */}
      <div className="w-full max-w-[1400px] mx-auto px-4 pb-16">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* Mobile Filter Trigger */}
          <div className="w-full lg:hidden flex items-center justify-between bg-white p-3 rounded-lg border border-[#D5D9D9] shadow-2xs">
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="flex items-center gap-2 text-xs font-bold text-[#0F1111]"
            >
              <SlidersHorizontal className="h-4 w-4 text-[#007185]" />
              <span>Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}</span>
            </button>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-[#007185] hover:underline font-medium"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Left Sidebar Filters */}
          <aside
            className={`fixed inset-y-0 left-0 z-50 w-[300px] bg-white p-5 overflow-y-auto shadow-2xl transition-transform duration-300 lg:static lg:w-[260px] lg:shrink-0 lg:p-0 lg:bg-transparent lg:shadow-none lg:overflow-visible lg:z-auto ${
              mobileFiltersOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            }`}
          >
            {/* Mobile Sidebar Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E7E7E7] mb-4 lg:hidden">
              <h3 className="font-bold text-sm text-[#0F1111]">Filter Appliances</h3>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="p-1 rounded-md text-stone-500 hover:text-stone-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-white rounded-xl border border-[#E7E7E7] p-4 shadow-2xs space-y-6">
              
              {/* Header: Refine Selection */}
              <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#0F1111]">
                  Refine Selection
                </h4>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="text-xs text-[#007185] hover:underline font-semibold"
                  >
                    Reset ({activeFiltersCount})
                  </button>
                )}
              </div>

              {/* Free Installation & Service Badge Filter */}
              <div>
                <h5 className="text-xs font-bold text-[#0F1111] mb-2.5">Installation &amp; Warranty</h5>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#0F1111] hover:text-[#007185]">
                  <input
                    type="checkbox"
                    checked={freeInstallationOnly}
                    onChange={(e) => setFreeInstallationOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-[#D5D9D9] text-[#007185] focus:ring-[#007185]"
                  />
                  <span>Free Certified Installation</span>
                </label>
              </div>

              {/* Energy Star Ratings (BEE Efficiency) */}
              <div>
                <h5 className="text-xs font-bold text-[#0F1111] mb-2.5">Energy Star Rating (BEE)</h5>
                <div className="space-y-2">
                  {APPLIANCE_ENERGY_RATINGS.map((rating) => {
                    const isChecked = selectedEnergyRatings.includes(rating);
                    return (
                      <label
                        key={rating}
                        className="flex items-center gap-2 cursor-pointer text-xs text-[#0F1111] hover:text-[#007185]"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleEnergyToggle(rating)}
                          className="h-4 w-4 rounded border-[#D5D9D9] text-[#007185] focus:ring-[#007185]"
                        />
                        <span className="font-semibold">{rating}</span>
                        <span className="text-[11px] text-[#007600] font-bold">
                          {rating === '5 Star' ? '★★★★★ (Highest Savings)' : rating === '4 Star' ? '★★★★☆' : '★★★☆☆'}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Brands Filter */}
              <div>
                <h5 className="text-xs font-bold text-[#0F1111] mb-2.5">Brand</h5>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                  {availableBrandsWithCount.length > 0 ? (
                    availableBrandsWithCount.map(({ name, count }) => {
                      const isChecked = selectedBrands.includes(name);
                      return (
                        <label
                          key={name}
                          className="flex items-center justify-between cursor-pointer text-xs text-[#0F1111] hover:text-[#007185]"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleBrandToggle(name)}
                              className="h-4 w-4 rounded border-[#D5D9D9] text-[#007185] focus:ring-[#007185]"
                            />
                            <span>{name}</span>
                          </div>
                          <span className="text-[11px] text-[#565959]">({count})</span>
                        </label>
                      );
                    })
                  ) : (
                    APPLIANCE_BRANDS.filter((b) => b !== 'All Brands').map((b) => (
                      <label
                        key={b}
                        className="flex items-center gap-2 cursor-pointer text-xs text-[#0F1111] hover:text-[#007185]"
                      >
                        <input
                          type="checkbox"
                          checked={selectedBrands.includes(b)}
                          onChange={() => handleBrandToggle(b)}
                          className="h-4 w-4 rounded border-[#D5D9D9] text-[#007185] focus:ring-[#007185]"
                        />
                        <span>{b}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <h5 className="text-xs font-bold text-[#0F1111] mb-2.5">Price</h5>
                <div className="space-y-1.5 text-xs text-[#0F1111]">
                  {[
                    { id: 'all', label: 'All Prices' },
                    { id: 'under-10000', label: 'Under ₹10,000' },
                    { id: '10000-25000', label: '₹10,000 - ₹25,000' },
                    { id: '25000-50000', label: '₹25,000 - ₹50,000' },
                    { id: '50000-100000', label: '₹50,000 - ₹1,00,000' },
                    { id: 'over-100000', label: 'Over ₹1,00,000' },
                  ].map((range) => (
                    <label key={range.id} className="flex items-center gap-2 cursor-pointer hover:text-[#007185]">
                      <input
                        type="radio"
                        name="price-filter"
                        checked={priceRange === range.id}
                        onChange={() => {
                          setPriceRange(range.id);
                          setCustomMinPrice('');
                          setCustomMaxPrice('');
                        }}
                        className="h-3.5 w-3.5 text-[#007185] focus:ring-[#007185]"
                      />
                      <span>{range.label}</span>
                    </label>
                  ))}
                </div>

                {/* Custom Price Range */}
                <div className="mt-3 pt-3 border-t border-[#F0F2F2] flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="₹ Min"
                    value={customMinPrice}
                    onChange={(e) => {
                      setCustomMinPrice(e.target.value);
                      setPriceRange('custom');
                    }}
                    className="w-1/2 px-2 py-1 text-xs border border-[#D5D9D9] rounded-md focus:outline-none focus:border-[#007185]"
                  />
                  <span className="text-xs text-[#565959]">-</span>
                  <input
                    type="number"
                    placeholder="₹ Max"
                    value={customMaxPrice}
                    onChange={(e) => {
                      setCustomMaxPrice(e.target.value);
                      setPriceRange('custom');
                    }}
                    className="w-1/2 px-2 py-1 text-xs border border-[#D5D9D9] rounded-md focus:outline-none focus:border-[#007185]"
                  />
                </div>
              </div>

              {/* Customer Rating */}
              <div>
                <h5 className="text-xs font-bold text-[#0F1111] mb-2.5">Customer Reviews</h5>
                <div className="space-y-1.5 text-xs">
                  {[4, 3].map((stars) => (
                    <button
                      key={stars}
                      onClick={() => setMinRating(minRating === stars ? 0 : stars)}
                      className={`flex items-center gap-1.5 w-full text-left py-1 hover:text-[#007185] ${
                        minRating === stars ? 'text-[#007185] font-bold' : 'text-[#0F1111]'
                      }`}
                    >
                      <div className="flex items-center text-[#FFA41C]">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < stars ? 'fill-[#FFA41C]' : 'stroke-stone-300 text-stone-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span>&amp; Up</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Fulfillment & Delivery */}
              <div>
                <h5 className="text-xs font-bold text-[#0F1111] mb-2.5">Fulfillment &amp; Availability</h5>
                <div className="space-y-2 text-xs text-[#0F1111]">
                  <label className="flex items-center gap-2 cursor-pointer hover:text-[#007185]">
                    <input
                      type="checkbox"
                      checked={onlyPrime}
                      onChange={(e) => setOnlyPrime(e.target.checked)}
                      className="h-4 w-4 rounded border-[#D5D9D9] text-[#007185] focus:ring-[#007185]"
                    />
                    <span className="font-extrabold text-[#007185] flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00A8E8]" />
                      Vyntra Express
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-[#007185]">
                    <input
                      type="checkbox"
                      checked={onlyInStock}
                      onChange={(e) => setOnlyInStock(e.target.checked)}
                      className="h-4 w-4 rounded border-[#D5D9D9] text-[#007185] focus:ring-[#007185]"
                    />
                    <span>Include Out of Stock</span>
                  </label>
                </div>
              </div>

            </div>
          </aside>

          {/* Right Product Grid Column */}
          <main className="flex-1 w-full min-w-0">
            {/* Header: Results Count + Sort Dropdown */}
            <div className="bg-white rounded-xl border border-[#E7E7E7] px-4 py-3 mb-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm text-[#0F1111] font-medium">
                  Showing <span className="font-bold text-[#0F1111]">{filteredProducts.length}</span> appliances
                  {selectedSubCategory !== 'all' && (
                    <> in <span className="font-semibold text-[#007185]">{APPLIANCE_SUBCATEGORIES.find((s) => s.slug === selectedSubCategory)?.name}</span></>
                  )}
                  {searchQuery && (
                    <> for <span className="font-semibold text-[#B12704]">&ldquo;{searchQuery}&rdquo;</span></>
                  )}
                </span>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="text-xs text-[#007185] hover:underline font-semibold ml-2"
                  >
                    Clear all filters
                  </button>
                )}
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2 shrink-0">
                <label htmlFor="appliances-sort" className="text-xs text-[#565959] whitespace-nowrap">
                  Sort by:
                </label>
                <select
                  id="appliances-sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-xs bg-[#F0F2F2] hover:bg-[#E3E6E6] border border-[#D5D9D9] rounded-lg px-2.5 py-1.5 text-[#0F1111] font-medium focus:outline-none focus:border-[#007185] cursor-pointer"
                >
                  <option value="featured">Featured Deals</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Avg. Customer Review</option>
                  <option value="newest">Newest Arrivals</option>
                </select>
              </div>
            </div>

            {/* Product Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-[#E7E7E7] p-4 animate-pulse space-y-3">
                    <div className="w-full h-48 bg-stone-200 rounded-lg" />
                    <div className="h-4 bg-stone-200 rounded w-3/4" />
                    <div className="h-4 bg-stone-200 rounded w-1/2" />
                    <div className="h-6 bg-stone-200 rounded w-1/3" />
                  </div>
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-4">
                {filteredProducts.map((product) => (
                  <CategoryProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={() => handleAddToCart(product)}
                    isAdded={Boolean(addedItemIds[product.id])}
                    isSaved={isInWishlist(product.id)}
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
                        boardIds: ['all', 'appliances'],
                      })
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-[#E7E7E7] p-12 text-center shadow-2xs">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                  <Refrigerator className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-[#0F1111] mb-1">No Appliances Found</h3>
                <p className="text-xs text-[#565959] max-w-md mx-auto mb-5">
                  We could not find any appliances matching your selected criteria. Try adjusting your filters or searching for a different keyword.
                </p>
                <button
                  onClick={clearAllFilters}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] shadow-xs transition-colors"
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function AppliancesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007185]" />
        </div>
      }
    >
      <AppliancesContent />
    </Suspense>
  );
}
