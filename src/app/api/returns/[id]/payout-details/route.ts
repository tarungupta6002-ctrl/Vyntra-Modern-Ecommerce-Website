import { requireAuth, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { acceptsPayoutDetails, maskPayoutDetails, validatePayoutDetails } from '@/lib/returns/payout-details';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/returns/[id]/payout-details
 * The customer adds or changes where a Cash on Delivery refund is sent, while the return is open.
 */
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    const body = await request.json().catch(() => ({}));

    const ret = await prisma.returnRequest.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        userId: true,
        type: true,
        status: true,
        order: { select: { paymentMethod: true } },
        refundTransactions: { where: { status: 'CONFIRMED' }, select: { id: true } },
      },
    });
    if (!ret || ret.userId !== auth.userId) {
      return apiError('Return not found.', 404, null, 'RETURN_NOT_FOUND');
    }
    if (!acceptsPayoutDetails({ paymentMethod: ret.order.paymentMethod, type: ret.type, status: ret.status })) {
      return apiError(
        'Refund details can only be set for an open return on a Cash on Delivery order.',
        400,
        null,
        'PAYOUT_DETAILS_NOT_ACCEPTED'
      );
    }
    if (ret.refundTransactions.length > 0) {
      return apiError('Your refund has already been sent, so these details can no longer change.', 400, null, 'REFUND_ALREADY_SENT');
    }

    const check = validatePayoutDetails(body);
    if ('error' in check) {
      return apiError(check.error, 400, null, 'INVALID_PAYOUT_DETAILS');
    }

    const saved = await prisma.refundPayoutDetail.upsert({
      where: { returnRequestId: ret.id },
      create: { returnRequestId: ret.id, userId: auth.userId, ...check.details },
      update: { ...check.details, erasedAt: null },
      select: { method: true, upiId: true, accountNumber: true, ifsc: true },
    });

    return apiSuccess({ method: saved.method, summary: maskPayoutDetails(saved) });
  } catch (err: any) {
    if (err.name === 'AuthError') return handleAuthError(err);
    return handleApiError(err);
  }
}
