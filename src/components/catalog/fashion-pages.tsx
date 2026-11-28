'use client';

import React, { Suspense } from 'react';
import {
  Baby,
  Backpack,
  Briefcase,
  Footprints,
  Gem,
  Glasses,
  Luggage,
  Shirt,
  ShoppingBag,
  Sparkles,
  User,
  Users,
  Watch,
} from 'lucide-react';
import { DepartmentListing, type DepartmentConfig, type DepartmentType } from '@/components/catalog/department-listing';
import { DEPARTMENT_WORDS } from '@/lib/search';

import { CometSpinner } from '@/components/ui/loading-spinner';
/**
 * Every Fashion listing is the shared DepartmentListing with a different slice of the catalog
 * tree. Type slugs are real category slugs (see the Category table); `match` is only a text
 * fallback for products filed higher up the tree.
 */

const PRICE_BUCKETS = [
  { id: 'under-500', label: 'Under ₹500', min: 0, max: 500 },
  { id: '500-1000', label: '₹500 – ₹1,000', min: 500, max: 1000 },
  { id: '1000-2500', label: '₹1,000 – ₹2,500', min: 1000, max: 2500 },
  { id: '2500-5000', label: '₹2,500 – ₹5,000', min: 2500, max: 5000 },
  { id: '5000-plus', label: 'Over ₹5,000', min: 5000, max: Infinity },
];

const WATCH_PRICES = [
  { id: 'under-2000', label: 'Under ₹2,000', min: 0, max: 2000 },
  { id: '2000-5000', label: '₹2,000 – ₹5,000', min: 2000, max: 5000 },
  { id: '5000-15000', label: '₹5,000 – ₹15,000', min: 5000, max: 15000 },
  { id: '15000-plus', label: 'Over ₹15,000', min: 15000, max: Infinity },
];

const FASHION = { label: 'Fashion', href: '/fashion' };
const WOMEN = { label: 'Women', href: '/fashion/women' };
const MEN = { label: 'Men', href: '/fashion/men' };
const KIDS = { label: 'Kids', href: '/fashion/kids' };
const BAGS = { label: 'Bags and luggage', href: '/fashion/bags-luggage' };

/** A tile that filters this page's list to one child category. */
const t = (slug: string, name: string, icon: React.ElementType, match?: RegExp): DepartmentType => ({ slug, name, icon, match });
/** A tile that opens the child category's own page (its count still comes from this page's products). */
const go = (slug: string, name: string, icon: React.ElementType, href = `/category/${slug}`): DepartmentType => ({ slug, name, icon, href });

type PageDef = Omit<DepartmentConfig, 'basePath' | 'searchStopWords' | 'priceBuckets' | 'noun'> &
  Partial<Pick<DepartmentConfig, 'priceBuckets' | 'noun'>>;

