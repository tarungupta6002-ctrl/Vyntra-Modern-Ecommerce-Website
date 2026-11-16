import { NextResponse } from 'next/server';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/notices
 * Fetch all vendor compliance and SLA notices issued by admin
 */
export async function GET(request: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');

    const where: any = {
      entity: 'VENDOR_NOTICE',
      action: 'ISSUE_NOTICE',
    };

    if (vendorId) {
      where.entityId = vendorId;
    }

    const logs = await prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const notices = logs.map((log) => {
      const details = (log.details as any) || {};
      return {
        id: log.id,
        adminId: log.adminId,
        adminEmail: log.adminEmail,
        vendorId: log.entityId,
        storeName: details.storeName || 'Vendor',
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

    return apiSuccess({ notices, count: notices.length });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    return handleApiError(err);
  }
}

/**
 * POST /api/admin/notices
 * Admin issues an official SLA or compliance breach notice to a vendor
 */
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();

    const {
      vendorId,
      storeName,
      orderNumber,
      shipmentId,
      productId,
      productTitle,
      productSlug,
      reason = 'SLA_DISPATCH_BREACH',
      severity = 'WARNING',
      title,
      message,
      deadlineHours = 24,
    } = body;

    if (!vendorId) {
      return apiError('Vendor ID is required to issue a notice.', 400, 'BAD_REQUEST');
    }

    if (!message || message.trim().length === 0) {
      return apiError('Notice message / explanation is required.', 400, 'BAD_REQUEST');
    }

    // Verify vendor exists
    const vendor = await prisma.vendorProfile.findUnique({
      where: { id: vendorId },
      select: { id: true, storeName: true, user: { select: { email: true, name: true } } },
    });

    if (!vendor) {
      return apiError('Target vendor profile not found.', 404, 'NOT_FOUND');
    }

    const finalTitle =
      title ||
      (reason === 'SLA_DISPATCH_BREACH'
        ? `SLA Dispatch Breach Warning - ${orderNumber || 'Pending Order'}`
        : 'Official Marketplace Governance Notice');

    const noticeDetails = {
      vendorId: vendor.id,
      storeName: storeName || vendor.storeName,
      vendorEmail: vendor.user?.email,
      orderNumber: orderNumber || null,
      shipmentId: shipmentId || null,
      productId: productId || null,
      productTitle: productTitle || null,
      productSlug: productSlug || null,
      reason,
      severity,
      title: finalTitle,
      message: message.trim(),
      deadlineHours: Number(deadlineHours) || 24,
      status: 'OPEN',
      issuedAt: new Date().toISOString(),
      acknowledgedAt: null,
    };

    const auditEntry = await prisma.adminAuditLog.create({
      data: {
        adminId: admin.userId,
        adminEmail: admin.email,
        entity: 'VENDOR_NOTICE',
        entityId: vendor.id,
        action: 'ISSUE_NOTICE',
        details: noticeDetails as any,
      },
    });

    return apiSuccess({
      notice: {
        id: auditEntry.id,
        ...noticeDetails,
      },
    });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    return handleApiError(err);
  }
}
