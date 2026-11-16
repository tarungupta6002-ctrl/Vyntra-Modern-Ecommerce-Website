/**
 * Vyntra Marketplace - Hierarchical Category Taxonomy Seeder
 * Target: localhost:5433/vyntra_dev
 * 
 * Safely and idempotently establishes parent-child category relationships
 * supporting the approved Return, Refund & Exchange Policy.
 */
const { PrismaClient } = require('d:/Vyntra/node_modules/@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/vyntra_dev?schema=public' } },
});

async function main() {
  console.log('Seeding hierarchical category taxonomy on localhost:5433...');

  // 1. Root Categories
  const roots = [
    { name: 'Ethnic & Fusion Wear', slug: 'ethnic', description: 'Handcrafted sarees, kurtas, and festive ensembles' },
    { name: "Men's Premium Fashion", slug: 'men', description: 'Tailored bandhgalas, linen shirts, and trousers' },
    { name: "Women's Fashion", slug: 'women', description: 'Designer couture, dresses, and handloom silhouettes' },
    { name: 'Artisanal Footwear', slug: 'footwear', description: 'Kolhapuris, velvet juttis, and leather loafers' },
    { name: 'Horology & Jewels', slug: 'watches', description: 'Heritage mechanical watches and fine jewels' },
    { name: 'Leather & Bags', slug: 'bags', description: 'Full-grain vegetable-tanned totes and weekenders' },
    { name: 'Beauty & Fragrance', slug: 'beauty', description: 'Artisanal fragrances and botanical wellness' },
  ];

  const rootMap = {};
  for (const r of roots) {
    const saved = await prisma.category.upsert({
      where: { slug: r.slug },
      update: { name: r.name, description: r.description },
      create: { name: r.name, slug: r.slug, description: r.description },
    });
    rootMap[r.slug] = saved.id;
  }

  // 2. Subcategories with Parent Linkages
  const subcategories = [
    // Ethnic & Fusion
    { name: "Men's Ethnic Wear", slug: 'mens-ethnic', parentSlug: 'ethnic' },
    { name: "Women's Ethnic Wear", slug: 'womens-ethnic', parentSlug: 'ethnic' },
    { name: 'Customized Apparel', slug: 'customized-apparel', parentSlug: 'ethnic' }, // Non-returnable
    
    // Men's Fashion
    { name: "Men's Clothing", slug: 'mens-clothing', parentSlug: 'men' },
    { name: "Men's Innerwear", slug: 'mens-innerwear', parentSlug: 'men' }, // Non-returnable
    
    // Women's Fashion
    { name: "Women's Clothing", slug: 'womens-clothing', parentSlug: 'women' },
    { name: "Women's Innerwear", slug: 'womens-innerwear', parentSlug: 'women' }, // Non-returnable
    { name: "Women's Swimwear", slug: 'womens-swimwear', parentSlug: 'women' }, // Non-returnable

    // Footwear
    { name: "Men's Footwear", slug: 'mens-footwear', parentSlug: 'footwear' },
    { name: "Women's Footwear", slug: 'womens-footwear', parentSlug: 'footwear' },
    { name: "Kids' Footwear", slug: 'kids-footwear', parentSlug: 'footwear' },

    // Horology & Jewels
    { name: 'Luxury Watches', slug: 'luxury-watches', parentSlug: 'watches' },
    { name: 'Non-pierced Jewellery', slug: 'non-pierced-jewellery', parentSlug: 'watches' },
    { name: 'Pierced Jewellery', slug: 'pierced-jewellery', parentSlug: 'watches' }, // Non-returnable
    { name: 'Pierced Jewelry (Alias)', slug: 'pierced-jewelry', parentSlug: 'watches' }, // Canonical alias

    // Leather & Bags
    { name: 'Handbags', slug: 'handbags', parentSlug: 'bags' },
    { name: 'Backpacks', slug: 'backpacks', parentSlug: 'bags' },
    { name: 'Wallets', slug: 'wallets', parentSlug: 'bags' },
    { name: 'Travel Bags', slug: 'travel-bags', parentSlug: 'bags' },

    // Beauty
    { name: 'Perfumery', slug: 'perfumery', parentSlug: 'beauty' }, // Non-returnable
    { name: 'Personal Hygiene', slug: 'personal-hygiene', parentSlug: 'beauty' }, // Non-returnable
    { name: 'Cosmetics', slug: 'cosmetics', parentSlug: 'beauty' }, // Non-returnable
  ];

  for (const sub of subcategories) {
    const parentId = rootMap[sub.parentSlug];
    await prisma.category.upsert({
      where: { slug: sub.slug },
      update: { name: sub.name, parentId },
      create: { name: sub.name, slug: sub.slug, parentId },
    });
  }

  console.log(`Successfully seeded ${roots.length} roots and ${subcategories.length} subcategories.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
