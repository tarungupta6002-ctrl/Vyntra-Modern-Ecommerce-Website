'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  Trash2,
  X,
  Check,
  ShieldCheck,
  Truck,
  RotateCcw,
  Zap,
  CheckCircle,
  Tag,
  Star,
  Heart,
  ChevronRight,
  ChevronLeft,
  Clock,
  Info,
  HelpCircle,
  Lock,
  Plus,
  Minus,
  Sparkles,
} from 'lucide-react';
import { useCartStore } from '@/store/cart-store';
import { useAddressStore } from '@/store/address-store';
import { useWishlistStore } from '@/store/wishlist-store';
import { formatINR } from '@/lib/utils';

// Curated Cross-Sell Recommendations from Stitch Screen 998b86f76b0f4208abd2a0e8ad042dd6
const RECOMMENDED_ITEMS = [
  {
    id: 'rec-kolhapuri',
    productId: 'VYN-KOL-901',
    title: 'Hand-Braided Leather Kolhapuri Slippers',
    brand: 'Royal Heritage Footwear',
    subtitle: 'Tan Brown • Cushioned insole',
    category: 'Artisan Footwear',
    price: 1850,
    originalPrice: 2999,
    discount: '38% OFF',
    rating: 4.8,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA3RzymBlnryW6ki109nl5uVP5TqDozOMCtJvQM0kuWy_vWhr2igPNd5JAYeq0K-PNfy5gHc_fxdr1Td0QdhydA0WwNg5Tto3gay8CDXqu-6JdE4CChYRQlyqnmaAyWKiMfXmRB4-OHTxdqF-jE4SQ4wR-WfWXYf2oWF0jFLjCB-ZKIh27QaGE6DZQrNmu0erE1FtdzMj9m6cAq3saC_wfOqxl0MDDFlkmiDr8spOU',
    size: '8',
    color: 'Tan Brown',
    vendorName: 'Kolhapur Artisan Cluster',
  },
  {
    id: 'rec-stole',
    productId: 'VYN-STL-304',
    title: 'Tussar Raw Silk Stole with Zari Border',
    brand: 'Benaras Weavers',
    subtitle: 'Ivory & Gold • Free size',
    category: 'Weaves of Kashi',
    price: 899,
    originalPrice: 1799,
    discount: '50% OFF',
    rating: 4.9,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA28HpHzOmxX33JLeH5pT_G8Ge7w8zdUoNJc_g4rlUNOn7DYyV2djKo55RZ0HQMfNhpKMLvsVEMRQVC0mbihOdGt_FI6meGI3KoFmqOsUlauB408fenxH4R7K21U7wmAb8dXJCd0zfWLkB8skNspG7jur3XyWZ4Nr4_ckhM7W0iO9HfLWd8a56wv9NCm-PfLlHkaZRenYSTZrMXjkFlqtu88jEAjFKIpYJ5I71QrRM',
    size: 'Free Size',
    color: 'Ivory Gold',
    vendorName: 'Varanasi Master Guild',
  },
  {
    id: 'rec-jhumkas',
    productId: 'VYN-JHM-102',
    title: 'Antique Finish Brass Filigree Jhumkas',
    brand: 'Tribe Amrapali',
    subtitle: 'Gold Tone • Nickel free',
    category: 'Temple Collection',
    price: 999,
    originalPrice: 1500,
    discount: '33% OFF',
    rating: 4.7,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBh-0ww564FnMwFh1aca6agBR343em0eYojPS36NnOR20w03rmmfdfUAN6nAiTbQPE94H5HzqrblwOx41ju_mSGDCfQcCL3frpJcLXx_bN4ZxkSkvugAVmsDeQrLQY1Hz2-wCi3WVyucrwXSeS5pOrgEVdRXponPUpLb4BezUMEEbT1rE6fysnsEeDiknN2Dxzz-TtnKdXtP5sUqwpEgOvX7K6uvwnNpTAcLgVotWI',
    size: 'One Size',
    color: 'Antique Gold',
    vendorName: 'Jaipur Jewelry Guild',
  },
];

