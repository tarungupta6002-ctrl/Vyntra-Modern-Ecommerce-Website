import { NextResponse } from 'next/server';
import { requireVendor, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { OrderItemStatus, Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. Identify vendor strictly from the authenticated server session
    const auth = await requireVendor();
    const vendorProfileId = auth.vendorProfileId;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const skip = (page - 1) * limit;

    const statusParam = searchParams.get('status')?.toUpperCase();
    const searchQuery = searchParams.get('search')?.trim();

    // 2. Build where clause: vendor can ONLY query their own OrderItems
    const itemWhere: Prisma.OrderItemWhereInput = {
      vendorId: vendorProfileId,
    };

    if (statusParam && statusParam !== 'ALL') {
      if (Object.values(OrderItemStatus).includes(statusParam as OrderItemStatus)) {
        itemWhere.status = statusParam as OrderItemStatus;
      }
    }

    if (searchQuery) {
      itemWhere.OR = [
        {
          order: {
            orderNumber: { contains: searchQuery, mode: 'insensitive' },
          },
        },
        {
          product: {
            title: { contains: searchQuery, mode: 'insensitive' },
          },
        },
        {
          order: {
            shippingAddress: {
              fullName: { contains: searchQuery, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    // 3. Concurrently fetch filtered items, total count, and vendor metrics
    const [totalCount, vendorItems, allVendorItemsForStats] = await Promise.all([
      prisma.orderItem.count({ where: itemWhere }),
      prisma.orderItem.findMany({
        where: itemWhere,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
          vendorShipment: {
            select: {
              id: true,
              shipmentNumber: true,
              status: true,
              courierPartner: true,
              trackingNumber: true,
              shippingFee: true,
              dispatchedAt: true,
              deliveredAt: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              paymentStatus: true,
              paymentMethod: true,
              createdAt: true,
              shippingAddress: {
                select: {
                  fullName: true,
                  phone: true,
                  streetAddress: true,
                  locality: true,
                  city: true,
                  state: true,
                  postalCode: true,
                  country: true,
                  addressType: true,
                },
              },
            },
          },
        },
      }),
      // Aggregate stats across all items for this vendor
      prisma.orderItem.findMany({
        where: { vendorId: vendorProfileId },
        select: {
          id: true,
          status: true,
          totalPrice: true,
          orderId: true,
          returnRequest: {
            select: {
              status: true,
              refundTransactions: {
                select: {
                  status: true,
                  amount: true,
                },
              },
            },
          },
        },
      }),
    ]);

    // 4. Calculate vendor KPI metrics
    const distinctOrderIds = new Set(allVendorItemsForStats.map((i) => i.orderId));
    const activeItems = allVendorItemsForStats.filter((i: any) => {
      if (i.status === OrderItemStatus.CANCELLED || i.status === 'RETURNED') return false;
      if (
        i.returnRequest?.status === 'COMPLETED' ||
        i.returnRequest?.refundTransactions?.some((tx: any) => tx.status === 'CONFIRMED')
      ) {
        return false;
      }
      return true;
    });

    const metrics = {
      totalOrders: distinctOrderIds.size,
      totalUnitsSold: allVendorItemsForStats.length,
      pendingCount: allVendorItemsForStats.filter((i) => i.status === OrderItemStatus.PENDING).length,
      processingCount: allVendorItemsForStats.filter((i) => i.status === OrderItemStatus.PROCESSING).length,
      shippedCount: allVendorItemsForStats.filter((i) => i.status === OrderItemStatus.SHIPPED).length,
      deliveredCount: allVendorItemsForStats.filter((i) => i.status === OrderItemStatus.DELIVERED).length,
      cancelledCount: allVendorItemsForStats.filter((i) => i.status === OrderItemStatus.CANCELLED).length,
      grossRevenue: allVendorItemsForStats
        .filter((i) => i.status !== OrderItemStatus.CANCELLED)
        .reduce((sum, i) => sum + Number(i.totalPrice), 0),
      totalRevenue: activeItems.reduce((sum: number, i: any) => sum + Number(i.totalPrice), 0),
    };

    // 5. Group vendor items by order so each order card displays clean line items
    const ordersMap = new Map<string, any>();

    for (const item of vendorItems) {
      const orderData = item.order;
      if (!ordersMap.has(orderData.id)) {
        ordersMap.set(orderData.id, {
          id: orderData.id,
          orderNumber: orderData.orderNumber,
          orderStatus: orderData.status,
          paymentStatus: orderData.paymentStatus,
          paymentMethod: orderData.paymentMethod,
          createdAt: orderData.createdAt,
          datePlaced: new Date(orderData.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }),
          placedTime: new Date(orderData.createdAt).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          shippingAddress: orderData.shippingAddress
            ? {
                fullName: orderData.shippingAddress.fullName,
                phone: orderData.shippingAddress.phone,
                streetAddress: orderData.shippingAddress.streetAddress,
                locality: orderData.shippingAddress.locality || '',
                city: orderData.shippingAddress.city,
                state: orderData.shippingAddress.state,
                postalCode: orderData.shippingAddress.postalCode,
                country: orderData.shippingAddress.country,
                addressType: orderData.shippingAddress.addressType,
                formatted: `${orderData.shippingAddress.streetAddress}${
                  orderData.shippingAddress.locality ? `, ${orderData.shippingAddress.locality}` : ''
                }, ${orderData.shippingAddress.city}, ${orderData.shippingAddress.state} — ${
                  orderData.shippingAddress.postalCode
                }`,
              }
            : null,
          shipment: item.vendorShipment || null,
          vendorSubtotal: 0,
          vendorTotalQuantity: 0,
          items: [],
        });
      }

      const grouped = ordersMap.get(orderData.id);
      if (item.vendorShipment && !grouped.shipment) {
        grouped.shipment = item.vendorShipment;
      }
      const unitPriceNum = Number(item.unitPrice);
      const totalPriceNum = Number(item.totalPrice);

      grouped.vendorSubtotal += totalPriceNum;
      grouped.vendorTotalQuantity += item.quantity;
      grouped.items.push({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        vendorShipmentId: item.vendorShipmentId || item.vendorShipment?.id || null,
        title: item.product?.title || 'Artisanal Product',
        brand: item.product?.brand || 'Vyntra Collective',
        slug: item.product?.slug || '',
        sku: item.variant?.sku || 'N/A',
        size: item.selectedSize || item.variant?.size || 'N/A',
        color: item.selectedColor || item.variant?.color || 'N/A',
        quantity: item.quantity,
        unitPrice: unitPriceNum,
        totalPrice: totalPriceNum,
        status: item.status,
        image:
          item.variant?.imageUrl ||
          item.product?.images[0]?.url ||
          'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80',
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      });
    }

    const formattedOrders = Array.from(ordersMap.values());

    return apiSuccess({
      orders: formattedOrders,
      metrics,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    console.error('[GET /api/vendor/orders error]:', err);
    return handleApiError(err);
  }
}
