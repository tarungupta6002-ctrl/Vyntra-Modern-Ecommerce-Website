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
    <CometSpinner className="h-12 w-12" />
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
  () => import('@/components/account/payment-methods-view').then((mod) => mod.PaymentMethodsView),
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
import { useUserProfileStore } from '@/store/user-profile-store';
import { useOrderStore } from '@/store/order-store';

import { CometSpinner } from '@/components/ui/loading-spinner';
type AccountTab =
  | 'overview'
  | 'orders'
  | 'tracking'
  | 'reviews'
  | 'returns'
  | 'wishlist'
  | 'addresses'
  | 'payments'
  | 'support'
  | 'profile';

const TABS: AccountTab[] = ['overview', 'orders', 'tracking', 'reviews', 'returns', 'wishlist', 'addresses', 'payments', 'support', 'profile'];
/** The tab named in the URL, or the overview for anything unknown (e.g. old links to removed tabs). */
const toTab = (value: string | null): AccountTab => (TABS.includes(value as AccountTab) ? (value as AccountTab) : 'overview');

const PAST_ORDERS: any[] = [];

const SAVED_ADDRESSES: any[] = [];

function AccountDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = toTab(searchParams.get('tab'));
  const [activeTab, setActiveTab] = useState<AccountTab>(initialTab);

  const [mounted, setMounted] = useState(false);

  const { addresses: storeAddresses, getDefaultAddress, fetchAddresses } = useAddressStore();
  const { items: wishlistStoreItems } = useWishlistStore();
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
  });

  const displayName = user.name || (mounted ? profileStore.fullName : '') || '';
  const displayEmail = user.email || (mounted ? profileStore.email : '') || '';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();


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
    const tabParam = toTab(searchParams.get('tab'));
    if (tabParam !== activeTab) {
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
    showNotification('Signed out.', 'info');
    setTimeout(() => {
      router.push('/login?redirect=/account');
      router.refresh();
    }, 600);
  };

  const NAV: { group: string; items: { tab: AccountTab; label: string; icon: React.ElementType; count?: number }[] }[] = [
    {
      group: 'Orders',
      items: [
        { tab: 'orders', label: 'Your orders', icon: Package, count: mounted ? totalOrderCount : undefined },
        { tab: 'tracking', label: 'Track an order', icon: Truck },
        { tab: 'returns', label: 'Returns and refunds', icon: RotateCcw },
        { tab: 'reviews', label: 'Your reviews', icon: Star },
      ],
    },
    {
      group: 'Account',
      items: [
        { tab: 'overview', label: 'Overview', icon: User },
        { tab: 'wishlist', label: 'Wishlist', icon: Heart, count: mounted ? wishlistStoreItems.length : undefined },
        { tab: 'addresses', label: 'Addresses', icon: MapPin },
        { tab: 'payments', label: 'Payments', icon: CreditCard },
        { tab: 'profile', label: 'Login and security', icon: ShieldCheck },
        { tab: 'support', label: 'Help and support', icon: Headphones },
      ],
    },
  ];
  const tabLabel = NAV.flatMap((g) => g.items).find((i) => i.tab === activeTab)?.label;
  const onTheWay = activeTransitOrders.length;

  return (
    <div className="min-h-screen w-full bg-[#F7F8F8] py-6 text-[#0F1111] sm:py-8">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <nav className="mb-5 flex items-center gap-1.5 text-sm text-[#565959]" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-[#007185] hover:underline">Home</Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          {activeTab === 'overview' ? (
            <span className="text-[#0F1111]">Your account</span>
          ) : (
            <>
              <button type="button" onClick={() => handleTabChange('overview')} className="hover:text-[#007185] hover:underline">
                Your account
              </button>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="text-[#0F1111]">{tabLabel}</span>
            </>
          )}
        </nav>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* Sidebar */}
          <aside className="rounded-xl border border-[#D5D9D9] bg-white p-4 lg:sticky lg:top-36 lg:col-span-3">
            <div className="flex items-center gap-3 border-b border-[#EAEDED] pb-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#0F1111] text-sm font-semibold text-white">
                {initials || <User className="h-5 w-5" aria-hidden="true" />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{displayName || 'Your account'}</p>
                <p className="truncate text-xs text-[#565959]">{displayEmail}</p>
              </div>
            </div>
            {NAV.map((group) => (
              <div key={group.group} className="mt-4">
                <p className="px-2 text-xs font-medium text-[#565959]">{group.group}</p>
                <ul className="mt-1 space-y-0.5" role="list">
                  {group.items.map(({ tab, label, icon: Icon, count }) => (
                    <li key={tab}>
                      <button
                        type="button"
                        onClick={() => handleTabChange(tab)}
                        aria-current={activeTab === tab ? 'page' : undefined}
                        className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm ${
                          activeTab === tab ? 'bg-[#007185]/10 font-semibold text-[#005B6B]' : 'text-[#0F1111] hover:bg-[#F7F8F8]'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="flex-1">{label}</span>
                        {count !== undefined && count > 0 && <span className="text-xs tabular-nums text-[#565959]">{count}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="mt-4 flex w-full items-center gap-3 rounded-lg border-t border-[#EAEDED] px-2.5 pb-1 pt-4 text-left text-sm text-[#B12704] hover:underline"
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
              Sign out
            </button>
          </aside>

          <main className="flex flex-col gap-6 lg:col-span-9">
            {activeTab === 'overview' && (
              <>
                <div>
                  <h1 className="text-2xl font-bold">{displayName ? `Hello, ${displayName.split(' ')[0]}` : 'Your account'}</h1>
                  <p className="mt-1 text-sm text-[#565959]">Track orders, manage returns and addresses, and keep your details up to date.</p>
                </div>

                {/* At a glance */}
                <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="At a glance">
                  {[
                    {
                      label: 'Orders',
                      value: mounted ? String(totalOrderCount) : '–',
                      hint: mounted ? (onTheWay > 0 ? `${onTheWay} on the way` : 'Nothing on the way') : '',
                      tab: 'orders' as AccountTab,
                      icon: Package,
                    },
                    {
                      label: 'Wishlist',
                      value: mounted ? String(wishlistStoreItems.length) : '–',
                      hint: 'Saved for later',
                      tab: 'wishlist' as AccountTab,
                      icon: Heart,
                    },
                    {
                      label: 'Addresses',
                      value: mounted ? String(storeAddresses.length) : '–',
                      hint: mounted && defaultAddr ? `Default: ${defaultAddressLabel}` : 'Add a delivery address',
                      tab: 'addresses' as AccountTab,
                      icon: MapPin,
                    },
                  ].map(({ label, value, hint, tab, icon: Icon }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => handleTabChange(tab)}
                      className="flex items-start gap-3 rounded-xl border border-[#D5D9D9] bg-white p-4 text-left hover:border-[#007185]"
                    >
                      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#007185]" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block text-sm text-[#565959]">{label}</span>
                        <span suppressHydrationWarning className="block text-2xl font-semibold tabular-nums">{value}</span>
                        <span suppressHydrationWarning className="block truncate text-xs text-[#565959]">{hint}</span>
                      </span>
                    </button>
                  ))}
                </section>

                {/* Latest order on the way */}
                {mounted && activeTransitOrder ? (
                  <section className="overflow-hidden rounded-xl border border-[#D5D9D9] bg-white" aria-labelledby="on-the-way-heading">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EAEDED] bg-[#F7F8F8] px-5 py-3">
                      <h2 id="on-the-way-heading" className="text-base font-semibold">
                        {onTheWay > 1 ? `${onTheWay} orders on the way` : 'On the way'}
                      </h2>
                      <span className="text-sm text-[#565959]">
                        Order #{activeTransitOrder.orderNumber} · placed {activeTransitOrder.datePlaced}
                      </span>
                    </div>
                    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-[#EAEDED] bg-[#F7F8F8]">
                        {activeTransitOrder.items[0]?.image ? (
                          <Image src={activeTransitOrder.items[0].image} alt="" fill className="object-contain p-1" />
                        ) : (
                          <Package className="absolute inset-0 m-auto h-6 w-6 text-[#8A8F8F]" aria-hidden="true" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <span className="inline-block rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-800">
                          {activeTransitOrder.statusLabel}
                        </span>
                        <p className="truncate text-sm font-semibold">
                          {activeTransitOrder.items[0]?.title}
                          {activeTransitOrder.items.length > 1 && (
                            <span className="font-normal text-[#565959]"> and {activeTransitOrder.items.length - 1} more</span>
                          )}
                        </p>
                        <p className="text-sm text-[#565959]">
                          {activeTransitOrder.trackingNumber
                            ? `${activeTransitOrder.courierPartner || 'Courier'} · ${activeTransitOrder.trackingNumber}`
                            : 'Tracking appears here once the seller ships it.'}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => handleTabChange('tracking', activeTransitOrder.orderNumber || activeTransitOrder.id)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#FCD200] bg-[#FFD814] px-4 py-2 text-sm font-semibold hover:bg-[#F7CA00]"
                        >
                          <Truck className="h-4 w-4" aria-hidden="true" />
                          Track order
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTabChange('orders')}
                          className="rounded-full border border-[#D5D9D9] bg-white px-4 py-2 text-sm font-semibold hover:bg-[#F7F8F8]"
                        >
                          All orders
                        </button>
                      </div>
                    </div>
                  </section>
                ) : mounted && userOrders.length === 0 ? (
                  <section className="space-y-3 rounded-xl border border-dashed border-[#D5D9D9] bg-white p-8 text-center">
                    <Package className="mx-auto h-8 w-8 text-[#8A8F8F]" aria-hidden="true" />
                    <h2 className="text-base font-semibold">No orders yet</h2>
                    <p className="mx-auto max-w-md text-sm text-[#565959]">When you place an order, you can follow it here.</p>
                    <Link href="/products" className="inline-flex rounded-full border border-[#FCD200] bg-[#FFD814] px-4 py-2 text-sm font-semibold hover:bg-[#F7CA00]">
                      Start shopping
                    </Link>
                  </section>
                ) : null}

                {/* Shortcuts */}
                <section aria-labelledby="shortcuts-heading">
                  <h2 id="shortcuts-heading" className="mb-3 text-base font-semibold">Shortcuts</h2>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      { tab: 'returns' as AccountTab, title: 'Returns and refunds', hint: 'Start or track a return', icon: RotateCcw },
                      { tab: 'orders' as AccountTab, title: 'Invoices', hint: 'From each order’s page', icon: Download },
                      { tab: 'payments' as AccountTab, title: 'Payments', hint: 'How you pay on Vyntra', icon: CreditCard },
                      { tab: 'support' as AccountTab, title: 'Help and support', hint: 'Ask us about an order', icon: Headphones },
                    ].map(({ tab, title, hint, icon: Icon }) => (
                      <button
                        key={title}
                        type="button"
                        onClick={() => handleTabChange(tab)}
                        className="flex items-center gap-3 rounded-xl border border-[#D5D9D9] bg-white p-4 text-left hover:border-[#007185]"
                      >
                        <Icon className="h-5 w-5 shrink-0 text-[#007185]" aria-hidden="true" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{title}</span>
                          <span className="block truncate text-xs text-[#565959]">{hint}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              </>
            )}

            {activeTab === 'orders' && <OrdersManagementView embeddedInAccount />}
            {activeTab === 'tracking' && <OrderTrackingView orderId={searchParams.get('orderId') || ''} embeddedInAccount={true} />}
            {activeTab === 'wishlist' && <WishlistManagementView embeddedInAccount={true} />}
            {activeTab === 'reviews' && <CustomerReviewsView />}
            {activeTab === 'returns' && <CustomerReturnsView />}
            {activeTab === 'addresses' && <SavedAddressesView embeddedInAccount={true} />}
            {activeTab === 'payments' && <SavedPaymentsVaultView embeddedInAccount={true} />}
            {activeTab === 'support' && <HelpSupportView embeddedInAccount={true} />}
            {activeTab === 'profile' && <ProfileSecurityView embeddedInAccount={true} />}
          </main>
        </div>
      </div>

      {toast.show && (
        <div
          role="status"
          className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2.5 text-sm font-medium text-white shadow-lg ${
            toast.type === 'error' ? 'bg-rose-700' : 'bg-[#0F1111]'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F7F8F8]">
          <CometSpinner className="h-12 w-12" />
        </div>
      }
    >
      <AccountDashboardContent />
    </Suspense>
  );
}
