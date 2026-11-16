import { NextResponse } from 'next/server';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, handleApiError } from '@/lib/api-response';
import { OrderStatus, PaymentStatus, PaymentMethod, OrderItemStatus, RefundStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'all'; // 'today' | '7d' | '30d' | 'all'

    // Determine date filter
    let dateFilter: Date | undefined;
    const now = new Date();
    if (range === 'today') {
      dateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (range === '7d') {
      dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === '30d') {
      dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const orderWhere: any = {
      status: { not: OrderStatus.CANCELLED },
    };

    if (dateFilter) {
      orderWhere.createdAt = { gte: dateFilter };
    }

    // Fetch active global commission setting
    const commissionSetting = await prisma.platformSetting.findUnique({
      where: { key: 'marketplace_commission_rate' },
    });
    const defaultCommissionRate = commissionSetting ? Number(commissionSetting.value) : 10.0;

    // Fetch orders with items, vendor, and refund transactions
    const orders = await prisma.order.findMany({
      where: orderWhere,
      include: {
        refundTransactions: true,
        items: {
          include: {
            vendor: {
              select: {
                id: true,
                storeName: true,
                storeSlug: true,
              },
            },
            product: {
              select: {
                title: true,
                brand: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Query standalone completed refund transactions in period
    const completedRefunds = await prisma.refundTransaction.findMany({
      where: {
        status: RefundStatus.CONFIRMED,
        ...(dateFilter ? { createdAt: { gte: dateFilter } } : {}),
      },
    });

    let totalRefundsAmount = 0;
    let totalPlatformRefundReversal = 0;

    completedRefunds.forEach((r) => {
      totalRefundsAmount += Number(r.amount || 0);
      totalPlatformRefundReversal += Number(r.platformShare || 0);
    });

    let grossGMV = 0;
    let totalOrderRefunds = 0;
    let totalPackagingFees = 0;
    let totalCodFees = 0;
    let totalCommissionsEarned = 0;
    let totalVendorPayoutObligation = 0;
    let totalOnlineOrdersAmount = 0;
    let totalCodOrdersAmount = 0;

    const vendorMap = new Map<
      string,
      {
        vendorId: string;
        storeName: string;
        storeSlug: string;
        grossSales: number;
        commissionContributed: number;
        vendorNet: number;
        itemsSold: number;
        ordersCount: Set<string>;
      }
    >();

    const recentOrderLedger = orders.slice(0, 30).map((o) => {
      const orderTotal = Number(o.totalAmount);
      const subtotal = Number(o.subtotal);
      const discount = Number(o.discount);
      const orderRefund = Number(o.refundedAmount || 0);
      const isFullyRefunded = o.paymentStatus === PaymentStatus.REFUNDED;
      const isCod = o.paymentMethod === PaymentMethod.COD;
      
      // Do not charge packaging/cod fee revenue if order was fully refunded
      const packagingFee = !isFullyRefunded && o.items.length > 0 ? 49 : 0;
      const codFee = !isFullyRefunded && isCod ? 49 : 0;

      let orderCommission = 0;
      let orderVendorNet = 0;

      o.items.forEach((item) => {
        // Exclude cancelled or returned items from active commission
        if (item.status === OrderItemStatus.CANCELLED) return;

        const itemGross = Number(item.totalPrice);
        const commRate = item.commissionRate !== null ? Number(item.commissionRate) : defaultCommissionRate;
        const commAmt = item.commissionAmount !== null ? Number(item.commissionAmount) : Number(((itemGross * commRate) / 100).toFixed(2));
        const vNet = item.netEarnings !== null ? Number(item.netEarnings) : Number((itemGross - commAmt).toFixed(2));

        orderCommission += commAmt;
        orderVendorNet += vNet;
      });

      const vyntraTake = isFullyRefunded
        ? 0
        : Number(Math.max(0, orderCommission + packagingFee + codFee - orderRefund).toFixed(2));

      return {
        orderId: o.id,
        orderNumber: o.orderNumber,
        createdAt: o.createdAt,
        totalAmount: orderTotal,
        refundedAmount: orderRefund,
        subtotal,
        discount,
        packagingFee,
        codFee,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        status: o.status,
        itemCount: o.items.length,
        orderCommission: Number(orderCommission.toFixed(2)),
        vendorNet: Number(orderVendorNet.toFixed(2)),
        vyntraTake,
      };
    });

    orders.forEach((o) => {
      const orderTotal = Number(o.totalAmount);
      const orderRefund = Number(o.refundedAmount || 0);
      const isFullyRefunded = o.paymentStatus === PaymentStatus.REFUNDED;
      const isCod = o.paymentMethod === PaymentMethod.COD;
      
      grossGMV += orderTotal;
      totalOrderRefunds += orderRefund;

      const packagingFee = !isFullyRefunded && o.items.length > 0 ? 49 : 0;
      const codFee = !isFullyRefunded && isCod ? 49 : 0;

      totalPackagingFees += packagingFee;
      totalCodFees += codFee;

      if (isCod) {
        totalCodOrdersAmount += orderTotal;
      } else {
        totalOnlineOrdersAmount += orderTotal;
      }

      o.items.forEach((item) => {
        // Exclude cancelled items from sales & commission
        if (item.status === OrderItemStatus.CANCELLED) return;

        const itemGross = Number(item.totalPrice);
        const commRate = item.commissionRate !== null ? Number(item.commissionRate) : defaultCommissionRate;
        const commAmt = item.commissionAmount !== null ? Number(item.commissionAmount) : Number(((itemGross * commRate) / 100).toFixed(2));
        const vNet = item.netEarnings !== null ? Number(item.netEarnings) : Number((itemGross - commAmt).toFixed(2));

        totalCommissionsEarned += commAmt;
        totalVendorPayoutObligation += vNet;

        // Vendor aggregation
        const vId = item.vendorId;
        const storeName = item.vendor?.storeName || 'Independent Vendor';
        const storeSlug = item.vendor?.storeSlug || vId;

        if (!vendorMap.has(vId)) {
          vendorMap.set(vId, {
            vendorId: vId,
            storeName,
            storeSlug,
            grossSales: 0,
            commissionContributed: 0,
            vendorNet: 0,
            itemsSold: 0,
            ordersCount: new Set<string>(),
          });
        }

        const vData = vendorMap.get(vId)!;
        vData.grossSales += itemGross;
        vData.commissionContributed += commAmt;
        vData.vendorNet += vNet;
        vData.itemsSold += item.quantity;
        vData.ordersCount.add(o.id);
      });
    });

    // Net GMV after deducting refunds
    const effectiveTotalRefunds = Math.max(totalRefundsAmount, totalOrderRefunds);
    const netGMV = Math.max(0, Number((grossGMV - effectiveTotalRefunds).toFixed(2)));

    // Net Commission earned after deducting any refunded commission
    const netCommissionsEarned = Math.max(0, Number((totalCommissionsEarned - totalPlatformRefundReversal).toFixed(2)));

    // Gateway cost: Razorpay charges ~2% on online prepaid transactions
    const estimatedGatewayFees = Number((totalOnlineOrdersAmount * 0.02).toFixed(2));

    // Vyntra Gross Revenue = Net Commission + Packaging Fees + COD Verification Fees
    const vyntraGrossRevenue = Number((netCommissionsEarned + totalPackagingFees + totalCodFees).toFixed(2));

    // Vyntra Net Profit = Gross Platform Revenue - Estimated Gateway Fees
    const vyntraNetProfit = Number(Math.max(0, vyntraGrossRevenue - estimatedGatewayFees).toFixed(2));

    const vendorContributions = Array.from(vendorMap.values())
      .map((v) => ({
        vendorId: v.vendorId,
        storeName: v.storeName,
        storeSlug: v.storeSlug,
        grossSales: Number(v.grossSales.toFixed(2)),
        commissionContributed: Number(v.commissionContributed.toFixed(2)),
        vendorNet: Number(v.vendorNet.toFixed(2)),
        itemsSold: v.itemsSold,
        ordersCount: v.ordersCount.size,
      }))
      .sort((a, b) => b.commissionContributed - a.commissionContributed);

    return apiSuccess({
      metrics: {
        grossGMV: Number(grossGMV.toFixed(2)),
        totalGMV: netGMV, // Net GMV after strictly excluding refunds
        totalRefunds: Number(effectiveTotalRefunds.toFixed(2)),
        vyntraGrossRevenue,
        vyntraNetProfit,
        estimatedGatewayFees,
        totalCommissionsEarned: netCommissionsEarned,
        totalPackagingFees,
        totalCodFees,
        totalVendorPayoutObligation: Number(totalVendorPayoutObligation.toFixed(2)),
        totalOnlineOrdersAmount: Number(totalOnlineOrdersAmount.toFixed(2)),
        totalCodOrdersAmount: Number(totalCodOrdersAmount.toFixed(2)),
        totalOrdersCount: orders.length,
        averageOrderValue: orders.length > 0 ? Number((netGMV / orders.length).toFixed(2)) : 0,
        platformCommissionRate: defaultCommissionRate,
      },
      vendorContributions,
      recentOrderLedger,
      activeRange: range,
    });
  } catch (error: any) {
    if (error.name === 'AuthError') {
      return handleAuthError(error);
    }
    return handleApiError(error);
  }
}
