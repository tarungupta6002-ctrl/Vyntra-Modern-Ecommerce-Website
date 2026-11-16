import { NextResponse } from 'next/server';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { invalidateProduct } from '@/lib/cache-invalidation';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * PATCH /api/admin/products/[id]/status
 * Admin moderation route to take down / unpublish or reinstate any marketplace product.
 * Strictly protected by requireAdmin().
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const admin = await requireAdmin();
    const { id } = context.params;

    // Rate limiting: 60 admin moderation actions per minute per admin user
    const rateCheck = checkRateLimit(`admin-prod-mod:${admin.userId}`, 60, 60);
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.resetInSeconds, 'Admin moderation rate limit reached. Please slow down.');
    }

    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return apiError('Invalid product ID.', 400, null, 'INVALID_ID');
    }

    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        isPublished: true,
        vendor: { select: { id: true, storeName: true, status: true } },
      },
    });

    if (!product) {
      return apiError('Product not found.', 404, null, 'PRODUCT_NOT_FOUND');
    }

    const body = await request.json().catch(() => ({}));
    const nextPublished =
      typeof body.isPublished === 'boolean' ? body.isPublished : !product.isPublished;
    const moderationReason = body.moderationReason?.trim() || null;

    if (moderationReason && moderationReason.length > 500) {
      return apiError('Moderation reason cannot exceed 500 characters.', 400, null, 'INPUT_TOO_LONG');
    }

    // Critical Rule: If reinstating/publishing, the vendor MUST have an APPROVED status
    if (nextPublished && product.vendor?.status !== 'APPROVED') {
      return apiError(
        `Cannot publish product "${product.title}" because vendor "${product.vendor?.storeName || 'Unknown'}" has status ${
          product.vendor?.status || 'UNAPPROVED'
        }. The vendor must be approved first.`,
        400,
        { vendorStatus: product.vendor?.status },
        'VENDOR_NOT_APPROVED'
      );
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { isPublished: nextPublished },
      select: { id: true, title: true, isPublished: true, slug: true },
    });

    invalidateProduct(updated.slug, updated.id);

    return apiSuccess({
      message: updated.isPublished
        ? `Product "${updated.title}" from ${product.vendor?.storeName || 'Vendor'} has been REINSTATED and is now live.`
        : `Product "${updated.title}" has been UNPUBLISHED / TAKEN DOWN from the customer storefront.${
            moderationReason ? ` Reason: ${moderationReason}` : ''
          }`,
      product: updated,
    });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    return handleApiError(err);
  }
}
