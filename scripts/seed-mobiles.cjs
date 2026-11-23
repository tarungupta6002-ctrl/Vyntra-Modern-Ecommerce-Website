/**
 * Vyntra Marketplace — Seed Dedicated Mobiles & Smartphones
 * Inserts category 'mobiles' under 'electronics' and seeds authentic smartphones
 * across Apple, Samsung, OnePlus, Xiaomi, Redmi, Realme, Motorola, Nothing, Vivo, OPPO
 * into Supabase Cloud PostgreSQL.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const MOBILE_PRODUCTS = [
  {
    slug: 'apple-iphone-15-128gb-black',
    title: 'Apple iPhone 15 (128 GB) - Black',
    subtitle: 'Dynamic Island • 48MP Main Camera • A16 Bionic Chip • USB-C with All-Day Battery',
    brand: 'Apple',
    basePrice: 79900,
    discountPrice: 65999,
    rating: 0,
    reviewCount: 0,
    badge: 'New Launch',
    badgeVariant: 'primary',
    image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=900&q=80',
    images: [
      'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=900&q=80',
    ],
    specs: [
      { label: 'RAM', value: '6 GB' },
      { label: 'Storage', value: '128 GB' },
      { label: 'Network', value: '5G' },
      { label: 'Battery', value: '3349 mAh' },
      { label: 'Screen Size', value: '6.1 inch' },
      { label: 'Display', value: 'Super Retina XDR OLED' },
      { label: 'Processor', value: 'A16 Bionic chip' },
      { label: 'Primary Camera', value: '48MP Dual Camera System' },
    ],
    variants: [
      { sku: 'APL-IP15-128-BLK', size: '128 GB', color: 'Black', price: 65999, originalPrice: 79900 },
      { sku: 'APL-IP15-256-BLK', size: '256 GB', color: 'Black', price: 75999, originalPrice: 89900 },
      { sku: 'APL-IP15-128-BLU', size: '128 GB', color: 'Blue', price: 65999, originalPrice: 79900 },
    ],
  },
  {
    slug: 'samsung-galaxy-s24-5g-onyx-black',
    title: 'Samsung Galaxy S24 5G (8GB RAM, 256GB Storage) - Onyx Black',
    subtitle: 'Galaxy AI is Here • Circle to Search • 50MP Pro-Visual Engine • 4000mAh Battery',
    brand: 'Samsung',
    basePrice: 79999,
    discountPrice: 64999,
    rating: 0,
    reviewCount: 0,
    badge: 'New Launch',
    badgeVariant: 'secondary',
    image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&w=900&q=80',
    images: [
      'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=900&q=80',
    ],
    specs: [
      { label: 'RAM', value: '8 GB' },
      { label: 'Storage', value: '256 GB' },
      { label: 'Network', value: '5G' },
      { label: 'Battery', value: '4000 mAh' },
      { label: 'Screen Size', value: '6.2 inch' },
      { label: 'Display', value: 'Dynamic AMOLED 2X, 120Hz' },
      { label: 'Processor', value: 'Snapdragon 8 Gen 3' },
      { label: 'Primary Camera', value: '50MP + 12MP + 10MP Triple OIS' },
    ],
    variants: [
      { sku: 'SAM-S24-256-BLK', size: '8GB + 256GB', color: 'Onyx Black', price: 64999, originalPrice: 79999 },
      { sku: 'SAM-S24-512-BLK', size: '8GB + 512GB', color: 'Onyx Black', price: 74999, originalPrice: 89999 },
      { sku: 'SAM-S24-256-GRY', size: '8GB + 256GB', color: 'Marble Gray', price: 64999, originalPrice: 79999 },
    ],
  },
  {
    slug: 'oneplus-12r-5g-cool-blue',
    title: 'OnePlus 12R 5G (16GB RAM, 256GB Storage) - Cool Blue',
    subtitle: 'Snapdragon 8 Gen 2 • 100W SUPERVOOC • 5500 mAh Largest Battery • 4th Gen LTPO 120Hz',
    brand: 'OnePlus',
    basePrice: 45999,
    discountPrice: 42999,
    rating: 0,
    reviewCount: 0,
    badge: 'New Launch',
    badgeVariant: 'accent',
    image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=900&q=80',
    images: [
      'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=900&q=80',
    ],
    specs: [
      { label: 'RAM', value: '16 GB' },
      { label: 'Storage', value: '256 GB' },
      { label: 'Network', value: '5G' },
      { label: 'Battery', value: '5500 mAh' },
      { label: 'Screen Size', value: '6.78 inch' },
      { label: 'Display', value: '1.5K 120Hz ProXDR AMOLED' },
      { label: 'Processor', value: 'Qualcomm Snapdragon 8 Gen 2' },
      { label: 'Primary Camera', value: '50MP Sony IMX890 with OIS' },
    ],
    variants: [
      { sku: 'OP-12R-16-256-BLU', size: '16GB + 256GB', color: 'Cool Blue', price: 42999, originalPrice: 45999 },
      { sku: 'OP-12R-8-128-GRY', size: '8GB + 128GB', color: 'Iron Gray', price: 39999, originalPrice: 42999 },
    ],
  },
  {
    slug: 'xiaomi-14-5g-jade-green',
    title: 'Xiaomi 14 (12GB RAM, 512GB Storage) - Jade Green',
    subtitle: 'Leica Professional Optics • Snapdragon 8 Gen 3 • 90W HyperCharge • 50MP Triple Leica',
    brand: 'Xiaomi',
    basePrice: 79999,
    discountPrice: 69999,
    rating: 0,
    reviewCount: 0,
    badge: 'New Launch',
    badgeVariant: 'primary',
    image: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=900&q=80',
    images: [
      'https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=900&q=80',
    ],
    specs: [
      { label: 'RAM', value: '12 GB' },
      { label: 'Storage', value: '512 GB' },
      { label: 'Network', value: '5G' },
      { label: 'Battery', value: '4610 mAh' },
      { label: 'Screen Size', value: '6.36 inch' },
      { label: 'Display', value: '1.5K 120Hz LTPO OLED' },
      { label: 'Processor', value: 'Snapdragon 8 Gen 3' },
      { label: 'Primary Camera', value: '50MP Leica Summilux Lens' },
    ],
    variants: [
      { sku: 'XIA-14-12-512-GRN', size: '12GB + 512GB', color: 'Jade Green', price: 69999, originalPrice: 79999 },
      { sku: 'XIA-14-12-512-BLK', size: '12GB + 512GB', color: 'Black', price: 69999, originalPrice: 79999 },
    ],
  },
  {
    slug: 'redmi-note-13-pro-plus-5g-fusion-black',
    title: 'Redmi Note 13 Pro+ 5G (12GB RAM, 256GB Storage) - Fusion Black',
    subtitle: '200MP OIS Camera • 120W HyperCharge • IP68 Water Resistance • 3D Curved AMOLED',
    brand: 'Redmi',
    basePrice: 33999,
    discountPrice: 29999,
    rating: 0,
    reviewCount: 0,
    badge: 'New Launch',
    badgeVariant: 'accent',
    image: 'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?auto=format&fit=crop&w=900&q=80',
    images: [
      'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?auto=format&fit=crop&w=900&q=80',
    ],
    specs: [
      { label: 'RAM', value: '12 GB' },
      { label: 'Storage', value: '256 GB' },
      { label: 'Network', value: '5G' },
      { label: 'Battery', value: '5000 mAh' },
      { label: 'Screen Size', value: '6.67 inch' },
      { label: 'Display', value: '1.5K 120Hz 3D Curved AMOLED' },
      { label: 'Processor', value: 'MediaTek Dimensity 7200 Ultra' },
      { label: 'Primary Camera', value: '200MP Ultra-Clear Camera with OIS' },
    ],
    variants: [
      { sku: 'RED-N13P-12-256-BLK', size: '12GB + 256GB', color: 'Fusion Black', price: 29999, originalPrice: 33999 },
      { sku: 'RED-N13P-8-256-PUR', size: '8GB + 256GB', color: 'Fusion Purple', price: 27999, originalPrice: 31999 },
    ],
  },
  {
    slug: 'realme-12-pro-5g-submarine-blue',
    title: 'Realme 12 Pro 5G (8GB RAM, 128GB Storage) - Submarine Blue',
    subtitle: '32MP 2X Telephoto Portrait • Luxury Watch Design • 67W SUPERVOOC • 120Hz Curved AMOLED',
    brand: 'Realme',
    basePrice: 25999,
    discountPrice: 21999,
    rating: 0,
    reviewCount: 0,
    badge: 'New Launch',
    badgeVariant: 'secondary',
    image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=900&q=80',
    images: [
      'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=900&q=80',
    ],
    specs: [
      { label: 'RAM', value: '8 GB' },
      { label: 'Storage', value: '128 GB' },
      { label: 'Network', value: '5G' },
      { label: 'Battery', value: '5000 mAh' },
      { label: 'Screen Size', value: '6.7 inch' },
      { label: 'Display', value: 'FHD+ 120Hz Curved Vision' },
      { label: 'Processor', value: 'Snapdragon 6 Gen 1' },
      { label: 'Primary Camera', value: '50MP Sony IMX882 OIS' },
    ],
    variants: [
      { sku: 'RLM-12P-8-128-BLU', size: '8GB + 128GB', color: 'Submarine Blue', price: 21999, originalPrice: 25999 },
      { sku: 'RLM-12P-8-256-BEI', size: '8GB + 256GB', color: 'Navigator Beige', price: 23999, originalPrice: 27999 },
    ],
  },
  {
    slug: 'motorola-edge-50-pro-5g-luxe-lavender',
    title: 'Motorola Edge 50 Pro 5G (12GB RAM, 256GB Storage) - Luxe Lavender',
    subtitle: 'World 1st Pantone Validated Display & Camera • 125W TurboPower • IP68 Underwater Protection',
    brand: 'Motorola',
    basePrice: 35999,
    discountPrice: 29999,
    rating: 0,
    reviewCount: 0,
    badge: 'New Launch',
    badgeVariant: 'primary',
    image: 'https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?auto=format&fit=crop&w=900&q=80',
    images: [
      'https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?auto=format&fit=crop&w=900&q=80',
    ],
    specs: [
      { label: 'RAM', value: '12 GB' },
      { label: 'Storage', value: '256 GB' },
      { label: 'Network', value: '5G' },
      { label: 'Battery', value: '4500 mAh' },
      { label: 'Screen Size', value: '6.7 inch' },
      { label: 'Display', value: '1.5K 144Hz True Color pOLED' },
      { label: 'Processor', value: 'Snapdragon 7 Gen 3' },
      { label: 'Primary Camera', value: '50MP AI-powered Triple Camera' },
    ],
    variants: [
      { sku: 'MOT-E50P-12-256-LAV', size: '12GB + 256GB', color: 'Luxe Lavender', price: 29999, originalPrice: 35999 },
      { sku: 'MOT-E50P-8-256-BLK', size: '8GB + 256GB', color: 'Black Beauty', price: 27999, originalPrice: 33999 },
    ],
  },
  {
    slug: 'nothing-phone-2a-5g-white',
    title: 'Nothing Phone (2a) 5G (8GB RAM, 128GB Storage) - White',
    subtitle: 'Iconic Glyph Interface • Custom Dimensity 7200 Pro • 50MP Dual Camera • Nothing OS 2.5',
    brand: 'Nothing',
    basePrice: 25999,
    discountPrice: 23999,
    rating: 0,
    reviewCount: 0,
    badge: 'New Launch',
    badgeVariant: 'secondary',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80',
    images: [
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80',
    ],
    specs: [
      { label: 'RAM', value: '8 GB' },
      { label: 'Storage', value: '128 GB' },
      { label: 'Network', value: '5G' },
      { label: 'Battery', value: '5000 mAh' },
      { label: 'Screen Size', value: '6.7 inch' },
      { label: 'Display', value: 'FHD+ 120Hz Flexible AMOLED' },
      { label: 'Processor', value: 'MediaTek Dimensity 7200 Pro' },
      { label: 'Primary Camera', value: '50MP Main OIS + 50MP Ultra-Wide' },
    ],
    variants: [
      { sku: 'NOT-P2A-8-128-WHT', size: '8GB + 128GB', color: 'White', price: 23999, originalPrice: 25999 },
      { sku: 'NOT-P2A-12-256-BLK', size: '12GB + 256GB', color: 'Black', price: 27999, originalPrice: 29999 },
    ],
  },
  {
    slug: 'vivo-v30-5g-classic-black',
    title: 'Vivo V30 5G (8GB RAM, 128GB Storage) - Classic Black',
    subtitle: 'Studio-Quality Smart Aura Light • 50MP Eye AF Selfie • Snapdragon 7 Gen 3 • 80W FlashCharge',
    brand: 'Vivo',
    basePrice: 33999,
    discountPrice: 30999,
    rating: 0,
    reviewCount: 0,
    badge: 'New Launch',
    badgeVariant: 'accent',
    image: 'https://images.unsplash.com/photo-1567581935884-3349723552ca?auto=format&fit=crop&w=900&q=80',
    images: [
      'https://images.unsplash.com/photo-1567581935884-3349723552ca?auto=format&fit=crop&w=900&q=80',
    ],
    specs: [
      { label: 'RAM', value: '8 GB' },
      { label: 'Storage', value: '128 GB' },
      { label: 'Network', value: '5G' },
      { label: 'Battery', value: '5000 mAh' },
      { label: 'Screen Size', value: '6.78 inch' },
      { label: 'Display', value: '1.5K 120Hz 3D Curved AMOLED' },
      { label: 'Processor', value: 'Snapdragon 7 Gen 3' },
      { label: 'Primary Camera', value: '50MP VCS True Color OIS + 50MP AF' },
    ],
    variants: [
      { sku: 'VIV-V30-8-128-BLK', size: '8GB + 128GB', color: 'Classic Black', price: 30999, originalPrice: 33999 },
      { sku: 'VIV-V30-12-256-BLU', size: '12GB + 256GB', color: 'Andaman Blue', price: 33999, originalPrice: 37999 },
    ],
  },
  {
    slug: 'oppo-reno-11-pro-5g-pearl-white',
    title: 'OPPO Reno 11 Pro 5G (12GB RAM, 256GB Storage) - Pearl White',
    subtitle: '32MP Telephoto Portrait • 80W SUPERVOOC • MediaTek Dimensity 8200 • ColorOS 14',
    brand: 'OPPO',
    basePrice: 39999,
    discountPrice: 35999,
    rating: 0,
    reviewCount: 0,
    badge: 'New Launch',
    badgeVariant: 'secondary',
    image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=900&q=80',
    images: [
      'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=900&q=80',
    ],
    specs: [
      { label: 'RAM', value: '12 GB' },
      { label: 'Storage', value: '256 GB' },
      { label: 'Network', value: '5G' },
      { label: 'Battery', value: '4600 mAh' },
      { label: 'Screen Size', value: '6.7 inch' },
      { label: 'Display', value: '120Hz 3D Curved OLED' },
      { label: 'Processor', value: 'MediaTek Dimensity 8200' },
      { label: 'Primary Camera', value: '50MP Sony Flagship with OIS' },
    ],
    variants: [
      { sku: 'OPP-R11P-12-256-WHT', size: '12GB + 256GB', color: 'Pearl White', price: 35999, originalPrice: 39999 },
      { sku: 'OPP-R11P-12-256-GRY', size: '12GB + 256GB', color: 'Wave Green', price: 35999, originalPrice: 39999 },
    ],
  },
];

async function main() {
  console.log('Seeding Mobiles category and authentic smartphones...');

  // 1. Find or create electronics parent category
  let electronicsCat = await prisma.category.findUnique({
    where: { slug: 'electronics' },
  });

  if (!electronicsCat) {
    electronicsCat = await prisma.category.create({
      data: {
        name: 'Electronics & Smart Gadgets',
        slug: 'electronics',
        description: 'Personal tech, audio engineering, smart gadgets, and appliances',
      },
    });
  }

  // 2. Upsert child category 'mobiles'
  const mobilesCat = await prisma.category.upsert({
    where: { slug: 'mobiles' },
    update: {
      name: 'Mobiles & Smartphones',
      description: 'Discover the latest flagship smartphones, 5G devices, and budget-friendly mobiles',
      parentId: electronicsCat.id,
    },
    create: {
      name: 'Mobiles & Smartphones',
      slug: 'mobiles',
      description: 'Discover the latest flagship smartphones, 5G devices, and budget-friendly mobiles',
      parentId: electronicsCat.id,
    },
  });

  console.log(`Category configured: ${mobilesCat.name} (${mobilesCat.id}), parent: ${electronicsCat.slug}`);

  // 3. Find an approved vendor
  let vendor = await prisma.vendorProfile.findFirst({
    where: { status: 'APPROVED' },
  });

  if (!vendor) {
    throw new Error('No approved vendor found to associate mobile products.');
  }

  console.log(`Using approved vendor: ${vendor.storeName} (${vendor.id})`);

  // 4. Seed Products
  for (const item of MOBILE_PRODUCTS) {
    const descriptionJson = JSON.stringify({
      plainDescription: item.subtitle,
      specs: item.specs,
      highlights: [
        `${item.specs.find((s) => s.label === 'Display')?.value || 'High Refresh Rate Display'}`,
        `${item.specs.find((s) => s.label === 'Processor')?.value || 'Advanced Next-Gen Processor'}`,
        `${item.specs.find((s) => s.label === 'Battery')?.value || 'Long-lasting battery with Fast Charging'}`,
        `${item.specs.find((s) => s.label === 'Primary Camera')?.value || 'High-Resolution Camera with OIS'}`,
        '100% Genuine with Manufacturer Warranty',
        '7 Days Replacement / Return Window under Vyntra Trust Guarantee',
      ],
      aplus: {
        headerTitle: `${item.brand.toUpperCase()} OFFICIAL MARKETPLACE STORE`,
        headerSubtitle: item.subtitle,
        headerStyle: 'clean_minimal',
        modules: [
          {
            id: `mod-hero-${item.slug}`,
            type: 'hero_banner',
            title: item.title,
            subtitle: item.subtitle,
            imageUrl: item.image,
            badgeText: 'AUTHENTIC HARDWARE',
          },
        ],
      },
    });

    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      update: {
        title: item.title,
        subtitle: item.subtitle,
        description: descriptionJson,
        brand: item.brand,
        basePrice: item.basePrice,
        discountPrice: item.discountPrice,
        hasVariants: true,
        isPublished: true,
        rating: item.rating,
        reviewCount: item.reviewCount,
        categoryId: mobilesCat.id,
        vendorId: vendor.id,
      },
      create: {
        slug: item.slug,
        title: item.title,
        subtitle: item.subtitle,
        description: descriptionJson,
        brand: item.brand,
        basePrice: item.basePrice,
        discountPrice: item.discountPrice,
        hasVariants: true,
        isPublished: true,
        rating: item.rating,
        reviewCount: item.reviewCount,
        categoryId: mobilesCat.id,
        vendorId: vendor.id,
      },
    });

    // Images
    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    for (let i = 0; i < item.images.length; i++) {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: item.images[i],
          altText: `${item.title} - Angle ${i + 1}`,
          isPrimary: i === 0,
          sortOrder: i,
        },
      });
    }

    // Variants & Inventory
    await prisma.productVariant.deleteMany({ where: { productId: product.id } });
    for (const v of item.variants) {
      const variant = await prisma.productVariant.create({
        data: {
          productId: product.id,
          sku: v.sku,
          size: v.size,
          color: v.color,
          price: v.price,
          originalPrice: v.originalPrice,
          imageUrl: item.image,
        },
      });

      await prisma.productInventory.create({
        data: {
          productId: product.id,
          variantId: variant.id,
          vendorId: vendor.id,
          sku: v.sku,
          quantity: 25,
          reservedQuantity: 0,
          lowStockThreshold: 5,
          warehouseLocation: 'Bengaluru Tech Fulfillment Hub',
        },
      });
    }

    console.log(`  ✓ Seeded: ${product.brand} - ${product.title}`);
  }

  console.log(`\nSuccessfully seeded ${MOBILE_PRODUCTS.length} mobile products!`);
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
