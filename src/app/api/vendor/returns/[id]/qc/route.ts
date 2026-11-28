import { NextResponse } from 'next/server';
import { requireVendor, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { ReturnStatus } from '@prisma/client';
import { restockOrderItem } from '@/lib/orders/restock';
import { SELLER_FAULT_REASONS } from '@/lib/policy-constants';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    id: string;
  };
}

export interface QcNotesPayload {
  version: 1;
  inspectedBy: {
    userId: string;
    name: string;
    role: string;
    vendorProfileId: string;
  };
  inspectedAt: string;
  result: 'PASS' | 'FAIL';
  conditionDetails: string;
  failedReason?: string | null;
  evidencePhotos: string[];
  notes?: string | null;
  /** PASS only: whether the item went back into sellable stock. */
  resellable?: boolean;
  restockedTo?: 'offer' | 'product' | null;
}

/**
 * POST /api/vendor/returns/[id]/qc
 * Vendor completes Quality Check (QC) inspection after item is RECEIVED_AT_WH.
 * 
 * Invariants:
 * 1. Only the owning vendor can inspect.
 * 2. Status must be strictly RECEIVED_AT_WH.
 * 3. QC PASS atomically updates status and, if the seller says the item can be sold again, puts it back
 *    into the stock it was sold from (offer or product inventory). Damaged/defective items default to
 *    not resellable so they are not sold to the next customer.
 * 4. ProductInventory.reservedQuantity is NEVER touched.
 * 5. Conditional guard prevents duplicate / concurrent inventory restoration.
 * 6. QC FAIL never touches inventory.
 * 7. Inspector identity is derived strictly from server session.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await requireVendor();
    const vendorProfileId = auth.vendorProfileId;
    const { id } = context.params;

    const body = await request.json().catch(() => ({}));
    const {
      result, // 'PASS' | 'FAIL'
      conditionDetails,
      failedReason,
      notes,
      evidencePhotos = [],
      resellable: resellableInput,
    } = body;

    // 1. Validate Input
    if (!result || (result !== 'PASS' && result !== 'FAIL')) {
      return apiError(
        "Invalid QC result. Must be strictly 'PASS' or 'FAIL'.",
        400,
        { allowedResults: ['PASS', 'FAIL'] },
        'INVALID_QC_RESULT'
      );
    }

    if (!conditionDetails || typeof conditionDetails !== 'string' || conditionDetails.trim().length === 0) {
      return apiError(
        'Product condition details are mandatory for Quality Check verification.',
        400,
        null,
        'CONDITION_DETAILS_REQUIRED'
      );
    }

    if (result === 'FAIL') {
      if (!failedReason || typeof failedReason !== 'string' || failedReason.trim().length === 0) {
        return apiError(
          'A specific failure reason is mandatory when Quality Check fails.',
          400,
          null,
          'QC_FAILED_REASON_REQUIRED'
        );
      }
    }

    // Validate evidence photos (must be array of non-empty strings)
    const validPhotos = Array.isArray(evidencePhotos)
      ? evidencePhotos
          .filter((p) => typeof p === 'string' && p.trim().length > 0)
          .map((p) => p.trim())
      : [];

    // 2. Fetch ReturnRequest with orderItem and product context
    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id },
      include: {
        order: { select: { orderNumber: true } },
        orderItem: {
          select: {
            id: true,
            productId: true,
            variantId: true,
            offerVariantId: true,
            vendorId: true,
            quantity: true,
          },
        },
      },
    });

    if (!returnRequest) {
      return apiError('Return request not found.', 404, null, 'RETURN_REQUEST_NOT_FOUND');
    }

    // 3. Strict Vendor Ownership Enforcement (Rule 7)
    if (returnRequest.vendorProfileId !== vendorProfileId) {
      return apiError(
        'Access denied. You do not own the vendor profile associated with this return request.',
        403,
        null,
        'FORBIDDEN'
      );
    }

    // 4. State Invariant: Must be RECEIVED_AT_WH (Rule 1)
    if (returnRequest.status !== ReturnStatus.RECEIVED_AT_WH) {
      return apiError(
        `Quality Check can only be conducted after the return is physically received at warehouse (RECEIVED_AT_WH). Current status is: ${returnRequest.status}.`,
        400,
        { currentStatus: returnRequest.status },
        'INVALID_STATUS_FOR_QC'
      );
    }

    // 5. Build Versioned JSON Structure (Rule 2, 3, 5)
    const nowIso = new Date().toISOString();
    const qcPayload: QcNotesPayload = {
      version: 1,
      inspectedBy: {
        userId: auth.userId,
        name: auth.dbUser.name || 'Vendor Inspector',
        role: auth.role,
        vendorProfileId: auth.vendorProfileId,
      },
      inspectedAt: nowIso,
      result,
      conditionDetails: conditionDetails.trim(),
      failedReason: result === 'FAIL' ? failedReason.trim() : null,
      evidencePhotos: validPhotos,
      notes: notes ? String(notes).trim() : null,
    };
    const serializedQcNotes = JSON.stringify(qcPayload);

    // 6. Execute Transactional QC Completion
    if (result === 'PASS') {
      // Damaged, defective or wrong items should not go back on sale unless the seller says so.
      const resellable =
        typeof resellableInput === 'boolean' ? resellableInput : !SELLER_FAULT_REASONS.has(returnRequest.reason);
      qcPayload.resellable = resellable;

      const outcome = await prisma.$transaction(async (tx) => {
        // Status guard: only the first QC for this return can restock.
        const claimed = await tx.returnRequest.updateMany({
          where: { id: returnRequest.id, status: ReturnStatus.RECEIVED_AT_WH, qcCompletedAt: null },
          data: { status: ReturnStatus.QC_PASSED, qcPassed: true, qcCompletedAt: new Date() },
        });
        if (claimed.count === 0) {
          throw new Error('CONCURRENCY_ERROR: ReturnRequest was already processed or restocked by a concurrent request.');
        }

        const target = resellable
          ? await restockOrderItem(tx, returnRequest.orderItem, returnRequest.requestedQuantity)
          : null;
        qcPayload.restockedTo = target?.kind ?? null;

        await tx.returnRequest.update({
          where: { id: returnRequest.id },
          data: {
            qcNotes: JSON.stringify(qcPayload),
            ...(target?.kind === 'product'
              ? { restockInventoryId: target.inventoryId, restockVariantId: target.variantId, restockVendorId: target.vendorId }
              : {}),
          },
        });

        const updatedReturn = await tx.returnRequest.findUnique({
          where: { id: returnRequest.id },
          include: {
            order: { select: { orderNumber: true } },
            orderItem: {
              include: {
                product: { select: { title: true } },
                variant: { select: { sku: true } },
              },
            },
          },
        });
        return { updatedReturn, target };
      });

      return apiSuccess({
        returnRequest: outcome.updatedReturn,
        qcResult: 'PASS',
        resellable,
        inventoryRestored: outcome.target
          ? { inventoryId: outcome.target.inventoryId, kind: outcome.target.kind, quantityAdded: returnRequest.requestedQuantity }
          : null,
        message: !resellable
          ? 'Inspection passed. The item was not put back into stock because it cannot be sold again.'
          : outcome.target
          ? `Inspection passed. ${returnRequest.requestedQuantity} unit(s) put back into stock.`
          : 'Inspection passed, but no stock record was found for this item, so stock was not changed.',
      });
    } else {
      // QC FAIL: Update ReturnRequest to QC_FAILED with atomic guard preventing concurrent overwrite
      const rowsAffected = await prisma.$executeRaw`
        UPDATE "ReturnRequest"
        SET "status" = 'QC_FAILED',
            "qcPassed" = false,
            "qcFailedReason" = ${failedReason.trim()},
            "qcNotes" = ${serializedQcNotes},
            "qcCompletedAt" = NOW(),
            "updatedAt" = NOW()
        WHERE "id" = ${returnRequest.id}
          AND "status" = 'RECEIVED_AT_WH'
          AND "qcCompletedAt" IS NULL
      `;

      if (rowsAffected === 0) {
        return apiError(
          'CONCURRENCY_ERROR: Quality check was already completed or updated by a concurrent session.',
          409,
          null,
          'CONCURRENCY_ERROR'
        );
      }

      const updatedReturn = await prisma.returnRequest.findUnique({
        where: { id: returnRequest.id },
        include: {
          order: { select: { orderNumber: true } },
          orderItem: {
            include: {
              product: { select: { title: true } },
              variant: { select: { sku: true } },
            },
          },
        },
      });

      return apiSuccess({
        returnRequest: updatedReturn,
        qcResult: 'FAIL',
        qcFailedReason: failedReason.trim(),
        inventoryRestored: null,
        message: 'Quality Check FAILED. Return marked as QC_FAILED. Inventory was NOT restored.',
      });
    }
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    return handleApiError(err);
  }
}
