import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CategorySeedDef {
  name: string;
  slug: string;
  description: string;
  parentSlug?: string;
  existingId?: string; // Preserve specific existing IDs
}

export const PARENT_CATEGORIES: CategorySeedDef[] = [
  // Preserved Existing Parents (6)
  {
    name: 'Ethnic & Fusion Wear',
    slug: 'ethnic',
    description: 'Handcrafted sarees, kurtas, and festive ensembles',
    existingId: 'cmw8q2oht0002bvk055lwyx6a',
  },
  {
    name: "Women's Fashion",
    slug: 'women',
    description: 'Designer couture, lingerie, innerwear, and sleepwear',
    existingId: 'cmw8q2oyr0004bvk0qq1es2xj',
  },
  {
    name: "Men's Premium Fashion",
    slug: 'men',
    description: 'Tailored bandhgalas, silk kurtas, and premium innerwear',
    existingId: 'cmw8q2oqg0003bvk0xpthp5fk',
  },
  {
    name: 'Artisanal Footwear',
    slug: 'footwear',
    description: 'Kolhapuris, velvet juttis, and leather loafers',
    existingId: 'cmw8q2p6x0005bvk07owathb7',
  },
  {
    name: 'Horology & Jewels',
    slug: 'watches',
    description: 'Heritage mechanical watches, automatic horology, and collector timepieces',
    existingId: 'cmw8q2pfo0006bvk09a3dg9pz',
  },
  {
    name: 'Leather & Bags',
    slug: 'bags',
    description: 'Full-grain vegetable-tanned totes, wallets, and weekenders',
    existingId: 'cmw8q2pnv0007bvk0n7yqj06e',
  },

  // Separate & Newly Approved Parents (6)
  {
    name: 'Western & Casual Wear',
    slug: 'western-casual',
    description: 'Contemporary dresses, tailored linen shirts, trousers, and fusion silhouettes',
  },
  {
    name: 'Jewelry & Accessories',
    slug: 'jewelry-accessories',
    description: 'Artisanal fine jewelry, luxury watches, polki, kundan, and statement accessories',
  },
  {
    name: 'Electronics & Smart Gadgets',
    slug: 'electronics',
    description: 'High-performance audio, acoustics, smartwatches, and lifestyle wearables',
  },
  {
    name: 'Home, Kitchen & Living',
    slug: 'home-living',
    description: 'Artisanal decor, luxury bedding, and brass/copper/kansa utensils',
  },
  {
    name: 'Beauty & Personal Care',
    slug: 'beauty-wellness',
    description: 'Artisanal luxury perfumes, organic wellness attars, and ayurvedic skincare',
  },
  {
    name: 'Kids & Infants',
    slug: 'kids',
    description: 'Festive apparel, organic cotton basics, and essentials for children',
  },
];

