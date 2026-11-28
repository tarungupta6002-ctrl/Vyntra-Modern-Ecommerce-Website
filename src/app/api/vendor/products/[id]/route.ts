import { NextResponse } from 'next/server';
import { requireVendor, verifyVendorOwnership, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { findDefaultPickupAddress, PICKUP_ADDRESS_REQUIRED, warehouseLabel } from '@/lib/vendor/pickup-address';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { invalidateProduct } from '@/lib/cache-invalidation';
import { Prisma } from '@prisma/client';
import { checkListingCategory, getCategoryPathSlugs, validateListingAttributes } from '@/lib/catalog/category-path';
import { sanitizeSizeChart, sizeChartKindFor, type SizeChart } from '@/lib/catalog/size-chart';
import { readStoredAttributes, type ProductAttributes } from '@/lib/catalog/attributes';

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

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * GET /api/vendor/products/[id]
 * Retrieves single product owned by the vendor for editing.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = await requireVendor();
    const { id } = context.params;

    await verifyVendorOwnership(id, auth.vendorProfileId);

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
          select: { id: true, url: true, altText: true, isPrimary: true, sortOrder: true },
        },
        variants: {
          include: {
            inventories: {
              where: { vendorId: auth.vendorProfileId },
              select: { id: true, quantity: true, reservedQuantity: true, warehouseLocation: true },
            },
          },
        },
      },
    });

    if (!product) {
      return apiError('Product not found.', 404);
    }

    const totalStock = product.variants.reduce((sum, v) => {
      const invStock = v.inventories.reduce(
        (acc, inv) => acc + Math.max(0, inv.quantity - inv.reservedQuantity),
        0
      );
      return sum + invStock;
    }, 0);

    let aplus = null;
    let specs: Array<{ label: string; value: string }> = [];
    let highlights: string[] = [];
    let sizeChart: SizeChart | null = null;
    let plainDescription = product.description;
    if (product.description && product.description.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(product.description);
        if (parsed?.aplus) {
          aplus = parsed.aplus;
        }
        if (Array.isArray(parsed?.specs)) {
          specs = parsed.specs;
        }
        if (Array.isArray(parsed?.highlights)) {
          highlights = parsed.highlights;
        }
        if (parsed?.sizeChart) {
          sizeChart = sanitizeSizeChart(parsed.sizeChart);
        }
        plainDescription = parsed.plainDescription || '';
      } catch {}
    }

    return apiSuccess({
      id: product.id,
      title: product.title,
      subtitle: product.subtitle,
      slug: product.slug,
      description: plainDescription,
      specs,
      highlights,
      aplus,
      sizeChart,
      attributes: readStoredAttributes((product as any).attributes),
      brand: product.brand,
      price: Number(product.basePrice),
      originalPrice: product.discountPrice ? Number(product.discountPrice) : Number(product.basePrice),
      isPublished: product.isPublished,
      isCustomized: Boolean((product as any).isCustomized),
      categoryId: product.categoryId,
      category: product.category,
      images: product.images,
      totalStock,
      variants: product.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        size: v.size,
        color: v.color,
        price: Number(v.price),
        originalPrice: v.originalPrice ? Number(v.originalPrice) : null,
        stock: v.inventories[0]?.quantity ?? 0,
        imageUrl: v.imageUrl,
        attributes: readStoredAttributes((v as any).attributes),
      })),
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    return handleApiError(err);
  }
}

/**
 * PUT /api/vendor/products/[id]
 * Updates product details, variants, inventory, and images.
 */
