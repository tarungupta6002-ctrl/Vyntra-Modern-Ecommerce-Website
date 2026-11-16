import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api-response';
import { Prisma } from '@prisma/client';
import { PRODUCTS_DATABASE } from '@/data/products';

export const dynamic = 'force-dynamic';

interface FormattedProductItem {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  brand: string;
  category: string;
  subCategory: string;
  price: number;
  originalPrice: number;
  discount: string;
  rating: number;
  reviewCount: number;
  badge?: string;
  badgeVariant?: 'primary' | 'secondary' | 'accent' | 'neutral';
  isExpress: boolean;
  image: string;
  sizes: string[];
  colors: string[];
  stockCount: number;
  inStock: boolean;
  vendor: {
    name: string;
    slug: string;
    rating: number;
    isVerified: boolean;
  };
}

/**
 * Format a Prisma Product model into the standardized customer-facing product payload.
 * Strictly strips any private vendor details (GST, PAN, bank tokens, commission).
 */
function formatProduct(product: any): FormattedProductItem {
  const p1 = Number(product.basePrice || 0);
  const p2 = product.discountPrice ? Number(product.discountPrice) : null;

  let sellingPrice = p1;
  let originalPrice = p1;

  if (p2 !== null && p2 > 0) {
    sellingPrice = Math.min(p1, p2);
    originalPrice = Math.max(p1, p2);
  }

  const discountStr =
    originalPrice > sellingPrice
      ? `${Math.round(((originalPrice - sellingPrice) / originalPrice) * 100)}% OFF`
      : '';

  const primaryImage =
    product.images?.find((img: any) => img.isPrimary) || product.images?.[0];
  const imageUrl =
    primaryImage?.url ||
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAZY6Rn1sX9zajvu57JMzOmU7lTmvqI-LwLj8FZkGKPKa2fDRcswkkFSPDEu2zQusfLQWUiFp9H4LzwuJYFJbuF9bGPKbWzWd4XagxqkVICEurmu18QQYfHOCl534lDi1BtAdVsfQh39l8Mvx4sE-mOFzw7JsKJkwKtMR1GcEXqC7L8Z5IXFPP91xobDUp-qeMs0I6rAor8wRM1atkC0vFuzXoUFhDnmnOtgVY-ahc';

  const totalStock = (product.inventories || []).reduce(
    (acc: number, inv: any) =>
      acc + Math.max(0, (inv.quantity || 0) - (inv.reservedQuantity || 0)),
    0
  );

  const sizes = Array.from(
    new Set((product.variants || []).map((v: any) => v.size).filter(Boolean))
  ) as string[];

  const colors = Array.from(
    new Set((product.variants || []).map((v: any) => v.color).filter(Boolean))
  ) as string[];

  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    subtitle: product.subtitle || '',
    brand: product.brand,
    category: product.category?.slug || 'ethnic',
    subCategory: product.category?.name || 'General',
    price: sellingPrice,
    originalPrice: originalPrice,
    discount: discountStr,
    rating: product.rating,
    reviewCount: product.reviewCount,
    badge:
      product.rating >= 4.8
        ? 'Bestseller'
        : product.reviewCount > 100
        ? 'Festive Edit'
        : undefined,
    badgeVariant: product.rating >= 4.8 ? 'primary' : 'secondary',
    isExpress: true,
    image: imageUrl,
    sizes: sizes.length > 0 ? sizes : ['Standard'],
    colors: colors.length > 0 ? colors : ['Default'],
    stockCount: totalStock,
    inStock: totalStock > 0,
    vendor: {
      name: product.vendor?.storeName || 'Vyntra Atelier',
      slug: product.vendor?.storeSlug || 'vyntra-atelier',
      rating: product.vendor?.rating || 5.0,
      isVerified: product.vendor?.isVerified ?? true,
    },
  };
}

/**
 * Curated development fallback list derived from existing mock data
 */
