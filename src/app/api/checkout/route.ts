import { NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { validateAndResolveVariant } from '@/lib/cart';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { verifyRazorpaySignature, getRazorpayClient } from '@/lib/razorpay';
import { PaymentMethod, OrderStatus, PaymentStatus, PayoutStatus, ShipmentStatus } from '@prisma/client';
import { invalidateProduct } from '@/lib/cache-invalidation';

export const dynamic = 'force-dynamic';

// In-memory concurrency locks to prevent accidental rapid double-clicks per user
const activeCheckoutLocks = new Set<string>();

// Idempotency cache with 5-minute TTL
interface CachedCheckoutResponse {
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  itemCount: number;
  trackingNumber: string | null;
  courierPartner: string | null;
  timestamp: number;
}
const idempotencyCache = new Map<string, CachedCheckoutResponse>();

interface CheckoutRequestBody {
  paymentMethod?: 'COD' | 'UPI' | 'CARD' | 'NETBANKING' | 'cod';
  addressId?: string;
  shippingAddress?: {
    fullName: string;
    phone: string;
    streetAddress: string;
    locality?: string;
    landmark?: string;
    city: string;
    state: string;
    postalCode: string;
    addressType?: 'HOME' | 'WORK' | 'OTHER';
  };
  couponCode?: string;
  idempotencyKey?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  clientItems?: Array<{
    productId: string;
    variantId?: string;
    sellerOfferId?: string;
    offerVariantId?: string;
    quantity: number;
    size?: string;
    color?: string;
  }>;
}

export async function POST(request: Request) {
  let userId: string | null = null;

  try {
    const auth = await requireAuth();
    userId = auth.userId;

    // Rate limiting: 15 checkout attempts per minute per user
    const rateCheck = checkRateLimit(`checkout:${userId}`, 15, 60);
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.resetInSeconds, 'Too many checkout attempts. Please wait a moment before trying again.');
    }

    const body: CheckoutRequestBody = await request.json().catch(() => ({}));
    const idempotencyKey = (
      body.idempotencyKey ||
      request.headers.get('idempotency-key') ||
      request.headers.get('x-idempotency-key') ||
      ''
    ).trim();

    // 0a. Check idempotency cache first
    if (idempotencyKey) {
      const cached = idempotencyCache.get(`${userId}:${idempotencyKey}`);
      if (cached && Date.now() - cached.timestamp < 300000) {
        return apiSuccess(
          {
            message: 'Order already confirmed. Idempotent submission suppressed.',
            orderId: cached.orderId,
            orderNumber: cached.orderNumber,
            totalAmount: cached.totalAmount,
            status: cached.status,
            paymentMethod: cached.paymentMethod,
            paymentStatus: cached.paymentStatus,
            itemCount: cached.itemCount,
            trackingNumber: cached.trackingNumber,
            courierPartner: cached.courierPartner,
            isDuplicateSuppressed: true,
          },
          undefined,
          200
        );
      }
    }

    // 0b. Idempotency: Prevent overlapping concurrent checkouts for the same user
    if (activeCheckoutLocks.has(userId)) {
      return apiError(
        'A checkout request is already processing for your account. Please wait.',
        429,
        null,
        'CONCURRENT_CHECKOUT_IN_PROGRESS'
      );
    }
    activeCheckoutLocks.add(userId);

    const rawMethod = (body.paymentMethod || 'COD').toUpperCase();
    const paymentMethod: PaymentMethod =
      rawMethod === 'COD'
        ? PaymentMethod.COD
        : rawMethod === 'UPI'
        ? PaymentMethod.UPI
        : rawMethod === 'CARD'
        ? PaymentMethod.CARD
        : rawMethod === 'NETBANKING'
        ? PaymentMethod.NETBANKING
        : PaymentMethod.COD;

    let isOnlinePaid = false;
    if (paymentMethod !== PaymentMethod.COD) {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;
      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        return apiError(
          'Online payment authentication details are missing. Please complete payment via Razorpay.',
          400,
          null,
          'MISSING_PAYMENT_SIGNATURE'
        );
      }

      // Database-level Replay Protection: Check if this payment ID was already used
      const existingPaymentOrder = await prisma.order.findFirst({
        where: {
          OR: [
            { razorpayPaymentId: razorpayPaymentId },
            { remittanceReference: razorpayPaymentId },
          ],
        },
        include: { items: true },
      });
      if (existingPaymentOrder) {
        return apiSuccess(
          {
            message: 'Order already processed for this payment transaction. Duplicate creation safely suppressed.',
            orderId: existingPaymentOrder.id,
            orderNumber: existingPaymentOrder.orderNumber,
            totalAmount: Number(existingPaymentOrder.totalAmount),
            status: existingPaymentOrder.status,
            paymentMethod: existingPaymentOrder.paymentMethod,
            paymentStatus: existingPaymentOrder.paymentStatus,
            itemCount: existingPaymentOrder.items.length,
            trackingNumber: existingPaymentOrder.trackingNumber,
            courierPartner: existingPaymentOrder.courierPartner,
            isDuplicateSuppressed: true,
          },
          undefined,
          200
        );
      }

      const isValidSignature = verifyRazorpaySignature({
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        signature: razorpaySignature,
      });

      if (!isValidSignature) {
        return apiError(
          'Digital payment signature verification failed. Transaction cannot be confirmed.',
          400,
          null,
          'INVALID_PAYMENT_SIGNATURE'
        );
      }

      isOnlinePaid = true;
    }

    // Step 1: Validate or create shipping address with strict user ownership
    let shippingAddressId: string | null = null;

    if (body.addressId && !body.addressId.startsWith('addr-') && !body.addressId.startsWith('new')) {
      const existingAddress = await prisma.address.findUnique({
        where: { id: body.addressId },
      });

      if (existingAddress) {
        if (existingAddress.userId !== userId) {
          return apiError('The selected shipping address does not belong to your account.', 403);
        }
        shippingAddressId = existingAddress.id;
      }
    }

    // If no valid existing database address found, persist the provided address
    if (!shippingAddressId) {
      const addr = body.shippingAddress;
      if (!addr || !addr.fullName || !addr.phone || !addr.streetAddress || !addr.city || !addr.state || !addr.postalCode) {
        return apiError(
          'A complete delivery address (Full Name, Phone, Street, City, State, PIN code) is required.',
          400,
          null,
          'MISSING_SHIPPING_ADDRESS'
        );
      }

      const createdAddress = await prisma.address.create({
        data: {
          userId,
          fullName: addr.fullName.trim(),
          phone: addr.phone.trim(),
          streetAddress: addr.streetAddress.trim(),
          locality: addr.locality?.trim() || null,
          landmark: addr.landmark?.trim() || null,
          city: addr.city.trim(),
          state: addr.state.trim(),
          postalCode: addr.postalCode.trim(),
          country: 'India',
          addressType: addr.addressType || 'HOME',
          isDefault: true,
        },
      });
      shippingAddressId = createdAddress.id;
    }

    // Step 2: Fetch and validate user's active cart
    let userCart = await prisma.cart.findUnique({
      where: { userId },
    });

    if (!userCart) {
      userCart = await prisma.cart.create({ data: { userId } });
    }

    // Auto-sync fallback: if client sent items and cart is empty
    const currentItemCount = await prisma.cartItem.count({
      where: { cartId: userCart.id },
    });

    if (currentItemCount === 0 && Array.isArray(body.clientItems) && body.clientItems.length > 0) {
      for (const cItem of body.clientItems) {
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
                selectedSize: cItem.size || validated.variant.size,
                selectedColor: cItem.color || validated.variant.color,
              },
            });
          }
        } catch (e) {
          console.warn('[Checkout auto-sync item warn]:', e);
        }
      }
    }

    const cart = await prisma.cart.findUnique({
      where: { id: userCart.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                vendor: { select: { id: true, storeName: true, status: true } },
              },
            },
            variant: {
              include: {
                inventories: true,
              },
            },
            sellerOffer: {
              include: {
                vendor: { select: { id: true, storeName: true, status: true } },
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
      return apiError(
        'Your shopping bag is empty. Please add items before placing an order.',
        400,
        null,
        'CART_EMPTY'
      );
    }

    // Step 3: Multi-Vendor Server-Side Validation: Group items by Vendor / SellerOffer
    interface ValidatedItem {
      productId: string;
      slug?: string;
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

    const validatedOrderItems: ValidatedItem[] = [];
    let subtotal = 0;

    for (const item of cart.items) {
      const product = item.product;
      const variant = item.variant;

      if (!product || !product.isPublished) {
        return apiError(
          `"${product?.title || 'An item'}" in your bag is no longer available. Please remove it from your cart.`,
          400,
          { productId: item.productId },
          'PRODUCT_UNAVAILABLE'
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
        return apiError(
          `The artisan partner "${vendorStoreName}" for "${product.title}" is currently not accepting new orders.`,
          400,
          { productId: item.productId, vendorId: effectiveVendorId },
          'VENDOR_UNAVAILABLE'
        );
      }

      if (!variant || variant.productId !== product.id) {
        return apiError(
          `Variant for "${product.title}" is invalid or does not belong to this product.`,
          400,
          null,
          'INVALID_VARIANT'
        );
      }

      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        return apiError(
          `Invalid quantity (${item.quantity}) for "${product.title}". Quantity must be a positive integer.`,
          400,
          null,
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
        return apiError(
          `Inventory record not found for "${product.title}".`,
          400,
          null,
          'INVENTORY_NOT_FOUND'
        );
      }

      if (item.quantity > availableStock) {
        return apiError(
          `Only ${availableStock} unit(s) remaining for "${product.title}" (${variant.size || variant.color || 'Standard'}). You requested ${item.quantity}.`,
          400,
          { availableStock, requestedQuantity: item.quantity, productId: product.id },
          'OUT_OF_STOCK'
        );
      }

      const itemTotal = Number((unitPrice * item.quantity).toFixed(2));
      subtotal = Number((subtotal + itemTotal).toFixed(2));

      validatedOrderItems.push({
        productId: product.id,
        slug: product.slug,
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

    // Step 4: Multi-Vendor Shipment Grouping & Separate Shipping Calculations
    // Group validated order items by vendorId
    const vendorGroups = new Map<
      string,
      {
        vendorId: string;
        storeName: string;
        items: ValidatedItem[];
        subtotal: number;
        shippingFee: number;
      }
    >();

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

    // Server-side financial calculations
    const cleanCoupon = (body.couponCode || '').trim().toUpperCase();
    let discount = 0;
    if (cleanCoupon) {
      if (cleanCoupon !== 'VYNTRAFIRST') {
        return apiError('Invalid coupon code. Only "VYNTRAFIRST" is currently active.', 400, null, 'INVALID_COUPON');
      }

      // Requirement 1: Minimum Order Value of ₹1,499
      if (subtotal < 1499) {
        return apiError(
          `Coupon VYNTRAFIRST requires a minimum order value of ₹1,499. Current subtotal is ₹${subtotal}.`,
          400,
          { minOrderValue: 1499, currentSubtotal: subtotal },
          'COUPON_MIN_VALUE_NOT_MET'
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
          return apiError(
            'Coupon VYNTRAFIRST is only valid on your first order. You have already placed previous orders.',
            400,
            { previousOrdersCount },
            'COUPON_FIRST_ORDER_ONLY'
          );
        }
      }

      discount = Math.min(Math.round(subtotal * 0.1), 1000); // 10% discount capped at Rs 1000
    }

    const packagingFee = validatedOrderItems.length > 0 ? 49 : 0;
    const codFee = paymentMethod === PaymentMethod.COD ? 49 : 0;
    const totalShippingFee = Array.from(vendorGroups.values()).reduce(
      (sum, g) => Number((sum + g.shippingFee).toFixed(2)),
      0
    );
    const tax = 0; // Inclusive in prices
    const totalAmount = Math.max(
      0,
      Number((subtotal - discount + packagingFee + codFee + totalShippingFee).toFixed(2))
    );

    // Step 4b: Database-level Duplicate Suppression (catches rapid duplicate clicks/retries within 15s)
    const recentDuplicateOrder = await prisma.order.findFirst({
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 15000) },
        totalAmount,
        status: OrderStatus.CONFIRMED,
      },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentDuplicateOrder) {
      const matchesAllItems = validatedOrderItems.every((vItem) =>
        recentDuplicateOrder.items.some(
          (oItem) => oItem.productId === vItem.productId && oItem.quantity === vItem.quantity
        )
      );

      if (matchesAllItems && recentDuplicateOrder.items.length === validatedOrderItems.length) {
        return apiSuccess(
          {
            message: 'Order already confirmed. Duplicate request safely suppressed.',
            orderId: recentDuplicateOrder.id,
            orderNumber: recentDuplicateOrder.orderNumber,
            totalAmount: Number(recentDuplicateOrder.totalAmount),
            status: recentDuplicateOrder.status,
            paymentMethod: recentDuplicateOrder.paymentMethod,
            paymentStatus: recentDuplicateOrder.paymentStatus,
            itemCount: recentDuplicateOrder.items.length,
            trackingNumber: recentDuplicateOrder.trackingNumber,
            courierPartner: recentDuplicateOrder.courierPartner,
            isDuplicateSuppressed: true,
          },
          undefined,
          200
        );
      }
    }

    // Step 4c: Authoritative Razorpay Payment Gateway Verification (Anti-Tampering)
    if (isOnlinePaid && body.razorpayPaymentId) {
      try {
        const expectedPaise = Math.round(totalAmount * 100);
        const razorpay = getRazorpayClient();
        let rzpPayment: any = await razorpay.payments.fetch(body.razorpayPaymentId);

        // 1. Currency Verification
        if (rzpPayment.currency !== 'INR') {
          return apiError(
            `Invalid transaction currency "${rzpPayment.currency}". Only INR payments are accepted.`,
            400,
            null,
            'INVALID_CURRENCY'
          );
        }

        // 2. Order ID Verification
        if (rzpPayment.order_id && body.razorpayOrderId && rzpPayment.order_id !== body.razorpayOrderId) {
          return apiError(
            `Payment order ID mismatch. Gateway order "${rzpPayment.order_id}" does not match checkout order "${body.razorpayOrderId}".`,
            400,
            null,
            'ORDER_ID_MISMATCH'
          );
        }

        // 3. Payment Status Verification (Mandatory Captured Status for PAID)
        if (rzpPayment.status === 'authorized') {
          // Attempt authoritative server-side capture if auto-capture was delayed
          try {
            rzpPayment = await razorpay.payments.capture(
              body.razorpayPaymentId,
              expectedPaise,
              'INR'
            );
          } catch (captureErr: any) {
            return apiError(
              `Payment is authorized but capture could not be secured: ${captureErr.message || 'Capture failed'}. Order cannot be confirmed as PAID.`,
              400,
              null,
              'PAYMENT_CAPTURE_FAILED'
            );
          }
        }

        // Strict Enforcement: An order can ONLY be confirmed as PAID if status is 'captured'
        if (rzpPayment.status !== 'captured') {
          return apiError(
            `Payment status is "${rzpPayment.status}". An order cannot be finalized as PAID unless funds are fully captured.`,
            400,
            null,
            'PAYMENT_NOT_CAPTURED'
          );
        }

        // 4. Exact Amount Matching (Anti-Tampering Protection)
        if (Number(rzpPayment.amount) !== expectedPaise) {
          return apiError(
            `Payment amount mismatch! The amount captured by gateway (₹${(Number(rzpPayment.amount) / 100).toFixed(2)}) does not match the server-calculated order total (₹${totalAmount.toFixed(2)}). Order rejected for security reasons.`,
            400,
            {
              gatewayAmount: Number(rzpPayment.amount) / 100,
              serverCalculatedAmount: totalAmount,
            },
            'AMOUNT_MISMATCH'
          );
        }
      } catch (fetchErr: any) {
        return apiError(
          `Unable to verify payment with Razorpay gateway: ${fetchErr.message || 'Payment ID not found'}`,
          400,
          null,
          'GATEWAY_PAYMENT_FETCH_FAILED'
        );
      }
    }

    // Step 5: Execute Order Creation, VendorShipments, and Atomic Stock Decrement
    const orderTimestamp = Date.now().toString().slice(-6);
    const orderRandomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const orderNumber = `VYN-ORD-${orderTimestamp}-${orderRandomHex}`;

    const createdOrder = await prisma.$transaction(
      async (tx) => {
        // 5a-1: Database transaction level replay protection
        if (body.razorpayPaymentId) {
          const txDuplicate = await tx.order.findFirst({
            where: {
              OR: [
                { razorpayPaymentId: body.razorpayPaymentId },
                { remittanceReference: body.razorpayPaymentId },
              ],
            },
          });
          if (txDuplicate) {
            return txDuplicate;
          }
        }

        // 5a-2: Atomic conditional inventory decrement for each item
        for (const item of validatedOrderItems) {
          let rowsAffected = 0;

          if (item.inventoryType === 'OFFER_INVENTORY') {
            rowsAffected = await tx.$executeRaw`
              UPDATE "OfferInventory"
              SET "quantity" = "quantity" - ${item.quantity},
                  "updatedAt" = NOW()
              WHERE "id" = ${item.inventoryId}
                AND ("quantity" - "reservedQuantity") >= ${item.quantity}
            `;
          } else {
            rowsAffected = await tx.$executeRaw`
              UPDATE "ProductInventory"
              SET "quantity" = "quantity" - ${item.quantity},
                  "updatedAt" = NOW()
              WHERE "id" = ${item.inventoryId}
                AND ("quantity" - "reservedQuantity") >= ${item.quantity}
            `;
          }

          if (rowsAffected === 0) {
            throw new Error(
              `Out of stock: "${item.title}" could not be reserved. Another customer may have just ordered the last units.`
            );
          }
        }

        // 5b: Create the Single Parent Order
        const order = await tx.order.create({
          data: {
            orderNumber,
            userId: userId!,
            status: OrderStatus.CONFIRMED,
            paymentStatus: isOnlinePaid ? PaymentStatus.PAID : PaymentStatus.PENDING,
            paymentMethod,
            subtotal,
            discount,
            shippingFee: totalShippingFee,
            tax,
            totalAmount,
            shippingAddressId,
            courierPartner: null,
            trackingNumber: null,
            remittanceReference: body.razorpayPaymentId || null,
            razorpayPaymentId: body.razorpayPaymentId || null,
            razorpayOrderId: body.razorpayOrderId || null,
          },
        });

        // 5c: Fetch current active platform commission rate (fallback to 10.00%)
        const commissionSetting = await tx.platformSetting.findUnique({
          where: { key: 'marketplace_commission_rate' },
        });
        const activeCommissionRate = commissionSetting ? Number(commissionSetting.value) : 10.0;

        // 5d: Create separate VendorShipment records per vendor
        const createdShipments: any[] = [];
        let shipmentIdx = 1;

        for (const [vendorId, group] of Array.from(vendorGroups.entries())) {
          // Resolve default warehouse for this vendor (or synthesize if needed)
          let warehouse = await tx.vendorWarehouse.findFirst({
            where: { vendorId, isDefault: true },
          });

          if (!warehouse) {
            warehouse = await tx.vendorWarehouse.create({
              data: {
                vendorId,
                warehouseCode: `WH-${vendorId.slice(-6).toUpperCase()}`,
                facilityName: `${group.storeName} Primary Atelier`,
                streetAddress: 'Commercial Artisan Atelier Hub',
                city: 'Bengaluru',
                state: 'Karnataka',
                postalCode: '560001',
                contactPhone: '+91 9999999999',
                isDefault: true,
              },
            });
          }

          const shipmentNumber = `VYN-SHP-${orderTimestamp}-${vendorId.slice(-4).toUpperCase()}-${shipmentIdx++}`;

          const vendorShipment = await tx.vendorShipment.create({
            data: {
              orderId: order.id,
              vendorId,
              warehouseId: warehouse.id,
              shipmentNumber,
              status: ShipmentStatus.PENDING,
              subtotal: group.subtotal,
              shippingFee: group.shippingFee,
              courierPartner: null,
              trackingNumber: null,
            },
          });

          createdShipments.push(vendorShipment);

          // 5e: Create OrderItems and link them to this VendorShipment
          for (const item of group.items) {
            const commissionAmount = Number(((item.totalPrice * activeCommissionRate) / 100).toFixed(2));
            const netEarnings = Number((item.totalPrice - commissionAmount).toFixed(2));

            const orderItem = await tx.orderItem.create({
              data: {
                orderId: order.id,
                vendorShipmentId: vendorShipment.id,
                productId: item.productId,
                variantId: item.variantId,
                vendorId: item.vendorId,
                sellerOfferId: item.sellerOfferId,
                offerVariantId: item.offerVariantId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                selectedSize: item.selectedSize,
                selectedColor: item.selectedColor,
                status: 'PENDING',
                commissionRate: activeCommissionRate,
                commissionAmount,
                commissionTax: null,
                netEarnings,
                payoutStatus: PayoutStatus.PENDING,
                vendorPayoutId: null,
                isCustomizedSnapshot: Boolean(item.isCustomized),
              },
            });

            // 5f: Create VendorShipmentItem line-item link
            await tx.vendorShipmentItem.create({
              data: {
                shipmentId: vendorShipment.id,
                orderItemId: orderItem.id,
                productId: item.productId,
                variantId: item.variantId,
                sellerOfferId: item.sellerOfferId,
                offerVariantId: item.offerVariantId,
                quantity: item.quantity,
              },
            });
          }
        }

        // 5g: Clear active user cart ONLY after order and stock updates succeed
        await tx.cartItem.deleteMany({
          where: { cartId: userCart.id },
        });

        // 5h: Return the created order with all vendorShipments included
        const fullOrder = await tx.order.findUnique({
          where: { id: order.id },
          include: {
            vendorShipments: {
              select: {
                id: true,
                shipmentNumber: true,
                vendorId: true,
                status: true,
                shippingFee: true,
              },
            },
          },
        });

        return fullOrder || order;
      },
      {
        maxWait: 5000,
        timeout: 15000,
      }
    );

    // Invalidate product cache for all ordered items to refresh real-time stock
    try {
      for (const item of validatedOrderItems) {
        invalidateProduct(item.slug, item.productId);
      }
    } catch (cacheErr) {
      console.warn('[Checkout Cache Invalidation Warning]:', cacheErr);
    }

    if (idempotencyKey) {
      idempotencyCache.set(`${userId}:${idempotencyKey}`, {
        orderId: createdOrder.id,
        orderNumber: createdOrder.orderNumber,
        totalAmount: Number(createdOrder.totalAmount),
        status: createdOrder.status,
        paymentMethod: createdOrder.paymentMethod,
        paymentStatus: createdOrder.paymentStatus,
        itemCount: validatedOrderItems.length,
        trackingNumber: createdOrder.trackingNumber,
        courierPartner: createdOrder.courierPartner,
        timestamp: Date.now(),
      });
    }

    return apiSuccess(
      {
        message: 'Order placed successfully!',
        orderId: createdOrder.id,
        orderNumber: createdOrder.orderNumber,
        totalAmount: Number(createdOrder.totalAmount),
        status: createdOrder.status,
        paymentMethod: createdOrder.paymentMethod,
        paymentStatus: createdOrder.paymentStatus,
        itemCount: validatedOrderItems.length,
        shipmentCount: (createdOrder as any).vendorShipments?.length || 1,
        vendorShipments: (createdOrder as any).vendorShipments || [],
        trackingNumber: createdOrder.trackingNumber,
        courierPartner: createdOrder.courierPartner,
      },
      undefined,
      201
    );
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    console.error('[Checkout Error]:', err);
    return handleApiError(err);
  } finally {
    if (userId) {
      activeCheckoutLocks.delete(userId);
    }
  }
}