export const FASHION_PAGES: Record<string, PageDef> = {
  fashion: {
    departmentSlug: 'fashion',
    title: 'Fashion',
    description: "Clothing, shoes, watches, jewellery and bags for women, men and kids, from sellers across India.",
    allLabel: 'All fashion',
    types: [
      go('women', 'Women', User, WOMEN.href),
      go('men', 'Men', Users, MEN.href),
      go('kids', 'Kids', Baby, KIDS.href),
      go('bags-luggage', 'Bags and luggage', Luggage, BAGS.href),
    ],
  },

  /* ---------------- Women ---------------- */
  women: {
    departmentSlug: 'women',
    title: 'Women',
    description: 'Ethnic and western wear, lingerie, shoes, watches, jewellery, eyewear and handbags.',
    allLabel: 'All women',
    parent: FASHION,
    types: [
      go('womens-ethnic-wear', 'Ethnic wear', Sparkles),
      go('western-wear', 'Western wear', Shirt),
      go('womens-shoes', 'Shoes', Footprints),
      go('womens-watches', 'Watches', Watch),
      go('womens-jewellery', 'Jewellery', Gem),
      go('womens-handbags', 'Handbags', ShoppingBag),
      go('womens-eyewear', 'Eyewear', Glasses),
      go('womens-lingerie', 'Lingerie and sleepwear', Sparkles, '/category/lingerie-sleep-lounge'),
    ],
  },
  'womens-ethnic-wear': {
    departmentSlug: 'womens-ethnic-wear',
    title: 'Sarees and ethnic wear',
    description: 'Sarees, kurtas, salwar suits and lehengas.',
    allLabel: 'All ethnic wear',
    parent: WOMEN,
    types: [
      t('womens-sarees', 'Sarees', Sparkles, /\bsarees?\b/),
      t('womens-kurtas', 'Kurtas and kurtis', Shirt, /\bkurt(a|i)s?\b/),
      t('womens-salwarsuits', 'Salwar suits', Shirt, /\bsalwar|churidar|anarkali\b/),
      t('womens-lehengas', 'Lehengas', Sparkles, /\blehengas?\b/),
    ],
  },
  'western-wear': {
    departmentSlug: 'western-wear',
    title: "Women's western wear",
    description: 'Tops, dresses, jeans, trousers, skirts and jackets.',
    allLabel: 'All western wear',
    parent: WOMEN,
    types: [
      t('womens-tops-tees', 'Tops and tees', Shirt, /\b(tops?|t-?shirts?|tees?)\b/),
      t('womens-dresses', 'Dresses', Shirt, /\bdress(es)?\b/),
      t('womens-jeans-jeggings', 'Jeans', Shirt, /\bjeans|jeggings\b/),
      t('womens-trousers', 'Trousers', Shirt, /\btrousers?|pants\b/),
      t('womens-skirts-shorts', 'Skirts and shorts', Shirt, /\bskirts?|shorts\b/),
      t('womens-jackets', 'Jackets', Shirt, /\bjackets?|blazers?\b/),
    ],
  },
  'womens-shoes': {
    departmentSlug: 'womens-shoes',
    title: "Women's shoes",
    description: 'Casual, formal and sports shoes, sandals, flats, boots, pumps, slippers and ethnic footwear.',
    allLabel: "All women's shoes",
    parent: WOMEN,
    types: [
      t('womens-casual-shoes', 'Casual', Footprints),
      t('womens-formal-shoes', 'Formal', Footprints),
      t('womens-sports-shoes', 'Sports', Footprints),
      t('womens-sandals', 'Sandals', Footprints),
      t('womens-ballet-flats', 'Flats', Footprints),
      t('womens-ethnic-footwear', 'Ethnic footwear', Footprints),
      t('womens-boots', 'Boots', Footprints),
      t('womens-pumps', 'Pumps and peep-toes', Footprints),
      t('womens-slippers', 'Slippers and flip-flops', Footprints),
    ],
  },
  'womens-watches': {
    departmentSlug: 'womens-watches',
    title: "Women's watches",
    description: 'Gold-tone, leather, steel and smartwatches.',
    allLabel: "All women's watches",
    parent: WOMEN,
    priceBuckets: WATCH_PRICES,
    types: [
      t('womens-gold-watches', 'Gold-tone', Watch),
      t('womens-leather-watches', 'Leather strap', Watch),
      t('womens-steel-watches', 'Steel strap', Watch),
      t('womens-smartwatches', 'Smartwatches', Watch),
    ],
  },
  'womens-jewellery': {
    departmentSlug: 'womens-jewellery',
    title: 'Jewellery',
    description: 'Fashion, gold and diamond, silver and traditional kundan jewellery.',
    allLabel: 'All jewellery',
    parent: WOMEN,
    types: [
      t('womens-fashion-jewellery', 'Fashion jewellery', Gem),
      t('womens-gold-diamond', 'Gold and diamond', Gem),
      t('womens-silver-jewellery', 'Silver', Gem),
      t('womens-traditional-kundan', 'Kundan and traditional', Gem),
    ],
  },
  'womens-eyewear': {
    departmentSlug: 'womens-eyewear',
    title: 'Eyewear',
    description: 'Sunglasses, spectacle frames and reading glasses.',
    allLabel: 'All eyewear',
    parent: WOMEN,
    types: [
      t('womens-sunglasses', 'Sunglasses', Glasses),
      t('womens-spectacle-frames', 'Spectacle frames', Glasses),
      t('womens-reading-glasses', 'Reading glasses', Glasses),
      t('womens-eyewear-cases', 'Cases', Glasses),
    ],
  },
  'womens-handbags': {
    departmentSlug: 'womens-handbags',
    title: 'Handbags and clutches',
    description: 'Totes, shoulder and sling bags, clutches and wallets.',
    allLabel: 'All handbags',
    parent: WOMEN,
    types: [
      t('handbags-totes', 'Totes', ShoppingBag),
      t('handbags-shoulder-bags', 'Shoulder bags', ShoppingBag),
      t('handbags-sling-bags', 'Sling bags', ShoppingBag),
      t('handbags-clutches-potlis', 'Clutches and potlis', ShoppingBag),
      t('womens-wallets', 'Wallets', ShoppingBag),
    ],
  },
  'womens-lingerie': {
    departmentSlug: 'womens-lingerie',
    title: 'Lingerie and sleepwear',
    description: 'Bras, briefs, shapewear and nightwear. Innerwear cannot be returned for change of mind.',
    allLabel: 'All lingerie',
    parent: WOMEN,
    types: [
      t('bras-bralettes', 'Bras', Sparkles),
      t('panties-briefs', 'Briefs', Sparkles),
      t('saree-shapewear-slips', 'Shapewear', Sparkles),
      t('womens-nightwear-loungewear', 'Nightwear', Sparkles),
    ],
  },

  /* ---------------- Men ---------------- */
  men: {
    departmentSlug: 'men',
    title: 'Men',
    description: 'Clothing, shoes, watches, wallets, belts and eyewear.',
    allLabel: 'All men',
    parent: FASHION,
    types: [
      go('mens-clothing', 'Clothing', Shirt),
      go('mens-shoes', 'Shoes', Footprints),
      go('mens-watches', 'Watches', Watch),
      go('mens-accessories', 'Wallets and belts', Briefcase),
      go('mens-eyewear', 'Eyewear', Glasses),
    ],
  },
  'mens-clothing': {
    departmentSlug: 'mens-clothing',
    title: "Men's clothing",
    description: 'Shirts, T-shirts, jeans, trousers, jackets, ethnic wear and innerwear.',
    allLabel: "All men's clothing",
    parent: MEN,
    types: [
      t('mens-shirts', 'Shirts', Shirt, /\bshirts?\b/),
      t('mens-tshirts-polos', 'T-shirts and polos', Shirt, /\bt-?shirts?|polos?\b/),
      t('mens-jeans', 'Jeans', Shirt, /\bjeans\b/),
      t('mens-trousers', 'Trousers', Shirt, /\btrousers?|chinos?\b/),
      t('mens-jackets', 'Jackets', Shirt, /\bjackets?|blazers?\b/),
      t('mens-ethnic-wear', 'Ethnic wear', Sparkles, /\bkurtas?|sherwanis?|dhoti\b/),
      t('mens-innerwear-loungewear', 'Innerwear', Shirt),
    ],
  },
  'mens-shoes': {
    departmentSlug: 'mens-shoes',
    title: "Men's shoes",
    description: 'Sneakers, casual, formal and sports shoes, sandals and slippers.',
    allLabel: "All men's shoes",
    parent: MEN,
    types: [
      t('mens-casual-shoes', 'Casual', Footprints),
      t('mens-sports-shoes', 'Sports and sneakers', Footprints, /\bsneakers?\b/),
      t('mens-formal-shoes', 'Formal', Footprints),
      t('mens-sandals-slippers', 'Sandals and slippers', Footprints),
    ],
  },
  'mens-watches': {
    departmentSlug: 'mens-watches',
    title: "Men's watches",
    description: 'Analog, chronograph and smartwatches.',
    allLabel: "All men's watches",
    parent: MEN,
    priceBuckets: WATCH_PRICES,
    types: [
      t('mens-analog-watches', 'Analog', Watch),
      t('mens-chronograph-watches', 'Chronograph', Watch),
      t('mens-smartwatches', 'Smartwatches', Watch),
    ],
  },
  'mens-accessories': {
    departmentSlug: 'mens-accessories',
    title: 'Wallets and belts',
    description: "Men's wallets and belts.",
    allLabel: 'All wallets and belts',
    parent: MEN,
    types: [t('mens-wallets', 'Wallets', Briefcase), t('mens-belts', 'Belts', Briefcase)],
  },
  'mens-eyewear': {
    departmentSlug: 'mens-eyewear',
    title: "Men's eyewear",
    description: 'Sunglasses for men.',
    allLabel: "All men's eyewear",
    parent: MEN,
    types: [t('mens-sunglasses', 'Sunglasses', Glasses)],
  },

  /* ---------------- Kids ---------------- */
  kids: {
    departmentSlug: 'kids',
    title: 'Kids',
    description: "Clothing and shoes for boys, girls and babies.",
    allLabel: 'All kids',
    parent: FASHION,
    types: [
      go('boys-clothing', "Boys' clothing", Shirt),
      go('girls-clothing', "Girls' clothing", Shirt),
      go('baby-clothing', 'Baby clothing', Baby),
      go('kids-shoes', "Kids' shoes", Footprints, '/category/shoes?subcategory=kids-shoes'),
    ],
  },
  'baby-clothing': {
    departmentSlug: 'baby-clothing',
    title: 'Baby clothing',
    description: 'Rompers and clothing sets for babies.',
    allLabel: 'All baby clothing',
    parent: KIDS,
    types: [t('baby-rompers', 'Rompers', Baby), t('baby-clothing-sets', 'Clothing sets', Baby)],
  },
  'boys-clothing': {
    departmentSlug: 'boys-clothing',
    title: "Boys' clothing",
    description: 'T-shirts, shirts, jeans and trousers, clothing sets and ethnic wear.',
    allLabel: "All boys' clothing",
    parent: KIDS,
    types: [
      t('boys-tshirts-polos', 'T-shirts and polos', Shirt),
      t('boys-shirts', 'Shirts', Shirt),
      t('boys-jeans-trousers', 'Jeans and trousers', Shirt),
      t('boys-clothing-sets', 'Clothing sets', Shirt),
      t('boys-ethnic-wear', 'Ethnic wear', Sparkles),
      t('boys-innerwear', 'Innerwear', Shirt),
    ],
  },
  'girls-clothing': {
    departmentSlug: 'girls-clothing',
    title: "Girls' clothing",
    description: 'Dresses, tops, jeans and skirts, clothing sets and ethnic wear.',
    allLabel: "All girls' clothing",
    parent: KIDS,
    types: [
      t('girls-dresses', 'Dresses', Shirt),
      t('girls-tops-tees', 'Tops and tees', Shirt),
      t('girls-jeans-skirts', 'Jeans and skirts', Shirt),
      t('girls-clothing-sets', 'Clothing sets', Shirt),
      t('girls-ethnic-wear', 'Ethnic wear', Sparkles),
    ],
  },

  /* ---------------- Across the department ---------------- */
  shoes: {
    departmentSlug: 'fashion',
    title: 'Shoes',
    description: "Shoes for women, men and kids.",
    allLabel: 'All shoes',
    parent: FASHION,
    restrictToTypes: true,
    types: [
      t('womens-shoes', "Women's", Footprints),
      t('mens-shoes', "Men's", Footprints),
      t('kids-shoes', "Kids'", Footprints),
    ],
  },
  watches: {
    departmentSlug: 'fashion',
    title: 'Watches',
    description: "Watches for women and men, including smartwatches.",
    allLabel: 'All watches',
    parent: FASHION,
    restrictToTypes: true,
    priceBuckets: WATCH_PRICES,
    types: [t('womens-watches', "Women's", Watch), t('mens-watches', "Men's", Watch)],
  },
  'bags-backpacks': {
    departmentSlug: 'bags-backpacks',
    title: 'Bags and backpacks',
    description: 'Backpacks, laptop bags, school bags and trekking rucksacks.',
    allLabel: 'All bags',
    parent: BAGS,
    types: [
      t('backpacks', 'Backpacks', Backpack),
      t('laptop-bags', 'Laptop bags', Briefcase),
      t('school-bags', 'School bags', Backpack),
      t('rucksacks-trekking', 'Trekking rucksacks', Backpack),
    ],
  },
  luggage: {
    departmentSlug: 'luggage',
    title: 'Luggage',
    description: 'Suitcases, trolleys and travel duffles.',
    allLabel: 'All luggage',
    parent: BAGS,
    types: [t('suitcases-trolleys', 'Suitcases and trolleys', Luggage), t('travel-duffles', 'Duffles', Luggage)],
  },
  'bags-luggage': {
    departmentSlug: 'bags-luggage',
    title: 'Bags and luggage',
    description: 'Backpacks, laptop and school bags, suitcases and travel duffles. Handbags are under Women.',
    allLabel: 'All bags and luggage',
    parent: FASHION,
    types: [
      go('bags-backpacks', 'Bags and backpacks', Backpack),
      go('luggage', 'Luggage', Luggage),
    ],
  },
};

function humanize(slug: string) {
  const s = slug.replace(/-/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** The listing for a fashion page. Unknown slugs get a plain listing of that category. */
export function FashionListing({ pageKey, basePath }: { pageKey: string; basePath: string }) {
  const def: PageDef = FASHION_PAGES[pageKey] || {
    departmentSlug: pageKey,
    title: humanize(pageKey),
    description: '',
    allLabel: `All ${humanize(pageKey).toLowerCase()}`,
    parent: FASHION,
    types: [],
  };
  const config: DepartmentConfig = {
    noun: { one: 'item', many: 'items' },
    priceBuckets: PRICE_BUCKETS,
    searchStopWords: DEPARTMENT_WORDS.fashion,
    ...def,
    basePath,
  };
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F5F6F7]">
          <CometSpinner className="h-12 w-12" />
        </div>
      }
    >
      <DepartmentListing key={pageKey} config={config} />
    </Suspense>
  );
}
