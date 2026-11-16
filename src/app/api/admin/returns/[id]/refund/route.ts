import { NextResponse } from 'next/server';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { allocateOrderDiscount } from '@/lib/discounts';
import {
  calculateRefundShares,
  validateRefundCeilings,
  calculateProRataShippingShare,
  validateShippingRefundCeiling,
} from '@/lib/refund-math';
import { SELLER_FAULT_REASONS } from '@/lib/policy-constants';
import { PaymentStatus, OrderStatus, PayoutStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { id: string };
}

interface ProcessRefundBody {
  clientRequestId?: string;
  referenceNumber?: string;
  amount?: number;
  adminNotes?: string;
}

/**
 * POST /api/admin/returns/[id]/refund
 * Processes an administrative refund for an eligible QC-approved or dispute-approved return.
 * Strictly restricted to authenticated ADMIN and SUPER_ADMIN users.
 * Enforces atomic database locks, monotonic sequence allocation, and strict ceiling invariants.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const admin = await requireAdmin();

    const returnRequestId = context.params.id;
    if (!returnRequestId) {
      return apiError('Return request ID is required.', 400, null, 'INVALID_ID');
    }

    const body: ProcessRefundBody = await request.json().catch(() => ({}));
    const clientRequestId = (body.clientRequestId || '').trim();
    const referenceNumber = (body.referenceNumber || '').trim();
    const requestedAmountRaw = body.amount !== undefined ? Number(body.amount) : undefined;
    const adminNotes = (body.adminNotes || '').trim();

    // 1. Mandatory Input Validation
    if (!clientRequestId) {
      return apiError(
        'A mandatory clientRequestId is required for idempotency.',
        400,
        null,
        'CLIENT_REQUEST_ID_REQUIRED'
      );
    }

    if (!referenceNumber || referenceNumber.length < 4 || referenceNumber.length > 60) {
      return apiError(
        'A valid bank settlement reference / UTR is required (4 to 60 characters).',
        400,
        null,
        'INVALID_REFERENCE_NUMBER'
      );
    }

    if (requestedAmountRaw !== undefined && (isNaN(requestedAmountRaw) || requestedAmountRaw <= 0)) {
      return apiError(
        'Refund amount must be a strictly positive number.',
        400,
        null,
        'INVALID_REFUND_AMOUNT'
      );
    }

    // 2. Concurrency-Safe Atomic Transaction
    const result = await prisma.$transaction(async (tx) => {
      // 2a. Idempotency Check: Existing clientRequestId for this ReturnRequest
      const existingRefund = await tx.refundTransaction.findUnique({
        where: {
          returnRequestId_clientRequestId: {
            returnRequestId,
            clientRequestId,
          },
        },
      });

      if (existingRefund) {
        return {
          refund: existingRefund,
          isDuplicate: true,
          message: 'Idempotent refund already confirmed for this clientRequestId.',
        };
      }

      // 2b. Fetch ReturnRequest with relations
      const returnRequest = await tx.returnRequest.findUnique({
        where: { id: returnRequestId },
        include: {
          vendor: true,
          user: true,
          orderItem: true,
          order: {
            include: {
              items: {
                select: {
                  id: true,
                  totalPrice: true,
                },
              },
            },
          },
        },
      });

      if (!returnRequest) {
        throw new Error('RETURN_NOT_FOUND');
      }

      const { order, orderItem } = returnRequest;

      // 2c. Integrity Check: Item belongs to this return request
      if (returnRequest.orderItemId !== orderItem.id || orderItem.orderId !== order.id) {
        throw new Error('ORDER_ITEM_INTEGRITY_MISMATCH');
      }

      // 2d. Status & QC Eligibility Check
      const isQcPassed = returnRequest.status === 'QC_PASSED';
      const isDisputeApproved =
        returnRequest.status === 'QC_DISPUTED' &&
        returnRequest.disputeResolution === 'REFUND_APPROVED';

      if (!isQcPassed && !isDisputeApproved) {
        throw new Error(
          `RETURN_NOT_ELIGIBLE: Status "${returnRequest.status}" is not eligible for refund settlement. Return must be QC_PASSED or have an approved dispute.`
        );
      }

      // 2e. Payment Eligibility Check
      if (order.paymentMethod === 'COD' && order.paymentStatus !== PaymentStatus.PAID) {
        throw new Error(
          'COD_NOT_SETTLED: COD orders cannot be refunded until delivery remittance is confirmed as PAID.'
        );
      }

      if (
        order.paymentStatus === PaymentStatus.PENDING ||
        order.paymentStatus === PaymentStatus.FAILED
      ) {
        throw new Error(
          `ORDER_PAYMENT_INELIGIBLE: Order payment status is ${order.paymentStatus}. Must be PAID or PARTIALLY_REFUNDED.`
        );
      }

      // 2f. Discount Allocation via Last-Item Remainder Rule
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

      // 2g. Cumulative Confirmed Refunds Queries
      const allConfirmedOrderRefunds = await tx.refundTransaction.findMany({
        where: {
          orderId: order.id,
          status: 'CONFIRMED',
        },
        select: {
          returnRequestId: true,
          amount: true,
        },
      });

      const confirmedItemRefunds = allConfirmedOrderRefunds
        .filter((r) => r.returnRequestId === returnRequest.id)
        .reduce((sum, r) => Math.round((sum + Number(r.amount)) * 100) / 100, 0);

      const confirmedOrderRefunds = allConfirmedOrderRefunds.reduce(
        (sum, r) => Math.round((sum + Number(r.amount)) * 100) / 100,
        0
      );

      const approvedOrderCeiling = Math.max(
        0,
        Math.round((Number(order.subtotal) - Number(order.discount)) * 100) / 100
      );

      const effectiveItemCeiling = thisItemAllocation.effectiveItemCeiling;
      const remainingItemCap = Math.max(
        0,
        Math.round((effectiveItemCeiling - confirmedItemRefunds) * 100) / 100
      );
      const remainingOrderCap = Math.max(
        0,
        Math.round((approvedOrderCeiling - confirmedOrderRefunds) * 100) / 100
      );

      const maxRefundable = Math.min(remainingItemCap, remainingOrderCap);

      if (maxRefundable <= 0) {
        throw new Error(
          'NO_REFUNDABLE_BALANCE: The item or order has already reached its maximum allowable refund ceiling.'
        );
      }

      const refundAmount =
        requestedAmountRaw !== undefined
          ? Math.round(requestedAmountRaw * 100) / 100
          : maxRefundable;

      // Validate ceilings
      validateRefundCeilings({
        requestedAmount: refundAmount,
        confirmedItemRefunds,
        effectiveItemCeiling,
        confirmedOrderRefunds,
        approvedOrderCeiling,
      });

      // 2h. Calculate platform & vendor product shares with zero paise discrepancy
      const shares = calculateRefundShares(
        refundAmount,
        Number(orderItem.commissionRate || 0)
      );

      // 2h-2. Shipping Fee Refund Allocation (Seller Fault Cases)
      const isSellerFault = SELLER_FAULT_REASONS.has(returnRequest.reason);
      const orderShippingFee = Number(order.shippingFee || 0);
      let eligibleShippingRefund = 0;

      if (isSellerFault && orderShippingFee > 0) {
        const shippingItems = order.items.map((it) => {
          const alloc = allocatedDiscounts.find((a) => a.id === it.id);
          return {
            id: it.id,
            eligibleValue: alloc ? alloc.effectiveItemCeiling : Number(it.totalPrice),
          };
        });

        eligibleShippingRefund = calculateProRataShippingShare(
          orderShippingFee,
          shippingItems,
          orderItem.id
        );

        // Ceiling guard: Cumulative shipping refunds across partial refunds cannot exceed order.shippingFee
        const allConfirmedShippingRefunds = allConfirmedOrderRefunds.reduce(
          (sum, r: any) => Math.round((sum + Number(r.shippingFeeRefund || 0)) * 100) / 100,
          0
        );

        validateShippingRefundCeiling({
          orderShippingFee,
          confirmedShippingRefunds: allConfirmedShippingRefunds,
          requestedShippingRefund: eligibleShippingRefund,
        });
      }

      const totalGrossRefund = Math.round((refundAmount + eligibleShippingRefund) * 100) / 100;

      // 2i. Monotonic sequence allocation
      const sequence = returnRequest.nextRefundSequence;

      // Increment sequence on returnRequest
      const updatedAdminNotes = adminNotes
        ? returnRequest.adminNotes
          ? `${returnRequest.adminNotes}\n[${new Date().toISOString()}] Admin ${admin.email}: ${adminNotes} (Ref: ${referenceNumber})`
          : `[${new Date().toISOString()}] Admin ${admin.email}: ${adminNotes} (Ref: ${referenceNumber})`
        : returnRequest.adminNotes;

      await tx.returnRequest.update({
        where: { id: returnRequest.id },
        data: {
          nextRefundSequence: { increment: 1 },
          adminNotes: updatedAdminNotes,
        },
      });

      // 2j. Record RefundTransaction with separate shippingFeeRefund column
      // Note: Forward shipping fee refund for seller-fault is absorbed by platform per current policy
      // Vendor is NOT debited for unapproved shipping deductions.
      const refundRecord = await tx.refundTransaction.create({
        data: {
          returnRequestId: returnRequest.id,
          orderId: order.id,
          userId: returnRequest.userId,
          vendorProfileId: returnRequest.vendorProfileId,
          clientRequestId,
          requestSequence: sequence,
          status: 'CONFIRMED',
          mode:
            order.paymentMethod === 'COD'
              ? 'MANUAL_BANK_TRANSFER'
              : 'ORIGINAL_PAYMENT',
          amount: totalGrossRefund,
          shippingFeeRefund: eligibleShippingRefund,
          vendorShare: shares.vendorShare,
          platformShare: Math.round((shares.platformShare + eligibleShippingRefund) * 100) / 100,
          gatewayReference: referenceNumber,
          processedAt: new Date(),
        },
      });

      // 2k. Update Order.refundedAmount & Order.paymentStatus
      const newOrderRefundedAmount = Math.round(
        (Number(order.refundedAmount || 0) + totalGrossRefund) * 100
      ) / 100;

      const orderEffectiveCeiling = Math.round(
        (approvedOrderCeiling + orderShippingFee) * 100
      ) / 100;

      const isOrderFullyRefunded = newOrderRefundedAmount >= orderEffectiveCeiling;
      const newPaymentStatus = isOrderFullyRefunded
        ? PaymentStatus.REFUNDED
        : PaymentStatus.PARTIALLY_REFUNDED;

      await tx.order.update({
        where: { id: order.id },
        data: {
          refundedAmount: newOrderRefundedAmount,
          paymentStatus: newPaymentStatus,
          status: isOrderFullyRefunded ? OrderStatus.RETURNED : order.status,
        },
      });

      // 2l. Check if this return request item is fully refunded -> mark COMPLETED
      const newConfirmedItemRefunds = Math.round(
        (confirmedItemRefunds + refundAmount) * 100
      ) / 100;
      if (newConfirmedItemRefunds >= effectiveItemCeiling) {
        await tx.returnRequest.update({
          where: { id: returnRequest.id },
          data: { status: 'COMPLETED' },
        });
      }

      // 2m. Phase 12 Part C: Vendor Adjustment & Payout Status Handling
      // Determine if this order item was already paid out to the vendor in a completed payout batch
      const isAlreadyPaidOut =
        orderItem.vendorPayoutId !== null ||
        orderItem.payoutStatus === PayoutStatus.COMPLETED;

      let vendorAdjustmentRecord = null;

      if (isAlreadyPaidOut) {
        // Vendor already received payout for this item; create RETURN_REFUND_DEBIT to recover vendor's share
        vendorAdjustmentRecord = await tx.vendorAdjustment.create({
          data: {
            vendorProfileId: orderItem.vendorId,
            amount: shares.vendorShare,
            type: 'RETURN_REFUND_DEBIT',
            description: `Return refund debit for order #${order.orderNumber} (Refund Tx: ${refundRecord.id})`,
            returnRequestId: returnRequest.id,
            refundTransactionId: refundRecord.id,
            vendorPayoutId: null, // As required by chk_vendor_adjustment_parent_integrity
          },
        });
      } else {
        // Item has NOT yet been paid out to vendor: cancel or reduce pending payout earnings
        if (newConfirmedItemRefunds >= effectiveItemCeiling) {
          // Fully refunded item: mark payoutStatus as CANCELLED so future payout ignores it
          await tx.orderItem.update({
            where: { id: orderItem.id },
            data: { payoutStatus: PayoutStatus.CANCELLED },
          });
        } else {
          // Partially refunded item: reduce netEarnings by vendor's share of refund
          const currentNet = Number(orderItem.netEarnings || 0);
          const updatedNet = Math.max(0, Math.round((currentNet - shares.vendorShare) * 100) / 100);
          await tx.orderItem.update({
            where: { id: orderItem.id },
            data: { netEarnings: updatedNet },
          });
        }
      }

      return {
        refund: refundRecord,
        isDuplicate: false,
        vendorAdjustment: vendorAdjustmentRecord,
        message: 'Refund settled successfully.',
        orderSummary: {
          orderId: order.id,
          orderRefundedAmount: newOrderRefundedAmount,
          paymentStatus: newPaymentStatus,
        },
      };
    });

    return apiSuccess(result, undefined, 201);
  } catch (error: any) {
    if (error?.name === 'AuthError') {
      return handleAuthError(error);
    }

    const msg = error?.message || '';
    if (
      msg.includes('RETURN_NOT_FOUND') ||
      msg.includes('RETURN_NOT_ELIGIBLE') ||
      msg.includes('COD_NOT_SETTLED') ||
      msg.includes('ORDER_PAYMENT_INELIGIBLE') ||
      msg.includes('NO_REFUNDABLE_BALANCE') ||
      msg.includes('ITEM_CEILING_EXCEEDED') ||
      msg.includes('ORDER_CEILING_EXCEEDED') ||
      msg.includes('INVALID_REFUND_AMOUNT') ||
      msg.includes('ORDER_ITEM_INTEGRITY_MISMATCH')
    ) {
      return apiError(msg, 400, null, 'REFUND_SETTLEMENT_REJECTED');
    }

    return handleApiError(error);
  }
}
