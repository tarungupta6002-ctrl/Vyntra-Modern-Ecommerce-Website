import { NextResponse } from 'next/server';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { VendorStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/vendors
 * Retrieves all registered VendorProfiles with filtering, search, and pagination.
 * Strictly protected by requireAdmin().
 */
export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();

    const rateCheck = checkRateLimit(`admin-vendors:${admin.userId}`, 60, 60);
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
      if (Object.values(VendorStatus).includes(statusParam as VendorStatus)) {
        whereClause.status = statusParam as VendorStatus;
      }
    } else if (!statusParam) {
      // Default to APPROVED if no filter provided
      whereClause.status = 'APPROVED';
    }

    if (search) {
      whereClause.OR = [
        { storeName: { contains: search, mode: 'insensitive' } },
        { storeSlug: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [totalCount, vendors] = await Promise.all([
      prisma.vendorProfile.count({ where: whereClause }),
      prisma.vendorProfile.findMany({
        where: whereClause,
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
          },
          _count: {
            select: { products: true, orderItems: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const formatted = vendors.map((v) => ({
      id: v.id,
      merchantId: v.payoutBeneficiaryId || `VYN-SELLER-${v.id.slice(-5).toUpperCase()}`,
      storeName: v.storeName,
      storeSlug: v.storeSlug,
      storeDescription: v.storeDescription,
      logoUrl: v.logoUrl,
      bannerUrl: v.bannerUrl,
      status: v.status,
      isVerified: v.isVerified,
      payoutsEnabled: v.payoutsEnabled,
      commissionRate: Number(v.commissionRate),
      rating: v.rating,
      totalSales: v.totalSales,
      gstNumber: v.gstNumber,
      panNumber: v.panNumber,
      bankName: v.bankName,
      bankAccountLast4: v.bankAccountLast4,
      ifscCode: v.ifscCode,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
      productsCount: v._count.products,
      ordersCount: v._count.orderItems,
      owner: {
        id: v.user?.id || v.userId,
        name: v.user?.name || 'Store Owner',
        email: v.user?.email || 'N/A',
        phone: v.user?.phone || 'N/A',
        role: v.user?.role || 'VENDOR',
      },
    }));

    return apiSuccess({
      vendors: formatted,
      pagination: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    return handleApiError(err);
  }
}
