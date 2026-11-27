import { CategoryProductItem } from '@/hooks/use-category-products';
import { DetailedProduct } from './products';
import { SellerOfferItem } from '@/types/multiseller';

export const FALLBACK_ELECTRONICS: CategoryProductItem[] = [];

const ELECTRONICS_MAP = new Map<string, CategoryProductItem>();
for (const p of FALLBACK_ELECTRONICS) {
  ELECTRONICS_MAP.set(p.slug.toLowerCase(), p);
}

export function getElectronicsProductBySlug(slug: string): CategoryProductItem | undefined {
  if (!slug) return undefined;
  return ELECTRONICS_MAP.get(slug.toLowerCase());
}

export function getElectronicsDetailedProductBySlug(slug: string): DetailedProduct | undefined {
  const item = getElectronicsProductBySlug(slug);
  if (!item) return undefined;

  const specEntries = Object.entries(item.specs || {});
  const customSpecs = specEntries.map(([k, v]) => ({
    label: k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    value: String(v),
  }));

  const primaryOffer: SellerOfferItem = {
    id: `offer-${item.id}-tarun-store`,
    productId: item.id,
    vendorId: 'vendor-tarun-store',
    vendor: {
      id: 'vendor-tarun-store',
      storeName: item.vendorName || 'Tarun Store',
      storeSlug: item.vendorSlug || 'tarun-store-fdam',
      rating: 4.9,
      isVerified: true,
      city: 'Mahoba',
      state: 'Uttar Pradesh',
    },
    condition: 'NEW',
    sellingPrice: item.price,
    originalPrice: item.originalPrice,
    discountPercent:
      item.originalPrice > item.price
        ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)
        : 0,
    stock: item.stockCount || 15,
    handlingDays: 1,
    estimatedDeliveryDays: 2,
    fulfillmentType: 'VYNTRA_FULFILLED',
    shipsFrom: 'Vyntra Express Logistics Hub',
    isBuyBoxWinner: true,
    isOriginalCreator: true,
  };

  return {
    id: item.id,
    slug: item.slug,
    sku: `ELEC-${item.id.slice(-6).toUpperCase()}`,
    title: item.title,
    subtitle: `${item.brand} Flagship • 100% Genuine • 1 Year Warranty`,
    brand: item.brand,
    vendorName: item.vendorName,
    originalVendorId: 'vendor-tarun-store',
    originalVendorName: item.vendorName,
    category: 'electronics',
    subCategory: item.subCategory || 'Electronics & Smart Gadgets',
    breadcrumb: [
      { label: 'Home', href: '/' },
      { label: 'Electronics', href: '/electronics' },
      { label: item.brand, href: `/electronics?brand=${encodeURIComponent(item.brand)}` },
      { label: item.title, href: `/products/${item.slug}` },
    ],
    price: item.price,
    originalPrice: item.originalPrice,
    discount: item.discount,
    rating: item.rating,
    reviewCount: item.reviews,
    recommendedPct: 96,
    badge: item.isBestSeller ? 'BESTSELLER' : item.isAmazonChoice ? "VYNTRA'S CHOICE" : undefined,
    badgeVariant: 'primary',
    isExpress: item.isPrime,
    stockCount: item.stockCount,
    highlights: [
      `Official 100% genuine ${item.brand} product with authentic warranty`,
      `Engineered for premium performance, durability, and seamless connectivity`,
      'Dispatched via Vyntra Express in tamper-evident protective transit packaging',
      'Eligible for 7-Day Replacement Guarantee and dedicated tech support',
    ],
    customSpecs,
    images: [
      { id: 1, title: item.title, alt: item.title, src: item.image },
    ],
    colors: [
      { name: 'Standard Edition', hex: '#111827', imageUrl: item.image },
    ],
    sizeLabel: 'Configuration / Variant',
    sizes: (item.sizes || ['Standard Edition']).map((s) => ({
      size: s,
      dimension: s,
    })),
    rawVariants: (item.sizes || ['Standard Edition']).map((s, idx) => ({
      id: `var-${item.id}-${idx}`,
      sku: `ELEC-${item.id.slice(-4)}-${idx + 1}`,
      size: s,
      color: 'Standard Edition',
      price: item.price,
      originalPrice: item.originalPrice,
      stock: item.stockCount || 10,
      imageUrl: item.image,
    })),
    tabs: {
      specs: customSpecs.map((s) => ({ label: s.label, val: s.value })),
      care: [
        { iconName: 'shield', title: 'Brand Warranty', desc: `1 Year official ${item.brand} Warranty.` },
        { iconName: 'zap', title: 'Express Delivery', desc: 'Ships within 24 hours in tamper-evident box.' },
      ],
      guarantee: [
        { iconName: 'shieldCheck', title: '100% Genuine Tech', desc: 'Direct from authorized brand distributors.' },
      ],
    },
    sellerOffers: [primaryOffer],
    reviews: {
      average: item.rating,
      total: item.reviews,
      breakdown: [
        { stars: 5, pct: 80 },
        { stars: 4, pct: 15 },
        { stars: 3, pct: 3 },
        { stars: 2, pct: 1 },
        { stars: 1, pct: 1 },
      ],
      customerPhotos: [],
      list: [],
    },
    relatedProducts: [],
    recentlyViewed: [],
  };
}

export function getAllElectronicsProductSlugs(): string[] {
  return FALLBACK_ELECTRONICS.map((e) => e.slug);
}
