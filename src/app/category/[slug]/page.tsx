'use client';

import { redirect, useParams } from 'next/navigation';
import { FashionListing } from '@/components/catalog/fashion-pages';
import { FASHION_HUBS } from '@/lib/category-routes';

/** Old ethnic-wear sub-page slugs -> the ethnic wear listing with that type selected. */
const ETHNIC_ALIASES: Record<string, string> = {
  kurtas: 'womens-kurtas',
  salwarsuits: 'womens-salwarsuits',
  lehengas: 'womens-lehengas',
};


export default function CategoryPage() {
  const params = useParams();
  const slug = String(params?.slug || '');
  if (ETHNIC_ALIASES[slug]) redirect(`/category/womens-ethnic-wear?subcategory=${ETHNIC_ALIASES[slug]}`);
  if (FASHION_HUBS.includes(slug)) redirect(`/fashion/${slug}`);
  return <FashionListing pageKey={slug} basePath={`/category/${slug}`} />;
}