export async function PUT(request: Request, context: RouteContext) {
  try {
    const auth = await requireVendor();
    const { id } = context.params;

    await verifyVendorOwnership(id, auth.vendorProfileId);
    const body = await request.json();

    // Multi-Seller Governance: Once a product is published to the master catalog,
    // vendors cannot directly alter master catalog fields (title, brand, category).
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      select: { id: true, isPublished: true, title: true, brand: true, categoryId: true, slug: true },
    });

    const isAdmin = auth.role === 'ADMIN' || auth.role === 'SUPER_ADMIN';

    const title = body.title?.trim();
    if (!title) {
      return apiError('Product title is required.', 400);
    }

    const brand = body.brand?.trim() || auth.dbUser.vendorProfile?.storeName || 'Vyntra Artisan';
    const categoryId = body.categoryId?.trim();
    if (!categoryId) {
      return apiError('Please select a valid category.', 400);
    }

    // A changed category must be a final, in-use one (an unchanged one is kept as it is).
    const categoryCheck =
      existingProduct?.categoryId === categoryId
        ? { path: await getCategoryPathSlugs(categoryId) }
        : await checkListingCategory(categoryId);
    if (categoryCheck.error) {
      return apiError(categoryCheck.error, 400, null, 'INVALID_CATEGORY');
    }
    const sizeChart = sizeChartKindFor(categoryCheck.path ?? []) === body.sizeChart?.kind ? sanitizeSizeChart(body.sizeChart) : null;

    if (existingProduct?.isPublished && !isAdmin) {
      if (
        existingProduct.title !== title ||
        existingProduct.brand !== brand ||
        existingProduct.categoryId !== categoryId
      ) {
        return apiError(
          'This product is an approved master catalog listing. Vendors cannot directly alter master catalog attributes (title, brand, category). To update your pricing or stock, use your Seller Offer.',
          403
        );
      }
    }

    const price = Number(body.price);
    if (isNaN(price) || price <= 0) {
      return apiError('Base price must be a positive number.', 400);
    }

    const originalPrice = body.originalPrice ? Number(body.originalPrice) : price;
    const isPublished = typeof body.isPublished === 'boolean' ? body.isPublished : undefined;
    if (isPublished === true && !(await findDefaultPickupAddress(auth.vendorProfileId))) {
      return apiError(PICKUP_ADDRESS_REQUIRED, 400, null, 'PICKUP_ADDRESS_REQUIRED');
    }
    const description = body.description?.trim() || null;
    const subtitle = body.subtitle?.trim() || null;
    const stockQuantity = Math.max(0, parseInt(body.stock, 10) || 10);

    // Category-specific attributes. Only touched when the client sends them (older clients don't).
    let attributesUpdate: Prisma.InputJsonValue | typeof Prisma.DbNull | undefined;
    let variantAttributesUpdate: ProductAttributes[] | null = null;
    if (body.attributes !== undefined) {
      const willBePublished = isPublished ?? Boolean(existingProduct?.isPublished);
      // Variant values come from the request when sent, otherwise from what is stored.
      const sentVariantAttrs = Array.isArray(body.variants) && body.variants.some((v: any) => v?.attributes !== undefined);
      const variantInputs = sentVariantAttrs
        ? body.variants.map((v: any) => v?.attributes)
        : (await prisma.productVariant.findMany({ where: { productId: id }, select: { attributes: true } })).map((v) => v.attributes);
      const check = await validateListingAttributes(categoryId, body.attributes, variantInputs, willBePublished);
      if (check.errors.length > 0) {
        return apiError(check.errors[0], 400, { errors: check.errors }, 'INVALID_ATTRIBUTES');
      }
      attributesUpdate = Object.keys(check.attributes).length > 0 ? check.attributes : Prisma.DbNull;
      if (sentVariantAttrs) variantAttributesUpdate = check.variantAttributes;
    }
    const variantAttrData = (i: number) =>
      variantAttributesUpdate
        ? { attributes: Object.keys(variantAttributesUpdate[i] || {}).length > 0 ? variantAttributesUpdate[i] : Prisma.DbNull }
        : {};

    let finalDescription = description;
    if (body.aplus || body.specs || body.highlights || sizeChart) {
      finalDescription = JSON.stringify({
        plainDescription: description || '',
        specs: Array.isArray(body.specs) ? body.specs : [],
        highlights: Array.isArray(body.highlights) ? body.highlights : [],
        aplus: body.aplus || null,
        sizeChart,
      });
    }

    const rawImages: string[] = Array.isArray(body.images)
      ? body.images.filter((img: any) => typeof img === 'string' && img.trim().length > 0)
      : [];
    if (rawImages.length === 0 && body.image) {
      rawImages.push(body.image.trim());
    }

    const isCustomized = typeof body.isCustomized === 'boolean' ? body.isCustomized : undefined;
    const variantsInput = Array.isArray(body.variants) && body.variants.length > 0 ? body.variants : null;

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update basic product attributes
      const prod = await tx.product.update({
        where: { id },
        data: {
          title,
          subtitle,
          description: finalDescription,
          brand,
          basePrice: price,
          discountPrice: originalPrice > price ? originalPrice : null,
          categoryId,
          ...(isPublished !== undefined ? { isPublished } : {}),
          ...(isCustomized !== undefined ? { isCustomized } : {}),
          ...(variantsInput ? { hasVariants: variantsInput.length > 1 } : {}),
          ...(attributesUpdate !== undefined ? { attributes: attributesUpdate } : {}),
        },
      });

      // 2. Replace images if provided
      if (rawImages.length > 0) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        await tx.productImage.createMany({
          data: rawImages.map((url, idx) => ({
            productId: id,
            url,
            altText: `${title} - Image ${idx + 1}`,
            isPrimary: idx === 0,
            sortOrder: idx,
          })),
        });
      }

      // 3. Resolve Vendor's real registered warehouse location
      const defaultWarehouse = await tx.vendorWarehouse.findFirst({
        where: { vendorId: auth.vendorProfileId, isDefault: true },
      });
      const resolvedWarehouseLocation = defaultWarehouse ? warehouseLabel(defaultWarehouse) : null;

      // 4. Update variants & inventories if variants array provided
      if (variantsInput && variantsInput.length > 0) {
        // Find existing variants for this product
        const existingVariants = await tx.productVariant.findMany({
          where: { productId: id },
        });

        for (let i = 0; i < variantsInput.length; i++) {
          const v = variantsInput[i];
          const rawVariantSku = (v.sku?.trim() || `${slugify(brand).toUpperCase()}-${id.slice(-4)}-V${i + 1}`).toUpperCase();
          const matched = existingVariants.find((ev) => ev.id === v.id || ev.sku === rawVariantSku);
          const variantSku = await ensureUniqueVariantSku(tx, rawVariantSku, matched?.id);
          const vPrice = Number(v.price) || price;
          const vStock = Math.max(0, parseInt(v.stock, 10) || stockQuantity);

          let variantId = v.id;

          if (matched) {
            variantId = matched.id;
            await tx.productVariant.update({
              where: { id: matched.id },
              data: {
                sku: variantSku,
                size: v.size?.trim() || null,
                color: v.color?.trim() || null,
                price: vPrice,
                originalPrice: originalPrice > vPrice ? originalPrice : null,
                imageUrl: v.imageUrl || rawImages[0] || null,
                ...variantAttrData(i),
              },
            });
          } else {
            const newVar = await tx.productVariant.create({
              data: {
                productId: id,
                sku: variantSku,
                size: v.size?.trim() || null,
                color: v.color?.trim() || null,
                price: vPrice,
                originalPrice: originalPrice > vPrice ? originalPrice : null,
                imageUrl: v.imageUrl || rawImages[0] || null,
                ...variantAttrData(i),
              },
            });
            variantId = newVar.id;
          }

          // Upsert inventory
          await tx.productInventory.upsert({
            where: {
              vendorId_sku: {
                vendorId: auth.vendorProfileId,
                sku: variantSku,
              },
            },
            update: {
              quantity: vStock,
              variantId,
              ...(resolvedWarehouseLocation ? { warehouseLocation: resolvedWarehouseLocation } : {}),
            },
            create: {
              productId: id,
              variantId,
              vendorId: auth.vendorProfileId,
              sku: variantSku,
              quantity: vStock,
              reservedQuantity: 0,
              lowStockThreshold: 5,
              warehouseLocation: resolvedWarehouseLocation,
            },
          });
        }

        // Automatically prune orphaned variants that the vendor explicitly excluded / removed
        const submittedVariantIds = new Set(variantsInput.map((v: any) => v.id).filter(Boolean));
        const submittedSkus = new Set(variantsInput.map((v: any) => (v.sku?.trim() || '').toUpperCase()));
        const orphanedVariants = existingVariants.filter(
          (ev) => !submittedVariantIds.has(ev.id) && !submittedSkus.has(ev.sku.toUpperCase())
        );
        if (orphanedVariants.length > 0) {
          const orphanIds = orphanedVariants.map((ov) => ov.id);
          const orderedCount = await tx.orderItem.count({
            where: { variantId: { in: orphanIds } },
          });
          if (orderedCount === 0) {
            await tx.productInventory.deleteMany({ where: { variantId: { in: orphanIds } } });
            await tx.productVariant.deleteMany({ where: { id: { in: orphanIds } } });
          }
        }
      } else if (typeof body.stock === 'number' || typeof body.stock === 'string') {
        // Fallback: single primary variant stock update
        const primaryVariant = await tx.productVariant.findFirst({
          where: { productId: id },
          orderBy: { createdAt: 'asc' },
        });

        if (primaryVariant) {
          await tx.productInventory.upsert({
            where: {
              vendorId_sku: {
                vendorId: auth.vendorProfileId,
                sku: primaryVariant.sku,
              },
            },
            update: {
              quantity: stockQuantity,
            },
            create: {
              productId: id,
              variantId: primaryVariant.id,
              vendorId: auth.vendorProfileId,
              sku: primaryVariant.sku,
              quantity: stockQuantity,
              reservedQuantity: 0,
              lowStockThreshold: 5,
              warehouseLocation: resolvedWarehouseLocation,
            },
          });
        }
      }

      return prod;
    });

    invalidateProduct(updated.slug, updated.id, existingProduct?.slug);

    return apiSuccess({
      message: 'Product updated successfully.',
      productId: updated.id,
      isPublished: updated.isPublished,
    });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    return handleApiError(err);
  }
}

/**
 * DELETE /api/vendor/products/[id]
 * Safely deletes a vendor's product (and associated variants, inventory, and images via Prisma cascade).
 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const auth = await requireVendor();
    const { id } = context.params;

    const product = await verifyVendorOwnership(id, auth.vendorProfileId);

    // Safe deletion: removes Product and cascades to ProductImage, ProductVariant, ProductInventory
    await prisma.product.delete({
      where: { id },
    });

    invalidateProduct(product.slug, id);

    return apiSuccess({
      message: `Product "${product.title}" has been safely deleted.`,
      deletedId: id,
    });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    return handleApiError(err);
  }
}
