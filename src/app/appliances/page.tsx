'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { matchesSearchQuery, DEPARTMENT_WORDS } from '@/lib/search';
import {
  Refrigerator,
  WashingMachine,
  Wind,
  CookingPot,
  Home,
  LayoutGrid,
  SlidersHorizontal,
  X,
  ChevronRight,
  ChevronDown,
  Star,
  Zap,
  Search,
  PackageOpen,
} from 'lucide-react';
import { CategoryProductCard } from '@/components/products/category-product-card';
import { CategoryProductItem, useCategoryProducts } from '@/hooks/use-category-products';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';
import { formatINR } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Taxonomy helpers                                                    */
/* ------------------------------------------------------------------ */

type ApplianceType =
  | 'refrigerators'
  | 'washing-machines'
  | 'air-conditioners'
  | 'kitchen-appliances'
  | 'home-appliances';

const APPLIANCE_TYPES: Array<{ slug: 'all' | ApplianceType; name: string; icon: React.ElementType }> = [
  { slug: 'all', name: 'All appliances', icon: LayoutGrid },
  { slug: 'refrigerators', name: 'Refrigerators', icon: Refrigerator },
  { slug: 'washing-machines', name: 'Washing machines', icon: WashingMachine },
  { slug: 'air-conditioners', name: 'Air conditioners', icon: Wind },
  { slug: 'kitchen-appliances', name: 'Kitchen & cooking', icon: CookingPot },
  { slug: 'home-appliances', name: 'Home essentials', icon: Home },
];

/** Which appliance group a product belongs to, from its category slug, category name and title. */
function applianceTypeOf(p: CategoryProductItem): ApplianceType | null {
  const text = `${(p.category || '').replace(/-/g, ' ')} ${p.subCategory || ''} ${p.title || ''}`.toLowerCase();
  if (/\b(refrigerators?|fridges?)\b/.test(text)) return 'refrigerators';
  if (/\b(washing machines?|washers?|dryers?)\b/.test(text)) return 'washing-machines';
  if (/\b(air conditioners?|acs?)\b/.test(text)) return 'air-conditioners';
  if (/\b(microwaves?|ovens?|chimneys?|air fryers?|induction|cooktops?|mixer|grinders?|dishwashers?|kettles?|toasters?)\b/.test(text))
    return 'kitchen-appliances';
  if (/\b(water purifiers?|purifiers?|geysers?|water heaters?|vacuum|irons?|fans?|room heaters?)\b/.test(text))
    return 'home-appliances';
  return null;
}

/** BEE star rating (1-5) from the specs or title, or null when the product doesn't state one. */
function energyStarsOf(p: CategoryProductItem): number | null {
  const specs = p.specs || {};
  const specValue = Object.entries(specs).find(([k]) => /energy|bee|star rating/i.test(k))?.[1];
  const m = String(specValue ?? '').match(/([1-5])\s*star/i) || (p.title || '').match(/\b([1-5])\s*star\b/i);
  return m ? Number(m[1]) : null;
}

const PRICE_BUCKETS = [
  { id: 'under-15000', label: 'Under ₹15,000', min: 0, max: 15000 },
  { id: '15000-30000', label: '₹15,000 – ₹30,000', min: 15000, max: 30000 },
  { id: '30000-50000', label: '₹30,000 – ₹50,000', min: 30000, max: 50000 },
  { id: '50000-plus', label: 'Over ₹50,000', min: 50000, max: Infinity },
] as const;

