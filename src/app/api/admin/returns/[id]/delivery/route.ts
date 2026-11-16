import { NextResponse } from 'next/server';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { ReturnType, ReturnStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * POST /api/admin/returns/[id]/delivery
 * Authorized delivery confirmation for replacement consignments.
 * Strictly restricted to platform administrators. Vendors cannot arbitrarily mark items delivered.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const admin = await requireAdmin();
    const { id } = context.params;

    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id },
      include: {
        order: { select: { orderNumber: true } },
      },
    });

    if (!returnRequest) {
      return apiError('Return request not found.', 404, null, 'RETURN_NOT_FOUND');
    }

    if (returnRequest.type !== ReturnType.REPLACEMENT) {
      return apiError(
        'Delivery completion endpoint is strictly applicable to REPLACEMENT requests.',
        400,
        null,
        'NOT_A_REPLACEMENT'
      );
    }

    if (!returnRequest.replacementDispatchedAt) {
      return apiError(
        'Cannot confirm delivery. Replacement consignment has not yet been marked as dispatched.',
        400,
        null,
        'REPLACEMENT_NOT_DISPATCHED'
      );
    }

    if (returnRequest.replacementDeliveredAt) {
      return apiError(
        `Replacement was already delivered on ${new Date(returnRequest.replacementDeliveredAt).toLocaleString('en-IN')}.`,
        400,
        null,
        'ALREADY_DELIVERED'
      );
    }

    const updated = await prisma.returnRequest.update({
      where: { id: returnRequest.id },
      data: {
        replacementDeliveredAt: new Date(),
        status: ReturnStatus.COMPLETED,
        adminNotes: returnRequest.adminNotes
          ? `${returnRequest.adminNotes}\n[Delivery Confirmed] Admin ${admin.email} confirmed delivery on ${new Date().toISOString()}`
          : `[Delivery Confirmed] Admin ${admin.email} confirmed delivery on ${new Date().toISOString()}`,
      },
    });

    return apiSuccess({
      returnRequest: {
        id: updated.id,
        orderNumber: returnRequest.order.orderNumber,
        status: updated.status,
        replacementCourierPartner: updated.replacementCourierPartner,
        replacementTrackingNumber: updated.replacementTrackingNumber,
        replacementDispatchedAt: updated.replacementDispatchedAt,
        replacementDeliveredAt: updated.replacementDeliveredAt,
      },
      message: 'Replacement delivery confirmed successfully. Request marked as COMPLETED.',
    });
  } catch (err: any) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    return handleApiError(err);
  }
}
