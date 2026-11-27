import { prisma } from '@/lib/prisma';
import { requireAuth, handleAuthError, AuthError } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response';
import { serializeTicket } from '@/lib/support/serialize';

export const dynamic = 'force-dynamic';

/** One of the customer's own requests with its full conversation. `id` may be the ticket number. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    const ticket = await prisma.supportTicket.findFirst({
      where: { OR: [{ id: params.id }, { ticketNumber: params.id }], userId: auth.userId },
      include: { order: { select: { orderNumber: true } }, messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!ticket) return apiError('Request not found.', 404);
    return apiSuccess({ ticket: serializeTicket(ticket, 'customer') });
  } catch (err) {
    if (err instanceof AuthError) return handleAuthError(err);
    return handleApiError(err);
  }
}
