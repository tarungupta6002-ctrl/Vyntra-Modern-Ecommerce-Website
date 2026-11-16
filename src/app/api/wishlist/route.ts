import { NextResponse } from 'next/server';
import { getAuthenticatedUser, requireAuth, handleAuthError } from '@/lib/auth';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import {
  getFormattedWishlist,
  addWishlistItem,
  removeWishlistItem,
  getUserCuratedBoards,
} from '@/lib/wishlist';

export const dynamic = 'force-dynamic';

/**
 * GET /api/wishlist
 * Returns the authenticated user's wishlist and boards from Supabase database.
 */
export async function GET() {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return apiSuccess(
        { items: [], boards: [] },
        { isGuest: true }
      );
    }

    const [items, boards] = await Promise.all([
      getFormattedWishlist(auth.userId),
      getUserCuratedBoards(auth.userId),
    ]);

    return apiSuccess({ items, boards }, { isGuest: false });
  } catch (err: any) {
    console.error('[GET /api/wishlist error]:', err);
    return handleApiError(err);
  }
}

/**
 * POST /api/wishlist
 * Adds an item or merges guest items into the user's persistent Supabase wishlist.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    const body = await request.json().catch(() => ({}));

    // Mode A: Merge guest items on login
    if (Array.isArray(body.mergeItems) && body.mergeItems.length > 0) {
      for (const item of body.mergeItems) {
        try {
          const targetPid = item.productId || item.id || item.slug;
          if (targetPid) {
            await addWishlistItem(auth.userId, {
              productId: targetPid,
              selectedSize: item.selectedSize,
              boardId: item.boardIds?.[0],
            });
          }
        } catch (itemErr) {
          console.warn('[Wishlist Merge Item Warning]:', itemErr);
        }
      }

      const updated = await getFormattedWishlist(auth.userId);
      return apiSuccess({
        message: 'Guest wishlist merged successfully.',
        items: updated,
      });
    }

    // Mode B: Add single item to wishlist
    const { productId, id, slug, selectedSize, boardId } = body;
    const targetPid = productId || id || slug;

    if (!targetPid) {
      return apiError('Missing required field "productId"', 400);
    }

    const addedItem = await addWishlistItem(auth.userId, {
      productId: targetPid,
      selectedSize,
      boardId,
    });

    return apiSuccess({
      message: 'Item saved to your Wishlist in Supabase.',
      item: addedItem,
    });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    console.error('[POST /api/wishlist error]:', err);
    return handleApiError(err);
  }
}

/**
 * DELETE /api/wishlist
 * Removes an item from the user's Supabase wishlist.
 */
export async function DELETE(request: Request) {
  try {
    const auth = await requireAuth();
    const { searchParams } = new URL(request.url);
    const body = await request.json().catch(() => ({}));

    const targetId =
      searchParams.get('id') ||
      searchParams.get('productId') ||
      body.id ||
      body.productId ||
      body.slug;

    if (!targetId) {
      return apiError('Missing required field "id" or "productId"', 400);
    }

    const removed = await removeWishlistItem(auth.userId, targetId);

    if (!removed) {
      return apiError('Wishlist item not found or does not belong to the user.', 404);
    }

    return apiSuccess({
      message: 'Item removed from your Wishlist in Supabase.',
      removedId: targetId,
    });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    console.error('[DELETE /api/wishlist error]:', err);
    return handleApiError(err);
  }
}
