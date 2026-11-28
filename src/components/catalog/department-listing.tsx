'use client';

/**
 * Department listing page (Appliances, Electronics, ...): category tiles with live counts, honest
 * filters with per-option counts (incl. category attribute facets), removable chips, sorting and
 * a mobile filter drawer. Products come from the department's branch of the catalog tree.
 */

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { matchesSearchQuery } from '@/lib/search';
import {
  LayoutGrid,
  SlidersHorizontal,
  X,
  ChevronRight,
  ChevronDown,
  Star,
  Search,
  PackageOpen,
} from 'lucide-react';
import { CategoryProductCard } from '@/components/products/category-product-card';
import { CategoryProductItem, useCategoryProducts } from '@/hooks/use-category-products';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';
import { formatINR } from '@/lib/utils';
import {
  getTemplateForCategoryPath,
  bucketFor,
  type AttributeDef,
  type AttributeTemplate,
} from '@/lib/catalog/attributes';

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

export interface DepartmentType {
  /** Category slug in the catalog tree (child of the department). */
  slug: string;
  name: string;
  icon: React.ElementType;
  /** Text fallback for products whose category path doesn't name the type. */
  match?: RegExp;
  /** A tile that links to another page instead of filtering (e.g. Mobiles has its own page). */
  href?: string;
}

export interface DepartmentConfig {
  /** Root category slug; products come from this branch of the catalog tree. */
  departmentSlug: string;
  basePath: string;
  title: string;
  description: string;
  /** e.g. { one: 'appliance', many: 'appliances' } */
  noun: { one: string; many: string };
  allLabel: string;
  types: DepartmentType[];
  /** Child categories shown on their own page, left out of this listing. */
  excludeCategorySlugs?: string[];
  /** Words ignored in search on this page ("samsung laptop" on Electronics -> "samsung"). */
  searchStopWords: readonly string[];
  priceBuckets: ReadonlyArray<{ id: string; label: string; min: number; max: number }>;
  /** Show the BEE energy-rating facet. */
  energyRating?: boolean;
  /**
   * What the tiles under the heading are: child categories (default) or the brands on sale
   * (for a department without sub-categories, e.g. Mobiles). Brand tiles set the brand filter.
   */
  tiles?: 'categories' | 'brands';
  /** Icon for brand tiles without a photo. */
  brandIcon?: React.ElementType;
  /** Show attribute filters without choosing a type (all products share one template, e.g. phones). */
  facetsForAll?: boolean;
  /** Parent page in the breadcrumb (e.g. Electronics for Mobiles). */
  parent?: { label: string; href: string };
  /** What "brand" means here (e.g. "Author" for books). */
  brandLabel?: string;
  /**
   * Show only products that belong to one of the types (e.g. a Shoes page drawn from the whole
   * Fashion department lists men's, women's and kids' shoes and nothing else).
   */
  restrictToTypes?: boolean;
}

/** All attribute value sets of a listing: the listing itself plus each variant (Amazon: any child matches). */
const attributeSets = (p: CategoryProductItem) => [p.attributes || {}, ...(p.variantAttributes || [])];

/** BEE star ratings (1-5) a listing is sold in: from attributes (incl. variants), else specs or title. */
function energyStarsOf(p: CategoryProductItem): number[] {
  const fromAttrs = attributeSets(p)
    .map((a) => (typeof a.energy_rating === 'string' ? a.energy_rating.match(/^([1-5])\s*star/i) : null))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => Number(m[1]));
  if (fromAttrs.length > 0) return Array.from(new Set(fromAttrs));
  if (typeof p.attributes?.energy_rating === 'string') return []; // e.g. "Not rated"
  const specs = p.specs || {};
  const specValue = Object.entries(specs).find(([k]) => /energy|bee|star rating/i.test(k))?.[1];
  const m = String(specValue ?? '').match(/([1-5])\s*star/i) || (p.title || '').match(/\b([1-5])\s*star\b/i);
  return m ? [Number(m[1])] : [];
}

/** The product's attribute template (AC, refrigerator, ...), from its category path. */
const templateOf = (p: CategoryProductItem) => getTemplateForCategoryPath(p.categoryPath || [p.category]);

/** Filter options a listing falls into for an attribute (enum values or range labels), across its variants. */
function attributeOptionsOf(p: CategoryProductItem, def: AttributeDef): string[] {
  const out = new Set<string>();
  for (const attrs of attributeSets(p)) {
    const v = attrs[def.key];
    if (v === undefined || v === null || v === '') continue;
    if (def.type === 'enum') out.add(String(v));
    else {
      const label = Number.isFinite(Number(v)) ? bucketFor(def, Number(v))?.label : undefined;
      if (label) out.add(label);
    }
  }
  return Array.from(out);
}

const SORTS = [
  { id: 'relevance', label: 'Relevance' },
  { id: 'price-low', label: 'Price: low to high' },
  { id: 'price-high', label: 'Price: high to low' },
  { id: 'discount', label: 'Biggest discount' },
  { id: 'rating', label: 'Customer rating' },
  { id: 'newest', label: 'Newest first' },
] as const;

