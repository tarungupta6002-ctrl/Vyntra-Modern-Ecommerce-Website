'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Store,
  Package,
  Truck,
  Wallet,
  RotateCcw,
  ArrowLeft,
  Image as ImageIcon,
  ShieldCheck,
  Clock,
  Loader2,
  AlertCircle,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';
import { BrandLogo } from '@/components/layout/brand-logo';

interface VendorMeData {
  userId: string;
  email: string;
  name?: string | null;
  role: string;
  isVendor: boolean;
  vendorProfile: {
    id: string;
    storeName: string;
    storeSlug: string;
    status: string;
    isVerified: boolean;
  } | null;
  vendorApplication?: {
    id: string;
    storeName: string;
    storeSlug: string;
    status: string;
    rejectionReason?: string | null;
  } | null;
}

export function VendorHeader() {
  const pathname = usePathname();
  const [session, setSession] = useState<VendorMeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchVendorIdentity() {
      try {
        const res = await fetch('/api/vendor/me', {
          method: 'GET',
          cache: 'no-store',
          credentials: 'same-origin',
        });

        if (!res.ok) {
          if (isMounted) {
            setSession(null);
            setLoading(false);
          }
          return;
        }

        const data = await res.json();
        if (isMounted) {
          if (data?.success && data?.data) {
            setSession(data.data);
          } else {
            setSession(null);
          }
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setSession(null);
          setLoading(false);
        }
      }
    }

    fetchVendorIdentity();

    return () => {
      isMounted = false;
    };
  }, [pathname]);

  // Close mobile drawer upon route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Determine status and store name strictly from server-authenticated session
  const isApproved = Boolean(session?.isVendor && session?.vendorProfile?.storeName);
  const isPending = Boolean(
    !isApproved &&
      (session?.vendorProfile?.status === 'PENDING' ||
        session?.vendorApplication?.status === 'SUBMITTED' ||
        session?.vendorApplication?.status === 'UNDER_REVIEW')
  );
  const isRejected = Boolean(
    !isApproved &&
      (session?.vendorApplication?.status === 'REJECTED' ||
        session?.vendorProfile?.status === 'REJECTED')
  );

  const rawStoreName =
    session?.vendorProfile?.storeName ||
    session?.vendorApplication?.storeName ||
    '';

  const navItems = [
    {
      name: 'My Products',
      href: '/vendor/products',
      icon: Package,
      isActive: pathname.startsWith('/vendor/products'),
    },
    {
      name: 'Orders & Shipments',
      href: '/vendor/orders',
      icon: Truck,
      isActive: pathname.startsWith('/vendor/orders'),
    },
    {
      name: 'Media Library',
      href: '/vendor/media',
      icon: ImageIcon,
      isActive: pathname.startsWith('/vendor/media'),
    },
    {
      name: 'Earnings & Payouts',
      href: '/vendor/payouts',
      icon: Wallet,
      isActive: pathname.startsWith('/vendor/payouts'),
    },
    {
      name: 'Returns & Replacements',
      href: '/vendor/returns',
      icon: RotateCcw,
      isActive: pathname.startsWith('/vendor/returns'),
    },
  ];

  const displayName = session?.name || session?.email?.split('@')[0] || 'Artisan Seller';
  const userInitials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('') || 'VS';

  return (
    <header className="bg-[#131921] text-white border-b border-white/10 sticky top-0 z-40 shadow-md">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between gap-3">
          {/* Left: Brand Logo & Seller Central Badge */}
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/vendor/products" className="flex items-center gap-2 group">
              <BrandLogo asLink={false} variant="light" className="h-7 w-auto transition-transform group-hover:scale-105" />
              <span className="bg-[#FFD814] text-[#0F1111] text-[10px] font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider flex items-center gap-1 shadow-sm font-label">
                <Store className="h-3 w-3" />
                Seller Central
              </span>
            </Link>

            {/* Store Name Chip */}
            {rawStoreName && (
              <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-semibold text-white/90">
                <Store className="h-3.5 w-3.5 text-[#FFD814] shrink-0" />
                <span className="max-w-[140px] truncate">{rawStoreName}</span>
              </div>
            )}
          </div>

          {/* Center: Desktop Navigation Bar */}
          <nav className="hidden xl:flex items-center gap-1 text-xs font-semibold shrink-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-150 whitespace-nowrap shrink-0 ${
                    item.isActive
                      ? 'bg-white/15 text-[#FFD814] shadow-sm font-bold border border-white/10'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${item.isActive ? 'text-[#FFD814]' : 'text-white/70'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Section: Identity, Merchant Status & Storefront Switch */}
          <div className="flex items-center gap-2 shrink-0">
            {loading ? (
              <div className="h-8 w-28 bg-white/10 rounded-lg animate-pulse hidden sm:block" />
            ) : session?.email ? (
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 shrink-0">
                {/* Initials Avatar */}
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#FFD814] to-[#F7CA00] text-[#0F1111] flex items-center justify-center font-bold text-[11px] shrink-0 shadow-inner">
                  {userInitials}
                </div>

                <div className="flex flex-col text-left leading-tight min-w-0">
                  <span
                    className="text-xs font-bold text-white max-w-[110px] 2xl:max-w-[150px] truncate"
                    title={session.email}
                  >
                    {displayName}
                  </span>
                  <div className="flex items-center gap-1">
                    {isApproved ? (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-emerald-400 uppercase tracking-wider whitespace-nowrap">
                        <ShieldCheck className="h-2.5 w-2.5 shrink-0" />
                        Approved Merchant
                      </span>
                    ) : isPending ? (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-amber-300 uppercase tracking-wider whitespace-nowrap">
                        <Clock className="h-2.5 w-2.5 shrink-0 animate-pulse" />
                        Pending Review
                      </span>
                    ) : isRejected ? (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-rose-300 uppercase tracking-wider whitespace-nowrap">
                        <AlertCircle className="h-2.5 w-2.5 shrink-0" />
                        Needs Revision
                      </span>
                    ) : (
                      <span className="text-[9px] text-white/60 whitespace-nowrap">Partner Tier</span>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Quick Storefront Link */}
            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white/90 hover:text-white border border-white/15 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm whitespace-nowrap"
              title="Return to Customer Storefront"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-[#FFD814]" />
              <span className="hidden md:inline">Back to Storefront</span>
              <span className="md:hidden">Storefront</span>
            </Link>

            {/* Mobile / Tablet Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-colors"
              aria-label="Toggle Seller Navigation Menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Medium Screen (Tablet/Laptop) Horizontal Scrollable Navigation */}
        <div className="hidden sm:flex xl:hidden overflow-x-auto py-2 border-t border-white/10 gap-2 text-xs font-semibold no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all whitespace-nowrap shrink-0 ${
                  item.isActive
                    ? 'bg-white/15 text-[#FFD814] font-bold border border-white/10'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${item.isActive ? 'text-[#FFD814]' : 'text-white/70'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Mobile Drawer (When hamburger is clicked on phones) */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-[#1B222D] border-t border-white/10 px-4 py-4 space-y-2 animate-in slide-in-from-top duration-200">
          {/* User info in mobile drawer */}
          {session?.email && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 mb-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FFD814] to-[#F7CA00] text-[#0F1111] flex items-center justify-center font-bold text-xs shrink-0">
                {userInitials}
              </div>
              <div className="flex flex-col text-left leading-tight min-w-0">
                <span className="text-xs font-bold text-white truncate">{displayName}</span>
                <span className="text-[10px] text-white/60 font-mono truncate">{session.email}</span>
                <span className="text-[9px] font-extrabold text-emerald-400 mt-0.5">
                  {isApproved ? 'Approved Merchant' : 'Seller Partner'}
                </span>
              </div>
            </div>
          )}

          {rawStoreName && (
            <div className="px-3 py-1.5 text-xs font-semibold text-[#FFD814] flex items-center gap-1.5 bg-black/30 rounded-lg">
              <Store className="h-3.5 w-3.5" />
              <span>Boutique: {rawStoreName}</span>
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                  item.isActive
                    ? 'bg-white/15 text-[#FFD814] font-bold border border-white/10'
                    : 'text-white/80 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`h-4 w-4 ${item.isActive ? 'text-[#FFD814]' : 'text-white/70'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}

          <div className="pt-2 border-t border-white/10">
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white/70 hover:text-white"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Customer Storefront</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
