/**
 * ==============================================================================
 * VYNTRA MULTI-SELLER ARCHITECTURE TYPES
 * Decoupled Catalog Master, Seller Offers, Buy Box & Multi-Vendor Shipments
 * ==============================================================================
 */

export type OfferCondition = 'NEW' | 'REFURBISHED' | 'ARTISAN_RESTORED';
export type FulfillmentType = 'SELLER_FULFILLED' | 'VYNTRA_FULFILLED';
export type OfferStatus = 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK';

export interface SellerProfileSummary {
  id: string;
  storeName: string;
  storeSlug: string;
  logoUrl?: string | null;
  rating: number;
  totalSales?: number;
  isVerified: boolean;
  city?: string;
  state?: string;
}

export interface SellerOfferItem {
  id: string;
  productId: string;
  variantId?: string;
  vendorId: string;
  vendor: SellerProfileSummary;
  condition: OfferCondition;
  sellingPrice: number;
  originalPrice: number;
  discountPercent: number;
  stock: number;
  handlingDays: number; // e.g. 1-2 business days
  estimatedDeliveryDays: number; // total days to customer door
  fulfillmentType: FulfillmentType;
  shipsFrom: string; // e.g. "Jaipur, Rajasthan"
  isBuyBoxWinner: boolean;
  isOriginalCreator?: boolean;
  score?: number;
  offerVariants?: Array<{
    id: string;
    productVariantId: string;
    sellerSku?: string;
    sellingPrice: number;
    mrpPrice: number;
    stock: number;
  }>;
}

export interface BuyBoxResult {
  winner: SellerOfferItem;
  otherOffers: SellerOfferItem[];
  totalOffersCount: number;
  lowestPrice: number;
  highestPrice: number;
}

export interface VendorShipmentItem {
  orderItemId: string;
  productId: string;
  variantId?: string;
  sellerOfferId?: string;
  productTitle: string;
  variantSku: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  size?: string | null;
  color?: string | null;
}

export interface VendorSubOrderShipment {
  id: string;
  orderId: string;
  vendorId: string;
  vendorName: string;
  shipmentNumber: string;
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
  subtotal: number;
  shippingFee: number;
  courierPartner?: string | null;
  trackingNumber?: string | null;
  dispatchedAt?: string | null;
  deliveredAt?: string | null;
  items: VendorShipmentItem[];
}
