import { NextResponse } from 'next/server';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { OrderStatus, OrderItemStatus, PaymentStatus, ShipmentStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const admin = await requireAdmin();

    const orderId = params.id;
    if (!orderId) {
      return apiError('Order ID is required', 400, null, 'MISSING_ORDER_ID');
    }

    const body = await request.json();
    const { status, courierPartner, trackingNumber } = body;

    if (!status && courierPartner === undefined && trackingNumber === undefined) {
      return apiError('At least one field (status, courierPartner, trackingNumber) must be provided', 400, null, 'EMPTY_UPDATE');
    }

    if (status && !Object.values(OrderStatus).includes(status)) {
      return apiError(
        `Invalid status '${status}'. Supported statuses: ${Object.values(OrderStatus).join(', ')}`,
        400,
        null,
        'INVALID_STATUS'
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });

    if (!order) {
      return apiError('Order not found', 404, null, 'ORDER_NOT_FOUND');
    }

    if (order.status === OrderStatus.DELIVERED && status && status !== OrderStatus.DELIVERED) {
      return apiError(
        'This order has already been DELIVERED to the customer and its delivery status cannot be reverted or changed.',
        400,
        null,
        'ORDER_ALREADY_DELIVERED'
      );
    }

    if (order.status === OrderStatus.CANCELLED && status && status !== OrderStatus.CANCELLED) {
      return apiError(
        'This order has already been CANCELLED and cannot be reactivated.',
        400,
        null,
        'ORDER_ALREADY_CANCELLED'
      );
    }

    // Atomic update within transaction
    // Enforces canonical lock order L2 (Order) -> L3 (OrderItem) to prevent deadlocks
    const updated = await prisma.$transaction(async (tx) => {
      const orderUpdateData: any = {};

      if (courierPartner !== undefined) {
        orderUpdateData.courierPartner = courierPartner ? String(courierPartner).trim() : null;
      }
      if (trackingNumber !== undefined) {
        orderUpdateData.trackingNumber = trackingNumber ? String(trackingNumber).trim() : null;
      }

      if (status) {
        orderUpdateData.status = status;
      }

      // Step 1: Update/Lock Order first (L2 in canonical lock hierarchy)
      await tx.order.update({
        where: { id: order.id },
        data: orderUpdateData,
      });

      // Step 2: Update OrderItems second (L3 in canonical lock hierarchy)
      if (status === OrderStatus.DELIVERED) {
        // If advancing to DELIVERED, advance all active non-cancelled items to DELIVERED
        // Phase 10.1: COD paymentStatus does NOT automatically become PAID.
        // It remains PENDING until explicit courier remittance confirmation via POST /api/admin/orders/[id]/remittance
        await tx.orderItem.updateMany({
          where: {
            orderId: order.id,
            status: { notIn: [OrderItemStatus.CANCELLED, OrderItemStatus.RETURNED] },
          },
          data: {
            status: OrderItemStatus.DELIVERED,
            deliveredAt: new Date(),
          },
        });
      } else if (status === OrderStatus.SHIPPED) {
        // If advancing to SHIPPED, ensure items that were PENDING/PROCESSING advance to SHIPPED
        await tx.orderItem.updateMany({
          where: {
            orderId: order.id,
            status: { in: [OrderItemStatus.PENDING, OrderItemStatus.PROCESSING] },
          },
          data: {
            status: OrderItemStatus.SHIPPED,
          },
        });
      }

      // Step 3: Synchronize VendorShipment records for this order
      const shipmentData: any = {};
      if (courierPartner !== undefined) shipmentData.courierPartner = courierPartner ? String(courierPartner).trim() : null;
      if (trackingNumber !== undefined) shipmentData.trackingNumber = trackingNumber ? String(trackingNumber).trim() : null;

      if (status === OrderStatus.SHIPPED) {
        shipmentData.status = ShipmentStatus.IN_TRANSIT;
        shipmentData.dispatchedAt = new Date();
      } else if (status === OrderStatus.OUT_FOR_DELIVERY) {
        shipmentData.status = ShipmentStatus.OUT_FOR_DELIVERY;
      } else if (status === OrderStatus.DELIVERED) {
        shipmentData.status = ShipmentStatus.DELIVERED;
        shipmentData.deliveredAt = new Date();
      } else if (status === OrderStatus.CANCELLED) {
        shipmentData.status = ShipmentStatus.CANCELLED;
      }

      if (Object.keys(shipmentData).length > 0) {
        await tx.vendorShipment.updateMany({
          where: { orderId: order.id },
          data: shipmentData,
        });
      }

      // Return fully hydrated order with items and shipping address
      return tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: {
          items: true,
          shippingAddress: true,
        },
      });
    });

    return apiSuccess({
      order: updated,
      updatedBy: {
        adminId: admin.userId,
        role: admin.role,
      },
    });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    return handleApiError(err);
  }
}
