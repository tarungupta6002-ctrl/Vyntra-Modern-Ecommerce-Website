/**
 * Which page shows a catalog category. Plain data (no React), so both server code (product
 * breadcrumbs) and client pages can use it. Keep FASHION_CATEGORY_PAGES in step with the keys
 * of FASHION_PAGES in components/catalog/fashion-pages.tsx.
 */

/** Departments with their own landing page. */
export const DEPARTMENT_PAGES: Record<string, string> = {
  appliances: '/appliances',
  electronics: '/electronics',
  mobiles: '/mobiles',
  books: '/books',
};

/** The Fashion sections, shown at /fashion/<slug>. */
export const FASHION_HUBS = ['women', 'men', 'kids', 'bags-luggage'];

/** Fashion categories with their own /category/<slug> page. */
const FASHION_CATEGORY_PAGES = [
  'womens-ethnic-wear',
  'western-wear',
  'womens-shoes',
  'womens-watches',
  'womens-jewellery',
  'womens-eyewear',
  'womens-handbags',
  'womens-lingerie',
  'mens-clothing',
  'mens-shoes',
  'mens-watches',
  'mens-accessories',
  'mens-eyewear',
  'boys-clothing',
  'girls-clothing',
  'baby-clothing',
  'bags-backpacks',
  'luggage',
];

/** Categories with no page of their own that are best shown on a related page. */
const FASHION_ALIASES: Record<string, string> = {
  'womens-clothing': '/fashion/women',
  'kids-shoes': '/category/shoes?subcategory=kids-shoes',
};

/**
 * The page for the category at `chain[i]`, where `chain` is the category path from the root.
 * A category without its own page opens its parent's page with it selected, when the parent
 * page lists it as a type; otherwise the general catalog filtered to it.
 */
export function categoryHref(chain: string[], i: number): string {
  const slug = chain[i];
  const inFashion = chain[0] === 'fashion';
  if (DEPARTMENT_PAGES[slug]) return DEPARTMENT_PAGES[slug];
  if (slug === 'fashion') return '/fashion';
  if (inFashion && FASHION_HUBS.includes(slug)) return `/fashion/${slug}`;
  if (inFashion && FASHION_ALIASES[slug]) return FASHION_ALIASES[slug];
  if (inFashion && FASHION_CATEGORY_PAGES.includes(slug)) return `/category/${slug}`;

  const fallback = `/products?category=${encodeURIComponent(slug)}`;
  if (i === 0) return fallback;
  const parent = categoryHref(chain, i - 1);
  // The parent's listing page selects the type from ?subcategory= (unknown values show everything).
  if (parent.startsWith('/products') || parent.includes('?')) return fallback;
  return `${parent}?subcategory=${encodeURIComponent(slug)}`;
}