export const SUBCATEGORIES: CategorySeedDef[] = [
  // 1. Under "Ethnic & Fusion Wear" (slug: ethnic) [4]
  {
    name: 'Handloom & Silk Sarees',
    slug: 'sarees',
    description: 'Banarasi, Kanjivaram, Chanderi, and pure Mulberry silk sarees',
    parentSlug: 'ethnic',
  },
  {
    name: 'Kurtas, Suits & Anarkalis',
    slug: 'kurtas-suits',
    description: "Women's traditional and contemporary ethnic suit sets",
    parentSlug: 'ethnic',
  },
  {
    name: 'Lehengas & Festive Ensembles',
    slug: 'lehengas-festive',
    description: 'Bridal couture and festive handcrafted lehengas',
    parentSlug: 'ethnic',
  },
  {
    name: 'Dupattas, Shawls & Stoles',
    slug: 'dupattas-shawls',
    description: 'Handwoven Pashmina, Banarasi, and Phulkari dupattas',
    parentSlug: 'ethnic',
  },

  // 2. Under "Women's Fashion" (slug: women) [4]
  {
    name: 'Bras & Bralettes',
    slug: 'bras-bralettes',
    description: 'Everyday cotton, t-shirt, sports, and padded comfort bras',
    parentSlug: 'women',
  },
  {
    name: 'Panties & Briefs',
    slug: 'panties-briefs',
    description: 'Seamless, hipster, bikini, and organic cotton briefs',
    parentSlug: 'women',
  },
  {
    name: 'Saree Shapewear & Slips',
    slug: 'saree-shapewear-slips',
    description: 'Mermaid saree shapewear, petticoats, and inner slips',
    parentSlug: 'women',
  },
  {
    name: 'Nightwear, Pajamas & Loungewear',
    slug: 'womens-nightwear-loungewear',
    description: 'Cotton nighties, loungewear pajama sets, and robes',
    parentSlug: 'women',
  },

  // 3. Under "Men's Premium Fashion" (slug: men) [4]
  {
    name: 'Kurtas, Sherwanis & Nehru Jackets',
    slug: 'mens-kurtas-sherwanis',
    description: "Men's silk kurtas, tailored bandhgalas, and Modi jackets",
    parentSlug: 'men',
  },
  {
    name: "Men's Briefs & Trunks",
    slug: 'mens-briefs-trunks',
    description: 'Breathable combed cotton briefs and square-cut trunks',
    parentSlug: 'men',
  },
  {
    name: 'Boxers & Loungewear Shorts',
    slug: 'mens-boxers-shorts',
    description: 'Woven cotton boxer shorts and relaxed lounge shorts',
    parentSlug: 'men',
  },
  {
    name: 'Vests & Undershirts',
    slug: 'mens-vests-undershirts',
    description: 'Sleeveless ribbed undershirts and gym vests',
    parentSlug: 'men',
  },

  // 4. Under "Western & Casual Wear" (slug: western-casual) [2]
  {
    name: "Women's Western & Fusion Wear",
    slug: 'womens-western-fusion',
    description: 'Dresses, tops, trousers, and contemporary fusion silhouettes',
    parentSlug: 'western-casual',
  },
  {
    name: "Men's Shirts & Trousers",
    slug: 'mens-shirts-trousers',
    description: 'Pure linen shirts, formal button-downs, and tailored trousers',
    parentSlug: 'western-casual',
  },

  // 5. Under "Jewelry & Accessories" (slug: jewelry-accessories) [2]
  {
    name: 'Heritage & Fine Jewelry',
    slug: 'heritage-fine-jewelry',
    description: 'Polki, Kundan, Temple, and sterling silver artisan jewelry',
    parentSlug: 'jewelry-accessories',
  },
  {
    name: 'Watches & Luxury Accessories',
    slug: 'watches-luxury-accessories',
    description: 'Designer wristwatches, artisanal cufflinks, brooches, and accessories',
    parentSlug: 'jewelry-accessories',
  },

  // 6. Under "Artisanal Footwear" (slug: footwear) [2]
  {
    name: 'Artisanal Juttis & Mojris',
    slug: 'artisanal-juttis-mojris',
    description: 'Hand-embroidered Punjabi juttis and leather Kolhapuris',
    parentSlug: 'footwear',
  },
  {
    name: 'Formal & Casual Shoes',
    slug: 'formal-casual-shoes',
    description: 'Handcrafted leather loafers, dress shoes, and casual sneakers',
    parentSlug: 'footwear',
  },

  // 7. Under "Horology & Jewels" (slug: watches) [2]
  {
    name: 'Luxury Mechanical & Automatic Watches',
    slug: 'luxury-mechanical-watches',
    description: 'High-precision automatic, skeleton, and complications timepieces',
    parentSlug: 'watches',
  },
  {
    name: 'Collector & Pocket Timepieces',
    slug: 'collector-vintage-timepieces',
    description: 'Heritage pocket watches, desk clocks, and artisanal horological creations',
    parentSlug: 'watches',
  },

  // 8. Under "Leather & Bags" (slug: bags) [2]
  {
    name: 'Handcrafted Leather Totes & Bags',
    slug: 'leather-totes-bags',
    description: 'Full-grain leather tote bags, shoulder bags, and weekenders',
    parentSlug: 'bags',
  },
  {
    name: 'Wallets, Belts & Small Leather Goods',
    slug: 'wallets-belts-accessories',
    description: 'Artisanal leather wallets, cardholders, and brass-buckle belts',
    parentSlug: 'bags',
  },

  // 9. Under "Electronics & Smart Gadgets" (slug: electronics) [2]
  {
    name: 'Audio, Earbuds & Headphones',
    slug: 'audio-headphones',
    description: 'True wireless stereo earbuds, studio monitor headphones, and speakers',
    parentSlug: 'electronics',
  },
  {
    name: 'Smartwatches & Wearables',
    slug: 'smartwatches-wearables',
    description: 'Fitness trackers, AMOLED smartwatches, and health bands',
    parentSlug: 'electronics',
  },

  // 10. Under "Home, Kitchen & Living" (slug: home-living) [2]
  {
    name: 'Home Decor & Handcrafted Bedding',
    slug: 'home-decor-bedding',
    description: 'Hand-block printed bedsheets, cushion covers, and throws',
    parentSlug: 'home-living',
  },
  {
    name: 'Brass, Copper & Kansa Utensils',
    slug: 'brass-copper-kansa-utensils',
    description: 'Traditional handcrafted pure brass, copper, and bronze kitchenware',
    parentSlug: 'home-living',
  },

  // 11. Under "Beauty & Personal Care" (slug: beauty-wellness) [2]
  {
    name: 'Luxury Perfumes & Artisanal Attars',
    slug: 'luxury-perfumes-attars',
    description: 'Distilled Kannauj attars, botanical perfumes, and pure oudh',
    parentSlug: 'beauty-wellness',
  },
  {
    name: 'Ayurvedic & Organic Skincare',
    slug: 'ayurvedic-skincare',
    description: 'Pure saffron kumkumadi oils, ubtans, and herbal cleansers',
    parentSlug: 'beauty-wellness',
  },

  // 12. Under "Kids & Infants" (slug: kids) [3]
  {
    name: 'Boys Ethnic & Casual Wear',
    slug: 'boys-apparel',
    description: "Boys' kurtas, cotton shirts, and comfortable festive wear",
    parentSlug: 'kids',
  },
  {
    name: 'Girls Ethnic & Party Wear',
    slug: 'girls-apparel',
    description: "Girls' lehenga cholis, frocks, and ethnic festive dresses",
    parentSlug: 'kids',
  },
  {
    name: 'Infant & Baby Essentials',
    slug: 'infant-baby-essentials',
    description: 'Pure organic cotton infant rompers, swaddles, and clothing sets',
    parentSlug: 'kids',
  },
];

