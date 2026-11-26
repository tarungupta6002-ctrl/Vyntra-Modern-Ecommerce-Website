import { DetailedProduct } from './products';

// Demo products removed: catalog pages show only real products from the database.
export const FALLBACK_MOBILES: DetailedProduct[] = [];

const MOBILES_MAP = new Map<string, DetailedProduct>();
for (const p of FALLBACK_MOBILES) {
  MOBILES_MAP.set(p.slug.toLowerCase(), p);
}

export function getMobileDetailedProductBySlug(slug: string): DetailedProduct | undefined {
  if (!slug) return undefined;
  return MOBILES_MAP.get(slug.toLowerCase());
}

export function getAllMobileProductSlugs(): string[] {
  return FALLBACK_MOBILES.map((m) => m.slug);
}
