import { APlusData } from '@/types/aplus';
import { BuyBoxResult, SellerOfferItem } from '@/types/multiseller';

export interface ProductImage {
  id: number | string;
  title: string;
  alt: string;
  src: string;
}

export interface ProductColor {
  name: string;
  hex: string;
  imageUrl?: string;
  bgClass?: string;
}

export interface ProductSize {
  size: string;
  dimension?: string;
  badge?: string;
  disabled?: boolean;
}

export interface SizeGuideRow {
  size: string;
  values: string[];
}

export interface SizeGuide {
  columns: string[];
  rows: SizeGuideRow[];
  aiRecommendation?: string;
}

export interface ProductTabStory {
  badge: string;
  title: string;
  description: string[];
  stats: { label: string; value: string }[];
  image: string;
}

export interface ProductTabSpec {
  label: string;
  val: string;
}

export interface ProductTabCare {
  iconName: string;
  title: string;
  desc: string;
}

export interface ProductTabGuarantee {
  iconName: string;
  title: string;
  desc: string;
}

export interface BundleItem {
  id: string;
  title: string;
  price: number;
  mrp: number;
  image: string;
  required?: boolean;
}

export interface CustomerReview {
  id: string;
  author: string;
  initials: string;
  verified: boolean;
  location: string;
  rating: number;
  date: string;
  sizePurchased?: string;
  title: string;
  text: string;
  helpfulCount: number;
}

export interface CustomerPhoto {
  src: string;
  tag: string;
  caption: string;
}

export interface ProductSummary {
  id: string;
  slug: string;
  title: string;
  brand: string;
  price: number;
  originalPrice: number;
  discount: string;
  rating: number;
  reviewCount: number;
  badge?: string;
  badgeVariant?: 'primary' | 'secondary' | 'accent';
  image: string;
}

export interface DetailedProduct {
  id: string;
  slug: string;
  sku: string;
  title: string;
  subtitle: string;
  brand: string;
  vendorName: string;
  originalVendorId?: string;
  originalVendorName?: string;
  category: 'ethnic' | 'apparel' | 'footwear' | 'accessories' | 'watches' | 'bags' | 'mobiles' | 'electronics' | string;
  subCategory: string;
  breadcrumb: { label: string; href: string }[];
  price: number;
  originalPrice: number;
  discount: string;
  rating: number;
  reviewCount: number;
  recommendedPct: number;
  badge?: string;
  badgeVariant?: 'primary' | 'secondary' | 'accent';
  giCertified?: boolean;
  isExpress: boolean;
  isCustomized?: boolean;
  stockCount?: number;
  rawVariants?: Array<{
    id: string;
    sku: string;
    size: string | null;
    color: string | null;
    price: number;
    originalPrice?: number | null;
    stock: number;
    imageUrl?: string | null;
  }>;
  highlights?: string[];
  customSpecs?: Array<{ label: string; value: string }>;
  images: ProductImage[];
  colors: ProductColor[];
  sizeLabel: string;
  sizes: ProductSize[];
  sizeGuide?: SizeGuide;
  modelInfo?: string;
  coupons?: { code: string; title: string; desc: string; discount: number }[];
  tabs: {
    story?: ProductTabStory;
    specs?: ProductTabSpec[];
    care?: ProductTabCare[];
    guarantee?: ProductTabGuarantee[];
  };
  bundle?: {
    title: string;
    concession: number;
    items: BundleItem[];
  };
  aplusContent?: APlusData;
  buyBox?: BuyBoxResult | null;
  sellerOffers?: SellerOfferItem[];
  reviews: {
    average: number;
    total: number;
    breakdown: { stars: number; pct: number }[];
    fitAccuracy?: { label: string; pct: number; note: string };
    customerPhotos: CustomerPhoto[];
    list: CustomerReview[];
  };
  relatedProducts: ProductSummary[];
  recentlyViewed: ProductSummary[];
}

export const PRODUCTS_DATABASE: DetailedProduct[] = [];

// Helper: Find product by slug with fallback to first product
export function getProductBySlug(slug: string): DetailedProduct | undefined {
  return (
    PRODUCTS_DATABASE.find(
      (p) => p.slug === slug || p.slug.toLowerCase() === slug.toLowerCase()
    ) || undefined
  );
}

// Helper: Get all product slugs for static generation
export function getAllProductSlugs(): string[] {
  return PRODUCTS_DATABASE.map((p) => p.slug);
}
