import { NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { ReturnStatus, ReturnType } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * POST /api/returns/[id]/accept-refund
 * Customer accepts vendor's cash refund offer when exchange stock was unavailable.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await requireAuth();
    const { id } = context.params;

    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id },
      include: {
        order: { select: { orderNumber: true } },
      },
    });

    if (!returnRequest) {
      return apiError('Return request not found.', 404, null, 'RETURN_REQUEST_NOT_FOUND');
    }

    if (returnRequest.userId !== auth.userId) {
      return apiError('Access denied. You do not own this return request.', 403, null, 'FORBIDDEN');
    }

    if (returnRequest.status !== ReturnStatus.REFUND_OFFERED) {
      return apiError(
        `Refund offer can only be accepted when status is REFUND_OFFERED. Current status is: ${returnRequest.status}.`,
        400,
        { currentStatus: returnRequest.status },
        'INVALID_STATUS'
      );
    }

    // Atomically transition to RETURN_REFUND and APPROVED
    const updated = await prisma.$transaction(async (tx) => {
      // Idempotently release any residual stock reservation
      if (returnRequest.allocatedInventoryId && !returnRequest.replacementDispatchedAt) {
        await tx.$executeRaw`
          UPDATE "ProductInventory"
          SET "reservedQuantity" = GREATEST(0, "reservedQuantity" - ${returnRequest.requestedQuantity}),
              "updatedAt" = NOW()
          WHERE "id" = ${returnRequest.allocatedInventoryId}
            AND "variantId" = ${returnRequest.allocatedVariantId}
            AND "vendorId" = ${returnRequest.allocatedVendorId}
            AND "reservedQuantity" >= ${returnRequest.requestedQuantity}
        `;
      }

      const noteEntry = `[${new Date().toISOString()}] Customer accepted refund offer as replacement stock was unavailable.`;
      const updatedNotes = returnRequest.customerNotes
        ? `${returnRequest.customerNotes}\n${noteEntry}`
        : noteEntry;

      return await tx.returnRequest.update({
        where: { id: returnRequest.id },
        data: {
          type: ReturnType.RETURN_REFUND,
          status: returnRequest.pickedUpAt ? ReturnStatus.PICKED_UP : ReturnStatus.APPROVED,
          allocatedInventoryId: null,
          allocatedVariantId: null,
          allocatedVendorId: null,
          customerNotes: updatedNotes,
        },
        include: {
          order: { select: { orderNumber: true } },
        },
      });
    });

    return apiSuccess({
      returnRequest: {
        id: updated.id,
        orderNumber: updated.order.orderNumber,
        type: updated.type,
        status: updated.status,
      },
      message: 'Refund offer accepted successfully. Return request converted to Return for Refund.',
    });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    return handleApiError(err);
  }
}
