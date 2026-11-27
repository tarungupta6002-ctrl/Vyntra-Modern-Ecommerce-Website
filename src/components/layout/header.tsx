'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Search,
  Mic,
  Scan,
  Heart,
  ShoppingCart,
  User,
  MapPin,
  ChevronDown,
  Flame,
  Menu,
  X,
  Truck,
  ShieldCheck,
  RotateCcw,
  Headphones,
  Zap,
  Home,
  Check,
} from 'lucide-react';
import { BrandLogo } from './brand-logo';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';
import { useAddressStore } from '@/store/address-store';
import { formatINR } from '@/lib/utils';
import { useUserProfileStore } from '@/store/user-profile-store';
import { createClient } from '@/lib/supabase/client';
import { SearchSuggestionsPanel, saveRecentSearch, useSearchAutocomplete } from './search-suggestions';

const CATEGORIES: {
  name: string;
  href: string;
  isAll?: boolean;
  isDeal?: boolean;
}[] = [
  { name: 'All', href: '/products', isAll: true },
  { name: 'Fashion', href: '/products?category=fashion' },
  { name: 'Mobiles', href: '/mobiles' },
  { name: "Today's Deals", href: '/products?deals=true', isDeal: true },
  { name: 'Electronics', href: '/electronics' },
  { name: 'Beauty', href: '/products?category=beauty-wellness' },
  { name: 'Home', href: '/products?category=home-living' },
  { name: 'Appliances', href: '/appliances' },
  { name: 'Books', href: '/books' },
  { name: 'New Releases', href: '/products?sort=newest' },
  { name: 'Best Sellers', href: '/products?sort=curated' },
];

const SEARCH_CATEGORIES = [
  'All Categories',
  'Books & Literature',
  'Mobiles & Smartphones',
  'Electronics & Gadgets',
  'Major & Home Appliances',
  'Fashion & Apparel',
  'Footwear',
  'Accessories & Watches',
  'Beauty & Fragrances',
  'Home & Living',
  'Artisanal Crafts',
];

interface HeaderProps {
  initialUser?: { fullName?: string; email?: string; isVendor?: boolean } | null;
  wishlistCount?: number;
}

