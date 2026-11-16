import { NextRequest } from 'next/server';
import { requireAdmin, handleAuthError, AuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { recalculateProductRating, sanitizeReviewText } from '@/lib/review-service';
import { ReviewStatus } from '@prisma/client';
import { invalidateProduct } from '@/lib/cache-invalidation';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * PATCH /api/admin/reviews/[id]
 * Moderate a review (APPROVE, REJECT, FLAG, PENDING) with moderation note.
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAdmin();
    const reviewId = params.id;

    if (!reviewId) {
      return apiError('Review ID is required.', 400, null, 'INVALID_REVIEW_ID');
    }

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return apiError('Review not found.', 404, null, 'REVIEW_NOT_FOUND');
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return apiError('Invalid request payload.', 400, null, 'INVALID_PAYLOAD');
    }

    const { status, moderationNote } = body;

    if (!status || !Object.values(ReviewStatus).includes(status)) {
      return apiError(
        `Invalid status. Allowed values: ${Object.values(ReviewStatus).join(', ')}`,
        400,
        null,
        'INVALID_STATUS'
      );
    }

    let sanitizedNote: string | null = review.moderationNote;
    if (moderationNote !== undefined) {
      sanitizedNote = typeof moderationNote === 'string' ? sanitizeReviewText(moderationNote) : null;
    }

    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        status: status as ReviewStatus,
        moderationNote: sanitizedNote,
        moderatedBy: auth.userId,
        moderatedAt: new Date(),
      },
    });

    // Recalculate aggregates for the product (only APPROVED reviews count)
    const aggregates = await recalculateProductRating(review.productId);
    invalidateProduct(review.productId);

    return apiSuccess(
      {
        ...updatedReview,
        productAggregates: aggregates,
      },
      {
        message: `Review moderation status updated to ${status}.`,
      }
    );
  } catch (error: any) {
    if (error instanceof AuthError || error.name === 'AuthError') {
      return handleAuthError(error);
    }
    return handleApiError(error);
  }
}
