'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Lock,
  Truck,
  ArrowLeft,
  CheckCircle,
  CreditCard,
  MapPin,
  ChevronDown,
  ChevronUp,
  Tag,
  Info,
  Check,
  AlertCircle,
  Sparkles,
  Zap,
  ShoppingBag,
  RotateCcw,
  Smartphone,
  Building,
  QrCode,
  Award,
  PackageCheck,
  Package,
  Wallet,
} from 'lucide-react';
import { useCartStore } from '@/store/cart-store';
import { useAddressStore, Address as SavedAddress, PINCODE_DIRECTORY } from '@/store/address-store';
import { usePaymentVaultStore } from '@/store/payment-vault-store';
import { createClient } from '@/lib/supabase/client';
import { CartItem } from '@/types';
import { formatINR } from '@/lib/utils';

export default function CheckoutPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const {
    items,
    getSubtotal,
    getTotalSavings,
    getTotalItems,
    couponCode,
    isCouponApplied,
    removeCoupon,
    applyCoupon,
    syncWithDatabase,
  } = useCartStore();

  // Saved Addresses State from Central Store
  const {
    addresses: savedAddresses,
    selectedAddressId,
    setSelectedAddressId,
    addAddress,
    fetchAddresses,
  } = useAddressStore();
  const [addressDrawerOpen, setAddressDrawerOpen] = useState(false);
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [isFirstOrder, setIsFirstOrder] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkEligibility() {
      try {
        const res = await fetch('/api/coupons/validate');
        const json = await res.json();
        if (json.success && json.data) {
          setIsFirstOrder(json.data.isFirstOrder);
          if (!json.data.isFirstOrder && isCouponApplied) {
            removeCoupon();
          }
        }
      } catch (e) {}
    }
    checkEligibility();
  }, [isCouponApplied, removeCoupon]);

  // New Address Form State
  const [newAddressForm, setNewAddressForm] = useState({
    name: '',
    phone: '',
    pincode: '',
    city: '',
    state: '',
    flat: '',
    area: '',
    landmark: '',
    type: 'Home' as 'Home' | 'Work',
    isDefault: false,
  });

  // Delivery Speed: 'express' | 'standard'
  const [deliverySpeed, setDeliverySpeed] = useState<'express' | 'standard'>('express');

  // Payment Method: 'upi' | 'card' | 'netbanking' | 'cod'
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking' | 'cod'>('upi');

  // Vyntra Vault Central Store Integration
  const { savedCards, savedUpi, totalLiquidity: vaultBalance } = usePaymentVaultStore();
  const [useVaultBalance, setUseVaultBalance] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState(savedCards[0]?.id || '');

  // Payment Form Sub-states
  const [upiId, setUpiId] = useState('');
  const [upiVerified, setUpiVerified] = useState(false);
  const [cardCvv, setCardCvv] = useState('');
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newCardExpiry, setNewCardExpiry] = useState('');
  const [newCardCvv, setNewCardCvv] = useState('');
  const [selectedBank, setSelectedBank] = useState('HDFC');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');

  // Order Details Collapse Toggle
  const [showOrderDetails, setShowOrderDetails] = useState(true);

  // Razorpay Gateway & Order Submission States
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOrderPlaced, setIsOrderPlaced] = useState(false);
  const isOrderPlacedRef = React.useRef(false);

  // Toast State
  const [toast, setToast] = useState<{ show: boolean; message: string; type?: 'success' | 'error' | 'info' }>({
    show: false,
    message: '',
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3000);
  };

  useEffect(() => {
    setMounted(true);
    syncWithDatabase();
    fetchAddresses();

    try {
      const supabase = createClient();
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.user) {
          router.replace('/login?redirect=/checkout');
          return;
        }
        const u = session.user;
        const fullName = u.user_metadata?.full_name || u.email?.split('@')[0] || '';
        const phone = u.user_metadata?.phone || '';
        if (u.email) setUserEmail(u.email);
        if (phone) setUserPhone(phone);
        setNewAddressForm((prev) => ({
          ...prev,
          name: prev.name || fullName,
          phone: prev.phone || phone,
        }));
      });
    } catch (e) {}
  }, [syncWithDatabase, fetchAddresses]);

  // Multi-Seller / Multi-Vendor Shipment Grouping
  const sellerShipments = useMemo(() => {
    const groups: Record<
      string,
      {
        sellerName: string;
        items: CartItem[];
        itemCount: number;
        subtotal: number;
        dispatchCity: string;
        estimatedDelivery: string;
      }
    > = {};

    items.forEach((item) => {
      const seller = item.vendorName || item.brand || 'Vyntra Marketplace Collective';
      if (!groups[seller]) {
        const isExpressArtisan =
          seller.toLowerCase().includes('bhagalpur') ||
          seller.toLowerCase().includes('phulia') ||
          seller.toLowerCase().includes('jaipur');

        groups[seller] = {
          sellerName: seller,
          items: [],
          itemCount: 0,
          subtotal: 0,
          dispatchCity: isExpressArtisan ? 'Jaipur Atelier' : 'Bengaluru Hub',
          estimatedDelivery:
            deliverySpeed === 'express'
              ? 'Guaranteed Tomorrow by 2:00 PM'
              : 'Within 2 - 4 Business Days',
        };
      }
      groups[seller].items.push(item);
      groups[seller].itemCount += item.quantity;
      groups[seller].subtotal += item.price * item.quantity;
    });

    return Object.values(groups);
  }, [items, deliverySpeed]);

  // Selected Active Address
  const activeAddress: SavedAddress | undefined =
    savedAddresses.find((a) => a.id === selectedAddressId) ||
    savedAddresses.find((a) => a.isDefault) ||
    savedAddresses[0];

  // Dynamic Financial Calculations from Cart Store
  const totalItems = mounted ? getTotalItems() : 0;
  const subtotal = mounted ? getSubtotal() : 0;
  const rawSavings = mounted ? getTotalSavings() : 0;
  const totalMRP = subtotal + rawSavings;

  // Coupon Calculation (Only VYNTRAFIRST is active; requires min order value ₹1,499 & 1st order)
  const couponDiscount = useMemo(() => {
    if (!isCouponApplied || !couponCode) return 0;
    if (isFirstOrder === false) return 0;
    const code = couponCode.toUpperCase();
    if (code === 'VYNTRAFIRST') {
      if (subtotal < 1499) return 0;
      return Math.min(Math.round(subtotal * 0.1), 1000); // 10% capped at ₹1,000
    }
    return 0;
  }, [isCouponApplied, couponCode, subtotal, isFirstOrder]);
  const packagingFee = totalItems > 0 ? 49 : 0;
  const codFee = paymentMethod === 'cod' ? 49 : 0;
  const rawPayable = Math.max(0, subtotal - couponDiscount + packagingFee + codFee);
  const vaultDeduction = useVaultBalance ? Math.min(rawPayable, vaultBalance) : 0;
  const finalPayable = Math.max(0, rawPayable - vaultDeduction);
  const totalSavings = rawSavings + couponDiscount + vaultDeduction;

  const handlePincodeChangeInCheckout = async (pinVal: string) => {
    const clean = pinVal.replace(/\D/g, '');
    setNewAddressForm((prev) => ({ ...prev, pincode: clean }));

    if (clean.length === 6) {
      if (PINCODE_DIRECTORY[clean]) {
        const info = PINCODE_DIRECTORY[clean];
        setNewAddressForm((prev) => ({
          ...prev,
          city: info.city,
          state: info.state,
          area: prev.area || info.areaHint || '',
        }));
        showToast(`Detected location: ${info.city}, ${info.state}`, 'info');
        return;
      }

      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${clean}`);
        const data = await res.json();
        if (Array.isArray(data) && data[0]?.Status === 'Success' && Array.isArray(data[0]?.PostOffice) && data[0].PostOffice.length > 0) {
          const po = data[0].PostOffice[0];
          const detectedCity = po.District || po.Block || po.Circle || po.Name;
          const detectedState = po.State;
          const detectedArea = po.Name;
          setNewAddressForm((prev) => ({
            ...prev,
            city: detectedCity,
            state: detectedState,
            area: prev.area || detectedArea || '',
          }));
          showToast(`Detected location: ${detectedCity}, ${detectedState}`, 'info');
        }
      } catch (err) {
        console.warn('[Checkout Pincode Lookup]:', err);
      }
    }
  };

  // Add / Save Address Handler
  const handleAddNewAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddressForm.name || !newAddressForm.phone || !newAddressForm.pincode || !newAddressForm.flat || !newAddressForm.city || !newAddressForm.state) {
      showToast('Please fill all required address fields (*)', 'error');
      return;
    }

    try {
      const created = await addAddress({
        name: newAddressForm.name.trim(),
        phone: newAddressForm.phone.trim(),
        pincode: newAddressForm.pincode.trim(),
        flat: newAddressForm.flat.trim(),
        area: newAddressForm.area.trim(),
        landmark: newAddressForm.landmark.trim(),
        city: newAddressForm.city.trim(),
        state: newAddressForm.state.trim(),
        type: newAddressForm.type,
        isDefault: newAddressForm.isDefault || savedAddresses.length === 0,
        isVerified: true,
        deliveryHours: newAddressForm.type === 'Work' ? 'Weekdays 9:30 AM - 6:00 PM' : 'Open all days • 9:00 AM – 8:00 PM',
        doorstepInstructions: 'Leave with security desk if unavailable',
      });

      setSelectedAddressId(created.id);
      setIsAddingNewAddress(false);
      setAddressDrawerOpen(false);
      showToast('New delivery address saved and selected!', 'success');
    } catch (err) {
      showToast('Failed to save address. Please try again.', 'error');
    }
  };

  // UPI Verification Handler
  const handleVerifyUpi = () => {
    if (!upiId || !upiId.includes('@')) {
      showToast('Please enter a valid UPI ID (e.g. user@okaxis or success@razorpay)', 'error');
      return;
    }
    setUpiVerified(true);
    showToast(`UPI ID ${upiId} verified! Proceeding to payment...`, 'success');
    handlePlaceOrder();
  };

  // Real Checkout Execution for Phase 3 COD & Test Orders
  // Helper to load Razorpay Checkout script dynamically
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve(false);
      if ((window as any).Razorpay) return resolve(true);

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const executeCheckout = async (
    chosenMethod: 'COD' | 'UPI' | 'CARD' | 'NETBANKING' = 'COD',
    razorpayData?: {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    }
  ) => {
    // Prevent duplicate clicks/submissions
    if (isProcessing || isOrderPlacedRef.current) return;

    if (items.length === 0) {
      showToast('Your cart is empty. Please add items before checkout.', 'error');
      return;
    }

    if (!activeAddress) {
      showToast('Please add or select a delivery address before checkout.', 'error');
      setAddressDrawerOpen(true);
      setIsAddingNewAddress(true);
      return;
    }

    try {
      setIsProcessing(true);

      const shippingAddressPayload = {
        fullName: activeAddress.name,
        phone: activeAddress.phone,
        streetAddress: activeAddress.flat,
        locality: activeAddress.area || undefined,
        landmark: activeAddress.landmark || undefined,
        city: activeAddress.city,
        state: activeAddress.state,
        postalCode: activeAddress.pincode,
        addressType: (activeAddress.type === 'Work' ? 'WORK' : 'HOME') as 'HOME' | 'WORK' | 'OTHER',
      };

      const clientItems = items.map((i) => {
        const isUnstitched =
          i.title?.toLowerCase().includes('saree') ||
          i.title?.toLowerCase().includes('shawl') ||
          i.title?.toLowerCase().includes('dupatta');
        return {
          productId: i.productId,
          variantId: i.variantId?.startsWith('var-') ? undefined : i.variantId,
          sellerOfferId: i.sellerOfferId,
          offerVariantId: i.offerVariantId,
          quantity: i.quantity,
          size: isUnstitched ? 'Free Size' : (i.size || undefined),
          color: i.color || undefined,
        };
      });

      const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          paymentMethod: chosenMethod,
          addressId: activeAddress.id.startsWith('addr-') ? undefined : activeAddress.id,
          shippingAddress: shippingAddressPayload,
          couponCode: isCouponApplied ? couponCode : undefined,
          idempotencyKey,
          clientItems,
          razorpayOrderId: razorpayData?.razorpayOrderId,
          razorpayPaymentId: razorpayData?.razorpayPaymentId,
          razorpaySignature: razorpayData?.razorpaySignature,
        }),
      });

      const json = await res.json();

      if (json.success && json.data) {
        // Mark order as successfully placed BEFORE clearing cart to prevent "Your Bag is Empty" flash
        isOrderPlacedRef.current = true;
        setIsOrderPlaced(true);
        showToast('Order confirmed successfully!', 'success');

        // Clear local Zustand cart only after setting order success state
        await useCartStore.getState().clearCart();

        // Redirect directly to Order Confirmation page using router.replace
        const confirmationUrl = `/orders/confirmation?orderId=${encodeURIComponent(json.data.orderId)}&orderNumber=${encodeURIComponent(json.data.orderNumber)}`;
        router.replace(confirmationUrl);
      } else {
        const errorMsg = json.error?.message || 'Failed to place order. Please review your bag and try again.';
        showToast(errorMsg, 'error');
        // Refresh cart in case of out of stock or price changes
        syncWithDatabase();
      }
    } catch (err: any) {
      showToast('Network error during checkout. Please try again.', 'error');
    } finally {
      if (!isOrderPlacedRef.current) {
        setIsProcessing(false);
      }
    }
  };

  // Place Order / Razorpay Standard Web Checkout
  const handlePlaceOrder = async () => {
    if (isProcessing || isOrderPlacedRef.current) return;

    if (items.length === 0) {
      showToast('Your cart is empty. Please add items before checkout.', 'error');
      return;
    }

    if (!activeAddress) {
      showToast('Please add or select a delivery address before checkout.', 'error');
      setAddressDrawerOpen(true);
      setIsAddingNewAddress(true);
      return;
    }

    // 1. Cash on Delivery (COD) Flow
    if (paymentMethod === 'cod') {
      executeCheckout('COD');
      return;
    }

    // 2. Online Payment via Razorpay Standard Checkout
    try {
      setIsProcessing(true);
      showToast('Initializing secure Razorpay payment gateway...', 'info');

      // Ensure SDK script is ready
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded || !(window as any).Razorpay) {
        throw new Error('Could not load Razorpay payment window. Please check your internet connection.');
      }

      // Step 1: Create Razorpay Order via Backend API (Server authoritatively calculates amount)
      const chosenMethod: 'UPI' | 'CARD' | 'NETBANKING' =
        paymentMethod === 'upi' ? 'UPI' : paymentMethod === 'card' ? 'CARD' : 'NETBANKING';

      const clientItems = items.map((i) => {
        const isUnstitched =
          i.title?.toLowerCase().includes('saree') ||
          i.title?.toLowerCase().includes('shawl') ||
          i.title?.toLowerCase().includes('dupatta');
        return {
          productId: i.productId,
          variantId: i.variantId?.startsWith('var-') ? undefined : i.variantId,
          sellerOfferId: i.sellerOfferId,
          offerVariantId: i.offerVariantId,
          quantity: i.quantity,
          size: isUnstitched ? 'Free Size' : (i.size || undefined),
          color: i.color || undefined,
        };
      });

      const orderRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientItems,
          couponCode: isCouponApplied ? couponCode : undefined,
          notes: {
            customerName: activeAddress.name,
            customerPhone: activeAddress.phone,
            deliveryCity: activeAddress.city,
            pincode: activeAddress.pincode,
            method: chosenMethod,
          },
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.success || !orderData.order_id) {
        throw new Error(orderData.error || 'Failed to initialize payment gateway order.');
      }

      const razorpayKey =
        orderData.key_id ||
        process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

      if (!razorpayKey) {
        throw new Error('Razorpay public Key ID is missing from environment. Please configure NEXT_PUBLIC_RAZORPAY_KEY_ID.');
      }

      // Step 2: Open Official Razorpay Checkout Modal
      const rawPhone = activeAddress.phone || userPhone || '';
      const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);
      const customerEmail = userEmail || 'customer@vyntra.luxury';

      const prefillData: any = {
        name: activeAddress.name || 'Valued Patron',
        contact: cleanPhone ? cleanPhone : undefined,
        email: customerEmail,
      };

      if (chosenMethod === 'UPI') {
        prefillData.method = 'upi';
        if (upiId && upiId.trim()) {
          prefillData.vpa = upiId.trim();
        }
      } else if (chosenMethod === 'CARD') {
        prefillData.method = 'card';
      } else if (chosenMethod === 'NETBANKING') {
        prefillData.method = 'netbanking';
      }

      const options = {
        key: razorpayKey,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'VYNTRA',
        description: 'Luxury & Lifestyle Order Checkout',
        order_id: orderData.order_id,
        image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=128&q=80',
        prefill: prefillData,
        notes: {
          pincode: activeAddress.pincode,
          city: activeAddress.city,
          method: chosenMethod,
        },
        theme: {
          color: '#D4AF37', // Vyntra Gold theme
        },
        modal: {
          confirm_close: true,
          ondismiss: function () {
            showToast('Payment window closed. Your bag is preserved.', 'info');
            setIsProcessing(false);
          },
        },
        handler: async function (response: any) {
          try {
            setIsProcessing(true);
            showToast('Verifying digital payment signature...', 'info');

            // Step 3: Verify Payment Signature via Backend
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.error || 'Payment signature verification failed.');
            }

            // Step 4: Finalize verified order in Prisma database
            showToast('Payment confirmed! Finalizing your order...', 'success');
            await executeCheckout(chosenMethod, {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
          } catch (verifyErr: any) {
            console.error('[Verification / Checkout error]:', verifyErr);
            showToast(verifyErr.message || 'Error confirming verified payment. Please contact support.', 'error');
            setIsProcessing(false);
          }
        },
      };

      const razorpayInstance = new (window as any).Razorpay(options);

      razorpayInstance.on('payment.failed', function (failedResponse: any) {
        console.error('[Razorpay payment failed]:', failedResponse.error);
        const reason = failedResponse.error?.description || 'Payment was declined by bank or UPI app.';
        showToast(`Payment Failed: ${reason}`, 'error');
        setIsProcessing(false);
      });

      razorpayInstance.open();
    } catch (err: any) {
      console.error('[Razorpay checkout initiation error]:', err);
      showToast(err.message || 'Failed to open Razorpay payment gateway. Please try again.', 'error');
      setIsProcessing(false);
    }
  };

  // 1. Order Placed Transition State: Never show empty cart while redirecting to confirmation
  if (isOrderPlaced) {
    return (
      <div className="w-full bg-surface min-h-[calc(100vh-280px)] flex items-center justify-center py-16 px-4">
        <div className="max-w-md w-full bg-surface-container-lowest p-8 rounded-2xl shadow-sm text-center flex flex-col items-center gap-4 border border-surface-container animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center ring-8 ring-emerald-500/5 animate-pulse">
            <CheckCircle className="h-8 w-8 stroke-[2.2]" />
          </div>
          <h2 className="text-xl font-headline font-bold text-on-surface">Order Placed Successfully!</h2>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Finalizing your order and loading your verified confirmation details...
          </p>
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mt-2" />
        </div>
      </div>
    );
  }

  // 1.5 Pre-mount state (guards all client Zustand states from SSR hydration mismatches)
  if (!mounted) {
    return (
      <div className="w-full bg-surface min-h-[calc(100vh-280px)] flex items-center justify-center py-16 px-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-on-surface-variant font-medium">Preparing secure checkout...</p>
        </div>
      </div>
    );
  }

  // 2. Empty Cart View: ONLY if the user visits /checkout with zero items and NOT submitting an order
  if (items.length === 0 && !isProcessing && !isOrderPlaced) {
    return (
      <div className="w-full bg-surface min-h-[calc(100vh-280px)] flex items-center justify-center py-16 px-4">
        <div className="max-w-md w-full bg-surface-container-lowest p-8 rounded-2xl shadow-sm text-center flex flex-col items-center gap-4 border border-surface-container">
          <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-primary">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-headline font-bold text-on-surface">Your Bag is Empty</h2>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            There are no items to checkout. Add artisanal pieces from the marketplace to proceed.
          </p>
          <Link
            href="/products"
            className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-xs uppercase tracking-wider hover:bg-primary-container transition-colors shadow-md"
          >
            Explore Collections
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-surface min-h-screen text-on-surface antialiased py-6">
      {/* Checkout Sub-Header Strip */}
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 mb-6">
        <div className="flex items-center justify-between py-2 border-b border-surface-container">
          <Link
            href="/cart"
            className="text-xs font-medium text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Shopping Cart</span>
          </Link>

          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            <Lock className="h-4 w-4 text-primary" />
            <span>100% Secure Checkout</span>
          </div>
        </div>
      </div>

      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 font-body">
        {/* Top Progress Stepper */}
        <div className="w-full mb-8">
          <div className="bg-surface-container-lowest rounded-xl p-4 sm:p-6 shadow-sm border border-surface-container">
            <div className="relative flex items-center justify-between max-w-3xl mx-auto">
              <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-[#D5D9D9] z-0" />
              <div className="absolute left-6 w-2/3 top-1/2 -translate-y-1/2 h-0.5 bg-[#007185] z-0 transition-all duration-500" />

              {/* Step 1: Address (Completed) */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-[#007185] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  <Check className="h-4 w-4 stroke-[3]" />
                </div>
                <span className="text-xs font-semibold text-[#007185] mt-1.5 text-center">1. Address</span>
              </div>

              {/* Step 2: Delivery Speed (Completed) */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-[#007185] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  <Check className="h-4 w-4 stroke-[3]" />
                </div>
                <span className="text-xs font-semibold text-[#007185] mt-1.5 text-center">2. Delivery</span>
              </div>

              {/* Step 3: Payment (Active) */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-[#FF9900] text-[#0F1111] flex items-center justify-center font-bold text-xs ring-4 ring-[#FF9900]/20 shadow-sm">
                  <span>3</span>
                </div>
                <span className="text-xs font-bold text-[#0F1111] mt-1.5 text-center">3. Payment</span>
              </div>

              {/* Step 4: Confirmation */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-9 h-9 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center font-headline font-semibold text-sm">
                  <span>4</span>
                </div>
                <span className="text-xs font-medium text-on-surface-variant mt-2 text-center">4. Confirm</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* LEFT COLUMN: Steps Accordions & Forms (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* STEP 1: Delivery Address Selection & Management */}
            <section className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden transition-all border border-surface-container">
              <div className="p-5 sm:p-6 flex items-start justify-between gap-4">
                {activeAddress ? (
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="h-4 w-4 stroke-[2.5]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-headline font-bold text-base sm:text-lg text-on-surface">
                          Deliver to: {activeAddress.name}
                        </h2>
                        <span className="px-2 py-0.5 bg-primary-fixed text-on-primary-fixed text-[11px] font-semibold tracking-wider rounded uppercase">
                          {activeAddress.type}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-on-surface-variant mt-1.5 leading-relaxed">
                        {activeAddress.flat}{activeAddress.area ? `, ${activeAddress.area}` : ''}, {activeAddress.city}, {activeAddress.state} —{' '}
                        {activeAddress.pincode}
                      </p>
                      <p className="text-xs text-on-surface-variant/80 mt-1 flex items-center gap-1.5 flex-wrap">
                        {activeAddress.landmark && (
                          <>
                            <MapPin className="h-3.5 w-3.5 text-primary" />
                            <span>Landmark: {activeAddress.landmark}</span>
                            <span className="mx-1.5 opacity-40">|</span>
                          </>
                        )}
                        <span>Mobile: +91 {activeAddress.phone}</span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MapPin className="h-4 w-4 stroke-[2.5]" />
                    </div>
                    <div>
                      <h2 className="font-headline font-bold text-base sm:text-lg text-on-surface">
                        Select or Add Delivery Address
                      </h2>
                      <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
                        No delivery address selected. Please add an address to complete your order.
                      </p>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (!activeAddress && !addressDrawerOpen) {
                      setAddressDrawerOpen(true);
                      setIsAddingNewAddress(true);
                    } else {
                      setAddressDrawerOpen(!addressDrawerOpen);
                      setIsAddingNewAddress(false);
                    }
                  }}
                  className="px-3.5 py-1.5 bg-surface-container hover:bg-surface-container-high text-primary font-semibold text-xs rounded-lg transition-colors flex-shrink-0 flex items-center gap-1"
                >
                  <span>
                    {!activeAddress
                      ? '+ Add Address'
                      : addressDrawerOpen
                      ? 'Close'
                      : 'Change'}
                  </span>
                  {addressDrawerOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>

              {/* Address Drawer: List Saved Addresses + Add New */}
              {addressDrawerOpen && (
                <div className="bg-surface-container-low px-5 pb-6 pt-3 border-t border-surface-container animate-in fade-in">
                  {!isAddingNewAddress ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between pb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-primary">
                          Saved Delivery Addresses ({savedAddresses.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsAddingNewAddress(true)}
                          className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                        >
                          + Add New Address
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-2.5">
                        {savedAddresses.map((addr) => {
                          const isSelected = addr.id === selectedAddressId;
                          return (
                            <div
                              key={addr.id}
                              onClick={() => {
                                setSelectedAddressId(addr.id);
                                showToast(`Delivering to ${addr.name} (${addr.type})`, 'info');
                              }}
                              className={`p-3.5 rounded-xl cursor-pointer transition-all flex items-start justify-between border ${
                                isSelected
                                  ? 'bg-surface-container-lowest border-primary ring-1 ring-primary'
                                  : 'bg-surface-container-lowest/80 border-surface-container hover:bg-surface-container-lowest'
                              }`}
                            >
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-on-surface">{addr.name}</span>
                                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-surface-container font-semibold uppercase">
                                    {addr.type}
                                  </span>
                                  {addr.isDefault && (
                                    <span className="text-[10px] text-secondary font-bold">Default</span>
                                  )}
                                </div>
                                <p className="text-[11px] text-on-surface-variant">
                                  {addr.flat}, {addr.area}, {addr.city} — {addr.pincode}
                                </p>
                                <span className="text-[11px] text-on-surface-variant">Phone: +91 {addr.phone}</span>
                              </div>

                              <div
                                className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                                  isSelected
                                    ? 'bg-primary text-on-primary'
                                    : 'border border-surface-container-high'
                                }`}
                              >
                                {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setAddressDrawerOpen(false)}
                          className="px-4 py-2 bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] border border-[#FCD200] text-xs font-bold rounded-md shadow-sm transition-colors"
                        >
                          Confirm &amp; Proceed
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Add New Address Form */
                    <form onSubmit={handleAddNewAddress} className="flex flex-col gap-3">
                      <div className="flex items-center justify-between pb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-primary">
                          Add New Delivery Address
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsAddingNewAddress(false)}
                          className="text-xs text-on-surface-variant hover:text-on-surface"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-xs font-medium text-on-surface-variant mb-1">
                            Full Recipient Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={newAddressForm.name}
                            onChange={(e) => setNewAddressForm({ ...newAddressForm, name: e.target.value })}
                            className="w-full h-10 px-3 bg-surface-container-lowest text-xs rounded-lg text-on-surface outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-on-surface-variant mb-1">
                            10-Digit Mobile Number *
                          </label>
                          <input
                            type="tel"
                            required
                            maxLength={10}
                            value={newAddressForm.phone}
                            onChange={(e) =>
                              setNewAddressForm({
                                ...newAddressForm,
                                phone: e.target.value.replace(/\D/g, ''),
                              })
                            }
                            className="w-full h-10 px-3 bg-surface-container-lowest text-xs rounded-lg text-on-surface outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-on-surface-variant mb-1">
                            PIN Code *
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={6}
                            value={newAddressForm.pincode}
                            onChange={(e) => handlePincodeChangeInCheckout(e.target.value)}
                            className="w-full h-10 px-3 bg-surface-container-lowest text-xs rounded-lg text-on-surface outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-on-surface-variant mb-1">
                            City / Town *
                          </label>
                          <input
                            type="text"
                            required
                            value={newAddressForm.city}
                            onChange={(e) => setNewAddressForm({ ...newAddressForm, city: e.target.value })}
                            className="w-full h-10 px-3 bg-surface-container-lowest text-xs rounded-lg text-on-surface outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-on-surface-variant mb-1">
                            Flat, House no., Building, Apartment *
                          </label>
                          <input
                            type="text"
                            required
                            value={newAddressForm.flat}
                            onChange={(e) => setNewAddressForm({ ...newAddressForm, flat: e.target.value })}
                            className="w-full h-10 px-3 bg-surface-container-lowest text-xs rounded-lg text-on-surface outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-on-surface-variant mb-1">
                            Area, Street, Sector, Village
                          </label>
                          <input
                            type="text"
                            value={newAddressForm.area}
                            onChange={(e) => setNewAddressForm({ ...newAddressForm, area: e.target.value })}
                            className="w-full h-10 px-3 bg-surface-container-lowest text-xs rounded-lg text-on-surface outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        <div className="sm:col-span-2 flex items-center justify-between pt-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={newAddressForm.isDefault}
                              onChange={(e) =>
                                setNewAddressForm({ ...newAddressForm, isDefault: e.target.checked })
                              }
                              id="new-addr-default"
                              className="w-4 h-4 accent-primary rounded cursor-pointer"
                            />
                            <label
                              htmlFor="new-addr-default"
                              className="text-xs text-on-surface-variant cursor-pointer"
                            >
                              Make default address
                            </label>
                          </div>

                          <button
                            type="submit"
                            className="px-5 py-2 bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] border border-[#FCD200] text-xs font-bold rounded-md shadow-sm transition-colors"
                          >
                            Save &amp; Use Address
                          </button>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </section>

            {/* STEP 2: Delivery Speed & Seller-wise Shipments Grouping */}
            <section className="bg-surface-container-lowest rounded-xl shadow-sm p-5 sm:p-6 border border-surface-container">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-primary text-on-primary font-headline font-bold text-xs flex items-center justify-center">
                    2
                  </span>
                  <h2 className="font-headline font-bold text-base text-on-surface">Delivery Speed &amp; Packages</h2>
                </div>
                <span className="text-xs text-secondary font-bold bg-secondary-fixed/50 px-2.5 py-0.5 rounded-full">
                  {sellerShipments.length} Seller Shipment{sellerShipments.length > 1 ? 's' : ''}
                </span>
              </div>

              {/* Delivery Speed Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-5">
                <label
                  onClick={() => setDeliverySpeed('express')}
                  className={`relative flex flex-col p-4 rounded-xl cursor-pointer transition-all border ${
                    deliverySpeed === 'express'
                      ? 'bg-surface-container-low border-primary ring-1 ring-primary'
                      : 'bg-surface-container-lowest border-surface-container hover:bg-surface-container-low opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 bg-secondary-fixed text-on-secondary-fixed text-[10px] font-bold uppercase tracking-wider rounded">
                      Express Artisanal
                    </span>
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center ${
                        deliverySpeed === 'express'
                          ? 'bg-primary text-on-primary'
                          : 'border border-surface-container-high'
                      }`}
                    >
                      {deliverySpeed === 'express' && <Check className="h-3 w-3 stroke-[3]" />}
                    </span>
                  </div>

                  <span className="font-headline font-bold text-sm text-primary">
                    Guaranteed Tomorrow by 2 PM
                  </span>
                  <span className="text-xs text-on-surface-variant mt-1">
                    Dispatched with bespoke protective craft packaging.
                  </span>
                  <div className="mt-3 pt-2 text-xs font-semibold text-secondary-container flex items-center gap-1">
                    <Zap className="h-4 w-4" />
                    <span>FREE with Royal Prime</span>
                  </div>
                </label>

                <label
                  onClick={() => setDeliverySpeed('standard')}
                  className={`relative flex flex-col p-4 rounded-xl cursor-pointer transition-all border ${
                    deliverySpeed === 'standard'
                      ? 'bg-surface-container-low border-primary ring-1 ring-primary'
                      : 'bg-surface-container-lowest border-surface-container hover:bg-surface-container-low opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 bg-surface-container-high text-on-surface-variant text-[10px] font-semibold uppercase tracking-wider rounded">
                      Standard
                    </span>
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center ${
                        deliverySpeed === 'standard'
                          ? 'bg-primary text-on-primary'
                          : 'border border-surface-container-high'
                      }`}
                    >
                      {deliverySpeed === 'standard' && <Check className="h-3 w-3 stroke-[3]" />}
                    </span>
                  </div>

                  <span className="font-headline font-semibold text-sm text-on-surface">2 - 4 Business Days</span>
                  <span className="text-xs text-on-surface-variant mt-1">
                    Regular road courier with eco-friendly recycled carton.
                  </span>
                  <div className="mt-3 pt-2 text-xs font-semibold text-on-surface-variant">
                    <span>FREE Delivery</span>
                  </div>
                </label>
              </div>

              {/* Seller-wise Shipment Grouping Breakdown */}
              <div className="flex flex-col gap-3 pt-2 border-t border-surface-container">
                <span className="text-xs font-headline font-bold text-on-surface uppercase tracking-wider">
                  Shipment Grouping ({sellerShipments.length} Package{sellerShipments.length > 1 ? 's' : ''})
                </span>

                <div className="flex flex-col gap-2.5">
                  {sellerShipments.map((shipment, idx) => (
                    <div
                      key={shipment.sellerName}
                      className="p-3.5 rounded-xl bg-surface-container-low flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-surface-container/60"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-surface-container-highest text-primary flex items-center justify-center shrink-0 mt-0.5">
                          <Package className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-on-surface">
                              Package {idx + 1} of {sellerShipments.length}
                            </span>
                            <span suppressHydrationWarning className="text-[10px] px-1.5 py-0.2 rounded bg-surface-container text-primary font-semibold">
                              {shipment.itemCount} item{shipment.itemCount > 1 ? 's' : ''}
                            </span>
                          </div>
                          <span className="text-xs text-secondary font-semibold mt-0.5">
                            Dispatched by {shipment.sellerName}
                          </span>
                          <span className="text-[11px] text-on-surface-variant mt-0.5">
                            {shipment.estimatedDelivery} via Express Priority Logistics
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        {shipment.items.slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            className="relative w-10 h-12 rounded bg-surface-container overflow-hidden shrink-0 border border-surface-container"
                          >
                            <Image
                              src={item.image}
                              alt={item.title}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* STEP 3: Payment Method Selection */}
            <section className="bg-surface-container-lowest rounded-xl shadow-sm p-5 sm:p-6 border border-surface-container">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-primary text-on-primary font-headline font-bold text-xs flex items-center justify-center">
                    3
                  </span>
                  <h2 className="font-headline font-bold text-base text-on-surface">Payment Method</h2>
                </div>
                <span className="text-[11px] font-semibold text-secondary-container flex items-center gap-1">
                  <ShieldCheck className="h-4 w-4" />
                  <span>PCI-DSS Compliant</span>
                </span>
              </div>

              {/* Vyntra Vault Balance Toggle */}
              {vaultBalance > 0 && (
                <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-primary/10 via-primary-container/5 to-transparent border border-primary/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center shrink-0">
                      <Wallet className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-headline font-bold text-sm text-on-surface">
                          Apply Vyntra Vault Balance
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ffdcc3] text-[#2f1500]">
                          {formatINR(vaultBalance)} Available
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        Deduct up to {formatINR(Math.min(rawPayable, vaultBalance))} from your usable store credits &amp; bonuses.
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={useVaultBalance}
                      onChange={(e) => setUseVaultBalance(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                  </label>
                </div>
              )}

              {/* Payment Method Accordion */}
              <div className="flex flex-col gap-3">
                {/* 1. UPI Method */}
                <div
                  className={`rounded-xl overflow-hidden transition-all border ${
                    paymentMethod === 'upi'
                      ? 'bg-surface-container-low border-primary'
                      : 'bg-surface-container-lowest border-surface-container hover:bg-surface-container-low'
                  }`}
                >
                  <div
                    onClick={() => setPaymentMethod('upi')}
                    className="p-4 flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          paymentMethod === 'upi'
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-container-high'
                        }`}
                      >
                        {paymentMethod === 'upi' && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-headline font-bold text-sm text-on-surface">
                            UPI • Google Pay, PhonePe, Paytm, BHIM
                          </span>
                          <span className="px-2 py-0.5 bg-secondary-fixed text-on-secondary-fixed text-[10px] font-bold rounded">
                            Fastest
                          </span>
                        </div>
                        <span className="text-xs text-on-surface-variant mt-0.5">
                          Pay instantly via any UPI app with ₹0 extra fee
                        </span>
                      </div>
                    </div>
                    <Smartphone className="h-5 w-5 text-primary" />
                  </div>

                  {paymentMethod === 'upi' && (
                    <div className="px-4 pb-5 pt-1 animate-in fade-in">
                      <div className="bg-surface-container-lowest p-4 rounded-xl flex flex-col sm:flex-row items-center gap-4 justify-between border border-surface-container">
                        <div className="w-full sm:flex-1">
                          {savedUpi.length > 0 && (
                            <div className="mb-3.5 pb-3 border-b border-surface-container">
                              <span className="text-[11px] font-semibold text-on-surface-variant block mb-1.5">
                                Select from Saved Vyntra Vault UPI:
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {savedUpi.map((u) => (
                                  <button
                                    key={u.id}
                                    type="button"
                                    onClick={() => {
                                      setUpiId(u.vpa);
                                      setUpiVerified(true);
                                      showToast(`Selected saved UPI: ${u.vpa}`, 'info');
                                    }}
                                    className={`px-2.5 py-1 text-xs rounded-lg border flex items-center gap-1.5 transition-all ${
                                      upiId === u.vpa
                                        ? 'bg-primary text-on-primary border-primary shadow-sm'
                                        : 'bg-surface-container-low text-on-surface hover:bg-surface-container border-surface-container'
                                    }`}
                                  >
                                    <span className="font-bold text-[10px]">{u.app}</span>
                                    <span className="font-mono text-[11px]">{u.vpa}</span>
                                    {u.isDefault && (
                                      <span className="text-[9px] px-1 py-0.2 bg-secondary-fixed text-on-secondary-fixed rounded font-bold">
                                        Default
                                      </span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                            Enter Custom UPI ID / VPA
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={upiId}
                              onChange={(e) => {
                                setUpiId(e.target.value);
                                setUpiVerified(false);
                              }}
                              placeholder="e.g. mobile@upi or username@okaxis"
                              className="w-full h-10 px-3 bg-surface-container-low text-xs rounded-lg text-on-surface outline-none focus:ring-1 focus:ring-primary"
                            />
                            <button
                              type="button"
                              onClick={handleVerifyUpi}
                              className="h-10 px-4 bg-primary text-on-primary text-xs font-semibold rounded-lg hover:bg-primary-container transition-colors whitespace-nowrap"
                            >
                              {upiVerified ? 'Verified ✓' : 'Verify & Pay'}
                            </button>
                          </div>

                          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                            <span className="text-[11px] text-on-surface-variant">Popular UPI:</span>
                            {['@oksbi', '@okhdfcbank', '@ybl', '@paytm'].map((handle) => (
                              <button
                                key={handle}
                                type="button"
                                onClick={() => {
                                  setUpiId((prev) => (prev.includes('@') ? prev.split('@')[0] + handle : `user${handle}`));
                                  setUpiVerified(true);
                                }}
                                className="px-2 py-0.5 bg-surface-container text-primary font-medium text-[11px] rounded hover:bg-surface-container-high transition-colors"
                              >
                                {handle}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="hidden sm:flex flex-col items-center pl-4 border-l border-surface-container text-center">
                          <div className="w-20 h-20 bg-surface-container-high rounded-lg p-1.5 flex items-center justify-center shadow-inner">
                            <QrCode className="w-14 h-14 text-on-surface" />
                          </div>
                          <span className="text-[10px] text-on-surface-variant mt-1 font-medium">Scan QR &amp; Pay</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Credit & Debit Cards */}
                <div
                  className={`rounded-xl overflow-hidden transition-all border ${
                    paymentMethod === 'card'
                      ? 'bg-surface-container-low border-primary'
                      : 'bg-surface-container-lowest border-surface-container hover:bg-surface-container-low'
                  }`}
                >
                  <div
                    onClick={() => setPaymentMethod('card')}
                    className="p-4 flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          paymentMethod === 'card'
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-container-high'
                        }`}
                      >
                        {paymentMethod === 'card' && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <div>
                        <span className="font-headline font-semibold text-sm text-on-surface">
                          Credit / Debit Card
                        </span>
                        <p className="text-xs text-on-surface-variant">
                          Visa, Mastercard, RuPay, Diners &amp; Amex accepted
                        </p>
                      </div>
                    </div>
                    <CreditCard className="h-5 w-5 text-on-surface-variant" />
                  </div>

                  {paymentMethod === 'card' && (
                    <div className="px-4 pb-5 pt-1 animate-in fade-in">
                      <div className="bg-surface-container-low p-4 rounded-xl flex flex-col gap-3 border border-surface-container">
                        {savedCards.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-[11px] font-semibold text-on-surface-variant block">
                              Select from Saved RBI Tokenized Cards:
                            </span>
                            {savedCards.map((c) => (
                              <div
                                key={c.id}
                                className={`p-3 rounded-xl flex items-center justify-between border transition-all ${
                                  selectedCardId === c.id
                                    ? 'bg-surface-container-lowest border-primary shadow-sm'
                                    : 'bg-surface-container-lowest/70 border-surface-container hover:bg-surface-container-lowest'
                                }`}
                              >
                                <div
                                  className="flex items-center gap-2.5 cursor-pointer flex-1"
                                  onClick={() => setSelectedCardId(c.id)}
                                >
                                  <CreditCard className="h-5 w-5 text-primary" />
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-semibold text-on-surface">
                                        {c.bankName} {c.cardName} •••• {c.last4}
                                      </span>
                                      {c.isDefault && (
                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-secondary-fixed text-on-secondary-fixed font-bold">
                                          Default
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-on-surface-variant block">
                                      Exp {c.expiryMonth}/{c.expiryYear} • {c.tokenizedBadge}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="password"
                                    maxLength={3}
                                    placeholder="CVV"
                                    value={selectedCardId === c.id ? cardCvv : ''}
                                    onChange={(e) => {
                                      setSelectedCardId(c.id);
                                      setCardCvv(e.target.value.replace(/\D/g, ''));
                                    }}
                                    className="w-16 h-8 px-2 text-center text-xs bg-surface-container rounded outline-none font-mono"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedCardId(c.id);
                                      handlePlaceOrder();
                                    }}
                                    className="px-3 h-8 bg-primary text-on-primary text-xs font-semibold rounded hover:bg-primary-container"
                                  >
                                    Pay
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="text-center text-[11px] text-on-surface-variant uppercase font-semibold tracking-wider pt-2">
                          or enter one-time card details
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-on-surface-variant mb-1">
                              Card Number
                            </label>
                            <input
                              type="text"
                              maxLength={19}
                              value={newCardNumber}
                              onChange={(e) => setNewCardNumber(e.target.value)}
                              placeholder="xxxx xxxx xxxx xxxx"
                              className="w-full h-9 px-3 bg-surface-container-lowest text-xs rounded-lg outline-none border border-surface-container"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-on-surface-variant mb-1">
                              Valid Thru (MM/YY)
                            </label>
                            <input
                              type="text"
                              maxLength={5}
                              value={newCardExpiry}
                              onChange={(e) => setNewCardExpiry(e.target.value)}
                              placeholder="MM / YY"
                              className="w-full h-9 px-3 bg-surface-container-lowest text-xs rounded-lg outline-none border border-surface-container"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-on-surface-variant mb-1">
                              CVV
                            </label>
                            <input
                              type="password"
                              maxLength={4}
                              value={newCardCvv}
                              onChange={(e) => setNewCardCvv(e.target.value.replace(/\D/g, ''))}
                              placeholder="123"
                              className="w-full h-9 px-3 bg-surface-container-lowest text-xs rounded-lg outline-none border border-surface-container"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Net Banking */}
                <div
                  className={`rounded-xl overflow-hidden transition-all border ${
                    paymentMethod === 'netbanking'
                      ? 'bg-surface-container-low border-primary'
                      : 'bg-surface-container-lowest border-surface-container hover:bg-surface-container-low'
                  }`}
                >
                  <div
                    onClick={() => setPaymentMethod('netbanking')}
                    className="p-4 flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          paymentMethod === 'netbanking'
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-container-high'
                        }`}
                      >
                        {paymentMethod === 'netbanking' && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <div>
                        <span className="font-headline font-semibold text-sm text-on-surface">Net Banking</span>
                        <p className="text-xs text-on-surface-variant">All Indian public &amp; private banks available</p>
                      </div>
                    </div>
                    <Building className="h-5 w-5 text-on-surface-variant" />
                  </div>

                  {paymentMethod === 'netbanking' && (
                    <div className="px-4 pb-4 pt-1 animate-in fade-in">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        {['HDFC', 'ICICI', 'SBI', 'Axis', 'Kotak', 'PNB'].map((b) => (
                          <button
                            key={b}
                            type="button"
                            onClick={() => setSelectedBank(b)}
                            className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                              selectedBank === b
                                ? 'bg-primary text-on-primary border-primary'
                                : 'bg-surface-container-lowest text-on-surface border-surface-container hover:bg-surface-container'
                            }`}
                          >
                            {b} Bank
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Cash on Delivery (COD) */}
                <div
                  className={`rounded-xl overflow-hidden transition-all border ${
                    paymentMethod === 'cod'
                      ? 'bg-surface-container-low border-primary'
                      : 'bg-surface-container-lowest border-surface-container hover:bg-surface-container-low'
                  }`}
                >
                  <div
                    onClick={() => setPaymentMethod('cod')}
                    className="p-4 flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          paymentMethod === 'cod'
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-container-high'
                        }`}
                      >
                        {paymentMethod === 'cod' && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-headline font-semibold text-sm text-on-surface">
                            Cash on Delivery (COD)
                          </span>
                          <span className="px-2 py-0.5 bg-surface-container-high text-on-surface-variant text-[10px] font-semibold rounded">
                            ₹49 Verification Fee
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant">
                          Pay with cash or UPI scan at your doorstep upon receipt
                        </p>
                      </div>
                    </div>
                    <Zap className="h-5 w-5 text-on-surface-variant" />
                  </div>
                </div>
              </div>

              {/* Trust Badges Strip */}
              <div className="mt-6 pt-4 flex flex-wrap items-center justify-between gap-3 text-on-surface-variant text-[11px] border-t border-surface-container">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span>256-Bit Bank Encryption</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span>Verified by Visa &amp; Mastercard</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-secondary" />
                  <span>100% Genuine Handcrafted</span>
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: Order Summary & Pay Action Sticky Container (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-5 lg:sticky lg:top-20">
            {/* Order Review Bag Items with Multi-Seller Grouping */}
            <section className="bg-surface-container-lowest rounded-xl shadow-sm p-5 sm:p-6 border border-surface-container">
              <div className="flex items-center justify-between pb-3 border-b border-surface-container">
                <div className="flex items-center gap-2">
                  <span className="font-headline font-bold text-sm text-on-surface">Order Summary</span>
                  <span suppressHydrationWarning className="px-2 py-0.5 bg-surface-container text-primary font-bold text-xs rounded-full">
                    {totalItems} Items
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOrderDetails(!showOrderDetails)}
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5"
                >
                  <span>{showOrderDetails ? 'Hide details' : 'Show details'}</span>
                  {showOrderDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              </div>

              {/* Items Breakdown Grouped by Seller */}
              {showOrderDetails && (
                <div className="flex flex-col gap-4 pt-3 animate-in fade-in">
                  {sellerShipments.map((shipment) => (
                    <div key={shipment.sellerName} className="flex flex-col gap-2.5">
                      <div className="flex items-center justify-between text-[11px] text-on-surface-variant font-medium bg-surface-container/60 px-2.5 py-1 rounded-md">
                        <span className="font-bold text-primary truncate max-w-[200px]">
                          Seller: {shipment.sellerName}
                        </span>
                        <span className="font-mono text-secondary">
                          {shipment.itemCount} item{shipment.itemCount > 1 ? 's' : ''} ({formatINR(shipment.subtotal)})
                        </span>
                      </div>

                      <div className="flex flex-col gap-2 pl-1">
                        {shipment.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 p-2 bg-surface-container-low rounded-xl border border-surface-container/60"
                          >
                            <div className="relative w-14 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-surface-dim">
                              <Image
                                src={item.image}
                                alt={item.title}
                                fill
                                sizes="56px"
                                className="object-cover object-top"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-headline font-bold text-xs text-on-surface truncate">
                                {item.title}
                              </h3>
                              <p className="text-[11px] text-on-surface-variant mt-0.5">
                                {(() => {
                                  const isUnstitched =
                                    item.title?.toLowerCase().includes('saree') ||
                                    item.title?.toLowerCase().includes('shawl') ||
                                    item.title?.toLowerCase().includes('dupatta');
                                  const displaySize = isUnstitched ? 'Free Size' : item.size;
                                  return displaySize ? `Size: ${displaySize} • ` : '';
                                })()}
                                {item.color ? `Color: ${item.color} • ` : ''}
                                Qty: {item.quantity}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="font-semibold text-xs text-on-surface font-mono">
                                  {formatINR(item.price * item.quantity)}
                                </span>
                                <span className="text-[10px] text-on-surface-variant line-through font-mono">
                                  {formatINR(item.originalPrice * item.quantity)}
                                </span>
                                {item.originalPrice > item.price && (
                                  <span className="text-[10px] font-bold text-secondary">
                                    {Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)}% OFF
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Coupon Card */}
              {isCouponApplied && (
                <div className="mt-4 pt-3 border-t border-surface-container">
                  <div className="p-3 bg-secondary-fixed/50 rounded-xl flex items-center justify-between border border-secondary/20">
                    <div className="flex items-center gap-2">
                      <Tag className="h-5 w-5 text-secondary" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-headline font-bold text-xs text-on-surface uppercase">
                            {couponCode}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-secondary text-on-secondary rounded font-bold">
                            APPLIED
                          </span>
                        </div>
                        <span className="text-[11px] text-on-surface-variant">
                          Saved an extra {formatINR(couponDiscount)} on this order
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        removeCoupon();
                        showToast('Coupon removed', 'info');
                      }}
                      className="text-xs font-bold text-error hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}

              {/* Price Details Table */}
              <div className="mt-5 pt-4 space-y-2 text-xs border-t border-surface-container">
                <h4 className="font-headline font-bold text-xs text-on-surface uppercase tracking-wider mb-2">
                  Price Breakdown
                </h4>
                <div className="flex justify-between text-on-surface-variant">
                  <span>Total MRP ({totalItems} items)</span>
                  <span className="font-medium text-on-surface font-mono">{formatINR(totalMRP)}</span>
                </div>
                <div className="flex justify-between text-secondary">
                  <span>Store Retail Discount</span>
                  <span className="font-medium font-mono">- {formatINR(rawSavings)}</span>
                </div>
                {isCouponApplied && (
                  <div className="flex justify-between text-secondary">
                    <span>Coupon Discount ({couponCode})</span>
                    <span className="font-medium font-mono">- {formatINR(couponDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-on-surface-variant">
                  <span className="flex items-center gap-1">
                    <span>Standard Express Shipping</span>
                    <Info className="h-3 w-3 text-on-surface-variant" />
                  </span>
                  <span className="font-bold text-secondary uppercase">FREE</span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>Artisan Care &amp; Packaging</span>
                  <span className="font-medium text-on-surface font-mono">₹{packagingFee}</span>
                </div>
                {paymentMethod === 'cod' && (
                  <div className="flex justify-between text-on-surface-variant">
                    <span>Cash on Delivery Verification</span>
                    <span className="font-medium text-on-surface font-mono">₹49</span>
                  </div>
                )}
                {vaultDeduction > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span className="flex items-center gap-1">
                      <Wallet className="h-3.5 w-3.5" />
                      <span>Vyntra Vault Liquidity Applied</span>
                    </span>
                    <span className="font-mono">- {formatINR(vaultDeduction)}</span>
                  </div>
                )}

                <div className="pt-3 mt-3 border-t border-surface-container flex items-baseline justify-between">
                  <div>
                    <span className="font-headline font-bold text-base text-on-surface">Total Payable</span>
                    <p className="text-[11px] text-on-surface-variant">Inclusive of all GST &amp; taxes</p>
                  </div>
                  <div className="text-right">
                    <span className="font-headline font-extrabold text-2xl text-primary tracking-tight font-mono">
                      {formatINR(finalPayable)}
                    </span>
                    <p className="text-[11px] font-bold text-secondary">
                      You saved {formatINR(totalSavings)} in total
                    </p>
                  </div>
                </div>
              </div>

              {/* Master Place Order CTA Button */}
              <div className="mt-6">
                <button
                  type="button"
                  disabled={isProcessing || isOrderPlaced}
                  onClick={handlePlaceOrder}
                  className="w-full py-3.5 px-6 bg-[#FF9900] hover:bg-[#FA8900] text-[#0F1111] border border-[#FF8F00] rounded-md font-bold text-sm tracking-wide shadow-sm transition-all transform active:scale-[0.99] flex items-center justify-center gap-2.5 disabled:opacity-75 cursor-pointer"
                >
                  <Lock className="h-4 w-4" />
                  <span>
                    {isOrderPlaced
                      ? 'CONFIRMING ORDER...'
                      : isProcessing
                      ? 'PROCESSING ORDER...'
                      : `PLACE YOUR ORDER (${formatINR(finalPayable)})`}
                  </span>
                </button>
                <p className="text-[11px] text-center text-on-surface-variant mt-3 leading-relaxed">
                  By clicking place order, you agree to VYNTRA&apos;s{' '}
                  <Link href="/support" className="underline text-[#007185]">
                    Terms of Use
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="underline text-primary">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </div>
            </section>

            {/* Royal Assurance Guarantee Banner */}
            <div className="p-4 bg-surface-container rounded-xl flex items-center gap-3 border border-surface-container">
              <div className="w-10 h-10 rounded-full bg-primary-fixed text-primary flex items-center justify-center flex-shrink-0">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div className="text-xs">
                <span className="font-headline font-bold text-on-surface block">
                  15-Day Hassle-Free Returns &amp; Exchange
                </span>
                <span className="text-on-surface-variant">
                  Complimentary doorstep pickup if sizing doesn&apos;t fit like a dream.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Official Razorpay Standard Web Checkout Script */}
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      {/* Floating Micro-Toast */}
      {toast.show && (
        <div className="fixed top-20 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-on-primary shadow-xl text-xs font-semibold ${
              toast.type === 'error' ? 'bg-red-600' : toast.type === 'info' ? 'bg-blue-600' : 'bg-primary'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="h-4 w-4" />
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
