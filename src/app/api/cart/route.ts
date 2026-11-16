import { NextResponse } from 'next/server';
import { getAuthenticatedUser, requireAuth, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import {
  getOrCreateUserCart,
  getFormattedCart,
  validateAndResolveVariant,
} from '@/lib/cart';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cart
 * Returns the verified, server-recalculated cart for the current user.
 * If user is unauthenticated (guest), returns an empty payload with meta.isGuest = true.
 */
export async function GET() {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return apiSuccess(
        {
          items: [],
          vendorGroups: [],
          subtotal: 0,
          totalOriginalPrice: 0,
          totalSavings: 0,
          totalShippingFee: 0,
          totalItems: 0,
        },
        { isGuest: true }
      );
    }

    const cart = await getOrCreateUserCart(auth.userId);
    const formatted = await getFormattedCart(cart.id);

    return apiSuccess(formatted, { isGuest: false });
  } catch (err: any) {
    console.error('[GET /api/cart error]:', err);
    return handleApiError(err);
  }
}

/**
 * POST /api/cart
 * Adds an item or merges guest items into the user's persistent database cart.
 * All prices and product details are validated strictly against the database.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    const cart = await getOrCreateUserCart(auth.userId);
    const body = await request.json().catch(() => ({}));

    // Mode A: Merge guest items on login
    if (Array.isArray(body.mergeItems) && body.mergeItems.length > 0) {
      for (const rawItem of body.mergeItems) {
        try {
          if (!rawItem.productId) continue;

          const validated = await validateAndResolveVariant(
            rawItem.productId,
            rawItem.variantId
          );

          let activeSellerOffer: any = null;
          let activeOfferVariant: any = null;

          if (rawItem.sellerOfferId) {
            activeSellerOffer = await prisma.sellerOffer.findFirst({
              where: { id: rawItem.sellerOfferId, productId: validated.product.id, status: 'ACTIVE' },
              include: {
                offerVariants: {
                  where: rawItem.offerVariantId
                    ? { id: rawItem.offerVariantId }
                    : { productVariantId: validated.variant.id },
                  include: { inventories: true },
                },
              },
            });
            if (activeSellerOffer && activeSellerOffer.offerVariants.length > 0) {
              activeOfferVariant = activeSellerOffer.offerVariants[0];
            }
          }

          const itemStock = activeOfferVariant
            ? activeOfferVariant.inventories.reduce(
                (acc: number, inv: any) => acc + Math.max(0, inv.quantity - inv.reservedQuantity),
                0
              )
            : validated.availableStock;

          if (itemStock <= 0) continue; // Skip out of stock items during merge

          const requestedQty = Math.max(1, parseInt(rawItem.quantity, 10) || 1);
          const finalQty = Math.min(requestedQty, itemStock);

          // Check if already in cart
          const existing = await prisma.cartItem.findUnique({
            where: {
              cartId_productId_variantId: {
                cartId: cart.id,
                productId: validated.product.id,
                variantId: validated.variant.id,
              },
            },
          });

          if (existing) {
            // Idempotent merge: preserve max requested quantity without multiplying or accumulating on repeated merges
            const mergedQty = Math.min(
              Math.max(existing.quantity, finalQty),
              itemStock
            );
            await prisma.cartItem.update({
              where: { id: existing.id },
              data: {
                quantity: mergedQty,
                sellerOfferId: activeSellerOffer?.id || existing.sellerOfferId || null,
                offerVariantId: activeOfferVariant?.id || existing.offerVariantId || null,
              },
            });
          } else {
            const isUnstitched =
              validated.product.title?.toLowerCase().includes('saree') ||
              validated.product.title?.toLowerCase().includes('shawl') ||
              validated.product.title?.toLowerCase().includes('dupatta');
            const resolvedItemSize = isUnstitched ? 'Free Size' : (rawItem.size || validated.variant.size);

            await prisma.cartItem.create({
              data: {
                cartId: cart.id,
                productId: validated.product.id,
                variantId: validated.variant.id,
                sellerOfferId: activeSellerOffer?.id || null,
                offerVariantId: activeOfferVariant?.id || null,
                quantity: finalQty,
                selectedSize: resolvedItemSize,
                selectedColor: rawItem.color || validated.variant.color,
              },
            });
          }
        } catch (itemErr) {
          console.warn('[Cart Merge Item Warning]:', itemErr);
        }
      }

      const updatedCart = await getFormattedCart(cart.id);
      return apiSuccess({
        message: 'Guest cart merged successfully.',
        cart: updatedCart,
      });
    }

    // Mode B: Add single item to cart
    const {
      productId,
      variantId,
      sellerOfferId,
      offerVariantId,
      quantity: rawQty,
      selectedSize,
      selectedColor,
    } = body;

    if (!productId) {
      return apiError('Product ID is required.', 400);
    }

    const validated = await validateAndResolveVariant(productId, variantId);

    // Resolve SellerOffer & OfferVariant if this is a multi-seller offer
    let activeSellerOffer: any = null;
    let activeOfferVariant: any = null;

    if (sellerOfferId) {
      activeSellerOffer = await prisma.sellerOffer.findFirst({
        where: { id: sellerOfferId, productId: validated.product.id, status: 'ACTIVE' },
        include: {
          vendor: { select: { id: true, storeName: true, status: true } },
          offerVariants: {
            where: offerVariantId
              ? { id: offerVariantId }
              : { productVariantId: validated.variant.id },
            include: {
              inventories: { select: { quantity: true, reservedQuantity: true } },
            },
          },
        },
      });

      if (activeSellerOffer && activeSellerOffer.offerVariants.length > 0) {
        activeOfferVariant = activeSellerOffer.offerVariants[0];
      }
    }

    const availableStock = activeOfferVariant
      ? activeOfferVariant.inventories.reduce(
          (acc: number, inv: any) => acc + Math.max(0, inv.quantity - inv.reservedQuantity),
          0
        )
      : validated.availableStock;

    if (availableStock <= 0) {
      return apiError(
        `"${validated.product.title}" is currently out of stock.`,
        400,
        null,
        'OUT_OF_STOCK'
      );
    }

    const requestedQty = Math.max(1, parseInt(rawQty, 10) || 1);

    // Check if item already exists in user's cart
    const existing = await prisma.cartItem.findUnique({
      where: {
        cartId_productId_variantId: {
          cartId: cart.id,
          productId: validated.product.id,
          variantId: validated.variant.id,
        },
      },
    });

    const isUnstitched =
      validated.product.title?.toLowerCase().includes('saree') ||
      validated.product.title?.toLowerCase().includes('shawl') ||
      validated.product.title?.toLowerCase().includes('dupatta');
    const resolvedItemSize = isUnstitched ? 'Free Size' : (selectedSize || validated.variant.size);

    if (existing) {
      const nextQty = existing.quantity + requestedQty;
      if (nextQty > availableStock) {
        return apiError(
          `Only ${availableStock} units available in stock.`,
          400,
          { availableStock },
          'EXCEEDS_AVAILABLE_STOCK'
        );
      }

      await prisma.cartItem.update({
        where: { id: existing.id },
        data: {
          quantity: nextQty,
          sellerOfferId: activeSellerOffer?.id || null,
          offerVariantId: activeOfferVariant?.id || null,
          selectedSize: resolvedItemSize || existing.selectedSize,
          selectedColor: selectedColor || validated.variant.color || existing.selectedColor,
        },
      });
    } else {
      if (requestedQty > availableStock) {
        return apiError(
          `Only ${availableStock} units available in stock.`,
          400,
          { availableStock },
          'EXCEEDS_AVAILABLE_STOCK'
        );
      }

      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: validated.product.id,
          variantId: validated.variant.id,
          sellerOfferId: activeSellerOffer?.id || null,
          offerVariantId: activeOfferVariant?.id || null,
          quantity: requestedQty,
          selectedSize: resolvedItemSize,
          selectedColor: selectedColor || validated.variant.color,
        },
      });
    }

    const updatedCart = await getFormattedCart(cart.id);
    return apiSuccess(
      {
        message: `Added "${validated.product.title}" to your cart.`,
        cart: updatedCart,
      },
      undefined,
      201
    );
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    return handleApiError(err);
  }
}

/**
 * DELETE /api/cart
 * Clears all items from the authenticated user's cart.
 */
export async function DELETE() {
  try {
    const auth = await requireAuth();
    const cart = await getOrCreateUserCart(auth.userId);

    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    const updatedCart = await getFormattedCart(cart.id);
    return apiSuccess({
      message: 'Cart cleared successfully.',
      cart: updatedCart,
    });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    return handleApiError(err);
  }
}
