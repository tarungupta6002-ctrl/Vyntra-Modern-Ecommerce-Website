import { NextResponse } from 'next/server';
import { requireVendor, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, handleApiError } from '@/lib/api-response';
import { OrderItemStatus, OrderStatus, PaymentStatus, PayoutStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await requireVendor();
    const vendorId = auth.vendorProfileId;

    // 1. Fetch active global commission setting for context
    const commissionSetting = await prisma.platformSetting.findUnique({
      where: { key: 'marketplace_commission_rate' },
    });
    const platformCommissionRate = commissionSetting ? Number(commissionSetting.value) : 10.0;

    // 2. Fetch all OrderItems belonging to this vendor
    const items = await prisma.orderItem.findMany({
      where: { vendorId },
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
        product: {
          select: { id: true, title: true, brand: true },
        },
        variant: {
          select: { sku: true, size: true, color: true },
        },
        vendorPayout: {
          select: {
            id: true,
            referenceNumber: true,
            paidAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 3. Categorize earnings and product-wise entries
    let pendingBalance = 0;
    let pendingCommission = 0;
    let awaitingDeliveryEarnings = 0;
    let totalLifetimeNetEarnings = 0;

    const formattedItems = items.map((it) => {
      const gross = Number(it.totalPrice);
      const isLegacy = it.commissionRate === null;
      const rate = it.commissionRate !== null ? Number(it.commissionRate) : platformCommissionRate;
      const commAmt = it.commissionAmount !== null ? Number(it.commissionAmount) : Number(((gross * rate) / 100).toFixed(2));
      const net = it.netEarnings !== null ? Number(it.netEarnings) : Number((gross - commAmt).toFixed(2));

      const isDelivered = it.status === OrderItemStatus.DELIVERED && it.order.status === OrderStatus.DELIVERED;
      const isPaid = it.order.paymentStatus === PaymentStatus.PAID;
      const isEligibleNow = isDelivered && isPaid && it.payoutStatus === PayoutStatus.PENDING && !it.vendorPayoutId;

      if (it.payoutStatus === PayoutStatus.COMPLETED) {
        totalLifetimeNetEarnings += net;
      } else if (isEligibleNow) {
        pendingBalance += net;
        pendingCommission += commAmt;
        totalLifetimeNetEarnings += net;
      } else if (!isLegacy && it.payoutStatus === PayoutStatus.PENDING) {
        awaitingDeliveryEarnings += net;
      }

      return {
        id: it.id,
        orderId: it.orderId,
        orderNumber: it.order.orderNumber,
        orderDate: it.order.createdAt,
        deliveryStatus: it.status,
        orderStatus: it.order.status,
        paymentStatus: it.order.paymentStatus,
        paymentMethod: it.order.paymentMethod,
        productTitle: it.product.title,
        brand: it.product.brand,
        sku: it.variant?.sku || 'N/A',
        size: it.selectedSize || it.variant?.size || 'N/A',
        color: it.selectedColor || it.variant?.color || 'N/A',
        quantity: it.quantity,
        unitPrice: Number(it.unitPrice),
        totalPrice: gross,
        commissionRate: isLegacy ? null : rate,
        commissionAmount: isLegacy ? null : commAmt,
        commissionTax: it.commissionTax !== null ? Number(it.commissionTax) : null,
        netEarnings: isLegacy ? null : net,
        payoutStatus: it.payoutStatus,
        isEligibleForPayout: isEligibleNow,
        isLegacy,
        payoutReference: it.vendorPayout?.referenceNumber || null,
        paidAt: it.vendorPayout?.paidAt || null,
      };
    });

    // 4. Fetch payout batches for this vendor
    const payouts = await prisma.vendorPayout.findMany({
      where: { vendorId },
      orderBy: { paidAt: 'desc' },
      include: {
        _count: {
          select: { orderItems: true },
        },
        adjustmentAllocations: {
          where: { status: 'ACTIVE' },
          select: {
            amount: true,
            allocationSequence: true,
            vendorAdjustmentId: true,
            notes: true,
          },
        },
      },
    });

    // 5. Phase 12 Part C: Fetch adjustments and active allocations for this vendor (Strict Isolation)
    const adjustments = await prisma.vendorAdjustment.findMany({
      where: { vendorProfileId: vendorId },
      include: {
        allocations: {
          select: {
            id: true,
            amount: true,
            status: true,
            allocationSequence: true,
            vendorPayoutId: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalOutstandingAdjustments = 0;
    const formattedAdjustments = adjustments.map((adj) => {
      const adjAmount = Number(adj.amount);
      const activeAllocations = adj.allocations.filter((a) => a.status === 'ACTIVE');
      const allocatedSum = activeAllocations.reduce((sum, a) => sum + Number(a.amount), 0);
      const outstandingBalance = Math.max(0, Math.round((adjAmount - allocatedSum) * 100) / 100);
      totalOutstandingAdjustments += outstandingBalance;

      return {
        id: adj.id,
        amount: adjAmount,
        type: adj.type,
        description: adj.description,
        totalAllocated: Number(allocatedSum.toFixed(2)),
        outstandingBalance,
        allocations: adj.allocations,
        createdAt: adj.createdAt,
      };
    });

    const pendingBaseNet = Number(pendingBalance.toFixed(2));
    totalOutstandingAdjustments = Number(totalOutstandingAdjustments.toFixed(2));
    const estimatedNextPayout = Math.max(0, Number((pendingBaseNet - totalOutstandingAdjustments).toFixed(2)));

    const totalPaidOut = payouts
      .filter((p) => p.status === PayoutStatus.COMPLETED)
      .reduce((acc, p) => acc + Number(p.netAmount), 0);

    return apiSuccess({
      storeName: auth.dbUser.vendorProfile?.storeName || 'My Store',
      platformCommissionRate,
      taxPolicy: {
        status: 'PENDING_CONFIRMATION',
        label: 'Not configured / Pending CA confirmation',
      },
      metrics: {
        pendingBalance: pendingBaseNet,
        pendingCommission: Number(pendingCommission.toFixed(2)),
        outstandingAdjustments: totalOutstandingAdjustments,
        estimatedNextPayout,
        totalPaidOut: Number(totalPaidOut.toFixed(2)),
        awaitingDeliveryEarnings: Number(awaitingDeliveryEarnings.toFixed(2)),
        totalLifetimeNetEarnings: Number((totalPaidOut + pendingBaseNet).toFixed(2)),
      },
      items: formattedItems,
      adjustments: formattedAdjustments,
      payouts: payouts.map((p) => ({
        id: p.id,
        amount: Number(p.netAmount),
        status: p.status,
        settlementType: p.settlementType,
        payoutMethod: p.settlementType === 'INTERNAL_OFFSET' ? 'INTERNAL_OFFSET' : 'BANK_TRANSFER',
        payoutReference: p.referenceNumber,
        periodStart: p.periodStart,
        periodEnd: p.periodEnd,
        paidAt: p.paidAt,
        itemCount: p._count.orderItems,
        deductionsApplied: p.adjustmentAllocations.reduce((sum, a) => sum + Number(a.amount), 0),
        allocations: p.adjustmentAllocations,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    return handleApiError(error);
  }
}
