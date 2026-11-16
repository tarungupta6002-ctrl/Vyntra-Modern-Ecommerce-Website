import { NextResponse } from 'next/server';
import { requireVendor, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/vendor/catalog/search
 * Searches the approved Vyntra shared master catalog by title, brand, category, SKU, or barcode.
 * Enables approved vendors to attach a SellerOffer to existing catalog pieces without duplication.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireVendor();
    const { searchParams } = new URL(request.url);

    const q = searchParams.get('q')?.trim() || '';
    const categoryFilter = searchParams.get('category')?.trim();
    const brandFilter = searchParams.get('brand')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const whereClause: any = {
      isPublished: true, // Only approved, live master catalog pieces
    };

    if (q) {
      whereClause.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { brand: { contains: q, mode: 'insensitive' } },
        { subtitle: { contains: q, mode: 'insensitive' } },
        {
          category: {
            name: { contains: q, mode: 'insensitive' },
          },
        },
        {
          variants: {
            some: {
              OR: [
                { sku: { contains: q, mode: 'insensitive' } },
                { barcode: { contains: q, mode: 'insensitive' } },
                { size: { contains: q, mode: 'insensitive' } },
                { color: { contains: q, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
    }

    if (categoryFilter) {
      whereClause.category = {
        OR: [
          { id: categoryFilter },
          { slug: categoryFilter },
          { name: { contains: categoryFilter, mode: 'insensitive' } },
        ],
      };
    }

    if (brandFilter) {
      whereClause.brand = { contains: brandFilter, mode: 'insensitive' };
    }

    const [totalCount, products] = await Promise.all([
      prisma.product.count({ where: whereClause }),
      prisma.product.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
          images: {
            orderBy: { sortOrder: 'asc' },
            select: { id: true, url: true, altText: true, isPrimary: true },
          },
          variants: {
            orderBy: [{ size: 'asc' }, { color: 'asc' }],
            select: {
              id: true,
              sku: true,
              barcode: true,
              price: true,
              originalPrice: true,
              discountPercentage: true,
              size: true,
              color: true,
              imageUrl: true,
            },
          },
          sellerOffers: {
            where: { status: 'ACTIVE' },
            select: {
              id: true,
              vendorId: true,
              condition: true,
              fulfillmentType: true,
              handlingDays: true,
              isBuyBoxWinner: true,
              vendor: {
                select: {
                  id: true,
                  storeName: true,
                  storeSlug: true,
                  isVerified: true,
                  rating: true,
                },
              },
              offerVariants: {
                select: {
                  id: true,
                  productVariantId: true,
                  sellerSku: true,
                  sellingPrice: true,
                  mrpPrice: true,
                  inventories: {
                    select: { quantity: true, reservedQuantity: true },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const formatted = products.map((prod) => {
      const primaryImage =
        prod.images.find((img) => img.isPrimary)?.url ||
        prod.images[0]?.url ||
        'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80';

      // Find my existing offer on this master product (if any)
      const myOffer = prod.sellerOffers.find((o) => o.vendorId === auth.vendorProfileId) || null;

      // Extract all selling prices across active offers
      const allPrices: number[] = [];
      prod.sellerOffers.forEach((so) => {
        so.offerVariants.forEach((ov) => {
          allPrices.push(Number(ov.sellingPrice));
        });
      });
      if (allPrices.length === 0) {
        allPrices.push(Number(prod.basePrice));
      }

      const lowestPrice = Math.min(...allPrices);
      const buyBoxWinner = prod.sellerOffers.find((o) => o.isBuyBoxWinner);

      return {
        id: prod.id,
        title: prod.title,
        subtitle: prod.subtitle,
        slug: prod.slug,
        brand: prod.brand,
        brandRefId: prod.brandRefId,
        basePrice: Number(prod.basePrice),
        discountPrice: prod.discountPrice ? Number(prod.discountPrice) : null,
        category: prod.category,
        image: primaryImage,
        images: prod.images,
        rating: prod.rating,
        reviewCount: prod.reviewCount,
        hasVariants: prod.hasVariants,
        variantsCount: prod.variants.length,
        variants: prod.variants.map((v) => {
          // If vendor already has an offer variant for this, map it
          const myVariantOffer = myOffer?.offerVariants.find(
            (ov) => ov.productVariantId === v.id
          );
          const totalStock = myVariantOffer?.inventories.reduce(
            (sum, inv) => sum + Math.max(0, inv.quantity - inv.reservedQuantity),
            0
          );

          const variantName = [v.size, v.color].filter(Boolean).join(' / ') || 'Standard';

          return {
            id: v.id,
            name: variantName,
            sku: v.sku,
            barcode: v.barcode,
            catalogPrice: Number(v.price),
            catalogOriginalPrice: v.originalPrice ? Number(v.originalPrice) : null,
            size: v.size,
            color: v.color,
            imageUrl: v.imageUrl,
            myOffer: myVariantOffer
              ? {
                  offerVariantId: myVariantOffer.id,
                  sellerSku: myVariantOffer.sellerSku,
                  sellingPrice: Number(myVariantOffer.sellingPrice),
                  mrpPrice: myVariantOffer.mrpPrice ? Number(myVariantOffer.mrpPrice) : null,
                  stock: totalStock ?? 0,
                }
              : null,
          };
        }),
        offersCount: prod.sellerOffers.length,
        lowestMarketPrice: lowestPrice,
        buyBoxWinnerStoreName: buyBoxWinner?.vendor.storeName || null,
        hasMyOffer: Boolean(myOffer),
        myOfferId: myOffer?.id || null,
      };
    });

    return apiSuccess({
      items: formatted,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    return handleApiError(err);
  }
}
