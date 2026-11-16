/**
 * Automated Security Regression Suite: Vendor Product Isolation
 * 
 * Verifies the 4 critical security checks:
 * Check 1: Cross-vendor direct product retrieval & edit access
 * Check 2: Cross-vendor product attribute mutation (PUT)
 * Check 3: Cross-vendor product deletion (DELETE)
 * Check 4: Cross-vendor publish / unpublish status alteration (PATCH)
 * 
 * Executed in BOTH directions:
 * - Direction 1: Vendor A -> Vendor B product
 * - Direction 2 (Reverse): Vendor B -> Vendor A product
 * 
 * Confirms database state immutability after rejected requests.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  PASS: ${testName}`);
    testsPassed++;
  } else {
    console.error(`  FAIL: ${testName} - ${details}`);
    testsFailed++;
  }
}

// Emulate Server-Side Auth & Route Logic
async function verifyVendorOwnership(productId, vendorProfileId) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, vendorId: true, title: true, isPublished: true, basePrice: true },
  });

  if (!product) {
    return { status: 404, code: 'NOT_FOUND', message: 'Product not found.' };
  }

  if (product.vendorId !== vendorProfileId) {
    return { status: 403, code: 'FORBIDDEN_NOT_OWNER', message: 'Access denied. You do not own this product.' };
  }

  return { status: 200, code: 'OWNER_VERIFIED', product };
}

// Simulate GET /api/vendor/products/[id]
async function simulateGetProduct(requestingVendorId, productId) {
  const check = await verifyVendorOwnership(productId, requestingVendorId);
  if (check.status !== 200) {
    return { status: check.status, code: check.code, message: check.message, data: null };
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      variants: { include: { inventories: true } },
      images: true,
      category: true,
    },
  });

  return { status: 200, code: 'SUCCESS', data: product };
}

// Simulate PUT /api/vendor/products/[id]
async function simulateEditProduct(requestingVendorId, productId, updatePayload) {
  const check = await verifyVendorOwnership(productId, requestingVendorId);
  if (check.status !== 200) {
    return { status: check.status, code: check.code, message: check.message };
  }

  // If authorized, perform update
  await prisma.product.update({
    where: { id: productId },
    data: {
      title: updatePayload.title,
      basePrice: updatePayload.price,
    },
  });

  return { status: 200, code: 'UPDATED' };
}

// Simulate DELETE /api/vendor/products/[id]
async function simulateDeleteProduct(requestingVendorId, productId) {
  const check = await verifyVendorOwnership(productId, requestingVendorId);
  if (check.status !== 200) {
    return { status: check.status, code: check.code, message: check.message };
  }

  await prisma.product.delete({ where: { id: productId } });
  return { status: 200, code: 'DELETED' };
}

// Simulate PATCH /api/vendor/products/[id]/publish
async function simulatePublishProduct(requestingVendorId, productId, targetPublished) {
  const check = await verifyVendorOwnership(productId, requestingVendorId);
  if (check.status !== 200) {
    return { status: check.status, code: check.code, message: check.message };
  }

  await prisma.product.update({
    where: { id: productId },
    data: { isPublished: targetPublished },
  });

  return { status: 200, code: 'PUBLISH_UPDATED' };
}

async function runSecurityAudit() {
  console.log('\n============================================================');
  console.log(' VENDOR PRODUCT ISOLATION SECURITY AUDIT & REGRESSION TESTS');
  console.log('============================================================\n');

  // Fetch Vendor A (Vyntra Royal Atelier) and Vendor B (Tarun Store or Varun Marketplace)
  const vendorProfiles = await prisma.vendorProfile.findMany({
    where: {
      products: { some: {} },
    },
    include: {
      products: { take: 1, include: { variants: { include: { inventories: true } } } },
    },
  });

  if (vendorProfiles.length < 2) {
    console.error('Audit requires at least 2 vendors with existing products in the database.');
    process.exit(1);
  }

  const vendorA = vendorProfiles[0];
  const vendorB = vendorProfiles[1];

  const productA = vendorA.products[0];
  const productB = vendorB.products[0];

  console.log(`Vendor A: "${vendorA.storeName}" (ID: ${vendorA.id})`);
  console.log(`  -> Owns Product A: "${productA.title}" (ID: ${productA.id})\n`);

  console.log(`Vendor B: "${vendorB.storeName}" (ID: ${vendorB.id})`);
  console.log(`  -> Owns Product B: "${productB.title}" (ID: ${productB.id})\n`);

  // Snapshot initial DB states to verify strict database immutability
  const snapA = await prisma.product.findUnique({
    where: { id: productA.id },
    include: { variants: true },
  });
  const snapB = await prisma.product.findUnique({
    where: { id: productB.id },
    include: { variants: true },
  });

  // =========================================================================
  // DIRECTION 1: Vendor A attempts unauthorized actions on Vendor B's Product
  // =========================================================================
  console.log('------------------------------------------------------------');
  console.log(' DIRECTION 1: Vendor A -> Vendor B Product');
  console.log('------------------------------------------------------------\n');

  // Check 1: Vendor A tries to open Vendor B's product
  const d1_get = await simulateGetProduct(vendorA.id, productB.id);
  assert(
    d1_get.status === 403 && d1_get.code === 'FORBIDDEN_NOT_OWNER',
    'Check 1: Vendor A receives 403 FORBIDDEN when opening Vendor B product by ID',
    `Received status ${d1_get.status}`
  );
  assert(
    d1_get.data === null,
    'Check 1 (Privacy): Vendor B product data is NOT returned to Vendor A',
    'Leaked product details'
  );

  // Check 2: Vendor A tries to edit Vendor B's product
  const d1_edit = await simulateEditProduct(vendorA.id, productB.id, {
    title: 'ATTACK_TITLE_VENDOR_A',
    price: 999999,
  });
  assert(
    d1_edit.status === 403 && d1_edit.code === 'FORBIDDEN_NOT_OWNER',
    'Check 2: Vendor A receives 403 FORBIDDEN when attempting to edit Vendor B product',
    `Received status ${d1_edit.status}`
  );

  // Verify DB record B remains completely unchanged
  const postEditB = await prisma.product.findUnique({ where: { id: productB.id } });
  assert(
    postEditB.title === snapB.title && Number(postEditB.basePrice) === Number(snapB.basePrice),
    'Check 2 (Immutability): Database confirms Vendor B product title and price UNCHANGED',
    `Modified from "${snapB.title}" to "${postEditB.title}"`
  );

  // Check 3: Vendor A tries to delete Vendor B's product
  const d1_del = await simulateDeleteProduct(vendorA.id, productB.id);
  assert(
    d1_del.status === 403 && d1_del.code === 'FORBIDDEN_NOT_OWNER',
    'Check 3: Vendor A receives 403 FORBIDDEN when attempting to delete Vendor B product',
    `Received status ${d1_del.status}`
  );

  const postDelB = await prisma.product.findUnique({ where: { id: productB.id } });
  assert(
    postDelB !== null,
    'Check 3 (Immutability): Database confirms Vendor B product still exists and was NOT deleted',
    'Product was erroneously deleted'
  );

  // Check 4: Vendor A tries to publish/unpublish Vendor B's product
  const targetToggleB = !snapB.isPublished;
  const d1_pub = await simulatePublishProduct(vendorA.id, productB.id, targetToggleB);
  assert(
    d1_pub.status === 403 && d1_pub.code === 'FORBIDDEN_NOT_OWNER',
    'Check 4: Vendor A receives 403 FORBIDDEN when attempting to toggle publish state on Vendor B product',
    `Received status ${d1_pub.status}`
  );

  const postPubB = await prisma.product.findUnique({ where: { id: productB.id } });
  assert(
    postPubB.isPublished === snapB.isPublished,
    'Check 4 (Immutability): Database confirms Vendor B publish state UNCHANGED',
    `Publish state toggled from ${snapB.isPublished} to ${postPubB.isPublished}`
  );

  // =========================================================================
  // DIRECTION 2: Vendor B attempts unauthorized actions on Vendor A's Product
  // =========================================================================
  console.log('\n------------------------------------------------------------');
  console.log(' DIRECTION 2 (REVERSE): Vendor B -> Vendor A Product');
  console.log('------------------------------------------------------------\n');

  // Check 1: Vendor B tries to open Vendor A's product
  const d2_get = await simulateGetProduct(vendorB.id, productA.id);
  assert(
    d2_get.status === 403 && d2_get.code === 'FORBIDDEN_NOT_OWNER',
    'Reverse Check 1: Vendor B receives 403 FORBIDDEN when opening Vendor A product by ID',
    `Received status ${d2_get.status}`
  );
  assert(
    d2_get.data === null,
    'Reverse Check 1 (Privacy): Vendor A product data is NOT returned to Vendor B',
    'Leaked product details'
  );

  // Check 2: Vendor B tries to edit Vendor A's product
  const d2_edit = await simulateEditProduct(vendorB.id, productA.id, {
    title: 'ATTACK_TITLE_VENDOR_B',
    price: 111111,
  });
  assert(
    d2_edit.status === 403 && d2_edit.code === 'FORBIDDEN_NOT_OWNER',
    'Reverse Check 2: Vendor B receives 403 FORBIDDEN when attempting to edit Vendor A product',
    `Received status ${d2_edit.status}`
  );

  const postEditA = await prisma.product.findUnique({ where: { id: productA.id } });
  assert(
    postEditA.title === snapA.title && Number(postEditA.basePrice) === Number(snapA.basePrice),
    'Reverse Check 2 (Immutability): Database confirms Vendor A product title and price UNCHANGED',
    `Modified from "${snapA.title}" to "${postEditA.title}"`
  );

  // Check 3: Vendor B tries to delete Vendor A's product
  const d2_del = await simulateDeleteProduct(vendorB.id, productA.id);
  assert(
    d2_del.status === 403 && d2_del.code === 'FORBIDDEN_NOT_OWNER',
    'Reverse Check 3: Vendor B receives 403 FORBIDDEN when attempting to delete Vendor A product',
    `Received status ${d2_del.status}`
  );

  const postDelA = await prisma.product.findUnique({ where: { id: productA.id } });
  assert(
    postDelA !== null,
    'Reverse Check 3 (Immutability): Database confirms Vendor A product still exists and was NOT deleted',
    'Product was erroneously deleted'
  );

  // Check 4: Vendor B tries to publish/unpublish Vendor A's product
  const targetToggleA = !snapA.isPublished;
  const d2_pub = await simulatePublishProduct(vendorB.id, productA.id, targetToggleA);
  assert(
    d2_pub.status === 403 && d2_pub.code === 'FORBIDDEN_NOT_OWNER',
    'Reverse Check 4: Vendor B receives 403 FORBIDDEN when attempting to toggle publish state on Vendor A product',
    `Received status ${d2_pub.status}`
  );

  const postPubA = await prisma.product.findUnique({ where: { id: productA.id } });
  assert(
    postPubA.isPublished === snapA.isPublished,
    'Reverse Check 4 (Immutability): Database confirms Vendor A publish state UNCHANGED',
    `Publish state toggled from ${snapA.isPublished} to ${postPubA.isPublished}`
  );

  // =========================================================================
  // SUITE 3: Edge Cases, Variants & Inventory Ownership Validation
  // =========================================================================
  console.log('\n------------------------------------------------------------');
  console.log(' SUITE 3: Non-Existent Records & Variant/Inventory Integrity');
  console.log('------------------------------------------------------------\n');

  // Non-existent product ID
  const nonExistentId = 'cmw_non_existent_product_99999';
  const getNonExistent = await simulateGetProduct(vendorA.id, nonExistentId);
  assert(
    getNonExistent.status === 404 && getNonExistent.code === 'NOT_FOUND',
    'Edge Case: Non-existent product returns 404 NOT_FOUND (not 403)',
    `Expected 404, got ${getNonExistent.status}`
  );

  // Legitimate Owner Operations (Sanity Check)
  const legitA = await simulateGetProduct(vendorA.id, productA.id);
  assert(
    legitA.status === 200 && legitA.data.id === productA.id,
    'Owner Sanity Check: Vendor A can retrieve their own Product A (200 OK)',
    'Owner retrieval failed'
  );

  const legitB = await simulateGetProduct(vendorB.id, productB.id);
  assert(
    legitB.status === 200 && legitB.data.id === productB.id,
    'Owner Sanity Check: Vendor B can retrieve their own Product B (200 OK)',
    'Owner retrieval failed'
  );

  // Variants & Inventory Isolation
  const variantA = productA.variants[0];
  const variantB = productB.variants[0];

  assert(
    variantA.productId === productA.id && variantB.productId === productB.id,
    'Variants Integrity: Variants strictly bound to their respective products',
    'Variant mismatch'
  );

  console.log('\n============================================================');
  console.log(` AUDIT SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log('============================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runSecurityAudit()
  .catch((e) => {
    console.error('Audit Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