/**
 * Idempotent upsert function:
 * Safe to run multiple times without duplicating or overwriting product links.
 * DOES NOT execute until explicitly called after approval.
 */
export async function seedCategoryHierarchy() {
  console.log('Seeding Vyntra Category Hierarchy...');

  // Phase 1: Upsert all 12 Parent Categories
  const parentMap = new Map<string, string>(); // slug -> id

  for (const p of PARENT_CATEGORIES) {
    const upserted = await prisma.category.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        description: p.description,
      },
      create: {
        ...(p.existingId ? { id: p.existingId } : {}),
        name: p.name,
        slug: p.slug,
        description: p.description,
      },
    });
    parentMap.set(p.slug, upserted.id);
  }

  // Phase 2: Upsert all 29 Leaf Subcategories linked to their Parent
  let subCount = 0;
  for (const s of SUBCATEGORIES) {
    if (!s.parentSlug || !parentMap.has(s.parentSlug)) {
      console.warn(`Skipping ${s.slug}: missing parent ${s.parentSlug}`);
      continue;
    }

    const parentId = parentMap.get(s.parentSlug)!;

    await prisma.category.upsert({
      where: { slug: s.slug },
      update: {
        name: s.name,
        description: s.description,
        parentId,
      },
      create: {
        name: s.name,
        slug: s.slug,
        description: s.description,
        parentId,
      },
    });
    subCount++;
  }

  console.log(`Successfully upserted ${PARENT_CATEGORIES.length} parents and ${subCount} subcategories.`);
  return {
    parentsCount: PARENT_CATEGORIES.length,
    subcategoriesCount: subCount,
    totalCategories: PARENT_CATEGORIES.length + subCount,
  };
}

if (require.main === module) {
  seedCategoryHierarchy()
    .then((res) => {
      console.log('SEED_RESULT:', JSON.stringify(res, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error('SEED_ERROR:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
