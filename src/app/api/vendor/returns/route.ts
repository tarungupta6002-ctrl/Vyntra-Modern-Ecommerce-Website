import { NextResponse } from 'next/server';
import { requireVendor, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { ReturnStatus, ReturnType, Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/vendor/returns
 * Vendor queries their own return and replacement requests.
 * Strictly scoped to auth.vendorProfileId.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireVendor();
    const vendorProfileId = auth.vendorProfileId;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const skip = (page - 1) * limit;

    const statusParam = searchParams.get('status')?.toUpperCase();
    const typeParam = searchParams.get('type')?.toUpperCase();
    const searchQuery = searchParams.get('search')?.trim();

    // Vendor can ONLY query their own return requests
    const where: Prisma.ReturnRequestWhereInput = {
      vendorProfileId,
    };

    if (statusParam && statusParam !== 'ALL') {
      if (Object.values(ReturnStatus).includes(statusParam as ReturnStatus)) {
        where.status = statusParam as ReturnStatus;
      }
    }

    if (typeParam && typeParam !== 'ALL') {
      if (Object.values(ReturnType).includes(typeParam as ReturnType)) {
        where.type = typeParam as ReturnType;
      }
    }

    if (searchQuery) {
      where.OR = [
        { id: { contains: searchQuery, mode: 'insensitive' } },
        { reverseTrackingNumber: { contains: searchQuery, mode: 'insensitive' } },
        {
          order: {
            orderNumber: { contains: searchQuery, mode: 'insensitive' },
          },
        },
        {
          user: {
            name: { contains: searchQuery, mode: 'insensitive' },
          },
        },
        {
          orderItem: {
            product: {
              title: { contains: searchQuery, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    const [totalCount, returns, statusCounts] = await Promise.all([
      prisma.returnRequest.count({ where }),
      prisma.returnRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
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
        },
      }),
      prisma.returnRequest.groupBy({
        by: ['status'],
        where: { vendorProfileId },
        _count: { status: true },
      }),
    ]);

    const countsByStatus = statusCounts.reduce<Record<string, number>>((acc, curr) => {
      acc[curr.status] = curr._count.status;
      return acc;
    }, {});

    return apiSuccess({
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      countsByStatus,
      returns: returns.map((r) => ({
        id: r.id,
        orderId: r.orderId,
        orderNumber: r.order.orderNumber,
        orderItemId: r.orderItemId,
        type: r.type,
        status: r.status,
        reason: r.reason,
        detailedReason: r.detailedReason,
        customerNotes: r.customerNotes,
        vendorNotes: r.vendorNotes,
        requestedQuantity: r.requestedQuantity,
        reverseCourierPartner: r.reverseCourierPartner,
        reverseTrackingNumber: r.reverseTrackingNumber,
        pickedUpAt: r.pickedUpAt,
        receivedAtWarehouseAt: r.receivedAtWarehouseAt,
        qcPassed: r.qcPassed,
        isDisputed: r.isDisputed,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        customer: {
          name: r.user.name,
          email: r.user.email,
          phone: r.user.phone,
        },
        item: {
          title: r.orderItem.product?.title || 'Artisanal Piece',
          brand: r.orderItem.product?.brand || 'Vyntra Collective',
          size: r.orderItem.selectedSize || r.orderItem.variant?.size || 'N/A',
          color: r.orderItem.selectedColor || r.orderItem.variant?.color || 'N/A',
          sku: r.orderItem.variant?.sku || 'N/A',
          unitPrice: Number(r.orderItem.unitPrice),
          totalPrice: Number(r.orderItem.totalPrice),
          orderedQuantity: r.orderItem.quantity,
          image:
            r.orderItem.variant?.imageUrl ||
            r.orderItem.product?.images[0]?.url ||
            null,
        },
      })),
    });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    return handleApiError(err);
  }
}
