import { NextResponse } from 'next/server';
import { requireVendor, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/vendor/notices/[id]
 * Vendor acknowledges receipt of an official notice / warning
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireVendor();
    const vendorId = auth.vendorProfileId;
    const noticeId = params.id;

    const log = await prisma.adminAuditLog.findUnique({
      where: { id: noticeId },
    });

    if (!log || log.entity !== 'VENDOR_NOTICE' || log.entityId !== vendorId) {
      return apiError('Notice not found or access denied.', 404, 'NOT_FOUND');
    }

    const currentDetails = (log.details as any) || {};
    const updatedDetails = {
      ...currentDetails,
      status: 'ACKNOWLEDGED',
      acknowledgedAt: new Date().toISOString(),
      acknowledgedBy: auth.email,
    };

    const updated = await prisma.adminAuditLog.update({
      where: { id: noticeId },
      data: {
        details: updatedDetails,
      },
    });

    return apiSuccess({
      message: 'Notice acknowledged successfully.',
      notice: {
        id: updated.id,
        ...updatedDetails,
      },
    });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    return handleApiError(err);
  }
}
