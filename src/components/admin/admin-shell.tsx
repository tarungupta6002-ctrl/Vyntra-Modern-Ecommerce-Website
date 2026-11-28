'use client';

import React from 'react';
import {
  LayoutDashboard,
  LifeBuoy,
  Package,
  RefreshCw,
  ShieldCheck,
  Star,
  Store,
  Tag,
  TrendingUp,
  Trophy,
  Truck,
  Wallet,
  ClipboardList,
} from 'lucide-react';
import { ConsoleShell, type ConsoleNavGroup } from '@/components/console/console-shell';

const NAV: ConsoleNavGroup[] = [
  { items: [{ name: 'Overview', href: '/admin', icon: LayoutDashboard, exact: true }] },
  {
    label: 'Catalog',
    items: [
      { name: 'Products', href: '/admin/products', icon: Package },
      { name: 'Seller offers', href: '/admin/offers', icon: Tag },
      { name: 'Buy Box', href: '/admin/buy-box', icon: Trophy },
      { name: 'Reviews', href: '/admin/reviews', icon: Star },
    ],
  },
  {
    label: 'Orders',
    items: [
      { name: 'Orders', href: '/admin/orders', icon: ClipboardList },
      { name: 'Shipments', href: '/admin/shipments', icon: Truck },
      { name: 'Returns & refunds', href: '/admin/returns', icon: RefreshCw },
    ],
  },
  { label: 'Sellers', items: [{ name: 'Vendors', href: '/admin/vendors', icon: Store }] },
  {
    label: 'Money',
    items: [
      { name: 'Payouts', href: '/admin/payouts', icon: Wallet },
      { name: 'Revenue', href: '/admin/revenue', icon: TrendingUp },
    ],
  },
  { label: 'Customers', items: [{ name: 'Support', href: '/admin/support', icon: LifeBuoy }] },
];

/** Admin frame. */
export function AdminShell({
  user,
  children,
}: {
  user: { name: string; email: string; role: string };
  children: React.ReactNode;
}) {
  return (
    <ConsoleShell
      title="Admin"
      homeHref="/admin"
      navGroups={NAV}
      user={{ name: user.name, email: user.email }}
      menuLinks={[
        { label: 'Seller Central', href: '/vendor/products' },
        { label: 'Your customer account', href: '/account' },
      ]}
      sideBlock={
        <div className="flex items-center gap-2.5 rounded-lg border border-[#E3E6E6] bg-[#F7F8F8] px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#131921] text-[#FFD814]">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#0F1111]">Vyntra admin</p>
            <p className="text-xs text-[#565959]">{user.role === 'SUPER_ADMIN' ? 'Super admin' : 'Admin'}</p>
          </div>
        </div>
      }
    >
      {children}
    </ConsoleShell>
  );
}
