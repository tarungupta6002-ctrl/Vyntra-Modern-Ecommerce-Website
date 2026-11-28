'use client';

import React from 'react';
import { IndianRupee } from 'lucide-react';

interface ProductPricingSectionProps {
  price: string;
  setPrice: (val: string) => void;
  originalPrice: string;
  setOriginalPrice: (val: string) => void;
  discountPercent: number;
}

const priceInput =
  'w-full rounded-lg border border-[#D5D9D9] bg-white py-2 pl-7 pr-3 text-sm tabular-nums focus:border-[#007185] focus:outline-none focus:ring-1 focus:ring-[#007185]';

export function ProductPricingSection({
  price,
  setPrice,
  originalPrice,
  setOriginalPrice,
  discountPercent,
}: ProductPricingSectionProps) {
  return (
    <section className="space-y-5 rounded-xl border border-[#D5D9D9] bg-white p-6">
      <div className="border-b border-[#D5D9D9] pb-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-[#0F1111]">
          <IndianRupee className="h-4 w-4 text-[#007185]" aria-hidden="true" />
          Price
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="space-y-1">
          <label htmlFor="vendor-selling-price" className="block text-sm font-semibold text-[#0F1111]">
            Selling price <span className="text-[#B12704]">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-sm text-[#565959]">₹</span>
            <input
              id="vendor-selling-price"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={priceInput}
            />
          </div>
          <p className="text-xs text-[#565959]">What the shopper pays, including taxes.</p>
        </div>

        <div className="space-y-1">
          <label htmlFor="vendor-original-mrp" className="block text-sm font-semibold text-[#0F1111]">
            MRP <span className="font-normal text-[#565959]">(optional)</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-sm text-[#565959]">₹</span>
            <input
              id="vendor-original-mrp"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={originalPrice}
              onChange={(e) => setOriginalPrice(e.target.value)}
              className={priceInput}
            />
          </div>
          <p className="text-xs text-[#565959]">The maximum retail price printed on the product or its box.</p>
        </div>

        <div className="space-y-1">
          <p className="block text-sm font-semibold text-[#0F1111]">Shoppers see</p>
          <div className="flex h-[38px] items-center rounded-lg border border-[#D5D9D9] bg-[#F7F8F8] px-3.5 text-sm" aria-live="polite">
            {discountPercent > 0 ? (
              <span>
                <strong className="text-[#0F1111]">{discountPercent}% off</strong>{' '}
                <span className="text-[#565959]">the MRP</span>
              </span>
            ) : (
              <span className="text-[#565959]">The price, with no discount</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
