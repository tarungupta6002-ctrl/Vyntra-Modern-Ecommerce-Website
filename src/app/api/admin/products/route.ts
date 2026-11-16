import { NextResponse } from 'next/server';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/products
 * Retrieves marketplace products across ALL vendors with moderation filters.
 * Strictly protected by requireAdmin().
 */
export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();

    const rateCheck = checkRateLimit(`admin-prods:${admin.userId}`, 60, 60);
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.resetInSeconds, 'Admin API rate limit reached. Please wait a moment.');
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status')?.toLowerCase(); // 'all', 'published', 'draft'
    const vendorId = searchParams.get('vendorId')?.trim();
    const categoryId = searchParams.get('categoryId')?.trim();
    const search = searchParams.get('search')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const conditions: any[] = [];

    if (status === 'published') {
      conditions.push({ isPublished: true });
    } else if (status === 'draft') {
      conditions.push({ isPublished: false });
    }

    if (vendorId && vendorId !== 'all') {
      conditions.push({
        OR: [
          { vendorId: vendorId },
          { sellerOffers: { some: { vendorId: vendorId } } },
        ],
      });
    }

    if (categoryId && categoryId !== 'all') {
      conditions.push({ categoryId: categoryId });
    }

    if (search) {
      conditions.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { brand: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
          { vendor: { storeName: { contains: search, mode: 'insensitive' } } },
          { sellerOffers: { some: { vendor: { storeName: { contains: search, mode: 'insensitive' } } } } },
        ],
      });
    }

    const whereClause: any = conditions.length > 0 ? { AND: conditions } : {};

    const [totalCount, products, categories, vendors] = await Promise.all([
      prisma.product.count({ where: whereClause }),
      prisma.product.findMany({
        where: whereClause,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          vendor: { select: { id: true, storeName: true, storeSlug: true, status: true } },
          images: {
            orderBy: { sortOrder: 'asc' },
            select: { id: true, url: true, isPrimary: true },
            take: 1,
          },
          variants: {
            select: { id: true, sku: true, price: true },
          },
          inventories: {
            select: { quantity: true, reservedQuantity: true },
          },
          sellerOffers: {
            include: {
              vendor: { select: { id: true, storeName: true, storeSlug: true, status: true } },
              offerVariants: {
                include: {
                  inventories: { select: { quantity: true, reservedQuantity: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.category.findMany({
        select: { id: true, name: true, slug: true },
        orderBy: { name: 'asc' },
      }),
      prisma.vendorProfile.findMany({
        select: { id: true, storeName: true, status: true },
        orderBy: { storeName: 'asc' },
      }),
    ]);

    const formatted = products.map((prod) => {
      const primaryImage =
        prod.images[0]?.url ||
        'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80';
      const totalStock = prod.inventories.reduce(
        (sum, inv) => sum + Math.max(0, inv.quantity - inv.reservedQuantity),
        0
      );

      const sellerOffers = (prod.sellerOffers || []).map((so) => {
        const offerStock = (so.offerVariants || []).reduce(
          (sum: number, ov: any) =>
            sum +
            (ov.inventories || []).reduce(
              (isum: number, inv: any) => isum + Math.max(0, inv.quantity - inv.reservedQuantity),
              0
            ),
          0
        );
        const minOfferPrice =
          so.offerVariants.length > 0
            ? Math.min(...so.offerVariants.map((ov: any) => Number(ov.sellingPrice)))
            : null;

        return {
          id: so.id,
          vendorId: so.vendorId,
          vendorName: so.vendor?.storeName || 'Merchant',
          vendorSlug: so.vendor?.storeSlug || '',
          vendorStatus: so.vendor?.status || 'APPROVED',
          status: so.status,
          condition: so.condition,
          isBuyBoxWinner: so.isBuyBoxWinner,
          minOfferPrice,
          totalStock: offerStock,
        };
      });

      return {
        id: prod.id,
        title: prod.title,
        subtitle: prod.subtitle,
        slug: prod.slug,
        brand: prod.brand,
        basePrice: Number(prod.basePrice),
        discountPrice: prod.discountPrice ? Number(prod.discountPrice) : null,
        isPublished: prod.isPublished,
        status: prod.isPublished ? 'PUBLISHED' : 'DRAFT',
        rating: prod.rating,
        reviewCount: prod.reviewCount,
        category: prod.category,
        vendor: prod.vendor,
        image: primaryImage,
        variantsCount: prod.variants.length,
        totalStock,
        sellerOffers,
        createdAt: prod.createdAt,
      };
    });

    const totalPages = Math.ceil(totalCount / limit) || 1;

    return apiSuccess({
      products: formatted,
      meta: {
        categories,
        vendors,
      },
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
    });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    return handleApiError(err);
  }
}
