import { NextResponse } from 'next/server';
import { requireVendor, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { OrderItemStatus, OrderStatus, ShipmentStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    id: string; // shipmentId
  };
}

/**
 * PATCH /api/vendor/shipments/[id]
 * Independent Vendor Shipment Dispatch & Tracking API.
 * Dispatches an entire VendorShipment and updates all attached OrderItems atomically.
 * Strictly prevents one vendor from accessing or modifying another vendor's shipment.
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await requireVendor();
    const vendorProfileId = auth.vendorProfileId;
    const shipmentId = context.params.id;

    const body = await request.json().catch(() => ({}));
    const rawCourier = (body.courierPartner || body.courierName)?.trim();
    const rawTracking = (body.trackingNumber || body.awbNumber)?.trim();

    if (!rawCourier || !rawTracking) {
      return apiError(
        'Courier partner name and tracking AWB number are required to dispatch this shipment.',
        400,
        null,
        'SHIPMENT_DETAILS_REQUIRED'
      );
    }

    if (rawCourier.length < 2 || rawCourier.length > 60) {
      return apiError('Courier partner name must be between 2 and 60 characters.', 400, null, 'INVALID_COURIER_NAME');
    }

    if (rawTracking.length < 4 || rawTracking.length > 60) {
      return apiError('Tracking AWB number must be between 4 and 60 characters.', 400, null, 'INVALID_TRACKING_NUMBER');
    }

    // 1. Cross-Vendor Verification: Check existence across ANY vendor
    const existingShipmentAnyVendor = await prisma.vendorShipment.findUnique({
      where: { id: shipmentId },
      select: { id: true, vendorId: true, status: true, orderId: true },
    });

    if (!existingShipmentAnyVendor) {
      return apiError('Vendor shipment not found.', 404, null, 'SHIPMENT_NOT_FOUND');
    }

    // Strict Cross-Vendor Isolation Guard
    if (existingShipmentAnyVendor.vendorId !== vendorProfileId) {
      return apiError(
        'Access denied. You do not own this vendor shipment and cannot update its tracking.',
        403,
        { requestedShipmentId: shipmentId },
        'FORBIDDEN_CROSS_VENDOR_SHIPMENT_ACCESS'
      );
    }

    if (existingShipmentAnyVendor.status === ShipmentStatus.DELIVERED) {
      return apiError('Cannot modify tracking on an already delivered shipment.', 400, null, 'ALREADY_DELIVERED');
    }

    if (existingShipmentAnyVendor.status === ShipmentStatus.CANCELLED) {
      return apiError('Cannot dispatch a cancelled shipment.', 400, null, 'SHIPMENT_CANCELLED');
    }

    // 2. Atomic Transaction: Update VendorShipment, OrderItems, and Parent Order
    const result = await prisma.$transaction(async (tx) => {
      // 2a. Update the VendorShipment
      const updatedShipment = await tx.vendorShipment.update({
        where: { id: shipmentId },
        data: {
          status: ShipmentStatus.IN_TRANSIT,
          courierPartner: rawCourier,
          trackingNumber: rawTracking,
          dispatchedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // 2b. Update all OrderItems attached to this shipment
      await tx.orderItem.updateMany({
        where: {
          vendorShipmentId: shipmentId,
          status: { in: [OrderItemStatus.PENDING, OrderItemStatus.PROCESSING] },
        },
        data: {
          status: OrderItemStatus.SHIPPED,
          updatedAt: new Date(),
        },
      });

      // 2c. Fetch all items across all vendors in the parent Order
      const allOrderItems = await tx.orderItem.findMany({
        where: { orderId: existingShipmentAnyVendor.orderId },
        select: { id: true, status: true, vendorId: true },
      });

      const nonCancelledItems = allOrderItems.filter(
        (i) => i.status !== OrderItemStatus.CANCELLED
      );

      let nextOrderStatus: OrderStatus = OrderStatus.CONFIRMED;
      if (nonCancelledItems.length === 0) {
        nextOrderStatus = OrderStatus.CANCELLED;
      } else if (nonCancelledItems.every((i) => i.status === OrderItemStatus.DELIVERED)) {
        nextOrderStatus = OrderStatus.DELIVERED;
      } else if (
        nonCancelledItems.some(
          (i) => i.status === OrderItemStatus.SHIPPED || i.status === OrderItemStatus.DELIVERED
        )
      ) {
        nextOrderStatus = OrderStatus.SHIPPED;
      } else if (nonCancelledItems.some((i) => i.status === OrderItemStatus.PROCESSING)) {
        nextOrderStatus = OrderStatus.PROCESSING;
      }

      // 2d. Update Parent Order without overwriting other vendors' tracking
      const parentOrder = await tx.order.findUnique({
        where: { id: existingShipmentAnyVendor.orderId },
        select: { id: true, status: true, courierPartner: true, trackingNumber: true },
      });

      const distinctVendorCount = new Set(allOrderItems.map((i) => i.vendorId)).size;
      const orderUpdateData: any = {};

      if (parentOrder && nextOrderStatus !== parentOrder.status) {
        orderUpdateData.status = nextOrderStatus;
      }

      if (parentOrder) {
        if (distinctVendorCount <= 1) {
          orderUpdateData.courierPartner = rawCourier;
          orderUpdateData.trackingNumber = rawTracking;
        } else {
          if (!parentOrder.courierPartner) {
            orderUpdateData.courierPartner = rawCourier;
            orderUpdateData.trackingNumber = rawTracking;
          } else if (parentOrder.courierPartner !== rawCourier) {
            orderUpdateData.courierPartner = 'Multiple Logistics Partners';
            orderUpdateData.trackingNumber = 'See Vendor Shipments';
          }
        }
      }

      if (Object.keys(orderUpdateData).length > 0) {
        orderUpdateData.updatedAt = new Date();
        await tx.order.update({
          where: { id: existingShipmentAnyVendor.orderId },
          data: orderUpdateData,
        });
      }

      return {
        shipment: updatedShipment,
        parentOrderStatus: nextOrderStatus,
      };
    });

    return apiSuccess({
      shipmentId: result.shipment.id,
      shipmentNumber: result.shipment.shipmentNumber,
      status: result.shipment.status,
      courierPartner: result.shipment.courierPartner,
      trackingNumber: result.shipment.trackingNumber,
      parentOrderStatus: result.parentOrderStatus,
      message: `Shipment ${result.shipment.shipmentNumber} dispatched successfully via ${result.shipment.courierPartner} (AWB: ${result.shipment.trackingNumber}).`,
    });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    console.error('[PATCH /api/vendor/shipments/[id] error]:', err);
    return handleApiError(err);
  }
}
