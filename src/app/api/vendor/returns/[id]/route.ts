import { NextResponse } from 'next/server';
import { requireVendor, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { ReturnStatus, ReturnType } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    id: string;
  };
}

// State Machine: Allowed transitions per status
const ALLOWED_VENDOR_TRANSITIONS: Partial<Record<ReturnStatus, ReturnStatus[]>> = {
  [ReturnStatus.REQUESTED]: [ReturnStatus.APPROVED, ReturnStatus.REJECTED, ReturnStatus.REFUND_OFFERED],
  [ReturnStatus.APPROVED]: [ReturnStatus.PICKED_UP, ReturnStatus.REFUND_OFFERED, ReturnStatus.REJECTED],
  [ReturnStatus.PICKED_UP]: [ReturnStatus.RECEIVED_AT_WH],
};

/**
 * GET /api/vendor/returns/[id]
 * Fetch detailed view of a return request for the authenticated vendor.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = await requireVendor();
    const vendorProfileId = auth.vendorProfileId;
    const { id } = context.params;

    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentStatus: true,
            createdAt: true,
            shippingAddress: true,
          },
        },
        orderItem: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                brand: true,
                images: { orderBy: { sortOrder: 'asc' }, take: 1 },
              },
            },
            variant: {
              select: {
                sku: true,
                size: true,
                color: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    });

    if (!returnRequest) {
      return apiError('Return request not found.', 404, null, 'RETURN_REQUEST_NOT_FOUND');
    }

    // Security: Vendors can ONLY view their own return requests
    if (returnRequest.vendorProfileId !== vendorProfileId) {
      return apiError(
        'You are not authorized to view return requests belonging to another merchant.',
        403,
        null,
        'FORBIDDEN'
      );
    }

    return apiSuccess({
      id: returnRequest.id,
      orderId: returnRequest.orderId,
      orderNumber: returnRequest.order.orderNumber,
      orderItemId: returnRequest.orderItemId,
      type: returnRequest.type,
      status: returnRequest.status,
      reason: returnRequest.reason,
      detailedReason: returnRequest.detailedReason,
      customerNotes: returnRequest.customerNotes,
      vendorNotes: returnRequest.vendorNotes,
      requestedQuantity: returnRequest.requestedQuantity,
      reverseCourierPartner: returnRequest.reverseCourierPartner,
      reverseTrackingNumber: returnRequest.reverseTrackingNumber,
      pickedUpAt: returnRequest.pickedUpAt,
      receivedAtWarehouseAt: returnRequest.receivedAtWarehouseAt,
      qcPassed: returnRequest.qcPassed,
      isDisputed: returnRequest.isDisputed,
      createdAt: returnRequest.createdAt,
      updatedAt: returnRequest.updatedAt,
      customer: returnRequest.user,
      shippingAddress: returnRequest.order.shippingAddress,
      item: {
        title: returnRequest.orderItem.product?.title || 'Artisanal Piece',
        brand: returnRequest.orderItem.product?.brand || 'Vyntra Collective',
        size: returnRequest.orderItem.selectedSize || returnRequest.orderItem.variant?.size || 'N/A',
        color: returnRequest.orderItem.selectedColor || returnRequest.orderItem.variant?.color || 'N/A',
        sku: returnRequest.orderItem.variant?.sku || 'N/A',
        unitPrice: Number(returnRequest.orderItem.unitPrice),
        totalPrice: Number(returnRequest.orderItem.totalPrice),
        orderedQuantity: returnRequest.orderItem.quantity,
        image:
          returnRequest.orderItem.variant?.imageUrl ||
          returnRequest.orderItem.product?.images[0]?.url ||
          null,
      },
    });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    return handleApiError(err);
  }
}

/**
 * PATCH /api/vendor/returns/[id]
 * Process Vendor Action: Approve, Reject, or Update Reverse Shipment tracking.
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await requireVendor();
    const vendorProfileId = auth.vendorProfileId;
    const { id } = context.params;

    const body = await request.json().catch(() => ({}));
    const {
      status: targetStatus,
      rejectionReason,
      vendorNotes,
      reverseCourierPartner,
      reverseTrackingNumber,
      targetVariantId,
    } = body;

    // 1. Fetch ReturnRequest and verify existence
    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id },
      include: {
        order: { select: { orderNumber: true } },
        orderItem: {
          include: {
            product: { select: { title: true, vendorId: true } },
            variant: { select: { id: true, sku: true, productId: true } },
          },
        },
      },
    });

    if (!returnRequest) {
      return apiError('Return request not found.', 404, null, 'RETURN_REQUEST_NOT_FOUND');
    }

    // 2. Strict Vendor Ownership Enforcement (Rule 1 & 7)
    if (returnRequest.vendorProfileId !== vendorProfileId) {
      return apiError(
        'Access denied. You do not own the vendor profile associated with this return request.',
        403,
        null,
        'FORBIDDEN'
      );
    }

    const currentStatus = returnRequest.status;
    const updateData: any = {};

    // 3. Status Transition Validation & Enforcement (Rule 2, 3, 5, 6)
    if (targetStatus && targetStatus !== currentStatus) {
      const allowedNext = ALLOWED_VENDOR_TRANSITIONS[currentStatus];

      if (!allowedNext || !allowedNext.includes(targetStatus as ReturnStatus)) {
        return apiError(
          `Invalid status transition from ${currentStatus} to ${targetStatus}.`,
          400,
          {
            currentStatus,
            targetStatus,
            allowedTransitions: allowedNext || [],
          },
          'INVALID_STATUS_TRANSITION'
        );
      }

      // Mandatory rejection reason rule (Rule 3)
      if (targetStatus === ReturnStatus.REJECTED) {
        const reason = (rejectionReason || vendorNotes || '').trim();
        if (!reason) {
          return apiError(
            'A detailed rejection reason is mandatory when declining a customer return or replacement request.',
            400,
            null,
            'REJECTION_REASON_REQUIRED'
          );
        }
        updateData.vendorNotes = `REJECTED: ${reason}`;
        updateData.rejectedAt = new Date();
      }

      // Stock unavailable / refund offer (Section 2.B & 9)
      if (targetStatus === ReturnStatus.REFUND_OFFERED) {
        if (returnRequest.type !== ReturnType.REPLACEMENT) {
          return apiError('Refund can only be offered for replacement requests where exchange stock is unavailable.', 400);
        }
        // Atomically release any pre-reserved replacement stock
        if (returnRequest.allocatedInventoryId && !returnRequest.replacementDispatchedAt) {
          await prisma.$executeRaw`
            UPDATE "ProductInventory"
            SET "reservedQuantity" = GREATEST(0, "reservedQuantity" - ${returnRequest.requestedQuantity}),
                "updatedAt" = NOW()
            WHERE "id" = ${returnRequest.allocatedInventoryId}
              AND "variantId" = ${returnRequest.allocatedVariantId}
              AND "vendorId" = ${returnRequest.allocatedVendorId}
              AND "reservedQuantity" >= ${returnRequest.requestedQuantity}
          `;
          updateData.allocatedInventoryId = null;
          updateData.allocatedVariantId = null;
          updateData.allocatedVendorId = null;
        }
        updateData.vendorNotes = vendorNotes
          ? `REFUND_OFFERED: ${String(vendorNotes).trim()}`
          : 'REFUND_OFFERED: Replacement variant out of stock. Offering customer full refund.';
      }

      // Status-specific timestamps & logistics (Rule 4 & 5)
      if (targetStatus === ReturnStatus.APPROVED) {
        if (vendorNotes) {
          updateData.vendorNotes = String(vendorNotes).trim();
        }

        // Part B: Atomically reserve replacement stock on approval
        if (returnRequest.type === ReturnType.REPLACEMENT && !returnRequest.allocatedInventoryId) {
          const chosenVariantId = targetVariantId || returnRequest.orderItem.variantId;

          // Verify target variant belongs to same product and vendor
          if (chosenVariantId) {
            const targetVariant = await prisma.productVariant.findUnique({
              where: { id: chosenVariantId },
              include: { product: { select: { id: true, vendorId: true } } },
            });

            if (!targetVariant) {
              return apiError('Target replacement variant not found.', 404, null, 'VARIANT_NOT_FOUND');
            }

            if (
              targetVariant.productId !== returnRequest.orderItem.productId ||
              targetVariant.product.vendorId !== returnRequest.vendorProfileId
            ) {
              return apiError(
                'Invalid target variant. Replacement variant must belong to the exact same product and merchant.',
                400,
                null,
                'INVALID_TARGET_VARIANT'
              );
            }
          }

          // Query target ProductInventory
          const targetInventory = await prisma.productInventory.findFirst({
            where: {
              productId: returnRequest.orderItem.productId,
              vendorId: returnRequest.vendorProfileId,
              ...(chosenVariantId ? { variantId: chosenVariantId } : {}),
            },
          });

          if (!targetInventory) {
            return apiError(
              'No active inventory record found for the target replacement variant.',
              400,
              null,
              'INVENTORY_RECORD_NOT_FOUND'
            );
          }

          const availableStock = targetInventory.quantity - targetInventory.reservedQuantity;
          if (availableStock < returnRequest.requestedQuantity) {
            return apiError(
              `Insufficient stock to approve replacement. Available: ${availableStock}, Requested: ${returnRequest.requestedQuantity}.`,
              400,
              { availableStock, requestedQuantity: returnRequest.requestedQuantity },
              'INSUFFICIENT_STOCK'
            );
          }

          // Atomic reservation SQL update
          const reservedRows = await prisma.$executeRaw`
            UPDATE "ProductInventory"
            SET "reservedQuantity" = "reservedQuantity" + ${returnRequest.requestedQuantity},
                "updatedAt" = NOW()
            WHERE "id" = ${targetInventory.id}
              AND "variantId" = ${targetInventory.variantId}
              AND "vendorId" = ${targetInventory.vendorId}
              AND ("quantity" - "reservedQuantity") >= ${returnRequest.requestedQuantity}
          `;

          if (reservedRows === 0) {
            return apiError(
              'Concurrent stock reservation failed. Available inventory was consumed by another order.',
              409,
              null,
              'CONCURRENT_RESERVATION_FAILED'
            );
          }

          updateData.allocatedInventoryId = targetInventory.id;
          updateData.allocatedVariantId = targetInventory.variantId;
          updateData.allocatedVendorId = targetInventory.vendorId;
        }
      }

      // If rejected and had an active reservation, release reserved quantity exactly once
      if (targetStatus === ReturnStatus.REJECTED && returnRequest.allocatedInventoryId && !returnRequest.replacementDispatchedAt) {
        await prisma.$executeRaw`
          UPDATE "ProductInventory"
          SET "reservedQuantity" = GREATEST(0, "reservedQuantity" - ${returnRequest.requestedQuantity}),
              "updatedAt" = NOW()
          WHERE "id" = ${returnRequest.allocatedInventoryId}
            AND "variantId" = ${returnRequest.allocatedVariantId}
            AND "vendorId" = ${returnRequest.allocatedVendorId}
            AND "reservedQuantity" >= ${returnRequest.requestedQuantity}
        `;

        updateData.allocatedInventoryId = null;
        updateData.allocatedVariantId = null;
        updateData.allocatedVendorId = null;
      }

      if (targetStatus === ReturnStatus.PICKED_UP) {
        updateData.pickedUpAt = new Date();
      }

      if (targetStatus === ReturnStatus.RECEIVED_AT_WH) {
        updateData.receivedAtWarehouseAt = new Date();
      }

      updateData.status = targetStatus as ReturnStatus;
    }

    // 4. Reverse Shipment Tracking Information (Rule 4 & 5)
    if (reverseCourierPartner !== undefined) {
      updateData.reverseCourierPartner = reverseCourierPartner ? String(reverseCourierPartner).trim() : null;
    }
    if (reverseTrackingNumber !== undefined) {
      updateData.reverseTrackingNumber = reverseTrackingNumber ? String(reverseTrackingNumber).trim() : null;
    }
    if (vendorNotes && targetStatus !== ReturnStatus.REJECTED) {
      updateData.vendorNotes = String(vendorNotes).trim();
    }

    // Ensure there is something to update
    if (Object.keys(updateData).length === 0) {
      return apiError('No valid update fields provided.', 400, null, 'NO_UPDATE_DATA');
    }

    // 5. Atomic Update
    const updated = await prisma.returnRequest.update({
      where: { id: returnRequest.id },
      data: updateData,
      include: {
        user: { select: { name: true, email: true } },
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
      returnRequest: {
        id: updated.id,
        orderNumber: updated.order.orderNumber,
        type: updated.type,
        status: updated.status,
        reason: updated.reason,
        vendorNotes: updated.vendorNotes,
        reverseCourierPartner: updated.reverseCourierPartner,
        reverseTrackingNumber: updated.reverseTrackingNumber,
        pickedUpAt: updated.pickedUpAt,
        receivedAtWarehouseAt: updated.receivedAtWarehouseAt,
        replacementCourierPartner: updated.replacementCourierPartner,
        replacementTrackingNumber: updated.replacementTrackingNumber,
        replacementDispatchedAt: updated.replacementDispatchedAt,
        replacementDeliveredAt: updated.replacementDeliveredAt,
        allocatedInventoryId: updated.allocatedInventoryId,
        allocatedVariantId: updated.allocatedVariantId,
        updatedAt: updated.updatedAt,
      },
      message: `Return request ${updated.id.slice(-6)} successfully transitioned to ${updated.status}.`,
    });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    return handleApiError(err);
  }
}
