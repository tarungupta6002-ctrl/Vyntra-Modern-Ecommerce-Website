import { prisma } from '@/lib/prisma';
import { requireAuth, handleAuthError, AuthError } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { cleanBody } from '@/lib/support/tickets';
import { serializeTicket } from '@/lib/support/serialize';
import { notifySupportTeam } from '@/lib/support/emails';

export const dynamic = 'force-dynamic';

/** Customer adds a message to their request. A resolved request reopens. Body: { message } */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();

    const rate = checkRateLimit(`support-reply:${auth.userId}`, 20, 3600);
    if (!rate.allowed) return rateLimitResponse(rate.resetInSeconds, 'Too many messages. Please wait a little before sending more.');

    const body = await request.json().catch(() => ({}));
    const message = cleanBody(body.message);
    if (!message.ok) return apiError(message.error, 400);

    const existing = await prisma.supportTicket.findFirst({
      where: { OR: [{ id: params.id }, { ticketNumber: params.id }], userId: auth.userId },
      select: { id: true },
    });
    if (!existing) return apiError('Request not found.', 404);

    const now = new Date();
    const ticket = await prisma.supportTicket.update({
      where: { id: existing.id },
      data: {
        status: 'OPEN',
        resolvedAt: null,
        lastMessageAt: now,
        messages: {
          create: { authorId: auth.userId, authorName: auth.dbUser.name, fromStaff: false, body: message.value, createdAt: now },
        },
      },
      include: { order: { select: { orderNumber: true } }, messages: { orderBy: { createdAt: 'asc' } } },
    });

    await notifySupportTeam(
      { ticketNumber: ticket.ticketNumber, subject: ticket.subject, topic: ticket.topic, orderNumber: ticket.order?.orderNumber },
      { name: auth.dbUser.name, email: auth.email },
      message.value,
      'reply'
    );

    return apiSuccess({ ticket: serializeTicket(ticket, 'customer') });
  } catch (err) {
    if (err instanceof AuthError) return handleAuthError(err);
    return handleApiError(err);
  }
}
