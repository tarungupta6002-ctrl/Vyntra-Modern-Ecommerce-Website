import React, { Suspense } from 'react';
import { SellPortal } from '@/components/vendor/sell-portal';

export const metadata = {
  title: 'Add Products & Offers | Seller Central | Vyntra',
  description: 'Sell existing catalog products or request new artisanal product listings on Vyntra Marketplace.',
};

export default function VendorNewProductPage() {
  return (
    <div className="py-2">
      <Suspense fallback={<div className="p-8 text-center text-xs font-bold text-[#565959]">Loading Seller Portal...</div>}>
        <SellPortal />
      </Suspense>
    </div>
  );
}
