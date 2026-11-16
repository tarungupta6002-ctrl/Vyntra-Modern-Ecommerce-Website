import { NextRequest } from 'next/server';
import { requireAuth, handleAuthError, AuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/account/reviews
 * Fetch all product reviews submitted by the authenticated customer.
 */
export async function GET() {
  try {
    const auth = await requireAuth();

    const reviews = await prisma.review.findMany({
      where: {
        userId: auth.userId,
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            slug: true,
            brand: true,
            images: {
              take: 1,
              select: {
                url: true,
                altText: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return apiSuccess(reviews);
  } catch (error: any) {
    if (error instanceof AuthError || error.name === 'AuthError') {
      return handleAuthError(error);
    }
    return handleApiError(error);
  }
}
