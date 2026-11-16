import { NextResponse } from 'next/server';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { ReturnStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * POST /api/admin/returns/[id]/dispute
 * Admin Concierge reviews evidence and adjudicates a QC Dispute.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await requireAdmin();
    const { id } = context.params;

    const body = await request.json().catch(() => ({}));
    const { resolution, adminNotes: notes } = body;

    // 1. Validation
    const VALID_RESOLUTIONS = ['REFUND_APPROVED', 'REPLACEMENT_APPROVED', 'REJECTED'];
    if (!resolution || !VALID_RESOLUTIONS.includes(resolution)) {
      return apiError(
        `Invalid dispute resolution. Allowed values: ${VALID_RESOLUTIONS.join(', ')}.`,
        400,
        { resolution, validResolutions: VALID_RESOLUTIONS },
        'INVALID_RESOLUTION'
      );
    }

    if (!notes || typeof notes !== 'string' || notes.trim().length === 0) {
      return apiError(
        'Detailed administrative notes are mandatory when adjudicating a QC dispute.',
        400,
        null,
        'NOTES_REQUIRED'
      );
    }

    // 2. Fetch ReturnRequest
    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id },
      include: {
        order: { select: { orderNumber: true } },
      },
    });

    if (!returnRequest) {
      return apiError('Return request not found.', 404, null, 'RETURN_REQUEST_NOT_FOUND');
    }

    if (!returnRequest.isDisputed && returnRequest.status !== ReturnStatus.QC_DISPUTED) {
      return apiError(
        `Only return requests under active dispute can be adjudicated. Current status is: ${returnRequest.status}.`,
        400,
        { currentStatus: returnRequest.status },
        'NOT_DISPUTED'
      );
    }

    // 3. Apply Decision
    const nowIso = new Date().toISOString();
    const adminLogEntry = `[${nowIso}] Dispute Adjudicated by Admin ${auth.dbUser.email}: Resolution=${resolution}. Notes: ${notes.trim()}`;
    const updatedAdminNotes = returnRequest.adminNotes
      ? `${returnRequest.adminNotes}\n${adminLogEntry}`
      : adminLogEntry;

    let nextStatus = returnRequest.status;
    if (resolution === 'REJECTED') {
      nextStatus = returnRequest.qcPassed === false ? ReturnStatus.QC_FAILED : ReturnStatus.REJECTED;
    }

    const updated = await prisma.returnRequest.update({
      where: { id: returnRequest.id },
      data: {
        status: nextStatus,
        disputeResolution: resolution,
        disputeResolvedAt: new Date(),
        adminNotes: updatedAdminNotes,
      },
      include: {
        order: { select: { orderNumber: true } },
      },
    });

    return apiSuccess({
      returnRequest: {
        id: updated.id,
        orderNumber: updated.order.orderNumber,
        status: updated.status,
        disputeResolution: updated.disputeResolution,
        disputeResolvedAt: updated.disputeResolvedAt,
      },
      message: `Dispute successfully resolved as ${resolution}.`,
    });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    return handleApiError(err);
  }
}
