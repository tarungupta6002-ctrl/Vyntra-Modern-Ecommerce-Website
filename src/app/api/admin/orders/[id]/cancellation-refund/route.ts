import { requireAdmin, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { logAdminAction } from '@/lib/audit';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { retryCancellationRefund } from '@/lib/payments/cancellation-refund';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { id: string };
}

/** GET: the automatic cancellation refund for this order (status, amount, failure reason). */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    await requireAdmin();
    const refund = await prisma.cancellationRefund.findUnique({ where: { orderId: params.id } });
    if (!refund) return apiError('No cancellation refund exists for this order.', 404, null, 'REFUND_NOT_FOUND');
    return apiSuccess({ ...refund, amount: Number(refund.amount) });
  } catch (err: any) {
    if (err.name === 'AuthError') return handleAuthError(err);
    return handleApiError(err);
  }
}

/**
 * POST: retry a FAILED or RECONCILIATION_REQUIRED cancellation refund.
 * Safe to call repeatedly: an existing Razorpay refund for this order is adopted, never duplicated.
 */
export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const admin = await requireAdmin();

    const rate = checkRateLimit(`refund-retry:${admin.userId}`, 10, 60);
    if (!rate.allowed) return rateLimitResponse(rate.resetInSeconds, 'Too many refund retries. Please wait a moment.');

    const before = await prisma.cancellationRefund.findUnique({ where: { orderId: params.id } });
    if (!before) return apiError('No cancellation refund exists for this order.', 404, null, 'REFUND_NOT_FOUND');

    const outcome = await retryCancellationRefund(params.id);

    await logAdminAction({
      adminId: admin.userId,
      adminEmail: admin.email,
      entity: 'ORDER',
      entityId: params.id,
      action: 'CANCELLATION_REFUND_RETRY',
      details: { before: { status: before.status, failureReason: before.failureReason }, outcome },
    });

    if (outcome.status === 'failed') {
      return apiError(`Refund retry failed: ${outcome.reason}`, 502, outcome, 'REFUND_RETRY_FAILED');
    }
    return apiSuccess(outcome);
  } catch (err: any) {
    if (err.name === 'AuthError') return handleAuthError(err);
    return handleApiError(err);
  }
}
