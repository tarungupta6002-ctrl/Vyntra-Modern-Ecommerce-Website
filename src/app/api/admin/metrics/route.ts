import { NextResponse } from 'next/server';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, handleApiError } from '@/lib/api-response';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/metrics
 * Returns real database KPIs for Vyntra Marketplace administration.
 * Strictly protected by requireAdmin().
 */
export async function GET() {
  try {
    const admin = await requireAdmin();

    const rateCheck = checkRateLimit(`admin-metrics:${admin.userId}`, 60, 60);
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.resetInSeconds, 'Admin API rate limit reached. Please wait a moment.');
    }

    const [
      totalCustomers,
      totalVendors,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      totalProducts,
      publishedProducts,
      draftProducts,
      totalOrders,
      codOrdersCount,
      codOrdersSum,
      totalRevenueSum,
      recentApplications,
      verifiedVendors,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.vendorProfile.count({ where: { status: 'APPROVED' } }),
      prisma.vendorApplication.count({
        where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } },
      }),
      prisma.vendorApplication.count({ where: { status: 'APPROVED' } }),
      prisma.vendorApplication.count({ where: { status: 'REJECTED' } }),
      prisma.product.count(),
      prisma.product.count({ where: { isPublished: true } }),
      prisma.product.count({ where: { isPublished: false } }),
      prisma.order.count(),
      prisma.order.count({ where: { paymentMethod: 'COD' } }),
      prisma.order.aggregate({
        where: { paymentMethod: 'COD' },
        _sum: { totalAmount: true },
      }),
      prisma.order.aggregate({
        _sum: { totalAmount: true },
      }),
      prisma.vendorApplication.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.vendorProfile.findMany({
        where: { status: 'APPROVED' },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          _count: { select: { products: true, sellerOffers: true, orderItems: true } },
        },
      }),
    ]);

    const codTotalAmount = Number(codOrdersSum._sum.totalAmount || 0);
    const grossMarketplaceVolume = Number(totalRevenueSum._sum.totalAmount || 0);

    return apiSuccess({
      kpis: {
        totalCustomers,
        totalVendors,
        pendingApplications,
        approvedApplications,
        rejectedApplications,
        totalProducts,
        publishedProducts,
        draftProducts,
        totalOrders,
        codOrdersCount,
        codTotalAmount,
        grossMarketplaceVolume,
      },
      verifiedVendors: verifiedVendors.map((v) => ({
        id: v.id,
        merchantId: v.payoutBeneficiaryId || `VYN-SELLER-${v.id.slice(-5).toUpperCase()}`,
        storeName: v.storeName,
        storeSlug: v.storeSlug,
        status: v.status,
        isVerified: v.isVerified,
        commissionRate: Number(v.commissionRate),
        productsCount: v._count.products + v._count.sellerOffers,
        ordersCount: v._count.orderItems,
        createdAt: v.createdAt.toISOString(),
        ownerName: v.user?.name || 'Artisan Merchant',
        ownerEmail: v.user?.email || 'N/A',
        ownerPhone: v.user?.phone || 'N/A',
        gstNumber: v.gstNumber,
        panNumber: v.panNumber,
        bankName: v.bankName,
        bankAccountLast4: v.bankAccountLast4,
        ifscCode: v.ifscCode,
        payoutsEnabled: v.payoutsEnabled,
      })),
      recentApplications: recentApplications.map((app) => ({
        id: app.id,
        storeName: app.storeName,
        applicantName: app.user?.name || 'Applicant',
        applicantEmail: app.businessEmail || app.user?.email || 'N/A',
        status: app.status,
        submittedAt: app.createdAt,
      })),
      adminIdentity: {
        id: admin.userId,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    return handleApiError(err);
  }
}
