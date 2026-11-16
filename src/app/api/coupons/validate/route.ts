import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { OrderStatus } from '@prisma/client';
import { apiSuccess, apiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await getAuthenticatedUser();
    let previousOrdersCount = 0;
    if (auth?.userId) {
      previousOrdersCount = await prisma.order.count({
        where: {
          userId: auth.userId,
          status: { not: OrderStatus.CANCELLED },
        },
      });
    }

    return apiSuccess({
      isFirstOrder: previousOrdersCount === 0,
      previousOrdersCount,
      coupons: [
        {
          code: 'VYNTRAFIRST',
          title: 'Special First Order Discount',
          desc: 'Extra 10% instant discount on your first order above ₹1,499 (Max ₹1,000 off)',
          minOrderValue: 1499,
          isFirstOrderOnly: true,
          isUserEligible: previousOrdersCount === 0,
        },
      ],
    });
  } catch (err: any) {
    return apiError(err.message || 'Failed to fetch coupon status', 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cleanCoupon = (body.couponCode || '').trim().toUpperCase();
    const subtotal = Number(body.subtotal) || 0;

    if (!cleanCoupon) {
      return apiError('Coupon code is required', 400);
    }

    if (cleanCoupon !== 'VYNTRAFIRST') {
      return apiError('Invalid coupon code. Only "VYNTRAFIRST" is active.', 400, null, 'INVALID_COUPON');
    }

    if (subtotal < 1499) {
      return apiError(
        `Coupon VYNTRAFIRST requires a minimum order value of ₹1,499. Add ₹${1499 - subtotal} more.`,
        400,
        { minOrderValue: 1499, currentSubtotal: subtotal },
        'COUPON_MIN_VALUE_NOT_MET'
      );
    }

    const auth = await getAuthenticatedUser();
    let previousOrdersCount = 0;
    if (auth?.userId) {
      previousOrdersCount = await prisma.order.count({
        where: {
          userId: auth.userId,
          status: { not: OrderStatus.CANCELLED },
        },
      });

      if (previousOrdersCount > 0) {
        return apiError(
          'Coupon VYNTRAFIRST is only valid on your first order. You have already placed previous orders.',
          400,
          { previousOrdersCount },
          'COUPON_FIRST_ORDER_ONLY'
        );
      }
    }

    const discount = Math.min(Math.round(subtotal * 0.1), 1000);
    return apiSuccess({
      valid: true,
      couponCode: 'VYNTRAFIRST',
      discount,
      message: 'Coupon "VYNTRAFIRST" applied successfully! 10% Off.',
    });
  } catch (err: any) {
    return apiError(err.message || 'Failed to validate coupon', 500);
  }
}
