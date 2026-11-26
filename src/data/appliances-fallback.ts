import { CategoryProductItem } from '@/hooks/use-category-products';
import { DetailedProduct } from './products';
import { SellerOfferItem } from '@/types/multiseller';

// Demo products removed: catalog pages show only real products from the database.
export const FALLBACK_APPLIANCES: CategoryProductItem[] = [];

const APPLIANCES_MAP = new Map<string, CategoryProductItem>();
for (const p of FALLBACK_APPLIANCES) {
  APPLIANCES_MAP.set(p.slug.toLowerCase(), p);
}

export function getApplianceProductBySlug(slug: string): CategoryProductItem | undefined {
  if (!slug) return undefined;
  return APPLIANCES_MAP.get(slug.toLowerCase());
}

export function getApplianceDetailedProductBySlug(slug: string): DetailedProduct | undefined {
  const item = getApplianceProductBySlug(slug);
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
    sku: `APP-${item.id.slice(-6).toUpperCase()}`,
    title: item.title,
    subtitle: `${item.brand} Official Appliances Warranty - Free Scheduled Delivery & Technician Installation`,
    brand: item.brand,
    vendorName: item.vendorName,
    originalVendorId: 'vendor-tarun-store',
    originalVendorName: item.vendorName,
    category: 'appliances',
    subCategory: item.subcategory || 'Major & Small Appliances',
    breadcrumb: [
      { label: 'Home', href: '/' },
      { label: 'Appliances', href: '/appliances' },
      { label: item.brand, href: `/appliances?brand=${encodeURIComponent(item.brand)}` },
      { label: item.title, href: `/products/${item.slug}` },
    ],
    price: item.price,
    originalPrice: item.originalPrice,
    discount: item.discount,
    rating: item.rating,
    reviewCount: item.reviews,
    recommendedPct: 95,
    badge: item.isBestSeller ? 'BESTSELLER' : item.isAmazonChoice ? "VYNTRA'S CHOICE" : undefined,
    badgeVariant: 'primary',
    isExpress: item.isPrime,
    stockCount: item.stockCount,
    highlights: [
      `Official 100% genuine ${item.brand} product with authentic warranty`,
      'Free doorstep scheduled delivery with unboxing & inspection',
      'Professional certified technician installation and demonstration',
      '10-Day return and replacement guarantee with Vyntra Assured',
      'Up to ₹5,000 instant bank discount and exchange bonus',
    ],
    customSpecs,
    images: [
      { id: 1, title: item.title, alt: item.title, src: item.image },
    ],
    colors: [
      { name: 'Classic Inox', hex: '#6B7280', imageUrl: item.image },
      { name: 'Glossy Silver', hex: '#D1D5DB', imageUrl: item.image },
      { name: 'Black Mirror', hex: '#111827', imageUrl: item.image },
    ],
    sizeLabel: 'Capacity / Configuration',
    sizes: (item.sizes || ['Standard Edition']).map((s) => ({
      size: s,
      dimension: s,
    })),
    rawVariants: (item.sizes || ['Standard Edition']).map((s, idx) => ({
      id: `var-${item.id}-${idx}`,
      sku: `APP-${item.id.slice(-4)}-${idx + 1}`,
      size: s,
      color: 'Classic Inox',
      price: item.price,
      originalPrice: item.originalPrice,
      stock: item.stockCount || 10,
      imageUrl: item.image,
    })),
    tabs: {
      specs: customSpecs.map((s) => ({ label: s.label, val: s.value })),
      care: [
        { iconName: 'wrench', title: 'Free Installation', desc: 'Brand certified doorstep installation included.' },
        { iconName: 'shield', title: '10-Year Warranty', desc: '10 Years on Motor/Compressor + 1 Year Comprehensive.' },
      ],
      guarantee: [
        { iconName: 'shieldCheck', title: '100% Genuine Appliance', desc: 'Direct from authorized brand manufacturers.' },
      ],
    },
    sellerOffers: [primaryOffer],
    reviews: {
      average: item.rating,
      total: item.reviews,
      breakdown: [
        { stars: 5, pct: 82 },
        { stars: 4, pct: 14 },
        { stars: 3, pct: 3 },
        { stars: 2, pct: 1 },
        { stars: 1, pct: 0 },
      ],
      customerPhotos: [],
      list: [],
    },
    relatedProducts: [],
    recentlyViewed: [],
  };
}
