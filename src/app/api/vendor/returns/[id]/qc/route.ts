import { NextResponse } from 'next/server';
import { requireVendor, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { ReturnStatus } from '@prisma/client';

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
}

/**
 * POST /api/vendor/returns/[id]/qc
 * Vendor completes Quality Check (QC) inspection after item is RECEIVED_AT_WH.
 * 
 * Invariants:
 * 1. Only the owning vendor can inspect.
 * 2. Status must be strictly RECEIVED_AT_WH.
 * 3. QC PASS atomically updates status, sets restock linkages, and increments ProductInventory.quantity.
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
      // Find matching ProductInventory record for exact product, variant and vendor (Rule 8)
      const inventory = await prisma.productInventory.findFirst({
        where: {
          productId: returnRequest.orderItem.productId,
          vendorId: returnRequest.vendorProfileId,
          ...(returnRequest.orderItem.variantId
            ? { variantId: returnRequest.orderItem.variantId }
            : {}),
        },
      });

      if (!inventory) {
        return apiError(
          'Target ProductInventory record not found for restocking. Please ensure inventory record exists.',
          400,
          null,
          'INVENTORY_RECORD_NOT_FOUND'
        );
      }

      // Atomic conditional update + inventory restoration (Rules 8, 9, 10)
      const updatedReturn = await prisma.$transaction(async (tx) => {
        // Atomic Guard: update returnRequest ONLY if status is still RECEIVED_AT_WH and restockInventoryId is NULL
        const rowsAffected = await tx.$executeRaw`
          UPDATE "ReturnRequest"
          SET "status" = 'QC_PASSED',
              "qcPassed" = true,
              "qcNotes" = ${serializedQcNotes},
              "qcCompletedAt" = NOW(),
              "restockInventoryId" = ${inventory.id},
              "restockVariantId" = ${inventory.variantId},
              "restockVendorId" = ${inventory.vendorId},
              "updatedAt" = NOW()
          WHERE "id" = ${returnRequest.id}
            AND "status" = 'RECEIVED_AT_WH'
            AND "restockInventoryId" IS NULL
        `;

        if (rowsAffected === 0) {
          throw new Error('CONCURRENCY_ERROR: ReturnRequest was already processed or restocked by a concurrent request.');
        }

        // Restore ONLY requestedQuantity to ProductInventory.quantity (reservedQuantity is UNCHANGED)
        await tx.$executeRaw`
          UPDATE "ProductInventory"
          SET "quantity" = "quantity" + ${returnRequest.requestedQuantity},
              "updatedAt" = NOW()
          WHERE "id" = ${inventory.id}
            AND "variantId" = ${inventory.variantId}
            AND "vendorId" = ${inventory.vendorId}
        `;

        return await tx.returnRequest.findUnique({
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
      });

      return apiSuccess({
        returnRequest: updatedReturn,
        qcResult: 'PASS',
        inventoryRestored: {
          inventoryId: inventory.id,
          sku: inventory.sku,
          quantityAdded: returnRequest.requestedQuantity,
        },
        message: `Quality Check PASSED. ${returnRequest.requestedQuantity} unit(s) successfully restored to warehouse inventory.`,
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
