import { prisma } from '@/lib/prisma';
import { requireAuth, handleAuthError, AuthError } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const select = { id: true, email: true, name: true, phone: true, createdAt: true } as const;

/** The signed-in user's own profile. */
export async function GET() {
  try {
    const auth = await requireAuth();
    const user = await prisma.user.findUnique({ where: { id: auth.userId }, select });
    return apiSuccess({ user });
  } catch (err) {
    if (err instanceof AuthError) return handleAuthError(err);
    return handleApiError(err);
  }
}

/** Updates name and/or phone. Body: { name?, phone? } (phone: 10-digit Indian mobile, or "" to remove). */
export async function PATCH(request: Request) {
  try {
    const auth = await requireAuth();
    const rate = checkRateLimit(`profile-update:${auth.userId}`, 20, 3600);
    if (!rate.allowed) return rateLimitResponse(rate.resetInSeconds, 'Too many changes. Please try again later.');

    const body = await request.json().catch(() => ({}));
    const data: { name?: string; phone?: string | null } = {};

    if (body.name !== undefined) {
      const name = String(body.name).replace(/\s+/g, ' ').trim();
      if (name.length < 2 || name.length > 80) return apiError('Name must be 2 to 80 characters.', 400);
      data.name = name;
    }

    if (body.phone !== undefined) {
      const digits = String(body.phone).replace(/[\s-]/g, '').replace(/^(\+91|0)/, '');
      if (digits === '') data.phone = null;
      else if (/^[6-9]\d{9}$/.test(digits)) data.phone = digits;
      else return apiError('Enter a 10-digit Indian mobile number.', 400);
    }

    if (Object.keys(data).length === 0) return apiError('Nothing to update.', 400);

    const user = await prisma.user.update({ where: { id: auth.userId }, data, select });
    return apiSuccess({ user });
  } catch (err) {
    if (err instanceof AuthError) return handleAuthError(err);
    return handleApiError(err);
  }
}
