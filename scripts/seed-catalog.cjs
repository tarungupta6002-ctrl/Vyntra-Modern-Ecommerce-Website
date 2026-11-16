/**
 * Vyntra Marketplace — Catalog Database Seeder
 * Populates Supabase Cloud PostgreSQL with:
 * 1. Approved Vendor Profile & Vendor User
 * 2. Marketplace Categories (Ethnic, Men, Women, Footwear, Watches, Bags)
 * 3. Verified, Published Products with Variants, Images, and Real Inventory
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Vyntra marketplace catalog to Supabase Cloud PostgreSQL...');

  // 1. Create or Find Verified Vendor User & Profile
  const vendorUserId = '00000000-0000-0000-0000-000000000001';
  const vendorUser = await prisma.user.upsert({
    where: { id: vendorUserId },
    update: {
      name: 'Vyntra Master Artisan Guild',
      email: 'guild@vyntra.luxury',
      role: 'VENDOR',
    },
    create: {
      id: vendorUserId,
      email: 'guild@vyntra.luxury',
      name: 'Vyntra Master Artisan Guild',
      phone: '+91 98765 43210',
      role: 'VENDOR',
      tier: 'Master Guild Vendor',
    },
  });

  const vendor = await prisma.vendorProfile.upsert({
    where: { userId: vendorUser.id },
    update: {
      status: 'APPROVED',
      isVerified: true,
      storeName: 'Vyntra Royal Atelier',
      storeSlug: 'vyntra-royal-atelier',
    },
    create: {
      userId: vendorUser.id,
      storeName: 'Vyntra Royal Atelier',
      storeSlug: 'vyntra-royal-atelier',
      storeDescription: 'Direct master weavers, heritage jewelers, and artisanal ateliers across India.',
      status: 'APPROVED',
      isVerified: true,
      rating: 4.95,
      totalSales: 450,
      commissionRate: 10.0,
      bankName: 'HDFC Bank',
      bankAccountLast4: '4821',
      payoutsEnabled: true,
    },
  });

  console.log(`Vendor configured: ${vendor.storeName} (${vendor.id})`);

  // 2. Seed Categories
  const categoriesData = [
    { name: 'Ethnic & Fusion Wear', slug: 'ethnic', description: 'Handcrafted sarees, kurtas, and festive ensembles' },
    { name: "Men's Premium Fashion", slug: 'men', description: 'Tailored bandhgalas, linen shirts, and trousers' },
    { name: "Women's Fashion", slug: 'women', description: 'Designer couture, dresses, and handloom silhouettes' },
    { name: 'Artisanal Footwear', slug: 'footwear', description: 'Kolhapuris, velvet juttis, and leather loafers' },
    { name: 'Horology & Jewels', slug: 'watches', description: 'Heritage mechanical watches and polki jewels' },
    { name: 'Leather & Bags', slug: 'bags', description: 'Full-grain vegetable-tanned totes and weekenders' },
  ];

  const categoryMap = {};
  for (const cat of categoriesData) {
    const saved = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description },
      create: { name: cat.name, slug: cat.slug, description: cat.description },
    });
    categoryMap[cat.slug] = saved.id;
  }
  console.log(`Categories configured: ${Object.keys(categoryMap).join(', ')}`);

  // 3. Seed Core Catalog Products
  const productsToSeed = [
    {
      slug: 'handcrafted-premium-linen-kurta',
      title: 'Handcrafted Premium Linen Kurta & Tapered Trouser Set',
      subtitle: 'Breathable Organic Belgian Flax Linen • Mandarin Collar with Artisanal Horn Buttons',
      description: 'Each kurta is meticulously tailored from pre-shrunk organic European flax linen. Featuring a traditional hand-finished mandarin collar, mother-of-pearl buttons, and tailored tapered trousers with elasticated back waist for unmatched comfort during celebrations.',
      brand: 'Rivaaz Atelier',
      categorySlug: 'ethnic',
      basePrice: 3799,
      discountPrice: 1899,
      rating: 4.8,
      reviewCount: 256,
      images: [
        {
          url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAZY6Rn1sX9zajvu57JMzOmU7lTmvqI-LwLj8FZkGKPKa2fDRcswkkFSPDEu2zQusfLQWUiFp9H4LzwuJYFJbuF9bGPKbWzWd4XagxqkVICEurmu18QQYfHOCl534lDi1BtAdVsfQh39l8Mvx4sE-mOFzw7JsKJkwKtMR1GcEXqC7L8Z5IXFPP91xobDUp-qeMs0I6rAor8wRM1atkC0vFuzXoUFhDnmnOtgVY-ahc',
          altText: 'Front Full Length View of Royal Sapphire Blue Linen Kurta Set',
          isPrimary: true,
          sortOrder: 0,
        },
        {
          url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAizPU8asGDwkPM5H4tqft6XVtkIyCo-CPQTbgzcfssSbW6mNvsZXdWKMskNMo1n4uZtLQQeTmEpgBoroDpYEAzMhRkyto9CwFXmw4Qf5-hLVtESOrXzyn5hKfJwKGFLuhj8Ms2S77dCYAJPPz_Etx0RW4-6-T7_xHs8ZrM_bDOQT8XVYfDsGscpYNZFh8DOoxLd1ag3FOaeahxq2YOCs8QwTlCs2D0wNLxm4z8V-4',
          altText: 'Back View Editorial Angle of Linen Kurta',
          isPrimary: false,
          sortOrder: 1,
        },
      ],
      variants: [
        { sku: 'VYN-LNN-BLU-S', size: 'S', color: 'Royal Sapphire Blue', price: 1899, originalPrice: 3799, stock: 20 },
        { sku: 'VYN-LNN-BLU-M', size: 'M', color: 'Royal Sapphire Blue', price: 1899, originalPrice: 3799, stock: 35 },
        { sku: 'VYN-LNN-BLU-L', size: 'L', color: 'Royal Sapphire Blue', price: 1899, originalPrice: 3799, stock: 25 },
        { sku: 'VYN-LNN-BLU-XL', size: 'XL', color: 'Royal Sapphire Blue', price: 1899, originalPrice: 3799, stock: 15 },
      ],
    },
    {
      slug: 'marigold-lotus-banarasi-saree',
      title: 'Marigold Lotus Pure Katan Silk Banarasi Saree',
      subtitle: 'Woven Mulberry Silk with Hand-Beaten Gold Zari Pallu • Varanasi Master Weavers',
      description: 'Handwoven across 28 days on traditional pit looms in Varanasi, this heirloom saree features authentic kadhwa gold zari floral jaal with marigold lotus motifs along the ornate border. Comes with an unstitched matching pure silk blouse piece.',
      brand: 'Raw Mango Studio',
      categorySlug: 'ethnic',
      basePrice: 8900,
      discountPrice: 4450,
      rating: 4.9,
      reviewCount: 92,
      images: [
        {
          url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDhkQY9ccrO_yJfO00kAPS7cij2WcCxztapIGliwsJ4Hxwe_sSJx9mB6jZUrVdceRI3Nd7wpEvFdd1EyD-ohStKrzrwjfwxFbxmgH8acuGzxMR-cqrUcgkPojwywxYcZv-A25VobYFcJWXvEqDVh_tjfCxlnUcXIxi8rSmli4AJrMi7XAam5tO0M1DKujtp23Km7Cp1Kk7614o579SnCUT5wPpFJ7wQ9Gb9kwM-brQ',
          altText: 'Marigold Lotus Banarasi Saree Pallu Showcase',
          isPrimary: true,
          sortOrder: 0,
        },
      ],
      variants: [
        { sku: 'VYN-SAR-MAR-FREE', size: 'Free Size', color: 'Marigold Gold', price: 4450, originalPrice: 8900, stock: 12 },
      ],
    },
    {
      slug: 'sapphire-sunburst-automatic-watch',
      title: 'Sapphire Sunburst Automatic Heritage Watch',
      subtitle: 'Calibre 8215 Mechanical Movement • 316L Surgical Steel • Exhibition Caseback',
      description: 'Engineered with horological precision. Ultra-slim 40mm surgical grade stainless steel case featuring a mesmerizing guilloche sunburst blue dial, scratch-proof sapphire crystal glass, and 42-hour power reserve automatic movement.',
      brand: 'Titan Edge Heritage',
      categorySlug: 'watches',
      basePrice: 7999,
      discountPrice: 4950,
      rating: 4.9,
      reviewCount: 156,
      images: [
        {
          url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuATrMaBc4zX57UIQPd8u8DNDD9vVnz9GOarZl7D38T74QPxnCSUtoxVds8bY4CpeD4wKfxz2Cbgq0yFAMhLBOMVuk-7GNFs4-g9zk_L5Om9uN_Z5ud2tY3EW1FH-vosq2rxohgmX8oeaiGp4YHIMuDGX_w9FAB78odIK7gYOvEyYo0sm2RQiPsQVZVE2R-EalrS1LcnhRA-Hy26FkWdwaG2KseEDchF8qZl-gIRNl4',
          altText: 'Sapphire Sunburst Automatic Heritage Watch Wrist Profile',
          isPrimary: true,
          sortOrder: 0,
        },
      ],
      variants: [
        { sku: 'VYN-WTC-40MM-BLU', size: '40mm', color: 'Sunburst Sapphire Blue', price: 4950, originalPrice: 7999, stock: 18 },
      ],
    },
    {
      slug: 'artisanal-grain-leather-city-tote',
      title: 'Artisanal Full-Grain Leather City Tote',
      subtitle: '15-Inch Padded Laptop Sleeve • Vegetable-Tanned Tuscan Cowhide • Antique Brass Accents',
      description: 'Handcrafted by third-generation leather guild artisans using chemical-free vegetable tanning that develops a deep bespoke patina over time. Equipped with protective metal feet, reinforced dual carry handles, and a dedicated padded 15-inch laptop compartment.',
      brand: 'Nappa Dori Guild',
      categorySlug: 'bags',
      basePrice: 7200,
      discountPrice: 4800,
      rating: 4.7,
      reviewCount: 78,
      images: [
        {
          url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBlDO8af3327zvpRnhb_ow35Rbb7E0E_BJPmho0MuBJKG4op9QwrcClJJMBoQuUIAkVrFe23MrtuHoSN5wJ2EoSD6Vy1nNHSE_wXIf4aEXNv3dmyXfYPLWyom84wPdF49Wahi9cjRKYXy3NqB8DISxHFUGozS_0tFQoETBSIf8LuTjEPdanuKJ2y3mLFSYaJr2iWxrlsS2h9tX-XwzOD9d12iS3QXvS0qWvasyueZQ',
          altText: 'Artisanal Full-Grain Leather City Tote Studio Angle',
          isPrimary: true,
          sortOrder: 0,
        },
      ],
      variants: [
        { sku: 'VYN-BAG-TOT-BRN', size: 'One Size', color: 'Tuscan Tan', price: 4800, originalPrice: 7200, stock: 24 },
      ],
    },
    {
      slug: 'chanderi-silk-indigo-kurta',
      title: 'Chanderi Silk Indigo Handloom Kurta',
      subtitle: 'Hand-Embroidered Neck Band with Mother-of-Pearl Buttons • Heritage Weave',
      description: 'Woven with gossamer-light pure Chanderi silk and Mercerized cotton yarns. Hand-dyed using organic natural indigo vats with delicate geometric kantha embroidery along the placket.',
      brand: 'Kora Artisanal Living',
      categorySlug: 'ethnic',
      basePrice: 4999,
      discountPrice: 2899,
      rating: 4.8,
      reviewCount: 184,
      images: [
        {
          url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBp8QNfaJ6N6T-1P_87ZgIFORTfLR6SrkSYxxMhUl-duCrXWpTrcoquXU2NZAxOw-y_WfsFVu2xkfg2jDf3rQExN7tGT7exAmCm9PKQvNBsyXv6fLMDg5N6aO1Fj6aYCu0y7w2vcoThS_YxykgN_G0rvyethFf0dPcPh6yMHm-fMUS6D_aEGm8pdFE3azyZbuem9OaiXSW3_77bWjAYJHUtYfm_swngiGyyMnfLFcA',
          altText: 'Chanderi Silk Indigo Handloom Kurta Full View',
          isPrimary: true,
          sortOrder: 0,
        },
      ],
      variants: [
        { sku: 'VYN-CHN-IND-S', size: 'S', color: 'Natural Indigo', price: 2899, originalPrice: 4999, stock: 15 },
        { sku: 'VYN-CHN-IND-M', size: 'M', color: 'Natural Indigo', price: 2899, originalPrice: 4999, stock: 22 },
        { sku: 'VYN-CHN-IND-L', size: 'L', color: 'Natural Indigo', price: 2899, originalPrice: 4999, stock: 18 },
      ],
    },
    {
      slug: 'breezy-terracotta-linen-kurta-shirt',
      title: 'Breezy Terracotta Linen Kurta Shirt',
      subtitle: '100% Pre-Washed European Flax with Side Slits for Summer Ease',
      description: 'A relaxed hybrid between classic band-collar shirt and traditional Indian short kurta. Naturally garment dyed in earthy terracotta hue with subtle slub texture.',
      brand: 'Kora Artisanal Living',
      categorySlug: 'men',
      basePrice: 3499,
      discountPrice: 2199,
      rating: 4.5,
      reviewCount: 110,
      images: [
        {
          url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAL3TzZnKkeKSaKTVKGYBV5O1C24xrosuZSnUa2V5YYQTIOH0Oei-rx5fXW54hjBS090b2xYeJZuAg7XdXwpbBQQnwdGmBJWf2Si0pERLNybvqPuCa8W948EKE8TOH7hj-f-sbkX860N47oQm6AC8iWaByl-IA3Vqw2FjXv6tb-oUXw_7XnKoBzavUuiogXhlkMrDa8G9v1dgR4Tv1GetgOW2ly0vxYjNLo5k3ThRY',
          altText: 'Breezy Terracotta Linen Kurta Shirt Model View',
          isPrimary: true,
          sortOrder: 0,
        },
      ],
      variants: [
        { sku: 'VYN-TER-S', size: 'S', color: 'Terracotta', price: 2199, originalPrice: 3499, stock: 14 },
        { sku: 'VYN-TER-M', size: 'M', color: 'Terracotta', price: 2199, originalPrice: 3499, stock: 25 },
        { sku: 'VYN-TER-L', size: 'L', color: 'Terracotta', price: 2199, originalPrice: 3499, stock: 20 },
      ],
    },
  ];

  for (const item of productsToSeed) {
    const categoryId = categoryMap[item.categorySlug];

    // Upsert Product
    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      update: {
        title: item.title,
        subtitle: item.subtitle,
        description: item.description,
        brand: item.brand,
        basePrice: item.basePrice,
        discountPrice: item.discountPrice,
        isPublished: true,
        rating: item.rating,
        reviewCount: item.reviewCount,
        categoryId,
        vendorId: vendor.id,
      },
      create: {
        slug: item.slug,
        title: item.title,
        subtitle: item.subtitle,
        description: item.description,
        brand: item.brand,
        basePrice: item.basePrice,
        discountPrice: item.discountPrice,
        isPublished: true,
        hasVariants: true,
        rating: item.rating,
        reviewCount: item.reviewCount,
        categoryId,
        vendorId: vendor.id,
      },
    });

    // Delete and recreate images
    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    for (const img of item.images) {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: img.url,
          altText: img.altText,
          isPrimary: img.isPrimary,
          sortOrder: img.sortOrder,
        },
      });
    }

    // Upsert variants and inventories
    for (const v of item.variants) {
      const variant = await prisma.productVariant.upsert({
        where: { sku: v.sku },
        update: {
          size: v.size,
          color: v.color,
          price: v.price,
          originalPrice: v.originalPrice,
          productId: product.id,
        },
        create: {
          productId: product.id,
          sku: v.sku,
          size: v.size,
          color: v.color,
          price: v.price,
          originalPrice: v.originalPrice,
        },
      });

      // Composite unique constraint: @@unique([vendorId, sku])
      await prisma.productInventory.upsert({
        where: {
          vendorId_sku: {
            vendorId: vendor.id,
            sku: v.sku,
          },
        },
        update: {
          quantity: v.stock,
          reservedQuantity: 0,
        },
        create: {
          productId: product.id,
          variantId: variant.id,
          vendorId: vendor.id,
          sku: v.sku,
          quantity: v.stock,
          reservedQuantity: 0,
          warehouseLocation: 'Mumbai Central Hub',
        },
      });
    }

    console.log(`Product seeded successfully: ${product.title} (slug: ${product.slug})`);
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((err) => {
    console.error('Seeding error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
