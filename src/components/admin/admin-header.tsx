'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  LayoutDashboard,
  Store,
  Clock,
  Package,
  Truck,
  RefreshCw,
  Star,
  Wallet,
  ArrowLeft,
  Menu,
  X,
  ExternalLink,
  Tag,
  Trophy,
  TrendingUp,
} from 'lucide-react';
import { BrandLogo } from '@/components/layout/brand-logo';

interface AdminHeaderProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
}

export function AdminHeader({ user }: AdminHeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentTab = searchParams.get('tab');

  const navItems = [
    {
      name: 'Overview',
      href: '/admin',
      icon: LayoutDashboard,
      isActive: pathname === '/admin',
    },
    {
      name: 'Vendors',
      href: '/admin/vendors',
      icon: Store,
      isActive: pathname.startsWith('/admin/vendors'),
    },
    {
      name: 'Catalog',
      href: '/admin/products',
      icon: Package,
      isActive: pathname.startsWith('/admin/products'),
    },
    {
      name: 'Seller Offers',
      href: '/admin/offers',
      icon: Tag,
      isActive: pathname.startsWith('/admin/offers'),
    },
    {
      name: 'Buy Box',
      href: '/admin/buy-box',
      icon: Trophy,
      isActive: pathname.startsWith('/admin/buy-box'),
    },
    {
      name: 'Orders',
      href: '/admin/orders',
      icon: Package,
      isActive: pathname.startsWith('/admin/orders'),
    },
    {
      name: 'Shipments',
      href: '/admin/shipments',
      icon: Truck,
      isActive: pathname.startsWith('/admin/shipments'),
    },
    {
      name: 'Returns & Refunds',
      href: '/admin/returns',
      icon: RefreshCw,
      isActive: pathname.startsWith('/admin/returns'),
    },
    {
      name: 'Reviews',
      href: '/admin/reviews',
      icon: Star,
      isActive: pathname.startsWith('/admin/reviews'),
    },
    {
      name: 'Payouts',
      href: '/admin/payouts',
      icon: Wallet,
      isActive: pathname.startsWith('/admin/payouts'),
    },
    {
      name: 'Revenue',
      href: '/admin/revenue',
      icon: TrendingUp,
      isActive: pathname.startsWith('/admin/revenue'),
    },
  ];

  return (
    <header className="bg-[#131921] text-white border-b border-white/10 sticky top-0 z-40 shadow-lg">
      {/* Tier 1: Main Admin Identity Bar */}
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-14 flex items-center justify-between gap-4">
          {/* Left: Brand Logo & Admin Central Pill */}
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/admin" className="flex items-center gap-2.5 group">
              <BrandLogo asLink={false} variant="light" className="h-7 w-auto transition-transform group-hover:scale-105" />
              <span className="bg-gradient-to-r from-[#800020] to-[#A30029] text-white text-[10px] font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider flex items-center gap-1 shadow-sm border border-rose-400/40">
                <ShieldCheck className="h-3 w-3 text-rose-300" />
                Admin Central
              </span>
            </Link>
            <span className="hidden md:inline-block text-[11px] text-white/50 border-l border-white/15 pl-3 font-medium">
              Enterprise Governance
            </span>
          </div>

          {/* Right: User Identity & Storefront Link */}
          <div className="flex items-center gap-3 shrink-0">
            {/* User Profile Chip */}
            <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#800020] to-[#A30029] text-[#FFD814] flex items-center justify-center font-bold text-xs border border-rose-400/30 shadow-inner shrink-0">
                {user.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-white leading-tight max-w-[140px] truncate">
                  {user.name || 'Administrator'}
                </span>
                <span className="text-[10px] font-mono text-[#FFD814] font-semibold uppercase tracking-wider">
                  {user.role}
                </span>
              </div>
            </div>

            {/* Link back to Storefront */}
            <Link
              href="/"
              className="text-xs font-bold text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-sm shrink-0"
              title="View Public Storefront"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Storefront</span>
            </Link>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 border border-white/10 shrink-0"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Tier 2: Dedicated Full Navigation Ribbon (Fits all screens cleanly) */}
      <div className="bg-[#18202c] border-t border-white/10 shadow-inner">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="overflow-x-auto py-1.5 flex items-center gap-1.5 text-xs font-semibold">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all duration-150 whitespace-nowrap shrink-0 ${
                    item.isActive
                      ? 'bg-[#FFD814] text-[#0F1111] shadow-sm font-bold'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 shrink-0 ${
                      item.isActive ? 'text-[#0F1111]' : 'text-white/70'
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile / Tablet Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#131921] px-4 py-4 border-t border-white/10 space-y-1">
          <div className="px-3 py-2 bg-white/5 rounded-lg mb-3 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white">{user.name}</div>
              <div className="text-[10px] text-white/60 font-mono">{user.email}</div>
            </div>
            <span className="text-[10px] font-mono text-[#FFD814] font-bold uppercase px-2 py-0.5 rounded bg-[#FFD814]/10 border border-[#FFD814]/20">
              {user.role}
            </span>
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  item.isActive
                    ? 'bg-[#FFD814] text-[#0F1111] font-bold shadow-sm'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
