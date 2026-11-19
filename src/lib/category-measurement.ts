/**
 * Vyntra Marketplace - Category Measurement Chart Rules
 *
 * Classifies all 43 catalog categories (12 parents + 31 subcategories)
 * to determine whether the standard apparel chest/waist/length size chart
 * should be displayed or hidden with a context-specific explanatory note.
 */

export type CategoryMeasurementType =
  | 'stitched-apparel'
  | 'unstitched-apparel'
  | 'footwear'
  | 'jewelry-accessories'
  | 'bags-leather'
  | 'electronics'
  | 'home-living'
  | 'beauty-wellness'
  | 'innerwear'
  | 'kids-infants'
  | 'unclassified';

export interface CategoryMeasurementProfile {
  showApparelChart: boolean;
  type: CategoryMeasurementType;
  badge: string;
  title: string;
  description: string;
  recommendation: string;
}

// 1. Stitched Apparel: Kurtas, Suits, Lehengas, Shirts, Trousers, Sherwanis, Western Wear, Kids Clothes
export const STITCHED_APPAREL_SLUGS = new Set([
  'kurtas-suits',             // Kurtas, Suits & Anarkalis
  'lehengas-festive',         // Lehengas & Festive Ensembles
  'womens-western-fusion',    // Women's Western & Fusion Wear
  'mens-shirts-trousers',     // Men's Shirts & Trousers
  'mens-kurtas-sherwanis',    // Kurtas, Sherwanis & Nehru Jackets
  'boys-apparel',             // Boys Ethnic & Casual Wear
  'girls-apparel',            // Girls Ethnic & Party Wear
]);

// 2. Unstitched Apparel / Drapes: Sarees, Dupattas, Shawls, Stoles
export const UNSTITCHED_APPAREL_SLUGS = new Set([
  'sarees',                   // Handloom & Silk Sarees
  'dupattas-shawls',          // Dupattas, Shawls & Stoles
]);

// 3. Intimates, Underwear & Shapewear
export const INNERWEAR_SLUGS = new Set([
  'bras-bralettes',
  'panties-briefs',
  'saree-shapewear-slips',
  'womens-nightwear-loungewear',
  'mens-briefs-trunks',
  'mens-boxers-shorts',
  'mens-vests-undershirts',
]);

// 4. Artisanal & Modern Footwear
export const FOOTWEAR_SLUGS = new Set([
  'footwear',                 // Parent
  'shoes',
  'mens-shoes',
  'mens-sports-shoes',
  'womens-shoes',
  'kids-shoes',
  'formal-casual-shoes',      // Subcategory
  'casual-shoes',
  'sports-shoes',
  'sneakers',
  'boots',
  'loafers',
  'sandals',
  'artisanal-juttis-mojris',  // Subcategory
]);

// 5. Horology & Fine Jewelry
export const JEWELRY_ACCESSORIES_SLUGS = new Set([
  'jewelry-accessories',            // Parent
  'watches',                        // Parent (Horology & Jewels)
  'heritage-fine-jewelry',          // Subcategory
  'watches-luxury-accessories',     // Subcategory
  'luxury-mechanical-watches',      // Subcategory
  'collector-vintage-timepieces',   // Subcategory
]);

// 6. Leather Goods & Handbags
export const BAGS_LEATHER_SLUGS = new Set([
  'bags',                           // Parent
  'leather-totes-bags',             // Subcategory
  'wallets-belts-accessories',      // Subcategory
]);

// 7. Electronics & Smart Gadgets
export const ELECTRONICS_SLUGS = new Set([
  'electronics',                    // Parent
  'audio-headphones',               // Subcategory
  'smartwatches-wearables',         // Subcategory
]);

// 8. Home, Kitchen & Living
export const HOME_LIVING_SLUGS = new Set([
  'home-living',                    // Parent
  'home-decor-bedding',             // Subcategory
  'brass-copper-kansa-utensils',    // Subcategory
]);

// 9. Beauty, Fragrances & Personal Care
export const BEAUTY_WELLNESS_SLUGS = new Set([
  'beauty-wellness',                // Parent
  'luxury-perfumes-attars',         // Subcategory
  'ayurvedic-skincare',             // Subcategory
]);

// 10. Infant & Baby Essentials
export const INFANT_BABY_SLUGS = new Set([
  'infant-baby-essentials',         // Subcategory
]);

/**
 * Resolves a category's measurement profile based on its slug or parent slug.
 * Safe fallback: If a category is unclassified or missing, apparel size chart is hidden
 * to prevent showing irrelevant adult Chest/Waist tables on non-apparel listings.
 */
