import { NextResponse } from 'next/server';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import {
  AllocationStatus,
  OrderItemStatus,
  OrderStatus,
  PaymentStatus,
  PayoutSettlementType,
  PayoutStatus,
} from '@prisma/client';
import {
  calculateAdjustmentBalances,
  planAdjustmentAllocations,
} from '@/lib/adjustment-allocations';

export const dynamic = 'force-dynamic';

interface ProcessPayoutBody {
  vendorId?: string;
  payoutReference?: string;
  payoutMethod?: string;
}

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const body: ProcessPayoutBody = await request.json().catch(() => ({}));
    const vendorId = (body.vendorId || '').trim();
    const rawRef = (body.payoutReference || '').trim();

    if (!vendorId) {
      return apiError('Vendor ID is required.', 400, null, 'VENDOR_ID_REQUIRED');
    }

    // Verify vendor exists
    const vendor = await prisma.vendorProfile.findUnique({
      where: { id: vendorId },
      select: { id: true, storeName: true },
    });

    if (!vendor) {
      return apiError('Vendor profile not found.', 404, null, 'VENDOR_NOT_FOUND');
    }

    // Atomic transaction with deterministic row-level locking
    const result = await prisma.$transaction(
      async (tx) => {
        // Step 1: Concurrency Guard - Lock VendorProfile row to serialize payouts per vendor
        await tx.$queryRawUnsafe(
          'SELECT id FROM "VendorProfile" WHERE id = $1 FOR UPDATE',
          vendorId
        );

        // Step 2: Query eligible order items inside transaction
        // Exact eligibility:
        // 1. vendorId matches
        // 2. OrderItem status is DELIVERED
        // 3. OrderItem payoutStatus is PENDING
        // 4. OrderItem vendorPayoutId is NULL
        // 5. Parent Order status is DELIVERED
        // 6. Parent Order paymentStatus is PAID
        const eligibleItems = await tx.orderItem.findMany({
          where: {
            vendorId,
            status: OrderItemStatus.DELIVERED,
            payoutStatus: PayoutStatus.PENDING,
            vendorPayoutId: null,
            order: {
              status: OrderStatus.DELIVERED,
              paymentStatus: PaymentStatus.PAID,
            },
          },
          select: {
            id: true,
            totalPrice: true,
            commissionAmount: true,
            netEarnings: true,
            createdAt: true,
          },
        });

        if (eligibleItems.length === 0) {
          throw new Error('NO_ELIGIBLE_ITEMS_FOR_PAYOUT');
        }

        // Calculate gross, commission, and base net earnings
        const totalGross = eligibleItems.reduce((acc, it) => acc + Number(it.totalPrice || 0), 0);
        const totalCommission = eligibleItems.reduce(
          (acc, it) => acc + Number(it.commissionAmount || 0),
          0
        );
        const totalBaseNet = eligibleItems.reduce(
          (acc, it) => acc + Number(it.netEarnings || 0),
          0
        );

        const grossAmount = Math.round(totalGross * 100) / 100;
        const commissionDeducted = Math.round(totalCommission * 100) / 100;
        const baseNetEarnings = Math.round(totalBaseNet * 100) / 100;

        if (baseNetEarnings <= 0) {
          throw new Error('ZERO_BASE_EARNINGS');
        }

        // Step 3: Deterministic row locking on candidate VendorAdjustments
        // Ordered strictly by createdAt ASC, id ASC to prevent deadlocks
        const lockedAdjustmentsRaw = await tx.$queryRawUnsafe<
          Array<{
            id: string;
            vendorProfileId: string;
            amount: string;
            type: string;
            description: string;
            createdAt: Date;
          }>
        >(
          `SELECT id, "vendorProfileId", amount::text, type, description, "createdAt" 
           FROM "VendorAdjustment" 
           WHERE "vendorProfileId" = $1 
           ORDER BY "createdAt" ASC, id ASC 
           FOR UPDATE`,
          vendorId
        );

        // Fetch all existing allocations for these adjustments
        const adjIds = lockedAdjustmentsRaw.map((a) => a.id);
        const existingAllocations =
          adjIds.length > 0
            ? await tx.vendorAdjustmentAllocation.findMany({
                where: {
                  vendorAdjustmentId: { in: adjIds },
                },
                select: {
                  id: true,
                  vendorAdjustmentId: true,
                  amount: true,
                  status: true,
                  allocationSequence: true,
                },
              })
            : [];

        // Group allocations by adjustment ID
        const allocationsByAdjId = new Map<string, typeof existingAllocations>();
        for (const alloc of existingAllocations) {
          const list = allocationsByAdjId.get(alloc.vendorAdjustmentId) || [];
          list.push(alloc);
          allocationsByAdjId.set(alloc.vendorAdjustmentId, list);
        }

        // Compute balances
        const adjustmentSummaries = calculateAdjustmentBalances(
          lockedAdjustmentsRaw.map((a) => ({
            id: a.id,
            vendorProfileId: a.vendorProfileId,
            amount: parseFloat(a.amount),
            type: a.type,
            description: a.description,
            createdAt: a.createdAt,
            allocations: allocationsByAdjId.get(a.id) || [],
          }))
        );

        // Step 4: Plan FIFO allocations against available baseNetEarnings
        const allocationPlan = planAdjustmentAllocations(
          baseNetEarnings,
          adjustmentSummaries,
          allocationsByAdjId
        );

        const totalAdjustmentDeductions = allocationPlan.totalDeductions;
        const payoutNetAmount = allocationPlan.finalNetAmount;

        // Step 5: Determine settlement mode & enforce validation
        const isInternalOffset = payoutNetAmount === 0;

        if (!isInternalOffset) {
          // Positive payout requires genuine bank settlement reference (UTR >= 6 chars)
          if (!rawRef || rawRef.length < 6 || rawRef.length > 60) {
            throw new Error('INVALID_BANK_UTR');
          }
        }

        const settlementType = isInternalOffset
          ? PayoutSettlementType.INTERNAL_OFFSET
          : PayoutSettlementType.BANK_TRANSFER;

        const referenceNumber = isInternalOffset ? null : rawRef;
        const timestamps = eligibleItems.map((it) => it.createdAt.getTime());
        const periodStart = new Date(Math.min(...timestamps));
        const periodEnd = new Date();
        const paidAt = new Date();

        // Step 6: Create VendorPayout record
        const payout = await tx.vendorPayout.create({
          data: {
            vendorId,
            grossAmount,
            commissionDeducted,
            netAmount: payoutNetAmount,
            status: PayoutStatus.COMPLETED,
            settlementType,
            periodStart,
            periodEnd,
            referenceNumber,
            paidAt,
          },
        });

        // Step 7: Create VendorAdjustmentAllocation records
        const createdAllocations = [];
        for (const planned of allocationPlan.plannedAllocations) {
          const allocRecord = await tx.vendorAdjustmentAllocation.create({
            data: {
              vendorAdjustmentId: planned.vendorAdjustmentId,
              vendorPayoutId: payout.id,
              vendorProfileId: planned.vendorProfileId,
              amount: planned.amount,
              allocationSequence: planned.allocationSequence,
              status: AllocationStatus.ACTIVE,
              notes: planned.notes,
            },
          });
          createdAllocations.push(allocRecord);
        }

        // Step 8: Concurrency-safe atomic assignment of OrderItems
        const eligibleIds = eligibleItems.map((it) => it.id);
        const lockResult = await tx.orderItem.updateMany({
          where: {
            id: { in: eligibleIds },
            payoutStatus: PayoutStatus.PENDING,
            vendorPayoutId: null,
          },
          data: {
            payoutStatus: PayoutStatus.COMPLETED,
            vendorPayoutId: payout.id,
          },
        });

        if (lockResult.count !== eligibleIds.length) {
          throw new Error('CONCURRENT_PAYOUT_CONFLICT');
        }

        // Compute remaining vendor debit balance across all adjustments
        const remainingDebitBalance = Math.max(
          0,
          Math.round(
            (adjustmentSummaries.reduce((sum, a) => sum + a.outstandingBalance, 0) -
              totalAdjustmentDeductions) *
              100
          ) / 100
        );

        return {
          payoutId: payout.id,
          settlementType,
          grossAmount,
          commissionDeducted,
          baseNetEarnings,
          adjustmentDeductions: totalAdjustmentDeductions,
          payoutAmount: payoutNetAmount,
          referenceNumber,
          itemCount: eligibleIds.length,
          paidAt: payout.paidAt,
          storeName: vendor.storeName,
          remainingDebitBalance,
          allocationsCount: createdAllocations.length,
          allocations: createdAllocations,
        };
      },
      {
        maxWait: 5000,
        timeout: 20000,
      }
    );

    const message =
      result.settlementType === PayoutSettlementType.INTERNAL_OFFSET
        ? `Payout settled internally via ₹${result.adjustmentDeductions.toFixed(2)} adjustment offsets. Net bank transfer: ₹0.00 for ${result.storeName}.`
        : `Successfully settled ₹${result.payoutAmount.toLocaleString('en-IN')} for ${result.storeName} (${result.itemCount} items, ₹${result.adjustmentDeductions.toFixed(2)} deductions).`;

    return apiSuccess({
      message,
      payout: result,
    });
  } catch (error: any) {
    if (error.message === 'NO_ELIGIBLE_ITEMS_FOR_PAYOUT') {
      return apiError(
        'No delivered and paid items are currently eligible for payout settlement for this vendor.',
        400,
        null,
        'NO_ELIGIBLE_ITEMS'
      );
    }
    if (error.message === 'ZERO_BASE_EARNINGS') {
      return apiError(
        'Total base earnings must be greater than zero.',
        400,
        null,
        'ZERO_EARNINGS'
      );
    }
    if (error.message === 'INVALID_BANK_UTR') {
      return apiError(
        'A valid bank settlement reference / UTR is required (at least 6 characters) for positive bank payouts.',
        400,
        null,
        'INVALID_PAYOUT_REFERENCE'
      );
    }
    if (error.message === 'CONCURRENT_PAYOUT_CONFLICT') {
      return apiError(
        'A conflicting payout transaction was detected for one or more items. Settlement rolled back safely.',
        409,
        null,
        'CONCURRENT_PAYOUT_CONFLICT'
      );
    }

    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    return handleApiError(error);
  }
}