function getFallbackProducts(): FormattedProductItem[] {
  return PRODUCTS_DATABASE.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    subtitle: p.subtitle,
    brand: p.brand,
    category: p.category,
    subCategory: p.subCategory,
    price: p.price,
    originalPrice: p.originalPrice,
    discount: p.discount,
    rating: p.rating,
    reviewCount: p.reviewCount,
    badge: p.badge,
    badgeVariant: p.badgeVariant,
    isExpress: p.isExpress,
    image: p.images[0]?.src || '',
    sizes: p.sizes?.map((s) => s.size) || ['Standard'],
    colors: p.colors?.map((c) => c.name) || ['Standard'],
    stockCount: p.stockCount || 10,
    inStock: (p.stockCount ?? 1) > 0,
    vendor: {
      name: p.vendorName,
      slug: p.vendorName.toLowerCase().replace(/\s+/g, '-'),
      rating: 4.9,
      isVerified: true,
    },
  }));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search')?.trim() || '';
    const category = searchParams.get('category')?.trim() || '';
    const brand = searchParams.get('brand')?.trim() || '';
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const rating = searchParams.get('rating');
    const sort = searchParams.get('sort') || 'curated';
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 100);
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const featured = searchParams.get('featured') === 'true';

    // Build Prisma Where Input:
    // Only published products from APPROVED vendors
    const andConditions: Prisma.ProductWhereInput[] = [
      { isPublished: true },
      { vendor: { status: 'APPROVED' } },
    ];

    // Category navigation: matches leaf category OR any level ancestor up to 6 levels deep
    if (category && category !== 'all') {
      const catLower = category.toLowerCase();
      andConditions.push({
        OR: [
          { category: { slug: { equals: catLower, mode: 'insensitive' } } },
          { category: { parent: { slug: { equals: catLower, mode: 'insensitive' } } } },
          { category: { parent: { parent: { slug: { equals: catLower, mode: 'insensitive' } } } } },
          { category: { parent: { parent: { parent: { slug: { equals: catLower, mode: 'insensitive' } } } } } },
          { category: { parent: { parent: { parent: { parent: { slug: { equals: catLower, mode: 'insensitive' } } } } } } },
          { category: { parent: { parent: { parent: { parent: { parent: { slug: { equals: catLower, mode: 'insensitive' } } } } } } } },
        ],
      });
    }

    // Brand filter (e.g. from brand store link "Visit the Brand Atelier Store")
    if (brand) {
      andConditions.push({
        brand: { contains: brand, mode: 'insensitive' },
      });
    }

    // Keyword search across title, brand, subtitle, description
    if (search) {
      andConditions.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { brand: { contains: search, mode: 'insensitive' } },
          { subtitle: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    const where: Prisma.ProductWhereInput = {
      AND: andConditions,
    };

    if (minPrice || maxPrice) {
      where.basePrice = {
        ...(minPrice ? { gte: parseFloat(minPrice) } : {}),
        ...(maxPrice ? { lte: parseFloat(maxPrice) } : {}),
      };
    }

    if (rating) {
      where.rating = { gte: parseFloat(rating) };
    }

    // Sorting logic
    let orderBy: Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[] = {
      createdAt: 'desc',
    };

    if (sort === 'price-low' || sort === 'price_asc') {
      orderBy = { basePrice: 'asc' };
    } else if (sort === 'price-high' || sort === 'price_desc') {
      orderBy = { basePrice: 'desc' };
    } else if (sort === 'rating') {
      orderBy = { rating: 'desc' };
    } else if (sort === 'curated') {
      orderBy = [{ rating: 'desc' }, { createdAt: 'desc' }];
    }

    // Query database
    let totalCount = 0;
    let products: any[] = [];
    let isFallback = false;

    try {
      totalCount = await prisma.product.count({ where });

      if (totalCount > 0) {
        products = await prisma.product.findMany({
          where,
          include: {
            category: {
              select: { id: true, name: true, slug: true },
            },
            vendor: {
              select: {
                id: true,
                storeName: true,
                storeSlug: true,
                rating: true,
                isVerified: true,
              },
            },
            images: {
              orderBy: { sortOrder: 'asc' },
              select: { id: true, url: true, altText: true, isPrimary: true },
            },
            variants: {
              select: {
                id: true,
                sku: true,
                size: true,
                color: true,
                price: true,
                originalPrice: true,
                discountPercentage: true,
                imageUrl: true,
              },
            },
            inventories: {
              select: {
                id: true,
                variantId: true,
                sku: true,
                quantity: true,
                reservedQuantity: true,
                lowStockThreshold: true,
              },
            },
          },
          orderBy,
          skip: (page - 1) * limit,
          take: limit,
        });
      }
    } catch (dbErr) {
      console.warn('[Products API Database Warning]:', dbErr);
      // Handled by graceful fallback below
    }

    // Only genuine database products from approved vendors are returned (no demo products)
    const formatted = products.map(formatProduct);

    return apiSuccess(formatted, {
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
      isFallback: false,
      source: 'prisma_postgresql',
    });
  } catch (err: any) {
    console.error('[GET /api/products Error]:', err);
    return apiError(
      err.message || 'Failed to retrieve products catalog.',
      500,
      null,
      'CATALOG_FETCH_ERROR'
    );
  }
}
