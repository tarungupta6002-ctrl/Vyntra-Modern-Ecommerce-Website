import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api-response';
import { formatDetailedProduct } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    slug: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { slug } = params;

    if (!slug) {
      return apiError('Product slug is required.', 400, null, 'INVALID_SLUG');
    }

    let productFromDb: any = null;

    try {
      productFromDb = await prisma.product.findFirst({
        where: {
          slug,
          isPublished: true,
          vendor: {
            status: 'APPROVED',
          },
        },
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
          },
          variants: {
            include: {
              inventories: true,
            },
          },
          inventories: true,
          sellerOffers: {
            where: {
              status: 'ACTIVE',
            },
            include: {
              vendor: {
                select: {
                  id: true,
                  storeName: true,
                  storeSlug: true,
                  rating: true,
                  isVerified: true,
                },
              },
              offerVariants: {
                include: {
                  inventories: true,
                },
              },
            },
          },
          reviews: {
            where: {
              status: 'APPROVED',
            },
            take: 20,
            orderBy: { createdAt: 'desc' },
            include: {
              user: {
                select: { name: true, avatar: true },
              },
            },
          },
        },
      });
    } catch (dbErr) {
      console.warn(`[GET /api/products/${slug} DB Query Warning]:`, dbErr);
    }

    if (productFromDb) {
      const detailed = formatDetailedProduct(productFromDb);
      return apiSuccess(detailed, {
        isFallback: false,
        source: 'prisma_postgresql',
      });
    }

    return apiError(
      `Product with slug "${slug}" not found in marketplace catalog.`,
      404,
      null,
      'PRODUCT_NOT_FOUND'
    );
  } catch (err: any) {
    console.error(`[GET /api/products/${params?.slug} Error]:`, err);
    return apiError(
      err.message || 'Failed to retrieve product details.',
      500,
      null,
      'PRODUCT_FETCH_ERROR'
    );
  }
}
