import { prisma } from '@/lib/prisma';
import { HIDDEN_FROM_SELLERS } from '@/lib/category-routes';
import {
  getTemplateForCategoryPath,
  validateAttributes,
  validateVariantAttributes,
  keysProvidedByAllVariants,
  type ProductAttributes,
} from '@/lib/catalog/attributes';

/** Category slugs from the root down to `categoryId` (e.g. ["appliances", "air-conditioners", "split-inverter-acs"]). */
export async function getCategoryPathSlugs(categoryId: string): Promise<string[]> {
  const slugs: string[] = [];
  let currentId: string | null = categoryId;
  // Category trees here are at most ~6 levels deep; the cap guards against a cycle.
  for (let depth = 0; currentId && depth < 10; depth++) {
    const cat: { slug: string; parentId: string | null } | null = await prisma.category.findUnique({
      where: { id: currentId },
      select: { slug: true, parentId: true },
    });
    if (!cat) break;
    slugs.unshift(cat.slug);
    currentId = cat.parentId;
  }
  return slugs;
}

export interface ListingAttributesResult {
  attributes: ProductAttributes;
  /** One entry per input variant (same order). */
  variantAttributes: ProductAttributes[];
  errors: string[];
}

/**
 * Validates seller-entered listing attributes and per-variant attributes against the category's
 * template. A required field counts as provided when every variant has it (e.g. each AC variant
 * has its own capacity). Required fields are enforced only when publishing (drafts may be incomplete).
 */
export async function validateListingAttributes(
  categoryId: string,
  productInput: unknown,
  variantInputs: unknown[] | null | undefined,
  isPublishing: boolean
): Promise<ListingAttributesResult> {
  const template = getTemplateForCategoryPath(await getCategoryPathSlugs(categoryId));
  const errors: string[] = [];

  const variantResults = (variantInputs || []).map((v) => validateVariantAttributes(template, v));
  variantResults.forEach((r, i) => r.errors.forEach((e) => errors.push(`Variant ${i + 1}: ${e}`)));
  const variantAttributes = variantResults.map((r) => r.attributes);

  const perVariantKeys = keysProvidedByAllVariants(template, variantAttributes);
  const listing = validateAttributes(template, productInput, {
    enforceRequired: isPublishing,
    satisfiedKeys: perVariantKeys,
  });
  // Variant errors first: an invalid variant value is usually why a required field looks missing.
  errors.push(...listing.errors);
  // Variants are the source of truth for values they all set; don't keep a second, possibly stale copy.
  for (const key of perVariantKeys) delete listing.attributes[key];

  return { attributes: listing.attributes, variantAttributes, errors };
}

/** Listing-level check only (kept for callers without variant data). */
export async function validateProductAttributes(categoryId: string, input: unknown, isPublishing: boolean) {
  return validateListingAttributes(categoryId, input, [], isPublishing);
}

/**
 * Checks the category a seller files a product under: it must exist, be a final (leaf) category,
 * since listing pages show products by their specific category, and not be one of the hidden
 * duplicates. Returns its path (root first) or an error message for the seller.
 */
export async function checkListingCategory(
  categoryId: string
): Promise<{ path: string[]; error?: undefined } | { path?: undefined; error: string }> {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, slug: true, _count: { select: { children: true } } },
  });
  if (!category) return { error: 'The selected category does not exist.' };
  if (HIDDEN_FROM_SELLERS.has(category.slug)) {
    return { error: 'This category is no longer used. Please choose another one.' };
  }
  if (category._count.children > 0) {
    return { error: 'Please choose a more specific category (one with no sub-categories).' };
  }
  return { path: await getCategoryPathSlugs(categoryId) };
}
