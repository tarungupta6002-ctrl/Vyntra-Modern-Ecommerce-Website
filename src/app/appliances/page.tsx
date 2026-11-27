'use client';

import React, { Suspense } from 'react';
import { Refrigerator, WashingMachine, Wind, CookingPot, Home } from 'lucide-react';
import { DepartmentListing, type DepartmentConfig } from '@/components/catalog/department-listing';
import { DEPARTMENT_WORDS } from '@/lib/search';

const APPLIANCES: DepartmentConfig = {
  departmentSlug: 'appliances',
  basePath: '/appliances',
  title: 'Appliances',
  description:
    'Refrigerators, washing machines, air conditioners and kitchen appliances from verified sellers. Compare energy ratings, prices and specs in one place.',
  noun: { one: 'appliance', many: 'appliances' },
  allLabel: 'All appliances',
  types: [
    { slug: 'refrigerators', name: 'Refrigerators', icon: Refrigerator, match: /\b(refrigerators?|fridges?)\b/ },
    { slug: 'washing-machines', name: 'Washing machines', icon: WashingMachine, match: /\b(washing machines?|washers?|dryers?)\b/ },
    { slug: 'air-conditioners', name: 'Air conditioners', icon: Wind, match: /\b(air conditioners?|acs?)\b/ },
    {
      slug: 'kitchen-appliances',
      name: 'Kitchen & cooking',
      icon: CookingPot,
      match: /\b(microwaves?|ovens?|chimneys?|air fryers?|induction|cooktops?|mixer|grinders?|dishwashers?|kettles?|toasters?)\b/,
    },
    {
      slug: 'home-appliances',
      name: 'Home essentials',
      icon: Home,
      match: /\b(water purifiers?|purifiers?|geysers?|water heaters?|vacuum|irons?|fans?|room heaters?)\b/,
    },
  ],
  searchStopWords: DEPARTMENT_WORDS.appliances,
  priceBuckets: [
    { id: 'under-15000', label: 'Under ₹15,000', min: 0, max: 15000 },
    { id: '15000-30000', label: '₹15,000 – ₹30,000', min: 15000, max: 30000 },
    { id: '30000-50000', label: '₹30,000 – ₹50,000', min: 30000, max: 50000 },
    { id: '50000-plus', label: 'Over ₹50,000', min: 50000, max: Infinity },
  ],
  energyRating: true,
};

export default function AppliancesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F5F6F7]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007185]" />
        </div>
      }
    >
      <DepartmentListing config={APPLIANCES} />
    </Suspense>
  );
}
