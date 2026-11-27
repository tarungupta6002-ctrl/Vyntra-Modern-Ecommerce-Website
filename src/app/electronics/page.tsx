'use client';

import React, { Suspense } from 'react';
import { Laptop, Headphones, Watch, Tablet, Gamepad2, Camera, Smartphone } from 'lucide-react';
import { DepartmentListing, type DepartmentConfig } from '@/components/catalog/department-listing';
import { DEPARTMENT_WORDS } from '@/lib/search';

const ELECTRONICS: DepartmentConfig = {
  departmentSlug: 'electronics',
  basePath: '/electronics',
  eyebrow: 'Tech & gadgets',
  title: 'Electronics',
  description:
    'Laptops, audio, smartwatches, tablets, gaming gear and cameras from verified sellers. Compare specs and prices in one place.',
  noun: { one: 'electronics', many: 'gadgets' },
  allLabel: 'All electronics',
  types: [
    { slug: 'laptops', name: 'Laptops', icon: Laptop, match: /\b(laptops?|notebooks?|macbooks?|ultrabooks?)\b/ },
    {
      slug: 'audio-headphones',
      name: 'Audio & headphones',
      icon: Headphones,
      match: /\b(headphones?|earphones?|earbuds?|speakers?|soundbars?|tws)\b/,
    },
    { slug: 'smartwatches-wearables', name: 'Smartwatches', icon: Watch, match: /\b(smart ?watch(es)?|fitness bands?|wearables?)\b/ },
    { slug: 'tablets-ipads', name: 'Tablets', icon: Tablet, match: /\b(tablets?|ipads?)\b/ },
    { slug: 'gaming-accessories', name: 'Gaming & PC', icon: Gamepad2, match: /\b(gaming|consoles?|keyboards?|mouse|controllers?)\b/ },
    { slug: 'cameras-photography', name: 'Cameras', icon: Camera, match: /\b(cameras?|dslr|mirrorless|lens(es)?)\b/ },
    // Phones have their own page: this tile links there and they're left out of this listing.
    { slug: 'mobiles', name: 'Mobiles', icon: Smartphone, href: '/mobiles' },
  ],
  excludeCategorySlugs: ['mobiles'],
  searchStopWords: DEPARTMENT_WORDS.electronics,
  priceBuckets: [
    { id: 'under-10000', label: 'Under ₹10,000', min: 0, max: 10000 },
    { id: '10000-30000', label: '₹10,000 – ₹30,000', min: 10000, max: 30000 },
    { id: '30000-60000', label: '₹30,000 – ₹60,000', min: 30000, max: 60000 },
    { id: '60000-plus', label: 'Over ₹60,000', min: 60000, max: Infinity },
  ],
};

export default function ElectronicsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F5F6F7]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007185]" />
        </div>
      }
    >
      <DepartmentListing config={ELECTRONICS} />
    </Suspense>
  );
}
