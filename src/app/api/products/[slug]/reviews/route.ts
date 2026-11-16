import { NextRequest } from 'next/server';
import { requireAuth, handleAuthError, AuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { validateReviewInput } from '@/lib/review-service';
import { OrderItemStatus, OrderStatus, ReviewStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    slug: string;
  };
}

/**
 * POST /api/products/[slug]/reviews
 * Submit a customer product review for a verified delivered purchase.
 * Parameter can be either product slug or product ID.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth();
    const productIdOrSlug = params.slug;

    if (!productIdOrSlug) {
      return apiError('Product identifier is required.', 400, null, 'INVALID_PRODUCT_ID');
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return apiError('Invalid request payload.', 400, null, 'INVALID_PAYLOAD');
    }

    const { orderItemId } = body;
    if (!orderItemId || typeof orderItemId !== 'string') {
      return apiError('Valid orderItemId is required to verify purchase.', 400, null, 'MISSING_ORDER_ITEM');
    }

    // 1. Input Validation (Rating, Comment, Title)
    const validation = validateReviewInput(body);
    if (!validation.valid) {
      return apiError(validation.error || 'Validation failed.', 400, null, 'VALIDATION_ERROR');
    }

    // 2. Product Lookup (Supports both ID and Slug)
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id: productIdOrSlug }, { slug: productIdOrSlug }],
      },
      select: { id: true, title: true },
    });

    if (!product) {
      return apiError('Product not found.', 404, null, 'PRODUCT_NOT_FOUND');
    }

    // 3. OrderItem Lookup & Ownership Verification
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: {
          select: {
            id: true,
            userId: true,
            status: true,
          },
        },
        review: {
          select: { id: true },
        },
      },
    });

    if (!orderItem) {
      return apiError('Order item not found.', 404, null, 'ORDER_ITEM_NOT_FOUND');
    }

    // Guard: OrderItem must match the target product
    if (orderItem.productId !== product.id) {
      return apiError(
        'The specified order item does not correspond to this product.',
        400,
        null,
        'ITEM_PRODUCT_MISMATCH'
      );
    }

    // Guard: OrderItem must belong strictly to the authenticated customer
    if (orderItem.order.userId !== auth.userId) {
      return apiError(
        'Unauthorized: You can only review items purchased through your own account.',
        403,
        null,
        'FORBIDDEN_PURCHASE_MISMATCH'
      );
    }

    // Guard: OrderItem must be in DELIVERED status (or parent Order DELIVERED)
    const isDelivered =
      orderItem.status === OrderItemStatus.DELIVERED ||
      orderItem.order.status === OrderStatus.DELIVERED;

    if (!isDelivered) {
      return apiError(
        'Review submission rejected: Product must be delivered before submitting a review.',
        400,
        null,
        'ITEM_NOT_DELIVERED'
      );
    }

    // Guard: Duplicate Review Protection (per OrderItem)
    if (orderItem.review) {
      return apiError(
        'Duplicate review: You have already submitted a review for this purchase item.',
        409,
        null,
        'DUPLICATE_REVIEW'
      );
    }

    // Double check database constraint duplicate protection
    const existingReview = await prisma.review.findUnique({
      where: { orderItemId: orderItem.id },
    });
    if (existingReview) {
      return apiError(
        'Duplicate review: You have already submitted a review for this purchase item.',
        409,
        null,
        'DUPLICATE_REVIEW'
      );
    }

    // 4. Create Review with PENDING moderation status
    const review = await prisma.review.create({
      data: {
        productId: product.id,
        userId: auth.userId,
        orderItemId: orderItem.id,
        rating: validation.rating,
        title: validation.title,
        comment: validation.comment,
        isVerified: true,
        status: ReviewStatus.PENDING,
      },
      select: {
        id: true,
        productId: true,
        rating: true,
        title: true,
        comment: true,
        isVerified: true,
        status: true,
        createdAt: true,
      },
    });

    return apiSuccess(
      review,
      {
        message: 'Your review has been submitted successfully and is awaiting moderation approval.',
      },
      201
    );
  } catch (error: any) {
    if (error instanceof AuthError || error.name === 'AuthError') {
      return handleAuthError(error);
    }
    return handleApiError(error);
  }
}
