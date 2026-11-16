import { prisma } from '@/lib/prisma';

export interface FormattedCartItem {
  id: string;
  productId: string;
  slug: string;
  title: string;
  brand: string;
  variantId: string;
  sku: string;
  size: string | null;
  color: string | null;
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
  availableStock: number;
  inStock: boolean;
}

export interface VendorCartGroup {
  vendorId: string;
  vendorName: string;
  subtotal: number;
  shippingFee: number;
  handlingDays: number;
  items: FormattedCartItem[];
}

export interface FormattedCartPayload {
  cartId: string;
  items: FormattedCartItem[];
  vendorGroups: VendorCartGroup[];
  subtotal: number;
  totalOriginalPrice: number;
  totalSavings: number;
  totalShippingFee: number;
  totalItems: number;
}

/**
 * Finds or creates the active Cart for an authenticated user.
 */
export async function getOrCreateUserCart(userId: string) {
  let cart = await prisma.cart.findUnique({
    where: { userId },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
    });
  }

  return cart;
}

/**
 * Validates product publication, vendor approval, and resolves variant.
 */
export async function validateAndResolveVariant(productId: string, variantId?: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      vendor: {
        select: { id: true, storeName: true, status: true },
      },
      images: {
        orderBy: { sortOrder: 'asc' },
        take: 1,
      },
      variants: true,
    },
  });

  if (!product) {
    throw new Error('Product not found.');
  }

  if (!product.isPublished || product.vendor.status !== 'APPROVED') {
    throw new Error('This product is currently unavailable for purchase.');
  }

  let selectedVariant = null;

  if (variantId) {
    selectedVariant = product.variants.find((v) => v.id === variantId);
    if (!selectedVariant) {
      throw new Error('The selected product variant does not exist for this item.');
    }
  } else {
    // Fallback to default/first variant for simple products or quick-add
    selectedVariant = product.variants[0];
    if (!selectedVariant) {
      throw new Error('This product has no active variants.');
    }
  }

  // Get real-time stock from ProductInventory
  const inventory = await prisma.productInventory.findFirst({
    where: {
      productId: product.id,
      variantId: selectedVariant.id,
    },
    select: {
      quantity: true,
      reservedQuantity: true,
    },
  });

  const availableStock = inventory
    ? Math.max(0, inventory.quantity - inventory.reservedQuantity)
    : 0;

  const unitPrice = Number(selectedVariant.price || product.basePrice);
  const originalPrice = selectedVariant.originalPrice
    ? Number(selectedVariant.originalPrice)
    : product.discountPrice
    ? Number(product.discountPrice)
    : unitPrice;

  const imageUrl =
    selectedVariant.imageUrl ||
    product.images[0]?.url ||
    'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80';

  return {
    product,
    variant: selectedVariant,
    availableStock,
    unitPrice,
    originalPrice,
    imageUrl,
  };
}

/**
 * Returns verified cart contents with recalculated prices and inventory availability.
 * Automatically cleans up any orphaned or unpublished product items.
 */
