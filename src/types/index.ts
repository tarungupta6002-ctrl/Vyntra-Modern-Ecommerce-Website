export interface Vendor {
  id: string;
  name: string;
  city: string;
  rating: number;
  verified: boolean;
  provenance: string; // e.g. 'Jaipur Handloom Collective', 'Direct Artisan'
}

export interface ProductVariant {
  id: string;
  sku: string;
  size?: string;
  color?: string;
  price: number;
  originalPrice: number;
  discountPercentage: number;
  stock: number;
}

export interface Product {
  id: string;
  title: string;
  subtitle?: string;
  brand: string;
  vendor: Vendor;
  category: string;
  rating: number;
  reviewsCount: number;
  images: string[];
  variants: ProductVariant[];
  selectedVariant: ProductVariant;
  tags?: string[];
  expressDelivery: boolean;
}

export interface CartItem {
  id: string;
  productId: string;
  title: string;
  brand: string;
  variantId: string;
  size?: string | null;
  color?: string | null;
  price: number;
  originalPrice: number;
  image: string;
  quantity: number;
  vendorName: string;
  vendorId?: string;
  sellerOfferId?: string;
  offerVariantId?: string;
  handlingDays?: number;
  shippingFee?: number;
  availableStock?: number;
  inStock?: boolean;
  slug?: string;
  sku?: string;
}

export type Category = {
  id: string;
  name: string;
  path: string;
  count?: string;
  isHot?: boolean;
};
