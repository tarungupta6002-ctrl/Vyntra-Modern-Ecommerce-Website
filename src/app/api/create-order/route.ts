import { NextResponse } from 'next/server';
import { getRazorpayClient } from '@/lib/razorpay';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { calculateTrustedCheckoutAmount, CheckoutCalculationError } from '@/lib/checkout-calculator';

export const dynamic = 'force-dynamic';

/**
 * POST /api/create-order
 * Authoritatively creates a Razorpay Order based strictly on server-side cart & database pricing.
 * 
 * Never trusts client-supplied amounts.
 * Amount is calculated from:
 * - Active authenticated cart / validated product & variant database prices
 * - Applicable discounts & coupon rules
 * - Server-enforced packaging, shipping, and tax calculations
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    const userId = auth.userId;

    const body = await request.json().catch(() => ({}));
    const { clientItems, couponCode } = body;

    // Server-side financial calculation strictly against database
    const calculation = await calculateTrustedCheckoutAmount({
      userId,
      clientItems,
      couponCode,
      paymentMethod: 'UPI', // Online payment fee structure (no COD fee)
    });

    if (calculation.totalAmountPaise < 100) {
      return NextResponse.json(
        {
          success: false,
          error: 'Calculated order amount is less than the minimum required (₹1.00 / 100 paise).',
        },
        { status: 400 }
      );
    }

    const razorpay = getRazorpayClient();
    const receipt = `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const razorpayOrder = await razorpay.orders.create({
      amount: calculation.totalAmountPaise,
      currency: 'INR',
      receipt,
      notes: {
        userId,
        cartId: calculation.cartId || '',
        itemCount: String(calculation.validatedOrderItems.length),
        calculatedAmountPaise: String(calculation.totalAmountPaise),
        calculatedTotalRupees: String(calculation.totalAmount),
      },
    });

    return NextResponse.json({
      success: true,
      order_id: razorpayOrder.id,
      amount: razorpayOrder.amount, // Server-authoritative amount in paise
      currency: razorpayOrder.currency,
      receipt: razorpayOrder.receipt,
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
      itemCount: calculation.validatedOrderItems.length,
    });
  } catch (error: any) {
    if (error.name === 'AuthError') {
      return handleAuthError(error);
    }

    if (error instanceof CheckoutCalculationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
          details: error.details,
        },
        { status: error.statusCode }
      );
    }

    console.error('[Razorpay create-order error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to initialize Razorpay order with payment gateway.',
      },
      { status: 500 }
    );
  }
}
