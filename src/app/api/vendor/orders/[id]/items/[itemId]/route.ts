import { NextResponse } from 'next/server';
import { requireVendor, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { OrderItemStatus, OrderStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    id: string; // orderId or orderNumber
    itemId: string; // orderItemId
  };
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    // 1. Identify vendor strictly from the authenticated server session
    const auth = await requireVendor();
    const vendorProfileId = auth.vendorProfileId;
    const { id: orderParam, itemId } = context.params;

    const body = await request.json().catch(() => ({}));
    const targetStatus = body.status?.toUpperCase() as OrderItemStatus;

    if (!targetStatus || !Object.values(OrderItemStatus).includes(targetStatus)) {
      return apiError(
        `Invalid status. Permitted values: ${Object.values(OrderItemStatus).join(', ')}`,
        400,
        null,
        'INVALID_STATUS'
      );
    }

    // 2. Cross-Vendor Verification: Check if the item exists in this order under ANY vendor
    const existingItemAnyVendor = await prisma.orderItem.findFirst({
      where: {
        id: itemId,
        order: {
          OR: [{ id: orderParam }, { orderNumber: orderParam }],
        },
      },
      select: {
        id: true,
        vendorId: true,
      },
    });

    if (!existingItemAnyVendor) {
      return apiError(
        'Order item not found in this order.',
        404,
        null,
        'ITEM_NOT_FOUND'
      );
    }

    if (existingItemAnyVendor.vendorId !== vendorProfileId) {
      return apiError(
        'Access denied. You do not own this order item and cannot update its fulfillment status.',
        403,
        { requestedItemId: itemId, requestedOrder: orderParam },
        'FORBIDDEN_CROSS_VENDOR_ITEM_ACCESS'
      );
    }

    // 3. Query the OrderItem with full relations
    const item = await prisma.orderItem.findFirst({
      where: {
        id: itemId,
        vendorId: vendorProfileId,
        order: {
          OR: [{ id: orderParam }, { orderNumber: orderParam }],
        },
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            courierPartner: true,
            trackingNumber: true,
          },
        },
      },
    });

    if (!item) {
      return apiError(
        'Access denied. You are not authorized to update this item.',
        403,
        null,
        'FORBIDDEN_CROSS_VENDOR_ITEM_ACCESS'
      );
    }

    const currentStatus = item.status;

    // Idempotent check
    if (currentStatus === targetStatus) {
      return apiSuccess({
        itemId: item.id,
        orderId: item.order.id,
        orderNumber: item.order.orderNumber,
        status: currentStatus,
        message: `Item is already in ${currentStatus} status.`,
      });
    }

    // 3. Enforce Strict Server-Side Transition Business Rules
    // Rule A: Terminal statuses cannot be transitioned out of
    if (currentStatus === OrderItemStatus.CANCELLED) {
      return apiError(
        'Cannot update status of a cancelled order item.',
        400,
        null,
        'CANNOT_TRANSITION_CANCELLED'
      );
    }
    if (currentStatus === OrderItemStatus.DELIVERED) {
      return apiError(
        'Cannot update status of an item already marked delivered.',
        400,
        null,
        'CANNOT_TRANSITION_DELIVERED'
      );
    }

    // Rule B: Enforce "Prevent vendors from marking orders delivered without an authorized fulfillment process"
    if (targetStatus === OrderItemStatus.DELIVERED) {
      return apiError(
        'Vendors cannot mark items as delivered directly. Final delivery must be authenticated by the customer and logistics courier.',
        403,
        null,
        'DELIVERY_STATUS_UNAUTHORIZED'
      );
    }

    // Rule C: Validate sequential workflow
    // PENDING -> PROCESSING -> SHIPPED
    if (currentStatus === OrderItemStatus.PENDING) {
      if (targetStatus !== OrderItemStatus.PROCESSING) {
        return apiError(
          `Invalid transition from PENDING to ${targetStatus}. Items must first be moved to PROCESSING (Artisan Packaging).`,
          400,
          null,
          'INVALID_TRANSITION'
        );
      }
    } else if (currentStatus === OrderItemStatus.PROCESSING) {
      if (targetStatus !== OrderItemStatus.SHIPPED) {
        return apiError(
          `Invalid transition from PROCESSING to ${targetStatus}. Prepared items must be marked as SHIPPED.`,
          400,
          null,
          'INVALID_TRANSITION'
        );
      }
    } else if (currentStatus === OrderItemStatus.SHIPPED) {
      return apiError(
        'Item has already been dispatched to courier. No further vendor status changes permitted.',
        400,
        null,
        'ALREADY_SHIPPED'
      );
    }

    // Rule D: Shipment Details Verification for SHIPPED state
    let finalCourier: string | null = null;
    let finalTracking: string | null = null;

    if (targetStatus === OrderItemStatus.SHIPPED) {
      const rawCourier = (body.courierPartner || body.courierName || item.order.courierPartner)?.trim();
      const rawTracking = (body.trackingNumber || body.awbNumber || item.order.trackingNumber)?.trim();

      if (!rawCourier || !rawTracking) {
        return apiError(
          'Courier partner name and tracking/AWB number are required before marking an item as SHIPPED.',
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

      finalCourier = rawCourier;
      finalTracking = rawTracking;
    }

    // 4. Atomic Transaction: Update OrderItem, VendorShipment, and calculate aggregate Order.status
    const result = await prisma.$transaction(async (tx) => {
      // 4a. Update this vendor's OrderItem
      const updatedItem = await tx.orderItem.update({
        where: { id: item.id },
        data: {
          status: targetStatus,
          updatedAt: new Date(),
        },
      });

      // 4b. Update this vendor's dedicated VendorShipment (if exists)
      let updatedShipment: any = null;
      if (item.vendorShipmentId) {
        const shipmentUpdateData: any = { updatedAt: new Date() };

        if (targetStatus === OrderItemStatus.SHIPPED) {
          shipmentUpdateData.status = 'IN_TRANSIT';
          if (finalCourier) shipmentUpdateData.courierPartner = finalCourier;
          if (finalTracking) shipmentUpdateData.trackingNumber = finalTracking;
          shipmentUpdateData.dispatchedAt = new Date();
        } else if (targetStatus === OrderItemStatus.PROCESSING) {
          shipmentUpdateData.status = 'LABEL_CREATED';
        }

        updatedShipment = await tx.vendorShipment.update({
          where: { id: item.vendorShipmentId },
          data: shipmentUpdateData,
        });
      }

      // 4c. Fetch all items in the parent Order across all vendors
      const allOrderItems = await tx.orderItem.findMany({
        where: { orderId: item.order.id },
        select: { id: true, status: true, vendorId: true },
      });

      // 4d. Compute aggregate parent Order status safely
      const nonCancelledItems = allOrderItems.filter(
        (i) => i.status !== OrderItemStatus.CANCELLED
      );

      let nextOrderStatus = item.order.status;

      if (nonCancelledItems.length === 0) {
        // All items cancelled
        nextOrderStatus = OrderStatus.CANCELLED;
      } else if (nonCancelledItems.every((i) => i.status === OrderItemStatus.DELIVERED)) {
        // All non-cancelled items delivered
        nextOrderStatus = OrderStatus.DELIVERED;
      } else if (
        nonCancelledItems.some(
          (i) => i.status === OrderItemStatus.SHIPPED || i.status === OrderItemStatus.DELIVERED
        )
      ) {
        // Any non-cancelled item dispatched
        nextOrderStatus = OrderStatus.SHIPPED;
      } else if (nonCancelledItems.some((i) => i.status === OrderItemStatus.PROCESSING)) {
        // At least one item being processed
        nextOrderStatus = OrderStatus.PROCESSING;
      }

      const orderUpdateData: any = {};
      if (nextOrderStatus !== item.order.status) {
        orderUpdateData.status = nextOrderStatus;
      }

      // 4e. Multi-Vendor Tracking Safeguard: Never overwrite another vendor's tracking
      const distinctVendorCount = new Set(allOrderItems.map((i) => i.vendorId)).size;

      if (finalCourier && finalTracking) {
        if (distinctVendorCount <= 1) {
          // Single-vendor order: mirror directly on parent order for 100% backward compatibility
          orderUpdateData.courierPartner = finalCourier;
          orderUpdateData.trackingNumber = finalTracking;
        } else {
          // Multi-vendor order: don't overwrite if another vendor has already dispatched
          if (!item.order.courierPartner) {
            orderUpdateData.courierPartner = finalCourier;
            orderUpdateData.trackingNumber = finalTracking;
          } else if (item.order.courierPartner !== finalCourier) {
            orderUpdateData.courierPartner = 'Multiple Logistics Partners';
            orderUpdateData.trackingNumber = 'See Vendor Shipments';
          }
        }
      }

      if (Object.keys(orderUpdateData).length > 0) {
        orderUpdateData.updatedAt = new Date();
        await tx.order.update({
          where: { id: item.order.id },
          data: orderUpdateData,
        });
      }

      return {
        item: updatedItem,
        shipment: updatedShipment,
        parentOrderStatus: nextOrderStatus,
        courierPartner: finalCourier || item.order.courierPartner,
        trackingNumber: finalTracking || item.order.trackingNumber,
      };
    });

    return apiSuccess({
      itemId: result.item.id,
      itemStatus: result.item.status,
      orderId: item.order.id,
      orderNumber: item.order.orderNumber,
      parentOrderStatus: result.parentOrderStatus,
      courierPartner: result.courierPartner,
      trackingNumber: result.trackingNumber,
      message: `Item marked as ${result.item.status} successfully.${
        result.trackingNumber ? ` Tracking AWB: ${result.trackingNumber} (${result.courierPartner})` : ''
      }`,
    });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    console.error('[PATCH /api/vendor/orders/[id]/items/[itemId] error]:', err);
    return handleApiError(err);
  }
}
