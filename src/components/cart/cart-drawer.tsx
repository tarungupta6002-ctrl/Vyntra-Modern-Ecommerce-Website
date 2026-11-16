'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  X,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Truck,
  RotateCcw,
  Zap,
  CheckCircle,
  Check,
  Tag,
} from 'lucide-react';
import { useCartStore } from '@/store/cart-store';
import { formatINR } from '@/lib/utils';

export function CartDrawer() {
  const router = useRouter();
  const {
    items,
    isOpen,
    closeCart,
    updateQuantity,
    removeItem,
    addItem,
    getSubtotal,
    getTotalSavings,
    getTotalItems,
  } = useCartStore();

  const [couponApplied, setCouponApplied] = useState(false);
  const [isFirstOrder, setIsFirstOrder] = useState<boolean | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    async function checkEligibility() {
      try {
        const res = await fetch('/api/coupons/validate');
        const json = await res.json();
        if (json.success && json.data) {
          setIsFirstOrder(json.data.isFirstOrder);
          if (!json.data.isFirstOrder) {
            setCouponApplied(false);
          }
        }
      } catch (e) {}
    }
    checkEligibility();
  }, []);

  const totalItems = getTotalItems();
  const subtotal = getSubtotal();
  const rawSavings = getTotalSavings();
  const totalMRP = subtotal + rawSavings;

  // Coupon discount logic (Only VYNTRAFIRST is active, min order value ₹1,499 & 1st order)
  const couponDiscount =
    couponApplied && subtotal >= 1499 && isFirstOrder !== false
      ? Math.min(Math.round(subtotal * 0.1), 1000)
      : 0;
  const totalSavings = rawSavings + couponDiscount;
  const finalPayable = Math.max(0, subtotal - couponDiscount);
  const savingsPercent =
    totalMRP > 0 ? Math.round((totalSavings / totalMRP) * 100) : 0;

  // Free delivery is complimentary on all artisan orders
  const isFreeDeliveryUnlocked = totalItems > 0;

  // Check if Kolhapuris cross-sell is in cart
  const hasKolhapuris = items.some((item) => item.productId === 'VYN-KOL-901');

  // Handle smooth dismiss
  const handleDismiss = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      setIsAnimatingOut(false);
      closeCart();
    }, 280);
  };

  // Keyboard accessibility: Escape key closes drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleDismiss();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Checkout redirect action
  const handleCheckout = () => {
    setRedirecting(true);
    setTimeout(() => {
      handleDismiss();
      router.push('/checkout');
      setRedirecting(false);
    }, 400);
  };

  // Add cross-sell Kolhapuris
  const handleAddKolhapuris = () => {
    addItem({
      id: `cross-kolhapuri-${Date.now()}`,
      productId: 'VYN-KOL-901',
      title: 'Handcrafted Tuscan Tan Kolhapuris',
      brand: 'Vyntra Artisan',
      variantId: 'var-kolhapuri-tan',
      size: '9',
      color: 'Tuscan Tan',
      price: 1850,
      originalPrice: 2999,
      quantity: 1,
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCkS7yqJbq-jEkIPKDBNo8ePNeQm_dz27yKFkjHC6QykS9p0YgfRdpHPM6xsZpqXreQk7JkVaNI3-wHAYA11TAJltvxy8MBcIuWVCLVfjdEfM8wNJv6u7WDEwWwCIJyK9xnHLdZaMwOQTILpTWRmjZ_naBUq9NSFAVM6dAgkksbtKzIKeVznYs92oZDS_pyvRtu6Z4bIwaCh-28_Vhc1v49sjDcYY_d8pSlyCKRlV8',
      vendorName: 'Kolhapur Craft Guild',
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden flex justify-end"
      id="cartModalRoot"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Bag Drawer"
    >
      {/* Darkened Translucent Scrim Backdrop */}
      <div
        aria-hidden="true"
        onClick={handleDismiss}
        className={`absolute inset-0 bg-inverse-surface/60 backdrop-blur-sm transition-opacity duration-300 ease-out cursor-pointer ${
          isAnimatingOut ? 'opacity-0' : 'opacity-100'
        }`}
        id="cartBackdrop"
      />

      {/* Active Slide-In Cart Drawer Surface */}
      <aside
        aria-label="Shopping Bag Drawer"
        className={`relative w-full max-w-[490px] h-full bg-surface-container-lowest shadow-2xl flex flex-col z-10 transform transition-transform duration-300 ease-out ${
          isAnimatingOut ? 'translate-x-full' : 'translate-x-0'
        }`}
        id="drawerPanel"
      >
        {/* Top Drawer Header */}
        <div className="px-6 py-5 bg-surface-container-lowest flex items-center justify-between border-b border-surface-container/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-primary shadow-xs">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="font-headline font-bold text-lg text-on-surface tracking-tight">
                Shopping Bag
              </h2>
              <span
                className="text-xs font-semibold text-primary bg-surface-container px-2 py-0.5 rounded-full"
                id="headerItemCount"
              >
                {totalItems} {totalItems === 1 ? 'item' : 'items'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Close cart drawer"
            className="w-9 h-9 rounded-full bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Free Express Delivery Milestone Banner */}
        <div className="px-6 py-3.5 bg-surface-container-low flex flex-col gap-2 shrink-0 border-b border-surface-container/60">
          <div className="flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-1.5 text-primary">
              <Zap className="h-4 w-4 text-primary fill-current" />
              <span>
                You unlocked <strong className="font-bold">FREE Express Delivery!</strong>
              </span>
            </div>
            <span className="text-[11px] font-bold text-secondary uppercase tracking-wider bg-secondary-fixed px-1.5 py-0.5 rounded">
              Saved ₹199
            </span>
          </div>

          {/* Progress Bar Meter */}
          <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-primary to-secondary-container rounded-full transition-all duration-500 w-full"
            />
          </div>
        </div>

        {/* Drawer Scrollable Item List */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-surface-container-high flex items-center justify-center text-primary">
                <ShoppingBag className="h-8 w-8" />
              </div>
              <div>
                <h3 className="font-headline font-bold text-base text-on-surface">
                  Your shopping bag is empty
                </h3>
                <p className="text-xs text-on-surface-variant mt-1 max-w-xs">
                  Discover handcrafted festive apparel, certified pure silks, and artisanal
                  lifestyle curations.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  handleDismiss();
                  router.push('/products');
                }}
                className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-headline font-bold text-xs shadow-sm transition-all"
              >
                Explore Handcrafted Products
              </button>
            </div>
          ) : (
            <>
              {items.map((item) => {
                const isSareeOrUnstitched =
                  item.title?.toLowerCase().includes('saree') ||
                  item.title?.toLowerCase().includes('shawl') ||
                  item.title?.toLowerCase().includes('dupatta');
                const effectiveSize = isSareeOrUnstitched
                  ? 'Free Size'
                  : item.size || 'Standard';

                return (
                <div
                  key={item.id}
                  className="p-3.5 bg-surface-container-low rounded-xl flex gap-3.5 transition-all duration-200 hover:bg-surface-container border border-surface-container/60 shadow-xs"
                >
                  {/* Thumbnail with Size Badge */}
                  <div className="w-20 h-24 rounded-lg bg-surface-container-lowest overflow-hidden shrink-0 relative shadow-xs">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="80px"
                      className="object-cover object-top"
                    />
                    <span className="absolute bottom-1 left-1 bg-surface-container-lowest/90 backdrop-blur-xs text-[9px] font-bold text-primary px-1 rounded shadow-xs">
                      {effectiveSize}
                    </span>
                  </div>

                  {/* Item Content */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold tracking-wider uppercase text-secondary">
                          {item.brand || 'Vyntra Artisan'}
                        </span>
                        <h3 className="text-xs font-semibold text-on-surface font-headline truncate leading-snug">
                          {item.title}
                        </h3>
                        <p className="text-[11px] text-on-surface-variant mt-0.5 truncate">
                          Size: {effectiveSize} • {item.color || 'Handcrafted'}
                        </p>
                        {item.vendorName && (
                          <p className="text-[10px] text-secondary font-medium truncate mt-0.5">
                            Sold by: <span className="font-bold text-on-surface">{item.vendorName}</span>
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-outline hover:text-error transition-colors p-1 rounded hover:bg-error-container/40"
                        title="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Stepper & Price Row */}
                    <div className="flex items-center justify-between pt-2">
                      {/* Stepper */}
                      <div className="flex items-center bg-surface-container-lowest rounded-md shadow-xs px-1 py-0.5 border border-surface-container/40">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-6 h-6 flex items-center justify-center text-on-surface hover:text-primary active:scale-95 font-medium transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-semibold text-on-surface font-mono">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.availableStock !== undefined && item.quantity >= item.availableStock}
                          className="w-6 h-6 flex items-center justify-center text-on-surface hover:text-primary active:scale-95 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          aria-label="Increase quantity"
                          title={item.availableStock !== undefined && item.quantity >= item.availableStock ? 'Max stock reached' : 'Increase quantity'}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Price Cluster */}
                      <div className="text-right font-mono">
                        <span className="text-sm font-bold font-headline text-on-surface block leading-tight">
                          {formatINR(item.price * item.quantity)}
                        </span>
                        <span className="text-[10px] line-through text-outline font-medium">
                          {formatINR(item.originalPrice * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

              {/* Mini Cross-Sell Strip (From Stitch Screen ba2bd68e7f96406c866dcd5d3a7a1e1f) */}
              <div
                className="p-3 bg-surface-container rounded-xl flex items-center justify-between gap-3 shadow-xs border border-surface-container-high"
                id="crossSellCard"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-lg bg-surface-container-lowest overflow-hidden shrink-0 relative shadow-xs">
                    <Image
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuCkS7yqJbq-jEkIPKDBNo8ePNeQm_dz27yKFkjHC6QykS9p0YgfRdpHPM6xsZpqXreQk7JkVaNI3-wHAYA11TAJltvxy8MBcIuWVCLVfjdEfM8wNJv6u7WDEwWwCIJyK9xnHLdZaMwOQTILpTWRmjZ_naBUq9NSFAVM6dAgkksbtKzIKeVznYs92oZDS_pyvRtu6Z4bIwaCh-28_Vhc1v49sjDcYY_d8pSlyCKRlV8"
                      alt="Handcrafted Tuscan Tan Kolhapuris"
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                        Pair With
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-on-surface truncate leading-tight">
                      Handcrafted Tuscan Tan Kolhapuris
                    </p>
                    <p className="text-xs font-bold text-primary mt-0.5 font-mono">+₹1,850</p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={hasKolhapuris}
                  onClick={handleAddKolhapuris}
                  className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 shadow-xs active:scale-95 ${
                    hasKolhapuris
                      ? 'bg-secondary text-on-secondary cursor-default'
                      : 'bg-primary text-on-primary hover:bg-primary-container'
                  }`}
                  id="addCrossSellBtn"
                >
                  {hasKolhapuris ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Added</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add</span>
                    </>
                  )}
                </button>
              </div>

              {/* Promo Code Badge / Applied Strip */}
              {couponApplied && subtotal >= 1499 ? (
                <div
                  className="flex items-center justify-between px-3.5 py-2.5 bg-secondary-fixed rounded-lg text-on-secondary-fixed text-xs font-medium border border-secondary-container/20 shadow-xs"
                  id="couponPill"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-secondary shrink-0" />
                    <div>
                      <span className="font-bold tracking-wide">VYNTRAFIRST</span>
                      <span className="text-on-secondary-fixed-variant ml-1 font-semibold">
                        (-{formatINR(couponDiscount)} 10% off applied)
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCouponApplied(false)}
                    className="text-on-secondary-fixed hover:text-error transition-colors p-0.5"
                    title="Remove coupon"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : isFirstOrder === false ? (
                <div className="flex items-center justify-between px-3.5 py-2 bg-surface-container-low rounded-lg border border-dashed border-outline-variant text-xs">
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <Tag className="h-3.5 w-3.5 text-outline" />
                    <span>VYNTRAFIRST is only valid on 1st orders</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between px-3.5 py-2 bg-surface-container-low rounded-lg border border-dashed border-secondary/40 text-xs">
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <Tag className="h-3.5 w-3.5 text-secondary" />
                    <span>
                      {subtotal >= 1499 ? (
                        <>Apply <strong>VYNTRAFIRST</strong> for 10% first order off</>
                      ) : (
                        <>Add ₹{1499 - subtotal} more to unlock <strong>VYNTRAFIRST</strong> (10% Off)</>
                      )}
                    </span>
                  </div>
                  {subtotal >= 1499 && (
                    <button
                      type="button"
                      onClick={() => setCouponApplied(true)}
                      className="font-bold text-primary hover:underline text-xs"
                    >
                      Apply
                    </button>
                  )}
                </div>
              )}

              {/* Trust Mini Banner */}
              <div className="p-3 bg-surface-container-lowest rounded-xl flex items-center justify-around text-center border border-surface-container/60 shadow-xs">
                <div className="flex flex-col items-center">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span className="text-[10px] font-medium text-on-surface-variant mt-0.5">
                    100% Authentic
                  </span>
                </div>
                <div className="w-px h-6 bg-surface-container-high" />
                <div className="flex flex-col items-center">
                  <Truck className="h-4 w-4 text-primary" />
                  <span className="text-[10px] font-medium text-on-surface-variant mt-0.5">
                    Express Dispatch
                  </span>
                </div>
                <div className="w-px h-6 bg-surface-container-high" />
                <div className="flex flex-col items-center">
                  <RotateCcw className="h-4 w-4 text-primary" />
                  <span className="text-[10px] font-medium text-on-surface-variant mt-0.5">
                    Instant Refund
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Bottom Fixed Drawer Footer */}
        {items.length > 0 && (
          <div className="p-6 bg-surface-container-lowest shadow-[0_-4px_16px_rgba(0,0,0,0.04)] flex flex-col gap-3 border-t border-surface-container/60 shrink-0">
            {/* Breakdown Summary */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-on-surface-variant">
                <span>Bag Total MRP</span>
                <span className="font-medium text-outline line-through font-mono" id="mrpTotalText">
                  {formatINR(totalMRP)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-secondary font-medium">
                <span>Marketplace Festive Savings</span>
                <span className="font-bold font-mono" id="savingsText">
                  - {formatINR(totalSavings)} ({savingsPercent}%)
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="font-headline font-bold text-sm text-on-surface">Subtotal to Pay</span>
                <span
                  className="font-headline font-extrabold text-lg text-primary font-mono"
                  id="subtotalDisplay"
                >
                  {formatINR(finalPayable)}
                </span>
              </div>
            </div>

            {/* Primary CTA Button */}
            <button
              type="button"
              disabled={redirecting}
              onClick={handleCheckout}
              className="w-full py-3 px-6 bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] border border-[#FCD200] font-bold text-sm rounded-md shadow-sm transition-all flex items-center justify-between active:scale-[0.99] group disabled:opacity-75"
            >
              <span>{redirecting ? 'REDIRECTING TO CHECKOUT...' : 'PROCEED TO BUY'}</span>
              <div className="flex items-center gap-1.5 font-mono font-bold">
                <span id="btnPayAmount">{formatINR(finalPayable)}</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* Secondary Actions & Guarantee */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <button
                type="button"
                onClick={handleDismiss}
                className="text-[#007185] hover:underline font-semibold flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Continue Shopping</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleDismiss();
                  router.push('/cart');
                }}
                className="text-[#565959] hover:text-[#007185] font-medium underline transition-colors"
              >
                View Detailed Cart
              </button>
            </div>

            <p className="text-[11px] text-center text-outline mt-1 font-medium flex items-center justify-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-secondary" />
              <span>Authentic GI Handlooms • Instant 7-Day Doorstep Returns</span>
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
