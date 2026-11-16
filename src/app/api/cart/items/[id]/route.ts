import { NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { getOrCreateUserCart, getFormattedCart } from '@/lib/cart';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * PATCH /api/cart/items/[id]
 * Updates the quantity of a specific item in the authenticated user's cart.
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await requireAuth();
    const cart = await getOrCreateUserCart(auth.userId);
    const { id } = context.params;
    const body = await request.json().catch(() => ({}));

    // Verify ownership: CartItem must belong to user's cart
    const item = await prisma.cartItem.findUnique({
      where: { id },
      include: {
        variant: {
          include: {
            inventories: {
              select: { quantity: true, reservedQuantity: true },
            },
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
    });

    if (!item || item.cartId !== cart.id) {
      return apiError('Cart item not found or does not belong to your cart.', 404);
    }

    const nextQty = parseInt(body.quantity, 10);

    // If quantity is 0 or negative, remove the item
    if (isNaN(nextQty) || nextQty <= 0) {
      await prisma.cartItem.delete({
        where: { id },
      });

      const updatedCart = await getFormattedCart(cart.id);
      return apiSuccess({
        message: 'Item removed from cart.',
        cart: updatedCart,
      });
    }

    // Check available stock
    const availableStock = item.offerVariant
      ? item.offerVariant.inventories.reduce(
          (sum, inv) => sum + Math.max(0, inv.quantity - inv.reservedQuantity),
          0
        )
      : item.variant.inventories.reduce(
          (sum, inv) => sum + Math.max(0, inv.quantity - inv.reservedQuantity),
          0
        );

    if (nextQty > availableStock) {
      return apiError(
        `Only ${availableStock} units available in warehouse.`,
        400,
        { availableStock },
        'EXCEEDS_AVAILABLE_STOCK'
      );
    }

    await prisma.cartItem.update({
      where: { id },
      data: { quantity: nextQty },
    });

    const updatedCart = await getFormattedCart(cart.id);
    return apiSuccess({
      message: 'Cart quantity updated.',
      cart: updatedCart,
    });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    return handleApiError(err);
  }
}

/**
 * DELETE /api/cart/items/[id]
 * Removes an item from the authenticated user's cart.
 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const auth = await requireAuth();
    const cart = await getOrCreateUserCart(auth.userId);
    const { id } = context.params;

    // Verify ownership
    const item = await prisma.cartItem.findUnique({
      where: { id },
      select: { id: true, cartId: true },
    });

    if (!item || item.cartId !== cart.id) {
      return apiError('Cart item not found or does not belong to your cart.', 404);
    }

    await prisma.cartItem.delete({
      where: { id },
    });

    const updatedCart = await getFormattedCart(cart.id);
    return apiSuccess({
      message: 'Item removed from cart.',
      cart: updatedCart,
    });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    return handleApiError(err);
  }
}
