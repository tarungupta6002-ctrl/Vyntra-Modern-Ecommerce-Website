import { NextResponse } from 'next/server';
import { requireVendor, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { invalidateProduct } from '@/lib/cache-invalidation';

export const dynamic = 'force-dynamic';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function ensureUniqueVariantSku(tx: any, baseSku: string, excludeVariantId?: string): Promise<string> {
  let candidate = baseSku;
  let attempts = 0;
  while (attempts < 10) {
    const existing = await tx.productVariant.findUnique({
      where: { sku: candidate },
      select: { id: true },
    });
    if (!existing || (excludeVariantId && existing.id === excludeVariantId)) {
      return candidate;
    }
    attempts++;
    const salt = Math.random().toString(36).substring(2, 6).toUpperCase();
    candidate = `${baseSku}-${salt}`;
  }
  return `${baseSku}-${Date.now().toString().slice(-4)}`;
}

/**
 * GET /api/vendor/products
 * Retrieves all products owned by the authenticated, approved vendor.
 * Supports status filter ('all' | 'published' | 'draft') and search query.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireVendor();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const status = searchParams.get('status')?.toLowerCase(); // 'all', 'published', 'draft'

    const baseConditions: any[] = [];
    if (status === 'published') {
      baseConditions.push({ isPublished: true });
    } else if (status === 'draft') {
      baseConditions.push({ isPublished: false });
    }

    if (search) {
      baseConditions.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { brand: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
          { variants: { some: { sku: { contains: search, mode: 'insensitive' } } } },
        ],
      });
    }

    const whereClause: any = {
      AND: [
        {
          OR: [
            { vendorId: auth.vendorProfileId },
            { sellerOffers: { some: { vendorId: auth.vendorProfileId } } },
          ],
        },
        ...baseConditions,
      ],
    };

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
          select: { id: true, url: true, altText: true, isPrimary: true },
        },
        variants: {
          include: {
            inventories: {
              where: { vendorId: auth.vendorProfileId },
              select: { quantity: true, reservedQuantity: true },
            },
          },
        },
        inventories: {
          where: { vendorId: auth.vendorProfileId },
          select: { quantity: true, reservedQuantity: true },
        },
        sellerOffers: {
          where: { vendorId: auth.vendorProfileId },
          include: {
            offerVariants: {
              include: {
                inventories: {
                  select: { quantity: true, reservedQuantity: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = products.map((prod) => {
      const isOriginalCreator = prod.vendorId === auth.vendorProfileId;
      const myOffer = prod.sellerOffers?.[0];

      let vendorPrice = Number(prod.basePrice);
      let vendorOriginalPrice = prod.discountPrice ? Number(prod.discountPrice) : Number(prod.basePrice);
      let totalStock = 0;
      let isBuyBoxWinner = false;

      if (isOriginalCreator) {
        totalStock = prod.inventories.reduce(
          (sum, inv) => sum + Math.max(0, inv.quantity - inv.reservedQuantity),
          0
        );
      } else if (myOffer) {
        isBuyBoxWinner = Boolean(myOffer.isBuyBoxWinner);
        const offerVariants = myOffer.offerVariants || [];
        if (offerVariants.length > 0) {
          const prices = offerVariants.map((ov: any) => Number(ov.sellingPrice));
          vendorPrice = Math.min(...prices);
          const mrps = offerVariants.map((ov: any) => Number(ov.mrpPrice || ov.sellingPrice));
          vendorOriginalPrice = Math.max(...mrps);
          totalStock = offerVariants.reduce((sum: number, ov: any) => {
            const vStock = (ov.inventories || []).reduce(
              (iSum: number, inv: any) => iSum + Math.max(0, inv.quantity - inv.reservedQuantity),
              0
            );
            return sum + vStock;
          }, 0);
        }
      }

      const primaryImage =
        prod.images.find((img) => img.isPrimary)?.url ||
        prod.images[0]?.url ||
        'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80';

      return {
        id: prod.id,
        title: prod.title,
        subtitle: prod.subtitle,
        slug: prod.slug,
        brand: prod.brand,
        price: vendorPrice,
        originalPrice: vendorOriginalPrice,
        isPublished: prod.isPublished,
        isCustomized: Boolean((prod as any).isCustomized),
        status: prod.isPublished ? 'PUBLISHED' : 'DRAFT',
        category: prod.category,
        image: primaryImage,
        images: prod.images,
        totalStock,
        variantsCount: prod.variants.length,
        rating: prod.rating,
        reviewCount: prod.reviewCount,
        isOriginalCreator,
        listingType: isOriginalCreator ? 'ORIGINAL_LISTING' : 'SELLER_OFFER',
        isBuyBoxWinner,
        offerId: myOffer?.id,
        createdAt: prod.createdAt.toISOString(),
        updatedAt: prod.updatedAt.toISOString(),
      };
    });

    return apiSuccess(formatted);
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    return handleApiError(err);
  }
}

/**
 * POST /api/vendor/products
 * Creates a new product for the authenticated vendor inside a Prisma transaction.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireVendor();
    const body = await request.json();

    // 1. Validation
    const title = body.title?.trim();
    if (!title) {
      return apiError('Product title is required.', 400);
    }

    const brand = body.brand?.trim() || auth.dbUser.vendorProfile?.storeName || 'Vyntra Artisan';
    const categoryId = body.categoryId?.trim();
    if (!categoryId) {
      return apiError('Please select a valid category.', 400);
    }

    // Verify category exists
    const categoryExists = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    if (!categoryExists) {
      return apiError('The selected category does not exist.', 400);
    }

    const price = Number(body.price);
    if (isNaN(price) || price <= 0) {
      return apiError('Base price must be a positive number.', 400);
    }

    const originalPrice = body.originalPrice ? Number(body.originalPrice) : price;
    // Publishing & Governance:
    // Super Admins & Admins (like Tarun Store) publish directly to the live marketplace.
    // For third-party sellers, if they submit with isPublished: true, Super Admin/Admin status automatically approves it.
    const wantsPublish = Boolean(body.isPublished);
    const isAdminOrSuperAdmin = auth.role === 'ADMIN' || auth.role === 'SUPER_ADMIN';
    const isPublished = isAdminOrSuperAdmin ? wantsPublish : (body.directAdminPublish === true);
    const isCustomized = Boolean(body.isCustomized);
    const description = body.description?.trim() || null;
    const subtitle = body.subtitle?.trim() || null;

    let finalDescription = description;
    if (body.aplus || body.specs || body.highlights) {
      finalDescription = JSON.stringify({
        plainDescription: description || '',
        specs: Array.isArray(body.specs) ? body.specs : [],
        highlights: Array.isArray(body.highlights) ? body.highlights : [],
        aplus: body.aplus || null,
      });
    }

    // Base SKU
    const rawSku = (body.sku?.trim() || `${slugify(brand).toUpperCase()}-${Date.now().toString().slice(-6)}`).toUpperCase();

    // Images
    const rawImages: string[] = Array.isArray(body.images)
      ? body.images.filter((img: any) => typeof img === 'string' && img.trim().length > 0)
      : [];
    if (rawImages.length === 0 && body.image) {
      rawImages.push(body.image.trim());
    }
    // Fallback image if none provided
    if (rawImages.length === 0) {
      rawImages.push('https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80');
    }

    // Variants & stock
    const stockQuantity = Math.max(0, parseInt(body.stock, 10) || 10);
    const variantsInput = Array.isArray(body.variants) && body.variants.length > 0 ? body.variants : null;

    // Generate unique slug
    const cleanBaseSlug = slugify(title);
    const uniqueSlug = `${cleanBaseSlug}-${Math.random().toString(36).substring(2, 7)}`;

    // 2. Transactional creation
    const created = await prisma.$transaction(async (tx) => {
      // Create Product
      const product = await tx.product.create({
        data: {
          title,
          subtitle,
          slug: uniqueSlug,
          description: finalDescription,
          brand,
          basePrice: price,
          discountPrice: originalPrice > price ? originalPrice : null,
          hasVariants: Boolean(variantsInput && variantsInput.length > 1),
          isPublished,
          isCustomized,
          categoryId,
          vendorId: auth.vendorProfileId,
        },
      });

      // Create Images
      await tx.productImage.createMany({
        data: rawImages.map((url, idx) => ({
          productId: product.id,
          url,
          altText: `${title} - Image ${idx + 1}`,
          isPrimary: idx === 0,
          sortOrder: idx,
        })),
      });

      // Resolve Vendor's real registered warehouse location
      const defaultWarehouse = await tx.vendorWarehouse.findFirst({
        where: { vendorId: auth.vendorProfileId, isDefault: true },
      });
      const resolvedWarehouseLocation = defaultWarehouse
        ? `${defaultWarehouse.facilityName} (${defaultWarehouse.city})`
        : 'Vendor Dispatch Facility';

      // Create Variants & Inventories
      if (variantsInput && variantsInput.length > 0) {
        for (let i = 0; i < variantsInput.length; i++) {
          const v = variantsInput[i];
          const rawVariantSku = (v.sku?.trim() || `${rawSku}-V${i + 1}`).toUpperCase();
          const variantSku = await ensureUniqueVariantSku(tx, rawVariantSku);
          const vPrice = Number(v.price) || price;
          const vStock = Math.max(0, parseInt(v.stock, 10) || stockQuantity);

          const variant = await tx.productVariant.create({
            data: {
              productId: product.id,
              sku: variantSku,
              size: v.size?.trim() || null,
              color: v.color?.trim() || null,
              price: vPrice,
              originalPrice: originalPrice > vPrice ? originalPrice : null,
              imageUrl: v.imageUrl || rawImages[0],
            },
          });

          await tx.productInventory.create({
            data: {
              productId: product.id,
              variantId: variant.id,
              vendorId: auth.vendorProfileId,
              sku: variantSku,
              quantity: vStock,
              reservedQuantity: 0,
              lowStockThreshold: 5,
              warehouseLocation: resolvedWarehouseLocation,
            },
          });
        }
      } else {
        // Default standard variant
        const uniqueDefaultSku = await ensureUniqueVariantSku(tx, rawSku);
        const defaultVariant = await tx.productVariant.create({
          data: {
            productId: product.id,
            sku: uniqueDefaultSku,
            size: body.size?.trim() || 'Standard',
            color: body.color?.trim() || 'Classic',
            price: price,
            originalPrice: originalPrice > price ? originalPrice : null,
            imageUrl: rawImages[0],
          },
        });

        await tx.productInventory.create({
          data: {
            productId: product.id,
            variantId: defaultVariant.id,
            vendorId: auth.vendorProfileId,
            sku: uniqueDefaultSku,
            quantity: stockQuantity,
            reservedQuantity: 0,
            lowStockThreshold: 5,
            warehouseLocation: resolvedWarehouseLocation,
          },
        });
      }

      return product;
    });

    invalidateProduct(created.slug, created.id);

    return apiSuccess({
      message: isPublished
        ? 'Product published successfully!'
        : wantsPublish
        ? 'Listing submitted for Admin Review. Once approved by Marketplace Governance, it will go live.'
        : 'Product draft saved successfully.',
      productId: created.id,
      slug: created.slug,
      isPublished: created.isPublished,
    }, undefined, 201);
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    return handleApiError(err);
  }
}
