'use client';

import React, { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  User,
  Package,
  Truck,
  Heart,
  MapPin,
  CreditCard,
  Bell,
  Headphones,
  LogOut,
  Sparkles,
  ShieldCheck,
  CheckCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  ShoppingBag,
  Star,
  Plus,
  Trash2,
  Edit,
  Download,
  RotateCcw,
  Check,
  X,
  AlertCircle,
  Calendar,
  Phone,
  Mail,
  Award,
  Navigation,
} from 'lucide-react';
import { formatINR } from '@/lib/utils';
const TabLoadingSkeleton = () => (
  <div className="p-8 flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

const OrdersManagementView = dynamic(
  () => import('@/components/account/orders-management-view').then((mod) => mod.OrdersManagementView),
  { loading: TabLoadingSkeleton, ssr: false }
);
const SavedAddressesView = dynamic(
  () => import('@/components/account/saved-addresses-view').then((mod) => mod.SavedAddressesView),
  { loading: TabLoadingSkeleton, ssr: false }
);
const WishlistManagementView = dynamic(
  () => import('@/components/account/wishlist-management-view').then((mod) => mod.WishlistManagementView),
  { loading: TabLoadingSkeleton, ssr: false }
);
const ProfileSecurityView = dynamic(
  () => import('@/components/account/profile-security-view').then((mod) => mod.ProfileSecurityView),
  { loading: TabLoadingSkeleton, ssr: false }
);
const SavedPaymentsVaultView = dynamic(
  () => import('@/components/account/saved-payments-vault-view').then((mod) => mod.SavedPaymentsVaultView),
  { loading: TabLoadingSkeleton, ssr: false }
);
const HelpSupportView = dynamic(
  () => import('@/components/account/help-support-view').then((mod) => mod.HelpSupportView),
  { loading: TabLoadingSkeleton, ssr: false }
);
const OrderTrackingView = dynamic(
  () => import('@/components/orders/order-tracking-view').then((mod) => mod.OrderTrackingView),
  { loading: TabLoadingSkeleton, ssr: false }
);
const CustomerReviewsView = dynamic(
  () => import('@/components/account/customer-reviews-view').then((mod) => mod.CustomerReviewsView),
  { loading: TabLoadingSkeleton, ssr: false }
);
const CustomerReturnsView = dynamic(
  () => import('@/components/account/customer-returns-view').then((mod) => mod.CustomerReturnsView),
  { loading: TabLoadingSkeleton, ssr: false }
);
import { createClient } from '@/lib/supabase/client';
import { useAddressStore } from '@/store/address-store';
import { useWishlistStore } from '@/store/wishlist-store';
import { usePaymentVaultStore } from '@/store/payment-vault-store';
import { useUserProfileStore } from '@/store/user-profile-store';
import { useOrderStore } from '@/store/order-store';

type AccountTab =
  | 'overview'
  | 'orders'
  | 'tracking'
  | 'reviews'
  | 'returns'
  | 'wishlist'
  | 'addresses'
  | 'payments'
  | 'notifications'
  | 'support'
  | 'profile';

const PAST_ORDERS: any[] = [];

const SAVED_ADDRESSES: any[] = [];

function AccountDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as AccountTab) || 'overview';
  const [activeTab, setActiveTab] = useState<AccountTab>(initialTab);

  const [mounted, setMounted] = useState(false);

  const { addresses: storeAddresses, getDefaultAddress, fetchAddresses } = useAddressStore();
  const { items: wishlistStoreItems } = useWishlistStore();
  const { totalLiquidity: vaultBalance } = usePaymentVaultStore();
  const { orders: userOrders, totalCount: totalOrderCount, fetchOrders: fetchUserOrders } = useOrderStore();
  const profileStore = useUserProfileStore();

  useEffect(() => {
    setMounted(true);
    fetchAddresses();
    fetchUserOrders();
  }, [fetchAddresses, fetchUserOrders]);

  const activeTransitOrders = userOrders.filter(
    (o) =>
      o.status !== 'delivered' &&
      o.status !== 'cancelled' &&
      (o.status === 'processing' || o.status === 'shipped' || o.status === 'out_for_delivery')
  );
  const totalOrderSpend = userOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const activeTransitOrder = activeTransitOrders[0];
  const latestUserOrder = userOrders[0];

  const defaultAddr = getDefaultAddress();
  const defaultAddressLabel = mounted && defaultAddr
    ? `${defaultAddr.city} (${defaultAddr.pincode})`
    : 'Delivery Address';

  // User details state (persisted or default)
  const [isProfileReady, setIsProfileReady] = useState(false);
  const [user, setUser] = useState({
    name: '',
    email: '',
    phone: '',
    tier: 'Royal Member',
    memberSince: 'October 2023',
    points: 2400,
    walletBalance: 1450,
  });

  const displayName = user.name || (mounted && profileStore.fullName && profileStore.fullName !== 'Patron' ? profileStore.fullName : '') || 'Patron';
  const displayEmail = user.email || (mounted && profileStore.email && !profileStore.email.includes('patron@vyntra') ? profileStore.email : '') || 'patron@vyntra.luxury';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'VP';

  // Modal / Drawer state
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [orderSummaryModalOpen, setOrderSummaryModalOpen] = useState(false);
  const [tierBenefitsModalOpen, setTierBenefitsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // Wishlist state

  // Toast state
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'info' | 'error' }>({
    show: false,
    message: '',
    type: 'info',
  });

  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3200);
  };

  // Synchronize authenticated Supabase session on mount
  useEffect(() => {
    try {
      const supabase = createClient();
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session?.user) {
          const authUser = session.user;
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (session.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
          }

          // Trigger server synchronization to public.User
          try {
            const res = await fetch('/api/auth/sync', {
              method: 'POST',
              headers,
              credentials: 'include',
              body: JSON.stringify({
                name: authUser.user_metadata?.full_name,
                phone: authUser.user_metadata?.phone,
              }),
            });
            const result = await res.json();
            if (result.success && result.data?.user) {
              const u = result.data.user;
              setUser((prev) => ({
                ...prev,
                name: u.name || prev.name,
                email: u.email || prev.email,
                phone: u.phone || prev.phone,
                tier: u.tier || prev.tier,
              }));
              useUserProfileStore.getState().updateProfile({
                fullName: u.name,
                email: u.email,
                phone: u.phone,
              });
              setIsProfileReady(true);
              return;
            }
          } catch (syncErr) {
            console.warn('[Account Sync Error]:', syncErr);
          }

          // Fallback user metadata if API is pending
          const fallbackName = authUser.user_metadata?.full_name || authUser.email?.split('@')[0];
          setUser((prev) => ({
            ...prev,
            name: fallbackName || prev.name,
            email: authUser.email || prev.email,
            phone: authUser.user_metadata?.phone || prev.phone,
          }));
          setIsProfileReady(true);
        } else {
          setIsProfileReady(true);
          // Check local storage fallback for unauthenticated preview
          try {
            const stored = localStorage.getItem('vyntra-user');
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed.name) {
                setUser((prev) => ({
                  ...prev,
                  name: parsed.name,
                  phone: parsed.phone || prev.phone,
                  email: parsed.email || prev.email,
                }));
              }
            }
          } catch {
            // Storage ignore
          }
        }
      });
    } catch {
      // Offline fallback
    }
  }, []);

  // Sync tab with search param
  useEffect(() => {
    const tabParam = searchParams.get('tab') as AccountTab;
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Switch tab and update URL shallowly
  const handleTabChange = (tab: AccountTab, targetOrderId?: string) => {
    setActiveTab(tab);
    if (tab === 'tracking' && targetOrderId) {
      router.replace(`/account?tab=tracking&orderId=${encodeURIComponent(targetOrderId)}`, { scroll: false });
    } else {
      router.replace(`/account?tab=${tab}`, { scroll: false });
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Sign out error:', e);
    }
    showNotification('Logged out successfully. Returning to login...', 'info');
    setTimeout(() => {
      router.push('/login?redirect=/account');
      router.refresh();
    }, 600);
  };

  return (
    <div className="w-full bg-surface min-h-screen text-on-surface antialiased py-6 sm:py-8">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Header */}
        <div className="flex items-center gap-2 text-xs text-on-surface-variant font-medium mb-6">
          <Link href="/" className="hover:text-primary transition-colors">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-outline-variant" />
          <span className="text-on-surface font-semibold">My Account</span>
          {activeTab !== 'overview' && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-outline-variant" />
              <span className="text-primary font-bold capitalize">{activeTab}</span>
            </>
          )}
        </div>

        {/* Dashboard 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ========================================================= */}
          {/* LEFT SIDEBAR: Account Navigation (3.5 cols on desktop) */}
          {/* ========================================================= */}
          <aside className="lg:col-span-3 lg:sticky lg:top-36 bg-surface-container-lowest rounded-2xl shadow-sm border border-surface-container p-5 flex flex-col justify-between gap-6">
            <div className="flex flex-col gap-6">
              {/* User Mini Profile Header */}
              <div className="flex items-center gap-3.5 pb-5 border-b border-surface-container">
                <div className="w-12 h-12 rounded-full bg-primary-container text-white flex items-center justify-center font-headline font-bold text-base shadow-sm shrink-0">
                  {initials}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-on-surface truncate leading-snug">
                    {displayName}
                  </span>
                  <span className="text-xs text-on-surface-variant truncate">
                    {displayEmail}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-secondary-container mt-0.5">
                    <Sparkles className="h-3 w-3" />
                    {user.tier}
                  </span>
                </div>
              </div>

              {/* Group 1: Account Central */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-outline block mb-2 px-2">
                  Account Central
                </span>
                <nav className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => handleTabChange('overview')}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left w-full ${
                      activeTab === 'overview'
                        ? 'bg-primary-container text-white shadow-sm'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                    }`}
                  >
                    <User className="h-4 w-4 shrink-0" />
                    <span>Dashboard Overview</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTabChange('profile')}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left w-full ${
                      activeTab === 'profile'
                        ? 'bg-primary-container text-white shadow-sm'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                    }`}
                  >
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    <span>Profile &amp; Security</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTabChange('orders')}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left w-full ${
                      activeTab === 'orders'
                        ? 'bg-primary-container text-white shadow-sm'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Package className="h-4 w-4 shrink-0" />
                      <span>My Orders</span>
                    </div>
                    <span
                      suppressHydrationWarning
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        activeTab === 'orders'
                          ? 'bg-white/20 text-white'
                          : 'bg-surface-container text-primary'
                      }`}
                    >
                      {mounted ? totalOrderCount : 0}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTabChange('tracking')}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left w-full ${
                      activeTab === 'tracking'
                        ? 'bg-primary-container text-white shadow-sm'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Truck className="h-4 w-4 shrink-0" />
                      <span>Order Tracking</span>
                    </div>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        activeTab === 'tracking'
                          ? 'bg-secondary-container animate-pulse'
                          : 'bg-secondary-container/60'
                      }`}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTabChange('wishlist')}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left w-full ${
                      activeTab === 'wishlist'
                        ? 'bg-primary-container text-white shadow-sm'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Heart className="h-4 w-4 shrink-0" />
                      <span>Wishlist</span>
                    </div>
                    <span
                      suppressHydrationWarning
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        activeTab === 'wishlist'
                          ? 'bg-white/20 text-white'
                          : 'bg-surface-container text-primary'
                      }`}
                    >
                      {mounted ? wishlistStoreItems.length : 4}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTabChange('reviews')}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left w-full ${
                      activeTab === 'reviews'
                        ? 'bg-primary-container text-white shadow-sm'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Star className="h-4 w-4 shrink-0" />
                      <span>My Reviews</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTabChange('returns')}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left w-full ${
                      activeTab === 'returns'
                        ? 'bg-primary-container text-white shadow-sm'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <RotateCcw className="h-4 w-4 shrink-0" />
                      <span>Returns &amp; Refunds</span>
                    </div>
                  </button>
                </nav>
              </div>

              {/* Group 2: Preferences & Records */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-outline block mb-2 px-2">
                  Preferences &amp; Records
                </span>
                <nav className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => handleTabChange('addresses')}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left w-full ${
                      activeTab === 'addresses'
                        ? 'bg-primary-container text-white shadow-sm'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                    }`}
                  >
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>Saved Addresses</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTabChange('payments')}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left w-full ${
                      activeTab === 'payments'
                        ? 'bg-primary-container text-white shadow-sm'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-4 w-4 shrink-0" />
                      <span>Saved Payments</span>
                    </div>
                    <span suppressHydrationWarning className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                      {mounted ? formatINR(vaultBalance) : '₹1,450.00'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTabChange('notifications')}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left w-full ${
                      activeTab === 'notifications'
                        ? 'bg-primary-container text-white shadow-sm'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                    }`}
                  >
                    <Bell className="h-4 w-4 shrink-0" />
                    <span>Notifications</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTabChange('support')}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left w-full ${
                      activeTab === 'support'
                        ? 'bg-primary-container text-white shadow-sm'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                    }`}
                  >
                    <Headphones className="h-4 w-4 shrink-0" />
                    <span>Help &amp; Support</span>
                  </button>
                </nav>
              </div>
            </div>

            {/* Logout Action */}
            <div className="pt-4 border-t border-surface-container">
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all text-left w-full"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span>Logout Session</span>
              </button>
            </div>
          </aside>

          {/* ========================================================= */}
          {/* MAIN CONTENT AREA (9 cols on desktop) */}
          {/* ========================================================= */}
          <main className="lg:col-span-9 flex flex-col gap-8">
            {/* ------------------------------------------------------- */}
            {/* 1. OVERVIEW TAB (Default Stitch Screen View) */}
            {/* ------------------------------------------------------- */}
            {activeTab === 'overview' && (
              <>
                {/* Hero Welcome Banner & Tier Badge */}
                <section className="relative overflow-hidden rounded-2xl bg-surface-container-low p-6 lg:p-8 shadow-sm border border-surface-container">
                  <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-gradient-to-br from-secondary-container/20 to-primary/20 blur-3xl pointer-events-none" />

                  <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container text-white text-[11px] font-headline font-bold uppercase tracking-wider shadow-sm">
                          <Sparkles className="h-3.5 w-3.5" />
                          {user.tier}
                        </span>
                        <span className="text-xs text-on-surface-variant font-medium">
                          Patron since {user.memberSince}
                        </span>
                        <span className="text-xs text-outline">•</span>
                        <span className="inline-flex items-center text-xs font-semibold text-secondary-container gap-1">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Priority Concierge Active
                        </span>
                      </div>

                      <h1 className="font-headline font-extrabold text-2xl sm:text-3xl lg:text-4xl text-on-surface tracking-tight">
                        {displayName && displayName !== 'Patron' ? `Welcome back, ${displayName}!` : 'Welcome back to Vyntra!'}
                      </h1>
                      <p className="text-xs sm:text-sm text-on-surface-variant max-w-2xl leading-relaxed">
                        Explore your curated luxury updates, ongoing shipments, and early festive access privileges tailored to your bespoke wardrobe.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
                      <button
                        type="button"
                        onClick={() => setTierBenefitsModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-[#0F1111] text-xs font-bold shadow-sm hover:bg-[#F7FAFA] transition-all border border-[#D5D9D9]"
                      >
                        <Award className="h-4 w-4 text-[#007185]" />
                        <span>Tier Benefits</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => showNotification('Claimed 2x Festive Points! 500 bonus coins credited.', 'success')}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FF9900] hover:bg-[#FA8900] text-[#0F1111] text-xs font-bold shadow-sm border border-[#FF8F00] transition-all"
                      >
                        <Sparkles className="h-4 w-4 text-[#0F1111]" />
                        <span>Claim 2x Festive Points</span>
                      </button>
                    </div>
                  </div>
                </section>

                {/* Profile Completion Section */}
                <section className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm border border-surface-container">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <ShieldCheck className="h-5 w-5 text-[#007185]" />
                          <span className="font-headline font-bold text-sm sm:text-base text-on-surface">
                            Profile Strength: 85% Completed
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-[#007185]">
                          2 steps left to unlock 500 bonus coins
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-[#EAEDED] h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#007185] h-full rounded-full transition-all duration-700 ease-out"
                          style={{ width: '85%' }}
                        />
                      </div>

                      {/* Remaining Steps Chips */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleTabChange('profile')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container text-xs font-medium text-on-surface hover:bg-surface-container-high transition-colors"
                        >
                          <Phone className="h-3.5 w-3.5 text-secondary-container" />
                          <span>Add Alternate Phone</span>
                          <span className="text-secondary-container font-bold">(+5%)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTabChange('profile')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container text-xs font-medium text-on-surface hover:bg-surface-container-high transition-colors"
                        >
                          <Calendar className="h-3.5 w-3.5 text-secondary-container" />
                          <span>Save Birthday for Special Perks</span>
                          <span className="text-secondary-container font-bold">(+10%)</span>
                        </button>
                        <span className="text-[11px] text-on-surface-variant flex items-center gap-1 pl-1">
                          <CheckCircle className="h-3.5 w-3.5 text-[#067D62]" />
                          Email Verified &amp; Address Linked
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleTabChange('profile')}
                        className="w-full lg:w-auto px-5 py-2 rounded-lg bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] text-xs font-bold border border-[#FCD200] transition-all shadow-sm flex items-center justify-center gap-2 whitespace-nowrap"
                      >
                        <span>Complete Now</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </section>

                {/* Quick Stats Grid (4 Metric Cards) */}
                <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {/* Stat 1: Total Orders */}
                  <div className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm border border-surface-container hover:shadow-md transition-all flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <div className="w-11 h-11 rounded-xl bg-surface-container-high text-primary flex items-center justify-center">
                        <Package className="h-5 w-5" />
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wider">
                        {mounted && activeTransitOrders.length > 0
                          ? `${activeTransitOrders.length} In Transit`
                          : 'All Caught Up'}
                      </span>
                    </div>
                    <div className="mt-4">
                      <div suppressHydrationWarning className="font-headline font-extrabold text-2xl text-on-surface">
                        {mounted ? `${totalOrderCount} ${totalOrderCount === 1 ? 'Order' : 'Orders'}` : '0 Orders'}
                      </div>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        Lifetime verified purchases
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-surface-container flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleTabChange('orders')}
                        className="text-xs font-headline font-bold text-primary hover:underline inline-flex items-center gap-1 transition-colors"
                      >
                        View History
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                      <span suppressHydrationWarning className="text-[11px] text-outline">
                        {mounted ? formatINR(totalOrderSpend) : '₹0'} spent
                      </span>
                    </div>
                  </div>

                  {/* Stat 2: Wishlist */}
                  <div className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm border border-surface-container hover:shadow-md transition-all flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <div className="w-11 h-11 rounded-xl bg-secondary-fixed/50 text-secondary-container flex items-center justify-center">
                        <Heart className="h-5 w-5 fill-secondary-container" />
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-container/10 text-secondary-container text-[11px] font-bold uppercase tracking-wider">
                        Festive Deal
                      </span>
                    </div>
                    <div className="mt-4">
                      <div suppressHydrationWarning className="font-headline font-extrabold text-2xl text-on-surface">
                        {mounted ? wishlistStoreItems.length : 0} Items
                      </div>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        2 on limited festive price drop
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-surface-container flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleTabChange('wishlist')}
                        className="text-xs font-headline font-bold text-primary hover:underline inline-flex items-center gap-1 transition-colors"
                      >
                        Explore Items
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                      <span className="text-[11px] text-secondary-container font-semibold">
                        Save up to 45%
                      </span>
                    </div>
                  </div>

                  {/* Stat 3: Saved Addresses */}
                  <div className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm border border-surface-container hover:shadow-md transition-all flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <div className="w-11 h-11 rounded-xl bg-surface-container-high text-primary flex items-center justify-center">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[11px] font-semibold">
                        Primary Active
                      </span>
                    </div>
                    <div className="mt-4">
                      <div suppressHydrationWarning className="font-headline font-extrabold text-2xl text-on-surface">
                        {mounted ? `${storeAddresses.length} ${storeAddresses.length === 1 ? 'Address' : 'Addresses'}` : 'Delivery Hub'}
                      </div>
                      <p
                        suppressHydrationWarning
                        className="text-xs text-on-surface-variant mt-0.5 truncate"
                        title={mounted && defaultAddr ? `Default: ${defaultAddressLabel}` : 'Delivery Address'}
                      >
                        {mounted && defaultAddr ? `Default: ${defaultAddressLabel}` : 'Delivery Address'}
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-surface-container flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleTabChange('addresses')}
                        className="text-xs font-headline font-bold text-primary hover:underline inline-flex items-center gap-1 transition-colors"
                      >
                        Manage
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                      <span suppressHydrationWarning className="text-[11px] text-outline">
                        {mounted && defaultAddr ? `PIN ${defaultAddr.pincode}` : 'Pan-India'}
                      </span>
                    </div>
                  </div>

                  {/* Stat 4: Rewards & Wallet */}
                  <div className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm border border-surface-container hover:shadow-md transition-all flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-fixed/50 text-secondary-container text-[11px] font-bold uppercase tracking-wider">
                        {user.points} Coins
                      </span>
                    </div>
                    <div className="mt-4">
                      <div className="font-headline font-extrabold text-2xl text-on-surface">
                        {formatINR(user.walletBalance)} Balance
                      </div>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        Auto-applies at checkout
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-surface-container flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleTabChange('payments')}
                        className="text-xs font-headline font-bold text-secondary-container hover:underline inline-flex items-center gap-1 transition-colors"
                      >
                        Redeem
                        <Sparkles className="h-3.5 w-3.5" />
                      </button>
                      <span className="text-[11px] text-on-surface-variant">100 Coins = ₹60</span>
                    </div>
                  </div>
                </section>

                {/* Active Order In-Transit Card (Shown only while order is active & NOT delivered) */}
                {mounted && activeTransitOrder ? (
                  <section className="rounded-xl bg-white p-6 lg:p-7 shadow-sm border border-[#D5D9D9] overflow-hidden">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 -mx-6 lg:-mx-7 -mt-6 lg:-mt-7 p-5 lg:p-6 bg-[#131921] text-white border-b border-[#232F3E]">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#232F3E] text-[#FFD814] border border-[#FFD814]/30 text-xs font-bold tracking-wide">
                          <Truck className="h-3.5 w-3.5 text-[#FF9900]" />
                          ACTIVE SHIPMENT
                        </span>
                        <span className="font-bold text-sm text-[#FFD814]">
                          Order #{activeTransitOrder.orderNumber || activeTransitOrder.id}
                        </span>
                        <span className="text-xs text-white/30">•</span>
                        <span className="text-xs text-[#CCCCCC]">
                          Placed on {activeTransitOrder.datePlaced}
                        </span>
                      </div>

                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#232F3E] text-xs font-semibold text-white border border-[#FF9900]/40">
                        <span className="w-2 h-2 rounded-full bg-[#FF9900] animate-ping" />
                        <span className="text-[#FFD814]">
                          {activeTransitOrder.statusLabel || (activeTransitOrder.status === 'shipped' ? 'In Transit to Doorstep' : 'Being Prepared by Artisan')}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                      {/* Thumbnail & Product Details */}
                      <div className="lg:col-span-5 flex gap-4 items-center">
                        <div className="w-24 h-28 rounded-xl overflow-hidden bg-surface-container flex-shrink-0 relative shadow-sm border border-surface-container">
                          <Image
                            src={activeTransitOrder.items[0]?.image || 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80'}
                            alt={activeTransitOrder.items[0]?.title || 'Artisanal Product'}
                            fill
                            className="object-cover"
                          />
                          <span className="absolute bottom-1 right-1 bg-on-surface/80 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                            Qty {activeTransitOrder.items[0]?.quantity || 1}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-headline font-bold uppercase tracking-wider bg-surface-container-high text-primary px-2 py-0.5 rounded">
                              {activeTransitOrder.items[0]?.brand || 'Vyntra Collective'}
                            </span>
                            <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                              Seller: {activeTransitOrder.items[0]?.sellerName || (activeTransitOrder.items[0] as any)?.vendorName || 'Vyntra Royal Atelier'}
                            </span>
                          </div>
                          <h2 className="font-headline font-bold text-sm sm:text-base text-on-surface leading-snug">
                            {activeTransitOrder.items[0]?.title || 'Artisanal Luxury Piece'}
                          </h2>
                          <div className="flex items-center gap-2 text-xs text-on-surface-variant pt-0.5">
                            <span>
                              Size: <strong>{activeTransitOrder.items[0]?.size || (activeTransitOrder.items[0] as any)?.selectedSize || 'N/A'}</strong>
                            </span>
                            <span>•</span>
                            <span>
                              Color: <strong>{activeTransitOrder.items[0]?.color || (activeTransitOrder.items[0] as any)?.selectedColor || 'N/A'}</strong>
                            </span>
                          </div>
                          <div className="pt-1.5 flex flex-col gap-0.5">
                            <div className="text-sm font-bold text-on-surface">
                              Item Price:{' '}
                              <span className="text-primary font-bold">
                                {formatINR(Number(activeTransitOrder.items[0]?.price ?? (activeTransitOrder.items[0] as any)?.unitPrice ?? 0))}
                              </span>
                            </div>
                            <div className="text-xs text-on-surface-variant">
                              Order Total: <strong className="text-on-surface">{formatINR(Number(activeTransitOrder.totalAmount))}</strong>{' '}
                              <span className="text-[10px] text-outline">(incl. packaging &amp; COD fees)</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Live Logistics Timeline Visual */}
                      <div className="lg:col-span-7 flex flex-col justify-between gap-6">
                        <div className="bg-surface-container-low rounded-xl p-4 border border-surface-container">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-xs mb-3">
                            <span className="font-semibold text-primary flex items-center gap-1.5">
                              <Navigation className="h-4 w-4" />
                              {activeTransitOrder.status === 'shipped'
                                ? `In Transit via ${activeTransitOrder.courierPartner || 'Courier Partner'}`
                                : 'Artisan Crafting & Packing (Pending Dispatch)'}
                            </span>
                            <span className="text-outline font-mono text-[11px]">
                              {activeTransitOrder.trackingNumber
                                ? `AWB: ${activeTransitOrder.trackingNumber}`
                                : 'Tracking details not available yet'}
                            </span>
                          </div>

                          {/* Progress Stepper */}
                          <div className="relative flex items-center justify-between px-2 pt-2">
                            <div className="absolute left-6 right-6 top-5 -translate-y-1/2 h-1 bg-surface-container-highest z-0" />
                            <div
                              className="absolute left-6 top-5 -translate-y-1/2 h-1 bg-primary z-0 transition-all"
                              style={{
                                width:
                                  activeTransitOrder.status === 'shipped'
                                    ? '60%'
                                    : '12%',
                              }}
                            />

                            {/* Step 1: Confirmed */}
                            <div className="relative z-10 flex flex-col items-center">
                              <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[12px] shadow-sm">
                                <Check className="h-3.5 w-3.5 stroke-[3]" />
                              </div>
                              <span className="text-[10px] font-semibold text-on-surface mt-1.5">
                                Confirmed
                              </span>
                            </div>

                            {/* Step 2: In Preparation / Shipped */}
                            <div className="relative z-10 flex flex-col items-center">
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] shadow-sm ${
                                  activeTransitOrder.status === 'shipped'
                                    ? 'bg-primary text-white'
                                    : 'bg-surface-container-highest text-outline'
                                }`}
                              >
                                <Check className="h-3.5 w-3.5 stroke-[3]" />
                              </div>
                              <span className="text-[10px] font-semibold text-on-surface mt-1.5">
                                Dispatched
                              </span>
                            </div>

                            {/* Step 3: Out for Delivery */}
                            <div className="relative z-10 flex flex-col items-center">
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] shadow-md ring-4 ${
                                  activeTransitOrder.rawStatus === 'OUT_FOR_DELIVERY' || activeTransitOrder.statusLabel?.toLowerCase().includes('out for delivery')
                                    ? 'bg-secondary-container text-white ring-secondary-container/20'
                                    : 'bg-surface-container-highest text-outline ring-transparent'
                                }`}
                              >
                                <Truck className="h-4 w-4" />
                              </div>
                              <span className="text-[11px] font-bold text-on-surface mt-1">
                                Out For Delivery
                              </span>
                            </div>

                            {/* Step 4: Delivered */}
                            <div className="relative z-10 flex flex-col items-center">
                              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[12px] bg-surface-container-highest text-outline">
                                <CheckCircle className="h-3.5 w-3.5" />
                              </div>
                              <span className="text-[10px] font-medium text-outline mt-1.5">
                                Delivered
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action CTAs */}
                        <div className="flex flex-wrap items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrder(activeTransitOrder);
                              setOrderSummaryModalOpen(true);
                            }}
                            className="px-4 py-2.5 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high text-xs font-headline font-semibold transition-all border border-surface-container"
                          >
                            View Order Details
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTabChange('tracking', activeTransitOrder.orderNumber || activeTransitOrder.id)}
                            className="px-5 py-2.5 rounded-md bg-[#FFD814] text-[#0F1111] hover:bg-[#F7CA00] text-xs font-bold shadow-sm transition-all flex items-center gap-2 border border-[#FCD200]"
                          >
                            <Navigation className="h-4 w-4" />
                            <span>Track Order Status</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>
                ) : userOrders.length === 0 ? (
                  <section className="rounded-xl bg-white p-6 lg:p-7 shadow-sm border border-[#D5D9D9] overflow-hidden">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-[#131921] text-white -mx-6 lg:-mx-7 -mt-6 lg:-mt-7 border-b border-[#232F3E]">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-[#FF9900]" />
                        <span className="font-bold text-sm text-[#FFD814]">Live Order Hub</span>
                      </div>
                      <span className="text-xs text-[#CCCCCC]">Zero ongoing shipments</span>
                    </div>
                    <div className="py-8 text-center space-y-3">
                      <Package className="h-10 w-10 text-outline mx-auto stroke-1" />
                      <p className="text-sm font-headline font-bold text-on-surface">No orders placed yet</p>
                      <p className="text-xs text-on-surface-variant max-w-md mx-auto">
                        Your bespoke orders, live courier tracking, and doorstep logistics updates will appear here once placed.
                      </p>
                      <Link
                        href="/products"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] text-xs font-bold border border-[#FCD200] transition-all shadow-sm mt-2"
                      >
                        <span>Explore Handcrafted Luxury</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </section>
                ) : null}

                {/* Quick Account Shortcuts Strip */}
                <section className="space-y-4">
                  <div>
                    <span className="text-[11px] font-headline font-bold uppercase tracking-wider text-outline">
                      Self-Serve Operations
                    </span>
                    <h2 className="font-headline font-bold text-xl text-on-surface">
                      Quick Account Shortcuts
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Shortcut 1 */}
                    <button
                      type="button"
                      onClick={() => showNotification('Downloading latest GST Invoices in PDF...', 'info')}
                      className="group p-5 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container hover:shadow-md transition-all flex items-center gap-4 text-left"
                    >
                      <div className="w-12 h-12 rounded-xl bg-surface-container text-primary group-hover:bg-primary group-hover:text-white transition-colors flex items-center justify-center flex-shrink-0">
                        <Download className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-headline font-bold text-sm text-on-surface truncate group-hover:text-primary transition-colors">
                          Download Invoices
                        </h3>
                        <p className="text-xs text-on-surface-variant truncate">
                          GST &amp; expense ready PDFs
                        </p>
                      </div>
                    </button>

                    {/* Shortcut 2 */}
                    <button
                      type="button"
                      onClick={() => showNotification('All recent orders are eligible for 7-day doorstep return.', 'info')}
                      className="group p-5 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container hover:shadow-md transition-all flex items-center gap-4 text-left"
                    >
                      <div className="w-12 h-12 rounded-xl bg-surface-container text-primary group-hover:bg-primary group-hover:text-white transition-colors flex items-center justify-center flex-shrink-0">
                        <RotateCcw className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-headline font-bold text-sm text-on-surface truncate group-hover:text-primary transition-colors">
                          Returns &amp; Exchanges
                        </h3>
                        <p className="text-xs text-on-surface-variant truncate">
                          Easy 7-day doorstep pickup
                        </p>
                      </div>
                    </button>

                    {/* Shortcut 3 */}
                    <button
                      type="button"
                      onClick={() => handleTabChange('payments')}
                      className="group p-5 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container hover:shadow-md transition-all flex items-center gap-4 text-left"
                    >
                      <div className="w-12 h-12 rounded-xl bg-surface-container text-primary group-hover:bg-primary group-hover:text-white transition-colors flex items-center justify-center flex-shrink-0">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-headline font-bold text-sm text-on-surface truncate group-hover:text-primary transition-colors">
                          Saved UPI &amp; Cards
                        </h3>
                        <p className="text-xs text-on-surface-variant truncate">
                          2 Cards &amp; GPay linked
                        </p>
                      </div>
                    </button>

                    {/* Shortcut 4 */}
                    <button
                      type="button"
                      onClick={() => handleTabChange('support')}
                      className="group p-5 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container hover:shadow-md transition-all flex items-center gap-4 text-left"
                    >
                      <div className="w-12 h-12 rounded-xl bg-surface-container text-primary group-hover:bg-primary group-hover:text-white transition-colors flex items-center justify-center flex-shrink-0">
                        <Headphones className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-headline font-bold text-sm text-on-surface truncate group-hover:text-primary transition-colors">
                          Support Tickets
                        </h3>
                        <p className="text-xs text-secondary-container font-semibold truncate">
                          0 Open • 24/7 Elite desk
                        </p>
                      </div>
                    </button>
                  </div>
                </section>
              </>
            )}

            {/* ------------------------------------------------------- */}
            {/* 2. MY ORDERS TAB */}
            {/* ------------------------------------------------------- */}
            {activeTab === 'orders' && <OrdersManagementView embeddedInAccount />}

            {/* ------------------------------------------------------- */}
            {/* 2.5. ORDER TRACKING TAB */}
            {/* ------------------------------------------------------- */}
            {activeTab === 'tracking' && (
              <OrderTrackingView
                orderId={searchParams.get('orderId') || ''}
                embeddedInAccount={true}
              />
            )}

            {/* ------------------------------------------------------- */}
            {/* 3. WISHLIST TAB */}
            {/* ------------------------------------------------------- */}
            {activeTab === 'wishlist' && (
              <WishlistManagementView embeddedInAccount={true} />
            )}

            {/* ------------------------------------------------------- */}
            {/* 3.5. CUSTOMER REVIEWS TAB */}
            {/* ------------------------------------------------------- */}
            {activeTab === 'reviews' && (
              <CustomerReviewsView />
            )}

            {/* ------------------------------------------------------- */}
            {/* 3.6. CUSTOMER RETURNS & REFUNDS TAB */}
            {/* ------------------------------------------------------- */}
            {activeTab === 'returns' && (
              <CustomerReturnsView />
            )}

            {/* ------------------------------------------------------- */}
            {/* 4. SAVED ADDRESSES TAB */}
            {/* ------------------------------------------------------- */}
            {activeTab === 'addresses' && (
              <SavedAddressesView embeddedInAccount={true} />
            )}

            {/* ------------------------------------------------------- */}
            {/* 5. SAVED PAYMENTS & WALLET TAB */}
            {/* ------------------------------------------------------- */}
            {activeTab === 'payments' && (
              <SavedPaymentsVaultView embeddedInAccount={true} />
            )}

            {/* ------------------------------------------------------- */}
            {/* 6. HELP & SUPPORT TAB */}
            {/* ------------------------------------------------------- */}
            {activeTab === 'support' && (
              <HelpSupportView embeddedInAccount={true} />
            )}

            {/* ------------------------------------------------------- */}
            {/* 7. PROFILE DETAILS TAB */}
            {/* ------------------------------------------------------- */}
            {activeTab === 'profile' && (
              <ProfileSecurityView embeddedInAccount={true} />
            )}
          </main>
        </div>
      </div>

      {/* ============================================================= */}
      {/* MODAL 1: LIVE SHIPMENT TRACKING MODAL */}
      {/* ============================================================= */}
      {trackingModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-surface-container space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div>
                <span className="text-[10px] font-headline font-bold uppercase tracking-widest text-secondary-container">
                  Live Logistics Tracker
                </span>
                <h3 className="font-headline font-bold text-lg text-on-surface">
                  Order #{selectedOrder.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTrackingModalOpen(false)}
                className="p-1 rounded-lg hover:bg-surface-container text-on-surface-variant"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-surface-container-low p-4 rounded-xl space-y-2 border border-surface-container">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-primary flex items-center gap-1.5">
                  <Navigation className="h-4 w-4" />
                  {selectedOrder.courierPartner || selectedOrder.courierName || selectedOrder.courier || 'To be assigned upon dispatch'}
                </span>
                <span className="font-mono text-outline">
                  {selectedOrder.trackingNumber ? `AWB: ${selectedOrder.trackingNumber}` : 'Tracking details not available yet'}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant font-medium">
                Destination: {selectedOrder.shippingAddress?.cityStateZip || (selectedOrder.shippingAddress ? `${selectedOrder.shippingAddress.city}, ${selectedOrder.shippingAddress.state}` : defaultAddr ? `${defaultAddr.city}, ${defaultAddr.state}` : 'Registered Address')}
              </p>
            </div>

            {/* Timeline Milestones */}
            <div className="space-y-4 text-xs pl-2 border-l-2 border-primary/30 ml-3">
              <div className="relative pl-4">
                <span className="absolute -left-[23px] top-0.5 w-3.5 h-3.5 rounded-full bg-primary ring-4 ring-primary/20" />
                <span className="font-bold text-on-surface block">Order Confirmed</span>
                <span className="text-[11px] text-outline">Placed on {selectedOrder.datePlaced || selectedOrder.date || 'Recently'}</span>
              </div>

              <div className="relative pl-4">
                <span className={`absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full ${selectedOrder.status === 'processing' ? 'bg-secondary-container' : selectedOrder.status === 'shipped' || selectedOrder.status === 'delivered' ? 'bg-primary' : 'bg-surface-container-highest'}`} />
                <span className="font-bold text-on-surface block">Artisan Crafting &amp; Packaging</span>
                <span className="text-[11px] text-outline">
                  {selectedOrder.status === 'processing' ? 'In progress at fulfillment atelier' : selectedOrder.status === 'shipped' || selectedOrder.status === 'delivered' ? 'Completed & tamper sealed' : 'Pending artisan start'}
                </span>
              </div>

              <div className="relative pl-4">
                <span className={`absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full ${selectedOrder.status === 'shipped' ? 'bg-secondary-container' : selectedOrder.status === 'delivered' ? 'bg-primary' : 'bg-surface-container-highest'}`} />
                <span className="font-bold text-on-surface block">Dispatched to Courier</span>
                <span className="text-[11px] text-outline">
                  {selectedOrder.trackingNumber ? `Handed over to ${selectedOrder.courierPartner || 'courier'}` : 'Courier and tracking ID will appear once dispatched'}
                </span>
              </div>

              <div className="relative pl-4">
                <span className={`absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full ${selectedOrder.status === 'delivered' ? 'bg-primary' : 'bg-surface-container-highest'}`} />
                <span className="font-bold text-on-surface block">Delivered to Doorstep</span>
                <span className="text-[11px] text-outline">
                  {selectedOrder.status === 'delivered' ? 'Package handed over to recipient' : 'Pending dispatch and arrival'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setTrackingModalOpen(false);
                  handleTabChange('tracking', selectedOrder?.orderNumber || selectedOrder?.id);
                }}
                className="flex-1 py-2.5 rounded-lg bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] text-xs font-bold border border-[#FCD200] transition-all shadow-sm text-center flex items-center justify-center gap-1.5"
              >
                <Navigation className="h-4 w-4" />
                <span>Open Full Tracking Page</span>
              </button>
              <button
                type="button"
                onClick={() => setTrackingModalOpen(false)}
                className="px-4 py-2.5 rounded-lg bg-surface-container text-on-surface text-xs font-bold hover:bg-surface-container-high transition-all border border-surface-container"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 2: TIER BENEFITS MODAL */}
      {/* ============================================================= */}
      {tierBenefitsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-2xl border border-surface-container space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-secondary-container" />
                <h3 className="font-headline font-bold text-base text-on-surface">
                  Royal Insider Elite Privileges
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTierBenefitsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-surface-container text-on-surface-variant"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-low border border-surface-container">
                <Truck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <strong className="text-on-surface block">Complimentary Priority Air Shipping</strong>
                  <span className="text-on-surface-variant">Zero delivery fee on all orders, with no minimum cart value.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-low border border-surface-container">
                <Sparkles className="h-4 w-4 text-secondary-container shrink-0 mt-0.5" />
                <div>
                  <strong className="text-on-surface block">2x Festive Royalty Coins</strong>
                  <span className="text-on-surface-variant">Earn 10 coins on every ₹100 spent across couture brands.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-low border border-surface-container">
                <Headphones className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-on-surface block">Dedicated Artisan Concierge</strong>
                  <span className="text-on-surface-variant">Personal styling consultations &amp; custom bespoke sizing requests.</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setTierBenefitsModalOpen(false)}
              className="w-full py-2.5 rounded-lg bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] text-xs font-bold border border-[#FCD200] transition-all shadow-sm"
            >
              Acknowledge Privileges
            </button>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 3: ORDER SUMMARY MODAL */}
      {/* ============================================================= */}
      {orderSummaryModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-surface-container space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div>
                <span className="text-[10px] font-headline font-bold uppercase tracking-widest text-outline">
                  Invoice Breakdown
                </span>
                <h3 className="font-headline font-bold text-base text-on-surface">
                  Order #{selectedOrder.orderNumber || selectedOrder.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOrderSummaryModalOpen(false)}
                className="p-1 rounded-lg hover:bg-surface-container text-on-surface-variant"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Item Snapshot */}
            <div className="flex items-center gap-3.5 p-3 rounded-xl bg-surface-container-low border border-surface-container">
              <div className="w-14 h-16 rounded-lg overflow-hidden bg-surface-container relative shrink-0">
                <Image
                  src={selectedOrder.items?.[0]?.image || selectedOrder.image || 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80'}
                  alt={selectedOrder.items?.[0]?.title || selectedOrder.title || 'Product'}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase text-secondary-container">
                    {selectedOrder.items?.[0]?.brand || selectedOrder.brand || 'Vyntra Atelier'}
                  </span>
                  <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.2 rounded">
                    Seller: {selectedOrder.items?.[0]?.sellerName || (selectedOrder.items?.[0] as any)?.vendorName || 'Vyntra Royal Atelier'}
                  </span>
                </div>
                <h4 className="font-headline font-bold text-xs text-on-surface truncate">
                  {selectedOrder.items?.[0]?.title || selectedOrder.title}
                </h4>
                <p className="text-[11px] text-on-surface-variant">
                  Size: {selectedOrder.items?.[0]?.size || (selectedOrder.items?.[0] as any)?.selectedSize || selectedOrder.size || 'N/A'} • Color: {selectedOrder.items?.[0]?.color || (selectedOrder.items?.[0] as any)?.selectedColor || selectedOrder.color || 'N/A'}
                </p>
              </div>
              <span className="font-bold text-xs text-on-surface">
                {formatINR(Number(selectedOrder.items?.[0]?.price ?? (selectedOrder.items?.[0] as any)?.unitPrice ?? selectedOrder.totalAmount))}
              </span>
            </div>

            <div className="space-y-2 text-xs border-t border-surface-container pt-3">
              <div className="flex justify-between text-on-surface-variant">
                <span>Items Subtotal</span>
                <span>{formatINR(Number(selectedOrder.subtotal || selectedOrder.items?.[0]?.price || selectedOrder.totalAmount))}</span>
              </div>
              <div className="flex justify-between text-on-surface-variant">
                <span>Royal Member Shipping</span>
                <span className="text-emerald-700 font-semibold">FREE</span>
              </div>
              {Number(selectedOrder.totalAmount) > Number(selectedOrder.subtotal || 0) && (
                <div className="flex justify-between text-on-surface-variant">
                  <span>Packaging &amp; COD Handling</span>
                  <span>{formatINR(Number(selectedOrder.totalAmount) - Number(selectedOrder.subtotal || 0))}</span>
                </div>
              )}
              <div className="flex justify-between text-on-surface-variant">
                <span>GST (Integrated 12%)</span>
                <span>Included</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-on-surface pt-2 border-t border-surface-container">
                <span>Grand Total Paid</span>
                <span>{formatINR(Number(selectedOrder.totalAmount))}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  showNotification(`Downloading GST Tax Invoice for Order #${selectedOrder.id}...`, 'info');
                }}
                className="flex-1 py-2.5 rounded-xl bg-surface-container text-primary hover:bg-surface-container-high text-xs font-headline font-bold transition-all flex items-center justify-center gap-1.5 border border-surface-container"
              >
                <Download className="h-4 w-4" />
                <span>Download Tax Invoice</span>
              </button>
              <button
                type="button"
                onClick={() => setOrderSummaryModalOpen(false)}
                className="px-5 py-2.5 rounded-lg bg-[#232F3E] text-white text-xs font-bold hover:bg-[#131921] transition-all shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* FLOATING TOAST NOTIFICATION */}
      {/* ============================================================= */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 transform transition-all duration-300 bg-on-surface text-white px-4 py-3 rounded-xl shadow-2xl text-xs z-50 flex items-center gap-2.5 max-w-sm border border-white/10 animate-in fade-in slide-in-from-bottom-2">
          {toast.type === 'success' && <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />}
          {toast.type === 'info' && <Sparkles className="h-4 w-4 text-secondary-container shrink-0" />}
          <span className="flex-1 font-medium leading-relaxed">{toast.message}</span>
          <button
            onClick={() => setToast((prev) => ({ ...prev, show: false }))}
            className="text-white/70 hover:text-white ml-1 p-0.5 rounded transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface flex items-center justify-center">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AccountDashboardContent />
    </Suspense>
  );
}
