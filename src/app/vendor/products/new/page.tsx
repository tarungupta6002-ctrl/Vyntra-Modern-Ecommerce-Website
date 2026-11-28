import React, { Suspense } from 'react';
import { SellPortal } from '@/components/vendor/sell-portal';

export const metadata = {
  title: 'Add a product | Vyntra seller',
  description: 'Add your offer to a product on Vyntra, or create a new listing.',
};

export default function VendorNewProductPage() {
  return (
    <div className="py-2">
      <Suspense fallback={<div className="p-8 text-center text-xs font-bold text-[#565959]">Loading…</div>}>
        <SellPortal />
      </Suspense>
    </div>
  );
}
