import { prisma } from '@/lib/prisma';
import {
  getTemplateForCategoryPath,
  validateAttributes,
  type AttributeValidationResult,
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

/**
 * Validates seller-entered attributes against the category's template.
 * Required fields are enforced only when the listing is being published (drafts may be incomplete).
 */
export async function validateProductAttributes(
  categoryId: string,
  input: unknown,
  isPublishing: boolean
): Promise<AttributeValidationResult> {
  const template = getTemplateForCategoryPath(await getCategoryPathSlugs(categoryId));
  return validateAttributes(template, input, { enforceRequired: isPublishing });
}
