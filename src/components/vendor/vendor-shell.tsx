'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronDown,
  ExternalLink,
  HelpCircle,
  Image as ImageIcon,
  LogOut,
  MapPin,
  Menu,
  Package,
  RotateCcw,
  Store,
  Truck,
  Wallet,
  X,
} from 'lucide-react';
import { BrandLogo } from '@/components/layout/brand-logo';
import { createClient } from '@/lib/supabase/client';
import { useUserProfileStore } from '@/store/user-profile-store';

export interface VendorShellIdentity {
  name: string;
  email: string;
  storeName: string;
  isVerified: boolean;
}

const NAV_GROUPS: { label: string; items: { name: string; href: string; icon: React.ElementType }[] }[] = [
  {
    label: 'Catalog',
    items: [
      { name: 'Products', href: '/vendor/products', icon: Package },
      { name: 'Media library', href: '/vendor/media', icon: ImageIcon },
    ],
  },
  {
    label: 'Orders',
    items: [
      { name: 'Orders & shipments', href: '/vendor/orders', icon: Truck },
      { name: 'Returns', href: '/vendor/returns', icon: RotateCcw },
    ],
  },
  {
    label: 'Payments',
    items: [{ name: 'Earnings & payouts', href: '/vendor/payouts', icon: Wallet }],
  },
  {
    label: 'Settings',
    items: [{ name: 'Pickup addresses', href: '/vendor/pickup-addresses', icon: MapPin }],
  },
];

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]!.toUpperCase())
      .join('') || 'S'
  );
}

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Seller Central" className="space-y-5">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-1.5 text-xs font-semibold text-[#6F7373]">{group.label}</p>
          <ul className="space-y-0.5">
            {group.items.map(({ name, href, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#007185] ${
                      active ? 'bg-[#FFF6CC] font-semibold text-[#0F1111]' : 'text-[#333] hover:bg-[#F0F2F2]'
                    }`}
                  >
                    {active && <span className="absolute inset-y-1.5 left-0 w-1 rounded-r bg-[#F2B705]" aria-hidden />}
                    <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-[#0F1111]' : 'text-[#565959]'}`} />
                    {name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/**
 * Seller Central frame: a slim top bar, a grouped sidebar on large screens and a drawer on
 * small ones. Pages render their own header with VendorPageHeader.
 */
export function VendorShell({ identity, children }: { identity: VendorShellIdentity; children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDrawerOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen && !drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setDrawerOpen(false);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [menuOpen, drawerOpen]);

  const signOut = async () => {
    setSigningOut(true);
    try {
      await createClient().auth.signOut();
      await fetch('/api/auth/logout', { method: 'POST' });
      useUserProfileStore.getState().resetToDefault();
      router.push('/');
      router.refresh();
    } catch {
      setSigningOut(false);
    }
  };

  const storeBlock = (
    <div className="flex items-center gap-2.5 rounded-lg border border-[#E3E6E6] bg-[#F7F8F8] px-3 py-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#131921] text-[#FFD814]">
        <Store className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[#0F1111]">{identity.storeName}</p>
        <p className={`text-xs ${identity.isVerified ? 'text-[#067D62]' : 'text-[#565959]'}`}>
          {identity.isVerified ? 'Verified seller' : 'Approved seller'}
        </p>
      </div>
    </div>
  );

  return (
    <div className="-mt-[108px] lg:-mt-[100px] flex min-h-screen flex-col bg-[#F7F8F8] font-sans text-[#0F1111]">
      {/* Top bar */}
      <header className="sticky top-0 z-40 h-14 bg-[#131921] text-white">
        <div className="flex h-full items-center gap-3 px-3 sm:px-5">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="rounded-md p-2 text-white/90 hover:bg-white/10 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/vendor/products" className="flex items-center gap-2.5" aria-label="Seller Central home">
            <BrandLogo asLink={false} variant="light" className="h-7 w-auto" />
            <span className="hidden border-l border-white/20 pl-2.5 text-sm font-semibold sm:inline">Seller Central</span>
          </Link>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <Link
              href="/"
              target="_blank"
              className="hidden items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-white/85 hover:bg-white/10 hover:text-white sm:flex"
            >
              View storefront <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <Link href="/support" className="rounded-md p-2 text-white/85 hover:bg-white/10 hover:text-white" aria-label="Help">
              <HelpCircle className="h-5 w-5" />
            </Link>
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 hover:bg-white/10"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFD814] text-xs font-bold text-[#0F1111]">
                  {initials(identity.name)}
                </span>
                <span className="hidden max-w-[140px] truncate text-sm md:inline">{identity.name}</span>
                <ChevronDown className="hidden h-4 w-4 text-white/70 md:block" />
              </button>
              {menuOpen && (
                <div role="menu" className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-[#D5D9D9] bg-white text-[#0F1111] shadow-lg">
                  <div className="border-b border-[#E3E6E6] px-4 py-3">
                    <p className="truncate text-sm font-semibold">{identity.name}</p>
                    <p className="truncate text-xs text-[#565959]">{identity.email}</p>
                  </div>
                  <Link role="menuitem" href="/account" className="block px-4 py-2.5 text-sm hover:bg-[#F7F8F8]">
                    Your customer account
                  </Link>
                  <button
                    role="menuitem"
                    type="button"
                    onClick={signOut}
                    disabled={signingOut}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-[#F7F8F8] disabled:opacity-60"
                  >
                    <LogOut className="h-4 w-4 text-[#565959]" /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar (large screens) */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 flex-col gap-5 overflow-y-auto border-r border-[#D5D9D9] bg-white px-3 py-5 lg:flex">
          {storeBlock}
          <NavList pathname={pathname} />
        </aside>

        {/* Drawer (small screens) */}
        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
            <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} aria-label="Close menu" />
            <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col gap-5 overflow-y-auto bg-white px-3 py-4 shadow-xl">
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-semibold">Seller Central</span>
                <button type="button" onClick={() => setDrawerOpen(false)} className="rounded-md p-2 hover:bg-[#F0F2F2]" aria-label="Close menu">
                  <X className="h-5 w-5" />
                </button>
              </div>
              {storeBlock}
              <NavList pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
              <Link href="/" className="mt-auto flex items-center gap-2 px-3 py-2 text-sm text-[#007185] hover:underline">
                View storefront <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
