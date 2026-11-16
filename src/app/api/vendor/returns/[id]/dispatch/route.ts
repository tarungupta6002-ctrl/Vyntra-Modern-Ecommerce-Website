import { NextResponse } from 'next/server';
import { requireVendor, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { ReturnType, ReturnStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    id: string;
  };
}

interface DispatchReplacementBody {
  courierPartner?: string;
  trackingNumber?: string;
  vendorNotes?: string;
}

/**
 * POST /api/vendor/returns/[id]/dispatch
 * Vendor dispatches an approved, QC-passed replacement item to the customer.
 * Atomically releases the target variant reservation and decrements physical quantity.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await requireVendor();
    const vendorProfileId = auth.vendorProfileId;
    const { id } = context.params;

    const body: DispatchReplacementBody = await request.json().catch(() => ({}));
    const courierPartner = (body.courierPartner || '').trim();
    const trackingNumber = (body.trackingNumber || '').trim();
    const vendorNotes = (body.vendorNotes || '').trim();

    // 1. Mandatory Input Validation
    if (!courierPartner || courierPartner.length < 2 || courierPartner.length > 100) {
      return apiError(
        'A valid forward courier partner name is required (2 to 100 characters).',
        400,
        null,
        'COURIER_PARTNER_REQUIRED'
      );
    }

    if (!trackingNumber || trackingNumber.length < 4 || trackingNumber.length > 100) {
      return apiError(
        'A valid forward AWB / tracking number is required (4 to 100 characters).',
        400,
        null,
        'TRACKING_NUMBER_REQUIRED'
      );
    }

    // 2. Fetch ReturnRequest with relations
    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id },
      include: {
        order: { select: { orderNumber: true, id: true } },
        orderItem: {
          include: {
            product: { select: { title: true } },
            variant: { select: { sku: true, size: true, color: true } },
          },
        },
      },
    });

    if (!returnRequest) {
      return apiError('Return request not found.', 404, null, 'RETURN_NOT_FOUND');
    }

    // 3. Ownership Guard: Vendor can ONLY dispatch their own replacement items
    if (returnRequest.vendorProfileId !== vendorProfileId) {
      return apiError(
        'You are not authorized to dispatch replacement items belonging to another merchant.',
        403,
        null,
        'FORBIDDEN'
      );
    }

    // 4. Request Type Guard
    if (returnRequest.type !== ReturnType.REPLACEMENT) {
      return apiError(
        `This return request is of type "${returnRequest.type}". Forward dispatch is only applicable to REPLACEMENT requests.`,
        400,
        null,
        'NOT_A_REPLACEMENT'
      );
    }

    // 5. QC / Approval Eligibility Guard
    const isQcEligible =
      returnRequest.status === ReturnStatus.QC_PASSED ||
      (returnRequest.status === ReturnStatus.QC_DISPUTED &&
        returnRequest.disputeResolution === 'REPLACEMENT_APPROVED');

    if (!isQcEligible) {
      return apiError(
        `Cannot dispatch replacement. Return status is "${returnRequest.status}". The returned original item must first pass Quality Check (QC_PASSED).`,
        400,
        { currentStatus: returnRequest.status },
        'REPLACEMENT_NOT_QC_PASSED'
      );
    }

    // 6. Reservation Verification
    if (!returnRequest.allocatedInventoryId) {
      return apiError(
        'No replacement stock has been reserved for this request. Please approve with stock allocation before dispatching.',
        400,
        null,
        'NO_ALLOCATED_STOCK'
      );
    }

    // 7. Duplicate Dispatch Prevention
    if (returnRequest.replacementDispatchedAt) {
      return apiError(
        `Replacement has already been dispatched on ${new Date(returnRequest.replacementDispatchedAt).toLocaleString('en-IN')} with tracking number ${returnRequest.replacementTrackingNumber}.`,
        400,
        {
          dispatchedAt: returnRequest.replacementDispatchedAt,
          trackingNumber: returnRequest.replacementTrackingNumber,
        },
        'ALREADY_DISPATCHED'
      );
    }

    // 8. Atomic Database Transaction: Consume Stock & Record Shipment
    const result = await prisma.$transaction(async (tx) => {
      // 8a. Atomic consumption: release reservation and decrement physical stock
      const consumedRows = await tx.$executeRaw`
        UPDATE "ProductInventory"
        SET "quantity" = "quantity" - ${returnRequest.requestedQuantity},
            "reservedQuantity" = "reservedQuantity" - ${returnRequest.requestedQuantity},
            "updatedAt" = NOW()
        WHERE "id" = ${returnRequest.allocatedInventoryId}
          AND "variantId" = ${returnRequest.allocatedVariantId}
          AND "vendorId" = ${returnRequest.allocatedVendorId}
          AND "reservedQuantity" >= ${returnRequest.requestedQuantity}
          AND "quantity" >= ${returnRequest.requestedQuantity}
      `;

      if (consumedRows === 0) {
        throw new Error('STOCK_CONSUMPTION_FAILED: Insufficient reserved inventory available to consume for dispatch.');
      }

      // 8b. Record forward shipment details on ReturnRequest
      const updatedNotes = vendorNotes
        ? returnRequest.vendorNotes
          ? `${returnRequest.vendorNotes}\n[Replacement Dispatched] Courier: ${courierPartner}, AWB: ${trackingNumber} - ${vendorNotes}`
          : `[Replacement Dispatched] Courier: ${courierPartner}, AWB: ${trackingNumber} - ${vendorNotes}`
        : returnRequest.vendorNotes;

      const updated = await tx.returnRequest.update({
        where: { id: returnRequest.id },
        data: {
          replacementCourierPartner: courierPartner,
          replacementTrackingNumber: trackingNumber,
          replacementDispatchedAt: new Date(),
          vendorNotes: updatedNotes,
        },
        include: {
          user: { select: { name: true, email: true } },
          order: { select: { orderNumber: true } },
          orderItem: {
            include: {
              product: { select: { title: true } },
              variant: { select: { sku: true, size: true, color: true } },
            },
          },
        },
      });

      return updated;
    });

    return apiSuccess({
      returnRequest: {
        id: result.id,
        orderNumber: result.order.orderNumber,
        type: result.type,
        status: result.status,
        replacementCourierPartner: result.replacementCourierPartner,
        replacementTrackingNumber: result.replacementTrackingNumber,
        replacementDispatchedAt: result.replacementDispatchedAt,
        replacementDeliveredAt: result.replacementDeliveredAt,
        allocatedVariantId: result.allocatedVariantId,
        requestedQuantity: result.requestedQuantity,
      },
      message: `Replacement shipment successfully dispatched via ${courierPartner} (AWB: ${trackingNumber}).`,
    });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    const msg = err?.message || '';
    if (msg.includes('STOCK_CONSUMPTION_FAILED')) {
      return apiError(msg, 400, null, 'STOCK_CONSUMPTION_FAILED');
    }
    return handleApiError(err);
  }
}
