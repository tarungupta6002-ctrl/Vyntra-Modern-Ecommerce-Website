'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Sparkles,
  ArrowDown,
  ArrowRight,
  Zap,
  CheckCircle,
  Truck,
  RotateCcw,
  ShieldCheck,
  Star,
  Heart,
  ShoppingBag,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  Copy,
  Award,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';
import { useAddressStore } from '@/store/address-store';
import { formatINR } from '@/lib/utils';
import { HeroBannerCarousel } from '@/components/home/hero-banner-carousel';
import { CategoryBubblesBar } from '@/components/home/category-bubbles-bar';
import { WomenMegaMenu } from '@/components/home/women-mega-menu';
import { MenMegaMenu } from '@/components/home/men-mega-menu';
import { KidsMegaMenu } from '@/components/home/kids-mega-menu';
import { BagsLuggageMegaMenu } from '@/components/home/bags-luggage-mega-menu';

// Product data sourced directly from Stitch Screen f4903b24409f477ba596cfa592906097
interface ProductItem {
  id: string;
  title: string;
  subtitle: string;
  brand: string;
  category: string;
  subCategory: string;
  price: number;
  originalPrice: number;
  discount: string;
  rating: number;
  reviewCount: number;
  badge?: string;
  badgeVariant?: 'primary' | 'secondary' | 'accent' | 'neutral';
  isExpress: boolean;
  image: string;
  sizes: string[];
  colors: string[];
  slug?: string;
}

const INITIAL_PRODUCTS: ProductItem[] = [];

const SUB_CATEGORIES = [
  { id: 'all', name: 'All Fashion & Lifestyle' },
  { id: 'men', name: "Men's Fashion" },
  { id: 'women', name: "Women's Fashion" },
  { id: 'ethnic', name: 'Ethnic Wear ★', isSpecial: true },
  { id: 'footwear', name: 'Footwear' },
  { id: 'watches', name: 'Watches & Jewels' },
  { id: 'bags', name: 'Bags & Luggage' },
  { id: 'accessories', name: 'Curated Accessories' },
];

const COLOR_SWATCHES = [
  { name: 'Royal Sapphire', hex: '#00288e' },
  { name: 'Marigold Orange', hex: '#fe932c' },
  { name: 'Electric Cobalt', hex: '#1e40af' },
  { name: 'Porcelain Mist', hex: '#f2f3ff' },
  { name: 'Spiced Ochre', hex: '#904d00' },
  { name: 'Midnight Obsidian', hex: '#131b2e' },
];

