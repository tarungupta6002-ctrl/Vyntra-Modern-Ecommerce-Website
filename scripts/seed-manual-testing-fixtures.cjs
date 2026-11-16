/**
 * Comprehensive Synthetic Test Data Seeder for Manual Testing
 * Target: ONLY localhost:5433 / vyntra_dev
 * 
 * Reorganizes fixtures with clean separation of concerns:
 * 1. Order VY-TEST-VALID-7DAY: Clean Chanderi Silk Kurta item (delivered 2 days ago) with NO ReturnRequest.
 *    -> Fresh "Return / Exchange" button is directly available for TC-03.
 * 2. Order VY-TEST-QC-FLOW: Dedicated order for Return ret_manual_ready_qc (RECEIVED_AT_WH).
 *    -> Dedicated to Vendor QC Pass / Fail testing.
 * 3. Order VY-TEST-REFUND-OFFERED: Dedicated order for Return ret_manual_refund_offered (REFUND_OFFERED).
 *    -> Dedicated to Customer "Accept Refund" testing.
 * 4. Order VY-TEST-EXPIRED-10DAY: Dedicated order delivered 10 days ago.
 *    -> Dedicated to 7-day window expiration testing.
 * 5. Order VY-TEST-LEGACY-UNVERIFIED: Dedicated order with deliveredAt: null.
 *    -> Dedicated to unverified delivery timestamp testing.
 */

const { PrismaClient, OrderStatus, OrderItemStatus, PaymentStatus, ReturnType, ReturnReason, ReturnStatus } = require('@prisma/client');

const LOCAL_URL = 'postgresql://postgres:postgres@localhost:5433/vyntra_dev?schema=public';
const prisma = new PrismaClient({
  datasources: { db: { url: LOCAL_URL } }
});