export async function getFormattedCart(cartId: string): Promise<FormattedCartPayload> {
  const rawItems = await prisma.cartItem.findMany({
    where: { cartId },
    include: {
      product: {
        include: {
          vendor: { select: { id: true, storeName: true, status: true } },
          images: { orderBy: { sortOrder: 'asc' }, take: 1 },
        },
      },
      variant: {
        include: {
          inventories: {
            select: { quantity: true, reservedQuantity: true },
          },
        },
      },
      sellerOffer: {
        include: {
          vendor: { select: { id: true, storeName: true, status: true } },
        },
      },
      offerVariant: {
        include: {
          inventories: {
            select: { quantity: true, reservedQuantity: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const validItems: FormattedCartItem[] = [];
  const staleItemIds: string[] = [];

  for (const item of rawItems) {
    // If product was deleted, unpublished, or vendor suspended, mark for cleanup
    if (
      !item.product ||
      !item.product.isPublished ||
      item.product.vendor.status !== 'APPROVED' ||
      !item.variant
    ) {
      staleItemIds.push(item.id);
      continue;
    }

    const isSellerOffer = !!(
      item.sellerOfferId &&
      item.sellerOffer &&
      item.sellerOffer.status === 'ACTIVE' &&
      item.sellerOffer.vendor?.status === 'APPROVED' &&
      item.offerVariant
    );

    const effectiveVendor = isSellerOffer
      ? item.sellerOffer!.vendor
      : item.product.vendor;

    let availableStock = 0;
    let price = 0;
    let originalPrice = 0;

    if (isSellerOffer && item.offerVariant) {
      price = Number(item.offerVariant.sellingPrice);
      originalPrice = item.offerVariant.mrpPrice
        ? Number(item.offerVariant.mrpPrice)
        : item.variant.originalPrice
        ? Number(item.variant.originalPrice)
        : item.product.discountPrice
        ? Number(item.product.discountPrice)
        : price;

      availableStock = item.offerVariant.inventories.reduce(
        (acc: number, inv: any) => acc + Math.max(0, inv.quantity - inv.reservedQuantity),
        0
      );
    } else {
      price = Number(item.variant.price || item.product.basePrice);
      originalPrice = item.variant.originalPrice
        ? Number(item.variant.originalPrice)
        : item.product.discountPrice
        ? Number(item.product.discountPrice)
        : price;

      availableStock = item.variant.inventories.reduce(
        (acc, inv) => acc + Math.max(0, inv.quantity - inv.reservedQuantity),
        0
      );
    }

    const image =
      item.variant.imageUrl ||
      item.product.images[0]?.url ||
      'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80';

    validItems.push({
      id: item.id,
      productId: item.productId,
      slug: item.product.slug,
      title: item.product.title,
      brand: item.product.brand,
      variantId: item.variantId,
      sku: isSellerOffer && item.offerVariant?.sellerSku ? item.offerVariant.sellerSku : item.variant.sku,
      size: item.selectedSize || item.variant.size,
      color: item.selectedColor || item.variant.color,
      price,
      originalPrice,
      image,
      quantity: item.quantity,
      vendorName: effectiveVendor.storeName,
      vendorId: effectiveVendor.id,
      sellerOfferId: item.sellerOfferId || undefined,
      offerVariantId: item.offerVariantId || undefined,
      handlingDays: item.sellerOffer?.handlingDays || 2,
      availableStock,
      inStock: availableStock > 0,
    });
  }

  // Non-blocking cleanup of stale items
  if (staleItemIds.length > 0) {
    prisma.cartItem.deleteMany({
      where: { id: { in: staleItemIds } },
    }).catch((err) => console.warn('[Stale Cart Cleanup Warning]:', err));
  }

  // Multi-Vendor grouping
  const groupMap = new Map<string, VendorCartGroup>();
  for (const itm of validItems) {
    const vId = itm.vendorId || 'default-vendor';
    const vName = itm.vendorName || 'Vyntra Atelier';
    if (!groupMap.has(vId)) {
      groupMap.set(vId, {
        vendorId: vId,
        vendorName: vName,
        subtotal: 0,
        shippingFee: 0, // Transparent Standard Express Shipping across India
        handlingDays: 2,
        items: [],
      });
    }
    const grp = groupMap.get(vId)!;
    grp.subtotal += itm.price * itm.quantity;
    grp.items.push(itm);
  }

  const vendorGroups = Array.from(groupMap.values());
  const totalShippingFee = vendorGroups.reduce((acc, g) => acc + g.shippingFee, 0);

  const subtotal = validItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const totalOriginalPrice = validItems.reduce((acc, item) => acc + item.originalPrice * item.quantity, 0);
  const totalSavings = Math.max(0, totalOriginalPrice - subtotal);
  const totalItems = validItems.reduce((acc, item) => acc + item.quantity, 0);

  return {
    cartId,
    items: validItems,
    vendorGroups,
    subtotal,
    totalOriginalPrice,
    totalSavings,
    totalShippingFee,
    totalItems,
  };
}
