'use client';

import React, { Suspense } from 'react';
import { Smartphone } from 'lucide-react';
import { DepartmentListing, type DepartmentConfig } from '@/components/catalog/department-listing';
import { DEPARTMENT_WORDS } from '@/lib/search';

const MOBILES: DepartmentConfig = {
  departmentSlug: 'mobiles',
  basePath: '/mobiles',
  parent: { label: 'Electronics', href: '/electronics' },
  title: 'Mobiles',
  description:
    'Smartphones from verified sellers. Filter by RAM, storage, 5G and operating system, and compare prices across variants.',
  noun: { one: 'phone', many: 'phones' },
  allLabel: 'All phones',
  // Phones have no sub-categories: the tiles are the brands on sale.
  types: [],
  tiles: 'brands',
  brandIcon: Smartphone,
  // Every phone uses the same template, so RAM / storage / network / OS filters show straight away.
  facetsForAll: true,
  searchStopWords: DEPARTMENT_WORDS.mobiles,
  priceBuckets: [
    { id: 'under-15000', label: 'Under ₹15,000', min: 0, max: 15000 },
    { id: '15000-30000', label: '₹15,000 – ₹30,000', min: 15000, max: 30000 },
    { id: '30000-60000', label: '₹30,000 – ₹60,000', min: 30000, max: 60000 },
    { id: '60000-plus', label: 'Over ₹60,000', min: 60000, max: Infinity },
  ],
};

export default function MobilesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F5F6F7]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007185]" />
        </div>
      }
    >
      <DepartmentListing config={MOBILES} />
    </Suspense>
  );
}
