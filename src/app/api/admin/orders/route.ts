import { NextResponse } from 'next/server';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { OrderStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/orders
 * Retrieves marketplace orders across all customers and vendors with shipping details.
 * Strictly protected by requireAdmin().
 */
export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();

    // Rate limiting: 60 admin queries per minute
    const rateCheck = checkRateLimit(`admin-orders:${admin.userId}`, 60, 60);
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.resetInSeconds, 'Admin API rate limit reached. Please wait a moment.');
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status')?.toUpperCase();
    const search = searchParams.get('search')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (statusParam && statusParam !== 'ALL') {
      if (Object.values(OrderStatus).includes(statusParam as OrderStatus)) {
        where.status = statusParam as OrderStatus;
      }
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { trackingNumber: { contains: search, mode: 'insensitive' } },
        { courierPartner: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { shippingAddress: { fullName: { contains: search, mode: 'insensitive' } } },
        { shippingAddress: { city: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [totalCount, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          shippingAddress: {
            select: {
              fullName: true,
              phone: true,
              streetAddress: true,
              city: true,
              state: true,
              postalCode: true,
            },
          },
          items: {
            include: {
              product: {
                select: { id: true, title: true, brand: true },
              },
              variant: {
                select: { sku: true, size: true, color: true },
              },
              vendor: {
                select: { id: true, storeName: true, status: true },
              },
            },
          },
          vendorShipments: {
            include: {
              vendor: { select: { id: true, storeName: true, storeSlug: true } },
              items: true,
            },
          },
        },
      }),
    ]);

    const formatted = orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod,
      subtotal: Number(o.subtotal),
      totalAmount: Number(o.totalAmount),
      courierPartner: o.courierPartner,
      trackingNumber: o.trackingNumber,
      vendorShipments: (o as any).vendorShipments || [],
      remittanceReference: o.remittanceReference || null,
      settledAt: o.settledAt || null,
      createdAt: o.createdAt,
      user: {
        id: o.user?.id || '',
        name: o.user?.name || o.shippingAddress?.fullName || 'Customer',
        email: o.user?.email || 'N/A',
      },
      customer: {
        id: o.user?.id || '',
        name: o.user?.name || o.shippingAddress?.fullName || 'Customer',
        email: o.user?.email || 'N/A',
        phone: o.shippingAddress?.phone || null,
      },
      shippingAddress: o.shippingAddress,
      items: o.items.map((it) => ({
        id: it.id,
        title: it.product?.title || 'Product Item',
        brand: it.product?.brand || 'Vyntra Atelier',
        sku: it.variant?.sku || 'N/A',
        size: it.selectedSize || it.variant?.size || 'N/A',
        color: it.selectedColor || it.variant?.color || 'N/A',
        quantity: it.quantity,
        unitPrice: Number(it.unitPrice),
        totalPrice: Number(it.totalPrice),
        status: it.status,
        vendorName: it.vendor?.storeName || 'Merchant',
        vendorId: it.vendor?.id || '',
        product: {
          title: it.product?.title || 'Product Item',
          brand: it.product?.brand || 'Vyntra Atelier',
        },
        vendor: {
          storeName: it.vendor?.storeName || 'Merchant',
        },
      })),
    }));

    return apiSuccess({
      orders: formatted,
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
    return handleApiError(err);
  }
}
