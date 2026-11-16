import { NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * GET /api/returns/[id]
 * Fetch a specific ReturnRequest with its complete lifecycle status, reverse logistics & refund history.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = await requireAuth();
    const { id } = context.params;

    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentStatus: true,
            paymentMethod: true,
            createdAt: true,
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
        vendor: {
          select: {
            id: true,
            storeName: true,
            storeSlug: true,
          },
        },
        refundTransactions: {
          orderBy: { requestSequence: 'asc' },
          select: {
            id: true,
            clientRequestId: true,
            requestSequence: true,
            status: true,
            mode: true,
            amount: true,
            vendorShare: true,
            platformShare: true,
            processedAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!returnRequest) {
      return apiError('Return request not found.', 404, null, 'RETURN_REQUEST_NOT_FOUND');
    }

    // Security: Only request owner or admins can view
    if (returnRequest.userId !== auth.userId && auth.role !== 'ADMIN' && auth.role !== 'SUPER_ADMIN') {
      return apiError('You are not authorized to view this return request.', 403, null, 'FORBIDDEN');
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
      adminNotes: returnRequest.adminNotes,
      requestedQuantity: returnRequest.requestedQuantity,
      reverseTrackingNumber: returnRequest.reverseTrackingNumber,
      reverseCourierPartner: returnRequest.reverseCourierPartner,
      pickedUpAt: returnRequest.pickedUpAt,
      receivedAtWarehouseAt: returnRequest.receivedAtWarehouseAt,
      replacementCourierPartner: returnRequest.replacementCourierPartner,
      replacementTrackingNumber: returnRequest.replacementTrackingNumber,
      replacementDispatchedAt: returnRequest.replacementDispatchedAt,
      replacementDeliveredAt: returnRequest.replacementDeliveredAt,
      allocatedInventoryId: returnRequest.allocatedInventoryId,
      allocatedVariantId: returnRequest.allocatedVariantId,
      qcPassed: returnRequest.qcPassed,
      qcFailedReason: returnRequest.qcFailedReason,
      qcCompletedAt: returnRequest.qcCompletedAt,
      isDisputed: returnRequest.isDisputed,
      disputeNotes: returnRequest.disputeNotes,
      disputeResolvedAt: returnRequest.disputeResolvedAt,
      disputeResolution: returnRequest.disputeResolution,
      createdAt: returnRequest.createdAt,
      updatedAt: returnRequest.updatedAt,
      item: {
        title: returnRequest.orderItem.product?.title || 'Artisanal Piece',
        brand: returnRequest.orderItem.product?.brand || 'Vyntra Collective',
        size: returnRequest.orderItem.selectedSize || returnRequest.orderItem.variant?.size || 'N/A',
        color: returnRequest.orderItem.selectedColor || returnRequest.orderItem.variant?.color || 'N/A',
        unitPrice: Number(returnRequest.orderItem.unitPrice),
        totalPrice: Number(returnRequest.orderItem.totalPrice),
        image:
          returnRequest.orderItem.variant?.imageUrl ||
          returnRequest.orderItem.product?.images[0]?.url ||
          null,
      },
      vendor: {
        storeName: returnRequest.vendor.storeName,
        storeSlug: returnRequest.vendor.storeSlug,
      },
      refundTransactions: returnRequest.refundTransactions.map((tx) => ({
        id: tx.id,
        requestSequence: tx.requestSequence,
        status: tx.status,
        mode: tx.mode,
        amount: Number(tx.amount),
        processedAt: tx.processedAt,
        createdAt: tx.createdAt,
      })),
    });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    return handleApiError(err);
  }
}

/**
 * PATCH /api/returns/[id]
 * Customer cancellation of a return or replacement request.
 * Atomically releases reserved stock if a replacement was previously approved.
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await requireAuth();
    const { id } = context.params;

    const body = await request.json().catch(() => ({}));
    const { action, cancellationReason } = body;

    if (action !== 'CANCEL') {
      return apiError("Invalid action. Must be 'CANCEL'.", 400, null, 'INVALID_ACTION');
    }

    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id },
    });

    if (!returnRequest) {
      return apiError('Return request not found.', 404, null, 'RETURN_NOT_FOUND');
    }

    // Ownership Guard
    if (returnRequest.userId !== auth.userId) {
      return apiError('You are not authorized to cancel this return request.', 403, null, 'FORBIDDEN');
    }

    // Status Guard: Can only cancel if REQUESTED or APPROVED
    if (returnRequest.status !== 'REQUESTED' && returnRequest.status !== 'APPROVED') {
      return apiError(
        `Cannot cancel request in status "${returnRequest.status}". Only REQUESTED or APPROVED requests can be cancelled.`,
        400,
        { currentStatus: returnRequest.status },
        'CANNOT_CANCEL'
      );
    }

    // Atomic cancellation & stock release
    await prisma.$transaction(async (tx) => {
      // If replacement stock was reserved, release it atomically
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

      await tx.returnRequest.update({
        where: { id: returnRequest.id },
        data: {
          status: 'CANCELLED',
          allocatedInventoryId: null,
          allocatedVariantId: null,
          allocatedVendorId: null,
          customerNotes: cancellationReason
            ? returnRequest.customerNotes
              ? `${returnRequest.customerNotes}\n[Cancelled by Customer] ${cancellationReason}`
              : `[Cancelled by Customer] ${cancellationReason}`
            : returnRequest.customerNotes,
        },
      });
    });

    return apiSuccess({
      id: returnRequest.id,
      status: 'CANCELLED',
      message: 'Return/replacement request has been successfully cancelled and any reserved stock released.',
    });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    return handleApiError(err);
  }
}
