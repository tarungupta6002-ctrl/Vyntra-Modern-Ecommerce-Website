import { NextResponse } from 'next/server';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { ApplicationStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/vendor-applications
 * Retrieves marketplace vendor applications with filtering, search, and pagination.
 * Strictly protected by requireAdmin().
 */
export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();

    const rateCheck = checkRateLimit(`admin-apps:${admin.userId}`, 60, 60);
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.resetInSeconds, 'Admin API rate limit reached. Please wait a moment.');
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status')?.toUpperCase();
    const search = searchParams.get('search')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '15', 10)));
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (statusParam && statusParam !== 'ALL') {
      if (Object.values(ApplicationStatus).includes(statusParam as ApplicationStatus)) {
        whereClause.status = statusParam as ApplicationStatus;
      }
    }

    if (search) {
      whereClause.OR = [
        { storeName: { contains: search, mode: 'insensitive' } },
        { businessEmail: { contains: search, mode: 'insensitive' } },
        { businessPhone: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [totalCount, pendingCount, applications] = await Promise.all([
      prisma.vendorApplication.count({ where: whereClause }),
      prisma.vendorApplication.count({ where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } } }),
      prisma.vendorApplication.findMany({
        where: whereClause,
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true, createdAt: true },
          },
          previousApplication: {
            select: { id: true, status: true, rejectionReason: true, createdAt: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    // Mask PAN and GST for privacy if present (expose last 4 digits only)
    const formatted = applications.map((app) => {
      const maskedPan = app.panNumber
        ? `••••••••${app.panNumber.slice(-2)}`
        : null;
      const maskedGst = app.gstNumber
        ? `${app.gstNumber.slice(0, 2)}•••••••••${app.gstNumber.slice(-3)}`
        : null;

      return {
        id: app.id,
        userId: app.userId,
        storeName: app.storeName,
        storeSlug: app.storeSlug,
        storeDescription: app.storeDescription,
        businessEmail: app.businessEmail,
        businessPhone: app.businessPhone,
        gstNumber: app.gstNumber || maskedGst,
        panNumber: app.panNumber || maskedPan,
        documents: app.documents,
        status: app.status,
        reviewedByAdminId: app.reviewedByAdminId,
        rejectionReason: app.rejectionReason,
        internalAdminNotes: app.internalAdminNotes,
        reviewedAt: app.reviewedAt,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        user: app.user,
        previousApplication: app.previousApplication,
        isResubmission: Boolean(app.previousApplicationId),
      };
    });

    const totalPages = Math.ceil(totalCount / limit) || 1;

    return apiSuccess({
      applications: formatted,
      pendingCount,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
    });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    return handleApiError(err);
  }
}
