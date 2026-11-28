import { applyReturnRefundWebhook } from '@/lib/payments/return-refund';
import { NextResponse } from 'next/server';
import { verifyRazorpayWebhookSignature } from '@/lib/razorpay';
import { prisma } from '@/lib/prisma';
import { PaymentStatus, OrderStatus } from '@prisma/client';
import { applyRefundWebhook } from '@/lib/payments/cancellation-refund';

export const dynamic = 'force-dynamic';

// ==============================================================================
// VYNTRA RAZORPAY WEBHOOK HANDLER (Database-Backed Idempotency & Replay Protection)
// Endpoints: POST /api/payment/razorpay/webhook
// - Validates raw body HMAC-SHA256 signature against RAZORPAY_WEBHOOK_SECRET
// - Database-backed event idempotency via PaymentWebhookEvent table
// - Handles frontend-callback vs webhook race conditions
// - Safely reconciles unmatched events without fabricating arbitrary orders
// ==============================================================================

export async function POST(request: Request) {
  try {
    // 1. Extract raw body text and signature header
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      console.warn('[Razorpay Webhook Warning]: Request missing x-razorpay-signature header');
      return NextResponse.json(
        { success: false, error: 'Missing x-razorpay-signature header' },
        { status: 400 }
      );
    }

    // 2. Cryptographic signature verification against RAZORPAY_WEBHOOK_SECRET
    const isValidSignature = verifyRazorpayWebhookSignature({
      rawBody,
      signature,
    });

    if (!isValidSignature) {
      console.warn('[Razorpay Webhook Warning]: Invalid webhook signature. Request rejected.');
      return NextResponse.json(
        { success: false, error: 'Invalid webhook signature' },
        { status: 400 }
      );
    }

    // 3. Parse validated JSON payload
    let eventPayload: any = null;
    try {
      eventPayload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    const eventId =
      eventPayload.id ||
      request.headers.get('x-razorpay-event-id') ||
      `evt_${Date.now()}`;
    const eventType = eventPayload.event;

    // 4. Database-level Event ID Uniqueness & Duplicate Webhook Protection
    const existingDbEvent = await prisma.paymentWebhookEvent.findUnique({
      where: { eventId },
    });

    if (existingDbEvent) {
      console.log(`[Razorpay Webhook]: Duplicate event ID ${eventId} safely ignored (DB idempotency verified).`);
      return NextResponse.json(
        { success: true, message: 'Duplicate webhook event safely suppressed (Database Idempotent)' },
        { status: 200 }
      );
    }

    // 5. Handle supported events
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = eventPayload.payload?.payment?.entity;
      const orderEntity = eventPayload.payload?.order?.entity;

      const paymentId = paymentEntity?.id;
      const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;
      const amountPaise = paymentEntity?.amount || orderEntity?.amount;

      if (!paymentId) {
        console.warn('[Razorpay Webhook Warning]: Event missing payment ID entity.');
        // Still record event in database for audit trail
        await prisma.paymentWebhookEvent.create({
          data: {
            eventId,
            eventType,
            status: 'FAILED',
            payload: eventPayload,
          },
        }).catch(() => {});

        return NextResponse.json({ success: true, message: 'Event ignored: Missing payment ID' }, { status: 200 });
      }

      // Check if an order with this payment ID already exists in Vyntra database
      const existingOrderByPayment = await prisma.order.findFirst({
        where: {
          OR: [
            { razorpayPaymentId: paymentId },
            { remittanceReference: paymentId },
          ],
        },
      });

      // Race condition resolution: Frontend callback already processed this payment
      if (existingOrderByPayment) {
        // Record event in DB ledger
        await prisma.paymentWebhookEvent.create({
          data: {
            eventId,
            eventType,
            paymentId,
            orderId: existingOrderByPayment.id,
            status: 'PROCESSED',
            payload: eventPayload,
          },
        }).catch(() => {});

        if (existingOrderByPayment.paymentStatus === PaymentStatus.PAID) {
          console.log(`[Razorpay Webhook]: Order ${existingOrderByPayment.orderNumber} already marked as PAID by frontend callback.`);
          return NextResponse.json(
            { success: true, message: 'Order already fulfilled and verified by checkout handler' },
            { status: 200 }
          );
        }

        // If order was created but paymentStatus was pending, confirm it now atomically
        await prisma.order.update({
          where: { id: existingOrderByPayment.id },
          data: {
            paymentStatus: PaymentStatus.PAID,
            status: OrderStatus.CONFIRMED,
            razorpayPaymentId: paymentId,
          },
        });
        console.log(`[Razorpay Webhook]: Updated Order ${existingOrderByPayment.orderNumber} to PAID status.`);
        return NextResponse.json({ success: true, message: 'Order payment status updated to PAID' }, { status: 200 });
      }

      // Check if any order has matching Razorpay order ID
      let matchedOrder = null;
      if (razorpayOrderId) {
        matchedOrder = await prisma.order.findFirst({
          where: {
            OR: [
              { razorpayOrderId },
              { remittanceReference: razorpayOrderId },
              { trackingNumber: razorpayOrderId },
            ],
          },
        });
      }

      if (matchedOrder) {
        // Transactional update: Record webhook event and update order atomically
        await prisma.$transaction(async (tx) => {
          await tx.paymentWebhookEvent.create({
            data: {
              eventId,
              eventType,
              paymentId,
              orderId: matchedOrder.id,
              status: 'PROCESSED',
              payload: eventPayload,
            },
          });

          await tx.order.update({
            where: { id: matchedOrder.id },
            data: {
              paymentStatus: PaymentStatus.PAID,
              status: OrderStatus.CONFIRMED,
              remittanceReference: paymentId,
              razorpayPaymentId: paymentId,
            },
          });
        });

        console.log(`[Razorpay Webhook]: Reconciled Order ${matchedOrder.orderNumber} with payment ID ${paymentId}`);
        return NextResponse.json({ success: true, message: 'Order reconciled and verified successfully' }, { status: 200 });
      }

      // Safety rule: Never fabricate arbitrary orders from unknown webhook payloads
      // Log in database webhook ledger for merchant reconciliation audit
      await prisma.paymentWebhookEvent.create({
        data: {
          eventId,
          eventType,
          paymentId,
          status: 'UNMATCHED_RECONCILED',
          payload: eventPayload,
        },
      }).catch(() => {});

      console.log(
        `[Razorpay Webhook Unmatched Reconcile]: Payment ${paymentId} (${amountPaise} paise) captured for Gateway Order ${razorpayOrderId || 'N/A'}. No matching Vyntra order in database yet. Logged for merchant audit.`
      );

      return NextResponse.json(
        {
          success: true,
          message: 'Webhook received. Payment noted for reconciliation in database ledger without fabricating unverified order.',
        },
        { status: 200 }
      );
    }

    if (eventType === 'payment.failed') {
      const paymentEntity = eventPayload.payload?.payment?.entity;
      await prisma.paymentWebhookEvent.create({
        data: {
          eventId,
          eventType,
          paymentId: paymentEntity?.id || null,
          status: 'PAYMENT_FAILED_LOGGED',
          payload: eventPayload,
        },
      }).catch(() => {});

      console.log(`[Razorpay Webhook]: Payment ${paymentEntity?.id} failed (${paymentEntity?.error_description || 'Declined by bank'}).`);
      return NextResponse.json({ success: true, message: 'Payment failure logged in database ledger' }, { status: 200 });
    }

    // Automatic cancellation and return refunds: Razorpay reports the final refund outcome here.
    // Apply first (idempotent), then record the event, so a failure is retried by Razorpay
    // instead of being swallowed as a "duplicate" on the next delivery.
    if (eventType === 'refund.processed' || eventType === 'refund.failed') {
      const refundEntity = eventPayload.payload?.refund?.entity;
      const matched =
        (await applyRefundWebhook(refundEntity, eventType)) ||
        (await applyReturnRefundWebhook(refundEntity, eventType));
      await prisma.paymentWebhookEvent.create({
        data: {
          eventId,
          eventType,
          paymentId: refundEntity?.payment_id || null,
          status: matched ? 'PROCESSED' : 'UNMATCHED_RECONCILED',
          payload: eventPayload,
        },
      }).catch(() => {});
      return NextResponse.json(
        { success: true, message: matched ? `Refund ${refundEntity?.id} updated` : 'Refund not linked to a cancellation or return; acknowledged' },
        { status: 200 }
      );
    }

    // Default acknowledgement for other unhandled events
    await prisma.paymentWebhookEvent.create({
      data: {
        eventId,
        eventType,
        status: 'ACKNOWLEDGED',
        payload: eventPayload,
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, message: `Event ${eventType} acknowledged` }, { status: 200 });
  } catch (error: any) {
    // Check if error is unique constraint violation (concurrent duplicate webhook event)
    if (error?.code === 'P2002') {
      console.log('[Razorpay Webhook]: Concurrent duplicate event caught by database unique constraint.');
      return NextResponse.json(
        { success: true, message: 'Concurrent duplicate event safely suppressed by database' },
        { status: 200 }
      );
    }

    console.error('[Razorpay Webhook Internal Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal webhook processing error' },
      { status: 500 }
    );
  }
}
