import { NextRequest } from 'next/server';
import { requireAuth, handleAuthError, AuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { validateReviewInput, recalculateProductRating } from '@/lib/review-service';
import { ReviewStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * PATCH /api/account/reviews/[id]
 * Customer edits their existing review.
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth();
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

    // Ownership check: Customer can only edit their own reviews
    if (review.userId !== auth.userId) {
      return apiError('Forbidden: You can only edit your own reviews.', 403, null, 'FORBIDDEN_REVIEW_EDIT');
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return apiError('Invalid request payload.', 400, null, 'INVALID_PAYLOAD');
    }

    const validation = validateReviewInput(body);
    if (!validation.valid) {
      return apiError(validation.error || 'Validation failed.', 400, null, 'VALIDATION_ERROR');
    }

    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        rating: validation.rating,
        title: validation.title,
        comment: validation.comment,
        status: ReviewStatus.PENDING, // Edited reviews re-enter the moderation queue
      },
    });

    // Recalculate Product rating aggregates
    await recalculateProductRating(review.productId);

    return apiSuccess(
      updatedReview,
      {
        message: 'Review updated successfully and submitted for moderation re-approval.',
      }
    );
  } catch (error: any) {
    if (error instanceof AuthError || error.name === 'AuthError') {
      return handleAuthError(error);
    }
    return handleApiError(error);
  }
}

/**
 * DELETE /api/account/reviews/[id]
 * Customer deletes their review.
 */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth();
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

    // Ownership check: Customer can only delete their own reviews
    if (review.userId !== auth.userId) {
      return apiError('Forbidden: You can only delete your own reviews.', 403, null, 'FORBIDDEN_REVIEW_DELETE');
    }

    await prisma.review.delete({
      where: { id: reviewId },
    });

    // Recalculate Product rating aggregates
    await recalculateProductRating(review.productId);

    return apiSuccess(
      { id: reviewId },
      { message: 'Review deleted successfully.' }
    );
  } catch (error: any) {
    if (error instanceof AuthError || error.name === 'AuthError') {
      return handleAuthError(error);
    }
    return handleApiError(error);
  }
}
