import type { SupportMessage, SupportTicket } from '@prisma/client';
import { SUPPORT_STATUS_LABEL, SUPPORT_TOPICS } from './tickets';

type TicketRow = SupportTicket & {
  order?: { orderNumber: string } | null;
  messages?: SupportMessage[];
  user?: { name: string; email: string } | null;
  _count?: { messages: number };
};

/**
 * Shapes a ticket for the API. Customers see staff replies signed by
 * "Vyntra Customer Service", never the admin's own name.
 */
export function serializeTicket(t: TicketRow, viewer: 'customer' | 'staff') {
  return {
    id: t.id,
    ticketNumber: t.ticketNumber,
    topic: t.topic,
    topicLabel: SUPPORT_TOPICS[t.topic],
    subject: t.subject,
    status: t.status,
    statusLabel: SUPPORT_STATUS_LABEL[t.status],
    orderNumber: t.order?.orderNumber ?? null,
    createdAt: t.createdAt.toISOString(),
    lastMessageAt: t.lastMessageAt.toISOString(),
    resolvedAt: t.resolvedAt?.toISOString() ?? null,
    ...(viewer === 'staff' && t.user ? { customer: { name: t.user.name, email: t.user.email } } : {}),
    ...(t._count ? { messageCount: t._count.messages } : {}),
    ...(t.messages
      ? {
          messages: t.messages.map((m) => ({
            id: m.id,
            fromStaff: m.fromStaff,
            authorName: m.fromStaff && viewer === 'customer' ? 'Vyntra Customer Service' : m.authorName,
            body: m.body,
            createdAt: m.createdAt.toISOString(),
          })),
        }
      : {}),
  };
}
