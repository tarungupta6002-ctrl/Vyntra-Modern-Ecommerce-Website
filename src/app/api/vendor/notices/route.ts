import { NextResponse } from 'next/server';
import { requireVendor, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/vendor/notices
 * Fetch active or historic notices issued to this vendor by Admin Central
 */
export async function GET(request: Request) {
  try {
    const auth = await requireVendor();
    const vendorId = auth.vendorProfileId;

    const logs = await prisma.adminAuditLog.findMany({
      where: {
        entity: 'VENDOR_NOTICE',
        entityId: vendorId,
        action: 'ISSUE_NOTICE',
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const notices = logs.map((log) => {
      const details = (log.details as any) || {};
      return {
        id: log.id,
        adminEmail: log.adminEmail,
        orderNumber: details.orderNumber || null,
        shipmentId: details.shipmentId || null,
        productId: details.productId || null,
        productTitle: details.productTitle || null,
        productSlug: details.productSlug || null,
        reason: details.reason || 'SLA_DISPATCH_BREACH',
        severity: details.severity || 'WARNING',
        title: details.title || 'Official Marketplace Notice',
        message: details.message || '',
        deadlineHours: details.deadlineHours || 24,
        status: details.status || 'OPEN',
        issuedAt: log.createdAt.toISOString(),
        acknowledgedAt: details.acknowledgedAt || null,
      };
    });

    const openCount = notices.filter((n) => n.status === 'OPEN').length;

    return apiSuccess({
      notices,
      openCount,
      totalCount: notices.length,
    });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    return handleApiError(err);
  }
}
