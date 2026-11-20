'use client';

import React from 'react';
import { DollarSign } from 'lucide-react';

interface ProductPricingSectionProps {
  price: string;
  setPrice: (val: string) => void;
  originalPrice: string;
  setOriginalPrice: (val: string) => void;
  discountPercent: number;
}

export function ProductPricingSection({
  price,
  setPrice,
  originalPrice,
  setOriginalPrice,
  discountPercent,
}: ProductPricingSectionProps) {
  return (
    <section className="bg-white rounded-2xl border border-[#D5D9D9] p-6 shadow-sm space-y-6">
      <div className="flex items-center gap-2 pb-3 border-b border-[#D5D9D9]">
        <DollarSign className="h-4 w-4 text-[#007185]" />
        <h2 className="font-headline font-bold text-base text-[#0F1111]">2. Pricing &amp; Commercials</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Selling Price */}
        <div className="space-y-1">
          <label htmlFor="vendor-selling-price" className="block text-xs font-bold text-[#0F1111]">
            Selling Price (₹ INR) <span className="text-rose-600">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-xs font-bold text-[#565959]">₹</span>
            <input
              id="vendor-selling-price"
              type="number"
              min="1"
              step="1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="2499"
              className="w-full pl-7 pr-3 py-2 text-xs font-mono font-bold rounded-lg border border-[#D5D9D9] focus:outline-none focus:border-[#007185] bg-white"
            />
          </div>
          <p className="text-[10px] text-[#565959]">Final amount charged to customer inclusive of taxes.</p>
        </div>

        {/* Original MRP */}
        <div className="space-y-1">
          <label htmlFor="vendor-original-mrp" className="block text-xs font-bold text-[#0F1111]">Original MRP (₹ INR)</label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-xs font-bold text-[#565959]">₹</span>
            <input
              id="vendor-original-mrp"
              type="number"
              min="1"
              step="1"
              value={originalPrice}
              onChange={(e) => setOriginalPrice(e.target.value)}
              placeholder="4999"
              className="w-full pl-7 pr-3 py-2 text-xs font-mono font-bold rounded-lg border border-[#D5D9D9] focus:outline-none focus:border-[#007185] bg-white"
            />
          </div>
          <p className="text-[10px] text-[#565959]">Used to display strikethrough discount badge.</p>
        </div>

        {/* Discount Preview Pill */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-[#0F1111]">Marketplace Offer Preview</label>
          <div className="h-[38px] px-3.5 rounded-lg bg-[#F7F8F8] border border-[#D5D9D9] flex items-center justify-between">
            <span className="text-xs text-[#565959]">Calculated Deal:</span>
            {discountPercent > 0 ? (
              <span className="bg-[#CC0C39] text-white text-[11px] font-extrabold px-2 py-0.5 rounded">
                {discountPercent}% OFF
              </span>
            ) : (
              <span className="text-xs font-bold text-[#565959]">Regular Price</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
