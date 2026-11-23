'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Smartphone,
  Star,
  Check,
  Heart,
  ShoppingCart,
  SlidersHorizontal,
  X,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Zap,
  Truck,
  RotateCcw,
  Sparkles,
  ArrowUpDown,
  Search,
  Filter,
} from 'lucide-react';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';
import { CategoryProductCard } from '@/components/products/category-product-card';
import { CategoryProductItem } from '@/hooks/use-category-products';

// Fallback mobile data in case database connection experiences network latency in dev/sandbox
const STATIC_MOBILE_FALLBACK: CategoryProductItem[] = [
  {
    id: 'mob-apl-15',
    slug: 'apple-iphone-15-128gb-black',
    title: 'Apple iPhone 17 Pro 512 GB: 15.93 cm (6.3") Display with Promotion up to 120Hz, A19 Pro Chip, Breakthrough Battery Life, Pro Fusion Camera System with Center Stage Front Camera; Cosmic Orange',
    brand: 'Apple',
    category: 'mobiles',
    subcategory: 'smartphones',
    subCategory: 'Flagship Smartphone',
    price: 150990,
    originalPrice: 154900,
    discount: '3% OFF',
    rating: 0,
    reviews: 0,
    isBestSeller: false,
    isAmazonChoice: false,
    isLimitedDeal: true,
    isPrime: true,
    deliveryDate: 'Tomorrow, 11 AM',
    image: '/images/mobiles/iphone-flagship.jpg',
    stockCount: 15,
    inStock: true,
    vendorName: 'Tarun Store',
    vendorSlug: 'tarun-store-fdam',
    sizes: ['512 GB', '1 TB'],
    specs: {
      ram: '8 GB',
      storage: '512 GB',
      network: '5G',
      battery: 'All-Day Battery',
      screen_size: '6.3 inch',
      processor: 'A19 Pro Chip',
      primary_camera: 'Pro Fusion 48MP Camera',
    },
  },
];

// Target Brand list requested in specification
const TARGET_BRANDS = [
  'Apple',
  'Samsung',
  'OnePlus',
  'Xiaomi',
  'Redmi',
  'Vivo',
  'OPPO',
  'Realme',
  'Motorola',
  'Nothing',
];

interface PromotionalBannerSlide {
  id: string;
  badge: string;
  badgeBg: string;
  title: string;
  tagline: string;
  subtext: string;
  ctaText: string;
  actionType: 'flagship' | '5g' | 'budget';
  bgGradient: string;
  primaryImage: string;
  primaryAlt: string;
  secondaryImage: string;
  secondaryAlt: string;
  specHighlight: string;
  trustPoints: string[];
}

const BRAND_HERO_IMAGE_MAP: Record<string, string> = {
  Apple: '/images/mobiles/iphone-flagship.jpg',
  Samsung: '/images/mobiles/samsung-galaxy-flagship.jpg',
  Redmi: '/images/mobiles/redmi-turbo.jpg',
  Realme: '/images/mobiles/realme-narzo.jpg',
  Motorola: '/images/mobiles/motorola-edge.jpg',
};

const PROMOTIONAL_BANNERS: PromotionalBannerSlide[] = [
  {
    id: 'flagship-smartphones',
    badge: 'OFFICIAL FLAGSHIP COLLECTION',
    badgeBg: 'bg-[#FFD814] text-[#0F1111]',
    title: 'Next-Generation Flagship Smartphones',
    tagline: 'Flagship Performance • Pro Cameras • All-Day Battery',
    subtext: 'Discover Apple iPhone 15, Samsung Galaxy S24 and Xiaomi 14 with official manufacturer warranty and verified sellers.',
    ctaText: 'Explore Flagships',
    actionType: 'flagship',
    bgGradient: 'linear-gradient(135deg, #0F1111 0%, #131921 50%, #232F3E 100%)',
    primaryImage: '/images/mobiles/iphone-flagship.jpg',
    primaryAlt: 'Apple iPhone 15 Flagship Smartphone (Dual Front & Rear Display)',
    secondaryImage: '/images/mobiles/samsung-galaxy-flagship.jpg',
    secondaryAlt: 'Samsung Galaxy Flagship Smartphone with S-Pen',
    specHighlight: 'Curated Flagship Smartphones',
    trustPoints: ['100% Genuine Brands', 'Official Warranty', 'Express Delivery'],
  },
  {
    id: '5g-smartphones',
    badge: 'HIGH-SPEED 5G PHONES',
    badgeBg: 'bg-[#007185] text-white',
    title: 'Next-Gen 5G Smartphones',
    tagline: 'Explore the Latest 5G Smartphones',
    subtext: 'Experience fast mobile connectivity, responsive multitasking, and high-performance processors across OnePlus, Nothing, Redmi and Realme.',
    ctaText: 'Shop 5G Mobiles',
    actionType: '5g',
    bgGradient: 'linear-gradient(135deg, #0A2540 0%, #0E3A5D 50%, #12587A 100%)',
    primaryImage: '/images/mobiles/motorola-edge.jpg',
    primaryAlt: 'Motorola Edge 70 Fusion 5G Smartphone',
    secondaryImage: '/images/mobiles/redmi-turbo.jpg',
    secondaryAlt: 'REDMI Turbo 5 5G Smartphone',
    specHighlight: 'High-Speed 5G Connectivity',
    trustPoints: ['100% Genuine Brands', 'Verified 5G Network', '7 Days Return'],
  },
  {
    id: 'budget-smartphones',
    badge: 'VALUE & PERFORMANCE HEROES',
    badgeBg: 'bg-[#232F3E] text-white border border-white/20',
    title: 'Smartphones for Every Budget',
    tagline: 'High-Capacity Battery • Reliable Daily Performance',
    subtext: 'Feature-packed daily drivers engineered for long battery life, social media, and smooth multitasking under ₹25,000.',
    ctaText: 'Shop Under ₹25,000',
    actionType: 'budget',
    bgGradient: 'linear-gradient(135deg, #1A2E26 0%, #1E4334 50%, #235843 100%)',
    primaryImage: '/images/mobiles/realme-narzo.jpg',
    primaryAlt: 'realme NARZO 80 Lite Value Smartphone',
    secondaryImage: '/images/mobiles/redmi-turbo.jpg',
    secondaryAlt: 'REDMI Turbo 5 Smartphone Display',
    specHighlight: 'All-Day Battery & Value',
    trustPoints: ['Unbeatable Value', 'All-Day Battery', 'Genuine Devices'],
  },
];

function MobilesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Stores
  const { addItem, openCart } = useCartStore();
  const { toggleItem, isInWishlist } = useWishlistStore();

  // Data state
  const [products, setProducts] = useState<CategoryProductItem[]>(STATIC_MOBILE_FALLBACK);
  const [isLoading, setIsLoading] = useState(true);
  const [addedItemMap, setAddedItemMap] = useState<Record<string, boolean>>({});

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<string>('all'); // all, under-25k, 25k-40k, 40k-60k, over-60k, custom
  const [customMinPrice, setCustomMinPrice] = useState('');
  const [customMaxPrice, setCustomMaxPrice] = useState('');
  const [selectedRams, setSelectedRams] = useState<string[]>([]);
  const [selectedStorages, setSelectedStorages] = useState<string[]>([]);
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>([]);
  const [selectedBatteries, setSelectedBatteries] = useState<string[]>([]);
  const [selectedScreenSizes, setSelectedScreenSizes] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number>(0);
  const [sortOption, setSortOption] = useState<string>('curated');
  const [activeTab, setActiveTab] = useState<string>('all'); // all, 5g, bestseller, budget, premium, newest

  // Mobile Drawer State
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Banner carousel state
  const [activeBannerIdx, setActiveBannerIdx] = useState(0);

  // Auto-rotate hero banner every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveBannerIdx((prev) => (prev + 1) % PROMOTIONAL_BANNERS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Fetch real database products from /api/products?category=mobiles
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetch('/api/products?category=mobiles&limit=100')
      .then((res) => res.json())
      .then((json) => {
        if (isMounted) {
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            const mapped: CategoryProductItem[] = json.data.map((p: any) => ({
              id: p.id,
              slug: p.slug,
              title: p.title,
              brand: p.brand || 'Vyntra',
              category: p.category || 'mobiles',
              subcategory: 'smartphones',
              subCategory: p.subCategory || 'Smartphone',
              price: Number(p.price || 0),
              originalPrice: Number(p.originalPrice || p.price || 0),
              discount: p.discount || '',
              rating: Number(p.rating) || 0,
              reviews: Number(p.reviewCount) || 0,
              isBestSeller: Boolean(p.badge === 'Bestseller' && (p.reviewCount || 0) > 0),
              isAmazonChoice: false,
              badge: p.badge || 'New Launch',
              isLimitedDeal: Number(p.originalPrice) > Number(p.price) * 1.1,
              isPrime: true,
              deliveryDate: 'Tomorrow, 11 AM',
              image: p.image || BRAND_HERO_IMAGE_MAP[p.brand] || '',
              stockCount: Number(p.stockCount || 10),
              inStock: p.inStock !== false,
              vendorName: p.vendor?.name || 'Tarun Store',
              vendorSlug: p.vendor?.slug || 'tarun-store-fdam',
              sizes: Array.isArray(p.sizes) ? p.sizes : ['Standard'],
              specs: p.specs || {},
            }));
            setProducts(mapped);
          } else {
            setProducts(STATIC_MOBILE_FALLBACK);
          }
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.warn('[Mobiles API fetch fallback]:', err);
        if (isMounted) {
          setProducts(STATIC_MOBILE_FALLBACK);
          setIsLoading(false);
        }
      });
  }, []);

  // Sync initial query params from URL (supports network=5G, tab=5g, etc.)
  useEffect(() => {
    const brandParam = searchParams.get('brand');
    const sortParam = searchParams.get('sort');
    const tabParam = searchParams.get('tab');
    const networkParam = searchParams.get('network');
    const ramParam = searchParams.get('ram');
    const storageParam = searchParams.get('storage');
    const priceParam = searchParams.get('price');
    const qParam = searchParams.get('q');

    if (brandParam) setSelectedBrands(brandParam.split(','));
    if (sortParam) setSortOption(sortParam);
    if (tabParam) {
      setActiveTab(tabParam);
      if (tabParam === '5g') {
        setSelectedNetworks(['5G']);
      }
    }
    if (networkParam) {
      const nets = networkParam.split(',').map((n) => n.trim().toUpperCase());
      setSelectedNetworks(nets);
      if (nets.includes('5G') && (!tabParam || tabParam === 'all')) {
        setActiveTab('5g');
      }
    }
    if (priceParam) setPriceRange(priceParam);
    if (ramParam) setSelectedRams(ramParam.split(','));
    if (storageParam) setSelectedStorages(storageParam.split(','));
    if (qParam) setSearchQuery(qParam);
  }, [searchParams]);

  // Handle Add to Cart
  const handleAddToCart = (product: CategoryProductItem) => {
    addItem({
      id: `${product.id}-default`,
      productId: product.id,
      variantId: `${product.id}-v1`,
      vendorName: product.vendorName || 'Tarun Store',
      title: product.title,
      brand: product.brand,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      size: product.sizes?.[0] || 'Standard',
      color: 'Default',
      quantity: 1,
    });
    setAddedItemMap((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedItemMap((prev) => ({ ...prev, [product.id]: false }));
    }, 2000);
    openCart();
  };

  // Handle Wishlist Toggle
  const handleToggleWishlist = (product: CategoryProductItem) => {
    toggleItem({
      id: product.id,
      productId: product.id,
      slug: product.slug,
      title: product.title,
      brand: product.brand,
      price: product.price,
      originalPrice: product.originalPrice,
      discount: product.discount,
      image: product.image,
      inStock: product.inStock,
      boardIds: [],
    });
  };

  // Reset All Filters & clean URL
  const handleResetFilters = () => {
    setSelectedBrands([]);
    setPriceRange('all');
    setCustomMinPrice('');
    setCustomMaxPrice('');
    setSelectedRams([]);
    setSelectedStorages([]);
    setSelectedNetworks([]);
    setSelectedBatteries([]);
    setSelectedScreenSizes([]);
    setMinRating(0);
    setSearchQuery('');
    setSortOption('curated');
    setActiveTab('all');
    router.replace('/mobiles', { scroll: false });
  };

  // Handle Banner CTA Destination & Filtering (Preserves selection in URL)
  const handleBannerCtaClick = (actionType: 'flagship' | '5g' | 'budget') => {
    handleResetFilters();
    if (actionType === 'flagship') {
      setActiveTab('premium');
      router.replace('/mobiles?tab=premium', { scroll: false });
    } else if (actionType === '5g') {
      setActiveTab('5g');
      setSelectedNetworks(['5G']);
      router.replace('/mobiles?network=5G&tab=5g', { scroll: false });
    } else if (actionType === 'budget') {
      setActiveTab('budget');
      setPriceRange('under-25k');
      router.replace('/mobiles?tab=budget&price=under-25k', { scroll: false });
    }

    // Smooth scroll down to products catalog
    const catalogElement = document.getElementById('mobiles-catalog');
    if (catalogElement) {
      catalogElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Available brands derived from real data
  const availableBrandsWithCount = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      counts[p.brand] = (counts[p.brand] || 0) + 1;
    });
    return TARGET_BRANDS.filter((b) => (counts[b] || 0) > 0).map((b) => ({
      name: b,
      count: counts[b] || 0,
    }));
  }, [products]);

  // Supported RAM options
  const availableRamsWithCount = useMemo(() => {
    const counts: Record<string, number> = {
      '4 GB': 0,
      '6 GB': 0,
      '8 GB': 0,
      '12 GB': 0,
      '16 GB': 0,
    };
    products.forEach((p) => {
      const ram = p.specs?.ram;
      if (ram && counts[ram] !== undefined) {
        counts[ram]++;
      }
    });
    return Object.entries(counts).filter(([_, count]) => count > 0);
  }, [products]);

  // Supported Storage options
  const availableStoragesWithCount = useMemo(() => {
    const counts: Record<string, number> = {
      '64 GB': 0,
      '128 GB': 0,
      '256 GB': 0,
      '512 GB': 0,
      '1 TB': 0,
    };
    products.forEach((p) => {
      const st = p.specs?.storage;
      if (st && counts[st] !== undefined) {
        counts[st]++;
      }
    });
    return Object.entries(counts).filter(([_, count]) => count > 0);
  }, [products]);

  // Active filters count for mobile badge
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedBrands.length > 0) count += selectedBrands.length;
    if (priceRange !== 'all') count += 1;
    if (customMinPrice || customMaxPrice) count += 1;
    if (selectedRams.length > 0) count += selectedRams.length;
    if (selectedStorages.length > 0) count += selectedStorages.length;
    if (selectedNetworks.length > 0) count += selectedNetworks.length;
    if (selectedBatteries.length > 0) count += selectedBatteries.length;
    if (selectedScreenSizes.length > 0) count += selectedScreenSizes.length;
    if (minRating > 0) count += 1;
    if (searchQuery.trim().length > 0) count += 1;
    return count;
  }, [
    selectedBrands,
    priceRange,
    customMinPrice,
    customMaxPrice,
    selectedRams,
    selectedStorages,
    selectedNetworks,
    selectedBatteries,
    selectedScreenSizes,
    minRating,
    searchQuery,
  ]);

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      // 1. Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesText =
          item.title.toLowerCase().includes(q) ||
          item.brand.toLowerCase().includes(q) ||
          (item.specs?.processor || '').toLowerCase().includes(q);
        if (!matchesText) return false;
      }

      // 2. Brand Filter
      if (selectedBrands.length > 0) {
        if (!selectedBrands.includes(item.brand)) return false;
      }

      // 3. Tab Filter
      if (activeTab === '5g') {
        if ((item.specs?.network || '').toLowerCase() !== '5g') return false;
      } else if (activeTab === 'bestseller') {
        if (!item.isBestSeller && (item.reviews || 0) < 10) return false;
      } else if (activeTab === 'budget') {
        if (item.price > 25000) return false;
      } else if (activeTab === 'premium') {
        if (item.price < 50000) return false;
      }

      // 4. Price Range (Modern Smartphone Brackets)
      if (priceRange === 'under-20k' && item.price >= 20000) return false;
      if (priceRange === '20k-35k' && (item.price < 20000 || item.price > 35000)) return false;
      if (priceRange === '35k-50k' && (item.price < 35000 || item.price > 50000)) return false;
      if (priceRange === 'over-50k' && item.price <= 50000) return false;

      // Legacy fallback price ranges
      if (priceRange === 'under-25k' && item.price >= 25000) return false;
      if (priceRange === '25k-40k' && (item.price < 25000 || item.price > 40000)) return false;
      if (priceRange === '40k-60k' && (item.price < 40000 || item.price > 60000)) return false;
      if (priceRange === 'over-60k' && item.price <= 60000) return false;

      // Custom Price
      if (customMinPrice && item.price < parseFloat(customMinPrice)) return false;
      if (customMaxPrice && item.price > parseFloat(customMaxPrice)) return false;

      // 5. RAM
      if (selectedRams.length > 0) {
        const itemRam = item.specs?.ram || '';
        const hasRam = selectedRams.some((r) => itemRam.includes(r.replace(' ', '')));
        if (!hasRam) return false;
      }

      // 6. Storage
      if (selectedStorages.length > 0) {
        const itemStorage = item.specs?.storage || '';
        const hasStorage = selectedStorages.some((s) => itemStorage.includes(s.replace(' ', '')));
        if (!hasStorage) return false;
      }

      // 7. Network
      if (selectedNetworks.length > 0) {
        const itemNet = (item.specs?.network || '').toUpperCase();
        if (!selectedNetworks.includes(itemNet)) return false;
      }

      // 8. Battery
      if (selectedBatteries.length > 0) {
        const battVal = parseInt((item.specs?.battery || '').replace(/\D/g, ''), 10) || 0;
        const matchesBattery = selectedBatteries.some((b) => {
          if (b === '5000+') return battVal >= 5000;
          if (b === '4000-4999') return battVal >= 4000 && battVal < 5000;
          return true;
        });
        if (!matchesBattery) return false;
      }

      // 9. Screen Size
      if (selectedScreenSizes.length > 0) {
        const scrVal = parseFloat(item.specs?.screen_size || '0');
        const matchesScreen = selectedScreenSizes.some((s) => {
          if (s === 'compact') return scrVal < 6.4;
          if (s === 'large') return scrVal >= 6.5;
          return true;
        });
        if (!matchesScreen) return false;
      }

      // 10. Rating
      if (minRating > 0 && item.rating < minRating) return false;

      return true;
    });
  }, [
    products,
    searchQuery,
    selectedBrands,
    activeTab,
    priceRange,
    customMinPrice,
    customMaxPrice,
    selectedRams,
    selectedStorages,
    selectedNetworks,
    selectedBatteries,
    selectedScreenSizes,
    minRating,
  ]);

  // Sort Filtered Products
  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    if (sortOption === 'price-low') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortOption === 'price-high') {
      list.sort((a, b) => b.price - a.price);
    } else if (sortOption === 'rating') {
      list.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
    } else if (sortOption === 'newest') {
      list.sort((a, b) => b.id.localeCompare(a.id));
    } else {
      // 'curated' default: bestsellers and high ratings first
      list.sort((a, b) => (b.isBestSeller ? 1 : 0) - (a.isBestSeller ? 1 : 0) || b.rating - a.rating);
    }
    return list;
  }, [filteredProducts, sortOption]);

  // Synchronize active filters into URL query parameters
  const syncUrl = (overrides?: {
    brands?: string[];
    price?: string;
    rams?: string[];
    storages?: string[];
    networks?: string[];
    tab?: string;
  }) => {
    const brands = overrides?.brands !== undefined ? overrides.brands : selectedBrands;
    const price = overrides?.price !== undefined ? overrides.price : priceRange;
    const rams = overrides?.rams !== undefined ? overrides.rams : selectedRams;
    const storages = overrides?.storages !== undefined ? overrides.storages : selectedStorages;
    const networks = overrides?.networks !== undefined ? overrides.networks : selectedNetworks;
    const tab = overrides?.tab !== undefined ? overrides.tab : activeTab;

    const params = new URLSearchParams();
    if (tab && tab !== 'all') params.set('tab', tab);
    if (brands.length > 0) params.set('brand', brands.join(','));
    if (price && price !== 'all') params.set('price', price);
    if (rams.length > 0) params.set('ram', rams.join(','));
    if (storages.length > 0) params.set('storage', storages.join(','));
    if (networks.length > 0) params.set('network', networks.join(','));

    const queryStr = params.toString();
    router.replace(queryStr ? `/mobiles?${queryStr}` : '/mobiles', { scroll: false });
  };

  // Toggle single brand with URL sync
  const handleToggleBrand = (brand: string) => {
    setSelectedBrands((prev) => {
      const updated = prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand];
      syncUrl({ brands: updated });
      return updated;
    });
  };

  // Select price range with URL sync
  const handleSelectPriceRange = (range: string) => {
    setPriceRange(range);
    syncUrl({ price: range });
  };

  // Toggle RAM with URL sync
  const handleToggleRam = (ram: string) => {
    setSelectedRams((prev) => {
      const updated = prev.includes(ram) ? prev.filter((r) => r !== ram) : [...prev, ram];
      syncUrl({ rams: updated });
      return updated;
    });
  };

  // Toggle Storage with URL sync
  const handleToggleStorage = (storage: string) => {
    setSelectedStorages((prev) => {
      const updated = prev.includes(storage) ? prev.filter((s) => s !== storage) : [...prev, storage];
      syncUrl({ storages: updated });
      return updated;
    });
  };

  // Toggle Network with URL sync
  const handleToggleNetwork = (network: string) => {
    setSelectedNetworks((prev) => {
      const updated = prev.includes(network) ? prev.filter((n) => n !== network) : [...prev, network];
      let newTab = activeTab;
      if (network === '5G') {
        if (!updated.includes('5G') && activeTab === '5g') {
          newTab = 'all';
          setActiveTab('all');
        } else if (updated.includes('5G')) {
          newTab = '5g';
          setActiveTab('5g');
        }
      }
      syncUrl({ networks: updated, tab: newTab });
      return updated;
    });
  };

  // Select Tab with URL sync
  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    let networks = selectedNetworks;
    let price = priceRange;
    if (tabId === '5g') {
      networks = ['5G'];
      setSelectedNetworks(['5G']);
    } else if (tabId === 'budget') {
      price = 'under-20k';
      setPriceRange('under-20k');
    } else if (tabId === 'premium') {
      price = 'over-50k';
      setPriceRange('over-50k');
    } else if (tabId === 'all') {
      networks = [];
      price = 'all';
      setSelectedNetworks([]);
      setPriceRange('all');
    }
    syncUrl({ tab: tabId, networks, price });
  };

  return (
    <div className="w-full bg-[#F7F7F7] min-h-screen text-[#0F1111]">
      {/* 1. Breadcrumbs */}
      <div className="w-full bg-white border-b border-[#E7E7E7]">
        <div className="w-full max-w-[1400px] mx-auto px-4 py-2.5 text-xs text-[#565959] flex items-center gap-1.5 flex-wrap">
          <Link href="/" className="hover:text-[#007185] hover:underline">
            Home
          </Link>
          <ChevronRight className="h-3 w-3 text-[#888888]" />
          <Link href="/products?category=electronics" className="hover:text-[#007185] hover:underline">
            Electronics
          </Link>
          <ChevronRight className="h-3 w-3 text-[#888888]" />
          <span className="font-bold text-[#0F1111]">Mobiles & Smartphones</span>
        </div>
      </div>

      {/* 2. Page Header & Promotional Hero Carousel */}
      <section className="w-full max-w-[1400px] mx-auto px-4 pt-4 pb-2">
        {/* Title Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#007185] mb-1">
              <Smartphone className="h-4 w-4" />
              <span>Official Electronics Department</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-headline text-[#0F1111] tracking-tight">
              Mobiles & Smartphones
            </h1>
            <p className="text-xs sm:text-sm text-[#565959] mt-0.5">
              Discover cutting-edge 5G performance, pro-grade cameras, and exceptional value across top smartphone brands.
            </p>
          </div>

          {/* Quick Stats Badges */}
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#E7E7E7] text-[#0F1111] font-medium shadow-2xs">
              <ShieldCheck className="h-3.5 w-3.5 text-[#007600]" />
              100% Genuine Brands
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#E7E7E7] text-[#0F1111] font-medium shadow-2xs">
              <RotateCcw className="h-3.5 w-3.5 text-[#007185]" />
              7 Days Return
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#E7E7E7] text-[#0F1111] font-medium shadow-2xs">
              <Truck className="h-3.5 w-3.5 text-[#E67A00]" />
              Fast Delivery
            </span>
          </div>
        </div>

        {/* Dynamic Promotional Hero Banner Carousel */}
        <div className="relative w-full rounded-2xl overflow-hidden shadow-md bg-[#0F1111] transition-all duration-500 mb-6 border border-white/10 group">
          {PROMOTIONAL_BANNERS.map((banner, idx) => {
            if (idx !== activeBannerIdx) return null;
            return (
              <div
                key={banner.id}
                style={{ background: banner.bgGradient }}
                className="w-full relative min-h-[360px] sm:min-h-[380px] p-6 sm:p-8 md:p-10 text-white flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden"
              >
                {/* Subtle ambient lighting glows behind phone visual */}
                <div
                  aria-hidden="true"
                  className="absolute -right-12 -bottom-12 w-96 h-96 rounded-full bg-[#FFD814]/15 blur-3xl pointer-events-none"
                />
                <div
                  aria-hidden="true"
                  className="absolute right-1/3 top-0 w-72 h-72 rounded-full bg-[#007185]/20 blur-3xl pointer-events-none"
                />

                {/* LEFT SECTION: Focused Smartphone Shopping Copy & Verified Highlights */}
                <div className="space-y-4 max-w-xl z-10 w-full md:w-7/12">
                  {/* Badge & Authenticity Pill */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-xs ${banner.badgeBg}`}
                    >
                      <Sparkles className="h-3 w-3" />
                      {banner.badge}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-200 bg-white/10 px-2.5 py-0.5 rounded-full backdrop-blur-xs border border-white/10">
                      <ShieldCheck className="h-3.5 w-3.5 text-[#FFD814]" />
                      Verified Marketplace Sellers
                    </span>
                  </div>

                  {/* Heading */}
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
                    {banner.title}
                  </h2>

                  {/* Tagline */}
                  <p className="text-sm sm:text-base font-bold text-[#FFD814] flex items-center gap-2">
                    <Zap className="h-4 w-4 shrink-0" />
                    <span>{banner.tagline}</span>
                  </p>

                  {/* Concise Supporting Copy */}
                  <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                    {banner.subtext}
                  </p>

                  {/* Trust and Feature Points */}
                  <div className="pt-1 flex items-center gap-3 sm:gap-4 flex-wrap text-[11px] sm:text-xs text-stone-300">
                    {banner.trustPoints.map((tp) => (
                      <span key={tp} className="inline-flex items-center gap-1">
                        <Check className="h-3.5 w-3.5 text-[#00A87E]" />
                        {tp}
                      </span>
                    ))}
                  </div>

                  {/* CTA Action & Trust Subtext */}
                  <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleBannerCtaClick(banner.actionType)}
                      className="px-7 py-3 rounded-full bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] text-xs sm:text-sm font-extrabold shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2 cursor-pointer group/btn"
                    >
                      <span>{banner.ctaText}</span>
                      <ChevronRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                    </button>
                    <span className="text-[11px] text-stone-300">
                      No hidden fees • 100% Genuine Brand Warranty
                    </span>
                  </div>
                </div>

                {/* RIGHT SECTION: Realistic Smartphone Product Visuals (Front & Angled Rear View) */}
                <div className="relative w-full md:w-5/12 flex items-center justify-center z-10 mt-2 md:mt-0">
                  <div className="relative w-full max-w-[340px] sm:max-w-[380px] h-56 sm:h-64 md:h-72 flex items-center justify-center">
                    
                    {/* Secondary/Rear smartphone visual (Angled backdrop effect showing depth) */}
                    <div className="absolute right-3 sm:right-5 top-2 w-36 sm:w-44 h-48 sm:h-56 rounded-2xl overflow-hidden shadow-2xl border border-white/20 transform rotate-6 scale-95 opacity-90 transition-transform duration-500 group-hover:rotate-8 bg-white/95 p-1.5 sm:p-2.5">
                      <div className="relative w-full h-full">
                        <Image
                          src={banner.secondaryImage}
                          alt={banner.secondaryAlt}
                          fill
                          sizes="(max-width: 640px) 160px, 200px"
                          className="object-contain"
                        />
                      </div>
                    </div>

                    {/* Primary smartphone visual (Front & Pro camera) */}
                    <div className="relative z-20 -left-4 sm:-left-6 bottom-1 w-40 sm:w-52 h-52 sm:h-64 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/30 transform -rotate-3 transition-transform duration-500 group-hover:-rotate-1 bg-white p-2 sm:p-3">
                      <div className="relative w-full h-full">
                        <Image
                          src={banner.primaryImage}
                          alt={banner.primaryAlt}
                          fill
                          priority={idx === 0}
                          sizes="(max-width: 640px) 180px, 240px"
                          className="object-contain"
                        />
                      </div>
                    </div>

                    {/* Floating spec pill */}
                    <div className="absolute bottom-2 left-0 sm:left-2 z-30 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/20 text-white text-[11px] font-semibold shadow-lg">
                      <Smartphone className="h-3.5 w-3.5 text-[#FFD814]" />
                      <span>{banner.specHighlight}</span>
                    </div>
                  </div>
                </div>

                {/* Carousel Arrow Controls (Previous / Next) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveBannerIdx((prev) => (prev - 1 + PROMOTIONAL_BANNERS.length) % PROMOTIONAL_BANNERS.length);
                  }}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white/80 hover:text-white backdrop-blur-xs border border-white/10 transition-all opacity-0 group-hover:opacity-100 z-30 cursor-pointer focus:opacity-100"
                  aria-label="Previous promotional slide"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveBannerIdx((prev) => (prev + 1) % PROMOTIONAL_BANNERS.length);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white/80 hover:text-white backdrop-blur-xs border border-white/10 transition-all opacity-0 group-hover:opacity-100 z-30 cursor-pointer focus:opacity-100"
                  aria-label="Next promotional slide"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            );
          })}

          {/* Carousel Dot Indicators */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-30">
            {PROMOTIONAL_BANNERS.map((banner, i) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => setActiveBannerIdx(i)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  i === activeBannerIdx ? 'w-6 bg-[#FFD814]' : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Go to slide ${i + 1}: ${banner.title}`}
              />
            ))}
          </div>
        </div>

        {/* 3. Brand Navigation Ribbon */}
        <div className="w-full bg-white rounded-xl border border-[#E7E7E7] p-4 shadow-2xs mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs sm:text-sm font-bold text-[#0F1111] uppercase tracking-wider flex items-center gap-1.5">
              <span>Top Brands</span>
              <span className="text-xs font-normal text-[#565959]">
                ({availableBrandsWithCount.length} with live inventory)
              </span>
            </h3>
            {selectedBrands.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedBrands([])}
                className="text-xs text-[#007185] hover:underline font-semibold"
              >
                Clear Brands ({selectedBrands.length})
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {availableBrandsWithCount.map(({ name, count }) => {
              const isSelected = selectedBrands.includes(name);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleToggleBrand(name)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border active:scale-95 cursor-pointer ${
                    isSelected
                      ? 'bg-[#0F1111] text-white border-[#0F1111] shadow-xs'
                      : 'bg-stone-50 hover:bg-white border-[#E7E7E7] text-[#0F1111]'
                  }`}
                >
                  <span>{name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-stone-200 text-[#565959]'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Discovery Collections & Fast Quick Filter Chips Ribbon */}
        <div className="w-full bg-white rounded-2xl border border-[#E7E7E7] p-3.5 sm:p-4 mb-4 shadow-2xs space-y-3">
          {/* Row A: Intent Collections Tabs + Mobile Drawer Toggle */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 border-b border-[#E7E7E7]/60 scrollbar-none">
            <div className="flex items-center gap-1.5 sm:gap-2">
              {[
                { id: 'all', label: 'All Mobiles' },
                { id: '5g', label: '5G Smartphones' },
                { id: 'newest', label: 'New Launches' },
                { id: 'budget', label: 'Under ₹20,000' },
                { id: 'premium', label: 'Flagship (> ₹50,000)' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSelectTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-[#FFD814] text-[#0F1111] shadow-2xs ring-1 ring-[#FFD814]'
                      : 'text-[#565959] hover:text-[#0F1111] hover:bg-stone-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Mobile Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-stone-50 border border-[#D5D9D9] text-xs font-bold text-[#0F1111] shadow-2xs hover:bg-white cursor-pointer shrink-0"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-[#007185]" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#007185] text-white text-[10px] flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Row B: Quick Budget, RAM, & Storage Chips */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none text-xs pt-0.5">
            <span className="text-[11px] font-bold text-[#565959] uppercase tracking-wider shrink-0 flex items-center gap-1">
              <span>Budget:</span>
            </span>

            {[
              { id: 'all', label: 'All Prices' },
              { id: 'under-20k', label: '< ₹20k' },
              { id: '20k-35k', label: '₹20k - ₹35k' },
              { id: '35k-50k', label: '₹35k - ₹50k' },
              { id: 'over-50k', label: '₹50k+' },
            ].map((b) => {
              const isActive = priceRange === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleSelectPriceRange(b.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer active:scale-95 ${
                    isActive
                      ? 'bg-[#007185] text-white border-[#007185] shadow-xs'
                      : 'bg-stone-50 hover:bg-white border-[#D5D9D9] text-[#0F1111]'
                  }`}
                >
                  {b.label}
                </button>
              );
            })}

            <span className="text-[#D5D9D9] mx-1 shrink-0">|</span>

            <span className="text-[11px] font-bold text-[#565959] uppercase tracking-wider shrink-0">
              RAM:
            </span>
            {['8 GB', '12 GB', '16 GB'].map((ram) => {
              const isSelected = selectedRams.includes(ram);
              return (
                <button
                  key={ram}
                  type="button"
                  onClick={() => handleToggleRam(ram)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-[#007185] text-white border-[#007185] shadow-xs'
                      : 'bg-stone-50 hover:bg-white border-[#D5D9D9] text-[#0F1111]'
                  }`}
                >
                  {ram}
                </button>
              );
            })}

            <span className="text-[#D5D9D9] mx-1 shrink-0">|</span>

            <span className="text-[11px] font-bold text-[#565959] uppercase tracking-wider shrink-0">
              Storage:
            </span>
            {['128 GB', '256 GB', '512 GB'].map((st) => {
              const isSelected = selectedStorages.includes(st);
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleToggleStorage(st)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-[#007185] text-white border-[#007185] shadow-xs'
                      : 'bg-stone-50 hover:bg-white border-[#D5D9D9] text-[#0F1111]'
                  }`}
                >
                  {st}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. Main Shop Section: Filters Sidebar + Products Grid */}
      <div id="mobiles-catalog" className="w-full max-w-[1400px] mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* ======================================================== */}
          {/* DESKTOP FILTERS SIDEBAR */}
          {/* ======================================================== */}
          <aside className="hidden lg:block bg-white rounded-xl border border-[#E7E7E7] p-5 shadow-2xs space-y-6 sticky top-20">
            {/* Header / Reset */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
              <span className="text-sm font-bold text-[#0F1111] uppercase tracking-wide flex items-center gap-1.5">
                <SlidersHorizontal className="h-4 w-4 text-[#007185]" />
                Filters
              </span>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs text-[#007185] hover:underline font-semibold"
                >
                  Reset All ({activeFiltersCount})
                </button>
              )}
            </div>

            {/* Keyword Search within category */}
            <div>
              <label className="text-xs font-bold text-[#0F1111] uppercase block mb-1.5">
                Search Mobiles
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. iPhone, 5G, Snapdragon..."
                  className="w-full text-xs pl-8 pr-7 py-2 bg-stone-50 border border-[#D5D9D9] rounded-md focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900]"
                />
                <Search className="h-3.5 w-3.5 text-[#565959] absolute left-2.5 top-2.5" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-[#888888] hover:text-[#0F1111]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Brand Checkboxes */}
            <div>
              <span className="text-xs font-bold text-[#0F1111] uppercase block mb-2">
                Brand
              </span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {availableBrandsWithCount.map(({ name, count }) => (
                  <label
                    key={name}
                    className="flex items-center justify-between text-xs text-[#0F1111] hover:text-[#007185] cursor-pointer group select-none"
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedBrands.includes(name)}
                        onChange={() => handleToggleBrand(name)}
                        className="rounded-xs border-[#D5D9D9] text-[#007185] focus:ring-[#007185] cursor-pointer"
                      />
                      <span>{name}</span>
                    </span>
                    <span className="text-[11px] text-[#565959]">({count})</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Range Filter */}
            <div className="pt-2 border-t border-[#E7E7E7]">
              <span className="text-xs font-bold text-[#0F1111] uppercase block mb-2">
                Price Range
              </span>
              <div className="space-y-1.5 text-xs text-[#0F1111]">
                {[
                  { id: 'all', label: 'All Prices' },
                  { id: 'under-20k', label: 'Under ₹20,000 (Budget 5G)' },
                  { id: '20k-35k', label: '₹20,000 - ₹35,000 (Mid-Range)' },
                  { id: '35k-50k', label: '₹35,000 - ₹50,000 (Performance)' },
                  { id: 'over-50k', label: 'Over ₹50,000 (Ultra Flagship)' },
                ].map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-center gap-2 hover:text-[#007185] cursor-pointer select-none"
                  >
                    <input
                      type="radio"
                      name="desktopPrice"
                      checked={priceRange === opt.id}
                      onChange={() => handleSelectPriceRange(opt.id)}
                      className="text-[#007185] focus:ring-[#007185] cursor-pointer"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>

              {/* Custom Min / Max inputs */}
              <div className="mt-3 pt-2 border-t border-dashed border-[#E7E7E7]">
                <span className="text-[11px] text-[#565959] block mb-1">Custom Range (₹)</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={customMinPrice}
                    onChange={(e) => setCustomMinPrice(e.target.value)}
                    placeholder="Min"
                    className="w-1/2 text-xs px-2 py-1 bg-stone-50 border border-[#D5D9D9] rounded-sm focus:outline-none focus:border-[#FF9900]"
                  />
                  <span className="text-xs text-[#888888]">-</span>
                  <input
                    type="number"
                    value={customMaxPrice}
                    onChange={(e) => setCustomMaxPrice(e.target.value)}
                    placeholder="Max"
                    className="w-1/2 text-xs px-2 py-1 bg-stone-50 border border-[#D5D9D9] rounded-sm focus:outline-none focus:border-[#FF9900]"
                  />
                </div>
              </div>
            </div>

            {/* RAM Filter */}
            <div className="pt-2 border-t border-[#E7E7E7]">
              <span className="text-xs font-bold text-[#0F1111] uppercase block mb-2">
                RAM
              </span>
              <div className="space-y-1.5">
                {availableRamsWithCount.map(([ram, count]) => (
                  <label
                    key={ram}
                    className="flex items-center justify-between text-xs text-[#0F1111] hover:text-[#007185] cursor-pointer select-none"
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedRams.includes(ram)}
                        onChange={() => handleToggleRam(ram)}
                        className="rounded-xs border-[#D5D9D9] text-[#007185] focus:ring-[#007185] cursor-pointer"
                      />
                      <span>{ram}</span>
                    </span>
                    <span className="text-[11px] text-[#565959]">({count})</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Internal Storage Filter */}
            <div className="pt-2 border-t border-[#E7E7E7]">
              <span className="text-xs font-bold text-[#0F1111] uppercase block mb-2">
                Storage
              </span>
              <div className="space-y-1.5">
                {availableStoragesWithCount.map(([st, count]) => (
                  <label
                    key={st}
                    className="flex items-center justify-between text-xs text-[#0F1111] hover:text-[#007185] cursor-pointer select-none"
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedStorages.includes(st)}
                        onChange={() => handleToggleStorage(st)}
                        className="rounded-xs border-[#D5D9D9] text-[#007185] focus:ring-[#007185] cursor-pointer"
                      />
                      <span>{st}</span>
                    </span>
                    <span className="text-[11px] text-[#565959]">({count})</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Network / 5G Filter */}
            <div className="pt-2 border-t border-[#E7E7E7]">
              <span className="text-xs font-bold text-[#0F1111] uppercase block mb-2">
                Network Technology
              </span>
              <div className="space-y-1.5 text-xs text-[#0F1111]">
                {['5G', '4G'].map((net) => (
                  <label
                    key={net}
                    className="flex items-center gap-2 hover:text-[#007185] cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={selectedNetworks.includes(net)}
                      onChange={() => handleToggleNetwork(net)}
                      className="rounded-xs border-[#D5D9D9] text-[#007185] focus:ring-[#007185] cursor-pointer"
                    />
                    <span>{net} Smartphones</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Customer Rating Filter */}
            <div className="pt-2 border-t border-[#E7E7E7]">
              <span className="text-xs font-bold text-[#0F1111] uppercase block mb-2">
                Customer Rating
              </span>
              <div className="space-y-1.5 text-xs text-[#0F1111]">
                {[4, 3].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setMinRating(minRating === star ? 0 : star)}
                    className={`flex items-center gap-1.5 w-full text-left py-0.5 hover:text-[#007185] cursor-pointer ${
                      minRating === star ? 'font-bold text-[#007185]' : ''
                    }`}
                  >
                    <div className="flex text-[#FFA41C]">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${
                            i < star ? 'fill-[#FFA41C] text-[#FFA41C]' : 'text-stone-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span>&amp; Up</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* ======================================================== */}
          {/* PRODUCT RESULTS GRID & HEADER */}
          {/* ======================================================== */}
          <main className="lg:col-span-3 space-y-4">
            {/* Results bar & Sorting Controls */}
            <div className="bg-white rounded-xl border border-[#E7E7E7] px-4 py-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-sm font-bold text-[#0F1111]">
                  Showing {sortedProducts.length} Smartphone{sortedProducts.length === 1 ? '' : 's'}
                </span>
                {activeFiltersCount > 0 && (
                  <span className="text-xs text-[#565959] ml-2">
                    ({activeFiltersCount} active filter{activeFiltersCount === 1 ? '' : 's'})
                  </span>
                )}
              </div>

              {/* Sorting Dropdown */}
              <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
                <span className="text-[#565959] font-medium hidden sm:inline">Sort by:</span>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                  className="bg-stone-50 border border-[#D5D9D9] text-[#0F1111] text-xs font-semibold py-1.5 px-3 rounded-md focus:outline-none focus:border-[#FF9900] cursor-pointer"
                >
                  <option value="curated">Featured / Popularity</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Avg. Customer Review</option>
                  <option value="newest">Newest Arrivals</option>
                </select>
              </div>
            </div>

            {/* Active Filter Chips */}
            {activeFiltersCount > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                {selectedBrands.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => handleToggleBrand(b)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#D5D9D9] text-[#0F1111] hover:bg-stone-100"
                  >
                    <span>Brand: {b}</span>
                    <X className="h-3 w-3 text-[#565959]" />
                  </button>
                ))}
                {priceRange !== 'all' && (
                  <button
                    type="button"
                    onClick={() => handleSelectPriceRange('all')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#D5D9D9] text-[#0F1111] hover:bg-stone-100 font-medium"
                  >
                    <span>
                      Price:{' '}
                      {priceRange === 'under-20k'
                        ? 'Under ₹20,000'
                        : priceRange === '20k-35k'
                        ? '₹20,000 - ₹35,000'
                        : priceRange === '35k-50k'
                        ? '₹35,000 - ₹50,000'
                        : priceRange === 'over-50k'
                        ? 'Over ₹50,000'
                        : priceRange === 'under-25k'
                        ? 'Under ₹25,000'
                        : priceRange}
                    </span>
                    <X className="h-3 w-3 text-[#565959]" />
                  </button>
                )}
                {selectedRams.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleToggleRam(r)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#D5D9D9] text-[#0F1111] hover:bg-stone-100 font-medium"
                  >
                    <span>RAM: {r}</span>
                    <X className="h-3 w-3 text-[#565959]" />
                  </button>
                ))}
                {selectedStorages.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleToggleStorage(s)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#D5D9D9] text-[#0F1111] hover:bg-stone-100 font-medium"
                  >
                    <span>Storage: {s}</span>
                    <X className="h-3 w-3 text-[#565959]" />
                  </button>
                ))}
                {selectedNetworks.map((net) => (
                  <button
                    key={net}
                    type="button"
                    onClick={() => handleToggleNetwork(net)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#D5D9D9] text-[#0F1111] hover:bg-stone-100 font-medium cursor-pointer"
                  >
                    <span>Network: {net}</span>
                    <X className="h-3 w-3 text-[#565959]" />
                  </button>
                ))}
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#D5D9D9] text-[#0F1111] hover:bg-stone-100"
                  >
                    <span>Search: &quot;{searchQuery}&quot;</span>
                    <X className="h-3 w-3 text-[#565959]" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs text-[#007185] hover:underline font-bold px-1"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Product Cards Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-lg border border-[#E7E7E7] p-4 h-[420px] animate-pulse space-y-3"
                  >
                    <div className="w-full aspect-[3/4] bg-stone-200 rounded-md" />
                    <div className="h-4 bg-stone-200 rounded w-1/3" />
                    <div className="h-4 bg-stone-200 rounded w-3/4" />
                    <div className="h-6 bg-stone-200 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : sortedProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {sortedProducts.map((prod) => (
                  <div key={prod.id} className="relative flex flex-col justify-between">
                    <CategoryProductCard
                      product={prod}
                      isSaved={isInWishlist(prod.id)}
                      isAdded={addedItemMap[prod.id]}
                      onAddToCart={handleAddToCart}
                      onToggleWishlist={handleToggleWishlist}
                    />

                    {/* Quick Specs Pill Under Card */}
                    {prod.specs && (
                      <div className="mt-1 px-3 py-1.5 bg-white rounded-md border border-[#E7E7E7] text-[11px] text-[#565959] flex items-center justify-between gap-2 shadow-2xs">
                        <span className="font-semibold text-[#0F1111]">
                          {prod.specs.ram || '8 GB'} | {prod.specs.storage || '128 GB'}
                        </span>
                        <span className="text-[#007185] font-bold">
                          {prod.specs.network || '5G'}
                        </span>
                        <span className="truncate">
                          {prod.specs.battery || '5000 mAh'}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              /* Empty State */
              <div className="bg-white rounded-xl border border-[#E7E7E7] p-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
                  <Smartphone className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-[#0F1111]">
                  No smartphones match your selected filters
                </h3>
                <p className="text-sm text-[#565959] max-w-md mx-auto">
                  Try adjusting your price range, RAM, storage, or brand selections to discover more smartphones.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-6 py-2 rounded-full bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MOBILE ACCESSIBLE FILTER DRAWER / BOTTOM SHEET */}
      {/* ======================================================== */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative ml-auto w-full max-w-xs bg-white h-full shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="px-5 py-4 border-b border-[#E7E7E7] flex items-center justify-between">
              <span className="font-bold text-sm text-[#0F1111] uppercase tracking-wide flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-[#007185]" />
                Filters
                {activeFiltersCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-[#007185] text-white text-[11px] flex items-center justify-center font-bold">
                    {activeFiltersCount}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1 rounded-md text-[#565959] hover:text-[#0F1111] hover:bg-stone-100 cursor-pointer"
                aria-label="Close filters"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Body Scroll */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Brand Filter */}
              <div>
                <span className="text-xs font-bold text-[#0F1111] uppercase block mb-2">
                  Brand
                </span>
                <div className="space-y-2">
                  {availableBrandsWithCount.map(({ name, count }) => (
                    <label
                      key={name}
                      className="flex items-center justify-between text-xs text-[#0F1111] cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedBrands.includes(name)}
                          onChange={() => handleToggleBrand(name)}
                          className="rounded-xs border-[#D5D9D9] text-[#007185] focus:ring-[#007185]"
                        />
                        <span>{name}</span>
                      </span>
                      <span className="text-stone-400">({count})</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Filter */}
              <div className="pt-3 border-t border-[#E7E7E7]">
                <span className="text-xs font-bold text-[#0F1111] uppercase block mb-2">
                  Price Range
                </span>
                <div className="space-y-2 text-xs">
                  {[
                    { id: 'all', label: 'All Prices' },
                    { id: 'under-20k', label: 'Under ₹20,000' },
                    { id: '20k-35k', label: '₹20,000 - ₹35,000' },
                    { id: '35k-50k', label: '₹35,000 - ₹50,000' },
                    { id: 'over-50k', label: 'Over ₹50,000' },
                  ].map((opt) => (
                    <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="mobilePrice"
                        checked={priceRange === opt.id}
                        onChange={() => handleSelectPriceRange(opt.id)}
                        className="text-[#007185] focus:ring-[#007185]"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* RAM Filter */}
              <div className="pt-3 border-t border-[#E7E7E7]">
                <span className="text-xs font-bold text-[#0F1111] uppercase block mb-2">
                  RAM
                </span>
                <div className="space-y-2 text-xs">
                  {availableRamsWithCount.map(([ram, count]) => (
                    <label key={ram} className="flex items-center justify-between cursor-pointer">
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedRams.includes(ram)}
                          onChange={() => handleToggleRam(ram)}
                          className="rounded-xs border-[#D5D9D9] text-[#007185] focus:ring-[#007185]"
                        />
                        <span>{ram}</span>
                      </span>
                      <span className="text-stone-400">({count})</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Storage Filter */}
              <div className="pt-3 border-t border-[#E7E7E7]">
                <span className="text-xs font-bold text-[#0F1111] uppercase block mb-2">
                  Storage
                </span>
                <div className="space-y-2 text-xs">
                  {availableStoragesWithCount.map(([st, count]) => (
                    <label key={st} className="flex items-center justify-between cursor-pointer">
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedStorages.includes(st)}
                          onChange={() => handleToggleStorage(st)}
                          className="rounded-xs border-[#D5D9D9] text-[#007185] focus:ring-[#007185]"
                        />
                        <span>{st}</span>
                      </span>
                      <span className="text-stone-400">({count})</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Network Filter */}
              <div className="pt-3 border-t border-[#E7E7E7]">
                <span className="text-xs font-bold text-[#0F1111] uppercase block mb-2">
                  Network Technology
                </span>
                <div className="space-y-2 text-xs">
                  {['5G', '4G'].map((net) => (
                    <label key={net} className="flex items-center justify-between cursor-pointer">
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedNetworks.includes(net)}
                          onChange={() => handleToggleNetwork(net)}
                          className="rounded-xs border-[#D5D9D9] text-[#007185] focus:ring-[#007185]"
                        />
                        <span>{net} Smartphones</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-[#E7E7E7] bg-stone-50 flex items-center gap-3">
              <button
                type="button"
                onClick={handleResetFilters}
                className="w-1/2 py-2 rounded-full border border-[#D5D9D9] text-xs font-bold text-[#0F1111] hover:bg-white cursor-pointer text-center"
              >
                Reset All
              </button>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="w-1/2 py-2 rounded-full bg-[#FFD814] hover:bg-[#F7CA00] text-xs font-bold text-[#0F1111] shadow-xs cursor-pointer text-center"
              >
                Apply ({sortedProducts.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MobilesPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-[60vh] flex items-center justify-center bg-[#F7F7F7]">
          <div className="flex flex-col items-center gap-3 text-sm text-[#565959]">
            <Smartphone className="h-8 w-8 text-[#007185] animate-bounce" />
            <span>Loading Mobiles &amp; Smartphones...</span>
          </div>
        </div>
      }
    >
      <MobilesPageContent />
    </Suspense>
  );
}
