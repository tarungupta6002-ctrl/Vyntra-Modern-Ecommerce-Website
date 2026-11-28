import { NextResponse } from 'next/server';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { allocateOrderDiscount } from '@/lib/discounts';
import { calculateRefundShares } from '@/lib/refund-math';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { id: string };
}

/**
 * GET /api/admin/returns/[id]
 * Retrieves granular administrative detail for a return request, including
 * proportional coupon discount deductions, remaining item & order ceilings,
 * and exact preview shares.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    await requireAdmin();

    const returnRequestId = context.params.id;
    if (!returnRequestId) {
      return apiError('Return request ID is required.', 400, null, 'INVALID_ID');
    }

    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id: returnRequestId },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        vendor: {
          select: { id: true, storeName: true, storeSlug: true, isVerified: true },
        },
        order: {
          include: {
            shippingAddress: true,
            items: {
              include: {
                product: {
                  select: { id: true, title: true, brand: true, images: true, category: true },
                },
                variant: {
                  select: { id: true, sku: true, size: true, color: true },
                },
                vendor: {
                  select: { id: true, storeName: true },
                },
                returnRequest: {
                  select: { id: true, type: true, status: true },
                },
              },
            },
          },
        },
        orderItem: {
          include: {
            product: {
              select: { id: true, title: true, brand: true, images: true, category: true },
            },
            variant: {
              select: { id: true, sku: true, size: true, color: true },
            },
          },
        },
        refundTransactions: {
          orderBy: { createdAt: 'desc' },
        },
        // Where to send a Cash on Delivery refund (admins only; never sent to sellers).
        refundPayoutDetail: {
          select: { method: true, upiId: true, accountHolderName: true, accountNumber: true, ifsc: true, erasedAt: true, updatedAt: true },
        },
        vendorAdjustments: {
          include: {
            allocations: {
              include: {
                vendorPayout: {
                  select: {
                    id: true,
                    referenceNumber: true,
                    settlementType: true,
                    status: true,
                    paidAt: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!returnRequest) {
      return apiError('Return request not found.', 404, null, 'RETURN_NOT_FOUND');
    }

    const { order, orderItem } = returnRequest;

    // 1. Proportional discount allocation using Last-Item Remainder Rule
    const itemCandidates = order.items.map((it) => ({
      id: it.id,
      totalPrice: Number(it.totalPrice),
    }));

    const allocatedDiscounts = allocateOrderDiscount(
      Number(order.subtotal),
      Number(order.discount),
      itemCandidates
    );

    const thisItemAllocation = allocatedDiscounts.find((a) => a.id === orderItem.id) || {
      allocatedDiscount: 0,
      effectiveItemCeiling: Number(orderItem.totalPrice),
    };

    // 2. Refunds already made or in progress (same rule as the refund endpoint: anything not
    //    FAILED counts, and only the product part is checked against the product ceilings).
    const countedStatuses = ['INITIATED', 'GATEWAY_PENDING', 'CONFIRMED', 'RECONCILIATION_REQUIRED'];
    const productPart = (tx: { amount: any; shippingFeeRefund?: any }) =>
      Number(tx.amount) - Number(tx.shippingFeeRefund || 0);
    const confirmedItemRefunds = returnRequest.refundTransactions
      .filter((tx) => countedStatuses.includes(tx.status))
      .reduce((sum, tx) => Math.round((sum + productPart(tx)) * 100) / 100, 0);

    const allOrderConfirmedRefunds = await prisma.refundTransaction.findMany({
      where: {
        orderId: order.id,
        status: { in: countedStatuses as any },
      },
      select: { amount: true, shippingFeeRefund: true },
    });
    const confirmedOrderRefunds = allOrderConfirmedRefunds.reduce(
      (sum, tx) => Math.round((sum + productPart(tx)) * 100) / 100,
      0
    );

    // 3. Approved allowable ceilings (excluding non-product fees)
    const approvedOrderCeiling = Math.max(
      0,
      Math.round((Number(order.subtotal) - Number(order.discount)) * 100) / 100
    );
    const remainingItemCap = Math.max(
      0,
      Math.round((thisItemAllocation.effectiveItemCeiling - confirmedItemRefunds) * 100) / 100
    );
    const remainingOrderCap = Math.max(
      0,
      Math.round((approvedOrderCeiling - confirmedOrderRefunds) * 100) / 100
    );

    const maxRefundable = Math.min(remainingItemCap, remainingOrderCap);

    // 4. Eligibility Evaluation
    const isQcEligible =
      returnRequest.status === 'QC_PASSED' ||
      (returnRequest.status === 'QC_DISPUTED' &&
        returnRequest.disputeResolution === 'REFUND_APPROVED');

    let isPaymentEligible = true;
    let paymentIneligibilityReason: string | null = null;
    if (order.paymentMethod === 'COD' && order.paymentStatus !== 'PAID') {
      isPaymentEligible = false;
      paymentIneligibilityReason =
        'COD orders must have remittance confirmed as PAID before processing a refund.';
    } else if (order.paymentStatus === 'PENDING' || order.paymentStatus === 'FAILED') {
      isPaymentEligible = false;
      paymentIneligibilityReason = `Order paymentStatus is ${order.paymentStatus}. Only PAID orders are eligible.`;
    }

    const isEligible = isQcEligible && isPaymentEligible && maxRefundable > 0;

    // 5. Share previews if refundable
    let sharePreview = null;
    if (maxRefundable > 0) {
      sharePreview = calculateRefundShares(
        maxRefundable,
        Number(orderItem.commissionRate || 0)
      );
    }

    return apiSuccess({
      returnRequest,
      calculations: {
        itemGrossTotal: Number(orderItem.totalPrice),
        itemAllocatedDiscount: thisItemAllocation.allocatedDiscount,
        effectiveItemCeiling: thisItemAllocation.effectiveItemCeiling,
        confirmedItemRefunds,
        remainingItemCap,
        approvedOrderCeiling,
        confirmedOrderRefunds,
        remainingOrderCap,
        maxRefundable,
        commissionRate: Number(orderItem.commissionRate || 0),
        sharePreview,
        allItemAllocations: allocatedDiscounts,
      },
      eligibility: {
        isEligible,
        isQcEligible,
        isPaymentEligible,
        paymentIneligibilityReason,
      },
    });
  } catch (error) {
    const authResp = handleAuthError(error);
    if (authResp) return authResp;
    return handleApiError(error);
  }
}