type SortId = (typeof SORTS)[number]['id'];

const discountPct = (p: CategoryProductItem) =>
  p.originalPrice > p.price ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : 0;

/* ------------------------------------------------------------------ */
/* Small UI pieces                                                     */
/* ------------------------------------------------------------------ */

function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-stone-200/80 last:border-b-0 py-4 first:pt-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between text-left text-[13px] font-bold text-[#0F1111]"
      >
        {title}
        <ChevronDown className={`h-4 w-4 text-stone-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

function CheckRow({
  checked,
  onChange,
  label,
  count,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  label: React.ReactNode;
  count?: number;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-center justify-between gap-2 py-1 text-[13px] ${
        disabled ? 'text-stone-400 cursor-not-allowed' : 'text-[#0F1111] cursor-pointer hover:text-[#007185]'
      }`}
    >
      <span className="flex items-center gap-2.5 min-w-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="h-4 w-4 rounded border-stone-300 text-[#007185] focus:ring-[#007185] focus:ring-offset-0"
        />
        <span className="truncate">{label}</span>
      </span>
      {count !== undefined && <span className="text-xs text-stone-500 tabular-nums">{count}</span>}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

/** "1024 GB" reads better as "1 TB". */
function formatSpecValue(def: AttributeDef, v: string | number): string {
  if (def.type !== 'number') return String(v);
  const n = Number(v);
  if (def.unit === 'GB' && n >= 1024 && n % 1024 === 0) return `${n / 1024} TB`;
  return `${n.toLocaleString('en-IN')} ${def.unit}`;
}

/** The listing's real specs from its template (variant values combined, e.g. "512 GB / 1 TB"). */
function specRowsOf(p: CategoryProductItem): Array<{ label: string; value: string }> {
  const tpl = templateOf(p);
  if (!tpl) return [];
  return tpl.attributes
    .map((def) => {
      const vals = Array.from(
        new Set(attributeSets(p).map((a) => a[def.key]).filter((v) => v !== undefined && v !== ''))
      ) as Array<string | number>;
      if (vals.length === 0) return null;
      if (def.type === 'number') vals.sort((a, b) => Number(a) - Number(b));
      return { label: def.label, value: vals.map((v) => formatSpecValue(def, v)).join(' / ') };
    })
    .filter((r): r is { label: string; value: string } => r !== null);
}

export function DepartmentListing({ config }: { config: DepartmentConfig }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const PRICE_BUCKETS = config.priceBuckets;
  const filterTypes = config.types.filter((t) => !t.href);
  const brandMode = config.tiles === 'brands';
  const BRAND_PREFIX = 'brand:';
  const { one: nounOne, many: nounMany } = config.noun;

  /** Which type (child category) a product belongs to: from its category path, else from its text. */
  const typeOf = (p: CategoryProductItem): string | null => {
    const fromTree = (p.categoryPath || []).find((slug) => filterTypes.some((t) => t.slug === slug));
    if (fromTree) return fromTree;
    const text = `${(p.category || '').replace(/-/g, ' ')} ${p.subCategory || ''} ${p.title || ''}`.toLowerCase();
    return filterTypes.find((t) => t.match?.test(text))?.slug ?? null;
  };

  const [type, setType] = useState<string>('all');
  const [brands, setBrands] = useState<string[]>([]);
  const [stars, setStars] = useState<number[]>([]);
  // Category-specific filters: attribute key -> selected options (enum values or range labels).
  const [attrFilters, setAttrFilters] = useState<Record<string, string[]>>({});
  const [priceBucket, setPriceBucket] = useState<string | null>(null);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortId>('relevance');
  const [searchQuery, setSearchQuery] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  const { addItem, openCart } = useCartStore();
  const { toggleItem, isInWishlist } = useWishlistStore();

  // URL is the source of truth for type, brand and search (header search + links land here).
  // Each param is synced on its own, so changing one (e.g. the type) keeps the other filters.
  const qParam = searchParams.get('q') || searchParams.get('search') || '';
  const subParam = searchParams.get('subcategory') || 'all';
  const brandParam = searchParams.get('brand') || '';
  // A link can pick the sort (e.g. New arrivals -> ?sort=newest).
  const sortParam = searchParams.get('sort') || '';
  useEffect(() => {
    if (SORTS.some((s) => s.id === sortParam)) setSortBy(sortParam as SortId);
  }, [sortParam]);
  useEffect(() => setSearchQuery(qParam), [qParam]);
  useEffect(() => {
    setType(filterTypes.some((t) => t.slug === subParam) ? subParam : 'all');
    setAttrFilters({});
  }, [subParam]);
  useEffect(() => {
    if (brandParam) setBrands((prev) => (prev.includes(brandParam) ? prev : [...prev, brandParam]));
  }, [brandParam]);

  // Lock page scroll while the mobile filter drawer is open; Esc closes it.
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [drawerOpen]);

  const setUrlParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const qs = params.toString();
    router.replace(qs ? `${config.basePath}?${qs}` : config.basePath, { scroll: false });
  };

  const { products: liveProducts, isLoading } = useCategoryProducts({
    categoryKey: config.departmentSlug,
    // Only products filed under this department in the catalog tree (keyword matching pulled in
    // unrelated items, e.g. "ac" inside "Acer").
    departmentSlug: config.departmentSlug,
  });

  const excluded = config.excludeCategorySlugs || [];
  const pathOf = (p: CategoryProductItem) => p.categoryPath || [p.category];
  const matchesSearch = (p: CategoryProductItem) =>
    matchesSearchQuery(
      searchQuery,
      [
        p.title,
        p.brand,
        p.subCategory,
        p.category,
        ...Object.values(p.specs || {}).map(String),
        ...Object.values(p.attributes || {}).map(String),
      ],
      config.searchStopWords
    );
  // A search narrows the whole page (heading counts, tiles and the spotlight), not only the grid.
  const products = useMemo(
    () =>
      liveProducts.filter(
        (p) =>
          !pathOf(p).some((slug) => excluded.includes(slug)) &&
          (!config.restrictToTypes || typeOf(p) !== null) &&
          (!searchQuery.trim() || matchesSearch(p))
      ),
    [liveProducts, searchQuery] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Tiles: child categories, or (brand mode) the brands on sale, most products first.
  const TILES: DepartmentType[] = useMemo(() => {
    const all = { slug: 'all', name: config.allLabel, icon: LayoutGrid } as DepartmentType;
    if (!brandMode) return [all, ...config.types];
    const byBrand = new Map<string, number>();
    products.forEach((p) => p.brand && byBrand.set(p.brand, (byBrand.get(p.brand) || 0) + 1));
    const brandsOnSale = Array.from(byBrand.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name]) => ({ slug: `${BRAND_PREFIX}${name}`, name, icon: config.brandIcon || LayoutGrid }));
    return [all, ...brandsOnSale];
  }, [products]); // eslint-disable-line react-hooks/exhaustive-deps

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: products.length };
    if (brandMode) products.forEach((p) => (counts[`${BRAND_PREFIX}${p.brand}`] = (counts[`${BRAND_PREFIX}${p.brand}`] || 0) + 1));
    products.forEach((p) => {
      const t = typeOf(p);
      if (t) counts[t] = (counts[t] || 0) + 1;
    });
    // Link tiles (e.g. Mobiles) count the products on the page they lead to.
    config.types
      .filter((t) => t.href)
      .forEach((t) => {
        counts[t.slug] = liveProducts.filter((p) => pathOf(p).includes(t.slug)).length;
      });
    return counts;
  }, [products, liveProducts]); // eslint-disable-line react-hooks/exhaustive-deps

  const min = minPrice && Number(minPrice) >= 0 ? Number(minPrice) : null;
  const max = maxPrice && Number(maxPrice) > 0 ? Number(maxPrice) : null;
  const priceRangeInvalid = min !== null && max !== null && min > max;

  // Attribute facets appear once a type is chosen (like Amazon): the fields of the templates its products use.
  // Each facet belongs to one template, so a product only matches facets of its own template.
  type Facet = { id: string; tpl: AttributeTemplate; def: AttributeDef; title: string };
  const inTypeScope = (p: CategoryProductItem) => type === 'all' || typeOf(p) === type;
  const attributeDefs: Facet[] = (() => {
    if (type === 'all' && !config.facetsForAll) return [];
    const templates: AttributeTemplate[] = [];
    products
      .filter(inTypeScope)
      .forEach((p) => {
        const t = templateOf(p);
        if (t && !templates.some((x) => x.id === t.id)) templates.push(t);
      });
    const several = templates.length > 1;
    return templates.flatMap((tpl) =>
      tpl.attributes
        // Energy rating has its own facet (it also reads specs for older listings).
        .filter((def) => def.key !== 'energy_rating')
        .map((def) => {
          const label = def.type === 'number' ? `${def.label} (${def.unit})` : def.label;
          return { id: `${tpl.id}:${def.key}`, tpl, def, title: several ? `${tpl.name} · ${label}` : label };
        })
    );
  })();
  const facetById = new Map(attributeDefs.map((f) => [f.id, f]));
  const facetOptionsOf = (p: CategoryProductItem, f: Facet): string[] =>
    templateOf(p)?.id === f.tpl.id ? attributeOptionsOf(p, f.def) : [];

  // Every filter except the one named, so facet counts show what each option would return.
  const applyFilters = (list: CategoryProductItem[], skip?: string) => {
    let out = list;
    if (type !== 'all') out = out.filter((p) => typeOf(p) === type);
    if (skip !== 'brand' && brands.length) {
      out = out.filter((p) => brands.some((b) => b.toLowerCase() === (p.brand || '').toLowerCase()));
    }
    if (skip !== 'stars' && stars.length) {
      out = out.filter((p) => energyStarsOf(p).some((s) => stars.includes(s)));
    }
    for (const [facetId, selected] of Object.entries(attrFilters)) {
      const facet = facetById.get(facetId);
      if (!facet || selected.length === 0 || skip === `attr:${facetId}`) continue;
      out = out.filter((p) => facetOptionsOf(p, facet).some((o) => selected.includes(o)));
    }
    if (skip !== 'price') {
      const bucket = PRICE_BUCKETS.find((b) => b.id === priceBucket);
      if (bucket) out = out.filter((p) => p.price >= bucket.min && p.price < bucket.max);
      if (!priceRangeInvalid) {
        if (min !== null) out = out.filter((p) => p.price >= min);
        if (max !== null) out = out.filter((p) => p.price <= max);
      }
    }
    if (minRating > 0) out = out.filter((p) => (p.reviews || 0) > 0 && (p.rating || 0) >= minRating);
    if (inStockOnly) out = out.filter((p) => p.inStock);
    return out;
  };

  const filtered = [...applyFilters(products)];
  if (sortBy === 'price-low') filtered.sort((a, b) => a.price - b.price);
  else if (sortBy === 'price-high') filtered.sort((a, b) => b.price - a.price);
  else if (sortBy === 'discount') filtered.sort((a, b) => discountPct(b) - discountPct(a));
  else if (sortBy === 'rating') filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  else if (sortBy === 'newest') filtered.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  const brandFacets = (() => {
    const base = applyFilters(products, 'brand');
    const all = Array.from(new Set(products.map((p) => p.brand).filter(Boolean))).sort((a, b) => a.localeCompare(b));
    return all.map((name) => ({
      name,
      count: base.filter((p) => (p.brand || '').toLowerCase() === name.toLowerCase()).length,
    }));
  })();

  const starFacets = (() => {
    const base = applyFilters(products, 'stars');
    const present = Array.from(
      new Set(products.flatMap(energyStarsOf))
    ).sort((a, b) => b - a);
    return present.map((s) => ({ stars: s, count: base.filter((p) => energyStarsOf(p).includes(s)).length }));
  })();

  const priceFacets = (() => {
    const base = applyFilters(products, 'price');
    return PRICE_BUCKETS.map((b) => ({ ...b, count: base.filter((p) => p.price >= b.min && p.price < b.max).length }));
  })();

  // Options for each attribute facet, in template order; only options some product actually has.
  const attributeFacets = attributeDefs
    .map((facet) => {
      const { def } = facet;
      const base = applyFilters(products, `attr:${facet.id}`);
      const allOptions = def.type === 'enum' ? def.options : def.buckets.map((b) => b.label);
      const inType = products.filter(inTypeScope);
      const selected = attrFilters[facet.id] || [];
      const options = allOptions
        .filter((o) => selected.includes(o) || inType.some((p) => facetOptionsOf(p, facet).includes(o)))
        .map((o) => ({ label: o, count: base.filter((p) => facetOptionsOf(p, facet).includes(o)).length }));
      return { facet, options };
    })
    .filter((f) => f.options.length > 0);

  const toggleAttr = (key: string, option: string) =>
    setAttrFilters((prev) => {
      const cur = prev[key] || [];
      const next = cur.includes(option) ? cur.filter((o) => o !== option) : [...cur, option];
      return { ...prev, [key]: next };
    });

  const hasReviewedProducts = products.some((p) => (p.reviews || 0) > 0);

  // Removable chips for everything that is narrowing the list.
  const activeChips: Array<{ key: string; label: string; clear: () => void }> = [];
  if (type !== 'all')
    activeChips.push({
      key: 'type',
      label: TILES.find((t) => t.slug === type)!.name,
      clear: () => setUrlParam('subcategory', null),
    });
  if (searchQuery.trim())
    activeChips.push({
      key: 'q',
      label: `“${searchQuery.trim()}”`,
      clear: () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('q');
        params.delete('search');
        const qs = params.toString();
        router.replace(qs ? `${config.basePath}?${qs}` : config.basePath, { scroll: false });
      },
    });
  brands.forEach((b) =>
    activeChips.push({
      key: `brand-${b}`,
      label: b,
      clear: () => {
        setBrands((prev) => prev.filter((x) => x !== b));
        if (searchParams.get('brand') === b) setUrlParam('brand', null);
      },
    })
  );
  stars.forEach((s) =>
    activeChips.push({ key: `star-${s}`, label: `${s} star energy`, clear: () => setStars((prev) => prev.filter((x) => x !== s)) })
  );
  if (priceBucket)
    activeChips.push({
      key: 'bucket',
      label: PRICE_BUCKETS.find((b) => b.id === priceBucket)!.label,
      clear: () => setPriceBucket(null),
    });
  if ((min !== null || max !== null) && !priceRangeInvalid)
    activeChips.push({
      key: 'custom-price',
      label: `${min !== null ? formatINR(min) : '₹0'} – ${max !== null ? formatINR(max) : 'any'}`,
      clear: () => {
        setMinPrice('');
        setMaxPrice('');
      },
    });
  if (minRating > 0) activeChips.push({ key: 'rating', label: `${minRating}★ & up`, clear: () => setMinRating(0) });
  if (inStockOnly) activeChips.push({ key: 'stock', label: 'In stock', clear: () => setInStockOnly(false) });
  Object.entries(attrFilters).forEach(([facetId, selected]) => {
    const facet = facetById.get(facetId);
    selected.forEach((o) =>
      activeChips.push({
        key: `attr-${facetId}-${o}`,
        label: facet && facet.def.type === 'enum' ? `${facet.def.label}: ${o}` : o,
        clear: () => toggleAttr(facetId, o),
      })
    );
  });

  const clearAll = () => {
    setBrands([]);
    setStars([]);
    setAttrFilters({});
    setPriceBucket(null);
    setMinPrice('');
    setMaxPrice('');
    setMinRating(0);
    setInStockOnly(false);
    router.replace(config.basePath, { scroll: false });
  };

  const handleAddToCart = (product: CategoryProductItem) => {
    addItem({
      id: product.id,
      productId: product.id,
      title: product.title,
      brand: product.brand,
      variantId: `var-${product.id}`,
      size: product.sizes?.[0] || 'Standard',
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      quantity: 1,
      vendorName: product.vendorName,
    });
    setAddedIds((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => setAddedIds((prev) => ({ ...prev, [product.id]: false })), 2000);
    openCart();
  };

  const brandCount = new Set(products.map((p) => p.brand).filter(Boolean)).size;
  const hasProducts = isLoading || products.length > 0;

  // A real product photo for each tile (link tiles use the products on the page they open).
  const tileImage = (slug: string, href?: string): string | undefined => {
    if (slug === 'all') return undefined;
    if (slug.startsWith(BRAND_PREFIX)) {
      const b = slug.slice(BRAND_PREFIX.length);
      return products.find((p) => p.brand === b && p.image)?.image;
    }
    const pool = href ? liveProducts.filter((p) => pathOf(p).includes(slug)) : products.filter((p) => typeOf(p) === slug);
    return pool.find((p) => p.image)?.image;
  };

  // The hero shows one real listing with its real specs, from the chosen category (all when none is
  // chosen): the in-stock one with the most detail. An empty category shows no card.
  const spotlight = useMemo(() => {
    const inScope = products.filter(
      (p) => inTypeScope(p) && (!brandMode || brands.length === 0 || brands.includes(p.brand))
    );
    const withImage = inScope.filter((p) => p.image);
    const pool = withImage.filter((p) => p.inStock).length > 0 ? withImage.filter((p) => p.inStock) : withImage;
    return [...pool].sort((a, b) => specRowsOf(b).length - specRowsOf(a).length)[0] || null;
  }, [products, type, brands]); // eslint-disable-line react-hooks/exhaustive-deps
  const spotlightSpecs = spotlight ? specRowsOf(spotlight).slice(0, 5) : [];
  const spotlightType = spotlight ? TILES.find((t) => t.slug === typeOf(spotlight))?.name : undefined;
  const selectedTypeName = TILES.find((t) => t.slug === type)?.name;

  /* ----------------------------- Filters panel ----------------------------- */
  const filtersPanel = (
    <div>
      {attributeFacets.map(({ facet, options }) => (
        <FilterSection key={facet.id} title={facet.title}>
          <div className="space-y-0.5">
            {options.map((o) => {
              const checked = (attrFilters[facet.id] || []).includes(o.label);
              return (
                <CheckRow
                  key={o.label}
                  label={o.label}
                  count={o.count}
                  checked={checked}
                  disabled={o.count === 0 && !checked}
                  onChange={() => toggleAttr(facet.id, o.label)}
                />
              );
            })}
          </div>
        </FilterSection>
      ))}

      {brandFacets.length > 0 && (
        <FilterSection title={config.brandLabel || 'Brand'}>
          <div className="space-y-0.5 max-h-56 overflow-y-auto pr-1">
            {brandFacets.map(({ name, count }) => (
              <CheckRow
                key={name}
                label={name}
                count={count}
                checked={brands.includes(name)}
                disabled={count === 0 && !brands.includes(name)}
                onChange={() =>
                  setBrands((prev) => (prev.includes(name) ? prev.filter((b) => b !== name) : [...prev, name]))
                }
              />
            ))}
          </div>
        </FilterSection>
      )}

      <FilterSection title="Price">
        <div className="space-y-0.5">
          {priceFacets.map((b) => (
            <CheckRow
              key={b.id}
              label={b.label}
              count={b.count}
              checked={priceBucket === b.id}
              disabled={b.count === 0 && priceBucket !== b.id}
              onChange={() => setPriceBucket((prev) => (prev === b.id ? null : b.id))}
            />
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <label className="sr-only" htmlFor="dept-min">Minimum price</label>
          <input
            id="dept-min"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Min ₹"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value.replace(/[^0-9]/g, ''))}
            className="w-full min-w-0 px-3 py-2 text-[13px] border border-stone-300 rounded-lg focus:outline-none focus:border-[#007185] focus:ring-1 focus:ring-[#007185]"
          />
          <span className="text-stone-400">–</span>
          <label className="sr-only" htmlFor="dept-max">Maximum price</label>
          <input
            id="dept-max"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Max ₹"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value.replace(/[^0-9]/g, ''))}
            className="w-full min-w-0 px-3 py-2 text-[13px] border border-stone-300 rounded-lg focus:outline-none focus:border-[#007185] focus:ring-1 focus:ring-[#007185]"
          />
        </div>
        {priceRangeInvalid && (
          <p role="alert" className="mt-1.5 text-xs text-[#B12704]">Minimum price is higher than the maximum.</p>
        )}
      </FilterSection>

      {config.energyRating && starFacets.length > 0 && (
        <FilterSection title="Energy rating (BEE)">
          <div className="space-y-0.5">
            {starFacets.map(({ stars: s, count }) => (
              <CheckRow
                key={s}
                label={
                  <span className="inline-flex items-center gap-1.5">
                    {s} star
                    <span className="text-[#007600] tracking-tighter" aria-hidden="true">
                      {'★'.repeat(s)}
                      <span className="text-stone-300">{'★'.repeat(5 - s)}</span>
                    </span>
                  </span>
                }
                count={count}
                checked={stars.includes(s)}
                disabled={count === 0 && !stars.includes(s)}
                onChange={() => setStars((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))}
              />
            ))}
          </div>
        </FilterSection>
      )}

      {hasReviewedProducts && (
        <FilterSection title="Customer rating">
          <div className="space-y-1">
            {[4, 3].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setMinRating(minRating === r ? 0 : r)}
                aria-pressed={minRating === r}
                className={`flex items-center gap-1.5 w-full px-2 py-1.5 rounded-lg text-[13px] text-left transition-colors ${
                  minRating === r ? 'bg-[#007185]/10 text-[#007185] font-bold' : 'text-[#0F1111] hover:bg-stone-100'
                }`}
              >
                <span className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${i < r ? 'fill-[#FFA41C] text-[#FFA41C]' : 'text-stone-300'}`}
                    />
                  ))}
                </span>
                & up
              </button>
            ))}
          </div>
        </FilterSection>
      )}

      <FilterSection title="Availability">
        <div className="space-y-0.5">
          <CheckRow label="In stock only" checked={inStockOnly} onChange={() => setInStockOnly((v) => !v)} />
        </div>
      </FilterSection>
    </div>
  );

  /* --------------------------------- View --------------------------------- */
  return (
    <div className="min-h-screen bg-[#F5F6F7] text-[#0F1111]">
      {/* Hero: what the department holds, and one real listing with its real specs */}
      <section className="border-b border-stone-200 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-4 pb-8">
          <nav aria-label="Breadcrumb" className="text-xs text-stone-500 flex items-center gap-1.5">
            <Link href="/" className="hover:text-[#007185] hover:underline">Home</Link>
            <ChevronRight className="h-3 w-3" />
            {config.parent && (
              <>
                <Link href={config.parent.href} className="hover:text-[#007185] hover:underline">{config.parent.label}</Link>
                <ChevronRight className="h-3 w-3" />
              </>
            )}
            <Link href={config.basePath} className="hover:text-[#007185] hover:underline">{config.title}</Link>
            {type !== 'all' && (
              <>
                <ChevronRight className="h-3 w-3" />
                <span className="text-[#0F1111] font-medium">{selectedTypeName}</span>
              </>
            )}
          </nav>

          <div className="mt-6 grid gap-8 lg:grid-cols-12 lg:items-center">
            <div className={spotlight ? 'lg:col-span-6 xl:col-span-7' : 'lg:col-span-12'}>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight font-headline leading-[1.05]">
                {config.title}
              </h1>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-stone-600">{config.description}</p>
              {!isLoading && products.length > 0 && (
                <p className="mt-4 text-sm text-stone-500">
                  <span className="font-semibold text-[#0F1111]">{products.length}</span>{' '}
                  {products.length === 1 ? 'product' : 'products'} from{' '}
                  <span className="font-semibold text-[#0F1111]">{brandCount}</span> {brandCount === 1 ? 'brand' : 'brands'}
                </p>
              )}
            </div>

            {spotlight && (
              <Link
                href={`/products/${spotlight.slug}`}
                className="group lg:col-span-6 xl:col-span-5 grid grid-cols-1 sm:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] overflow-hidden rounded-3xl border border-stone-200 bg-[#F7F8F8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007185]"
              >
                <div className="relative bg-white aspect-[16/10] sm:aspect-auto">
                  <Image
                    src={spotlight.image}
                    alt={spotlight.title}
                    fill
                    unoptimized
                    sizes="(max-width: 1024px) 45vw, 260px"
                    className="object-contain p-5 transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  />
                </div>
                <div className="flex flex-col p-5 min-w-0">
                  <p className="text-xs font-semibold text-[#007185]">
                    {`${
                      spotlightType && spotlightType !== config.allLabel
                        ? spotlightType
                        : nounOne.charAt(0).toUpperCase() + nounOne.slice(1)
                    } by ${spotlight.brand}`}
                  </p>
                  <p className="mt-1 text-[15px] font-bold leading-snug line-clamp-2 group-hover:underline">{spotlight.title}</p>
                  {spotlightSpecs.length > 0 && (
                    <dl className="mt-3 space-y-1.5 text-[13px]">
                      {spotlightSpecs.map((r) => (
                        <div key={r.label} className="flex items-baseline justify-between gap-3 border-b border-dashed border-stone-300 pb-1">
                          <dt className="text-stone-500 shrink-0">{r.label}</dt>
                          <dd className="font-semibold text-right truncate">{r.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  <p className="mt-auto pt-4 flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold tabular-nums">{formatINR(spotlight.price)}</span>
                    {spotlight.originalPrice > spotlight.price && (
                      <span className="text-xs text-stone-500 line-through tabular-nums">{formatINR(spotlight.originalPrice)}</span>
                    )}
                  </p>
                  <span className="mt-2 text-[13px] font-semibold text-[#007185]">See full specs</span>
                </div>
              </Link>
            )}
          </div>

          {/* Category tiles with real product photos */}
          <div className="mt-8 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-none">
            <div
              className={`grid grid-flow-col auto-cols-[140px] sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-4 gap-3 ${
                TILES.length > 8 ? 'lg:grid-cols-9' : TILES.length > 6 ? 'lg:grid-cols-8' : 'lg:grid-cols-6'
              }`}
            >
              {TILES.map(({ slug, name, icon: Icon, href }) => {
                const isBrandTile = slug.startsWith(BRAND_PREFIX);
                const selected = brandMode
                  ? slug === 'all'
                    ? brands.length === 0
                    : brands.length === 1 && brands[0] === name
                  : type === slug;
                const count = typeCounts[slug] || 0;
                const img = tileImage(slug, href);
                const tileClass = `group flex flex-col overflow-hidden rounded-2xl border bg-white text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007185] ${
                  selected ? 'border-[#007185] ring-2 ring-[#007185]' : 'border-stone-200 hover:border-[#007185]/60'
                }`;
                const inner = (
                  <>
                    <span className={`relative block aspect-[4/3] ${img ? 'bg-white' : 'bg-[#007185]/[0.06]'}`}>
                      {img ? (
                        <Image src={img} alt="" fill unoptimized sizes="160px" className="object-contain p-3" />
                      ) : (
                        <span className="absolute inset-0 grid place-items-center text-[#007185]">
                          <Icon className="h-8 w-8" strokeWidth={1.5} />
                        </span>
                      )}
                    </span>
                    <span className="block border-t border-stone-100 px-3 py-2.5">
                      <span className="block text-[13px] font-bold leading-tight">
                        {name}
                        {href && <span className="sr-only"> (opens the {name} page)</span>}
                      </span>
                      <span className="block text-xs mt-0.5 text-stone-500">
                        {isLoading
                          ? '…'
                          : count > 0
                          ? `${count} product${count === 1 ? '' : 's'}`
                          : searchQuery.trim()
                          ? 'No matches'
                          : 'Coming soon'}
                        {href && <span aria-hidden="true"> ↗</span>}
                      </span>
                    </span>
                  </>
                );
                return href ? (
                  <Link key={slug} href={href} className={tileClass}>
                    {inner}
                  </Link>
                ) : (
                  <button
                    key={slug}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      if (!brandMode) return setUrlParam('subcategory', slug === 'all' ? null : slug);
                      // Brand tiles pick one brand (or all), mirrored in the URL so the page can be shared.
                      setBrands(isBrandTile ? [name] : []);
                      setUrlParam('brand', isBrandTile ? name : null);
                    }}
                    className={tileClass}
                  >
                    {inner}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-6 items-start">
          {/* Desktop sidebar (nothing to filter while the department is empty) */}
          {hasProducts && (
          <aside className="hidden lg:block w-[264px] shrink-0 sticky top-24">
            <div className="rounded-2xl border border-stone-200 bg-white p-5">
              <div className="flex items-center justify-between pb-4 mb-1 border-b border-stone-200/80">
                <h2 className="text-sm font-extrabold flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-[#007185]" /> Filters
                </h2>
                {activeChips.length > 0 && (
                  <button type="button" onClick={clearAll} className="text-xs font-semibold text-[#007185] hover:underline">
                    Clear all
                  </button>
                )}
              </div>
              <div className="pt-4">{filtersPanel}</div>
            </div>
          </aside>
          )}

          <div id="department-results" className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-stone-600" aria-live="polite">
                {isLoading ? (
                  `Loading ${nounMany}…`
                ) : (
                  <>
                    <span className="font-bold text-[#0F1111]">{filtered.length}</span>{' '}
                    {filtered.length === 1 ? 'result' : 'results'}
                    {type !== 'all' && <> in <span className="font-semibold text-[#0F1111]">{selectedTypeName}</span></>}
                  </>
                )}
              </p>
              <div className="flex items-center gap-2">
                {hasProducts && (
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="lg:hidden inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2 text-[13px] font-semibold"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                  {activeChips.length > 0 && (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#007185] px-1 text-[11px] text-white">
                      {activeChips.length}
                    </span>
                  )}
                </button>
                )}
                <label htmlFor="department-sort" className="sr-only">Sort by</label>
                <div className="relative">
                  <select
                    id="department-sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortId)}
                    className="appearance-none rounded-full border border-stone-300 bg-white py-2 pl-4 pr-9 text-[13px] font-semibold focus:outline-none focus:border-[#007185] focus:ring-1 focus:ring-[#007185] cursor-pointer"
                  >
                    {SORTS.map((s) => (
                      <option key={s.id} value={s.id}>
                        Sort: {s.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
                </div>
              </div>
            </div>

            {/* Active filter chips */}
            {activeChips.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {activeChips.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={c.clear}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#007185]/10 py-1.5 pl-3 pr-2 text-xs font-semibold text-[#005B6B] hover:bg-[#007185]/15"
                    aria-label={`Remove filter ${c.label}`}
                  >
                    {c.label}
                    <X className="h-3.5 w-3.5" />
                  </button>
                ))}
                <button type="button" onClick={clearAll} className="text-xs font-semibold text-stone-600 hover:text-[#007185] hover:underline px-1">
                  Clear all
                </button>
              </div>
            )}

            {/* Grid */}
            <div className="mt-4">
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-stone-200 bg-white p-4 animate-pulse space-y-3">
                      <div className="h-48 rounded-xl bg-stone-200" />
                      <div className="h-4 w-3/4 rounded bg-stone-200" />
                      <div className="h-4 w-1/2 rounded bg-stone-200" />
                      <div className="h-8 w-full rounded-full bg-stone-200" />
                    </div>
                  ))}
                </div>
              ) : filtered.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filtered.map((product) => (
                    <CategoryProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={() => handleAddToCart(product)}
                      isAdded={Boolean(addedIds[product.id])}
                      isSaved={isInWishlist(product.id)}
                      imageAspectRatio="square"
                      onToggleWishlist={(p) =>
                        toggleItem({
                          id: p.id,
                          productId: p.id,
                          slug: p.slug,
                          title: p.title,
                          brand: p.brand,
                          price: p.price,
                          originalPrice: p.originalPrice,
                          image: p.image,
                          rating: p.rating,
                          inStock: p.inStock,
                          boardIds: ['all', config.departmentSlug],
                        })
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center">
                  <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-stone-100 text-stone-500">
                    {(products.length === 0 && !searchQuery.trim()) || (type !== 'all' && (typeCounts[type] || 0) === 0) ? (
                      <PackageOpen className="h-7 w-7" />
                    ) : (
                      <Search className="h-7 w-7" />
                    )}
                  </div>
                  {products.length === 0 && searchQuery.trim() ? (
                    <>
                      <h3 className="text-base font-bold">Nothing here matches “{searchQuery.trim()}”</h3>
                      <p className="mt-1 text-sm text-stone-600 max-w-md mx-auto">
                        Check the spelling, or try a shorter or more general word.
                      </p>
                      <button
                        type="button"
                        onClick={clearAll}
                        className="mt-5 rounded-full bg-[#FFD814] hover:bg-[#F7CA00] px-5 py-2 text-[13px] font-semibold"
                      >
                        Clear search
                      </button>
                    </>
                  ) : products.length === 0 ? (
                    <>
                      <h3 className="text-base font-bold">
                        {nounMany.charAt(0).toUpperCase() + nounMany.slice(1)} are on their way
                      </h3>
                      <p className="mt-1 text-sm text-stone-600 max-w-md mx-auto">
                        Sellers are still adding their {nounOne} catalog. Check back soon.
                      </p>
                    </>
                  ) : type !== 'all' && (typeCounts[type] || 0) === 0 ? (
                    <>
                      <h3 className="text-base font-bold">No {selectedTypeName?.toLowerCase()} yet</h3>
                      <p className="mt-1 text-sm text-stone-600 max-w-md mx-auto">
                        We don&apos;t have any {selectedTypeName?.toLowerCase()} listed right now.
                      </p>
                      <button
                        type="button"
                        onClick={() => setUrlParam('subcategory', null)}
                        className="mt-5 rounded-full bg-[#FFD814] hover:bg-[#F7CA00] px-5 py-2 text-[13px] font-semibold"
                      >
                        See all {nounMany}
                      </button>
                    </>
                  ) : (
                    <>
                      <h3 className="text-base font-bold">No {nounMany} match these filters</h3>
                      <p className="mt-1 text-sm text-stone-600 max-w-md mx-auto">
                        Try removing a filter or widening the price range.
                      </p>
                      <button
                        type="button"
                        onClick={clearAll}
                        className="mt-5 rounded-full bg-[#FFD814] hover:bg-[#F7CA00] px-5 py-2 text-[13px] font-semibold"
                      >
                        Clear all filters
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile filter drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-labelledby="dept-filters-title">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
          />
          <div className="absolute inset-y-0 right-0 flex w-[min(360px,92vw)] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
              <h2 id="dept-filters-title" className="text-base font-extrabold">Filters</h2>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-full p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
                aria-label="Close filters"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">{filtersPanel}</div>
            <div className="flex items-center gap-3 border-t border-stone-200 px-5 py-3">
              <button
                type="button"
                onClick={clearAll}
                disabled={activeChips.length === 0}
                className="flex-1 rounded-full border border-stone-300 py-2.5 text-[13px] font-semibold disabled:opacity-40"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex-[1.4] rounded-full bg-[#FFD814] hover:bg-[#F7CA00] py-2.5 text-[13px] font-bold"
              >
                Show {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
