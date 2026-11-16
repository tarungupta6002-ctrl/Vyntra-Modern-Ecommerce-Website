import { NextResponse } from 'next/server';
import { requireVendor, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    id: string; // orderId or orderNumber
  };
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = await requireVendor();
    const vendorProfileId = auth.vendorProfileId;
    const { id: orderParam } = context.params;

    // 1. Verify if the order exists in the database
    const existingOrder = await prisma.order.findFirst({
      where: {
        OR: [{ id: orderParam }, { orderNumber: orderParam }],
      },
      select: {
        id: true,
        orderNumber: true,
        items: {
          select: {
            id: true,
            vendorId: true,
          },
        },
      },
    });

    if (!existingOrder) {
      return apiError('Order not found.', 404, null, 'ORDER_NOT_FOUND');
    }

    // 2. Strict Cross-Vendor Authorization Check:
    // Does the authenticated vendor have at least one product in this consignment?
    const hasVendorItem = existingOrder.items.some((it) => it.vendorId === vendorProfileId);
    if (!hasVendorItem) {
      return apiError(
        'Access denied. You do not have seller authorization for this order.',
        403,
        { requestedOrder: orderParam },
        'FORBIDDEN_CROSS_VENDOR_ACCESS'
      );
    }

    // 3. Find order with STRICT vendor isolation on OrderItems
    const order = await prisma.order.findFirst({
      where: {
        id: existingOrder.id,
      },
      include: {
        shippingAddress: true,
        items: {
          where: {
            vendorId: vendorProfileId, // Strict isolation: only this vendor's items!
          },
          include: {
            product: {
              select: {
                id: true,
                title: true,
                brand: true,
                slug: true,
                images: { orderBy: { sortOrder: 'asc' }, take: 1 },
              },
            },
            variant: {
              select: {
                id: true,
                sku: true,
                size: true,
                color: true,
                price: true,
                originalPrice: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    });

    if (!order || order.items.length === 0) {
      return apiError(
        'Access denied. You do not have seller authorization for this order.',
        403,
        null,
        'FORBIDDEN_CROSS_VENDOR_ACCESS'
      );
    }

    const vendorSubtotal = order.items.reduce((sum, it) => sum + Number(it.totalPrice), 0);
    const vendorTotalQuantity = order.items.reduce((sum, it) => sum + it.quantity, 0);

    return apiSuccess({
      id: order.id,
      orderNumber: order.orderNumber,
      orderStatus: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      courierPartner: order.courierPartner,
      trackingNumber: order.trackingNumber,
      createdAt: order.createdAt,
      datePlaced: new Date(order.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      placedTime: new Date(order.createdAt).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      shippingAddress: order.shippingAddress
        ? {
            fullName: order.shippingAddress.fullName,
            phone: order.shippingAddress.phone,
            streetAddress: order.shippingAddress.streetAddress,
            locality: order.shippingAddress.locality || '',
            city: order.shippingAddress.city,
            state: order.shippingAddress.state,
            postalCode: order.shippingAddress.postalCode,
            country: order.shippingAddress.country,
            addressType: order.shippingAddress.addressType,
          }
        : null,
      vendorSubtotal,
      vendorTotalQuantity,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        title: item.product?.title || 'Artisanal Product',
        brand: item.product?.brand || 'Vyntra Collective',
        slug: item.product?.slug || '',
        sku: item.variant?.sku || 'N/A',
        size: item.selectedSize || item.variant?.size || 'N/A',
        color: item.selectedColor || item.variant?.color || 'N/A',
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        status: item.status,
        image:
          item.variant?.imageUrl ||
          item.product?.images[0]?.url ||
          'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80',
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
    });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    console.error('[GET /api/vendor/orders/[id] error]:', err);
    return handleApiError(err);
  }
}
