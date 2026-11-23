'use client';

import { useState, useEffect, useMemo } from 'react';

export interface CategoryProductItem {
  id: string;
  slug: string;
  title: string;
  brand: string;
  category: string;
  subcategory: string;
  subCategory: string;
  price: number;
  originalPrice: number;
  discount: string;
  rating: number;
  reviews: number;
  isBestSeller?: boolean;
  isAmazonChoice?: boolean;
  isLimitedDeal?: boolean;
  isPrime: boolean;
  deliveryDate: string;
  image: string;
  stockCount: number;
  inStock: boolean;
  vendorName: string;
  vendorSlug: string;
  sizes: string[];
  swatches?: any[];
  boughtPastMonth?: string;
  unitPriceNotice?: string;
  couponNotice?: string;
  material?: string;
  dialColor?: string;
  bandMaterial?: string;
  shape?: string;
  metalType?: string;
  gemstoneType?: string;
  isQualityVerified?: boolean;
  specs?: Record<string, string>;
  [key: string]: any;
}

export interface UseCategoryProductsOptions {
  categoryKey: string;
  extraKeywords?: string[];
  initialSubCategory?: string;
  subCategoryKey?: 'subcategory' | 'category' | 'slug';
}

const CATEGORY_ALIASES: Record<string, string[]> = {
  'mobiles': ['mobile', 'smartphone', 'phone', '5g', 'iphone', 'galaxy', 'oneplus', 'redmi', 'realme', 'motorola', 'nothing', 'xiaomi', 'vivo', 'oppo'],
  'smartphones': ['mobile', 'smartphone', 'phone', '5g', 'iphone', 'galaxy', 'oneplus', 'redmi', 'realme', 'motorola', 'nothing', 'xiaomi', 'vivo', 'oppo'],
  'electronics': ['electronic', 'laptop', 'macbook', 'audio', 'headphone', 'earbud', 'speaker', 'tablet', 'ipad', 'gaming', 'camera', 'gadget'],
  'laptops': ['laptop', 'macbook', 'ultrabook', 'notebook', 'thinkpad', 'zenbook', 'pc', 'gaming laptop'],
  'audio-headphones': ['audio', 'headphone', 'earphone', 'earbud', 'tws', 'speaker', 'soundbar', 'bluetooth speaker', 'airpods'],
  'smartwatches-wearables': ['smartwatch', 'apple watch', 'galaxy watch', 'fitness tracker', 'smart band', 'wearable'],
  'tablets-ipads': ['tablet', 'ipad', 'tab', 'galaxy tab'],
  'gaming-accessories': ['gaming', 'console', 'playstation', 'xbox', 'keyboard', 'mouse', 'controller', 'headset'],
  'cameras-photography': ['camera', 'dslr', 'mirrorless', 'lens', 'gopro', 'action camera'],
  'appliances': ['appliance', 'refrigerator', 'fridge', 'washing machine', 'air conditioner', 'ac', 'microwave', 'chimney', 'dishwasher', 'water purifier', 'geyser', 'vacuum cleaner', 'oven'],
  'refrigerators': ['refrigerator', 'fridge', 'double door', 'side by side', 'single door', 'frost free'],
  'washing-machines': ['washing machine', 'front load', 'top load', 'washer', 'dryer', 'inverter motor'],
  'air-conditioners': ['air conditioner', 'ac', 'split ac', 'inverter ac', 'window ac', '1.5 ton', '1 ton', '2 ton'],
  'kitchen-appliances': ['microwave', 'oven', 'chimney', 'air fryer', 'induction', 'cooktop', 'mixer grinder', 'dishwasher'],
  'home-appliances': ['water purifier', 'geyser', 'vacuum cleaner', 'iron', 'air purifier'],
  'books': ['book', 'novel', 'paperback', 'hardcover', 'author', 'reading', 'isbn', 'biography', 'fiction', 'self-help', 'manga'],
  'self-help-books': ['self-help', 'habits', 'psychology', 'mindset', 'atomic habits', 'ikigai', 'motivation'],
  'business-finance-books': ['business', 'finance', 'investing', 'money', 'rich dad', 'stock market', 'wealth'],
  'fiction-literature-books': ['fiction', 'literature', 'novel', 'thriller', 'mystery', 'classic', 'fantasy', 'story'],
  'indian-literature-books': ['indian author', 'shiva trilogy', 'amish', 'sudha murty', 'hindi sahitya', 'premchand', 'chetan bhagat'],
  'exam-prep-books': ['exam', 'upsc', 'jee', 'neet', 'ncert', 'textbook', 'syllabus', 'study guide'],
  'comics-manga-books': ['comic', 'manga', 'children book', 'bedtime story', 'graphic novel', 'kids story'],
  'sarees': ['saree', 'sari', 'kanjivaram', 'banarasi', 'chanderi', 'silk saree', 'cotton saree', 'georgette'],
  'western-wear': ['western', 'dress', 'top', 'tunic', 'jumpsuit', 'skirt', 'jeans', 'trouser', 'blazer', 'co-ord', 't-shirt'],
  'womens-western-wear': ['western', 'dress', 'top', 'tunic', 'jumpsuit', 'skirt', 'jeans', 'trouser', 'blazer'],
  'mens-clothing': ['shirt', 't-shirt', 'polo', 'denim', 'jean', 'trouser', 'jacket', 'hoodie', 'suit', 'kurta', 'flannel'],
  'men-clothing': ['shirt', 't-shirt', 'polo', 'denim', 'jean', 'trouser', 'jacket', 'hoodie', 'suit', 'kurta', 'flannel'],
  'men': ['shirt', 't-shirt', 'polo', 'denim', 'jean', 'trouser', 'jacket', 'hoodie', 'suit', 'kurta', 'flannel'],
  'mens-shoes': ['shoe', 'sneaker', 'loafer', 'boot', 'sandal', 'slipper', 'footwear', 'running', 'men shoe'],
  'men-shoes': ['shoe', 'sneaker', 'loafer', 'boot', 'sandal', 'slipper', 'footwear', 'running', 'men shoe'],
  'womens-shoes': ['heel', 'flat', 'wedge', 'pump', 'sandal', 'shoe', 'sneaker', 'footwear', 'stiletto', 'jutti', 'mojari'],
  'shoes': ['shoe', 'sneaker', 'loafer', 'boot', 'sandal', 'footwear', 'heel', 'flat'],
  'mens-watches': ['watch', 'chronograph', 'analog', 'digital', 'smartwatch', 'timewear', 'men watch'],
  'men-watches': ['watch', 'chronograph', 'analog', 'digital', 'smartwatch', 'timewear', 'men watch'],
  'womens-watches': ['watch', 'dial', 'chronograph', 'analog', 'smartwatch', 'timewear', 'women watch'],
  'watches': ['watch', 'chronograph', 'analog', 'digital', 'smartwatch', 'timewear'],
  'smartwatches': ['smartwatch', 'fitness band', 'tracker', 'apple watch', 'wearable'],
  'mens-wallets': ['wallet', 'card holder', 'money clip', 'leather wallet'],
  'men-wallets': ['wallet', 'card holder', 'money clip', 'leather wallet'],
  'bags-backpacks': ['backpack', 'laptop bag', 'rucksack', 'school bag', 'bag'],
  'handbags-clutches': ['handbag', 'tote', 'clutch', 'sling', 'shoulder bag', 'potli'],
  'luggage': ['trolley', 'suitcase', 'duffle', 'luggage', 'cabin bag', 'travel'],
  'travel-luggage': ['trolley', 'suitcase', 'duffle', 'luggage', 'cabin bag', 'travel'],
  'boys-clothing': ['boy', 'kid', 'boys shirt', 'boys t-shirt', 'boys jean'],
  'girls-clothing': ['girl', 'frock', 'girls dress', 'girls top', 'girls skirt'],
  'lingerie-sleep-lounge': ['bra', 'panty', 'nightdress', 'pyjama', 'sleepwear', 'lounge', 'lingerie', 'robe'],
  'womens-jewellery': ['jewel', 'necklace', 'earring', 'bangle', 'ring', 'pendant', 'choker', 'mangalsutra', 'chain'],
  'jewellery': ['jewel', 'necklace', 'earring', 'bangle', 'ring', 'pendant', 'choker', 'mangalsutra', 'chain'],
  'womens-eyewear': ['sunglass', 'spectacle', 'eyewear', 'frame', 'glasses', 'aviator', 'wayfarer'],
  'eyewear': ['sunglass', 'spectacle', 'eyewear', 'frame', 'glasses', 'aviator', 'wayfarer'],
  'sunglasses': ['sunglass', 'shades', 'aviator', 'wayfarer', 'polarised'],
};

