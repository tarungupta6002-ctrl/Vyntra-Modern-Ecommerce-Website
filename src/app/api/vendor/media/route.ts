import { NextResponse } from 'next/server';
import { requireVendor, handleAuthError, getAuthenticatedUser } from '@/lib/auth';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { listMediaAssets } from '@/lib/media/media-service';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/vendor/media
 * Lists media assets for the authenticated vendor or admin
 * Supports query params: ?category=... &q=... &page=... &limit=...
 */
export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return apiError('Authentication required to access media assets.', 401);
    }

    const isAdmin = auth.role === UserRole.ADMIN || auth.role === UserRole.SUPER_ADMIN;
    const vendorProfileId = auth.dbUser?.vendorProfile?.id || null;

    if (!isAdmin && (!vendorProfileId || auth.dbUser?.vendorProfile?.status !== 'APPROVED')) {
      return apiError('Approved vendor or admin privileges required to access media library.', 403);
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const query = searchParams.get('q') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const result = await listMediaAssets({
      vendorId: vendorProfileId,
      isAdmin,
      category,
      query,
      page,
      limit,
    });

    return apiSuccess(result);
  } catch (err: any) {
    const authErr = handleAuthError(err);
    if (authErr) return authErr;
    return handleApiError(err);
  }
}
