import { NextResponse } from 'next/server';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { AllocationStatus, PayoutStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin();
    const payoutId = params.id;

    const body = await request.json().catch(() => ({}));
    const reason = (body.reason || 'PAYOUT_CANCELLED_BY_ADMIN').trim();

    const payout = await prisma.vendorPayout.findUnique({
      where: { id: payoutId },
      include: {
        vendor: { select: { id: true, storeName: true } },
      },
    });

    if (!payout) {
      return apiError('Vendor payout not found.', 404, null, 'PAYOUT_NOT_FOUND');
    }

    if (payout.status === PayoutStatus.CANCELLED) {
      return apiError('Payout is already cancelled.', 400, null, 'ALREADY_CANCELLED');
    }

    // Atomic cancellation & allocation reversal
    const result = await prisma.$transaction(async (tx) => {
      // 1. Lock payout row
      await tx.$queryRawUnsafe(
        'SELECT id FROM "VendorPayout" WHERE id = $1 FOR UPDATE',
        payoutId
      );

      // 2. Transition payout status to CANCELLED
      const updatedPayout = await tx.vendorPayout.update({
        where: { id: payoutId },
        data: {
          status: PayoutStatus.CANCELLED,
        },
      });

      // 3. Reverse active allocations linked to this payout
      const reversedAllocations = await tx.vendorAdjustmentAllocation.updateMany({
        where: {
          vendorPayoutId: payoutId,
          status: AllocationStatus.ACTIVE,
        },
        data: {
          status: AllocationStatus.REVERSED,
          reversedAt: new Date(),
          reversalReason: reason,
        },
      });

      // 4. Release order items back to PENDING so they can be paid out in future
      const releasedItems = await tx.orderItem.updateMany({
        where: {
          vendorPayoutId: payoutId,
        },
        data: {
          payoutStatus: PayoutStatus.PENDING,
          vendorPayoutId: null,
        },
      });

      return {
        payoutId: updatedPayout.id,
        status: updatedPayout.status,
        reversedAllocationsCount: reversedAllocations.count,
        releasedItemsCount: releasedItems.count,
        storeName: payout.vendor.storeName,
      };
    });

    return apiSuccess({
      message: `Payout ${result.payoutId} for ${result.storeName} cancelled successfully. ${result.reversedAllocationsCount} adjustment allocations reversed; ${result.releasedItemsCount} order items released.`,
      result,
    });
  } catch (error: any) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    return handleApiError(error);
  }
}
