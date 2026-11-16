import { NextResponse } from 'next/server';
import { verifyRazorpaySignature } from '@/lib/razorpay';
import { prisma } from '@/lib/prisma';
import { PaymentStatus, OrderStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * POST /api/verify-payment
 * Cryptographically verifies the Razorpay HMAC SHA256 payment signature.
 * 
 * Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
 * 
 * Request payload:
 * {
 *   razorpay_order_id: string,
 *   razorpay_payment_id: string,
 *   razorpay_signature: string,
 *   orderId?: string // Optional internal Vyntra Order ID to mark as PAID
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required payment verification parameters (razorpay_order_id, razorpay_payment_id, razorpay_signature).',
        },
        { status: 400 }
      );
    }

    // Verify HMAC-SHA256 signature
    const isValid = verifyRazorpaySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      console.warn('[Razorpay Verification Failed]: Signature mismatch for order', razorpay_order_id);
      return NextResponse.json(
        {
          success: false,
          error: 'Payment verification failed: Digital signature mismatch. Transaction may be compromised.',
        },
        { status: 400 }
      );
    }

    // If an internal Vyntra orderId was supplied, update its status in Prisma idempotently
    let updatedOrder = null;
    if (orderId) {
      try {
        const existing = await prisma.order.findUnique({ where: { id: orderId } });
        if (existing && existing.paymentStatus === PaymentStatus.PAID) {
          return NextResponse.json({
            success: true,
            message: 'Payment verified and order already marked as PAID.',
            payment_id: razorpay_payment_id,
            order_id: razorpay_order_id,
            isPaid: true,
            order: { id: existing.id, status: existing.status, paymentStatus: existing.paymentStatus },
          });
        }

        updatedOrder = await prisma.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: PaymentStatus.PAID,
            status: OrderStatus.CONFIRMED,
            remittanceReference: razorpay_payment_id,
          },
        });
      } catch (dbErr) {
        console.warn('[Prisma Order update note]: Order ID was not found or already completed', orderId);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully and signature authenticated.',
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      isPaid: true,
      order: updatedOrder ? { id: updatedOrder.id, status: updatedOrder.status, paymentStatus: updatedOrder.paymentStatus } : undefined,
    });
  } catch (error: any) {
    console.error('[Razorpay verify-payment error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error while verifying payment signature.',
      },
      { status: 500 }
    );
  }
}
