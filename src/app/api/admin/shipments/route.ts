import { NextResponse } from 'next/server';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, handleApiError } from '@/lib/api-response';
import { OrderStatus, ShipmentStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/shipments
 * Monitors all multi-vendor shipments, courier AWBs, handling SLAs, and delayed dispatches.
 * Strictly protected by requireAdmin().
 */
export async function GET(request: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status')?.toUpperCase();
    const vendorId = searchParams.get('vendorId') || undefined;
    const delayedOnly = searchParams.get('delayed') === 'true';
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50', 10));

    try {
      // Self-healing synchronization:
      // Ensure vendor shipments reflect authoritative final Order states (DELIVERED, CANCELLED)
      try {
        const outOfSyncDelivered = await prisma.order.findMany({
          where: {
            status: OrderStatus.DELIVERED,
            vendorShipments: {
              some: {
                status: { not: ShipmentStatus.DELIVERED },
              },
            },
          },
          select: { id: true },
        });

        if (outOfSyncDelivered.length > 0) {
          await prisma.vendorShipment.updateMany({
            where: {
              orderId: { in: outOfSyncDelivered.map((o) => o.id) },
              status: { not: ShipmentStatus.DELIVERED },
            },
            data: {
              status: ShipmentStatus.DELIVERED,
              deliveredAt: new Date(),
            },
          });
        }

        const outOfSyncCancelled = await prisma.order.findMany({
          where: {
            status: OrderStatus.CANCELLED,
            vendorShipments: {
              some: {
                status: { not: ShipmentStatus.CANCELLED },
              },
            },
          },
          select: { id: true },
        });

        if (outOfSyncCancelled.length > 0) {
          await prisma.vendorShipment.updateMany({
            where: {
              orderId: { in: outOfSyncCancelled.map((o) => o.id) },
              status: { not: ShipmentStatus.CANCELLED },
            },
            data: {
              status: ShipmentStatus.CANCELLED,
            },
          });
        }
      } catch {
        // Non-blocking sync attempt
      }

      const where: any = {};
      if (statusParam && statusParam !== 'ALL' && Object.values(ShipmentStatus).includes(statusParam as any)) {
        where.status = statusParam as ShipmentStatus;
      }
      if (vendorId) where.vendorId = vendorId;

      const shipments = await prisma.vendorShipment.findMany({
        where,
        include: {
          vendor: { select: { id: true, storeName: true, isVerified: true } },
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              shippingAddress: true,
              createdAt: true,
              user: { select: { name: true, email: true, phone: true } },
            },
          },
          items: {
            include: {
              orderItem: {
                select: {
                  id: true,
                  quantity: true,
                  unitPrice: true,
                  product: { select: { title: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      const now = Date.now();
      const formatted = shipments.map((s: any) => {
        const orderAgeHours = (now - new Date(s.createdAt).getTime()) / (1000 * 3600);
        const isDelayed =
          (s.status === ShipmentStatus.PENDING || s.status === ShipmentStatus.LABEL_CREATED) &&
          orderAgeHours > 48; // Over 48 hours without dispatch

        let resolvedStatus = s.status;
        if (s.order?.status === OrderStatus.DELIVERED) {
          resolvedStatus = ShipmentStatus.DELIVERED;
        } else if (s.order?.status === OrderStatus.CANCELLED) {
          resolvedStatus = ShipmentStatus.CANCELLED;
        }

        return {
          id: s.id,
          orderId: s.orderId,
          orderNumber: s.order?.orderNumber || s.orderId.slice(0, 8),
          vendorId: s.vendorId,
          vendorStoreName: s.vendor?.storeName || 'Unknown Vendor',
          status: resolvedStatus,
          carrierName: s.courierPartner || 'Awaiting Logistics Pickup',
          trackingNumber: s.trackingNumber || null,
          trackingUrl: s.shippingLabelUrl || null,
          shippingFee: Number(s.shippingFee || 0),
          customerName: s.order?.user?.name || 'Customer',
          customerCity: (s.order?.shippingAddress as any)?.city || 'India',
          orderCreatedAt: s.order?.createdAt ? s.order.createdAt.toISOString() : s.createdAt.toISOString(),
          dispatchedAt: s.dispatchedAt ? s.dispatchedAt.toISOString() : null,
          deliveredAt: s.deliveredAt ? s.deliveredAt.toISOString() : null,
          isDelayed,
          delayHours: isDelayed ? Math.round(orderAgeHours - 48) : 0,
          itemsCount: s.items.length,
          items: s.items.map((si: any) => ({
            id: si.id,
            title: si.orderItem?.product?.title || 'Catalog Product',
            quantity: si.quantity,
            price: Number(si.orderItem?.unitPrice || 0),
          })),
        };
      });

      const filtered = delayedOnly ? formatted.filter((f) => f.isDelayed) : formatted;
      return apiSuccess({ shipments: filtered, total: filtered.length });
    } catch (dbError) {
      // No invented fallback data: let the request fail visibly.
      throw dbError;
    }
  } catch (err: any) {
    const authErr = handleAuthError(err);
    if (authErr) return authErr;
    return handleApiError(err);
  }
}
