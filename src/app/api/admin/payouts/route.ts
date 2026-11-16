import { NextResponse } from 'next/server';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, handleApiError } from '@/lib/api-response';
import { OrderItemStatus, OrderStatus, PaymentStatus, PayoutStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');

    // 1. Fetch active global commission setting
    const commissionSetting = await prisma.platformSetting.findUnique({
      where: { key: 'marketplace_commission_rate' },
    });
    const platformCommissionRate = commissionSetting ? Number(commissionSetting.value) : 10.0;

    // 2. Fetch vendors
    const vendorWhere = vendorId ? { id: vendorId } : {};
    const vendors = await prisma.vendorProfile.findMany({
      where: vendorWhere,
      select: {
        id: true,
        storeName: true,
        storeSlug: true,
        status: true,
        isVerified: true,
        commissionRate: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { storeName: 'asc' },
    });

    // 3. For each vendor, fetch eligible order items and completed payouts
    const vendorSummaries = await Promise.all(
      vendors.map(async (v) => {
        // Query eligible items for payout
        const eligibleItems = await prisma.orderItem.findMany({
          where: {
            vendorId: v.id,
            status: OrderItemStatus.DELIVERED,
            payoutStatus: PayoutStatus.PENDING,
            vendorPayoutId: null,
            order: {
              status: OrderStatus.DELIVERED,
              paymentStatus: PaymentStatus.PAID,
            },
          },
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                paymentMethod: true,
                paymentStatus: true,
                status: true,
                createdAt: true,
              },
            },
            product: {
              select: { id: true, title: true, brand: true },
            },
            variant: {
              select: { sku: true, size: true, color: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        // Sum pending values
        let pendingGross = 0;
        let pendingCommission = 0;
        let pendingNetEarnings = 0;

        const formattedEligibleItems = eligibleItems.map((item) => {
          const gross = Number(item.totalPrice);
          const commRate = item.commissionRate !== null ? Number(item.commissionRate) : platformCommissionRate;
          const commAmt = item.commissionAmount !== null ? Number(item.commissionAmount) : Number(((gross * commRate) / 100).toFixed(2));
          const net = item.netEarnings !== null ? Number(item.netEarnings) : Number((gross - commAmt).toFixed(2));

          pendingGross += gross;
          pendingCommission += commAmt;
          pendingNetEarnings += net;

          return {
            id: item.id,
            orderId: item.orderId,
            orderNumber: item.order.orderNumber,
            orderDate: item.order.createdAt,
            paymentMethod: item.order.paymentMethod,
            productTitle: item.product.title,
            brand: item.product.brand,
            sku: item.variant?.sku || 'N/A',
            size: item.selectedSize || item.variant?.size || 'N/A',
            color: item.selectedColor || item.variant?.color || 'N/A',
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            totalPrice: gross,
            commissionRate: commRate,
            commissionAmount: commAmt,
            commissionTax: item.commissionTax !== null ? Number(item.commissionTax) : null,
            netEarnings: net,
            payoutStatus: item.payoutStatus,
            isLegacy: item.commissionRate === null,
          };
        });

        // Query historical completed payouts
        const completedPayouts = await prisma.vendorPayout.findMany({
          where: {
            vendorId: v.id,
            status: PayoutStatus.COMPLETED,
          },
          orderBy: { paidAt: 'desc' },
        });

        // Query all historical settled items for this vendor with full product & financial details
        const settledItems = await prisma.orderItem.findMany({
          where: {
            vendorId: v.id,
            payoutStatus: PayoutStatus.COMPLETED,
          },
          include: {
            order: {
              select: { id: true, orderNumber: true, paymentMethod: true, createdAt: true },
            },
            product: {
              select: { id: true, title: true, brand: true, images: { take: 1, orderBy: { sortOrder: 'asc' } } },
            },
            variant: {
              select: { sku: true, size: true, color: true },
            },
            vendorPayout: {
              select: { id: true, referenceNumber: true, paidAt: true, netAmount: true, settlementType: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        const formattedSettledItems = settledItems.map((item) => {
          const gross = Number(item.totalPrice);
          const commRate = item.commissionRate !== null ? Number(item.commissionRate) : platformCommissionRate;
          const commAmt = item.commissionAmount !== null ? Number(item.commissionAmount) : Number(((gross * commRate) / 100).toFixed(2));
          const net = item.netEarnings !== null ? Number(item.netEarnings) : Number((gross - commAmt).toFixed(2));

          return {
            id: item.id,
            orderId: item.orderId,
            orderNumber: item.order.orderNumber,
            orderDate: item.order.createdAt,
            paymentMethod: item.order.paymentMethod,
            productTitle: item.product?.title || 'Artisan Product',
            brand: item.product?.brand || v.storeName,
            image: item.product?.images?.[0]?.url || null,
            sku: item.variant?.sku || 'N/A',
            size: item.selectedSize || item.variant?.size || 'Standard',
            color: item.selectedColor || item.variant?.color || 'Classic',
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            totalPrice: gross,
            commissionRate: commRate,
            commissionAmount: commAmt,
            netEarnings: net,
            payoutReference: item.vendorPayout?.referenceNumber || 'N/A (Settled)',
            payoutDate: item.vendorPayout?.paidAt || null,
            settlementType: item.vendorPayout?.settlementType || 'BANK_TRANSFER',
          };
        });

        // Phase 12 Part C: Query vendor adjustments & active allocations
        const vendorAdjustments = await prisma.vendorAdjustment.findMany({
          where: { vendorProfileId: v.id },
          include: {
            allocations: {
              where: { status: 'ACTIVE' },
              select: { amount: true, allocationSequence: true, status: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        let totalOutstandingAdjustments = 0;
        const formattedAdjustments = vendorAdjustments.map((adj) => {
          const adjAmount = Number(adj.amount);
          const allocatedSum = adj.allocations.reduce((sum, a) => sum + Number(a.amount), 0);
          const remainingBalance = Math.max(0, Math.round((adjAmount - allocatedSum) * 100) / 100);
          totalOutstandingAdjustments += remainingBalance;

          return {
            id: adj.id,
            amount: adjAmount,
            type: adj.type,
            description: adj.description,
            totalAllocated: Number(allocatedSum.toFixed(2)),
            outstandingBalance: remainingBalance,
            createdAt: adj.createdAt,
          };
        });

        const pendingNet = Number(pendingNetEarnings.toFixed(2));
        totalOutstandingAdjustments = Number(totalOutstandingAdjustments.toFixed(2));
        const projectedNetPayout = Math.max(0, Number((pendingNet - totalOutstandingAdjustments).toFixed(2)));

        const totalPaidOut = completedPayouts.reduce((acc, p) => acc + Number(p.netAmount), 0);

        return {
          vendorId: v.id,
          storeName: v.storeName,
          storeSlug: v.storeSlug,
          vendorStatus: v.status,
          contactEmail: v.user?.email || 'N/A',
          contactName: v.user?.name || 'Seller',
          eligibleItemCount: eligibleItems.length,
          pendingGross: Number(pendingGross.toFixed(2)),
          pendingCommission: Number(pendingCommission.toFixed(2)),
          pendingNetPayout: pendingNet,
          outstandingAdjustments: totalOutstandingAdjustments,
          projectedNetPayout,
          totalPaidOut: Number(totalPaidOut.toFixed(2)),
          lastPayoutDate: completedPayouts[0]?.paidAt || null,
          eligibleItems: formattedEligibleItems,
          settledItems: formattedSettledItems,
          adjustments: formattedAdjustments,
          recentPayouts: completedPayouts.slice(0, 5).map((p) => ({
            id: p.id,
            amount: Number(p.netAmount),
            settlementType: p.settlementType,
            payoutMethod: p.settlementType === 'INTERNAL_OFFSET' ? 'INTERNAL_OFFSET' : 'BANK_TRANSFER',
            payoutReference: p.referenceNumber,
            paidAt: p.paidAt,
            createdAt: p.createdAt,
          })),
        };
      })
    );

    // Platform-wide aggregation
    const platformTotals = vendorSummaries.reduce(
      (acc, v) => {
        acc.totalPendingPayouts += v.pendingNetPayout;
        acc.totalPendingCommission += v.pendingCommission;
        acc.totalCompletedPayouts += v.totalPaidOut;
        acc.totalEligibleItems += v.eligibleItemCount;
        return acc;
      },
      {
        totalPendingPayouts: 0,
        totalPendingCommission: 0,
        totalCompletedPayouts: 0,
        totalEligibleItems: 0,
      }
    );

    return apiSuccess({
      platformCommissionRate,
      taxPolicy: {
        status: 'PENDING_CONFIRMATION',
        label: 'Not configured / Pending CA confirmation',
      },
      summary: {
        totalPendingPayouts: Number(platformTotals.totalPendingPayouts.toFixed(2)),
        totalPendingCommission: Number(platformTotals.totalPendingCommission.toFixed(2)),
        totalCompletedPayouts: Number(platformTotals.totalCompletedPayouts.toFixed(2)),
        totalEligibleItems: platformTotals.totalEligibleItems,
        totalVendors: vendors.length,
      },
      vendors: vendorSummaries,
    });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    return handleApiError(error);
  }
}