export function getCategoryMeasurementProfile(
  slug?: string | null,
  parentSlug?: string | null,
  categoryName?: string | null
): CategoryMeasurementProfile {
  const normalizedSlug = (slug || '').trim().toLowerCase();
  const normalizedParentSlug = (parentSlug || '').trim().toLowerCase();

  // 1. Direct match on stitched apparel
  if (STITCHED_APPAREL_SLUGS.has(normalizedSlug)) {
    return {
      showApparelChart: true,
      type: 'stitched-apparel',
      badge: 'Stitched Apparel',
      title: 'Apparel Measurement Chart (Inches)',
      description:
        'Standard Chest, Waist, and Length measurements shown to customers on the product details page.',
      recommendation:
        'Enter accurate garment measurements for sizes S to XL to reduce return rates and assist buyers.',
    };
  }

  // 2. Unstitched drapes (Sarees, Dupattas)
  if (UNSTITCHED_APPAREL_SLUGS.has(normalizedSlug)) {
    return {
      showApparelChart: false,
      type: 'unstitched-apparel',
      badge: 'Unstitched / Free Size',
      title: 'Apparel Chart Not Required for Sarees & Drapes',
      description:
        'Sarees and dupattas are free-size unstitched drapes (typically 5.5m - 6.3m drape with unstitched blouse piece). Chest/waist measurements do not apply.',
      recommendation:
        'Specify fabric length, width, and blouse piece details under Specifications above.',
    };
  }

  // 3. Footwear
  if (
    FOOTWEAR_SLUGS.has(normalizedSlug) ||
    FOOTWEAR_SLUGS.has(normalizedParentSlug) ||
    normalizedSlug.includes('shoe') ||
    normalizedSlug.includes('footwear') ||
    normalizedSlug.includes('sneaker') ||
    (categoryName && (categoryName.toLowerCase().includes('shoe') || categoryName.toLowerCase().includes('footwear')))
  ) {
    return {
      showApparelChart: false,
      type: 'footwear',
      badge: 'Footwear Sizing',
      title: 'Shoe Sizing & Fit Conversion Matrix',
      description:
        'Footwear items use India/UK/EU shoe sizing. Standard chest/waist measurement chart does not apply.',
      recommendation:
        'Standard India/UK shoe sizing conversion matrix is enabled for this product.',
    };
  }

  // 4. Jewelry, Horology & Luxury Accessories
  if (
    JEWELRY_ACCESSORIES_SLUGS.has(normalizedSlug) ||
    JEWELRY_ACCESSORIES_SLUGS.has(normalizedParentSlug)
  ) {
    return {
      showApparelChart: false,
      type: 'jewelry-accessories',
      badge: 'Jewelry & Horology',
      title: 'Measurement Chart Not Required for Jewelry & Watches',
      description:
        'Fine jewelry, wristwatches, and luxury accessories do not require apparel chest/waist measurements.',
      recommendation:
        'Add dimensions (dial diameter, chain length, ring size, metal weight) under Specifications above.',
    };
  }

  // 5. Leather & Bags
  if (BAGS_LEATHER_SLUGS.has(normalizedSlug) || BAGS_LEATHER_SLUGS.has(normalizedParentSlug)) {
    return {
      showApparelChart: false,
      type: 'bags-leather',
      badge: 'Leather & Bags',
      title: 'Measurement Chart Not Applicable for Bags',
      description:
        'Handcrafted leather totes, wallets, and bags do not use clothing measurements.',
      recommendation:
        'Add bag dimensions (Height x Width x Depth in inches or cm) under Specifications above.',
    };
  }

  // 6. Electronics & Smart Gadgets
  if (ELECTRONICS_SLUGS.has(normalizedSlug) || ELECTRONICS_SLUGS.has(normalizedParentSlug)) {
    return {
      showApparelChart: false,
      type: 'electronics',
      badge: 'Electronics & Smart Gadgets',
      title: 'Apparel Chart Not Applicable for Electronics',
      description:
        'Audio earbuds, headphones, and smart wearables do not use apparel sizing.',
      recommendation:
        'Specify technical parameters, battery life, and compatibility under Specifications above.',
    };
  }

  // 7. Home, Kitchen & Living
  if (HOME_LIVING_SLUGS.has(normalizedSlug) || HOME_LIVING_SLUGS.has(normalizedParentSlug)) {
    return {
      showApparelChart: false,
      type: 'home-living',
      badge: 'Home & Living',
      title: 'Measurement Chart Not Applicable for Home & Living',
      description:
        'Home decor, handcrafted bedding, and kitchen utensils do not use apparel chest/waist sizing.',
      recommendation:
        'Add bedding dimensions (e.g., King 108"x108") or utensil capacity (liters/grams) under Specifications above.',
    };
  }

  // 8. Beauty, Fragrances & Personal Care
  if (BEAUTY_WELLNESS_SLUGS.has(normalizedSlug) || BEAUTY_WELLNESS_SLUGS.has(normalizedParentSlug)) {
    return {
      showApparelChart: false,
      type: 'beauty-wellness',
      badge: 'Beauty & Wellness',
      title: 'Measurement Chart Not Applicable for Personal Care',
      description:
        'Artisanal perfumes, attars, and ayurvedic skincare do not require apparel measurements.',
      recommendation:
        'Specify net volume (ml/fl oz), weight (gm), and key botanical ingredients under Specifications above.',
    };
  }

  // 9. Innerwear, Intimates & Loungewear
  if (INNERWEAR_SLUGS.has(normalizedSlug)) {
    return {
      showApparelChart: false,
      type: 'innerwear',
      badge: 'Innerwear & Intimates',
      title: 'Standard Apparel Chart Not Required',
      description:
        'Innerwear, shapewear, and intimates use dedicated waist, hip, or band/cup sizing managed via variants.',
      recommendation:
        'Set your size options (S, M, L, XL or 32B, 34B) under Product Variants above.',
    };
  }

  // 10. Infant & Baby Essentials
  if (INFANT_BABY_SLUGS.has(normalizedSlug)) {
    return {
      showApparelChart: false,
      type: 'kids-infants',
      badge: 'Infant & Baby Essentials',
      title: 'Adult Apparel Chart Not Applicable',
      description:
        'Infant rompers, swaddles, and baby essentials use age-based sizing (0-3M, 3-6M, 6-12M) rather than adult chest/waist measurements.',
      recommendation:
        'Add age-range sizes under Product Variants above.',
    };
  }

  // 11. Safe Fallback for Parent Categories or Unclassified Categories
  const displayName = categoryName || normalizedSlug || 'This Category';
  return {
    showApparelChart: false,
    type: 'unclassified',
    badge: 'Catalog Item',
    title: `Apparel Chart Hidden for ${displayName}`,
    description:
      'Standard adult chest/waist measurement chart is not enabled by default for this category.',
    recommendation:
      'If your product requires specific dimensions or sizing details, you can add them under Specifications above.',
  };
}
