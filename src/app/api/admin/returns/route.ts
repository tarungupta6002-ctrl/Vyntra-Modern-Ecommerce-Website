import { NextResponse } from 'next/server';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { ReturnStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/returns
 * Administrative listing of all customer return/replacement requests across vendors.
 * Strictly restricted to ADMIN and SUPER_ADMIN roles.
 */
export async function GET(request: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status')?.toUpperCase();
    const typeParam = searchParams.get('type')?.toUpperCase();
    const search = searchParams.get('search')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (statusParam && statusParam !== 'ALL') {
      if (Object.values(ReturnStatus).includes(statusParam as ReturnStatus)) {
        where.status = statusParam as ReturnStatus;
      }
    }

    if (typeParam && (typeParam === 'RETURN_REFUND' || typeParam === 'REPLACEMENT')) {
      where.type = typeParam;
    }

    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { vendor: { storeName: { contains: search, mode: 'insensitive' } } },
        { reverseTrackingNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [totalCount, returnRequests] = await Promise.all([
      prisma.returnRequest.count({ where }),
      prisma.returnRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true },
          },
          vendor: {
            select: { id: true, storeName: true, storeSlug: true },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              paymentStatus: true,
              paymentMethod: true,
              subtotal: true,
              discount: true,
              totalAmount: true,
              refundedAmount: true,
              createdAt: true,
            },
          },
          orderItem: {
            select: {
              id: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true,
              commissionRate: true,
              commissionAmount: true,
              netEarnings: true,
              payoutStatus: true,
              vendorPayoutId: true,
              product: {
                select: { id: true, title: true, images: true },
              },
              variant: {
                select: { id: true, size: true, color: true },
              },
            },
          },
          refundTransactions: {
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              amount: true,
              vendorShare: true,
              platformShare: true,
              status: true,
              mode: true,
              gatewayReference: true,
              processedAt: true,
              createdAt: true,
            },
          },
        },
      }),
    ]);

    return apiSuccess({
      returnRequests,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
    });
  } catch (error) {
    const authResp = handleAuthError(error);
    if (authResp) return authResp;
    return handleApiError(error);
  }
}