export function Header({ initialUser = null, wishlistCount = 0 }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement | null>(null);

  // Keep "All Categories" as default so search works globally across the entire store
  // Users can still explicitly select a specific category from the dropdown if they wish.

  // Click outside to close category dropdown
  useEffect(() => {
    if (!categoryDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [categoryDropdownOpen]);

  const { toggleCart, getTotalItems, getSubtotal } = useCartStore();
  const { getTotalItems: getWishlistTotal } = useWishlistStore();
  const { addresses, getDefaultAddress, getSelectedAddress, setSelectedAddressId, fetchAddresses } = useAddressStore();
  const { fullName, email } = useUserProfileStore();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(Boolean(initialUser));
  const [isVendor, setIsVendor] = useState<boolean>(Boolean(initialUser?.isVendor));

  // Location Selector Modal State (Amazon-style Choose Location Popup)
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [pincodeInput, setPincodeInput] = useState('');
  const [pincodeMessage, setPincodeMessage] = useState('');

  const locationModalRef = useRef<HTMLDivElement | null>(null);
  const locationTriggerRef = useRef<HTMLElement | null>(null);

  // Keyboard accessibility: Escape closes location modal, focus trap & focus restore
  useEffect(() => {
    if (locationModalOpen) {
      locationTriggerRef.current = document.activeElement as HTMLElement | null;
      document.body.style.overflow = 'hidden';

      const timer = setTimeout(() => {
        if (!locationModalRef.current) return;
        const focusable = locationModalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
          focusable[0].focus();
        }
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          setLocationModalOpen(false);
          return;
        }

        if (e.key === 'Tab') {
          if (!locationModalRef.current) return;
          const focusable = locationModalRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length === 0) {
            e.preventDefault();
            return;
          }
          const firstElement = focusable[0];
          const lastElement = focusable[focusable.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === firstElement || !locationModalRef.current.contains(document.activeElement)) {
              e.preventDefault();
              lastElement.focus();
            }
          } else {
            if (document.activeElement === lastElement || !locationModalRef.current.contains(document.activeElement)) {
              e.preventDefault();
              firstElement.focus();
            }
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'unset';
        if (locationTriggerRef.current && typeof locationTriggerRef.current.focus === 'function') {
          locationTriggerRef.current.focus();
          locationTriggerRef.current = null;
        }
      };
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [locationModalOpen]);

  // Active delivery address from address store
  const activeAddress = mounted ? (getSelectedAddress() || getDefaultAddress()) : undefined;

  // Determine effective user session:
  // Pre-mount / SSR uses initialUser from server cookies; post-mount uses client auth state.
  const isUserLoggedIn = mounted ? isAuthenticated : Boolean(initialUser);
  const effectiveDisplayName =
    fullName || initialUser?.fullName || '';
  const effectiveEmail = email || initialUser?.email || '';

  const handleQuickPincodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = pincodeInput.trim().replace(/\D/g, '');
    if (clean.length !== 6) {
      setPincodeMessage('Please enter a valid 6-digit Indian PIN code');
      return;
    }
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${clean}`);
      const data = await res.json();
      if (Array.isArray(data) && data[0]?.Status === 'Success' && Array.isArray(data[0]?.PostOffice) && data[0].PostOffice.length > 0) {
        const po = data[0].PostOffice[0];
        const city = po.District || po.Name;
        const state = po.State || 'India';
        useAddressStore.getState().setDeliveryPincode(clean, city, state);
        setPincodeMessage(`Delivery location updated to ${city} (${clean})`);
        setTimeout(() => setLocationModalOpen(false), 900);
      } else {
        useAddressStore.getState().setDeliveryPincode(clean, 'India', 'India');
        setPincodeMessage(`Delivery location set to PIN ${clean}`);
        setTimeout(() => setLocationModalOpen(false), 900);
      }
    } catch {
      useAddressStore.getState().setDeliveryPincode(clean, 'India', 'India');
      setPincodeMessage(`Delivery location set to PIN ${clean}`);
      setTimeout(() => setLocationModalOpen(false), 900);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchAddresses();
    useWishlistStore.getState().syncWithDatabase();

    if (initialUser) {
      setIsAuthenticated(true);
      if (initialUser.fullName) {
        useUserProfileStore.getState().updateProfile({
          fullName: initialUser.fullName,
          email: initialUser.email,
        });
      }
    }

    // Fast synchronous check from browser cookies/localStorage to prevent Flash of Unauthenticated State (FOUS)
    try {
      const hasAuthCookie = typeof document !== 'undefined' && document.cookie.split(';').some((c) => c.trim().startsWith('sb-') && c.includes('-auth-token'));
      const hasLocalToken = typeof localStorage !== 'undefined' && Object.keys(localStorage).some((k) => k.startsWith('sb-') && k.endsWith('-auth-token'));
      if (hasAuthCookie || hasLocalToken) {
        setIsAuthenticated(true);
      }
    } catch {
      // Safe fallback
    }

    try {
      const supabase = createClient();

      const syncSessionToDb = async (accessToken?: string) => {
        try {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
          }
          await fetch('/api/auth/sync', {
            method: 'POST',
            headers,
            credentials: 'include',
          });
        } catch (e) {
          console.warn('[Sync Listener Error]:', e);
        }
      };

      const checkVendorStatus = async () => {
        try {
          const res = await fetch('/api/vendor/me', { cache: 'no-store' });
          if (res.ok) {
            const json = await res.json();
            const approved =
              json?.data?.isVendor &&
              json?.data?.vendorProfile?.status === 'APPROVED';
            setIsVendor(Boolean(approved));
          } else {
            setIsVendor(false);
          }
        } catch {
          // Keep previous state
        }
      };

      checkVendorStatus();

      supabase.auth.getSession().then(async ({ data }) => {
        if (data.session?.user) {
          setIsAuthenticated(true);
          await syncSessionToDb(data.session.access_token);
          checkVendorStatus();
          useCartStore.getState().syncWithDatabase();
          useWishlistStore.getState().syncWithDatabase();
          if (data.session.user.user_metadata?.full_name || data.session.user.email) {
            useUserProfileStore.getState().updateProfile({
              fullName: data.session.user.user_metadata?.full_name || data.session.user.email?.split('@')[0],
              email: data.session.user.email,
            });
          }
        } else {
          setIsAuthenticated(false);
          setIsVendor(false);
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        setIsAuthenticated(!!session?.user);
        if (session?.user) {
          await syncSessionToDb(session.access_token);
          checkVendorStatus();
          useUserProfileStore.getState().updateProfile({
            fullName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
            email: session.user.email,
          });
        } else {
          setIsVendor(false);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    } catch {
      // Fallback if Supabase credentials are pending
    }
  }, []);

  const totalItems = mounted ? getTotalItems() : 0;
  const subtotal = mounted ? getSubtotal() : 0;
  const activeWishlistCount = mounted ? getWishlistTotal() : (wishlistCount ?? 0);

  // Typeahead for the desktop and mobile search bars (only one is visible at a time).
  const searchAutocompleteOptions = {
    query: searchQuery,
    onNavigate: (href: string) => router.push(href),
    onSearch: (q: string) => {
      setSearchQuery(q);
      runSearch(q);
    },
  };
  const desktopSearch = useSearchAutocomplete(searchAutocompleteOptions);
  const mobileSearch = useSearchAutocomplete(searchAutocompleteOptions);

  if (
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/vendor')
  ) {
    return null;
  }

  const getSearchPlaceholder = () => {
    switch (selectedCategory) {
      case 'Mobiles & Smartphones':
        return 'Search Mobiles, iPhones, 5G smartphones...';
      case 'Electronics & Gadgets':
        return 'Search Laptops, Audio, Headphones, Cameras...';
      case 'Fashion & Apparel':
        return 'Search Sarees, Kurtas, Western wear, Denim...';
      case 'Footwear':
        return 'Search Sneakers, Formal Shoes, Heels, Boots...';
      case 'Accessories & Watches':
        return 'Search Luxury Watches, Smartwatches, Bags...';
      case 'Beauty & Fragrances':
        return 'Search Skincare, Perfumes, Makeup, Wellness...';
      case 'Home & Living':
        return 'Search Home Decor, Bedding, Kitchen & Living...';
      default:
        return 'Search Vyntra: fashion, electronics, artisanal couture...';
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(searchQuery);
  };

  function runSearch(rawQuery: string) {
    desktopSearch.close();
    mobileSearch.close();
    const q = rawQuery.trim();
    saveRecentSearch(q);
    const encoded = encodeURIComponent(q);
    const qLower = q.toLowerCase();

    // 1. High-priority keyword intent detection (Amazon-style smart search routing)
    // If user searches for laptops, computers, cameras, or audio gear, always route to /electronics
    const isElectronicsKeyword = /laptop|macbook|notebook|pc|computer|camera|dslr|mirrorless|headphone|earphone|earbud|soundbar|audio|speaker|tablet|ipad|intel|ryzen|gaming pc/i.test(qLower);
    const isMobileKeyword = /phone|mobile|smartphone|iphone|galaxy\s*s|oneplus|redmi|realme|vivo|oppo|pixel/i.test(qLower);
    const isAppliancesKeyword = /refrigerator|fridge|washing\s*machine|washer|dryer|air\s*conditioner|\bac\b|split\s*ac|inverter\s*ac|microwave|convection|chimney|dishwasher|geyser|water\s*purifier|vacuum\s*cleaner|air\s*fryer|induction\s*cooktop|appliance/i.test(qLower);
    const isBookKeyword = /\b(book|books|novel|novels|paperback|hardcover|author|biography|autobiography|manga|comic|comics|atomic\s*habits|psychology\s*of\s*money|rich\s*dad|ikigai|ncert|upsc|shiva\s*trilogy|sudha\s*murty)\b/i.test(qLower);
    const isFootwearKeyword = /shoe|sneaker|footwear|sandal|boot|heel|loafer/i.test(qLower);
    const isWatchKeyword = /watch|smartwatch|chronograph|rolex|casio|fossil/i.test(qLower);
    const isBeautyKeyword = /perfume|fragrance|lipstick|makeup|skincare|serum|shampoo|cologne/i.test(qLower);

    if (isBookKeyword) {
      router.push(q ? `/books?q=${encoded}` : '/books');
      return;
    }

    if (isAppliancesKeyword) {
      router.push(q ? `/appliances?q=${encoded}` : '/appliances');
      return;
    }

    if (isElectronicsKeyword) {
      router.push(q ? `/electronics?q=${encoded}` : '/electronics');
      return;
    }

    if (isMobileKeyword) {
      router.push(q ? `/mobiles?q=${encoded}` : '/mobiles');
      return;
    }

    if (isFootwearKeyword) {
      router.push(q ? `/products?search=${encoded}` : '/category/mens-footwear');
      return;
    }

    if (isWatchKeyword) {
      router.push(q ? `/products?search=${encoded}` : '/category/watches');
      return;
    }

    if (isBeautyKeyword) {
      router.push(q ? `/products?category=beauty-wellness&search=${encoded}` : '/products?category=beauty-wellness');
      return;
    }

    // 2. Department-based fallback if user specifically selected a category
    switch (selectedCategory) {
      case 'Mobiles & Smartphones':
        router.push(q ? `/mobiles?q=${encoded}` : '/mobiles');
        break;

      case 'Books & Literature':
        router.push(q ? `/books?q=${encoded}` : '/books');
        break;

      case 'Electronics & Gadgets':
        router.push(q ? `/electronics?q=${encoded}` : '/electronics');
        break;

      case 'Major & Home Appliances':
        router.push(q ? `/appliances?q=${encoded}` : '/appliances');
        break;

      case 'Fashion & Apparel':
        router.push(q ? `/products?category=apparel&search=${encoded}` : '/category/ethnic');
        break;

      case 'Footwear':
        router.push(q ? `/products?search=${encoded}` : '/category/mens-footwear');
        break;

      case 'Accessories & Watches':
        router.push(q ? `/products?search=${encoded}` : '/category/watches');
        break;

      case 'Beauty & Fragrances':
        router.push(q ? `/products?category=beauty-wellness&search=${encoded}` : '/products?category=beauty-wellness');
        break;

      case 'Home & Living':
        router.push(q ? `/products?category=home-living&search=${encoded}` : '/products?category=home-living');
        break;

      default:
        if (q) {
          router.push(`/products?search=${encoded}`);
        } else {
          router.push('/products');
        }
        break;
    }
  }

  return (
    <header className="fixed top-0 left-0 w-full z-50 shadow-md print:hidden">
      {/* ========================================================================= */}
      {/* 1. PRIMARY HEADER ROW: Dark Navy (#131921) */}
      {/* ========================================================================= */}
      <div className="bg-[#131921] text-white">
        <div className="w-full max-w-[1500px] mx-auto px-3 sm:px-4 lg:px-6 h-[60px] flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Left section: Hamburger (mobile), Logo, Location Pin */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center p-1.5 text-white lg:hidden rounded hover:outline hover:outline-1 hover:outline-white/60 transition-all"
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation-drawer"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>

            {/* Brand Logo */}
            <div className="py-1 px-1 rounded hover:outline hover:outline-1 hover:outline-white/40 transition-all">
              <BrandLogo className="h-7 sm:h-8 w-auto" variant="light" />
            </div>

            {/* Deliver to Location Pin - Amazon-style Modal Trigger */}
            <button
              type="button"
              onClick={() => setLocationModalOpen(true)}
              className="hidden lg:flex items-center gap-1.5 py-1 px-2 rounded hover:outline hover:outline-1 hover:outline-white/60 transition-all text-left group cursor-pointer"
              title="Click to view and choose delivery location"
            >
              <MapPin className="h-4 w-4 text-[#FF9900] shrink-0 self-end mb-0.5 group-hover:scale-110 transition-transform" />
              <div className="flex flex-col leading-tight max-w-[130px]">
                <span className="text-[11px] text-[#CCCCCC] font-normal truncate">
                  {mounted && activeAddress
                    ? `Deliver to ${(activeAddress.name || 'You').split(' ')[0]}`
                    : 'Deliver to'}
                </span>
                <span className="text-xs font-bold text-white tracking-tight truncate">
                  {mounted && activeAddress
                    ? `${activeAddress.city} ${activeAddress.pincode}`
                    : 'Select location'}
                </span>
              </div>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* Center: Search Bar with Category Dropdown & Yellow Search Button */}
          {/* ========================================================================= */}
          <div ref={desktopSearch.containerRef} className="relative flex-1 max-w-3xl hidden md:block">
          <form
            onSubmit={handleSearchSubmit}
            role="search"
            className="flex items-center h-10 rounded-[6px] overflow-hidden focus-within:ring-2 focus-within:ring-[#FF9900] bg-white border border-transparent"
          >
            {/* Category Dropdown */}
            <div ref={categoryDropdownRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                className="h-10 px-3 bg-[#E6E6E6] hover:bg-[#D4D4D4] text-[#0F1111] text-xs font-normal border-r border-[#D5D9D9] flex items-center gap-1.5 transition-colors"
              >
                <span className="max-w-[110px] truncate">{selectedCategory}</span>
                <ChevronDown className="h-3.5 w-3.5 text-[#565959]" />
              </button>

              {categoryDropdownOpen && (
                <div className="absolute left-0 top-full mt-1 w-56 bg-white rounded-md shadow-xl border border-[#D5D9D9] py-1.5 z-50 text-xs text-[#0F1111]">
                  {SEARCH_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat);
                        setCategoryDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-[#007185] hover:text-white transition-colors flex items-center justify-between ${
                        selectedCategory === cat ? 'bg-[#F2F2F2] font-bold text-[#007185]' : ''
                      }`}
                    >
                      <span>{cat}</span>
                      {selectedCategory === cat && <Check className="w-3.5 h-3.5 text-[#007185]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Input field */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={getSearchPlaceholder()}
              aria-label="Search Vyntra"
              {...desktopSearch.inputProps}
              className="flex-1 h-full px-3 text-sm text-[#0F1111] placeholder:text-[#565959] focus:outline-none bg-white"
            />

            {/* Voice & Visual Tools */}
            <div className="flex items-center gap-1 pr-1 bg-white shrink-0">
              <button
                type="button"
                title="Voice Search"
                className="p-1 text-[#565959] hover:text-[#007185] rounded transition-colors"
              >
                <Mic className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Visual Search"
                className="p-1 text-[#565959] hover:text-[#007185] rounded transition-colors"
              >
                <Scan className="h-4 w-4" />
              </button>

              {/* Search Submit Button (Yellow/Orange #FEB800) */}
              <button
                type="submit"
                aria-label="Submit Search"
                className="h-10 px-4 bg-[#FEB800] hover:bg-[#F3A847] text-[#0F1111] flex items-center justify-center transition-colors shrink-0"
              >
                <Search className="h-5 w-5" />
              </button>
            </div>
          </form>
          <SearchSuggestionsPanel {...desktopSearch.panelProps} />
          </div>

          {/* ========================================================================= */}
          {/* Right Section: Account, Orders, Wishlist, Cart */}
          {/* ========================================================= */}
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            
            {/* Account & Lists Dropdown */}
            <div className="relative group">
              {/* Small screens: an icon, so the cart isn't pushed off-screen */}
              <Link
                href={isUserLoggedIn ? '/account' : '/login'}
                aria-label={isUserLoggedIn ? 'Your account' : 'Sign in'}
                className="sm:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded text-white hover:outline hover:outline-1 hover:outline-white/60"
              >
                <User className="h-5 w-5" />
              </Link>
              <Link
                href={isUserLoggedIn ? "/account" : "/login"}
                className="hidden sm:flex flex-col py-1.5 px-2 rounded hover:outline hover:outline-1 hover:outline-white/60 transition-all text-left"
              >
                <span className="text-[11px] text-[#CCCCCC] leading-tight">
                  {isUserLoggedIn ? (effectiveDisplayName ? `Hello, ${effectiveDisplayName.split(' ')[0]}` : 'Hello') : 'Hello, sign in'}
                </span>
                <span className="text-[14px] font-bold text-white flex items-center gap-0.5 leading-tight">
                  Account &amp; Lists <ChevronDown className="h-3 w-3 text-[#CCCCCC]" />
                </span>
              </Link>

              {/* Hover Dropdown */}
              <div className="absolute right-0 top-full pt-1.5 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150 z-50 min-w-[260px]">
                <div className="bg-white text-[#0F1111] rounded-md shadow-2xl border border-[#D5D9D9] p-4 text-xs space-y-3">
                  <div className="border-b border-[#D5D9D9] pb-3">
                    {isUserLoggedIn ? (
                      <>
                        <p className="font-bold text-sm text-[#0F1111]">{effectiveDisplayName}</p>
                        <p className="text-[11px] text-[#565959]">{effectiveEmail || 'Signed in'}</p>
                        <Link
                          href="/account"
                          className="mt-2.5 w-full py-2 bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] text-xs font-bold rounded-md flex items-center justify-center transition-colors shadow-sm"
                        >
                          Your Account Dashboard
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/login"
                          className="w-full py-2 bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] text-xs font-bold rounded-md flex items-center justify-center transition-colors shadow-sm"
                        >
                          Sign in
                        </Link>
                        <p className="text-[11px] text-center text-[#565959] mt-2">
                          New customer?{' '}
                          <Link href="/login?mode=signup" className="text-[#007185] hover:underline font-semibold">
                            Start here.
                          </Link>
                        </p>
                      </>
                    )}
                  </div>
                  <div className="space-y-1.5 text-xs text-[#0F1111]">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#565959] block mb-1">
                      Your Account
                    </span>
                    <Link
                      href="/account?tab=orders"
                      className="block py-1 hover:text-[#007185] hover:underline"
                    >
                      Your Orders &amp; Shipment Tracking
                    </Link>
                    <Link
                      href="/account?tab=wishlist"
                      className="block py-1 hover:text-[#007185] hover:underline"
                    >
                      Your Wishlist ({activeWishlistCount} items)
                    </Link>
                    <Link
                      href="/account?tab=addresses"
                      className="block py-1 hover:text-[#007185] hover:underline"
                    >
                      Your Saved Addresses
                    </Link>
                    <Link
                      href="/account?tab=payments"
                      className="block py-1 hover:text-[#007185] hover:underline"
                    >
                      Payments
                    </Link>
                    <Link
                      href="/account?tab=profile"
                      className="block py-1 hover:text-[#007185] hover:underline"
                    >
                      Profile &amp; Security Settings
                    </Link>
                    <Link
                      href="/account?tab=support"
                      className="block py-1 text-[#007185] font-semibold hover:underline"
                    >
                      Customer Help &amp; Support
                    </Link>
                    {isVendor ? (
                      <Link
                        href="/vendor/products"
                        className="block py-1 text-[#FF9900] font-bold hover:underline border-t border-[#D5D9D9] mt-1 pt-1.5"
                      >
                        Seller Central (Vendor Products) ↗
                      </Link>
                    ) : (
                      <Link
                        href="/become-seller"
                        className="block py-1 text-[#FF9900] font-bold hover:underline border-t border-[#D5D9D9] mt-1 pt-1.5"
                      >
                        Seller Central (Become a Seller) ↗
                      </Link>
                    )}
                    <Link
                      href="/admin"
                      className="block py-1 text-[#800020] font-bold hover:underline flex items-center gap-1"
                    >
                      <ShieldCheck className="h-3.5 w-3.5 text-[#800020]" />
                      <span>Admin Central (Platform Governance) ↗</span>
                    </Link>
                    {isUserLoggedIn && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const supabase = createClient();
                            await supabase.auth.signOut();
                            await fetch('/api/auth/logout', { method: 'POST' });
                            setIsAuthenticated(false);
                            setIsVendor(false);
                            useUserProfileStore.getState().resetToDefault();
                            router.push('/');
                            router.refresh();
                          } catch (e) {
                            console.warn('Logout error', e);
                          }
                        }}
                        className="block w-full text-left py-1 text-rose-600 font-semibold hover:underline border-t border-[#D5D9D9] mt-2 pt-2"
                      >
                        Sign Out
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Returns & Orders */}
            <Link
              href="/account?tab=orders"
              className="hidden sm:flex flex-col py-1.5 px-2 rounded hover:outline hover:outline-1 hover:outline-white/60 transition-all text-left"
            >
              <span className="text-[11px] text-[#CCCCCC] leading-tight">Returns</span>
              <span className="text-[14px] font-bold text-white leading-tight">&amp; Orders</span>
            </Link>

            {/* Wishlist Icon Link */}
            <Link
              href="/account?tab=wishlist"
              className="max-[359px]:hidden min-h-[44px] min-w-[44px] flex flex-col items-center justify-center py-1.5 px-2 rounded hover:outline hover:outline-1 hover:outline-white/60 transition-all text-white relative group"
              title="Saved Wishlist"
              aria-label={`Saved Wishlist, ${activeWishlistCount} items`}
            >
              <div className="relative">
                <Heart className="h-5 w-5 text-white group-hover:text-[#FF9900] transition-colors" />
                <span
                  suppressHydrationWarning
                  className="absolute -top-1.5 -right-2 bg-[#FF9900] text-[#0F1111] text-[10px] font-bold px-1.5 py-0.2 rounded-full leading-none shadow-sm"
                >
                  {activeWishlistCount}
                </span>
              </div>
              <span className="text-[11px] font-normal text-[#CCCCCC] hidden md:inline mt-0.5">Wishlist</span>
            </Link>

            {/* Shopping Cart Button */}
            <button
              type="button"
              onClick={toggleCart}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded hover:outline hover:outline-1 hover:outline-white/60 transition-all text-white group"
              id="header-cart-btn"
              aria-label={`View shopping cart with ${totalItems} items`}
            >
              <div className="relative flex items-center">
                <ShoppingCart className="h-6 w-6 text-white group-hover:text-[#FFD814] transition-colors" />
                <span
                  id="header-cart-count"
                  suppressHydrationWarning
                  className="absolute -top-1.5 left-3.5 bg-[#FFD814] text-[#0F1111] text-xs font-extrabold px-1.5 py-0.2 rounded-full leading-tight shadow-sm"
                >
                  {totalItems}
                </span>
              </div>
              <div className="hidden lg:flex flex-col text-left leading-tight">
                <span className="text-[10px] text-[#CCCCCC] font-normal">Cart</span>
                <span
                  suppressHydrationWarning
                  className="text-xs font-bold text-[#FFD814] font-mono"
                >
                  {formatINR(subtotal)}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SECONDARY SUBNAV: Navy Gray (#232F3E) */}
      {/* ========================================================================= */}
      <div className="bg-[#232F3E] text-white text-[14px]">
        <div className="w-full max-w-[1500px] mx-auto px-3 sm:px-4 lg:px-6 h-[40px] flex items-center justify-between overflow-x-auto">
          <nav className="flex items-center gap-1 sm:gap-2 whitespace-nowrap py-1">
            {CATEGORIES.map((cat) => {
              const isActive = pathname === cat.href && !cat.isAll;
              return (
                <Link
                  key={cat.name}
                  href={cat.href}
                  className={`px-2.5 py-1 rounded-[4px] hover:outline hover:outline-1 hover:outline-white/40 transition-colors flex items-center gap-1.5 text-[14px] ${
                    cat.isAll
                      ? 'font-bold flex items-center gap-1 text-white pr-3 mr-1 border-r border-white/20'
                      : cat.isDeal
                      ? 'text-[#FFD814] font-bold hover:text-white'
                      : isActive
                      ? 'text-white font-semibold'
                      : 'text-white/90 hover:text-white font-medium'
                  }`}
                >
                  {cat.isAll && <Menu className="h-4 w-4" />}
                  {cat.isDeal && <Flame className="h-4 w-4 text-[#FF9900]" />}
                  <span>{cat.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Quick Support / Promotion Pill */}
          <div className="hidden sm:flex items-center gap-3 shrink-0 pl-4 text-[14px] font-medium text-white/90">
            <Link
              href="/support"
              className="flex items-center gap-1.5 text-white hover:text-[#FFD814] transition-colors py-1 px-2 rounded hover:outline hover:outline-1 hover:outline-white/40 text-[14px]"
            >
              <Headphones className="h-4 w-4 text-[#007185]" />
              <span>Customer Service</span>
            </Link>
            <span className="text-white/30">|</span>
            <Link
              href="/products?deals=festive"
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#FF9900] text-[#0F1111] font-bold text-[12px] hover:bg-[#FA8900] transition-colors shadow-sm"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Festive Deals</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MOBILE SEARCH ROW (visible only on mobile) */}
      {/* ========================================================================= */}
      <div ref={mobileSearch.containerRef} className="relative md:hidden bg-[#131921] px-3 pb-2.5">
        <form
          onSubmit={handleSearchSubmit}
          role="search"
          className="flex items-center h-9 rounded-[6px] overflow-hidden bg-white w-full border border-transparent focus-within:ring-2 focus-within:ring-[#FF9900]"
        >
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={getSearchPlaceholder()}
            aria-label="Search Vyntra"
            {...mobileSearch.inputProps}
            className="flex-1 h-full px-3 text-xs text-[#0F1111] placeholder:text-[#565959] focus:outline-none"
          />
          <button
            type="submit"
            className="h-9 px-3 bg-[#FEB800] text-[#0F1111] flex items-center justify-center shrink-0"
          >
            <Search className="h-4 w-4" />
          </button>
        </form>
        <div className="relative">
          <SearchSuggestionsPanel {...mobileSearch.panelProps} />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MOBILE DRAWER MENU */}
      {/* ========================================================================= */}
      {mobileMenuOpen && (
        <div
          id="mobile-navigation-drawer"
          className="lg:hidden bg-[#232F3E] text-white px-4 py-3 border-t border-white/10 space-y-3 animate-in slide-in-from-top-2"
        >
          <div className="flex items-center justify-between pb-2 border-b border-white/20">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-[#FF9900]" />
              <span className="text-sm font-bold">
                {mounted && isAuthenticated ? (fullName ? `Hello, ${fullName.split(' ')[0]}` : 'Hello') : 'Hello, Sign in'}
              </span>
            </div>
            <Link
              href={mounted && isAuthenticated ? "/account" : "/login"}
              onClick={() => setMobileMenuOpen(false)}
              className="min-h-[44px] inline-flex items-center text-xs text-[#FFD814] hover:underline"
            >
              {mounted && isAuthenticated ? 'My Account →' : 'Sign in →'}
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[14px] font-semibold py-1">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.name}
                href={cat.href}
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] flex items-center p-2.5 rounded bg-white/10 text-white hover:bg-[#007185] transition-colors"
              >
                {cat.name}
              </Link>
            ))}
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-white/80">
            <Link
              href="/account?tab=orders"
              onClick={() => setMobileMenuOpen(false)}
              className="min-h-[44px] inline-flex items-center py-2 px-1 hover:text-white"
            >
              Track Orders
            </Link>
            <Link
              href="/support"
              onClick={() => setMobileMenuOpen(false)}
              className="min-h-[44px] inline-flex items-center py-2 px-1 hover:text-white"
            >
              Customer Service
            </Link>
            <Link
              href="/account?tab=wishlist"
              onClick={() => setMobileMenuOpen(false)}
              className="min-h-[44px] inline-flex items-center py-2 px-1 text-[#FFD814]"
            >
              Wishlist ({activeWishlistCount})
            </Link>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* 5. LOCATION SELECTOR MODAL (Amazon-style "Choose your location") */}
      {/* ========================================================================= */}
      {locationModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="location-modal-heading"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setLocationModalOpen(false)}
        >
          <div
            ref={locationModalRef}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden border border-[#D5D9D9] text-[#0F1111] animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="bg-[#F0F2F2] px-5 py-3.5 border-b border-[#D5D9D9] flex items-center justify-between">
              <h2 id="location-modal-heading" className="font-bold text-sm sm:text-base text-[#0F1111] flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#FF9900]" />
                Choose your location
              </h2>
              <button
                type="button"
                onClick={() => setLocationModalOpen(false)}
                className="text-[#565959] hover:text-[#0F1111] p-1 rounded hover:bg-black/5 transition-colors cursor-pointer"
                aria-label="Close location picker"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <p className="text-xs text-[#565959] leading-relaxed">
                Select a delivery location to see product availability and exclusive delivery options.
              </p>

              {/* Saved Addresses List */}
              {isUserLoggedIn && addresses.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0F1111]">Saved addresses</span>
                    <Link
                      href="/account?tab=addresses"
                      onClick={() => setLocationModalOpen(false)}
                      className="text-xs text-[#007185] hover:underline hover:text-[#C7511F]"
                    >
                      Manage addresses
                    </Link>
                  </div>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {addresses.map((addr) => {
                      const isSelected = activeAddress?.id === addr.id;
                      return (
                        <div
                          key={addr.id}
                          onClick={() => {
                            setSelectedAddressId(addr.id);
                            setLocationModalOpen(false);
                          }}
                          className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex items-start gap-3 ${
                            isSelected
                              ? 'border-[#007185] bg-[#F0F8F9] ring-1 ring-[#007185]'
                              : 'border-[#D5D9D9] hover:border-[#007185] hover:bg-[#F7FAFA]'
                          }`}
                        >
                          <div className="pt-0.5 shrink-0">
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                isSelected ? 'border-[#007185] bg-[#007185]' : 'border-[#888]'
                              }`}
                            >
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-[#0F1111] truncate">{addr.name}</span>
                              {addr.isDefault && (
                                <span className="text-[10px] font-semibold bg-[#232F3E] text-white px-1.5 py-0.5 rounded shrink-0">
                                  Default
                                </span>
                              )}
                              <span className="text-[10px] uppercase font-medium text-[#565959] border border-[#D5D9D9] px-1 rounded shrink-0">
                                {addr.type}
                              </span>
                            </div>
                            <p className="text-xs text-[#333333] mt-0.5 line-clamp-1">
                              {addr.flat ? `${addr.flat}, ` : ''}{addr.area}
                            </p>
                            <p className="text-xs font-semibold text-[#0F1111]">
                              {addr.city}, {addr.state} — {addr.pincode}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* If user logged in but no addresses */}
              {isUserLoggedIn && addresses.length === 0 && (
                <div className="p-3 bg-[#F7F8F8] border border-dashed border-[#D5D9D9] rounded-lg text-center space-y-2">
                  <p className="text-xs text-[#565959]">No saved delivery addresses found.</p>
                  <Link
                    href="/account?tab=addresses"
                    onClick={() => setLocationModalOpen(false)}
                    className="inline-block text-xs font-semibold text-[#007185] hover:underline"
                  >
                    + Add a new address to your account
                  </Link>
                </div>
              )}

              {/* If user not logged in */}
              {!isUserLoggedIn && (
                <div className="p-3 bg-[#F0F8F9] border border-[#007185]/30 rounded-lg flex items-center justify-between gap-3">
                  <div className="text-xs text-[#0F1111]">
                    <span className="font-bold block">Sign in to see your addresses</span>
                    <span className="text-[#565959] text-[11px]">Save time by using your default delivery addresses</span>
                  </div>
                  <Link
                    href="/login?redirect=/account?tab=addresses"
                    onClick={() => setLocationModalOpen(false)}
                    className="shrink-0 bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] text-xs font-semibold px-3 py-1.5 rounded-md border border-[#FCD200] shadow-xs"
                  >
                    Sign in
                  </Link>
                </div>
              )}

              {/* Divider: or enter an Indian pincode */}
              <div className="relative flex items-center justify-center my-3">
                <div className="border-t border-[#D5D9D9] w-full" />
                <span className="bg-white px-2 text-[11px] text-[#767676] uppercase tracking-wider shrink-0">
                  or enter an Indian pincode
                </span>
                <div className="border-t border-[#D5D9D9] w-full" />
              </div>

              {/* Pincode Input Form */}
              <form onSubmit={handleQuickPincodeSubmit} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={pincodeInput}
                    onChange={(e) => {
                      setPincodeInput(e.target.value.replace(/\D/g, ''));
                      setPincodeMessage('');
                    }}
                    placeholder="Enter 6-digit PIN code"
                    className="flex-1 px-3 py-2 text-xs border border-[#888C8C] rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF9900] focus:border-transparent"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] text-xs font-bold rounded-md border border-[#FCD200] shadow-xs cursor-pointer transition-colors"
                  >
                    Apply
                  </button>
                </div>

                {pincodeMessage && (
                  <p className="text-xs font-semibold text-[#067D62] bg-[#E8F8F5] border border-[#A2E7D8] rounded p-2 animate-in fade-in">
                    {pincodeMessage}
                  </p>
                )}
              </form>
            </div>

            {/* Modal Footer */}
            <div className="bg-[#F0F2F2] px-5 py-3 border-t border-[#D5D9D9] flex items-center justify-between text-xs">
              <Link
                href="/account?tab=addresses"
                onClick={() => setLocationModalOpen(false)}
                className="text-[#007185] hover:underline font-semibold"
              >
                {isUserLoggedIn ? 'Manage address book →' : 'Add address preferences →'}
              </Link>
              <button
                type="button"
                onClick={() => setLocationModalOpen(false)}
                className="px-3 py-1 bg-white hover:bg-[#F7F8F8] text-[#0F1111] border border-[#D5D9D9] rounded shadow-xs font-medium cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
