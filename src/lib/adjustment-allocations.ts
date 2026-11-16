import { prisma } from '@/lib/prisma';
import { AllocationStatus, PayoutSettlementType, PayoutStatus, Prisma } from '@prisma/client';

export interface AdjustmentSummary {
  id: string;
  vendorProfileId: string;
  amount: number;
  type: string;
  description: string;
  totalAllocated: number;
  outstandingBalance: number;
  createdAt: Date;
}

export interface AllocationPlanItem {
  vendorAdjustmentId: string;
  vendorProfileId: string;
  amount: number;
  allocationSequence: number;
  notes?: string;
}

/**
 * Calculates the active allocated amount and outstanding balance for a list of adjustments.
 */
export function calculateAdjustmentBalances(
  adjustments: Array<{
    id: string;
    vendorProfileId: string;
    amount: Prisma.Decimal | number;
    type: string;
    description: string;
    createdAt: Date;
    allocations?: Array<{
      id: string;
      amount: Prisma.Decimal | number;
      status: AllocationStatus;
      allocationSequence: number;
    }>;
  }>
): AdjustmentSummary[] {
  return adjustments.map((adj) => {
    const totalAmount = Math.round(Number(adj.amount) * 100) / 100;
    const activeAllocations = (adj.allocations || []).filter(
      (a) => a.status === AllocationStatus.ACTIVE
    );
    const totalAllocated = Math.round(
      activeAllocations.reduce((sum, a) => sum + Number(a.amount), 0) * 100
    ) / 100;
    const outstandingBalance = Math.max(0, Math.round((totalAmount - totalAllocated) * 100) / 100);

    return {
      id: adj.id,
      vendorProfileId: adj.vendorProfileId,
      amount: totalAmount,
      type: adj.type,
      description: adj.description,
      totalAllocated,
      outstandingBalance,
      createdAt: adj.createdAt,
    };
  });
}

/**
 * Plans FIFO allocations of outstanding adjustments against available net earnings.
 * Ensures exact paise arithmetic and strictly non-negative payout.
 */
export function planAdjustmentAllocations(
  availableEarnings: number,
  adjustments: AdjustmentSummary[],
  existingAllocationsByAdjId: Map<string, Array<{ allocationSequence: number }>> = new Map()
): {
  plannedAllocations: AllocationPlanItem[];
  totalDeductions: number;
  finalNetAmount: number;
  remainingEarnings: number;
} {
  let remainingEarnings = Math.round(availableEarnings * 100) / 100;
  let totalDeductions = 0;
  const plannedAllocations: AllocationPlanItem[] = [];

  // Sort candidate adjustments strictly by createdAt ASC, id ASC (FIFO deterministic order)
  const sortedAdjustments = [...adjustments].sort((a, b) => {
    const timeDiff = a.createdAt.getTime() - b.createdAt.getTime();
    if (timeDiff !== 0) return timeDiff;
    return a.id.localeCompare(b.id);
  });

  for (const adj of sortedAdjustments) {
    if (remainingEarnings <= 0) break;
    if (adj.outstandingBalance <= 0) continue;

    // Deduct up to available earnings or adjustment balance
    const allocAmount = Math.min(remainingEarnings, adj.outstandingBalance);
    const roundedAlloc = Math.round(allocAmount * 100) / 100;

    if (roundedAlloc > 0) {
      const existing = existingAllocationsByAdjId.get(adj.id) || [];
      const maxSeq = existing.reduce((max, a) => Math.max(max, a.allocationSequence), 0);
      const nextSequence = maxSeq + 1;

      plannedAllocations.push({
        vendorAdjustmentId: adj.id,
        vendorProfileId: adj.vendorProfileId,
        amount: roundedAlloc,
        allocationSequence: nextSequence,
        notes: `Payout deduction: ₹${roundedAlloc.toFixed(2)} allocated against ${adj.type} (${adj.id})`,
      });

      remainingEarnings = Math.round((remainingEarnings - roundedAlloc) * 100) / 100;
      totalDeductions = Math.round((totalDeductions + roundedAlloc) * 100) / 100;
    }
  }

  const finalNetAmount = Math.max(0, Math.round((availableEarnings - totalDeductions) * 100) / 100);

  return {
    plannedAllocations,
    totalDeductions,
    finalNetAmount,
    remainingEarnings: finalNetAmount,
  };
}
