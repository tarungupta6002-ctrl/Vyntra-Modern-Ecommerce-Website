// Type-only import keeps this module safe to use from client components.
import type { Prisma } from '@prisma/client';

const MAX_TOKENS = 6;
const MIN_TOKEN_LENGTH = 2;

// Filler words that would otherwise match nearly every product.
const STOP_WORDS = new Set(['for', 'and', 'the', 'with', 'of', 'in', 'a', 'an', 'to', 'by']);

/**
 * Split a raw query into lowercase search tokens.
 * "Red Silk Saree for Women" -> ["red", "silk", "saree", "women"]
 */
export function tokenizeQuery(raw: string): string[] {
  const tokens = raw
    .toLowerCase()
    .replace(new RegExp('[^\\p{L}\\p{M}\\p{N}\\s.-]', 'gu'), ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^[.-]+|[.-]+$/g, ''))
    .filter((t) => t.length >= MIN_TOKEN_LENGTH && !STOP_WORDS.has(t));

  return Array.from(new Set(tokens)).slice(0, MAX_TOKENS);
}

/**
 * Build a Prisma filter where EVERY token must appear in at least one searchable field.
 * Word order doesn't matter, so "saree silk red" finds "Red Banarasi Silk Saree".
 * Returns null when the query has no usable tokens.
 */
export function buildProductSearchWhere(
  raw: string,
  { includeDescription = true }: { includeDescription?: boolean } = {}
): Prisma.ProductWhereInput | null {
  const tokens = tokenizeQuery(raw);
  if (tokens.length === 0) return null;

  return {
    AND: tokens.map((token) => {
      const contains = { contains: token, mode: 'insensitive' as const };
      const fields: Prisma.ProductWhereInput[] = [
        { title: contains },
        { brand: contains },
        { subtitle: contains },
        { category: { name: contains } },
        { category: { parent: { name: contains } } },
      ];
      if (includeDescription) {
        // Description is long free text: only match at the start of a word, so "casio"
        // doesn't match "occasion". (Descriptions may be JSON, hence the quote prefix.)
        fields.push(
          { description: { startsWith: token, mode: 'insensitive' } },
          { description: { contains: ` ${token}`, mode: 'insensitive' } },
          { description: { contains: `"${token}`, mode: 'insensitive' } }
        );
      }
      return { OR: fields };
    }),
  };
}

/** Words that just name a department: on that hub page every product already is one. */
export const DEPARTMENT_WORDS = {
  mobiles: ['mobile', 'mobiles', 'phone', 'phones', 'smartphone', 'smartphones', 'cellphone', 'handset'],
  electronics: ['electronic', 'electronics', 'gadget', 'gadgets'],
  appliances: ['appliance', 'appliances', 'home'],
  books: ['book', 'books'],
  fashion: ['fashion', 'clothing', 'clothes', 'wear', 'apparel'],
} as const;

/**
 * Client-side matcher for hub pages that filter an already-loaded product list.
 * Every query word must appear in at least one field; department words are skipped
 * ("samsung phone" on /mobiles -> "samsung"), and simple plurals match ("laptops" -> "laptop").
 */
export function matchesSearchQuery(
  query: string,
  fields: (string | null | undefined)[],
  ignoreWords: readonly string[] = []
): boolean {
  const ignore = new Set(ignoreWords);
  const tokens = tokenizeQuery(query).filter((t) => !ignore.has(t));
  if (tokens.length === 0) return true;

  const haystack = fields.filter(Boolean).join(' ').toLowerCase();
  return tokens.every((token) => {
    if (haystack.includes(token)) return true;
    // Plural -> singular: "laptops" -> "laptop", "batteries" -> "battery"
    if (token.length > 4 && token.endsWith('ies')) return haystack.includes(token.slice(0, -3) + 'y');
    if (token.length > 3 && token.endsWith('s')) return haystack.includes(token.slice(0, -1));
    return false;
  });
}
