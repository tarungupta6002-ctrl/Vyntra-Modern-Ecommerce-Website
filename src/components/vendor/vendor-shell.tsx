'use client';

import React from 'react';
import { Image as ImageIcon, MapPin, Package, RotateCcw, Store, Truck, Wallet } from 'lucide-react';
import { ConsoleShell, type ConsoleNavGroup } from '@/components/console/console-shell';

export interface VendorShellIdentity {
  name: string;
  email: string;
  storeName: string;
  isVerified: boolean;
}

const NAV: ConsoleNavGroup[] = [
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
  { label: 'Payments', items: [{ name: 'Earnings & payouts', href: '/vendor/payouts', icon: Wallet }] },
  { label: 'Settings', items: [{ name: 'Pickup addresses', href: '/vendor/pickup-addresses', icon: MapPin }] },
];

/** Seller Central frame. */
export function VendorShell({ identity, children }: { identity: VendorShellIdentity; children: React.ReactNode }) {
  return (
    <ConsoleShell
      title="Seller Central"
      homeHref="/vendor/products"
      navGroups={NAV}
      user={{ name: identity.name, email: identity.email }}
      menuLinks={[{ label: 'Your customer account', href: '/account' }]}
      sideBlock={
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
      }
    >
      {children}
    </ConsoleShell>
  );
}
