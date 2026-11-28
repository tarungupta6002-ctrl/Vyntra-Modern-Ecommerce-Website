import { requireAdmin, handleAuthError, AuthError } from '@/lib/auth';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import {
  createReturnRefund,
  executeReturnGatewayRefund,
  reconcileReturnRefund,
  ReturnRefundError,
} from '@/lib/payments/return-refund';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { id: string };
}

interface ProcessRefundBody {
  clientRequestId?: string;
  /** Bank/UPI reference; only for Cash on Delivery (money sent outside Razorpay). */
  referenceNumber?: string;
  amount?: number;
  adminNotes?: string;
  /** Re-check a refund whose Razorpay outcome is unknown. */
  reconcileRefundId?: string;
}

/**
 * POST /api/admin/returns/[id]/refund
 * Refunds an approved return. Online payments go back through Razorpay automatically;
 * Cash on Delivery refunds are paid by the team and recorded with their reference.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const admin = await requireAdmin();
    const returnRequestId = context.params.id;
    const body: ProcessRefundBody = await request.json().catch(() => ({}));

    if (body.reconcileRefundId) {
      const row = await prisma.refundTransaction.findFirst({
        where: { id: body.reconcileRefundId, returnRequestId },
        select: { id: true },
      });
      if (!row) return apiError('Refund not found for this return.', 404);
      const outcome = await reconcileReturnRefund(row.id);
      return apiSuccess({ outcome });
    }

    const clientRequestId = (body.clientRequestId || '').trim();
    if (!clientRequestId) {
      return apiError('A clientRequestId is required.', 400, null, 'CLIENT_REQUEST_ID_REQUIRED');
    }
    const requestedAmount = body.amount !== undefined ? Number(body.amount) : undefined;
    if (requestedAmount !== undefined && (isNaN(requestedAmount) || requestedAmount <= 0)) {
      return apiError('Refund amount must be more than ₹0.', 400, null, 'INVALID_REFUND_AMOUNT');
    }

    const created = await createReturnRefund({
      returnRequestId,
      clientRequestId,
      requestedAmount,
      adminEmail: admin.email,
      adminNotes: body.adminNotes,
      manualReference: body.referenceNumber,
    });

    if (created.kind === 'duplicate') {
      return apiSuccess({ refundId: created.refundId, status: created.status, isDuplicate: true });
    }
    if (created.kind === 'manual') {
      return apiSuccess(
        { refundId: created.refundId, status: 'CONFIRMED', mode: 'MANUAL_BANK_TRANSFER', amount: created.amount },
        undefined,
        201
      );
    }

    const outcome = await executeReturnGatewayRefund(created.refundId);
    if (outcome.status === 'failed') {
      return apiError(
        outcome.needsReconciliation
          ? `Could not reach Razorpay to confirm the refund (${outcome.reason}). Use "Check with Razorpay" on this return before trying again.`
          : `Razorpay did not accept the refund: ${outcome.reason}`,
        502,
        { refundId: outcome.refundId, needsReconciliation: outcome.needsReconciliation },
        outcome.needsReconciliation ? 'REFUND_RECONCILIATION_REQUIRED' : 'REFUND_GATEWAY_REJECTED'
      );
    }
    return apiSuccess(
      {
        refundId: outcome.refundId,
        status: outcome.gatewayStatus === 'processed' ? 'CONFIRMED' : 'GATEWAY_PENDING',
        mode: 'ORIGINAL_PAYMENT',
        amount: outcome.amount,
        razorpayRefundId: outcome.razorpayRefundId,
      },
      undefined,
      201
    );
  } catch (error: any) {
    if (error instanceof AuthError) return handleAuthError(error);
    if (error instanceof ReturnRefundError) return apiError(error.message, 400, null, error.code);
    const msg = error?.message || '';
    if (/CEILING_EXCEEDED|INVALID_REFUND_AMOUNT/.test(msg)) {
      return apiError(msg, 400, null, 'REFUND_SETTLEMENT_REJECTED');
    }
    return handleApiError(error);
  }
}
