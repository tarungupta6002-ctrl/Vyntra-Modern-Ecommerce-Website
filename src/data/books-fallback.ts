import { CategoryProductItem } from '@/hooks/use-category-products';
import { DetailedProduct } from './products';
import { SellerOfferItem } from '@/types/multiseller';

// Demo products removed: catalog pages show only real products from the database.
export const FALLBACK_BOOKS: CategoryProductItem[] = [];

const BOOKS_MAP = new Map<string, CategoryProductItem>();
for (const p of FALLBACK_BOOKS) {
  BOOKS_MAP.set(p.slug.toLowerCase(), p);
}

export function getBooksProductBySlug(slug: string): CategoryProductItem | undefined {
  if (!slug) return undefined;
  return BOOKS_MAP.get(slug.toLowerCase());
}

export function getBooksDetailedProductBySlug(slug: string): DetailedProduct | undefined {
  const item = getBooksProductBySlug(slug);
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
    stock: item.stockCount || 50,
    handlingDays: 1,
    estimatedDeliveryDays: 1,
    fulfillmentType: 'VYNTRA_FULFILLED',
    shipsFrom: 'Vyntra Express Logistics Hub',
    isBuyBoxWinner: true,
    isOriginalCreator: true,
  };

  return {
    id: item.id,
    slug: item.slug,
    sku: `BOOK-${item.id.slice(-6).toUpperCase()}`,
    title: item.title,
    subtitle: `by ${item.brand} (Author) • Official Publisher Edition • 100% Genuine`,
    brand: item.brand,
    vendorName: item.vendorName,
    originalVendorId: 'vendor-tarun-store',
    originalVendorName: item.vendorName,
    category: 'books',
    subCategory: item.subcategory || 'Books & Literature',
    breadcrumb: [
      { label: 'Home', href: '/' },
      { label: 'Books', href: '/books' },
      { label: item.brand, href: `/books?author=${encodeURIComponent(item.brand)}` },
      { label: item.title, href: `/products/${item.slug}` },
    ],
    price: item.price,
    originalPrice: item.originalPrice,
    discount: item.discount,
    rating: item.rating,
    reviewCount: item.reviews,
    recommendedPct: 98,
    badge: item.isBestSeller ? 'BESTSELLER' : item.isAmazonChoice ? "VYNTRA'S CHOICE" : undefined,
    badgeVariant: 'primary',
    isExpress: item.isPrime,
    stockCount: item.stockCount,
    highlights: [
      `Official 100% authentic publisher edition by ${item.brand}`,
      'High-grade archival paper and premium binding quality',
      'Dispatched with sturdy protective book mailer packaging',
      'Eligible for 7-Day Replacement Guarantee with Vyntra Assured',
    ],
    customSpecs,
    images: [
      { id: 1, title: item.title, alt: item.title, src: item.image },
    ],
    colors: [
      { name: 'Standard Edition', hex: '#111827', imageUrl: item.image },
    ],
    sizeLabel: 'Format / Binding',
    sizes: (item.sizes || ['Paperback']).map((s) => ({
      size: s,
      dimension: s,
    })),
    rawVariants: (item.sizes || ['Paperback']).map((s, idx) => ({
      id: `var-${item.id}-${idx}`,
      sku: `BOOK-${item.id.slice(-4)}-${idx + 1}`,
      size: s,
      color: 'Standard Edition',
      price: item.price,
      originalPrice: item.originalPrice,
      stock: item.stockCount || 50,
      imageUrl: item.image,
    })),
    tabs: {
      specs: customSpecs.map((s) => ({ label: s.label, val: s.value })),
      care: [
        { iconName: 'shield', title: 'Authentic Edition', desc: 'Direct publisher print edition with verified ISBN.' },
        { iconName: 'zap', title: 'Fast Dispatch', desc: 'Ships within 24 hours in tamper-evident protective mailer.' },
      ],
      guarantee: [
        { iconName: 'shieldCheck', title: '100% Genuine Book', desc: 'Direct from authorized publishing houses.' },
      ],
    },
    sellerOffers: [primaryOffer],
    reviews: {
      average: item.rating,
      total: item.reviews,
      breakdown: [
        { stars: 5, pct: 86 },
        { stars: 4, pct: 10 },
        { stars: 3, pct: 2 },
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
