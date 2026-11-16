import { prisma } from '@/lib/prisma';
import { OrderStatus, PaymentMethod } from '@prisma/client';
import { validateAndResolveVariant } from '@/lib/cart';

// ==============================================================================
// VYNTRA TRUSTED SERVER-SIDE CHECKOUT CALCULATION ENGINE
// Never trusts client-supplied amounts or prices.
// Validates products, variants, offers, inventory, coupons, and fees against DB.
// ==============================================================================

export interface ClientItemInput {
  productId: string;
  variantId?: string;
  sellerOfferId?: string;
  offerVariantId?: string;
  quantity: number;
  size?: string;
  color?: string;
}

export interface ValidatedOrderItem {
  productId: string;
  variantId: string;
  vendorId: string;
  storeName: string;
  sellerOfferId: string | null;
  offerVariantId: string | null;
  title: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selectedSize: string | null;
  selectedColor: string | null;
  inventoryId: string;
  inventoryType: 'OFFER_INVENTORY' | 'PRODUCT_INVENTORY';
  isCustomized?: boolean;
}

export interface VendorGroup {
  vendorId: string;
  storeName: string;
  items: ValidatedOrderItem[];
  subtotal: number;
  shippingFee: number;
}

export interface TrustedCheckoutCalculation {
  subtotal: number;
  discount: number;
  packagingFee: number;
  codFee: number;
  totalShippingFee: number;
  tax: number;
  totalAmount: number;
  totalAmountPaise: number;
  validatedOrderItems: ValidatedOrderItem[];
  vendorGroups: Map<string, VendorGroup>;
  cartId: string | null;
}

