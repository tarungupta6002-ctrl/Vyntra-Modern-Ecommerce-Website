import { NextResponse } from 'next/server';
import { requireVendor, verifyVendorOwnership, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { invalidateProduct } from '@/lib/cache-invalidation';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * PATCH /api/vendor/products/[id]/publish
 * Quick toggles between Published and Draft states.
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await requireVendor();
    const { id } = context.params;

    const product = await verifyVendorOwnership(id, auth.vendorProfileId);
    const body = await request.json().catch(() => ({}));

    // If explicit isPublished provided, use it; otherwise toggle current value
    const nextPublished =
      typeof body.isPublished === 'boolean'
        ? body.isPublished
        : !(await prisma.product.findUnique({ where: { id }, select: { isPublished: true } }))?.isPublished;

    const updated = await prisma.product.update({
      where: { id },
      data: { isPublished: nextPublished },
      select: { id: true, title: true, isPublished: true, slug: true },
    });

    invalidateProduct(updated.slug, updated.id);

    return apiSuccess({
      message: updated.isPublished
        ? `"${updated.title}" is now PUBLISHED and live on Vyntra marketplace.`
        : `"${updated.title}" is now unpublished and saved as DRAFT.`,
      product: updated,
    });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    return handleApiError(err);
  }
}
