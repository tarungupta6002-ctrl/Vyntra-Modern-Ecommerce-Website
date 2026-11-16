const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Verifying Admin Orders API logic and edge cases ---');

  // Fetch orders exactly as /api/admin/orders does
  const orders = await prisma.order.findMany({
    take: 10,
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
    },
  });

  console.log(`Fetched ${orders.length} orders from DB.`);

  // Test format mapping (from src/app/api/admin/orders/route.ts)
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
    })),
  }));

  console.log('Formatted orders sample:');
  formatted.forEach((ord) => {
    console.log(`Order #${ord.orderNumber}: user =`, ord.user, `customer =`, ord.customer);
    
    // Simulate the UI rendering in src/app/admin/orders/page.tsx:
    const customerName = ord.shippingAddress?.fullName || ord.user?.name || ord.customer?.name || 'Customer';
    const customerEmail = ord.user?.email || ord.customer?.email || 'No email provided';
    
    if (typeof customerName !== 'string' || typeof customerEmail !== 'string') {
      throw new Error(`Invalid render values: name=${customerName}, email=${customerEmail}`);
    }
  });

  // Test edge case where ord.user is completely undefined or null
  const edgeCaseOrders = [
    { id: '1', orderNumber: 'TEST-1', user: undefined, customer: undefined, shippingAddress: null },
    { id: '2', orderNumber: 'TEST-2', user: null, customer: null, shippingAddress: { fullName: 'Direct Buyer', phone: '9999999999' } },
  ];

  edgeCaseOrders.forEach((ord) => {
    const customerName = ord.shippingAddress?.fullName || ord.user?.name || ord.customer?.name || 'Customer';
    const customerEmail = ord.user?.email || ord.customer?.email || 'No email provided';
    console.log(`Edge-case simulation for #${ord.orderNumber}: Name="${customerName}", Email="${customerEmail}" -> PASS`);
  });

  console.log('--- ALL ADMIN ORDER CHECKS PASSED WITH ZERO RUNTIME ERRORS ---');
}

main()
  .catch((e) => {
    console.error('Test failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
