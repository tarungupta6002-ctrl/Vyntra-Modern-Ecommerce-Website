import { DetailedProduct, ProductImage, ProductColor, ProductSize } from './products';
import { SellerOfferItem } from '@/types/multiseller';

function createMobileSellerOffers(
  productId: string,
  price: number,
  originalPrice: number,
  stockCount: number = 25
): SellerOfferItem[] {
  const discountPercent =
    originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

  const primaryOffer: SellerOfferItem = {
    id: `offer-${productId}-tarun-store`,
    productId,
    vendorId: 'vendor-tarun-store',
    vendor: {
      id: 'vendor-tarun-store',
      storeName: 'Tarun Store',
      storeSlug: 'tarun-store',
      rating: 4.9,
      isVerified: true,
      city: 'Mahoba',
      state: 'Uttar Pradesh',
    },
    condition: 'NEW',
    sellingPrice: price,
    originalPrice,
    discountPercent,
    stock: stockCount,
    handlingDays: 1,
    estimatedDeliveryDays: 2,
    fulfillmentType: 'VYNTRA_FULFILLED',
    shipsFrom: 'Vyntra Express Logistics, Mahoba',
    isBuyBoxWinner: true,
    isOriginalCreator: true,
  };

  const secondaryOffer: SellerOfferItem = {
    id: `offer-${productId}-appario-tech`,
    productId,
    vendorId: 'vendor-appario-tech',
    vendor: {
      id: 'vendor-appario-tech',
      storeName: 'Appario Electronics Hub',
      storeSlug: 'appario-electronics',
      rating: 4.8,
      isVerified: true,
      city: 'Bengaluru',
      state: 'Karnataka',
    },
    condition: 'NEW',
    sellingPrice: Math.round(price * 1.02),
    originalPrice,
    discountPercent: Math.max(0, Math.round(((originalPrice - price * 1.02) / originalPrice) * 100)),
    stock: 14,
    handlingDays: 1,
    estimatedDeliveryDays: 3,
    fulfillmentType: 'VYNTRA_FULFILLED',
    shipsFrom: 'Vyntra Prime Hub, Bengaluru',
    isBuyBoxWinner: false,
    isOriginalCreator: false,
  };

  return [primaryOffer, secondaryOffer];
}

