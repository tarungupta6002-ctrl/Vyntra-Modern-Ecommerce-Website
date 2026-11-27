import { prisma } from '@/lib/prisma';
import { requireAuth, handleAuthError, AuthError } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { cleanBody, cleanSubject, isSupportTopic, newTicketNumber } from '@/lib/support/tickets';
import { serializeTicket } from '@/lib/support/serialize';
import { notifyCustomerReceived, notifySupportTeam } from '@/lib/support/emails';

export const dynamic = 'force-dynamic';

/** The signed-in customer's support requests, newest activity first. */
export async function GET() {
  try {
    const auth = await requireAuth();
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: auth.userId },
      orderBy: { lastMessageAt: 'desc' },
      take: 50,
      include: { order: { select: { orderNumber: true } }, _count: { select: { messages: true } } },
    });
    return apiSuccess({ tickets: tickets.map((t) => serializeTicket(t, 'customer')) });
  } catch (err) {
    if (err instanceof AuthError) return handleAuthError(err);
    return handleApiError(err);
  }
}

/** Opens a new support request. Body: { topic, subject, message, orderNumber? } */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth();

    const rate = checkRateLimit(`support-create:${auth.userId}`, 5, 3600);
    if (!rate.allowed) {
      return rateLimitResponse(
        rate.resetInSeconds,
        'You have opened several requests in the last hour. Please add details to an existing request instead.'
      );
    }

    const body = await request.json().catch(() => ({}));
    if (!isSupportTopic(body.topic)) return apiError('Please choose what your request is about.', 400);
    const subject = cleanSubject(body.subject);
    if (!subject.ok) return apiError(subject.error, 400);
    const message = cleanBody(body.message);
    if (!message.ok) return apiError(message.error, 400);

    let orderId: string | null = null;
    let orderNumber: string | null = null;
    if (body.orderNumber) {
      const order = await prisma.order.findFirst({
        where: { orderNumber: String(body.orderNumber), userId: auth.userId },
        select: { id: true, orderNumber: true },
      });
      if (!order) return apiError('That order was not found in your account.', 400);
      orderId = order.id;
      orderNumber = order.orderNumber;
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber: newTicketNumber(),
        userId: auth.userId,
        orderId,
        topic: body.topic,
        subject: subject.value,
        messages: {
          create: { authorId: auth.userId, authorName: auth.dbUser.name, fromStaff: false, body: message.value },
        },
      },
      include: { order: { select: { orderNumber: true } }, messages: { orderBy: { createdAt: 'asc' } } },
    });

    const info = { ticketNumber: ticket.ticketNumber, subject: ticket.subject, topic: ticket.topic, orderNumber };
    const customer = { name: auth.dbUser.name, email: auth.email };
    await Promise.allSettled([
      notifySupportTeam(info, customer, message.value, 'new'),
      notifyCustomerReceived(info, customer),
    ]);

    return apiSuccess({ ticket: serializeTicket(ticket, 'customer') }, undefined, 201);
  } catch (err) {
    if (err instanceof AuthError) return handleAuthError(err);
    return handleApiError(err);
  }
}