export default function CartPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const {
    items,
    updateQuantity,
    removeItem,
    addItem,
    couponCode,
    isCouponApplied,
    applyCoupon,
    removeCoupon,
    getTotalItems,
    getSubtotal,
    getTotalSavings,
    syncWithDatabase,
  } = useCartStore();

  useEffect(() => {
    syncWithDatabase();
  }, []);

  // State
  const { getSelectedAddress, getDefaultAddress } = useAddressStore();
  const addToWishlist = useWishlistStore((state) => state.addItem);
  const activeAddress = getSelectedAddress() || getDefaultAddress();
  const [couponInput, setCouponInput] = useState('');
  const [pincode, setPincode] = useState(activeAddress?.pincode || '210427');
  const [changingPincode, setChangingPincode] = useState(false);
  const [wishlistSaved, setWishlistSaved] = useState<Record<string, boolean>>({});
  const [couponsModalOpen, setCouponsModalOpen] = useState(false);

  // Reservation Timer (15-min countdown)
  const [timeLeft, setTimeLeft] = useState(14 * 60 + 59);

  // Micro-toast state
  const [toast, setToast] = useState<{ show: boolean; message: string; icon?: string }>({
    show: false,
    message: '',
  });

  const [couponEligibility, setCouponEligibility] = useState<{
    isFirstOrder: boolean;
    previousOrdersCount: number;
    loaded: boolean;
  }>({
    isFirstOrder: true,
    previousOrdersCount: 0,
    loaded: false,
  });

  const showToast = (message: string, icon = 'check') => {
    setToast({ show: true, message, icon });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 2800);
  };

  useEffect(() => {
    setMounted(true);
    setCouponInput(couponCode || 'VYNTRAFIRST');

    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [couponCode]);

  useEffect(() => {
    async function checkEligibility() {
      try {
        const res = await fetch('/api/coupons/validate');
        const json = await res.json();
        if (json.success && json.data) {
          setCouponEligibility({
            isFirstOrder: json.data.isFirstOrder,
            previousOrdersCount: json.data.previousOrdersCount,
            loaded: true,
          });

          // Auto-remove VYNTRAFIRST if user has previous orders
          if (!json.data.isFirstOrder && isCouponApplied) {
            removeCoupon();
            showToast('VYNTRAFIRST removed: Valid only on 1st order', 'info');
          }
        }
      } catch (err) {
        console.error('Failed to verify coupon eligibility:', err);
      }
    }
    checkEligibility();
  }, [isCouponApplied, removeCoupon]);

  // Financial Calculations
  const totalItems = mounted ? getTotalItems() : 2;
  const subtotal = mounted ? getSubtotal() : 3899;
  const rawSavings = mounted ? getTotalSavings() : 3233;
  const totalMRP = subtotal + rawSavings;

  // Multi-Vendor Grouping
  const vendorGroups = useMemo(() => {
    const groups: {
      vendorKey: string;
      vendorName: string;
      vendorId?: string;
      shippingFee: number;
      handlingDays: number;
      subtotal: number;
      items: typeof items;
    }[] = [];

    const map = new Map<string, (typeof groups)[0]>();

    for (const item of items) {
      const key = item.vendorId || item.vendorName || 'Vyntra Atelier';
      if (!map.has(key)) {
        const newGroup = {
          vendorKey: key,
          vendorName: item.vendorName || 'Vyntra Atelier',
          vendorId: item.vendorId,
          shippingFee: item.shippingFee ?? 0,
          handlingDays: item.handlingDays || 2,
          subtotal: 0,
          items: [],
        };
        map.set(key, newGroup);
        groups.push(newGroup);
      }
      const grp = map.get(key)!;
      grp.subtotal += item.price * item.quantity;
      grp.items.push(item);
    }

    return groups;
  }, [items]);

  const totalShipping = useMemo(
    () => vendorGroups.reduce((acc, g) => acc + g.shippingFee, 0),
    [vendorGroups]
  );

  // Coupon Discount (Only VYNTRAFIRST is active; requires min order value ₹1,499 & 1st order)
  const couponDiscount = useMemo(() => {
    if (!isCouponApplied || !couponCode) return 0;
    if (couponEligibility.loaded && !couponEligibility.isFirstOrder) return 0;
    const code = couponCode.toUpperCase();
    if (code === 'VYNTRAFIRST') {
      if (subtotal < 1499) return 0;
      return Math.min(Math.round(subtotal * 0.1), 1000); // 10% capped at ₹1,000
    }
    return 0;
  }, [isCouponApplied, couponCode, subtotal, couponEligibility]);

  const packagingFee = totalItems > 0 ? 49 : 0;
  const finalPayable = Math.max(0, subtotal - couponDiscount + packagingFee + totalShipping);
  const totalSavings = rawSavings + couponDiscount;

  // Express 24h Threshold: ₹4,000
  const expressTarget = 4000;
  const amountToUnlockExpress = Math.max(0, expressTarget - subtotal);
  const expressProgress = Math.min(100, Math.round((subtotal / expressTarget) * 100));

  // Format timer string
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle Apply Coupon
  const handleApplyCoupon = async (codeToApply?: string) => {
    const code = (codeToApply || couponInput).trim().toUpperCase();
    if (!code) {
      showToast('Please enter a coupon code', 'error');
      return;
    }
    if (code !== 'VYNTRAFIRST') {
      showToast('Invalid coupon code. Only "VYNTRAFIRST" is active.', 'error');
      return;
    }
    if (subtotal < 1499) {
      showToast(`Add items worth ₹${1499 - subtotal} more to apply VYNTRAFIRST (Min order ₹1,499).`, 'error');
      return;
    }
    if (couponEligibility.loaded && !couponEligibility.isFirstOrder) {
      showToast('Coupon VYNTRAFIRST is only valid on your first order.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponCode: code, subtotal }),
      });
      const json = await res.json();
      if (!json.success) {
        showToast(json.error?.message || 'Coupon not applicable', 'error');
        return;
      }

      const success = applyCoupon(code);
      if (success) {
        showToast('Coupon "VYNTRAFIRST" applied successfully! 10% Off.', 'check');
        setCouponsModalOpen(false);
      }
    } catch (err) {
      showToast('Failed to validate coupon. Please try again.', 'error');
    }
  };

  // Move to wishlist
  const handleMoveToWishlist = async (item: (typeof items)[0]) => {
    setWishlistSaved((prev) => ({ ...prev, [item.id]: true }));
    try {
      await addToWishlist({
        id: item.productId || item.id,
        productId: item.productId || item.id,
        title: item.title,
        subtitle: `${item.color ? item.color + ' • ' : ''}Size ${item.size || 'Standard'}`,
        brand: item.brand,
        price: item.price,
        originalPrice: item.originalPrice || item.price,
        image: item.image,
        inStock: true,
        boardIds: ['all'],
        selectedSize: item.size || undefined,
      });
      await removeItem(item.id);
      showToast(`Moved "${item.title}" to Wishlist!`, 'heart');
    } catch {
      showToast(`Could not move to Wishlist`, 'error');
    }
  };

  // Quick Add Recommendation to Cart
  const handleAddRecommendation = (rec: (typeof RECOMMENDED_ITEMS)[0]) => {
    addItem({
      id: `cart-rec-${rec.id}-${Date.now()}`,
      productId: rec.productId,
      title: rec.title,
      brand: rec.brand,
      variantId: `var-${rec.id}`,
      size: rec.size,
      color: rec.color,
      price: rec.price,
      originalPrice: rec.originalPrice,
      quantity: 1,
      image: rec.image,
      vendorName: rec.vendorName,
    });
    showToast(`Added ${rec.title} to Bag!`, 'bag');
  };

  return (
    <div className="w-full bg-surface min-h-[calc(100vh-280px)] text-on-surface antialiased py-6">
      {/* Festive Alert Ribbon Banner */}
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 mb-4">
        <div className="bg-primary text-on-primary text-xs font-medium py-2 px-4 rounded-xl text-center flex items-center justify-center gap-2 shadow-sm">
          <span className="bg-secondary-container text-on-secondary-container font-semibold px-2 py-0.5 rounded-full text-[10px] tracking-wider uppercase">
            Festive Offer
          </span>
          <span>
            Enjoy free express delivery &amp; extra 10% off with code{' '}
            <strong className="underline cursor-pointer" onClick={() => handleApplyCoupon('VYNTRAFIRST')}>
              VYNTRAFIRST
            </strong>
          </span>
        </div>
      </div>

      <div className="max-w-[1360px] w-full mx-auto px-4 sm:px-6 lg:px-10">
        {/* Top Breadcrumb & Status */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-on-surface-variant font-medium">
            <Link href="/" className="hover:text-primary transition-colors flex items-center gap-1">
              <span>Home</span>
            </Link>
            <ChevronRight className="h-3 w-3 text-outline-variant" />
            <Link href="/products" className="hover:text-primary transition-colors">
              Marketplace
            </Link>
            <ChevronRight className="h-3 w-3 text-outline-variant" />
            <span suppressHydrationWarning className="text-primary font-semibold">
              Shopping Cart ({totalItems} Item{totalItems !== 1 ? 's' : ''})
            </span>
          </nav>

          <div className="flex items-center gap-2 text-xs font-semibold text-primary bg-surface-container px-3.5 py-1.5 rounded-full shadow-sm">
            <span className="w-2 h-2 rounded-full bg-secondary-container animate-pulse" />
            <span>
              Cart reserved for{' '}
              <strong className="font-headline font-bold text-on-surface font-mono" id="timer-display">
                {formatTimer(timeLeft)}
              </strong>
            </span>
          </div>
        </div>

        {/* Free Delivery Progress Tracker banner */}
        <div className="mb-8 p-5 bg-gradient-to-r from-surface-container via-surface-container-low to-secondary-fixed/30 rounded-2xl shadow-sm relative overflow-hidden border border-surface-container/60">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0 shadow-sm">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-headline font-bold text-sm sm:text-base text-on-surface">
                    Complimentary Express Delivery
                  </span>
                  <span className="bg-secondary-container text-on-secondary-container text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Fast Lane
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  <span className="font-bold text-primary flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5 text-secondary" />
                    Congratulations! Express Courier Shipping is 100% Free on this order.
                  </span>
                </p>
              </div>
            </div>

            <div className="w-full md:w-72 flex flex-col gap-1.5 shrink-0">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span suppressHydrationWarning className="text-on-surface font-mono">{formatINR(subtotal)}</span>
                <span className="text-secondary font-bold">100% Free Delivery</span>
              </div>
              <div className="h-2.5 w-full bg-surface-container-highest rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-primary to-secondary-container rounded-full transition-all duration-700 shadow-sm w-full"
                />
              </div>
              <p className="text-[11px] text-right text-secondary font-bold font-mono">
                Unlocked (₹0 Delivery Fee)
              </p>
            </div>
          </div>
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Main Two Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Cart Items & Trust Strip (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-5">
            {/* Cart Items Container */}
            <div className="bg-surface-container-lowest rounded-2xl shadow-sm p-5 sm:p-7 flex flex-col gap-6 border border-surface-container">
              <div className="flex items-center justify-between pb-3 border-b border-surface-container">
                <div className="flex items-center gap-2">
                  <span className="font-headline font-bold text-lg text-on-surface">Items in Cart</span>
                  <span suppressHydrationWarning className="px-2.5 py-0.5 text-xs font-bold bg-surface-container text-primary rounded-full">
                    {totalItems}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-on-surface-variant font-medium">
                  <span>Pin code:</span>
                  {changingPincode ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        maxLength={6}
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                        className="w-20 px-2 py-0.5 rounded bg-surface-container text-xs font-bold font-mono outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setChangingPincode(false);
                          showToast(`PIN updated to ${pincode}`, 'check');
                        }}
                        className="text-primary font-bold hover:underline"
                      >
                        Set
                      </button>
                    </div>
                  ) : (
                    <span
                      onClick={() => setChangingPincode(true)}
                      className="text-on-surface font-semibold cursor-pointer hover:text-primary transition-colors flex items-center gap-1"
                      title="Click to change pincode"
                    >
                      <strong>{activeAddress ? `${activeAddress.city} ${activeAddress.pincode}` : `India ${pincode}`}</strong>
                      <span className="text-[10px] text-primary underline">Change</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Empty Cart State */}
              {items.length === 0 ? (
                <div className="py-16 px-4 flex flex-col items-center justify-center text-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center text-primary shadow-inner">
                    <ShoppingBag className="h-10 w-10 text-primary" />
                  </div>
                  <div className="flex flex-col gap-1 max-w-sm">
                    <h3 className="font-headline font-bold text-lg text-on-surface">Your Shopping Bag is empty</h3>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      Explore India&apos;s finest handcrafted handlooms, luxury festive attire, and authentic artisan
                      creations.
                    </p>
                  </div>
                  <Link
                    href="/products"
                    className="mt-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-headline font-bold text-xs tracking-wider uppercase shadow-md transition-all active:scale-98"
                  >
                    Explore Handcrafted Collections
                  </Link>
                </div>
              ) : (
                /* Multi-Vendor Grouped Packages */
                <div className="flex flex-col gap-6">
                  {vendorGroups.length > 1 && (
                    <div className="p-3.5 bg-primary-fixed/30 rounded-xl border border-primary/20 flex items-center gap-2.5 text-xs text-on-surface">
                      <Truck className="h-4 w-4 text-primary shrink-0" />
                      <span>
                        Multi-Vendor Order: Your items will arrive in <strong>{vendorGroups.length} independent packages</strong> dispatched by their respective artisan ateliers.
                      </span>
                    </div>
                  )}

                  {vendorGroups.map((group, pkgIdx) => (
                    <div
                      key={group.vendorKey}
                      className="rounded-2xl border border-surface-container bg-surface-container-lowest overflow-hidden shadow-xs"
                    >
                      {/* Package Header Strip */}
                      <div className="bg-surface-container-low px-4 sm:px-5 py-3 border-b border-surface-container flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                            {pkgIdx + 1}
                          </span>
                          <div>
                            <h4 className="text-xs font-bold text-on-surface">
                              Package {pkgIdx + 1} of {vendorGroups.length}: Shipped by <strong className="text-primary font-extrabold">{group.vendorName}</strong>
                            </h4>
                            <p className="text-[10px] text-on-surface-variant">
                              Independent dispatch • Estimated delivery in {group.handlingDays}–{group.handlingDays + 2} business days
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-xs">
                          <span className="font-semibold text-secondary bg-secondary-fixed/50 px-2.5 py-0.5 rounded-full text-[11px]">
                            {group.shippingFee === 0 ? 'FREE Express Delivery' : `Shipping: ${formatINR(group.shippingFee)}`}
                          </span>
                          <span className="font-mono font-bold text-on-surface hidden sm:inline">
                            Subtotal: {formatINR(group.subtotal)}
                          </span>
                        </div>
                      </div>

                      {/* Items in this Package */}
                      <div className="p-4 sm:p-5 flex flex-col gap-4">
                        {group.items.map((item) => {
                          const itemSavings = Math.max(0, item.originalPrice - item.price);
                          const discountPct =
                            item.originalPrice > 0
                              ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)
                              : 0;

                          return (
                            <div
                              key={item.id}
                              className="p-4 rounded-xl bg-surface-container-low/70 flex flex-col sm:flex-row gap-4 relative transition-all duration-200 hover:shadow-sm border border-surface-container/60"
                            >
                              {/* Media Canvas */}
                              <div className="relative w-full sm:w-32 h-44 sm:h-40 rounded-lg overflow-hidden shrink-0 bg-surface-dim shadow-inner group">
                                <Image
                                  src={item.image}
                                  alt={item.title}
                                  fill
                                  sizes="(max-width: 640px) 100vw, 130px"
                                  className="object-cover object-top hover:scale-105 transition-transform duration-300"
                                />
                                <span className="absolute top-2 left-2 bg-primary text-on-primary text-[10px] font-bold px-2 py-0.5 rounded shadow-xs uppercase tracking-wider">
                                  {item.brand.includes('Studio') ? 'STUDIO' : 'ARTISAN'}
                                </span>
                              </div>

                              {/* Content Details */}
                              <div className="flex flex-col justify-between flex-1 min-w-0">
                                <div>
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                                        {item.brand}
                                      </span>
                                      <h3 className="font-headline font-bold text-base sm:text-lg text-on-surface leading-snug line-clamp-2">
                                        {item.title}
                                      </h3>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        removeItem(item.id);
                                        showToast(`Removed "${item.title}"`, 'trash');
                                      }}
                                      className="text-on-surface-variant hover:text-error transition-colors p-1.5 rounded-md hover:bg-surface-container"
                                      title="Remove Item"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>

                                  {/* Attributes & Stock */}
                                  <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-on-surface-variant font-medium">
                                    {item.size && (
                                      <span className="bg-surface-container px-2.5 py-0.5 rounded text-on-surface">
                                        Size: <strong className="font-semibold">{item.size}</strong>
                                      </span>
                                    )}
                                    {item.color && (
                                      <span className="bg-surface-container px-2.5 py-0.5 rounded text-on-surface flex items-center gap-1.5">
                                        Color:
                                        <strong className="font-semibold">{item.color}</strong>
                                      </span>
                                    )}
                                    {item.sellerOfferId && (
                                      <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded font-bold text-[10px]">
                                        Seller Offer
                                      </span>
                                    )}
                                    {item.availableStock !== undefined ? (
                                      item.availableStock === 0 ? (
                                        <span className="inline-flex items-center gap-1 text-error font-bold text-[11px] bg-error-container/40 px-2 py-0.5 rounded-full">
                                          <Clock className="h-3 w-3" />
                                          <span>Out of stock</span>
                                        </span>
                                      ) : item.availableStock <= 5 ? (
                                        <span className="inline-flex items-center gap-1 text-secondary font-bold text-[11px] bg-secondary-fixed/40 px-2 py-0.5 rounded-full">
                                          <Clock className="h-3 w-3" />
                                          <span>Only {item.availableStock} left</span>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-secondary font-bold text-[11px] bg-secondary-fixed/40 px-2 py-0.5 rounded-full">
                                          <Check className="h-3 w-3" />
                                          <span>In Stock</span>
                                        </span>
                                      )
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-secondary font-bold text-[11px] bg-secondary-fixed/40 px-2 py-0.5 rounded-full">
                                        <Check className="h-3 w-3" />
                                        <span>In Stock</span>
                                      </span>
                                    )}
                                  </div>

                                  {/* Price Block */}
                                  <div className="flex items-baseline gap-2.5 mt-3">
                                    <span className="font-headline font-extrabold text-xl text-on-surface font-mono">
                                      {formatINR(item.price * item.quantity)}
                                    </span>
                                    <span className="text-xs text-on-surface-variant line-through font-mono">
                                      {formatINR(item.originalPrice * item.quantity)}
                                    </span>
                                    {discountPct > 0 && (
                                      <span className="text-xs font-bold text-secondary bg-secondary-fixed/50 px-2 py-0.5 rounded-full">
                                        {discountPct}% OFF
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Stepper & Wishlist Row */}
                                <div className="mt-4 pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-surface-container/60">
                                  <div className="flex items-center gap-4">
                                    {/* Quantity Stepper */}
                                    <div className="flex items-center bg-surface-container-lowest rounded-lg shadow-sm p-1 border border-surface-container">
                                      <button
                                        type="button"
                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                        className="w-7 h-7 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container rounded transition-colors text-sm font-bold disabled:opacity-40"
                                        title="Decrease quantity"
                                      >
                                        <Minus className="h-3.5 w-3.5" />
                                      </button>
                                      <span className="w-8 text-center text-xs font-bold text-on-surface font-mono">
                                        {item.quantity}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                        disabled={item.availableStock !== undefined && item.quantity >= item.availableStock}
                                        className="w-7 h-7 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container rounded transition-colors text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                                        title={item.availableStock !== undefined && item.quantity >= item.availableStock ? 'Max stock reached' : 'Increase quantity'}
                                      >
                                        <Plus className="h-3.5 w-3.5" />
                                      </button>
                                    </div>

                                    <div className="flex items-center gap-3 text-xs text-on-surface-variant font-semibold">
                                      <button
                                        type="button"
                                        onClick={() => handleMoveToWishlist(item)}
                                        className="hover:text-primary flex items-center gap-1 transition-colors"
                                      >
                                        <Heart className="h-3.5 w-3.5" />
                                        <span>Move to Wishlist</span>
                                      </button>
                                      <span className="text-outline-variant">|</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          removeItem(item.id);
                                          showToast(`Removed "${item.title}"`, 'trash');
                                        }}
                                        className="hover:text-error flex items-center gap-1 transition-colors"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        <span>Remove</span>
                                      </button>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 text-xs text-primary font-semibold bg-primary-fixed/40 px-3 py-1 rounded-full">
                                    <Zap className="h-3.5 w-3.5 text-primary" />
                                    <span>
                                      Express Delivery SLA
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Safe Shopping Assurance Strip */}
            <div className="bg-surface-container-high/60 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-around gap-4 text-xs font-medium text-on-surface border border-surface-container">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <span>100% Genuine Handcrafted Products</span>
              </div>
              <span className="hidden md:inline-block w-1 h-1 rounded-full bg-outline-variant" />
              <div className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-primary" />
                <span>7-Day Easy Returns &amp; Exchanges</span>
              </div>
              <span className="hidden md:inline-block w-1 h-1 rounded-full bg-outline-variant" />
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <span>Secure Direct Checkout</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Order Summary & Coupon Breakdown (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-5 sticky top-28">
            {/* Coupons Section */}
            <div className="bg-surface-container-lowest rounded-2xl shadow-sm p-6 flex flex-col gap-4 border border-surface-container">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-secondary" />
                  <h4 className="font-headline font-bold text-sm text-on-surface">Apply Coupon</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setCouponsModalOpen(true)}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  View All (1)
                </button>
              </div>

              {/* Coupon Input Form */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Enter coupon code"
                    className="w-full h-11 px-3.5 bg-surface-container-low text-xs font-bold tracking-wider uppercase text-on-surface rounded-lg placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleApplyCoupon()}
                  className="h-11 px-4 bg-white hover:bg-[#F7FAFA] text-[#0F1111] border border-[#D5D9D9] text-xs font-bold rounded-md transition-colors shadow-sm"
                >
                  Apply
                </button>
              </div>

              {/* Available Coupon Applied Card */}
              {isCouponApplied && (
                <div className="p-3.5 bg-secondary-fixed/30 rounded-xl flex items-center justify-between gap-3 shadow-sm border border-secondary/20 animate-in fade-in">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                      <Check className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-headline font-bold text-xs text-on-surface tracking-wide uppercase">
                        {couponCode} Applied
                      </p>
                      <p className="text-[11px] font-semibold text-secondary">
                        Extra 10% applied! You saved {formatINR(couponDiscount)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      removeCoupon();
                      showToast('Coupon removed', 'info');
                    }}
                    className="text-xs font-bold text-error hover:underline shrink-0"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* Price Details Card */}
            <div className="bg-surface-container-lowest rounded-2xl shadow-sm p-6 flex flex-col gap-5 border border-surface-container">
              <div className="flex items-center justify-between pb-3 border-b border-surface-container">
                <h4 className="font-headline font-bold text-base text-on-surface">Price Details</h4>
                <span className="text-xs text-on-surface-variant font-medium">({totalItems} Items in Bag)</span>
              </div>

              {/* Ledger Table */}
              <div className="flex flex-col gap-3 text-xs">
                <div className="flex items-center justify-between text-on-surface-variant font-medium">
                  <span>Total MRP</span>
                  <span className="text-on-surface font-semibold font-mono">{formatINR(totalMRP)}</span>
                </div>

                <div className="flex items-center justify-between text-secondary font-semibold">
                  <span className="flex items-center gap-1">
                    Discount on MRP
                    <Info className="h-3.5 w-3.5 text-outline" />
                  </span>
                  <span className="font-mono">- {formatINR(rawSavings)}</span>
                </div>

                {isCouponApplied && (
                  <div className="flex items-center justify-between text-secondary font-semibold">
                    <span className="flex items-center gap-1">
                      Coupon Discount
                      <span className="bg-secondary-fixed text-on-secondary-fixed text-[9px] px-1.5 py-0.2 rounded font-bold uppercase">
                        {couponCode}
                      </span>
                    </span>
                    <span className="font-mono">- {formatINR(couponDiscount)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-on-surface-variant font-medium">
                  <span className="flex items-center gap-1">
                    Delivery Charges
                    <span className="text-[10px] text-primary font-bold bg-primary-fixed/50 px-1.5 py-0.5 rounded">
                      {vendorGroups.length > 1 ? `${vendorGroups.length} Packages` : 'Express'}
                    </span>
                  </span>
                  <div className="flex items-center gap-1.5 font-semibold">
                    {totalShipping === 0 ? (
                      <>
                        <span className="line-through text-outline font-mono">
                          ₹{Math.max(1, vendorGroups.length) * 99}
                        </span>
                        <span className="text-secondary font-bold uppercase">FREE</span>
                      </>
                    ) : (
                      <span className="text-on-surface font-semibold font-mono">
                        {formatINR(totalShipping)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-on-surface-variant font-medium">
                  <span
                    className="flex items-center gap-1 cursor-pointer"
                    title="Direct welfare support to rural loom clusters"
                  >
                    Packaging &amp; Artisan Fee
                    <HelpCircle className="h-3 w-3 text-outline" />
                  </span>
                  <span className="text-on-surface font-semibold font-mono">₹{packagingFee}</span>
                </div>
              </div>

              {/* Total Calculation Banner */}
              <div className="p-4 bg-surface-container-low rounded-xl flex flex-col gap-2">
                <div className="flex items-baseline justify-between">
                  <span className="font-headline font-bold text-sm text-on-surface">Total Payable Amount</span>
                  <span className="font-headline font-extrabold text-2xl text-primary font-mono">
                    {formatINR(finalPayable)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-secondary bg-secondary-fixed/50 px-2.5 py-1 rounded-md">
                  <Sparkles className="h-3.5 w-3.5 text-secondary" />
                  <span>You are saving {formatINR(totalSavings)} on this order!</span>
                </div>
              </div>

              {/* Checkout Primary Button */}
              <Link
                href="/checkout"
                className="w-full h-12 bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] border border-[#FCD200] font-bold text-sm tracking-wide rounded-md shadow-sm flex items-center justify-center gap-3 transition-colors active:scale-[0.99] cursor-pointer"
              >
                <Lock className="h-4 w-4" />
                <span>PROCEED TO BUY ({formatINR(finalPayable)})</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              {/* Back to Shopping */}
              <Link
                href="/products"
                className="text-center text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors py-1 flex items-center justify-center gap-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Continue Shopping</span>
              </Link>

              {/* Payment Security Icons Strip */}
              <div className="pt-3 flex flex-col items-center gap-2 border-t border-surface-container">
                <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider text-outline">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  <span>PCI-DSS 256-Bit Encrypted Checkout</span>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-on-surface-variant">
                  <span className="px-2 py-0.5 bg-surface-container rounded text-[11px]">UPI</span>
                  <span className="px-2 py-0.5 bg-surface-container rounded text-[11px]">Visa / Mastercard</span>
                  <span className="px-2 py-0.5 bg-surface-container rounded text-[11px]">NetBanking</span>
                  <span className="px-2 py-0.5 bg-surface-container rounded text-[11px]">COD</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Recommended For You */}
        <div className="mt-14 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
            <div>
              <span className="text-xs font-bold text-secondary uppercase tracking-widest font-headline">
                Complete Your Ensemble
              </span>
              <h2 className="font-headline font-bold text-2xl text-on-surface tracking-tight mt-0.5">
                Recommended For You
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="w-9 h-9 rounded-full bg-surface-container-lowest shadow-sm flex items-center justify-center text-on-surface hover:text-primary hover:bg-surface-container transition-colors border border-surface-container"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="w-9 h-9 rounded-full bg-surface-container-lowest shadow-sm flex items-center justify-center text-on-surface hover:text-primary hover:bg-surface-container transition-colors border border-surface-container"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {RECOMMENDED_ITEMS.map((rec) => (
              <div
                key={rec.id}
                className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col group border border-surface-container"
              >
                <div className="relative w-full h-56 rounded-xl overflow-hidden bg-surface-container-low mb-4">
                  <Image
                    src={rec.image}
                    alt={rec.title}
                    fill
                    sizes="(max-width: 640px) 100vw, 300px"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-2.5 left-2.5 bg-surface-container-lowest/90 backdrop-blur-sm text-on-surface text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    {rec.category}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await addToWishlist({
                          id: rec.productId || `wish-rec-${rec.id}`,
                          productId: rec.productId,
                          title: rec.title,
                          brand: rec.brand,
                          price: rec.price,
                          originalPrice: rec.originalPrice,
                          image: rec.image,
                          inStock: true,
                          boardIds: ['all'],
                        });
                        showToast(`Added "${rec.title}" to Wishlist!`, 'heart');
                      } catch {
                        showToast(`Could not add to Wishlist`, 'error');
                      }
                    }}
                    className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-surface-container-lowest/90 backdrop-blur-sm text-on-surface-variant hover:text-error flex items-center justify-center shadow-sm transition-transform active:scale-90"
                    title="Save to Wishlist"
                  >
                    <Heart className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex flex-col flex-1 justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">
                        {rec.brand}
                      </span>
                      <span className="flex items-center text-xs font-bold text-on-surface">
                        <Star className="h-3.5 w-3.5 fill-current text-secondary mr-0.5" /> {rec.rating}
                      </span>
                    </div>
                    <h4 className="font-headline font-bold text-sm text-on-surface line-clamp-1">{rec.title}</h4>
                    <p className="text-xs text-on-surface-variant mt-1">{rec.subtitle}</p>
                  </div>

                  <div className="mt-4 pt-3 flex items-center justify-between gap-2 border-t border-surface-container/60">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-headline font-extrabold text-base text-on-surface font-mono">
                        {formatINR(rec.price)}
                      </span>
                      <span className="text-xs text-outline line-through font-mono">
                        {formatINR(rec.originalPrice)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddRecommendation(rec)}
                      className="px-3.5 py-[5px] h-[31px] bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] border border-[#FCD200] font-normal text-[14px] rounded-full transition-colors flex items-center justify-center shadow-sm active:scale-95"
                    >
                      <span>Add to cart</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Available Coupons Dialog Modal */}
      {couponsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 border border-surface-container">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-headline font-bold text-on-surface">Available Festive Coupons</h3>
              </div>
              <button
                type="button"
                onClick={() => setCouponsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {[
                {
                  code: 'VYNTRAFIRST',
                  title: 'Special First Order Discount',
                  desc: 'Extra 10% instant discount on your first order above ₹1,499 (Max ₹1,000 off)',
                  isEligible: subtotal >= 1499 && (couponEligibility.loaded ? couponEligibility.isFirstOrder : true),
                  ineligibleReason: !couponEligibility.isFirstOrder
                    ? 'Only valid on your 1st order. You have existing orders on Vyntra.'
                    : subtotal < 1499
                    ? `Add ₹${1499 - subtotal} more to unlock this discount`
                    : null,
                },
              ].map((promo) => (
                <div
                  key={promo.code}
                  className="p-3.5 rounded-xl bg-surface-container-low flex items-start justify-between gap-3 border border-surface-container"
                >
                  <div className="flex flex-col">
                    <span className="font-mono font-bold text-xs text-primary bg-primary/10 px-2 py-0.5 rounded w-max">
                      {promo.code}
                    </span>
                    <span className="font-bold text-xs text-on-surface mt-1">{promo.title}</span>
                    <span className="text-[11px] text-on-surface-variant">{promo.desc}</span>
                    {promo.ineligibleReason && (
                      <span className="text-[10px] text-rose-600 font-semibold mt-1">
                        {promo.ineligibleReason}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApplyCoupon(promo.code)}
                    disabled={!promo.isEligible}
                    className="px-3 py-1 rounded bg-primary text-on-primary text-xs font-bold hover:bg-primary-container transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Apply
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating Micro-Toast */}
      {toast.show && (
        <div className="fixed top-20 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-primary text-on-primary shadow-xl text-xs font-semibold">
            {toast.icon === 'bag' ? (
              <ShoppingBag className="h-4 w-4 text-secondary-fixed" />
            ) : toast.icon === 'heart' ? (
              <Heart className="h-4 w-4 text-red-400 fill-current" />
            ) : (
              <CheckCircle className="h-4 w-4 text-secondary-fixed" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