async function seed() {
  console.log('Seeding manual testing fixtures on localhost:5433/vyntra_dev...');

  // 1. Users
  const customer = await prisma.user.upsert({
    where: { id: 'usr_manual_customer' },
    update: { role: 'CUSTOMER', name: 'Manual Test Customer' },
    create: {
      id: 'usr_manual_customer',
      email: 'test-customer@vyntra.local',
      name: 'Manual Test Customer',
      role: 'CUSTOMER',
    },
  });

  const vendorUser = await prisma.user.upsert({
    where: { id: 'usr_manual_vendor' },
    update: { role: 'VENDOR', name: 'Royal Silk Atelier' },
    create: {
      id: 'usr_manual_vendor',
      email: 'test-vendor@vyntra.local',
      name: 'Royal Silk Atelier',
      role: 'VENDOR',
    },
  });

  const vendorProfile = await prisma.vendorProfile.upsert({
    where: { id: 'vp_manual_vendor' },
    update: { status: 'APPROVED', isVerified: true, storeName: 'Royal Silk Atelier' },
    create: {
      id: 'vp_manual_vendor',
      userId: vendorUser.id,
      storeName: 'Royal Silk Atelier',
      storeSlug: 'royal-silk-atelier',
      status: 'APPROVED',
      isVerified: true,
      commissionRate: 10.0,
    },
  });

  const admin = await prisma.user.upsert({
    where: { id: 'usr_manual_admin' },
    update: { role: 'ADMIN', name: 'Platform Concierge Admin' },
    create: {
      id: 'usr_manual_admin',
      email: 'test-admin@vyntra.local',
      name: 'Platform Concierge Admin',
      role: 'ADMIN',
    },
  });

  // 2. Categories
  const catApparel = await prisma.category.upsert({
    where: { id: 'cat_manual_apparel' },
    update: {},
    create: {
      id: 'cat_manual_apparel',
      name: 'Luxury Apparel',
      slug: 'luxury-apparel',
    },
  });

  const catSwimwear = await prisma.category.upsert({
    where: { id: 'cat_manual_swimwear' },
    update: {},
    create: {
      id: 'cat_manual_swimwear',
      name: 'Designer Swimwear',
      slug: 'swimwear', // Non-returnable category
      parentId: catApparel.id,
    },
  });

  // 3. Products
  const prodNormal = await prisma.product.upsert({
    where: { id: 'prod_manual_normal' },
    update: { isCustomized: false },
    create: {
      id: 'prod_manual_normal',
      vendorId: vendorProfile.id,
      categoryId: catApparel.id,
      title: 'Chanderi Silk Kurta (Standard)',
      brand: 'Royal Silk Atelier',
      slug: 'chanderi-silk-kurta-standard',
      description: 'Handcrafted luxury ready-made silk kurta',
      basePrice: 3500.00,
      isCustomized: false,
      isPublished: true,
    },
  });

  const varNormal = await prisma.productVariant.upsert({
    where: { id: 'var_manual_normal' },
    update: {},
    create: {
      id: 'var_manual_normal',
      productId: prodNormal.id,
      sku: 'RS-KURTA-M',
      size: 'M',
      price: 3500.00,
    },
  });

  await prisma.productInventory.upsert({
    where: { id: 'inv_manual_normal' },
    update: { quantity: 15 },
    create: {
      id: 'inv_manual_normal',
      productId: prodNormal.id,
      variantId: varNormal.id,
      vendorId: vendorProfile.id,
      sku: varNormal.sku,
      quantity: 15,
      reservedQuantity: 0,
    },
  });

  // Additional sizes for Chanderi Silk Kurta so replacement size variants genuinely exist
  const sizesToSeed = [
    { id: 'var_manual_normal_s', sku: 'RS-KURTA-S', size: 'S', invId: 'inv_manual_normal_s', qty: 10 },
    { id: 'var_manual_normal_l', sku: 'RS-KURTA-L', size: 'L', invId: 'inv_manual_normal_l', qty: 12 },
    { id: 'var_manual_normal_xl', sku: 'RS-KURTA-XL', size: 'XL', invId: 'inv_manual_normal_xl', qty: 8 },
  ];

  for (const s of sizesToSeed) {
    const v = await prisma.productVariant.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        productId: prodNormal.id,
        sku: s.sku,
        size: s.size,
        price: 3500.00,
      },
    });

    await prisma.productInventory.upsert({
      where: { id: s.invId },
      update: { quantity: s.qty },
      create: {
        id: s.invId,
        productId: prodNormal.id,
        variantId: v.id,
        vendorId: vendorProfile.id,
        sku: v.sku,
        quantity: s.qty,
        reservedQuantity: 0,
      },
    });
  }

  const prodCustom = await prisma.product.upsert({
    where: { id: 'prod_manual_custom' },
    update: { isCustomized: true },
    create: {
      id: 'prod_manual_custom',
      vendorId: vendorProfile.id,
      categoryId: catApparel.id,
      title: 'Bespoke Zari Sherwani (Made-to-Order)',
      brand: 'Royal Silk Atelier',
      slug: 'bespoke-zari-sherwani-custom',
      description: 'Tailored monogrammed royal wedding sherwani',
      basePrice: 12500.00,
      isCustomized: true, // Made-to-order
      isPublished: true,
    },
  });

  const varCustom = await prisma.productVariant.upsert({
    where: { id: 'var_manual_custom' },
    update: {},
    create: {
      id: 'var_manual_custom',
      productId: prodCustom.id,
      sku: 'RS-SHERWANI-CUST',
      size: 'Custom Made',
      price: 12500.00,
    },
  });

  await prisma.productInventory.upsert({
    where: { id: 'inv_manual_custom' },
    update: { quantity: 5 },
    create: {
      id: 'inv_manual_custom',
      productId: prodCustom.id,
      variantId: varCustom.id,
      vendorId: vendorProfile.id,
      sku: varCustom.sku,
      quantity: 5,
      reservedQuantity: 0,
    },
  });

  const prodSwimwear = await prisma.product.upsert({
    where: { id: 'prod_manual_swim' },
    update: {},
    create: {
      id: 'prod_manual_swim',
      vendorId: vendorProfile.id,
      categoryId: catSwimwear.id,
      title: 'Resort Silk Monokini (Swimwear)',
      brand: 'Royal Silk Atelier',
      slug: 'resort-silk-monokini',
      description: 'Luxury resort swimwear - Non-returnable intimate category',
      basePrice: 4200.00,
      isCustomized: false,
      isPublished: true,
    },
  });

  const varSwim = await prisma.productVariant.upsert({
    where: { id: 'var_manual_swim' },
    update: {},
    create: {
      id: 'var_manual_swim',
      productId: prodSwimwear.id,
      sku: 'RS-MONOKINI-S',
      size: 'S',
      price: 4200.00,
    },
  });

  await prisma.productInventory.upsert({
    where: { id: 'inv_manual_swim' },
    update: { quantity: 10 },
    create: {
      id: 'inv_manual_swim',
      productId: prodSwimwear.id,
      variantId: varSwim.id,
      vendorId: vendorProfile.id,
      sku: varSwim.sku,
      quantity: 10,
      reservedQuantity: 0,
    },
  });

  // -------------------------------------------------------------------------
  // 4. Orders with Specific Clean Test Scenarios
  // -------------------------------------------------------------------------

  // ORDER 1: VY-TEST-VALID-7DAY (Clean unreturned item for TC-03 return modal)
  const delivery2DaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const orderValid = await prisma.order.upsert({
    where: { id: 'ord_manual_valid_7day' },
    update: { status: OrderStatus.DELIVERED },
    create: {
      id: 'ord_manual_valid_7day',
      orderNumber: 'VY-TEST-VALID-7DAY',
      userId: customer.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'CARD',
      subtotal: 7700.00,
      shippingFee: 99.00,
      totalAmount: 7799.00,
    },
  });

  // Item 1A: Clean Chanderi Silk Kurta (NO return request attached) -> TC-03 TARGET
  await prisma.orderItem.upsert({
    where: { id: 'item_manual_valid_norm' },
    update: { deliveredAt: delivery2DaysAgo, status: OrderItemStatus.DELIVERED },
    create: {
      id: 'item_manual_valid_norm',
      orderId: orderValid.id,
      productId: prodNormal.id,
      variantId: varNormal.id,
      vendorId: vendorProfile.id,
      quantity: 1,
      unitPrice: 3500.00,
      totalPrice: 3500.00,
      status: OrderItemStatus.DELIVERED,
      deliveredAt: delivery2DaysAgo,
      isCustomizedSnapshot: false,
    },
  });

  // Item 1B: Clean Swimwear item (NO return request attached) -> For testing non-returnable alert
  const itemValidSwimwear = await prisma.orderItem.upsert({
    where: { id: 'item_manual_valid_swim' },
    update: { deliveredAt: delivery2DaysAgo, status: OrderItemStatus.DELIVERED },
    create: {
      id: 'item_manual_valid_swim',
      orderId: orderValid.id,
      productId: prodSwimwear.id,
      variantId: varSwim.id,
      vendorId: vendorProfile.id,
      quantity: 1,
      unitPrice: 4200.00,
      totalPrice: 4200.00,
      status: OrderItemStatus.DELIVERED,
      deliveredAt: delivery2DaysAgo,
      isCustomizedSnapshot: false,
    },
  });

  // ORDER 2: VY-TEST-QC-FLOW (Dedicated order for Return ret_manual_ready_qc)
  const orderQc = await prisma.order.upsert({
    where: { id: 'ord_manual_qc_flow' },
    update: { status: OrderStatus.DELIVERED },
    create: {
      id: 'ord_manual_qc_flow',
      orderNumber: 'VY-TEST-QC-FLOW',
      userId: customer.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'CARD',
      subtotal: 3500.00,
      shippingFee: 99.00,
      totalAmount: 3599.00,
    },
  });

  const itemQc = await prisma.orderItem.upsert({
    where: { id: 'item_manual_qc_norm' },
    update: { deliveredAt: delivery2DaysAgo, status: OrderItemStatus.DELIVERED },
    create: {
      id: 'item_manual_qc_norm',
      orderId: orderQc.id,
      productId: prodNormal.id,
      variantId: varNormal.id,
      vendorId: vendorProfile.id,
      quantity: 1,
      unitPrice: 3500.00,
      totalPrice: 3500.00,
      status: OrderItemStatus.DELIVERED,
      deliveredAt: delivery2DaysAgo,
      isCustomizedSnapshot: false,
    },
  });

  // ORDER 3: VY-TEST-REFUND-OFFERED (Dedicated order for Return ret_manual_refund_offered)
  const orderRefundOffer = await prisma.order.upsert({
    where: { id: 'ord_manual_refund_offered' },
    update: { status: OrderStatus.DELIVERED },
    create: {
      id: 'ord_manual_refund_offered',
      orderNumber: 'VY-TEST-REFUND-OFFERED',
      userId: customer.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'CARD',
      subtotal: 3500.00,
      shippingFee: 99.00,
      totalAmount: 3599.00,
    },
  });

  const itemRefundOffer = await prisma.orderItem.upsert({
    where: { id: 'item_manual_refund_norm' },
    update: { deliveredAt: delivery2DaysAgo, status: OrderItemStatus.DELIVERED },
    create: {
      id: 'item_manual_refund_norm',
      orderId: orderRefundOffer.id,
      productId: prodNormal.id,
      variantId: varNormal.id,
      vendorId: vendorProfile.id,
      quantity: 1,
      unitPrice: 3500.00,
      totalPrice: 3500.00,
      status: OrderItemStatus.DELIVERED,
      deliveredAt: delivery2DaysAgo,
      isCustomizedSnapshot: false,
    },
  });

  // ORDER 4: VY-TEST-EXPIRED-10DAY (Delivered 10 days ago, expired 7-day window)
  const delivery10DaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  const orderExpired = await prisma.order.upsert({
    where: { id: 'ord_manual_expired_10day' },
    update: { status: OrderStatus.DELIVERED },
    create: {
      id: 'ord_manual_expired_10day',
      orderNumber: 'VY-TEST-EXPIRED-10DAY',
      userId: customer.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'CARD',
      subtotal: 3500.00,
      shippingFee: 99.00,
      totalAmount: 3599.00,
    },
  });

  await prisma.orderItem.upsert({
    where: { id: 'item_manual_expired_norm' },
    update: { deliveredAt: delivery10DaysAgo, status: OrderItemStatus.DELIVERED },
    create: {
      id: 'item_manual_expired_norm',
      orderId: orderExpired.id,
      productId: prodNormal.id,
      variantId: varNormal.id,
      vendorId: vendorProfile.id,
      quantity: 1,
      unitPrice: 3500.00,
      totalPrice: 3500.00,
      status: OrderItemStatus.DELIVERED,
      deliveredAt: delivery10DaysAgo,
      isCustomizedSnapshot: false,
    },
  });

  // ORDER 5: VY-TEST-LEGACY-UNVERIFIED (Legacy order without deliveredAt)
  const orderLegacy = await prisma.order.upsert({
    where: { id: 'ord_manual_legacy_unverified' },
    update: { status: OrderStatus.DELIVERED },
    create: {
      id: 'ord_manual_legacy_unverified',
      orderNumber: 'VY-TEST-LEGACY-UNVERIFIED',
      userId: customer.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'COD',
      subtotal: 12500.00,
      shippingFee: 0.00,
      totalAmount: 12500.00,
    },
  });

  await prisma.orderItem.upsert({
    where: { id: 'item_manual_legacy_custom' },
    update: { deliveredAt: null, status: OrderItemStatus.DELIVERED },
    create: {
      id: 'item_manual_legacy_custom',
      orderId: orderLegacy.id,
      productId: prodCustom.id,
      variantId: varCustom.id,
      vendorId: vendorProfile.id,
      quantity: 1,
      unitPrice: 12500.00,
      totalPrice: 12500.00,
      status: OrderItemStatus.DELIVERED,
      deliveredAt: null, // Legacy unverified
      isCustomizedSnapshot: true,
    },
  });

  // -------------------------------------------------------------------------
  // 5. Returns with Specific States
  // -------------------------------------------------------------------------

  // First clean up any old return request that was attached to item_manual_valid_norm
  await prisma.returnRequest.deleteMany({
    where: { orderItemId: 'item_manual_valid_norm' },
  });

  // Return A: Dedicated order VY-TEST-QC-FLOW
  await prisma.returnRequest.upsert({
    where: { id: 'ret_manual_ready_qc' },
    update: {
      orderId: orderQc.id,
      orderItemId: itemQc.id,
      type: ReturnType.REPLACEMENT,
    },
    create: {
      id: 'ret_manual_ready_qc',
      orderId: orderQc.id,
      orderItemId: itemQc.id,
      vendorProfileId: vendorProfile.id,
      userId: customer.id,
      type: ReturnType.REPLACEMENT,
      status: ReturnStatus.RECEIVED_AT_WH,
      reason: ReturnReason.SIZE_FIT_ISSUE,
      requestedQuantity: 1,
      customerNotes: 'Please exchange with size L',
    },
  });

  // Return B: In REJECTED status with rejectedAt (Ready for Customer Dispute test)
  const rejected1DayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
  await prisma.returnRequest.upsert({
    where: { id: 'ret_manual_rejected_dispute' },
    update: {
      orderId: orderValid.id,
      orderItemId: itemValidSwimwear.id,
      status: ReturnStatus.REJECTED,
      rejectedAt: rejected1DayAgo,
    },
    create: {
      id: 'ret_manual_rejected_dispute',
      orderId: orderValid.id,
      orderItemId: itemValidSwimwear.id,
      vendorProfileId: vendorProfile.id,
      userId: customer.id,
      type: ReturnType.RETURN_REFUND,
      status: ReturnStatus.REJECTED,
      reason: ReturnReason.BUYER_REMORSE,
      requestedQuantity: 1,
      rejectedAt: rejected1DayAgo,
      vendorNotes: 'Intimate swimwear category is strictly non-returnable for change of mind.',
    },
  });

  // Return C: In REFUND_OFFERED status on dedicated order VY-TEST-REFUND-OFFERED
  await prisma.returnRequest.upsert({
    where: { id: 'ret_manual_refund_offered' },
    update: {
      orderId: orderRefundOffer.id,
      orderItemId: itemRefundOffer.id,
      status: ReturnStatus.REFUND_OFFERED,
    },
    create: {
      id: 'ret_manual_refund_offered',
      orderId: orderRefundOffer.id,
      orderItemId: itemRefundOffer.id,
      vendorProfileId: vendorProfile.id,
      userId: customer.id,
      type: ReturnType.EXCHANGE,
      status: ReturnStatus.REFUND_OFFERED,
      reason: ReturnReason.SIZE_FIT_ISSUE,
      requestedQuantity: 1,
      vendorNotes: 'Replacement size L is currently out of stock. Full refund offered to customer.',
    },
  });

  console.log('----------------------------------------------------------------------');
  console.log('FIXTURE SEPARATION COMPLETED SUCCESSFULLY:');
  console.log('  Order VY-TEST-VALID-7DAY        : item_manual_valid_norm (Clean Kurta, NO return request, ready for TC-03!)');
  console.log('  Order VY-TEST-QC-FLOW           : ret_manual_ready_qc (Status: RECEIVED_AT_WH for Vendor QC)');
  console.log('  Order VY-TEST-REFUND-OFFERED    : ret_manual_refund_offered (Status: REFUND_OFFERED for Accept Refund)');
  console.log('  Order VY-TEST-EXPIRED-10DAY     : item_manual_expired_norm (Delivered 10 days ago, expired window)');
  console.log('  Order VY-TEST-LEGACY-UNVERIFIED : item_manual_legacy_custom (deliveredAt: null)');
  console.log('----------------------------------------------------------------------');
}

seed()
  .catch(e => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
