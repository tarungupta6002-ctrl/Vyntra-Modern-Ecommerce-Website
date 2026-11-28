'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { BookOpen, Home, Laptop, Refrigerator, Shirt, Sparkles } from 'lucide-react';
import { DepartmentListing, type DepartmentConfig, type DepartmentType } from '@/components/catalog/department-listing';
import { PageLoader } from '@/components/ui/loading-spinner';

/**
 * All products and search results: the shared listing over the whole catalog. Optional URL
 * params: q / search (search words), brand, category (limits the list to one category branch).
 */

const PRICE_BUCKETS = [
  { id: 'under-500', label: 'Under ₹500', min: 0, max: 500 },
  { id: '500-2000', label: '₹500 – ₹2,000', min: 500, max: 2000 },
  { id: '2000-10000', label: '₹2,000 – ₹10,000', min: 2000, max: 10000 },
  { id: '10000-50000', label: '₹10,000 – ₹50,000', min: 10000, max: 50000 },
  { id: '50000-plus', label: 'Over ₹50,000', min: 50000, max: Infinity },
];

/** The catalog's departments (root categories); the tiles filter this page to one of them. */
const DEPARTMENTS: DepartmentType[] = [
  { slug: 'fashion', name: 'Fashion', icon: Shirt },
  { slug: 'electronics', name: 'Electronics and mobiles', icon: Laptop },
  { slug: 'appliances', name: 'Appliances', icon: Refrigerator },
  { slug: 'books', name: 'Books', icon: BookOpen },
  { slug: 'beauty-wellness', name: 'Beauty and personal care', icon: Sparkles },
  { slug: 'home-living', name: 'Home and kitchen', icon: Home },
];

function humanize(slug: string) {
  const s = slug.replace(/-/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function ProductsListing() {
  const params = useSearchParams();
  const query = (params.get('q') || params.get('search') || '').trim();
  const brand = (params.get('brand') || '').trim();
  const category = (params.get('category') || '').trim().toLowerCase();
  const newest = params.get('sort') === 'newest';
  const department = DEPARTMENTS.find((d) => d.slug === category);

  const scope = category ? department?.name ?? humanize(category) : '';
  const title = brand || scope || (query ? 'Search results' : newest ? 'New arrivals' : 'All products');
  const description = query
    ? `Products matching “${query}”${scope && !brand ? ` in ${scope.toLowerCase()}` : ''}.`
    : brand
    ? `Everything from ${brand} on Vyntra.`
    : scope
    ? `Everything in ${scope.toLowerCase()} on Vyntra.`
    : newest
    ? 'The latest listings from sellers on Vyntra, newest first.'
    : 'Everything on Vyntra, from every seller.';

  const config: DepartmentConfig = {
    // '' loads the whole catalog; a category param limits it to that branch.
    departmentSlug: category,
    basePath: '/products',
    title,
    description,
    noun: { one: 'product', many: 'products' },
    allLabel: 'All products',
    types: category ? [] : DEPARTMENTS,
    searchStopWords: [],
    priceBuckets: PRICE_BUCKETS,
    parent: category || brand ? { label: 'All products', href: '/products' } : undefined,
  };

  return <DepartmentListing key={category} config={config} />;
}

export default function ProductsPage() {
  // useSearchParams needs a Suspense boundary in Next 14.
  return (
    <Suspense fallback={<PageLoader minHeight="min-h-[calc(100vh-220px)]" />}>
      <ProductsListing />
    </Suspense>
  );
}
