import { NextResponse } from 'next/server';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    id: string; // orderId or orderNumber
  };
}

/**
 * GET /api/admin/orders/[id]
 * Retrieves comprehensive single order details for Admin Governance.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    await requireAdmin();
    const orderParam = context.params.id;

    if (!orderParam) {
      return apiError('Order ID is required.', 400);
    }

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id: orderParam }, { orderNumber: orderParam }],
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        shippingAddress: true,
        items: {
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
            vendor: {
              select: { id: true, storeName: true, storeSlug: true, status: true },
            },
            sellerOffer: {
              include: {
                vendor: { select: { id: true, storeName: true, storeSlug: true } },
              },
            },
            offerVariant: true,
            returnRequest: {
              select: {
                id: true,
                type: true,
                status: true,
                reason: true,
                createdAt: true,
              },
            },
          },
        },
        vendorShipments: {
          include: {
            vendor: { select: { id: true, storeName: true, storeSlug: true } },
            warehouse: true,
            items: true,
          },
        },
      },
    });

    if (!order) {
      return apiError('Order not found.', 404, null, 'ORDER_NOT_FOUND');
    }

    // Financial calculations
    const subtotal = Number(order.subtotal);
    const discount = Number(order.discount);
    const shippingFee = Number(order.shippingFee);
    const totalAmount = Number(order.totalAmount);
    const tax = Number(order.tax || 0);

    const isCOD =
      order.paymentMethod?.toLowerCase().includes('cod') ||
      order.paymentMethod?.toLowerCase().includes('cash');

    const netProductCost = Math.max(0, subtotal - discount);
    const extraFees = Math.max(0, totalAmount - netProductCost);
    const packagingFee = isCOD && extraFees >= 98 ? 49 : extraFees >= 49 ? 49 : Math.max(0, extraFees - shippingFee);
    const codFee = isCOD && extraFees >= 98 ? 49 : isCOD && extraFees >= 49 ? Math.max(0, extraFees - packagingFee) : 0;

    const formattedItems = order.items.map((item) => {
      const unitPrice = Number(item.unitPrice);
      const totalPrice = Number(item.totalPrice || unitPrice * item.quantity);
      const originalPrice = Number(
        item.variant?.originalPrice ||
        (item.product as any)?.discountPrice ||
        unitPrice * 2
      );

      return {
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        title: item.product?.title || 'Artisanal Product',
        brand: item.product?.brand || 'Vyntra Collective',
        slug: item.product?.slug || '',
        sku: item.offerVariant?.sellerSku || item.variant?.sku || 'N/A',
        size: item.selectedSize || item.variant?.size || 'Standard',
        color: item.selectedColor || item.variant?.color || 'Classic',
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        originalPrice,
        status: item.status,
        vendorName: item.sellerOffer?.vendor?.storeName || item.vendor?.storeName || 'Artisan Merchant',
        vendorId: item.sellerOffer?.vendorId || item.vendorId,
        isSellerOffer: Boolean(item.sellerOfferId),
        image:
          item.variant?.imageUrl ||
          item.product?.images[0]?.url ||
          'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80',
        returnRequest: item.returnRequest,
      };
    });

    return apiSuccess({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        isCOD,
        createdAt: order.createdAt.toISOString(),
        datePlaced: order.createdAt.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        placedTime: order.createdAt.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        courierPartner: order.courierPartner,
        trackingNumber: order.trackingNumber,
        remittanceReference: order.remittanceReference,
        settledAt: order.settledAt ? order.settledAt.toISOString() : null,
        financials: {
          subtotal,
          discount,
          shippingFee,
          packagingFee,
          codFee,
          tax,
          totalAmount,
        },
        customer: {
          id: order.user?.id || '',
          name: order.user?.name || order.shippingAddress?.fullName || 'Customer',
          email: order.user?.email || 'N/A',
          phone: order.shippingAddress?.phone || order.user?.phone || 'N/A',
        },
        shippingAddress: order.shippingAddress
          ? {
              fullName: order.shippingAddress.fullName,
              phone: order.shippingAddress.phone,
              streetAddress: order.shippingAddress.streetAddress,
              locality: order.shippingAddress.locality || '',
              landmark: order.shippingAddress.landmark || '',
              city: order.shippingAddress.city,
              state: order.shippingAddress.state,
              postalCode: order.shippingAddress.postalCode,
              country: order.shippingAddress.country,
              addressType: order.shippingAddress.addressType,
            }
          : null,
        items: formattedItems,
        vendorShipments: order.vendorShipments.map((vs) => ({
          id: vs.id,
          shipmentNumber: vs.shipmentNumber,
          status: vs.status,
          courierPartner: vs.courierPartner,
          trackingNumber: vs.trackingNumber,
          subtotal: Number(vs.subtotal),
          shippingFee: Number(vs.shippingFee),
          dispatchedAt: vs.dispatchedAt ? vs.dispatchedAt.toISOString() : null,
          deliveredAt: vs.deliveredAt ? vs.deliveredAt.toISOString() : null,
          vendor: vs.vendor,
          warehouse: vs.warehouse,
          itemsCount: vs.items.length,
        })),
      },
    });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    return handleApiError(err);
  }
}
