import { prisma } from '@/lib/prisma';
import { ReviewStatus, Prisma } from '@prisma/client';

/**
 * Sanitizes input text to prevent XSS and strip unwanted HTML tags.
 */
export function sanitizeReviewText(input: string): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

/**
 * Validates rating and review comment fields.
 */
export function validateReviewInput(data: {
  rating?: unknown;
  comment?: unknown;
  title?: unknown;
}): { valid: boolean; error?: string; rating: number; comment: string; title: string | null } {
  const { rating, comment, title } = data;

  // 1. Rating validation: must be an integer between 1 and 5
  const numRating = Number(rating);
  if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
    return {
      valid: false,
      error: 'Rating must be an integer between 1 and 5.',
      rating: 0,
      comment: '',
      title: null,
    };
  }

  // 2. Comment validation: required, 10 to 1000 characters
  if (typeof comment !== 'string' || comment.trim().length === 0) {
    return {
      valid: false,
      error: 'Review comment is required.',
      rating: numRating,
      comment: '',
      title: null,
    };
  }

  const trimmedComment = comment.trim();
  if (trimmedComment.length < 10) {
    return {
      valid: false,
      error: 'Review comment must be at least 10 characters long.',
      rating: numRating,
      comment: '',
      title: null,
    };
  }

  if (trimmedComment.length > 1000) {
    return {
      valid: false,
      error: 'Review comment cannot exceed 1000 characters.',
      rating: numRating,
      comment: '',
      title: null,
    };
  }

  // 3. Title validation: optional, max 100 characters
  let cleanTitle: string | null = null;
  if (typeof title === 'string' && title.trim().length > 0) {
    const trimmedTitle = title.trim();
    if (trimmedTitle.length > 100) {
      return {
        valid: false,
        error: 'Review title cannot exceed 100 characters.',
        rating: numRating,
        comment: '',
        title: null,
      };
    }
    cleanTitle = sanitizeReviewText(trimmedTitle);
  }

  return {
    valid: true,
    rating: numRating,
    comment: sanitizeReviewText(trimmedComment),
    title: cleanTitle,
  };
}

/**
 * Recalculates Product.rating and Product.reviewCount based strictly on APPROVED reviews.
 * Safe for use in concurrent operations and Prisma transactions.
 */
export async function recalculateProductRating(
  productId: string,
  client: Prisma.TransactionClient | typeof prisma = prisma
): Promise<{ rating: number; reviewCount: number }> {
  const approvedReviews = await client.review.findMany({
    where: {
      productId,
      status: ReviewStatus.APPROVED,
    },
    select: {
      rating: true,
    },
  });

  const reviewCount = approvedReviews.length;
  const rating =
    reviewCount > 0
      ? Number((approvedReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount).toFixed(1))
      : 0;

  await client.product.update({
    where: { id: productId },
    data: {
      rating,
      reviewCount,
    },
  });

  return { rating, reviewCount };
}
