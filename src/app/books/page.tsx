'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BookOpen,
  Sparkles,
  TrendingUp,
  Flame,
  GraduationCap,
  BookMarked,
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
  Bookmark,
} from 'lucide-react';
import { CategoryProductCard } from '@/components/products/category-product-card';
import { CategoryProductItem, useCategoryProducts } from '@/hooks/use-category-products';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';
import {
  FALLBACK_BOOKS,
  BOOK_SUBCATEGORIES,
  BOOK_AUTHORS,
  BOOK_FORMATS,
  BOOK_LANGUAGES,
} from '@/data/books-fallback';

function BooksContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL query params
  const initialSubCat = searchParams.get('subcategory') || 'all';
  const initialAuthor = searchParams.get('author') || '';
  const initialSearch = searchParams.get('q') || searchParams.get('search') || '';

  // State
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>(initialSubCat);
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>(initialAuthor ? [initialAuthor] : []);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<string>('all');
  const [customMinPrice, setCustomMinPrice] = useState<string>('');
  const [customMaxPrice, setCustomMaxPrice] = useState<string>('');
  const [minRating, setMinRating] = useState<number>(0);
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [onlyPrime, setOnlyPrime] = useState<boolean>(false);
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
    const au = searchParams.get('author') || '';
    if (au) {
      setSelectedAuthors([au]);
    }
  }, [searchParams]);

  const handleAddToCart = (product: CategoryProductItem) => {
    addItem({
      id: product.id,
      productId: product.id,
      title: product.title,
      brand: product.brand,
      variantId: `var-${product.id}`,
      size: product.sizes?.[0] || 'Paperback',
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
    categoryKey: 'books',
    extraKeywords: [
      'book',
      'novel',
      'paperback',
      'hardcover',
      'atomic habits',
      'psychology of money',
      'rich dad',
      'shiva trilogy',
      'sudha murty',
      'ikigai',
      'fiction',
      'literature',
    ],
  });

  // Combine live database items with realistic Amazon India fallback books
  const products: CategoryProductItem[] = useMemo(() => {
    const rawList = [...(liveDbProducts || [])];

    FALLBACK_BOOKS.forEach((fb) => {
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

    // Strictly filter for books only
    return rawList.filter((p) => {
      const cat = (p.category || '').toLowerCase();
      const sub = (p.subcategory || p.subCategory || '').toLowerCase();
      const title = (p.title || '').toLowerCase();

      const isElectronic =
        cat.includes('electronic') ||
        cat.includes('mobile') ||
        cat.includes('appliance') ||
        title.includes('laptop') ||
        title.includes('iphone') ||
        title.includes('refrigerator');

      return !isElectronic;
    });
  }, [liveDbProducts]);

  // Derived authors count directly from products
  const availableAuthorsWithCount = useMemo(() => {
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
    if (selectedAuthors.length > 0) count += selectedAuthors.length;
    if (selectedFormats.length > 0) count += selectedFormats.length;
    if (selectedLanguages.length > 0) count += selectedLanguages.length;
    if (priceRange !== 'all') count++;
    if (customMinPrice || customMaxPrice) count++;
    if (minRating > 0) count++;
    if (onlyInStock) count++;
    if (onlyPrime) count++;
    if (searchQuery.trim().length > 0) count++;
    return count;
  }, [
    selectedSubCategory,
    selectedAuthors,
    selectedFormats,
    selectedLanguages,
    priceRange,
    customMinPrice,
    customMaxPrice,
    minRating,
    onlyInStock,
    onlyPrime,
    searchQuery,
  ]);

  const clearAllFilters = () => {
    setSelectedSubCategory('all');
    setSelectedAuthors([]);
    setSelectedFormats([]);
    setSelectedLanguages([]);
    setPriceRange('all');
    setCustomMinPrice('');
    setCustomMaxPrice('');
    setMinRating(0);
    setOnlyInStock(false);
    setOnlyPrime(false);
    setSearchQuery('');
  };

  const handleAuthorToggle = (authorName: string) => {
    setSelectedAuthors((prev) =>
      prev.includes(authorName) ? prev.filter((a) => a !== authorName) : [...prev, authorName]
    );
  };

  const handleFormatToggle = (format: string) => {
    setSelectedFormats((prev) =>
      prev.includes(format) ? prev.filter((f) => f !== format) : [...prev, format]
    );
  };

  const handleLanguageToggle = (lang: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
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

        if (selectedSubCategory === 'self-help-books') {
          return sub.includes('self-help') || title.includes('habits') || title.includes('ikigai') || title.includes('mindset');
        }
        if (selectedSubCategory === 'business-finance-books') {
          return sub.includes('business') || sub.includes('finance') || title.includes('money') || title.includes('rich dad');
        }
        if (selectedSubCategory === 'fiction-literature-books') {
          return sub.includes('fiction') || sub.includes('literature') || title.includes('novel');
        }
        if (selectedSubCategory === 'indian-literature-books') {
          return sub.includes('indian') || title.includes('amish') || title.includes('shiva') || title.includes('sudha murty');
        }
        if (selectedSubCategory === 'exam-prep-books') {
          return sub.includes('exam') || sub.includes('prep') || title.includes('upsc') || title.includes('jee') || title.includes('neet');
        }
        if (selectedSubCategory === 'comics-manga-books') {
          return sub.includes('comic') || sub.includes('manga') || title.includes('stories') || title.includes('children');
        }

        return sub === selectedSubCategory.toLowerCase() || cat === selectedSubCategory.toLowerCase();
      });
    }

    // Author Filter
    if (selectedAuthors.length > 0) {
      list = list.filter((p) =>
        selectedAuthors.some((a) => a.toLowerCase() === (p.brand || '').toLowerCase())
      );
    }

    // Format Filter
    if (selectedFormats.length > 0) {
      list = list.filter((p) => {
        const sizesArr = (p.sizes || []).map((s) => s.toLowerCase());
        return selectedFormats.some((f) => sizesArr.includes(f.toLowerCase()));
      });
    }

    // Language Filter
    if (selectedLanguages.length > 0) {
      list = list.filter((p) => {
        const specsText = JSON.stringify(p.specs || {}).toLowerCase();
        return selectedLanguages.some((l) => specsText.includes(l.toLowerCase()));
      });
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q) ||
          p.subcategory?.toLowerCase().includes(q) ||
          JSON.stringify(p.specs || {}).toLowerCase().includes(q)
      );
    }

    // Price Range Filter
    if (priceRange === 'under-250') {
      list = list.filter((p) => p.price < 250);
    } else if (priceRange === '250-500') {
      list = list.filter((p) => p.price >= 250 && p.price <= 500);
    } else if (priceRange === '500-1000') {
      list = list.filter((p) => p.price >= 500 && p.price <= 1000);
    } else if (priceRange === 'over-1000') {
      list = list.filter((p) => p.price > 1000);
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
    selectedAuthors,
    selectedFormats,
    selectedLanguages,
    searchQuery,
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
      case 'Sparkles':
        return <Sparkles className="w-5 h-5" />;
      case 'TrendingUp':
        return <TrendingUp className="w-5 h-5" />;
      case 'BookOpen':
        return <BookOpen className="w-5 h-5" />;
      case 'Flame':
        return <Flame className="w-5 h-5" />;
      case 'GraduationCap':
        return <GraduationCap className="w-5 h-5" />;
      case 'BookMarked':
        return <BookMarked className="w-5 h-5" />;
      default:
        return <BookOpen className="w-5 h-5" />;
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
          <Link href="/books" className="hover:text-[#007185] hover:underline font-semibold text-[#0F1111]">
            Books
          </Link>
          {selectedSubCategory !== 'all' && (
            <>
              <ChevronRight className="h-3 w-3 text-[#888888]" />
              <span className="font-bold text-[#007185]">
                {BOOK_SUBCATEGORIES.find((s) => s.slug === selectedSubCategory)?.name ||
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
              <BookOpen className="h-4 w-4" />
              <span>Official Books &amp; Literature Department</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-headline text-[#0F1111] tracking-tight">
              The Books &amp; Reading Store
            </h1>
            <p className="text-xs sm:text-sm text-[#565959] mt-0.5">
              Explore national bestsellers, life-changing self-help, business wisdom, and Indian literary masterpieces with authentic publisher editions.
            </p>
          </div>

          {/* Quick Stats Badges */}
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#E7E7E7] text-[#0F1111] font-medium shadow-2xs">
              <ShieldCheck className="h-3.5 w-3.5 text-[#007600]" />
              100% Genuine Publisher Prints
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#E7E7E7] text-[#0F1111] font-medium shadow-2xs">
              <RotateCcw className="h-3.5 w-3.5 text-[#007185]" />
              7 Days Easy Return
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#E7E7E7] text-[#0F1111] font-medium shadow-2xs">
              <Truck className="h-3.5 w-3.5 text-[#E67A00]" />
              Vyntra Express Delivery
            </span>
          </div>
        </div>

        {/* Dynamic Promotional Hero Banner (Amazon India Reading Festival) */}
        <div className="relative w-full rounded-2xl overflow-hidden shadow-md bg-[#0F1111] transition-all duration-500 mb-6 border border-white/10 group">
          <div
            style={{
              background: 'linear-gradient(135deg, #1B2A47 0%, #283E68 50%, #152238 100%)',
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
                  Great Indian Reading Fest
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-200 bg-white/10 px-2.5 py-0.5 rounded-full backdrop-blur-xs border border-white/10">
                  <Bookmark className="h-3.5 w-3.5 text-[#FFD814]" />
                  Curated National Bestsellers
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white leading-tight">
                Transform Your Mindset: Chart-Topping Self-Help, Business &amp; Indian Classics
              </h2>

              <p className="text-sm sm:text-base font-bold text-[#FFD814] flex items-center gap-2">
                <Zap className="h-4 w-4 shrink-0" />
                <span>Up to 45% Off • Extra 10% Off on Bestselling Book Combos</span>
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSubCategory('self-help-books');
                    window.scrollTo({ top: 400, behavior: 'smooth' });
                  }}
                  className="px-4 py-2 bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] font-bold rounded-lg shadow-xs transition-colors"
                >
                  Explore Self-Help
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSubCategory('business-finance-books');
                    window.scrollTo({ top: 400, behavior: 'smooth' });
                  }}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg border border-white/20 transition-colors"
                >
                  Business &amp; Finance
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSubCategory('indian-literature-books');
                    window.scrollTo({ top: 400, behavior: 'smooth' });
                  }}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg border border-white/20 transition-colors"
                >
                  Indian Authors
                </button>
              </div>
            </div>

            {/* Quick Hero Banner Badge */}
            <div className="relative shrink-0 hidden md:flex flex-col items-center justify-center p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs w-64 text-center">
              <span className="text-xs uppercase font-bold text-stone-300">Reader&apos;s Paradise</span>
              <span className="text-2xl font-black text-white mt-1">Over 1 Lakh+</span>
              <p className="text-[11px] text-stone-300 mt-1">Verified 5-Star Reviews from Avid Readers across India</p>
              <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[#FFD814] font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>Official Publisher Stock</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Subcategory Quick Selection Carousel */}
        <div className="mb-6 overflow-x-auto pb-2 scrollbar-none">
          <div className="flex items-center gap-2.5 min-w-max">
            {BOOK_SUBCATEGORIES.map((cat) => {
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
                    router.push(`/books?${params.toString()}`);
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
              <h3 className="font-bold text-sm text-[#0F1111]">Filter Books</h3>
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

              {/* Format / Binding Filter */}
              <div>
                <h5 className="text-xs font-bold text-[#0F1111] mb-2.5">Format &amp; Binding</h5>
                <div className="space-y-2">
                  {BOOK_FORMATS.map((format) => {
                    const isChecked = selectedFormats.includes(format);
                    return (
                      <label
                        key={format}
                        className="flex items-center gap-2 cursor-pointer text-xs text-[#0F1111] hover:text-[#007185]"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleFormatToggle(format)}
                          className="h-4 w-4 rounded border-[#D5D9D9] text-[#007185] focus:ring-[#007185]"
                        />
                        <span>{format}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Language Filter */}
              <div>
                <h5 className="text-xs font-bold text-[#0F1111] mb-2.5">Language</h5>
                <div className="space-y-2">
                  {BOOK_LANGUAGES.map((lang) => {
                    const isChecked = selectedLanguages.includes(lang);
                    return (
                      <label
                        key={lang}
                        className="flex items-center gap-2 cursor-pointer text-xs text-[#0F1111] hover:text-[#007185]"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleLanguageToggle(lang)}
                          className="h-4 w-4 rounded border-[#D5D9D9] text-[#007185] focus:ring-[#007185]"
                        />
                        <span>{lang}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Authors Filter */}
              <div>
                <h5 className="text-xs font-bold text-[#0F1111] mb-2.5">Author</h5>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                  {availableAuthorsWithCount.length > 0 ? (
                    availableAuthorsWithCount.map(({ name, count }) => {
                      const isChecked = selectedAuthors.includes(name);
                      return (
                        <label
                          key={name}
                          className="flex items-center justify-between cursor-pointer text-xs text-[#0F1111] hover:text-[#007185]"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleAuthorToggle(name)}
                              className="h-4 w-4 rounded border-[#D5D9D9] text-[#007185] focus:ring-[#007185]"
                            />
                            <span>{name}</span>
                          </div>
                          <span className="text-[11px] text-[#565959]">({count})</span>
                        </label>
                      );
                    })
                  ) : (
                    BOOK_AUTHORS.filter((a) => a !== 'All Authors').map((a) => (
                      <label
                        key={a}
                        className="flex items-center gap-2 cursor-pointer text-xs text-[#0F1111] hover:text-[#007185]"
                      >
                        <input
                          type="checkbox"
                          checked={selectedAuthors.includes(a)}
                          onChange={() => handleAuthorToggle(a)}
                          className="h-4 w-4 rounded border-[#D5D9D9] text-[#007185] focus:ring-[#007185]"
                        />
                        <span>{a}</span>
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
                    { id: 'under-250', label: 'Under ₹250' },
                    { id: '250-500', label: '₹250 - ₹500' },
                    { id: '500-1000', label: '₹500 - ₹1,000' },
                    { id: 'over-1000', label: 'Over ₹1,000' },
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
                  Showing <span className="font-bold text-[#0F1111]">{filteredProducts.length}</span> titles
                  {selectedSubCategory !== 'all' && (
                    <> in <span className="font-semibold text-[#007185]">{BOOK_SUBCATEGORIES.find((s) => s.slug === selectedSubCategory)?.name}</span></>
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
                <label htmlFor="books-sort" className="text-xs text-[#565959] whitespace-nowrap">
                  Sort by:
                </label>
                <select
                  id="books-sort"
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
                        boardIds: ['all', 'books'],
                      })
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-[#E7E7E7] p-12 text-center shadow-2xs">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                  <BookOpen className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-[#0F1111] mb-1">No Books Found</h3>
                <p className="text-xs text-[#565959] max-w-md mx-auto mb-5">
                  We could not find any books matching your selected criteria. Try adjusting your filters or searching for a different keyword or author.
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

export default function BooksPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007185]" />
        </div>
      }
    >
      <BooksContent />
    </Suspense>
  );
}
