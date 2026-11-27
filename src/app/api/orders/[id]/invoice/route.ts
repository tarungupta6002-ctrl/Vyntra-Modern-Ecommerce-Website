import { requireAuth, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { OrderStatus, PaymentMethod } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { id: string };
}

/** Fees the checkout adds on top of items (see checkout route): packaging per order, COD fee for COD. */
const PACKAGING_FEE = 49;
const COD_FEE = 49;

/**
 * GET /api/orders/[id]/invoice
 * Everything needed to print an order invoice, from stored data only: the buyer's address, each
 * seller's registered name, GSTIN and dispatch address, the items and the charges actually billed.
 * Readable by the order's owner and by admins.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth();

    const order = await prisma.order.findFirst({
      where: { OR: [{ id: params.id }, { orderNumber: params.id }] },
      include: {
        shippingAddress: true,
        items: {
          include: {
            product: { select: { title: true, slug: true } },
            vendor: {
              select: {
                id: true,
                storeName: true,
                gstNumber: true,
                warehouses: {
                  where: { isDefault: true },
                  take: 1,
                  select: { facilityName: true, streetAddress: true, city: true, state: true, postalCode: true },
                },
              },
            },
          },
        },
      },
    });

    if (!order) return apiError('Order not found.', 404, null, 'ORDER_NOT_FOUND');

    const isAdmin = auth.role === 'ADMIN' || auth.role === 'SUPER_ADMIN';
    if (order.userId !== auth.userId && !isAdmin) {
      return apiError('You are not authorized to view this invoice.', 403);
    }
    if (order.status === OrderStatus.CANCELLED) {
      return apiError('No invoice is issued for a cancelled order.', 400, null, 'ORDER_CANCELLED');
    }

    const subtotal = Number(order.subtotal);
    const discount = Number(order.discount);
    const shippingFee = Number(order.shippingFee);
    const tax = Number(order.tax || 0);
    const total = Number(order.totalAmount);

    // The order stores items, discount, shipping and total; packaging (and COD) fees are the rest.
    const otherCharges = Math.max(0, Math.round((total - (subtotal - discount + shippingFee + tax)) * 100) / 100);
    const codFee = order.paymentMethod === PaymentMethod.COD ? Math.min(COD_FEE, otherCharges) : 0;
    const packagingFee = Math.round((otherCharges - codFee) * 100) / 100;
    const charges = [
      ...(packagingFee > 0 ? [{ label: packagingFee === PACKAGING_FEE ? 'Packaging fee' : 'Other charges', amount: packagingFee }] : []),
      ...(codFee > 0 ? [{ label: 'Cash on Delivery fee', amount: codFee }] : []),
      ...(shippingFee > 0 ? [{ label: 'Shipping', amount: shippingFee }] : []),
      ...(tax > 0 ? [{ label: 'Tax', amount: tax }] : []),
    ];

    const sellers = new Map<string, any>();
    for (const item of order.items) {
      const v = item.vendor;
      if (!v || sellers.has(v.id)) continue;
      const w = v.warehouses[0];
      sellers.set(v.id, {
        name: v.storeName,
        gstin: v.gstNumber || null,
        address: w ? [w.streetAddress, `${w.city}, ${w.state} ${w.postalCode}`].filter(Boolean).join(', ') : null,
      });
    }

    const a = order.shippingAddress;
    return apiSuccess({
      orderNumber: order.orderNumber,
      orderDate: order.createdAt.toISOString(),
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      buyer: a
        ? {
            name: a.fullName,
            phone: a.phone,
            address: [a.streetAddress, a.locality, a.landmark].filter(Boolean).join(', '),
            cityStatePin: `${a.city}, ${a.state} ${a.postalCode}`,
          }
        : null,
      sellers: Array.from(sellers.values()),
      items: order.items.map((item) => ({
        id: item.id,
        title: item.product?.title || 'Item',
        seller: item.vendor?.storeName || null,
        size: item.selectedSize || null,
        color: item.selectedColor || null,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        total: Number(item.totalPrice),
      })),
      subtotal,
      discount,
      charges,
      total,
    });
  } catch (err: any) {
    if (err.name === 'AuthError') return handleAuthError(err);
    return handleApiError(err);
  }
}
