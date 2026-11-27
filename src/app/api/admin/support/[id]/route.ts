import { prisma } from '@/lib/prisma';
import { requireAdmin, handleAuthError, AuthError } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response';
import { serializeTicket } from '@/lib/support/serialize';
import { cleanBody } from '@/lib/support/tickets';
import { notifyCustomerReply } from '@/lib/support/emails';
import { logAdminAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const include = {
  order: { select: { orderNumber: true } },
  user: { select: { name: true, email: true } },
  messages: { orderBy: { createdAt: 'asc' as const } },
};

function findTicket(id: string) {
  return prisma.supportTicket.findFirst({ where: { OR: [{ id }, { ticketNumber: id }] }, include });
}

/** A ticket with its conversation. `id` may be the ticket number. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const ticket = await findTicket(params.id);
    if (!ticket) return apiError('Ticket not found.', 404);
    return apiSuccess({ ticket: serializeTicket(ticket, 'staff') });
  } catch (err) {
    if (err instanceof AuthError) return handleAuthError(err);
    return handleApiError(err);
  }
}

/**
 * Staff action on a ticket. Body:
 *   { message, resolve?: boolean }  reply (and optionally mark resolved); the customer is emailed
 *   { status: 'RESOLVED' | 'OPEN' } change status without a reply
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const existing = await findTicket(params.id);
    if (!existing) return apiError('Ticket not found.', 404);

    const now = new Date();

    if (body.message !== undefined) {
      const message = cleanBody(body.message);
      if (!message.ok) return apiError(message.error, 400);
      const resolve = body.resolve === true;

      const ticket = await prisma.supportTicket.update({
        where: { id: existing.id },
        data: {
          status: resolve ? 'RESOLVED' : 'ANSWERED',
          resolvedAt: resolve ? now : null,
          lastMessageAt: now,
          messages: {
            create: { authorId: auth.userId, authorName: auth.dbUser.name || 'Vyntra Support', fromStaff: true, body: message.value, createdAt: now },
          },
        },
        include,
      });

      await notifyCustomerReply(
        { ticketNumber: ticket.ticketNumber, subject: ticket.subject, topic: ticket.topic, orderNumber: ticket.order?.orderNumber },
        { name: ticket.user.name, email: ticket.user.email },
        message.value,
        resolve
      );
      await logAdminAction({
        adminId: auth.userId,
        adminEmail: auth.email,
        action: resolve ? 'SUPPORT_REPLY_RESOLVE' : 'SUPPORT_REPLY',
        entity: 'SUPPORT',
        entityId: ticket.id,
        details: { ticketNumber: ticket.ticketNumber },
      }).catch(() => {});

      return apiSuccess({ ticket: serializeTicket(ticket, 'staff') });
    }

    if (body.status === 'RESOLVED' || body.status === 'OPEN') {
      const ticket = await prisma.supportTicket.update({
        where: { id: existing.id },
        data: { status: body.status, resolvedAt: body.status === 'RESOLVED' ? now : null },
        include,
      });
      await logAdminAction({
        adminId: auth.userId,
        adminEmail: auth.email,
        action: body.status === 'RESOLVED' ? 'SUPPORT_RESOLVE' : 'SUPPORT_REOPEN',
        entity: 'SUPPORT',
        entityId: ticket.id,
        details: { ticketNumber: ticket.ticketNumber },
      }).catch(() => {});
      return apiSuccess({ ticket: serializeTicket(ticket, 'staff') });
    }

    return apiError('Nothing to do: send a message or a status.', 400);
  } catch (err) {
    if (err instanceof AuthError) return handleAuthError(err);
    return handleApiError(err);
  }
}
