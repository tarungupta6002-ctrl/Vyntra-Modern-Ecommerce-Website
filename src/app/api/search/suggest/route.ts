import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api-response';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { buildProductSearchWhere, tokenizeQuery } from '@/lib/search';

export const dynamic = 'force-dynamic';

export interface SearchSuggestion {
  products: {
    slug: string;
    title: string;
    brand: string;
    image: string | null;
    price: number;
    category: string | null;
  }[];
  categories: { name: string; slug: string }[];
  brands: string[];
}

const EMPTY: SearchSuggestion = { products: [], categories: [], brands: [] };

/**
 * GET /api/search/suggest?q=red silk
 * Lightweight typeahead: top matching products, categories and brands.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim().slice(0, 80) || '';
  const tokens = tokenizeQuery(q);
  if (tokens.length === 0) return apiSuccess(EMPTY);

  // Typeahead fires on every keystroke (debounced): allow ~2 req/sec per IP.
  const rate = checkRateLimit(`search-suggest:${getClientIp(request)}`, 120, 60);
  if (!rate.allowed) return rateLimitResponse(rate.resetInSeconds);

  try {
    // Description is skipped here: it's large text and too noisy for suggestions.
    const productSearch = buildProductSearchWhere(q, { includeDescription: false })!;
    const insensitive = 'insensitive' as const;
    // Category: any word hits ("red saree" -> Sarees). Brand: whole phrase as typed ("sams" -> Samsung)
    // or an exact word ("samsung phone" -> Samsung), so "red saree" doesn't suggest "Red Tape".
    const categoryWhere = { OR: tokens.map((t) => ({ name: { contains: t, mode: insensitive } })) };
    const brandWhere = {
      OR: [
        { brand: { contains: q, mode: insensitive } },
        ...tokens.map((t) => ({ brand: { equals: t, mode: insensitive } })),
      ],
    };

    const [products, categories, brandRows] = await Promise.all([
      prisma.product.findMany({
        where: {
          AND: [{ isPublished: true }, { vendor: { status: 'APPROVED' } }, productSearch],
        },
        select: {
          slug: true,
          title: true,
          brand: true,
          basePrice: true,
          discountPrice: true,
          category: { select: { name: true } },
          images: {
            orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
            take: 1,
            select: { url: true },
          },
        },
        orderBy: [{ reviewCount: 'desc' }, { rating: 'desc' }],
        take: 6,
      }),
      prisma.category.findMany({
        where: { ...categoryWhere, products: { some: { isPublished: true } } },
        select: { name: true, slug: true },
        take: 3,
      }),
      prisma.product.findMany({
        where: { isPublished: true, vendor: { status: 'APPROVED' }, ...brandWhere },
        select: { brand: true },
        distinct: ['brand'],
        take: 3,
      }),
    ]);

    const data: SearchSuggestion = {
      products: products.map((p) => {
        const base = Number(p.basePrice);
        const discount = p.discountPrice ? Number(p.discountPrice) : 0;
        return {
          slug: p.slug,
          title: p.title,
          brand: p.brand,
          image: p.images[0]?.url ?? null,
          price: discount > 0 ? Math.min(base, discount) : base,
          category: p.category?.name ?? null,
        };
      }),
      categories,
      brands: brandRows.map((b) => b.brand),
    };

    const res = apiSuccess(data);
    res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res;
  } catch (err) {
    console.error('[GET /api/search/suggest Error]:', err);
    return apiError('Search suggestions are unavailable right now.', 500, null, 'SEARCH_SUGGEST_ERROR');
  }
}
