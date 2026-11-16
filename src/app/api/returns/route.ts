import { NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import {
  OrderStatus,
  OrderItemStatus,
  PaymentStatus,
  ReturnType,
  ReturnStatus,
  ReturnReason,
} from '@prisma/client';
import {
  isHierarchyNonReturnable,
  SELLER_FAULT_REASONS,
  PREFERENCE_REASONS,
  DEFAULT_RETURN_WINDOW_DAYS,
} from '@/lib/policy-constants';
import {
  computeIstReturnDeadline,
  isWithinDeadline,
  formatIstDateTime,
} from '@/lib/date-utils';

const VALID_REASONS = Object.values(ReturnReason);
const VALID_TYPES = Object.values(ReturnType);

/**
 * GET /api/returns
 * Lists return and replacement requests for the authenticated customer.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const skip = (page - 1) * limit;

    const [totalCount, returnRequests] = await Promise.all([
      prisma.returnRequest.count({
        where: { userId: auth.userId },
      }),
      prisma.returnRequest.findMany({
        where: { userId: auth.userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              paymentStatus: true,
              createdAt: true,
            },
          },
          orderItem: {
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                  brand: true,
                  images: { orderBy: { sortOrder: 'asc' }, take: 1 },
                },
              },
              variant: {
                select: {
                  sku: true,
                  size: true,
                  color: true,
                  imageUrl: true,
                },
              },
            },
          },
          vendor: {
            select: {
              id: true,
              storeName: true,
              storeSlug: true,
            },
          },
          refundTransactions: {
            select: {
              id: true,
              status: true,
              mode: true,
              amount: true,
              gatewayReference: true,
              processedAt: true,
              createdAt: true,
            },
          },
        },
      }),
    ]);

    return apiSuccess({
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      returns: returnRequests.map((r) => ({
        id: r.id,
        orderId: r.orderId,
        orderNumber: r.order.orderNumber,
        orderItemId: r.orderItemId,
        type: r.type,
        status: r.status,
        reason: r.reason,
        detailedReason: r.detailedReason,
        customerNotes: r.customerNotes,
        requestedQuantity: r.requestedQuantity,
        reverseTrackingNumber: r.reverseTrackingNumber,
        reverseCourierPartner: r.reverseCourierPartner,
        pickedUpAt: r.pickedUpAt,
        receivedAtWarehouseAt: r.receivedAtWarehouseAt,
        replacementCourierPartner: r.replacementCourierPartner,
        replacementTrackingNumber: r.replacementTrackingNumber,
        replacementDispatchedAt: r.replacementDispatchedAt,
        replacementDeliveredAt: r.replacementDeliveredAt,
        qcPassed: r.qcPassed,
        qcCompletedAt: r.qcCompletedAt,
        qcFailedReason: r.qcFailedReason,
        rejectedAt: r.rejectedAt,
        adminNotes: r.adminNotes,
        isDisputed: r.isDisputed,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        item: {
          title: r.orderItem.product?.title || 'Artisanal Piece',
          brand: r.orderItem.product?.brand || 'Vyntra Collective',
          size: r.orderItem.selectedSize || r.orderItem.variant?.size || 'N/A',
          color: r.orderItem.selectedColor || r.orderItem.variant?.color || 'N/A',
          unitPrice: Number(r.orderItem.unitPrice),
          totalPrice: Number(r.orderItem.totalPrice),
          image:
            r.orderItem.variant?.imageUrl ||
            r.orderItem.product?.images[0]?.url ||
            null,
        },
        vendor: {
          storeName: r.vendor.storeName,
          storeSlug: r.vendor.storeSlug,
        },
        refunds: r.refundTransactions.map((tx) => ({
          id: tx.id,
          status: tx.status,
          mode: tx.mode,
          amount: Number(tx.amount),
          gatewayReference: tx.gatewayReference,
          processedAt: tx.processedAt,
          createdAt: tx.createdAt,
        })),
      })),
    });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    return handleApiError(err);
  }
}

/**
 * POST /api/returns
 * Customer initiates a Return or Replacement request for an eligible delivered OrderItem.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth();

    const body = await request.json().catch(() => ({}));
    const {
      orderItemId,
      type = ReturnType.RETURN_REFUND,
      reason,
      detailedReason,
      customerNotes,
      requestedQuantity = 1,
    } = body;

    // 1. Mandatory Input Validation
    if (!orderItemId || typeof orderItemId !== 'string') {
      return apiError('Order item ID is required.', 400, null, 'INVALID_ORDER_ITEM_ID');
    }

    if (!type || !VALID_TYPES.includes(type as ReturnType)) {
      return apiError(
        `Invalid return type. Must be one of: ${VALID_TYPES.join(', ')}`,
        400,
        { validTypes: VALID_TYPES },
        'INVALID_RETURN_TYPE'
      );
    }

    if (!reason || !VALID_REASONS.includes(reason as ReturnReason)) {
      return apiError(
        `Invalid return reason. Must be one of: ${VALID_REASONS.join(', ')}`,
        400,
        { validReasons: VALID_REASONS },
        'INVALID_RETURN_REASON'
      );
    }

    const parsedQty = Number(requestedQuantity);
    if (!Number.isInteger(parsedQty) || parsedQty <= 0) {
      return apiError('Requested quantity must be a positive integer.', 400, null, 'INVALID_QUANTITY');
    }

    // 2. Fetch OrderItem and associated Order, Product, and ReturnRequest
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            userId: true,
            status: true,
            paymentStatus: true,
            paymentMethod: true,
            totalAmount: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        vendorShipment: {
          select: {
            id: true,
            deliveredAt: true,
          },
        },
        product: {
          select: {
            id: true,
            title: true,
            brand: true,
            isPublished: true,
            isCustomized: true,
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
                parent: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    parent: {
                      select: { id: true, name: true, slug: true },
                    },
                  },
                },
              },
            },
          },
        },
        variant: {
          select: {
            id: true,
            sku: true,
            size: true,
            color: true,
          },
        },
        returnRequest: {
          select: {
            id: true,
            type: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!orderItem) {
      return apiError('Order item not found.', 404, null, 'ORDER_ITEM_NOT_FOUND');
    }

    // 3. Ownership Authorization Guard (Rule 3)
    if (orderItem.order.userId !== auth.userId) {
      return apiError('You are not authorized to request a return for this order.', 403, null, 'FORBIDDEN');
    }

    // 4. One Request Per OrderItem Restriction (Rule 4)
    if (orderItem.returnRequest) {
      return apiError(
        `A ${orderItem.returnRequest.type.toLowerCase().replace('_', ' ')} request (ID: ${orderItem.returnRequest.id}) has already been submitted for this item.`,
        400,
        {
          existingRequestId: orderItem.returnRequest.id,
          existingStatus: orderItem.returnRequest.status,
          existingType: orderItem.returnRequest.type,
        },
        'RETURN_ALREADY_REQUESTED'
      );
    }

    // 5. Delivered Status Enforcement (Rule 4)
    if (orderItem.status !== OrderItemStatus.DELIVERED) {
      return apiError(
        `Only delivered items are eligible for return or replacement. Current item status is: ${orderItem.status}.`,
        400,
        { currentStatus: orderItem.status },
        'ITEM_NOT_DELIVERED'
      );
    }

    // 6. Payment Eligibility Enforcement
    // Prepaid orders must be marked PAID.
    // COD orders that are DELIVERED are eligible for return/replacement request submission
    // (Final cash refund disbursement is guarded in /api/admin/returns/[id]/refund which enforces COD remittance UTR).
    const isPaid = orderItem.order.paymentStatus === PaymentStatus.PAID;
    const isCodDelivered =
      orderItem.order.paymentMethod === 'COD' &&
      (orderItem.order.status === OrderStatus.DELIVERED || orderItem.status === OrderItemStatus.DELIVERED);

    if (!isPaid && !isCodDelivered) {
      return apiError(
        `Returns can only be requested for paid or delivered COD orders. Current payment status is: ${orderItem.order.paymentStatus}.`,
        400,
        { paymentStatus: orderItem.order.paymentStatus },
        'ORDER_PAYMENT_NOT_SETTLED'
      );
    }

    // 7. Verified Carrier Delivery Enforcement with Automatic Backfill
    let effectiveDeliveredAt = orderItem.deliveredAt;
    if (!effectiveDeliveredAt) {
      effectiveDeliveredAt =
        orderItem.vendorShipment?.deliveredAt ||
        orderItem.order.updatedAt ||
        orderItem.order.createdAt;

      // Persist deliveredAt on this orderItem so subsequent queries and audits have it
      await prisma.orderItem
        .update({
          where: { id: orderItem.id },
          data: { deliveredAt: effectiveDeliveredAt },
        })
        .catch(() => {});
    }

    // 8. 7-Calendar-Day Return Window Enforcement (IST Midnight Boundary)
    const setting = await prisma.platformSetting.findUnique({
      where: { key: 'return_window_days' },
    });
    const returnWindowDays = setting ? parseInt(setting.value, 10) || DEFAULT_RETURN_WINDOW_DAYS : DEFAULT_RETURN_WINDOW_DAYS;

    const istDeadline = computeIstReturnDeadline(effectiveDeliveredAt, returnWindowDays);
    const now = new Date();

    if (!isWithinDeadline(now, istDeadline)) {
      return apiError(
        `The ${returnWindowDays}-day return window for this delivered item expired on ${formatIstDateTime(istDeadline)}.`,
        400,
        {
          returnWindowDays,
          deliveredAt: effectiveDeliveredAt,
          expiredAt: istDeadline,
        },
        'RETURN_WINDOW_EXPIRED'
      );
    }

    // 9. Category & Customization Policy Invariants
    const isCustomized = Boolean(orderItem.isCustomizedSnapshot || orderItem.product.isCustomized);
    const isSellerFault = SELLER_FAULT_REASONS.has(reason);
    const isPreference = PREFERENCE_REASONS.has(reason);

    // Rule 9a: Customized / Made-to-order products (Bespoke)
    if (isCustomized && !isSellerFault) {
      return apiError(
        'Customized, monogrammed, or made-to-order products cannot be returned or exchanged for change of mind or fit.',
        400,
        { isCustomized: true, reason },
        'CUSTOMIZED_PRODUCT_NON_RETURNABLE'
      );
    }

    // Rule 9b: Non-Returnable Intimate / Personal Hygiene Categories
    const isRestrictedCategory = isHierarchyNonReturnable(orderItem.product.category);
    if (isRestrictedCategory && !isSellerFault) {
      return apiError(
        `Items in category "${orderItem.product.category?.name || 'Intimate / Hygiene'}" are strictly non-returnable for change of mind or personal preference.`,
        400,
        { categorySlug: orderItem.product.category?.slug, reason },
        'CATEGORY_NON_RETURNABLE'
      );
    }

    // Rule 9c: Exchange-Only for Change of Mind on standard eligible items
    if (isPreference && type === ReturnType.RETURN_REFUND) {
      return apiError(
        'Ordinary change of mind or size fit issue is eligible for exchange/replacement only. Cash refunds are reserved for verified seller/product faults.',
        400,
        { reason, allowedType: 'REPLACEMENT' },
        'EXCHANGE_ONLY_FOR_PREFERENCE'
      );
    }

    // 10. Quantity Validation (Rule 6)
    if (parsedQty > orderItem.quantity) {
      return apiError(
        `Requested quantity (${parsedQty}) exceeds ordered item quantity (${orderItem.quantity}).`,
        400,
        { orderedQuantity: orderItem.quantity, requestedQuantity: parsedQty },
        'QUANTITY_EXCEEDED'
      );
    }

    // 9. Atomic Creation: Never trust customer-supplied vendor ID (Rule 7)
    // Resolve vendorProfileId strictly from orderItem.vendorId!
    const returnRequest = await prisma.returnRequest.create({
      data: {
        orderId: orderItem.orderId,
        orderItemId: orderItem.id,
        vendorProfileId: orderItem.vendorId, // Server resolved!
        userId: auth.userId,
        type: type as ReturnType,
        status: ReturnStatus.REQUESTED,
        reason: reason as ReturnReason,
        detailedReason: detailedReason ? String(detailedReason).trim() : null,
        customerNotes: customerNotes ? String(customerNotes).trim() : null,
        requestedQuantity: parsedQty,
      },
      include: {
        vendor: {
          select: {
            storeName: true,
          },
        },
        orderItem: {
          include: {
            product: { select: { title: true, brand: true } },
            variant: { select: { sku: true, size: true, color: true } },
          },
        },
      },
    });

    return apiSuccess(
      {
        returnRequest: {
          id: returnRequest.id,
          orderId: returnRequest.orderId,
          orderItemId: returnRequest.orderItemId,
          type: returnRequest.type,
          status: returnRequest.status,
          reason: returnRequest.reason,
          detailedReason: returnRequest.detailedReason,
          requestedQuantity: returnRequest.requestedQuantity,
          createdAt: returnRequest.createdAt,
          vendorName: returnRequest.vendor.storeName,
          itemTitle: returnRequest.orderItem.product.title,
        },
        instructions: {
          message:
            type === ReturnType.REPLACEMENT
              ? 'Your replacement request has been submitted. The artisan will inspect and reserve replacement stock.'
              : 'Your return request has been submitted. Our concierge courier will arrange doorstep pickup upon vendor approval.',
          nextStep: 'Awaiting vendor review and approval.',
        },
      },
      undefined,
      201
    );
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    return handleApiError(err);
  }
}
