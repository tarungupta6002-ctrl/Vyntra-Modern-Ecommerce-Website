import { NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { ReturnStatus } from '@prisma/client';
import {
  computeIstDisputeDeadline,
  isWithinDeadline,
  formatIstDateTime,
} from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    id: string;
  };
}

export interface DisputeNotesPayload {
  version: 1;
  disputedBy: {
    userId: string;
    name: string;
    role: 'CUSTOMER' | 'VENDOR';
  };
  disputedAt: string;
  reason: string;
  detailedExplanation: string;
  evidencePhotos: string[];
}

/**
 * POST /api/returns/[id]/dispute
 * Customer or Vendor initiates a formal Dispute when a return was REJECTED or QC_FAILED.
 * 
 * Invariants:
 * 1. Only the owning customer or owning vendor can initiate a dispute.
 * 2. Allowed only when status is REJECTED or QC_FAILED.
 * 3. Already disputed returns cannot be re-disputed.
 * 4. Claimant role and identity are strictly derived from server session.
 * 5. Dispute details and evidence photos stored in versioned JSON within disputeNotes.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await requireAuth();
    const { id } = context.params;

    const body = await request.json().catch(() => ({}));
    const {
      reason,
      detailedExplanation,
      evidencePhotos = [],
    } = body;

    // 1. Validate Input
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return apiError('A dispute category or reason is mandatory.', 400, null, 'DISPUTE_REASON_REQUIRED');
    }

    if (!detailedExplanation || typeof detailedExplanation !== 'string' || detailedExplanation.trim().length === 0) {
      return apiError(
        'A detailed explanation of the dispute is mandatory.',
        400,
        null,
        'DISPUTE_EXPLANATION_REQUIRED'
      );
    }

    const validPhotos = Array.isArray(evidencePhotos)
      ? evidencePhotos
          .filter((p) => typeof p === 'string' && p.trim().length > 0)
          .map((p) => p.trim())
      : [];

    // 2. Fetch ReturnRequest with order and vendor context
    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id },
      include: {
        order: { select: { orderNumber: true } },
        orderItem: {
          select: {
            id: true,
            productId: true,
          },
        },
      },
    });

    if (!returnRequest) {
      return apiError('Return request not found.', 404, null, 'RETURN_REQUEST_NOT_FOUND');
    }

    // 3. Derive Claimant Role strictly from Server Session (Rule 7)
    let claimantRole: 'CUSTOMER' | 'VENDOR' | null = null;
    if (auth.userId === returnRequest.userId) {
      claimantRole = 'CUSTOMER';
    } else if (
      auth.dbUser.vendorProfile &&
      auth.dbUser.vendorProfile.id === returnRequest.vendorProfileId
    ) {
      claimantRole = 'VENDOR';
    }

    if (!claimantRole) {
      return apiError(
        'Access denied. You are neither the purchasing customer nor the selling vendor for this return request.',
        403,
        null,
        'FORBIDDEN'
      );
    }

    // 4. State Invariant: Must be REJECTED or QC_FAILED (Rule 6)
    const eligibleStatuses: ReturnStatus[] = [ReturnStatus.REJECTED, ReturnStatus.QC_FAILED];
    if (!eligibleStatuses.includes(returnRequest.status)) {
      return apiError(
        `Disputes can only be filed against return requests that were REJECTED or marked QC_FAILED. Current status is: ${returnRequest.status}.`,
        400,
        { currentStatus: returnRequest.status, eligibleStatuses },
        'INVALID_STATUS_FOR_DISPUTE'
      );
    }

    // 4b. 5-Calendar-Day IST Dispute Deadline Enforcement (Section 2.F)
    const triggerTimestamp = returnRequest.status === ReturnStatus.QC_FAILED
      ? returnRequest.qcCompletedAt
      : returnRequest.rejectedAt;

    if (triggerTimestamp) {
      const disputeDeadline = computeIstDisputeDeadline(triggerTimestamp, 5);
      const now = new Date();
      if (!isWithinDeadline(now, disputeDeadline)) {
        return apiError(
          `The 5-calendar-day dispute window for this return request expired on ${formatIstDateTime(disputeDeadline)}.`,
          400,
          {
            disputeDeadline,
            triggerTimestamp,
            expired: true,
          },
          'DISPUTE_WINDOW_EXPIRED'
        );
      }
    }

    // 5. Duplicate Dispute Guard (Rule 9)
    if (returnRequest.isDisputed) {
      return apiError(
        'A formal dispute has already been filed for this return request and is currently pending concierge review.',
        400,
        {
          isDisputed: true,
          disputedByRole: returnRequest.disputedByRole,
        },
        'ALREADY_DISPUTED'
      );
    }

    // 6. Build Versioned JSON Structure
    const nowIso = new Date().toISOString();
    const disputePayload: DisputeNotesPayload = {
      version: 1,
      disputedBy: {
        userId: auth.userId,
        name: auth.dbUser.name || `${claimantRole} Claimant`,
        role: claimantRole,
      },
      disputedAt: nowIso,
      reason: reason.trim(),
      detailedExplanation: detailedExplanation.trim(),
      evidencePhotos: validPhotos,
    };
    const serializedDisputeNotes = JSON.stringify(disputePayload);

    // 7. Atomic Transition to QC_DISPUTED
    const updated = await prisma.returnRequest.update({
      where: { id: returnRequest.id },
      data: {
        status: ReturnStatus.QC_DISPUTED,
        isDisputed: true,
        disputedByRole: claimantRole,
        disputeNotes: serializedDisputeNotes,
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
        isDisputed: updated.isDisputed,
        disputedByRole: updated.disputedByRole,
        disputeNotes: disputePayload,
        updatedAt: updated.updatedAt,
      },
      instructions: {
        message:
          'Your formal dispute has been logged. Vyntra Concierge Arbitration will review inspection records and photographic evidence within 24-48 business hours.',
        nextStep: 'Awaiting Concierge Admin Arbitration.',
      },
    });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    return handleApiError(err);
  }
}