export class CheckoutCalculationError extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(message: string, statusCode: number = 400, code: string = 'CHECKOUT_ERROR', details?: any) {
    super(message);
    this.name = 'CheckoutCalculationError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Validates cart/items against database and computes authoritative financial totals.
 */
export async function calculateTrustedCheckoutAmount({
  userId,
  clientItems,
  couponCode,
  paymentMethod,
}: {
  userId: string;
  clientItems?: ClientItemInput[];
  couponCode?: string;
  paymentMethod: PaymentMethod | 'COD' | 'UPI' | 'CARD' | 'NETBANKING';
}): Promise<TrustedCheckoutCalculation> {
  // 1. Fetch or create user cart
  let userCart = await prisma.cart.findUnique({
    where: { userId },
  });

  if (!userCart) {
    userCart = await prisma.cart.create({ data: { userId } });
  }

  // 2. Synchronize client items if cart is empty or client items passed
  const currentItemCount = await prisma.cartItem.count({
    where: { cartId: userCart.id },
  });

  if (currentItemCount === 0 && Array.isArray(clientItems) && clientItems.length > 0) {
    for (const cItem of clientItems) {
      try {
        const parsedQty = Math.floor(Number(cItem.quantity) || 1);
        if (parsedQty <= 0) continue;

        const validated = await validateAndResolveVariant(cItem.productId, cItem.variantId);
        if (validated.availableStock > 0) {
          const finalQty = Math.min(parsedQty, validated.availableStock);
          await prisma.cartItem.upsert({
            where: {
              cartId_productId_variantId: {
                cartId: userCart.id,
                productId: validated.product.id,
                variantId: validated.variant.id,
              },
            },
            update: {
              quantity: finalQty,
              sellerOfferId: cItem.sellerOfferId || null,
              offerVariantId: cItem.offerVariantId || null,
            },
            create: {
              cartId: userCart.id,
              productId: validated.product.id,
              variantId: validated.variant.id,
              sellerOfferId: cItem.sellerOfferId || null,
              offerVariantId: cItem.offerVariantId || null,
              quantity: finalQty,
            },
          });
        }
      } catch (err) {
        console.warn('[Auto-sync item skipped]:', cItem.productId, err);
      }
    }
  }

  // 3. Load full cart items with relations
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: {
              vendor: true,
            },
          },
          variant: {
            include: {
              inventories: true,
            },
          },
          sellerOffer: {
            include: {
              vendor: true,
            },
          },
          offerVariant: {
            include: {
              inventories: true,
            },
          },
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    throw new CheckoutCalculationError(
      'Your shopping bag is empty. Please add items before checkout.',
      400,
      'CART_EMPTY'
    );
  }

  const validatedOrderItems: ValidatedOrderItem[] = [];
  let subtotal = 0;

  for (const item of cart.items) {
    const product = item.product;
    const variant = item.variant;

    if (!product || !product.isPublished) {
      throw new CheckoutCalculationError(
        `"${product?.title || 'An item'}" in your bag is no longer available. Please remove it from your cart.`,
        400,
        'PRODUCT_UNAVAILABLE',
        { productId: item.productId }
      );
    }

    // Resolve true vendor from OfferVariant -> SellerOffer -> Product fallback
    const effectiveVendorId =
      item.offerVariant?.vendorId ||
      item.sellerOffer?.vendorId ||
      product.vendorId;

    const vendorStoreName =
      item.sellerOffer?.vendor?.storeName ||
      product.vendor?.storeName ||
      'Artisan Seller';

    const vendorStatus =
      item.sellerOffer?.vendor?.status ||
      product.vendor?.status;

    if (vendorStatus !== 'APPROVED') {
      throw new CheckoutCalculationError(
        `The artisan partner "${vendorStoreName}" for "${product.title}" is currently not accepting new orders.`,
        400,
        'VENDOR_UNAVAILABLE',
        { productId: item.productId, vendorId: effectiveVendorId }
      );
    }

    if (!variant || variant.productId !== product.id) {
      throw new CheckoutCalculationError(
        `Variant for "${product.title}" is invalid or does not belong to this product.`,
        400,
        'INVALID_VARIANT'
      );
    }

    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new CheckoutCalculationError(
        `Invalid quantity (${item.quantity}) for "${product.title}". Quantity must be a positive integer.`,
        400,
        'INVALID_QUANTITY'
      );
    }

    // Price resolution: Prioritize verified OfferVariant price, fallback to ProductVariant catalog price
    let unitPrice = Number(variant.price || product.basePrice);
    if (item.offerVariant?.sellingPrice) {
      unitPrice = Number(item.offerVariant.sellingPrice);
    }

    // Inventory resolution: Prioritize OfferInventory, fallback to ProductInventory
    let inventoryId = '';
    let inventoryType: 'OFFER_INVENTORY' | 'PRODUCT_INVENTORY' = 'PRODUCT_INVENTORY';
    let availableStock = 0;

    if (item.offerVariant && item.offerVariant.inventories.length > 0) {
      const inv = item.offerVariant.inventories[0];
      inventoryId = inv.id;
      inventoryType = 'OFFER_INVENTORY';
      availableStock = Math.max(0, inv.quantity - inv.reservedQuantity);
    } else if (variant.inventories.length > 0) {
      const inv = variant.inventories[0];
      inventoryId = inv.id;
      inventoryType = 'PRODUCT_INVENTORY';
      availableStock = Math.max(0, inv.quantity - inv.reservedQuantity);
    }

    if (!inventoryId) {
      throw new CheckoutCalculationError(
        `Inventory record not found for "${product.title}".`,
        400,
        'INVENTORY_NOT_FOUND'
      );
    }

    if (item.quantity > availableStock) {
      throw new CheckoutCalculationError(
        `Only ${availableStock} unit(s) remaining for "${product.title}" (${variant.size || variant.color || 'Standard'}). You requested ${item.quantity}.`,
        400,
        'OUT_OF_STOCK',
        { availableStock, requestedQuantity: item.quantity, productId: product.id }
      );
    }

    const itemTotal = Number((unitPrice * item.quantity).toFixed(2));
    subtotal = Number((subtotal + itemTotal).toFixed(2));

    validatedOrderItems.push({
      productId: product.id,
      variantId: variant.id,
      vendorId: effectiveVendorId,
      storeName: vendorStoreName,
      sellerOfferId: item.sellerOfferId || item.offerVariant?.sellerOfferId || null,
      offerVariantId: item.offerVariantId || null,
      title: product.title,
      sku: item.offerVariant?.sellerSku || variant.sku,
      quantity: item.quantity,
      unitPrice,
      totalPrice: itemTotal,
      selectedSize: item.selectedSize || variant.size,
      selectedColor: item.selectedColor || variant.color,
      inventoryId,
      inventoryType,
      isCustomized: Boolean((product as any).isCustomized),
    });
  }

  // 4. Multi-Vendor Shipment Grouping
  const vendorGroups = new Map<string, VendorGroup>();

  for (const item of validatedOrderItems) {
    if (!vendorGroups.has(item.vendorId)) {
      vendorGroups.set(item.vendorId, {
        vendorId: item.vendorId,
        storeName: item.storeName,
        items: [],
        subtotal: 0,
        shippingFee: 0, // Vyntra standard express shipping is currently free (₹0.00)
      });
    }
    const group = vendorGroups.get(item.vendorId)!;
    group.items.push(item);
    group.subtotal = Number((group.subtotal + item.totalPrice).toFixed(2));
  }

  // 5. Server-side coupon verification
  const cleanCoupon = (couponCode || '').trim().toUpperCase();
  let discount = 0;
  if (cleanCoupon) {
    if (cleanCoupon !== 'VYNTRAFIRST') {
      throw new CheckoutCalculationError('Invalid coupon code. Only "VYNTRAFIRST" is currently active.', 400, 'INVALID_COUPON');
    }

    // Requirement 1: Minimum Order Value of ₹1,499
    if (subtotal < 1499) {
      throw new CheckoutCalculationError(
        `Coupon VYNTRAFIRST requires a minimum order value of ₹1,499. Current subtotal is ₹${subtotal}.`,
        400,
        'COUPON_MIN_VALUE_NOT_MET',
        { minOrderValue: 1499, currentSubtotal: subtotal }
      );
    }

    // Requirement 2: First Order Only (1-Time Use)
    if (userId) {
      const previousOrdersCount = await prisma.order.count({
        where: {
          userId,
          status: { not: OrderStatus.CANCELLED },
        },
      });

      if (previousOrdersCount > 0) {
        throw new CheckoutCalculationError(
          'Coupon VYNTRAFIRST is only valid on your first order. You have already placed previous orders.',
          400,
          'COUPON_FIRST_ORDER_ONLY',
          { previousOrdersCount }
        );
      }
    }

    discount = Math.min(Math.round(subtotal * 0.1), 1000); // 10% discount capped at Rs 1000
  }

  // 6. Fees & Total
  const isCod = (paymentMethod as string) === 'COD' || paymentMethod === PaymentMethod.COD;
  const packagingFee = validatedOrderItems.length > 0 ? 49 : 0;
  const codFee = isCod ? 49 : 0;
  const totalShippingFee = Array.from(vendorGroups.values()).reduce(
    (sum, g) => Number((sum + g.shippingFee).toFixed(2)),
    0
  );
  const tax = 0; // Inclusive in prices
  const totalAmount = Math.max(
    0,
    Number((subtotal - discount + packagingFee + codFee + totalShippingFee).toFixed(2))
  );
  const totalAmountPaise = Math.round(totalAmount * 100);

  return {
    subtotal,
    discount,
    packagingFee,
    codFee,
    totalShippingFee,
    tax,
    totalAmount,
    totalAmountPaise,
    validatedOrderItems,
    vendorGroups,
    cartId: userCart.id,
  };
}
