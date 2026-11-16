import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { deleteMediaAsset } from '@/lib/media/media-service';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/vendor/media/[id]
 * Permanently removes a media asset with vendor ownership validation and reference protection
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return apiError('Authentication required to delete media assets.', 401);
    }

    const isAdmin = auth.role === UserRole.ADMIN || auth.role === UserRole.SUPER_ADMIN;
    const vendorProfileId = auth.dbUser?.vendorProfile?.id || null;

    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    const result = await deleteMediaAsset(params.id, {
      vendorProfileId,
      isAdmin,
      force,
    });

    if (!result.success) {
      if (result.referenced) {
        return NextResponse.json(
          {
            success: false,
            referenced: true,
            referenceCount: result.referenceCount,
            error: {
              code: 'ASSET_IN_USE',
              message: result.message,
            },
          },
          { status: 409 }
        );
      }
      return apiError(result.message, 403);
    }

    return apiSuccess({ message: result.message });
  } catch (err: any) {
    return handleApiError(err);
  }
}