export default function VyntraProductListingPage() {
  const { addItem, openCart } = useCartStore();
  const { addItem: addWishlistItem, removeItem: removeWishlistItem } = useWishlistStore();

  const { getDefaultAddress } = useAddressStore();
  const [mounted, setMounted] = useState(false);
  const [deliveryLocation, setDeliveryLocation] = useState<string>('Pan-India Express (Priority SLA)');

  useEffect(() => {
    setMounted(true);
    const addr = getDefaultAddress();
    if (addr) {
      setDeliveryLocation(`${addr.city} ${addr.pincode}`);
    }
  }, [getDefaultAddress]);

  // Dynamic products from API/database (initialized empty so loading skeletons render first, never flashing fake cards)
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbSource, setDbSource] = useState<string>('database');

  // State
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchParamQuery, setSearchParamQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [expressOnly, setExpressOnly] = useState(false);
  const [sortOption, setSortOption] = useState('curated');
  const [maxPrice, setMaxPrice] = useState(20000);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({});
  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});
  const [codeCopied, setCodeCopied] = useState(false);

  // Mega Menu Dropdown States (Women, Men, Kids & Bags)
  const [womenDropdownOpen, setWomenDropdownOpen] = useState(false);
  const [menDropdownOpen, setMenDropdownOpen] = useState(false);
  const [kidsDropdownOpen, setKidsDropdownOpen] = useState(false);
  const [bagsDropdownOpen, setBagsDropdownOpen] = useState(false);
  const dropdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const menDropdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const kidsDropdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const bagsDropdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleWomenMouseEnter = () => {
    if (dropdownTimerRef.current) clearTimeout(dropdownTimerRef.current);
    if (menDropdownTimerRef.current) clearTimeout(menDropdownTimerRef.current);
    if (kidsDropdownTimerRef.current) clearTimeout(kidsDropdownTimerRef.current);
    if (bagsDropdownTimerRef.current) clearTimeout(bagsDropdownTimerRef.current);
    setMenDropdownOpen(false);
    setKidsDropdownOpen(false);
    setBagsDropdownOpen(false);
    setWomenDropdownOpen(true);
  };

  const handleWomenMouseLeave = () => {
    dropdownTimerRef.current = setTimeout(() => {
      setWomenDropdownOpen(false);
    }, 250);
  };

  const handleMenMouseEnter = () => {
    if (menDropdownTimerRef.current) clearTimeout(menDropdownTimerRef.current);
    if (dropdownTimerRef.current) clearTimeout(dropdownTimerRef.current);
    if (kidsDropdownTimerRef.current) clearTimeout(kidsDropdownTimerRef.current);
    if (bagsDropdownTimerRef.current) clearTimeout(bagsDropdownTimerRef.current);
    setWomenDropdownOpen(false);
    setKidsDropdownOpen(false);
    setBagsDropdownOpen(false);
    setMenDropdownOpen(true);
  };

  const handleMenMouseLeave = () => {
    menDropdownTimerRef.current = setTimeout(() => {
      setMenDropdownOpen(false);
    }, 250);
  };

  const handleKidsMouseEnter = () => {
    if (kidsDropdownTimerRef.current) clearTimeout(kidsDropdownTimerRef.current);
    if (dropdownTimerRef.current) clearTimeout(dropdownTimerRef.current);
    if (menDropdownTimerRef.current) clearTimeout(menDropdownTimerRef.current);
    if (bagsDropdownTimerRef.current) clearTimeout(bagsDropdownTimerRef.current);
    setWomenDropdownOpen(false);
    setMenDropdownOpen(false);
    setBagsDropdownOpen(false);
    setKidsDropdownOpen(true);
  };

  const handleKidsMouseLeave = () => {
    kidsDropdownTimerRef.current = setTimeout(() => {
      setKidsDropdownOpen(false);
    }, 250);
  };

  const handleBagsMouseEnter = () => {
    if (bagsDropdownTimerRef.current) clearTimeout(bagsDropdownTimerRef.current);
    if (dropdownTimerRef.current) clearTimeout(dropdownTimerRef.current);
    if (menDropdownTimerRef.current) clearTimeout(menDropdownTimerRef.current);
    if (kidsDropdownTimerRef.current) clearTimeout(kidsDropdownTimerRef.current);
    setWomenDropdownOpen(false);
    setMenDropdownOpen(false);
    setKidsDropdownOpen(false);
    setBagsDropdownOpen(true);
  };

  const handleBagsMouseLeave = () => {
    bagsDropdownTimerRef.current = setTimeout(() => {
      setBagsDropdownOpen(false);
    }, 250);
  };

  // Category Display Title for Amazon-style header
  const activeCategoryTitle = useMemo(() => {
    if (activeCategory === 'all' || activeCategory === 'fashion') return 'All Fashion & Lifestyle';
    if (activeCategory === 'kurtas-suits' || activeCategory === 'kurtas') return 'Kurtas & Kurtis';
    if (activeCategory === 'sarees') return 'Handloom & Silk Sarees';
    if (activeCategory === 'lehengas-festive' || activeCategory === 'lehengas') return 'Lehenga Cholis';
    if (activeCategory === 'dupattas-shawls' || activeCategory === 'dupattas') return 'Dupattas & Shawls';
    if (activeCategory === 'mens-shirts-trousers') return "Men's Shirts & Trousers";
    if (activeCategory === 'mens-kurtas-sherwanis') return "Men's Ethnic Wear";
    if (activeCategory === 'ethnic') return "Women's Ethnic Wear";
    const found = SUB_CATEGORIES.find((c) => c.id === activeCategory);
    return found ? found.name : activeCategory;
  }, [activeCategory]);

  // Sync search/category query from URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const q = sp.get('search') || sp.get('q') || '';
      const cat = sp.get('category') || '';
      const brand = sp.get('brand') || '';
      if (q) setSearchParamQuery(q);
      if (cat) setActiveCategory(cat);
      if (brand) setSelectedBrand(brand);
    }
  }, []);

  // Fetch from real Prisma API route
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const params = new URLSearchParams();
    if (activeCategory && activeCategory !== 'all' && activeCategory !== 'fashion') {
      params.set('category', activeCategory);
    }
    if (selectedBrand) {
      params.set('brand', selectedBrand);
    }
    if (sortOption) {
      params.set('sort', sortOption);
    }
    if (searchParamQuery) {
      params.set('search', searchParamQuery);
    }

    fetch(`/api/products?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted) {
          if (json.success && Array.isArray(json.data)) {
            setProducts(json.data);
            setDbSource(json.meta?.source || 'prisma_postgresql');
          } else {
            setProducts([]);
          }
        }
      })
      .catch((err) => {
        console.warn('[Catalog API fetch error]:', err);
        if (isMounted) {
          setProducts([]);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeCategory, sortOption, searchParamQuery]);

  // Accordion state
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    categories: true,
    brands: true,
    price: true,
    sizes: true,
    colors: true,
    ratings: true,
  });

  const toggleAccordion = (key: string) => {
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Toast notification state
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    icon?: string;
    isMarigold?: boolean;
  }>({
    show: false,
    message: '',
  });

  const showToast = (message: string, icon = 'check', isMarigold = false) => {
    setToast({ show: true, message, icon, isMarigold });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 2800);
  };

  // Copy promo code
  const handleCopyCode = () => {
    navigator.clipboard.writeText('SUMMERROYAL');
    setCodeCopied(true);
    showToast('Promo code "SUMMERROYAL" copied to clipboard!', 'check', true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  // Filter removal
  const handleRemoveFilter = (filter: string) => {
    setActiveFilters((prev) => prev.filter((f) => f !== filter));
    showToast(`Removed filter: ${filter}`, 'x', false);
  };

  const handleClearAllFilters = () => {
    setActiveFilters([]);
    showToast('All active filters cleared', 'check', true);
  };

  // Wishlist toggle
  const toggleWishlist = (id: string, title: string) => {
    const prod = products.find((p) => p.id === id);
    const nextState = !wishlist[id];
    if (nextState) {
      if (prod) {
        addWishlistItem({
          id: prod.id,
          productId: prod.id,
          slug: prod.slug,
          title: prod.title,
          subtitle: prod.subtitle,
          brand: prod.brand,
          category: prod.category,
          price: prod.price,
          originalPrice: prod.originalPrice,
          discount: prod.discount,
          rating: prod.rating,
          reviewCount: prod.reviewCount,
          image: prod.image,
          inStock: true,
          boardIds: ['all'],
        });
      }
      showToast(`Saved "${title}" to your Wishlist!`, 'heart', false);
    } else {
      removeWishlistItem(id);
      showToast(`Removed "${title}" from Wishlist`, 'heart-off', false);
    }
    setWishlist((prev) => ({ ...prev, [id]: nextState }));
  };

  // Size toggle
  const toggleSize = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  // Add to Bag action
  const handleAddToCart = (product: ProductItem) => {
    addItem({
      id: `${product.id}-${Date.now()}`,
      productId: product.id,
      title: product.title,
      brand: product.brand,
      variantId: `var-${product.id}`,
      size: product.sizes[0] || 'Standard',
      color: product.colors[0] || 'Original',
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      vendorName: product.brand,
    });

    setAddedItems((prev) => ({ ...prev, [product.id]: true }));
    showToast(`Added "${product.title}" to your Bag`, 'bag', true);

    setTimeout(() => {
      setAddedItems((prev) => ({ ...prev, [product.id]: false }));
    }, 2000);
  };

  // Dynamic brand list strictly from live verified products
  const availableBrands = useMemo(() => {
    const liveBrands = products
      .map((p) => p.brand?.trim())
      .filter((b): b is string => Boolean(b));

    const set = new Set([...liveBrands]);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (selectedBrand) {
      result = result.filter(
        (p) => p.brand?.toLowerCase().includes(selectedBrand.toLowerCase())
      );
    }

    if (activeCategory !== 'all' && activeCategory !== 'fashion') {
      result = result.filter(
        (p) =>
          p.category?.toLowerCase() === activeCategory.toLowerCase() ||
          (activeCategory === 'ethnic' && p.category?.toLowerCase() === 'ethnic')
      );
    }

    if (expressOnly) {
      result = result.filter((p) => p.isExpress);
    }

    if (maxPrice < 20000) {
      result = result.filter((p) => p.price <= maxPrice);
    }

    if (selectedRating > 0) {
      result = result.filter((p) => p.rating >= selectedRating);
    }

    if (sortOption === 'price-low') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortOption === 'price-high') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortOption === 'rating') {
      result.sort((a, b) => b.rating - a.rating);
    } else if (sortOption === 'discount') {
      result.sort(
        (a, b) =>
          (b.originalPrice - b.price) / (b.originalPrice || 1) -
          (a.originalPrice - a.price) / (a.originalPrice || 1)
      );
    }

    return result;
  }, [products, selectedBrand, activeCategory, expressOnly, maxPrice, selectedRating, sortOption]);

  return (
    <div className="w-full bg-surface min-h-screen text-on-surface">
      {/* Department Sub-Nav Bar (Amazon Fashion Style - Full Width with Dropdown Carets) */}
      <div className="w-full bg-white border-b border-[#E7E7E7] shadow-2xs relative z-40">
        <div className="w-full max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 h-[48px] flex items-center justify-between overflow-x-auto whitespace-nowrap">
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <span className="text-xl sm:text-2xl font-bold font-headline text-[#0F1111] tracking-tight mr-4 sm:mr-8">
              Vyntra Fashion
            </span>
          </div>

          <nav className="flex items-center justify-between flex-1 max-w-[950px] gap-4 sm:gap-6 text-xs sm:text-[13px] font-medium text-[#333333]">
            <button
              type="button"
              onMouseEnter={handleWomenMouseEnter}
              onMouseLeave={handleWomenMouseLeave}
              onClick={() => setWomenDropdownOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 hover:text-[#007185] hover:underline cursor-pointer group py-1.5 transition-colors ${
                womenDropdownOpen || activeCategory === 'women' ? 'text-[#007185] font-bold' : ''
              }`}
            >
              <span>Women</span>
              <ChevronDown className={`h-3 w-3 text-[#565959] group-hover:text-[#007185] transition-transform ${womenDropdownOpen ? 'rotate-180 text-[#007185]' : 'group-hover:translate-y-0.5'}`} />
            </button>

            <button
              type="button"
              onMouseEnter={handleMenMouseEnter}
              onMouseLeave={handleMenMouseLeave}
              onClick={() => {
                setMenDropdownOpen((prev) => !prev);
              }}
              className={`flex items-center gap-1.5 hover:text-[#007185] hover:underline cursor-pointer group py-1.5 transition-colors ${
                menDropdownOpen || activeCategory === 'men' ? 'text-[#007185] font-bold border-b-2 border-[#007185]' : ''
              }`}
            >
              <span>Men</span>
              <ChevronDown className={`h-3 w-3 text-[#565959] group-hover:text-[#007185] transition-transform ${menDropdownOpen ? 'rotate-180 text-[#007185]' : 'group-hover:translate-y-0.5'}`} />
            </button>

            <button
              type="button"
              onMouseEnter={handleKidsMouseEnter}
              onMouseLeave={handleKidsMouseLeave}
              onClick={() => {
                setKidsDropdownOpen((prev) => !prev);
              }}
              className={`flex items-center gap-1.5 hover:text-[#007185] hover:underline cursor-pointer group py-1.5 transition-colors ${
                kidsDropdownOpen || activeCategory === 'kids' ? 'text-[#007185] font-bold border-b-2 border-[#007185]' : ''
              }`}
            >
              <span>Kids</span>
              <ChevronDown className={`h-3 w-3 text-[#565959] group-hover:text-[#007185] transition-transform ${kidsDropdownOpen ? 'rotate-180 text-[#007185]' : 'group-hover:translate-y-0.5'}`} />
            </button>

            <button
              type="button"
              onMouseEnter={handleBagsMouseEnter}
              onMouseLeave={handleBagsMouseLeave}
              onClick={() => {
                setBagsDropdownOpen((prev) => !prev);
              }}
              className={`flex items-center gap-1.5 hover:text-[#007185] hover:underline cursor-pointer group py-1.5 transition-colors ${
                bagsDropdownOpen || activeCategory === 'bags' ? 'text-[#007185] font-bold border-b-2 border-[#007185]' : ''
              }`}
            >
              <span>Bags &amp; Luggage</span>
              <ChevronDown className={`h-3 w-3 text-[#565959] group-hover:text-[#007185] transition-transform ${bagsDropdownOpen ? 'rotate-180 text-[#007185]' : 'group-hover:translate-y-0.5'}`} />
            </button>
          </nav>
        </div>

        {/* Amazon-style Full-Width Women Mega Menu Dropdown */}
        <WomenMegaMenu
          isOpen={womenDropdownOpen}
          onMouseEnter={handleWomenMouseEnter}
          onMouseLeave={handleWomenMouseLeave}
          onItemClick={() => setWomenDropdownOpen(false)}
        />

        {/* Amazon-style Full-Width Men Mega Menu Dropdown */}
        <MenMegaMenu
          isOpen={menDropdownOpen}
          onMouseEnter={handleMenMouseEnter}
          onMouseLeave={handleMenMouseLeave}
          onItemClick={() => setMenDropdownOpen(false)}
        />

        {/* Amazon-style Full-Width Kids Mega Menu Dropdown */}
        <KidsMegaMenu
          isOpen={kidsDropdownOpen}
          onMouseEnter={handleKidsMouseEnter}
          onMouseLeave={handleKidsMouseLeave}
          onItemClick={() => setKidsDropdownOpen(false)}
        />

        {/* Amazon-style Full-Width Bags & Luggage Mega Menu Dropdown */}
        <BagsLuggageMegaMenu
          isOpen={bagsDropdownOpen}
          onMouseEnter={handleBagsMouseEnter}
          onMouseLeave={handleBagsMouseLeave}
          onItemClick={() => setBagsDropdownOpen(false)}
        />
      </div>

      {/* Flipkart-style Multi-Card Banner Carousel with Auto-Scroll */}
      <HeroBannerCarousel />

      {/* Amazon Fashion 7 Circular Category Bubbles Bar (Exact match to screenshot) */}
      <CategoryBubblesBar
        onSelectCategory={(categorySlug, searchQuery) => {
          if (categorySlug === 'kurtas-suits') {
            window.location.href = '/category/womens-ethnic-wear';
            return;
          }
          if (categorySlug) {
            setActiveCategory(categorySlug);
            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href);
              url.searchParams.set('category', categorySlug);
              window.history.replaceState({}, '', url.toString());
            }
          } else if (searchQuery) {
            setSearchParamQuery(searchQuery);
            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href);
              url.searchParams.set('search', searchQuery);
              window.history.replaceState({}, '', url.toString());
            }
          }
        }}
      />

      {/* Subcategory Navigation Pills (Interactive) */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 py-2 w-full">
        <div
          className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none"
          id="category-pills"
        >
          {SUB_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveCategory(cat.id);
                  showToast(`Viewing: ${cat.name}`, 'filter', false);
                }}
                className={`px-4 py-2 rounded-full text-xs font-label transition-all shadow-sm shrink-0 whitespace-nowrap ${
                  isActive
                    ? 'bg-primary text-on-primary font-bold shadow-md scale-105'
                    : cat.isSpecial
                    ? 'bg-secondary-fixed text-on-secondary-fixed hover:bg-secondary-fixed-dim font-bold'
                    : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-high font-medium'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </section>

      {/* Active Filters Row & Global Sort Header */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 py-3 w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-surface-container-low shadow-sm border border-surface-container">
          {/* Left: Active Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-wider mr-1">
              Active Filters:
            </span>

            {activeFilters.map((filter) => (
              <span
                key={filter}
                onClick={() => handleRemoveFilter(filter)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-label bg-surface-container-lowest text-on-surface shadow-xs hover:bg-error-container hover:text-on-error-container cursor-pointer transition-all border border-surface-container"
              >
                <span>{filter}</span>
                <X className="h-3 w-3" />
              </span>
            ))}

            {activeFilters.length > 0 ? (
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="text-xs font-label font-bold text-secondary hover:text-on-secondary-container hover:underline ml-2 transition-colors"
                id="clear-all-filters"
              >
                Clear All
              </button>
            ) : (
              <span className="text-xs text-outline italic">No filters applied</span>
            )}
          </div>

          {/* Right: 24h Express Fast Delivery Toggle & Sort Dropdown */}
          <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
            {/* Express Toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={expressOnly}
                  onChange={(e) => {
                    setExpressOnly(e.target.checked);
                    showToast(
                      e.target.checked
                        ? 'Showing only 24h Express Delivery items'
                        : 'Showing full inventory catalog',
                      'bolt',
                      true
                    );
                  }}
                  className="sr-only peer"
                  id="fast-delivery-toggle"
                />
                <div className="w-9 h-5 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-secondary-container" />
              </div>
              <span className="text-xs font-label font-bold text-on-surface flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 text-secondary" /> 24h Express
              </span>
            </label>

            <div className="h-4 w-[1px] bg-outline-variant hidden sm:block" />

            {/* Sort Select */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-label text-on-surface-variant">Sort by:</span>
              <select
                value={sortOption}
                onChange={(e) => {
                  setSortOption(e.target.value);
                  const selectedText = e.target.options[e.target.selectedIndex].text;
                  showToast(`Sorted by: ${selectedText}`, 'sliders', false);
                }}
                className="bg-surface-container-lowest text-on-surface font-label text-xs font-bold py-1.5 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary shadow-xs cursor-pointer border border-surface-container"
                id="sort-select"
              >
                <option value="curated">Recommended: Royal Edit</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="newest">Newest Arrivals</option>
                <option value="discount">Biggest Savings (Festive)</option>
                <option value="rating">Customer Rating</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Main Catalog Architecture (Sidebar Filter + Product Grid) */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 py-6 w-full" id="catalog-grid">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Sidebar Filters Panel */}
          <aside className="lg:col-span-3 space-y-4 bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-surface-container">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-primary" />
                <h2 className="font-headline font-bold text-base text-on-surface">
                  Refine Catalog
                </h2>
              </div>
              <span className="text-[11px] font-label font-semibold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                {isLoading ? '...' : `${products.length} Items`}
              </span>
            </div>

            {/* Delivery Day (Amazon Screenshot 4 exact match) */}
            <div className="py-2 border-b border-surface-container space-y-2 text-xs">
              <span className="font-bold text-[#0F1111] block">
                Delivery Day
              </span>
              <div className="space-y-1.5 text-xs text-[#0F1111]">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" className="rounded text-[#007185] h-3.5 w-3.5" />
                  <span>Get It Today</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" defaultChecked className="rounded text-[#007185] h-3.5 w-3.5" />
                  <span>Get It by Tomorrow</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" defaultChecked className="rounded text-[#007185] h-3.5 w-3.5" />
                  <span>Get It in 2 Days</span>
                </label>
              </div>
            </div>

            {/* Accordion 1: Amazon-style Category Hierarchy Drill-down */}
            <div className="filter-accordion py-2 border-b border-surface-container">
              <button
                type="button"
                onClick={() => toggleAccordion('categories')}
                className="w-full flex items-center justify-between py-1 text-xs font-label font-bold uppercase tracking-wider text-on-surface hover:text-primary transition-colors"
              >
                <span>Category Drill-down</span>
                {openAccordions.categories ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {openAccordions.categories && (
                <div className="pt-2 space-y-1.5 text-xs text-[#0F1111]">
                  <Link
                    href="/products"
                    onClick={() => setActiveCategory('all')}
                    className="text-[#007185] hover:underline flex items-center gap-1 font-medium"
                  >
                    <span>‹</span> All Clothing &amp; Accessories
                  </Link>
                  <Link
                    href="/category/womens-ethnic-wear"
                    className="text-[#007185] hover:underline flex items-center gap-1 pl-2 font-medium"
                  >
                    <span>‹</span> Women&apos;s Fashion
                  </Link>
                  <div className="pl-4 font-bold text-[#0F1111] flex items-center justify-between">
                    <span>Ethnic &amp; Fusion Wear</span>
                    <Link
                      href="/category/womens-ethnic-wear"
                      className="text-[10px] text-[#007185] font-normal hover:underline"
                    >
                      Hub ↗
                    </Link>
                  </div>
                  <div className="pl-6 space-y-1 text-[#333333]">
                    {[
                      { id: 'kurtas-suits', label: 'Kurtas & Kurtis' },
                      { id: 'sarees', label: 'Handloom & Silk Sarees' },
                      { id: 'lehengas-festive', label: 'Lehenga Cholis' },
                      { id: 'dupattas-shawls', label: 'Dupattas, Shawls & Stoles' },
                      { id: 'mens-shirts-trousers', label: "Men's Shirts & Trousers" },
                      { id: 'mens-kurtas-sherwanis', label: "Men's Ethnic Kurtas" },
                    ].map((item) => {
                      const isCurrent = activeCategory === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setActiveCategory(item.id);
                            if (typeof window !== 'undefined') {
                              const url = new URL(window.location.href);
                              url.searchParams.set('category', item.id);
                              window.history.replaceState({}, '', url.toString());
                            }
                          }}
                          className={`w-full text-left py-0.5 block text-xs transition-colors ${
                            isCurrent
                              ? 'font-bold text-[#FF9900] pl-1 border-l-2 border-[#FF9900]'
                              : 'hover:text-[#007185] hover:underline text-[#333333]'
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Accordion 2: Brands (Only shown if live brands exist) */}
            {availableBrands.length > 0 && (
              <div className="filter-accordion py-2 border-b border-surface-container">
                <button
                  type="button"
                  onClick={() => toggleAccordion('brands')}
                  className="w-full flex items-center justify-between py-1 text-xs font-label font-bold uppercase tracking-wider text-on-surface hover:text-primary transition-colors"
                >
                  <span>Brands</span>
                  {openAccordions.brands ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {openAccordions.brands && (
                  <div className="pt-3 space-y-2 text-xs">
                    <div className="max-h-56 overflow-y-auto space-y-1 pr-1 divide-y divide-surface-container/30">
                      {availableBrands.map((brandName) => {
                        const isChecked = selectedBrand.toLowerCase() === brandName.toLowerCase();
                        return (
                          <label
                            key={brandName}
                            onClick={(e) => {
                              e.preventDefault();
                              const nextBrand = isChecked ? '' : brandName;
                              setSelectedBrand(nextBrand);
                              if (typeof window !== 'undefined') {
                                const url = new URL(window.location.href);
                                if (nextBrand) {
                                  url.searchParams.set('brand', nextBrand);
                                } else {
                                  url.searchParams.delete('brand');
                                }
                                window.history.replaceState({}, '', url.toString());
                              }
                            }}
                            className="flex items-center cursor-pointer hover:text-primary group select-none py-1 px-1 rounded hover:bg-surface-container/50"
                          >
                            <span className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="rounded accent-primary w-4 h-4 cursor-pointer"
                              />
                              <span
                                className={`font-medium group-hover:text-primary ${
                                  isChecked ? 'text-primary font-bold' : 'text-on-surface'
                                }`}
                              >
                                {brandName}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Accordion 3: Price Range Slider */}
            <div className="filter-accordion py-2 border-b border-surface-container">
              <button
                type="button"
                onClick={() => toggleAccordion('price')}
                className="w-full flex items-center justify-between py-1 text-xs font-label font-bold uppercase tracking-wider text-on-surface hover:text-primary transition-colors"
              >
                <span>Price Range (₹)</span>
                {openAccordions.price ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {openAccordions.price && (
                <div className="pt-3 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-primary font-mono">
                    <span>₹1,500</span>
                    <span id="price-slider-display" className="bg-primary-fixed px-2 py-0.5 rounded text-on-primary-fixed">
                      {formatINR(maxPrice)}
                    </span>
                    <span>₹20,000</span>
                  </div>

                  <input
                    type="range"
                    min="1500"
                    max="20000"
                    step="500"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full accent-primary h-1.5 bg-surface-container rounded-lg cursor-pointer"
                    id="price-range"
                  />

                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="px-2.5 py-1 rounded bg-surface-container text-on-surface font-semibold text-[11px]">
                      Min: ₹1,500
                    </div>
                    <span className="text-outline-variant">-</span>
                    <div
                      className="px-2.5 py-1 rounded bg-surface-container text-on-surface font-semibold text-[11px]"
                      id="max-price-badge"
                    >
                      Max: {formatINR(maxPrice)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Accordion 4: Sizes */}
            <div className="filter-accordion py-2 border-b border-surface-container">
              <button
                type="button"
                onClick={() => toggleAccordion('sizes')}
                className="w-full flex items-center justify-between py-1 text-xs font-label font-bold uppercase tracking-wider text-on-surface hover:text-primary transition-colors"
              >
                <span>Sizes</span>
                {openAccordions.sizes ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {openAccordions.sizes && (
                <div className="pt-3">
                  <div className="grid grid-cols-3 gap-2">
                    {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((size) => {
                      const isSelected = selectedSizes.includes(size);
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => toggleSize(size)}
                          className={`py-1.5 rounded-lg text-xs font-label font-semibold transition-all ${
                            isSelected
                              ? 'bg-primary text-on-primary shadow-xs'
                              : 'bg-surface-container hover:bg-surface-container-highest text-on-surface'
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Accordion 5: Artisanal Color Palette */}
            <div className="filter-accordion py-2 border-b border-surface-container">
              <button
                type="button"
                onClick={() => toggleAccordion('colors')}
                className="w-full flex items-center justify-between py-1 text-xs font-label font-bold uppercase tracking-wider text-on-surface hover:text-primary transition-colors"
              >
                <span>Color Swatches</span>
                {openAccordions.colors ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {openAccordions.colors && (
                <div className="pt-3">
                  <div className="flex flex-wrap gap-2.5">
                    {COLOR_SWATCHES.map((swatch) => {
                      const isSelected = selectedColor === swatch.hex;
                      return (
                        <button
                          key={swatch.hex}
                          type="button"
                          onClick={() => {
                            setSelectedColor(isSelected ? null : swatch.hex);
                            showToast(`Selected shade: ${swatch.name}`, 'sparkles', false);
                          }}
                          style={{ backgroundColor: swatch.hex }}
                          className={`w-7 h-7 rounded-full shadow-sm transform hover:scale-110 transition-transform relative ${
                            isSelected
                              ? 'ring-2 ring-primary ring-offset-2'
                              : 'border border-surface-container'
                          }`}
                          title={swatch.name}
                          aria-label={swatch.name}
                        >
                          {isSelected && (
                            <span className="absolute inset-0 flex items-center justify-center">
                              <Check
                                className={`h-3.5 w-3.5 ${
                                  swatch.hex === '#f2f3ff' ? 'text-black' : 'text-white'
                                }`}
                              />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Accordion 6: Rating */}
            <div className="filter-accordion py-2">
              <button
                type="button"
                onClick={() => toggleAccordion('ratings')}
                className="w-full flex items-center justify-between py-1 text-xs font-label font-bold uppercase tracking-wider text-on-surface hover:text-primary transition-colors"
              >
                <span>Customer Rating</span>
                {openAccordions.ratings ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {openAccordions.ratings && (
                <div className="pt-3 space-y-2 text-xs">
                  {[4.0, 4.5, 3.0].map((stars) => (
                    <label
                      key={stars}
                      className="flex items-center gap-2 cursor-pointer hover:text-primary select-none"
                    >
                      <input
                        type="radio"
                        name="rating-filter"
                        checked={selectedRating === stars}
                        onChange={() => {
                          setSelectedRating(stars);
                          showToast(`Filtered by ${stars}★ & above`, 'star', false);
                        }}
                        className="accent-primary cursor-pointer"
                      />
                      <div className="flex items-center gap-1 text-secondary font-bold">
                        <span>{stars}★ &amp; above</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar Promo Box: Vyntra Royal Promise */}
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-secondary-fixed to-secondary-fixed-dim text-on-secondary-fixed border border-secondary-container/20">
              <div className="flex items-center gap-2 mb-1">
                <Award className="h-5 w-5 text-secondary" />
                <span className="text-xs font-headline font-bold uppercase tracking-wider">
                  Vyntra Royal Promise
                </span>
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">
                Every garment has undergone certified weaving tests with verified origin GIS
                stamps.
              </p>
            </div>
          </aside>

          {/* 4-Column Product Catalog Grid (Desktop) */}
          <main className="lg:col-span-9 space-y-6">
            {/* Brand Store Dedicated Banner */}
            {selectedBrand && (
              <div className="p-3.5 bg-amber-50/90 border border-amber-200/80 rounded-xl flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded">
                    Official Brand Atelier
                  </span>
                  <span className="font-headline font-bold text-sm text-[#0F1111]">
                    {selectedBrand}
                  </span>
                  <span className="text-xs text-stone-500 hidden md:inline">
                    • Displaying all certified listings from verified sellers across Vyntra
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBrand('');
                    if (typeof window !== 'undefined') {
                      const url = new URL(window.location.href);
                      url.searchParams.delete('brand');
                      window.history.replaceState({}, '', url.toString());
                    }
                  }}
                  className="text-xs font-semibold text-[#007185] hover:underline flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" /> Show All Brands
                </button>
              </div>
            )}

            {/* Results Counter & Delivery Promise Bar (Amazon Screenshot 4 exact style) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#565959] gap-2 pb-2 border-b border-[#E7E7E7]">
              <span>
                {isLoading ? (
                  <span className="inline-block w-48 h-3.5 bg-stone-200 rounded animate-pulse" />
                ) : (
                  <>
                    <strong className="text-[#0F1111] text-sm">
                      1-{filteredProducts.length}
                    </strong>{' '}
                    of over{' '}
                    <strong className="text-[#0F1111]">
                      {products.length > 0 ? products.length * 12 + 48 : 5000}
                    </strong>{' '}
                    results for{' '}
                    <span className="text-[#C45500] font-bold">
                      &quot;{selectedBrand || activeCategoryTitle || 'Clothing & Fashion'}&quot;
                    </span>
                  </>
                )}
              </span>
              <span className="hidden sm:inline" suppressHydrationWarning>
                Delivering to:{' '}
                <strong suppressHydrationWarning className="text-[#007185]">
                  {deliveryLocation}
                </strong>
              </span>
            </div>

            {/* Product Grid */}
            <div
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5"
              id="product-list"
            >
              {isLoading ? (
                Array.from({ length: 8 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col bg-white rounded-lg overflow-hidden border border-[#D5D9D9] p-3 animate-pulse"
                  >
                    <div className="w-full aspect-[3/4] bg-[#F7F8F8] rounded mb-3" />
                    <div className="h-4 bg-[#F2F2F2] rounded w-3/4 mb-2" />
                    <div className="h-3 bg-[#F2F2F2] rounded w-1/2 mb-4" />
                    <div className="h-5 bg-[#F2F2F2] rounded w-1/3" />
                  </div>
                ))
              ) : filteredProducts.length === 0 ? (
                <div className="col-span-full py-16 px-4 bg-white rounded-xl border border-[#D5D9D9] text-center flex flex-col items-center justify-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-[#E7F4F5] flex items-center justify-center text-[#007185]">
                    <SlidersHorizontal className="h-6 w-6" />
                  </div>
                  <h3 className="font-headline text-lg font-bold text-[#0F1111]">
                    No artisanal pieces match your selection
                  </h3>
                  <p className="text-xs text-[#565959] max-w-sm">
                    Try adjusting your category filter, clearing price constraints, or toggling express delivery.
                  </p>
                  <button
                    onClick={handleClearAllFilters}
                    className="mt-2 px-5 py-2 rounded-md bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] font-bold text-xs border border-[#FCD200] transition-colors shadow-sm"
                  >
                    Clear All Filters
                  </button>
                </div>
              ) : (
                filteredProducts.map((product) => {
                  const isFavorited = wishlist[product.id];
                  const isJustAdded = addedItems[product.id];

                  return (
                    <article
                      key={product.id}
                      className="product-card group relative flex flex-col bg-white rounded-lg overflow-hidden shadow-sm border border-[#D5D9D9] hover:shadow-md transition-shadow duration-200"
                      data-id={product.id}
                    >
                    {/* Image Container with Zoom */}
                    <Link
                      href={`/products/${product.slug || 'handcrafted-premium-linen-kurta'}`}
                      className="relative w-full aspect-[3/4] bg-[#F7F8F8] overflow-hidden block"
                    >
                      <Image
                        src={product.image}
                        alt={product.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="img-zoom object-cover object-top transition-transform duration-500 group-hover:scale-105"
                      />

                      {/* Badge (Bestseller, Festive Edit, etc.) */}
                      {product.badge && (
                        <span
                          className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider shadow-sm z-10 ${
                            product.badgeVariant === 'secondary'
                              ? 'bg-[#CC0C39] text-white'
                              : 'bg-[#FF9900] text-[#0F1111]'
                          }`}
                        >
                          {product.badge}
                        </span>
                      )}

                      {/* Wishlist Interactive Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          toggleWishlist(product.id, product.title);
                        }}
                        className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm transition-all active:scale-75 z-10 ${
                          isFavorited
                            ? 'text-red-500 heart-bounce-anim'
                            : 'text-[#565959] hover:text-red-500'
                        }`}
                        title={isFavorited ? 'Remove from Wishlist' : 'Add to Wishlist'}
                        aria-label="Add to Wishlist"
                      >
                        <Heart
                          className={`h-4 w-4 ${isFavorited ? 'fill-current' : ''}`}
                        />
                      </button>

                      {/* Fast Delivery Pill */}
                      {product.isExpress && (
                        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-white/95 px-2 py-0.5 rounded-[4px] text-[10px] font-bold text-[#007185] shadow-xs z-10 border border-[#D5D9D9]">
                          <Zap className="h-3 w-3 fill-current text-[#FF9900]" /> Express 24h
                        </div>
                      )}
                    </Link>

                    {/* Card Content */}
                    <div className="p-3.5 flex flex-col flex-1 justify-between gap-2.5 bg-white">
                      <div>
                        {/* Brand & Rating */}
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-bold text-[#007185] uppercase tracking-wide">
                            {product.brand}
                          </span>
                          <div className="flex items-center gap-0.5 text-xs text-[#FF9900] font-bold">
                            <Star className="h-3.5 w-3.5 fill-current" />
                            <span>{product.rating}</span>
                            <span className="text-[10px] text-[#565959] font-normal">
                              ({product.reviewCount})
                            </span>
                          </div>
                        </div>

                        {/* Title & Subtitle */}
                        <Link
                          href={`/products/${product.slug || 'handcrafted-premium-linen-kurta'}`}
                          className="block group/link"
                        >
                          <h3 className="font-bold text-sm text-[#0F1111] group-hover/link:text-[#007185] group-hover/link:underline transition-colors line-clamp-1">
                            {product.title}
                          </h3>
                        </Link>
                        <p className="text-xs text-[#565959] line-clamp-1 mt-0.5">
                          {product.subtitle}
                        </p>
                      </div>

                      {/* Pricing & Add to Cart */}
                      <div className="space-y-2 pt-1 border-t border-[#D5D9D9]">
                        <div className="flex items-baseline gap-2">
                          <span className="text-base font-extrabold text-[#0F1111] font-mono">
                            {formatINR(product.price)}
                          </span>
                          <span className="text-xs text-[#565959] line-through font-mono">
                            {formatINR(product.originalPrice)}
                          </span>
                          <span className="text-xs font-bold text-[#B12704]">
                            {product.discount}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddToCart(product)}
                          className={`w-full py-[5px] px-[11px] h-[31px] rounded-full text-[14px] font-normal transition-all flex items-center justify-center active:scale-95 shadow-sm border ${
                            isJustAdded
                              ? 'bg-[#067D62] text-white border-[#067D62]'
                              : 'bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] border-[#FCD200]'
                          }`}
                        >
                          {isJustAdded ? (
                            <span>Added to cart ✓</span>
                          ) : (
                            <span>Add to cart</span>
                          )}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              }))}
            </div>

            {/* Catalog Value Callout Banner Strip */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-surface-container-high via-surface-container to-secondary-fixed/40 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs border border-surface-container">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-surface-container-lowest flex items-center justify-center text-primary shadow-sm shrink-0">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-headline font-bold text-sm text-on-surface">
                    Curated Authenticity Certificate
                  </h4>
                  <p className="text-xs text-on-surface-variant">
                    Direct origin dispatch from certified Indian master-weavers with 7-day
                    hassle-free doorstep trial.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-label font-bold text-primary flex items-center gap-1.5 bg-surface-container-lowest px-3 py-1.5 rounded-lg shadow-xs">
                  <CheckCircle className="h-4 w-4 text-primary" /> 100% Pure Silks &amp; Linens
                </span>
              </div>
            </div>

            {/* Numerical Pagination Controls */}
            <div className="pt-6 pb-12 flex flex-col items-center gap-6">
              {/* Number Pagination */}
              <nav aria-label="Catalog pages" className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled
                  className="w-9 h-9 rounded-lg bg-surface-container text-on-surface flex items-center justify-center text-xs font-label font-bold disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="w-9 h-9 rounded-lg bg-primary text-on-primary flex items-center justify-center text-xs font-label font-bold shadow-xs"
                >
                  1
                </button>
                <button
                  type="button"
                  onClick={() => showToast('Switched to Page 2', 'sparkles', false)}
                  className="w-9 h-9 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface flex items-center justify-center text-xs font-label font-bold transition-colors"
                >
                  2
                </button>
                <button
                  type="button"
                  onClick={() => showToast('Switched to Page 3', 'sparkles', false)}
                  className="w-9 h-9 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface flex items-center justify-center text-xs font-label font-bold transition-colors"
                >
                  3
                </button>
                <span className="w-7 text-center text-xs text-on-surface-variant font-bold">
                  ...
                </span>
                <button
                  type="button"
                  onClick={() => showToast('Switched to Page 16', 'sparkles', false)}
                  className="w-9 h-9 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface flex items-center justify-center text-xs font-label font-bold transition-colors"
                >
                  16
                </button>
                <button
                  type="button"
                  onClick={() => showToast('Switched to Page 2', 'sparkles', false)}
                  className="w-9 h-9 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center text-xs font-label font-bold transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </nav>
            </div>
          </main>
        </div>
      </section>

      {/* Floating Interactive Toast Feedback */}
      {toast.show && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-xs font-label font-bold transition-all transform animate-in slide-in-from-bottom-3 duration-300 ${
            toast.isMarigold
              ? 'bg-secondary text-on-secondary'
              : 'bg-primary text-on-primary'
          }`}
          id="toast-container"
        >
          {toast.icon === 'bag' && <ShoppingBag className="h-4 w-4 shrink-0" />}
          {toast.icon === 'heart' && <Heart className="h-4 w-4 fill-current shrink-0" />}
          {toast.icon === 'heart-off' && <Heart className="h-4 w-4 shrink-0" />}
          {toast.icon === 'bolt' && <Zap className="h-4 w-4 shrink-0" />}
          {toast.icon === 'star' && <Star className="h-4 w-4 fill-current shrink-0" />}
          {toast.icon === 'filter' && <Filter className="h-4 w-4 shrink-0" />}
          {toast.icon === 'sliders' && <SlidersHorizontal className="h-4 w-4 shrink-0" />}
          {toast.icon === 'sparkles' && <Sparkles className="h-4 w-4 shrink-0" />}
          {toast.icon === 'check' && <Check className="h-4 w-4 shrink-0" />}
          {toast.icon === 'x' && <X className="h-4 w-4 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