export function matchesCategory(
  product: any,
  categoryKey: string,
  extraKeywords: string[] = []
): boolean {
  const cat = (product.category || '').toLowerCase();
  const sub = (product.subCategory || '').toLowerCase();
  const title = (product.title || '').toLowerCase();
  const key = categoryKey.toLowerCase();

  const isMenCategory = key.startsWith('men') || key === 'mens-clothing' || key === 'men-clothing';
  const isWomenCategory = key.startsWith('women') || key === 'sarees' || key === 'lingerie' || key === 'lingerie-sleep-lounge';

  // Cross-gender negative guard:
  // If target is a Men's category, reject products that are explicitly Women's apparel
  if (isMenCategory) {
    if (
      cat.includes('women') || sub.includes('women') || title.includes('women') ||
      cat.includes('saree') || sub.includes('saree') || title.includes('saree') ||
      cat.includes('lingerie') || sub.includes('lingerie') || title.includes('lingerie') ||
      cat.includes('lehenga') || sub.includes('lehenga') || title.includes('lehenga') ||
      cat.includes('bra') || cat.includes('panty')
    ) {
      return false;
    }
  }

  // Electronics / Mobiles separation guard:
  // 1. If target is 'electronics', strictly EXCLUDE mobile phones / smartphones (they belong in /mobiles)
  if (key === 'electronics') {
    if (
      cat === 'mobiles' ||
      cat === 'smartphones' ||
      sub === 'mobiles' ||
      sub === 'smartphones' ||
      title.includes('phone') ||
      title.includes('smartphone') ||
      title.includes('iphone') ||
      title.includes('galaxy s')
    ) {
      return false;
    }
  }

  // 2. If target category is NOT mobiles or smartphones, reject mobile & smartphone products
  const isTargetingMobiles = key === 'mobiles' || key === 'smartphones';
  if (!isTargetingMobiles) {
    if (
      cat === 'mobiles' ||
      cat === 'smartphones' ||
      sub === 'mobiles' ||
      sub === 'smartphones'
    ) {
      return false;
    }
  }

  // If target is a Women's category, reject products that are explicitly Men's apparel
  if (isWomenCategory) {
    if (
      (/\b(men|mens|men's)\b/i.test(cat) && !cat.includes('women')) ||
      (/\b(men|mens|men's)\b/i.test(sub) && !sub.includes('women')) ||
      (/\b(men|mens|men's)\b/i.test(title) && !title.includes('women'))
    ) {
      return false;
    }
  }

  // 1. Direct match with key
  if (cat.includes(key) || sub.includes(key) || title.includes(key)) {
    return true;
  }

  // 2. Singular/plural root match (e.g. saree vs sarees)
  const root = key.replace(/s$/, '').replace(/es$/, '');
  if (root.length >= 3 && (cat.includes(root) || sub.includes(root) || title.includes(root))) {
    return true;
  }

  // 3. Known aliases
  const aliases = [...(CATEGORY_ALIASES[key] || []), ...extraKeywords];
  for (const alias of aliases) {
    const a = alias.toLowerCase();
    if (a === 'men' || a === 'boy') {
      const regex = new RegExp(`\\b${a}\\b`, 'i');
      if (regex.test(cat) || regex.test(sub) || regex.test(title)) {
        return true;
      }
    } else {
      if (cat.includes(a) || sub.includes(a) || title.includes(a)) {
        return true;
      }
    }
  }

  return false;
}

export function useCategoryProducts(options: UseCategoryProductsOptions) {
  const { categoryKey, extraKeywords = [] } = options;
  const [dbProducts, setDbProducts] = useState<CategoryProductItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadProducts() {
      try {
        setIsLoading(true);
        setError(null);
        // Fetch live verified marketplace products
        const res = await fetch('/api/products?limit=100');
        const json = await res.json();
        const rawList: any[] = Array.isArray(json.data)
          ? json.data
          : Array.isArray(json.data?.products)
          ? json.data.products
          : [];

        if (isMounted) {
          if (json.success && rawList.length > 0) {
            const matched: CategoryProductItem[] = rawList
              .filter((p: any) => matchesCategory(p, categoryKey, extraKeywords))
              .map((p: any) => ({
                id: p.id,
                slug: p.slug,
                title: p.title,
                brand: p.brand || 'Vyntra Atelier',
                category: p.category || categoryKey,
                subcategory: (p.subCategory || p.category || categoryKey).toLowerCase(),
                subCategory: p.subCategory || 'Collection Piece',
                price: Number(p.price || 0),
                originalPrice: Number(p.originalPrice || p.price || 0),
                discount: p.discount || '',
                rating: Number(p.rating) || 4.5,
                reviews: Number(p.reviewCount) || 1,
                isBestSeller: true,
                isAmazonChoice: false,
                isLimitedDeal: false,
                isPrime: true,
                deliveryDate: 'Tomorrow, 11 AM',
                image: p.image || '',
                stockCount: Number(p.stockCount || 0),
                inStock: p.inStock !== false,
                vendorName: p.vendor?.name || p.brand || 'Verified Boutique',
                vendorSlug: p.vendor?.slug || '',
                sizes: Array.isArray(p.sizes) ? p.sizes : ['Standard'],
                swatches: Array.isArray(p.colors)
                  ? p.colors.map((c: string) => ({ name: c, colorCode: '#333' }))
                  : [],
                boughtPastMonth: '',
                unitPriceNotice: '',
                couponNotice: '',
                material: 'Premium',
                dialColor: 'Classic',
                bandMaterial: 'Leather',
                shape: 'Classic',
                metalType: 'Gold Plated',
                gemstoneType: 'Pearl',
                isQualityVerified: true,
                specs: p.specs,
              }));
            setDbProducts(matched);
          } else {
            setDbProducts([]);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.error(`[useCategoryProducts Error for "${categoryKey}"]:`, err);
          setError(err.message || 'Failed to fetch category products');
          setDbProducts([]);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadProducts();
    return () => {
      isMounted = false;
    };
  }, [categoryKey, extraKeywords.join(',')]);

  // Dynamically derived list of brands from the actual database products
  const dynamicBrands = useMemo(() => {
    const brands = dbProducts.map((p) => p.brand).filter(Boolean);
    return Array.from(new Set(brands));
  }, [dbProducts]);

  return {
    products: dbProducts,
    dynamicBrands,
    isLoading,
    error,
    isEmpty: !isLoading && dbProducts.length === 0,
  };
}
