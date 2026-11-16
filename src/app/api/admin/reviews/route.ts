import { NextRequest } from 'next/server';
import { requireAdmin, handleAuthError, AuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, handleApiError } from '@/lib/api-response';
import { ReviewStatus, Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/reviews
 * Admin review moderation queue with status filters, search, and counts.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status')?.toUpperCase() || 'ALL';
    const searchQuery = searchParams.get('search')?.trim() || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    // Build filter where clause
    const where: Prisma.ReviewWhereInput = {};

    if (statusParam !== 'ALL' && Object.values(ReviewStatus).includes(statusParam as ReviewStatus)) {
      where.status = statusParam as ReviewStatus;
    }

    if (searchQuery) {
      where.OR = [
        { product: { title: { contains: searchQuery, mode: 'insensitive' } } },
        { user: { name: { contains: searchQuery, mode: 'insensitive' } } },
        { user: { email: { contains: searchQuery, mode: 'insensitive' } } },
        { comment: { contains: searchQuery, mode: 'insensitive' } },
        { title: { contains: searchQuery, mode: 'insensitive' } },
      ];
    }

    // Parallel execution for stats counts and reviews page
    const [
      reviews,
      totalCount,
      pendingCount,
      approvedCount,
      rejectedCount,
      flaggedCount,
    ] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          product: {
            select: {
              id: true,
              title: true,
              slug: true,
              brand: true,
              images: {
                take: 1,
                select: { url: true, altText: true },
              },
            },
          },
          orderItem: {
            select: {
              id: true,
              orderId: true,
              unitPrice: true,
              selectedSize: true,
              selectedColor: true,
              deliveredAt: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.review.count({ where }),
      prisma.review.count({ where: { status: ReviewStatus.PENDING } }),
      prisma.review.count({ where: { status: ReviewStatus.APPROVED } }),
      prisma.review.count({ where: { status: ReviewStatus.REJECTED } }),
      prisma.review.count({ where: { status: ReviewStatus.FLAGGED } }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return apiSuccess(reviews, {
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
      counts: {
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        flagged: flaggedCount,
        total: pendingCount + approvedCount + rejectedCount + flaggedCount,
      },
    });
  } catch (error: any) {
    if (error instanceof AuthError || error.name === 'AuthError') {
      return handleAuthError(error);
    }
    return handleApiError(error);
  }
}
