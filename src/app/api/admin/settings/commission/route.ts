import { NextResponse } from 'next/server';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();

    const setting = await prisma.platformSetting.findUnique({
      where: { key: 'marketplace_commission_rate' },
    });

    const commissionRate = setting ? Number(setting.value) : 10.0;

    return apiSuccess({
      commissionRate,
      description: setting?.description || 'Global marketplace commission percentage applied to all vendors',
      taxPolicy: {
        status: 'PENDING_CONFIRMATION',
        label: 'Not configured / Pending CA confirmation',
        applicableGstRate: null,
      },
      updatedAt: setting?.updatedAt || null,
    });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const rawRate = body.rate !== undefined ? body.rate : body.commissionRate;

    const rate = Number(rawRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      return apiError(
        'Invalid commission rate. Must be a valid percentage between 0.00 and 100.00.',
        400,
        null,
        'INVALID_COMMISSION_RATE'
      );
    }

    const formattedRate = rate.toFixed(2);

    const updated = await prisma.platformSetting.upsert({
      where: { key: 'marketplace_commission_rate' },
      create: {
        key: 'marketplace_commission_rate',
        value: formattedRate,
        description: 'Global marketplace commission percentage applied to all vendors',
        updatedBy: auth.userId,
      },
      update: {
        value: formattedRate,
        updatedBy: auth.userId,
      },
    });

    return apiSuccess({
      message: `Marketplace commission rate set to ${formattedRate}%.`,
      commissionRate: Number(updated.value),
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    return handleApiError(error);
  }
}