export const FALLBACK_MOBILES: DetailedProduct[] = [
  {
    id: 'mob-apl-ip15-128',
    slug: 'apple-iphone-15-128gb-black',
    sku: 'APL-IP15-128-BLK',
    title: 'Apple iPhone 17 Pro 512 GB: 15.93 cm (6.3") Display with Promotion up to 120Hz, A19 Pro Chip, Breakthrough Battery Life, Pro Fusion Camera System with Center Stage Front Camera; Cosmic Orange',
    subtitle: '120Hz ProMotion Display • Pro Fusion Camera System • A19 Pro Chip • Breakthrough Battery Life',
    brand: 'Apple',
    vendorName: 'Tarun Store',
    originalVendorId: 'vendor-tarun-store',
    originalVendorName: 'Tarun Store',
    category: 'mobiles',
    subCategory: 'Flagship Smartphones',
    breadcrumb: [
      { label: 'Home', href: '/' },
      { label: 'Mobiles', href: '/mobiles' },
      { label: 'Apple', href: '/mobiles?brand=Apple' },
      { label: 'iPhone 17 Pro', href: '/products/apple-iphone-15-128gb-black' },
    ],
    price: 150990,
    originalPrice: 154900,
    discount: '3% OFF',
    rating: 4.9,
    reviewCount: 3842,
    recommendedPct: 98,
    badge: 'New Launch',
    badgeVariant: 'primary',
    isExpress: true,
    isCustomized: false,
    stockCount: 42,
    highlights: [
      'ProMotion display up to 120Hz on a breathtaking 15.93 cm (6.3") Super Retina XDR OLED display',
      'Groundbreaking A19 Pro Chip powers elite performance, ray-tracing gaming, and on-device machine intelligence',
      'Pro Fusion Camera system with Center Stage front camera and enhanced computational zoom',
      'Breakthrough battery life engineered for all-day heavy professional usage and ultra-fast charging',
      'Cosmic Orange aerospace-grade titanium finish with Ceramic Shield front protection',
    ],
    customSpecs: [
      { label: 'Processor', value: 'A19 Pro Chip (6-core CPU, 6-core GPU, next-gen Neural Engine)' },
      { label: 'Display', value: '15.93 cm (6.3") Super Retina XDR OLED with ProMotion up to 120Hz' },
      { label: 'Primary Camera', value: 'Pro Fusion Camera System with 48MP Main, Ultra Wide & Center Stage Front Camera' },
      { label: 'Front Camera', value: '12MP TrueDepth Camera with Center Stage and Photonic Engine' },
      { label: 'RAM', value: '8 GB High-Speed Unified Memory' },
      { label: 'Storage', value: '512 GB NVMe Storage' },
      { label: 'Battery', value: 'Breakthrough All-Day Battery Life (Up to 24 hours playback, USB-C Fast Charge)' },
      { label: 'Network', value: '5G (Sub-6 GHz) with 4x4 MIMO, Gigabit LTE' },
      { label: 'SIM Type', value: 'Dual SIM (Nano-SIM and eSIM)' },
      { label: 'Operating System', value: 'iOS 18' },
      { label: 'In-The-Box', value: 'iPhone with iOS 18, USB-C Charge Cable (1m), Documentation' },
      { label: 'Warranty', value: '1 Year Apple Manufacturer Warranty across all authorized centers' },
    ],
    images: [
      {
        id: 1,
        title: 'Apple iPhone 17 Pro Cosmic Orange Showcase',
        alt: 'Apple iPhone 17 Pro 512 GB Cosmic Orange Front and Rear Showcase',
        src: '/images/mobiles/iphone-flagship.jpg',
      },
      {
        id: 2,
        title: 'Apple iPhone 17 Pro Camera & Dynamic Island',
        alt: 'Apple iPhone 17 Pro Precision Craftsmanship',
        src: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=1200&q=80',
      },
    ],
    colors: [
      { name: 'Cosmic Orange', hex: '#DD6B20', imageUrl: '/images/mobiles/iphone-flagship.jpg' },
      { name: 'Deep Blue', hex: '#00288e', imageUrl: '/images/mobiles/iphone-flagship.jpg' },
    ],
    sizeLabel: 'Storage / Variant',
    sizes: [
      { size: '512 GB', dimension: '512GB ROM' },
      { size: '1 TB', dimension: '1TB ROM' },
    ],
    rawVariants: [
      { id: 'v-ip17-512-ora', sku: 'APL-IP17-512-ORA', size: '512 GB', color: 'Cosmic Orange', price: 150990, originalPrice: 154900, stock: 24, imageUrl: '/images/mobiles/iphone-flagship.jpg' },
      { id: 'v-ip17-1tb-ora', sku: 'APL-IP17-1TB-ORA', size: '1 TB', color: 'Cosmic Orange', price: 150990, originalPrice: 154900, stock: 24, imageUrl: '/images/mobiles/iphone-flagship.jpg' },
      { id: 'v-ip17-512-blu', sku: 'APL-IP17-512-BLU', size: '512 GB', color: 'Deep Blue', price: 150990, originalPrice: 154900, stock: 24, imageUrl: '/images/mobiles/iphone-flagship.jpg' },
      { id: 'v-ip17-1tb-blu', sku: 'APL-IP17-1TB-BLU', size: '1 TB', color: 'Deep Blue', price: 150990, originalPrice: 154900, stock: 24, imageUrl: '/images/mobiles/iphone-flagship.jpg' },
    ],
    tabs: {
      specs: [
        { label: 'Processor', val: 'A19 Pro Chip (6-core CPU, 6-core GPU, next-gen Neural Engine)' },
        { label: 'Display', val: '15.93 cm (6.3") Super Retina XDR OLED with ProMotion up to 120Hz' },
        { label: 'Camera', val: 'Pro Fusion Camera System with 48MP Main & Center Stage Front Camera' },
        { label: 'Storage', val: '512 GB' },
        { label: 'Network', val: '5G Enabled' },
      ],
      care: [
        { iconName: 'shield', title: 'Brand Warranty', desc: '1 Year Apple India Warranty on device.' },
        { iconName: 'zap', title: 'Fast Delivery', desc: 'Dispatched via Vyntra Express in tamper-evident packaging.' },
      ],
      guarantee: [
        { iconName: 'shieldCheck', title: '100% Genuine Apple', desc: 'Sourced directly from authorized Apple national distributors.' },
      ],
    },
    sellerOffers: createMobileSellerOffers('mob-apl-ip15-128', 65999, 79900, 42),
    reviews: {
      average: 4.8,
      total: 3842,
      breakdown: [
        { stars: 5, pct: 85 },
        { stars: 4, pct: 10 },
        { stars: 3, pct: 3 },
        { stars: 2, pct: 1 },
        { stars: 1, pct: 1 },
      ],
      customerPhotos: [],
      list: [
        {
          id: 'rev-ip15-1',
          author: 'Vikram Malhotra',
          initials: 'VM',
          verified: true,
          location: 'Delhi',
          rating: 5,
          date: 'Nov 2026',
          sizePurchased: '128 GB',
          title: 'Unbelievable Camera and All-Day Battery',
          text: 'Upgraded from iPhone 12 and the jump is night and day. The Dynamic Island feels intuitive and the 48MP camera captures stunning crisp details.',
          helpfulCount: 42,
        },
        {
          id: 'rev-ip15-2',
          author: 'Sneha Patel',
          initials: 'SP',
          verified: true,
          location: 'Mumbai',
          rating: 5,
          date: 'Oct 2026',
          sizePurchased: '256 GB',
          title: 'USB-C is finally here!',
          text: 'Charging everything with one cable is so convenient. Delivered next day by Tarun Store in mint condition.',
          helpfulCount: 29,
        },
      ],
    },
    relatedProducts: [],
    recentlyViewed: [],
  },
];

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
