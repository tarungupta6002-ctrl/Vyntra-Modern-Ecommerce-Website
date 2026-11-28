'use client';

import { notFound, useParams } from 'next/navigation';
import { FashionListing } from '@/components/catalog/fashion-pages';
import { FASHION_HUBS } from '@/lib/category-routes';

export default function FashionHubPage() {
  const params = useParams();
  const hub = String(params?.hub || '');
  if (!FASHION_HUBS.includes(hub)) notFound();
  return <FashionListing pageKey={hub} basePath={`/fashion/${hub}`} />;
}
