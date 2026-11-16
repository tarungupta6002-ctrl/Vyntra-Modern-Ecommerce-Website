import { revalidatePath, revalidateTag } from 'next/cache';

/**
 * Invalidates cached product pages and tags across Next.js Data Cache & Router Cache.
 * Triggers revalidation for both ID and Slug variants and the global 'products' tag.
 */
export function invalidateProduct(...keys: Array<string | null | undefined>) {
  const unique = Array.from(new Set(keys.filter(Boolean))) as string[];
  for (const key of unique) {
    try {
      revalidateTag(`product-${key}`);
      revalidatePath(`/products/${key}`);
    } catch (err) {
      console.warn(`[invalidateProduct Warning for ${key}]:`, err);
    }
  }
  try {
    revalidateTag('products');
  } catch (err) {
    console.warn('[invalidateProduct global tag warning]:', err);
  }
}
