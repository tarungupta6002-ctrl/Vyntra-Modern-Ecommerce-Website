import { prisma } from '@/lib/prisma';
import { requireAdmin, handleAuthError, AuthError } from '@/lib/auth';
import { apiSuccess, handleApiError } from '@/lib/api-response';
import { Prisma, SupportTicketStatus } from '@prisma/client';
import { serializeTicket } from '@/lib/support/serialize';

export const dynamic = 'force-dynamic';

/** Support queue. Query: status=OPEN|ANSWERED|RESOLVED|ALL (default OPEN), q=search text. */
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const status = (url.searchParams.get('status') || 'OPEN').toUpperCase();
    const q = (url.searchParams.get('q') || '').trim();

    const where: Prisma.SupportTicketWhereInput = {};
    if (status in SupportTicketStatus) where.status = status as SupportTicketStatus;
    if (q) {
      where.OR = [
        { ticketNumber: { contains: q, mode: 'insensitive' } },
        { subject: { contains: q, mode: 'insensitive' } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
        { order: { orderNumber: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [tickets, grouped] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        // Oldest waiting request first for the open queue; most recent activity first otherwise.
        orderBy: { lastMessageAt: status === 'OPEN' ? 'asc' : 'desc' },
        take: 100,
        include: {
          order: { select: { orderNumber: true } },
          user: { select: { name: true, email: true } },
          _count: { select: { messages: true } },
        },
      }),
      prisma.supportTicket.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    const counts = { OPEN: 0, ANSWERED: 0, RESOLVED: 0 } as Record<SupportTicketStatus, number>;
    for (const g of grouped) counts[g.status] = g._count._all;

    return apiSuccess({ tickets: tickets.map((t) => serializeTicket(t, 'staff')), counts });
  } catch (err) {
    if (err instanceof AuthError) return handleAuthError(err);
    return handleApiError(err);
  }
}