const SORTS = [
  { id: 'relevance', label: 'Relevance' },
  { id: 'price-low', label: 'Price: low to high' },
  { id: 'price-high', label: 'Price: high to low' },
  { id: 'discount', label: 'Biggest discount' },
  { id: 'rating', label: 'Customer rating' },
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

function AppliancesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [type, setType] = useState<'all' | ApplianceType>('all');
  const [brands, setBrands] = useState<string[]>([]);
  const [stars, setStars] = useState<number[]>([]);
  const [priceBucket, setPriceBucket] = useState<string | null>(null);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [expressOnly, setExpressOnly] = useState(false);
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
  useEffect(() => setSearchQuery(qParam), [qParam]);
  useEffect(() => {
    setType(APPLIANCE_TYPES.some((t) => t.slug === subParam) ? (subParam as 'all' | ApplianceType) : 'all');
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
    router.replace(qs ? `/appliances?${qs}` : '/appliances', { scroll: false });
  };

  const { products: liveProducts, isLoading } = useCategoryProducts({
    categoryKey: 'appliances',
    // Only products filed under Appliances in the catalog tree (keyword matching pulled in
    // laptops, watches and shoes: "ac" inside "Acer", "Maritime", "Black").
    departmentSlug: 'appliances',
  });

  const products = liveProducts;

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: products.length };
    products.forEach((p) => {
      const t = applianceTypeOf(p);
      if (t) counts[t] = (counts[t] || 0) + 1;
    });
    return counts;
  }, [products]);

  const min = minPrice && Number(minPrice) >= 0 ? Number(minPrice) : null;
  const max = maxPrice && Number(maxPrice) > 0 ? Number(maxPrice) : null;
  const priceRangeInvalid = min !== null && max !== null && min > max;

  // Every filter except the one named, so facet counts show what each option would return.
  const applyFilters = (list: CategoryProductItem[], skip?: 'brand' | 'stars' | 'price') => {
    let out = list;
    if (type !== 'all') out = out.filter((p) => applianceTypeOf(p) === type);
    if (searchQuery.trim()) {
      out = out.filter((p) =>
        matchesSearchQuery(
          searchQuery,
          [p.title, p.brand, p.subCategory, p.category, ...Object.values(p.specs || {}).map(String)],
          DEPARTMENT_WORDS.appliances
        )
      );
    }
    if (skip !== 'brand' && brands.length) {
      out = out.filter((p) => brands.some((b) => b.toLowerCase() === (p.brand || '').toLowerCase()));
    }
    if (skip !== 'stars' && stars.length) {
      out = out.filter((p) => {
        const s = energyStarsOf(p);
        return s !== null && stars.includes(s);
      });
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
    if (expressOnly) out = out.filter((p) => p.isExpress === true);
    return out;
  };

  const filtered = useMemo(() => {
    const list = [...applyFilters(products)];
    if (sortBy === 'price-low') list.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price-high') list.sort((a, b) => b.price - a.price);
    else if (sortBy === 'discount') list.sort((a, b) => discountPct(b) - discountPct(a));
    else if (sortBy === 'rating') list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, type, searchQuery, brands, stars, priceBucket, minPrice, maxPrice, minRating, inStockOnly, expressOnly, sortBy]);

  const brandFacets = useMemo(() => {
    const base = applyFilters(products, 'brand');
    const all = Array.from(new Set(products.map((p) => p.brand).filter(Boolean))).sort((a, b) => a.localeCompare(b));
    return all.map((name) => ({
      name,
      count: base.filter((p) => (p.brand || '').toLowerCase() === name.toLowerCase()).length,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, type, searchQuery, stars, priceBucket, minPrice, maxPrice, minRating, inStockOnly, expressOnly]);

  const starFacets = useMemo(() => {
    const base = applyFilters(products, 'stars');
    const present = Array.from(
      new Set(products.map(energyStarsOf).filter((s): s is number => s !== null))
    ).sort((a, b) => b - a);
    return present.map((s) => ({ stars: s, count: base.filter((p) => energyStarsOf(p) === s).length }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, type, searchQuery, brands, priceBucket, minPrice, maxPrice, minRating, inStockOnly, expressOnly]);

  const priceFacets = useMemo(() => {
    const base = applyFilters(products, 'price');
    return PRICE_BUCKETS.map((b) => ({ ...b, count: base.filter((p) => p.price >= b.min && p.price < b.max).length }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, type, searchQuery, brands, stars, minRating, inStockOnly, expressOnly]);

  const hasExpressProducts = products.some((p) => p.isExpress === true);
  const hasReviewedProducts = products.some((p) => (p.reviews || 0) > 0);

  // Removable chips for everything that is narrowing the list.
  const activeChips: Array<{ key: string; label: string; clear: () => void }> = [];
  if (type !== 'all')
    activeChips.push({
      key: 'type',
      label: APPLIANCE_TYPES.find((t) => t.slug === type)!.name,
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
        router.replace(qs ? `/appliances?${qs}` : '/appliances', { scroll: false });
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
  if (expressOnly) activeChips.push({ key: 'express', label: 'Vyntra Express', clear: () => setExpressOnly(false) });

  const clearAll = () => {
    setBrands([]);
    setStars([]);
    setPriceBucket(null);
    setMinPrice('');
    setMaxPrice('');
    setMinRating(0);
    setInStockOnly(false);
    setExpressOnly(false);
    router.replace('/appliances', { scroll: false });
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
  const selectedTypeName = APPLIANCE_TYPES.find((t) => t.slug === type)?.name;

  /* ----------------------------- Filters panel ----------------------------- */
  const filtersPanel = (
    <div>
      {brandFacets.length > 0 && (
        <FilterSection title="Brand">
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
          <label className="sr-only" htmlFor="appl-min">Minimum price</label>
          <input
            id="appl-min"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Min ₹"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value.replace(/[^0-9]/g, ''))}
            className="w-full min-w-0 px-3 py-2 text-[13px] border border-stone-300 rounded-lg focus:outline-none focus:border-[#007185] focus:ring-1 focus:ring-[#007185]"
          />
          <span className="text-stone-400">–</span>
          <label className="sr-only" htmlFor="appl-max">Maximum price</label>
          <input
            id="appl-max"
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

      {starFacets.length > 0 && (
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
          {hasExpressProducts && (
            <CheckRow
              label={
                <span className="inline-flex items-center gap-1 font-semibold text-[#007185]">
                  <Zap className="h-3.5 w-3.5" /> Vyntra Express
                </span>
              }
              checked={expressOnly}
              onChange={() => setExpressOnly((v) => !v)}
            />
          )}
        </div>
      </FilterSection>
    </div>
  );

  /* --------------------------------- View --------------------------------- */
  return (
    <div className="min-h-screen bg-[#F5F6F7] text-[#0F1111]">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-stone-200 bg-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_20rem_at_85%_-10%,rgba(0,113,133,0.10),transparent),radial-gradient(40rem_16rem_at_0%_120%,rgba(255,216,20,0.14),transparent)]"
        />
        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 pt-4 pb-6">
          <nav aria-label="Breadcrumb" className="text-xs text-stone-500 flex items-center gap-1.5">
            <Link href="/" className="hover:text-[#007185] hover:underline">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/appliances" className="hover:text-[#007185] hover:underline">Appliances</Link>
            {type !== 'all' && (
              <>
                <ChevronRight className="h-3 w-3" />
                <span className="text-[#0F1111] font-medium">{selectedTypeName}</span>
              </>
            )}
          </nav>

          <div className="mt-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#007185]">Home & kitchen</p>
              <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-tight font-headline">Appliances</h1>
              <p className="mt-2 max-w-xl text-sm text-stone-600">
                Refrigerators, washing machines, air conditioners and kitchen appliances from verified sellers.
                Compare energy ratings, prices and specs in one place.
              </p>
            </div>
            {!isLoading && products.length > 0 && (
              <dl className="flex gap-6 text-sm">
                <div>
                  <dt className="text-xs text-stone-500">Products</dt>
                  <dd className="text-xl font-extrabold tabular-nums">{products.length}</dd>
                </div>
                <div>
                  <dt className="text-xs text-stone-500">Brands</dt>
                  <dd className="text-xl font-extrabold tabular-nums">{brandCount}</dd>
                </div>
              </dl>
            )}
          </div>

          {/* Category tiles */}
          <div className="mt-6 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-none">
            <div className="grid grid-flow-col auto-cols-[minmax(150px,1fr)] sm:grid-flow-row sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {APPLIANCE_TYPES.map(({ slug, name, icon: Icon }) => {
                const selected = type === slug;
                const count = typeCounts[slug] || 0;
                return (
                  <button
                    key={slug}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setUrlParam('subcategory', slug === 'all' ? null : slug)}
                    className={`group flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all ${
                      selected
                        ? 'border-[#007185] bg-[#007185] text-white shadow-md shadow-[#007185]/20'
                        : 'border-stone-200 bg-white hover:border-[#007185]/50 hover:shadow-sm'
                    }`}
                  >
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                        selected ? 'bg-white/15' : 'bg-[#007185]/[0.08] text-[#007185] group-hover:bg-[#007185]/[0.14]'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-bold leading-tight">{name}</span>
                      <span className={`block text-xs mt-0.5 ${selected ? 'text-white/80' : 'text-stone-500'}`}>
                        {isLoading ? '…' : count > 0 ? `${count} product${count === 1 ? '' : 's'}` : 'Coming soon'}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-6 items-start">
          {/* Desktop sidebar */}
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

          <div id="appliance-results" className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-stone-600" aria-live="polite">
                {isLoading ? (
                  'Loading appliances…'
                ) : (
                  <>
                    <span className="font-bold text-[#0F1111]">{filtered.length}</span>{' '}
                    {filtered.length === 1 ? 'result' : 'results'}
                    {type !== 'all' && <> in <span className="font-semibold text-[#0F1111]">{selectedTypeName}</span></>}
                  </>
                )}
              </p>
              <div className="flex items-center gap-2">
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
                <label htmlFor="appliances-sort" className="sr-only">Sort by</label>
                <div className="relative">
                  <select
                    id="appliances-sort"
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
                          boardIds: ['all', 'appliances'],
                        })
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center">
                  <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-stone-100 text-stone-500">
                    {products.length === 0 || (type !== 'all' && (typeCounts[type] || 0) === 0) ? (
                      <PackageOpen className="h-7 w-7" />
                    ) : (
                      <Search className="h-7 w-7" />
                    )}
                  </div>
                  {products.length === 0 ? (
                    <>
                      <h3 className="text-base font-bold">Appliances are on their way</h3>
                      <p className="mt-1 text-sm text-stone-600 max-w-md mx-auto">
                        Sellers are still adding their appliance catalog. Check back soon.
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
                        See all appliances
                      </button>
                    </>
                  ) : (
                    <>
                      <h3 className="text-base font-bold">No appliances match these filters</h3>
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
        <div className="lg:hidden fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-labelledby="appl-filters-title">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
          />
          <div className="absolute inset-y-0 right-0 flex w-[min(360px,92vw)] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
              <h2 id="appl-filters-title" className="text-base font-extrabold">Filters</h2>
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

export default function AppliancesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F5F6F7]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007185]" />
        </div>
      }
    >
      <AppliancesContent />
    </Suspense>
  );
}
