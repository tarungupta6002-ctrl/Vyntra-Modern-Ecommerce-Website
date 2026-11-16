import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getProductBySlug, DetailedProduct } from '@/data/products';
import { resolveBuyBox } from '@/lib/buy-box';
import { SellerOfferItem } from '@/types/multiseller';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    slug: string;
  };
}

/**
 * Format a Prisma Product model into the DetailedProduct shape expected by ProductDetailView.
 * Ensures zero leakage of private vendor metadata.
 */
function formatDetailedProduct(product: any): DetailedProduct {
  const sellingPrice = Number(product.discountPrice ?? product.basePrice);
  const originalPrice = Number(product.basePrice);
  const discountStr =
    originalPrice > sellingPrice
      ? `${Math.round(((originalPrice - sellingPrice) / originalPrice) * 100)}% OFF Festive Deal`
      : 'Standard Price';

  const totalStock = (product.inventories || []).reduce(
    (acc: number, inv: any) =>
      acc + Math.max(0, (inv.quantity || 0) - (inv.reservedQuantity || 0)),
    0
  );

  const images = (product.images || []).map((img: any, idx: number) => ({
    id: img.id || idx,
    title: img.altText || product.title,
    alt: img.altText || `${product.title} - angle ${idx + 1}`,
    src: img.url,
  }));

  if (images.length === 0) {
    images.push({
      id: 0,
      title: product.title,
      alt: product.title,
      src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAZY6Rn1sX9zajvu57JMzOmU7lTmvqI-LwLj8FZkGKPKa2fDRcswkkFSPDEu2zQusfLQWUiFp9H4LzwuJYFJbuF9bGPKbWzWd4XagxqkVICEurmu18QQYfHOCl534lDi1BtAdVsfQh39l8Mvx4sE-mOFzw7JsKJkwKtMR1GcEXqC7L8Z5IXFPP91xobDUp-qeMs0I6rAor8wRM1atkC0vFuzXoUFhDnmnOtgVY-ahc',
    });
  }

  // Group variants by size and color
  const sizes = (product.variants || [])
    .filter((v: any) => v.size)
    .map((v: any) => {
      const variantStock = (v.inventories || []).reduce(
        (acc: number, inv: any) =>
          acc + Math.max(0, (inv.quantity || 0) - (inv.reservedQuantity || 0)),
        0
      );
      return {
        size: v.size,
        dimension: v.sku,
        disabled: variantStock <= 0,
      };
    });

  const colors = Array.from(
    new Set((product.variants || []).map((v: any) => v.color).filter(Boolean))
  ).map((c: any) => ({
    name: c,
    hex: '#00288e',
  }));

  // Reviews formatting - strictly actual APPROVED reviews from database
  const approvedReviews = product.reviews || [];
  const reviewsList = approvedReviews.map((r: any) => ({
    id: r.id,
    author: r.user?.name || 'Verified Patron',
    initials: (r.user?.name || 'VP')
      .split(' ')
      .map((s: string) => s[0])
      .join('')
      .slice(0, 2)
      .toUpperCase(),
    verified: Boolean(r.isVerified),
    location: 'India',
    rating: r.rating,
    date: new Date(r.createdAt).toLocaleDateString('en-IN', {
      month: 'short',
      year: 'numeric',
    }),
    title: r.title || 'Product Feedback',
    text: r.comment || '',
    helpfulCount: 0,
  }));

  const totalApproved = reviewsList.length;
  const breakdown = [5, 4, 3, 2, 1].map((stars) => {
    const count = reviewsList.filter((r: any) => r.rating === stars).length;
    const pct = totalApproved > 0 ? Math.round((count / totalApproved) * 100) : 0;
    return { stars, pct };
  });

  const averageRating =
    totalApproved > 0
      ? Number((reviewsList.reduce((acc: number, r: any) => acc + r.rating, 0) / totalApproved).toFixed(1))
      : 0;

  const highRatingsCount = reviewsList.filter((r: any) => r.rating >= 4).length;
  const recommendedPct = totalApproved > 0 ? Math.round((highRatingsCount / totalApproved) * 100) : 0;

  // Multi-Seller Offers and Buy Box resolution
  let allOffers: SellerOfferItem[] = [];
  if (product.sellerOffers && product.sellerOffers.length > 0) {
    allOffers = product.sellerOffers.map((so: any) => {
      const offerVariants = (so.offerVariants || []).map((ov: any) => {
        const vStock = (ov.inventories || []).reduce(
          (sum: number, inv: any) =>
            sum + Math.max(0, (inv.quantity || 0) - (inv.reservedQuantity || 0)),
          0
        );
        return {
          id: ov.id,
          productVariantId: ov.productVariantId,
          sellerSku: ov.sellerSku,
          sellingPrice: Number(ov.sellingPrice),
          mrpPrice: Number(ov.mrpPrice),
          stock: vStock,
        };
      });

      const offerStock = offerVariants.reduce((sum: number, ov: any) => sum + ov.stock, 0);
      const minOfferPrice =
        offerVariants.length > 0
          ? Math.min(...offerVariants.map((ov: any) => ov.sellingPrice))
          : Number(product.discountPrice ?? product.basePrice);
      const minOfferMrp =
        offerVariants.length > 0
          ? Math.max(...offerVariants.map((ov: any) => ov.mrpPrice))
          : Number(product.basePrice);

      return {
        id: so.id,
        productId: so.productId,
        vendorId: so.vendorId,
        vendor: {
          id: so.vendor?.id || so.vendorId,
          storeName: so.vendor?.storeName || 'Artisan Partner',
          storeSlug: so.vendor?.storeSlug || 'artisan',
          rating: Number(so.vendor?.rating || 4.8),
          isVerified: Boolean(so.vendor?.isVerified ?? true),
          city: so.vendor?.city || undefined,
          state: so.vendor?.state || undefined,
        },
        condition: (so.condition as any) || 'NEW',
        sellingPrice: minOfferPrice,
        originalPrice: minOfferMrp > minOfferPrice ? minOfferMrp : minOfferPrice,
        discountPercent:
          minOfferMrp > minOfferPrice
            ? Math.round(((minOfferMrp - minOfferPrice) / minOfferMrp) * 100)
            : 0,
        stock: offerStock,
        handlingDays: so.handlingDays || 2,
        estimatedDeliveryDays: (so.handlingDays || 2) + 2,
        fulfillmentType: (so.fulfillmentType as any) || 'SELLER_FULFILLED',
        shipsFrom: so.warehouse?.city
          ? `${so.warehouse.city}, ${so.warehouse.state}`
          : 'India',
        isBuyBoxWinner: false,
        offerVariants,
      };
    });
  }

  // Fallback to synthesized offers if no real seller offers in database
  if (allOffers.length === 0) {
    const primaryOffer: SellerOfferItem = {
      id: `offer-${product.id}-${product.vendor?.id || 'primary'}`,
      productId: product.id,
      vendorId: product.vendor?.id || 'primary',
      vendor: {
        id: product.vendor?.id || 'primary',
        storeName: product.vendor?.storeName || 'Vyntra Royal Guild',
        storeSlug: product.vendor?.storeSlug || 'vyntra-guild',
        rating: Number(product.vendor?.rating || 4.9),
        isVerified: Boolean(product.vendor?.isVerified ?? true),
        city: 'Bengaluru',
        state: 'Karnataka',
      },
      condition: 'NEW',
      sellingPrice,
      originalPrice,
      discountPercent:
        originalPrice > sellingPrice
          ? Math.round(((originalPrice - sellingPrice) / originalPrice) * 100)
          : 0,
      stock: totalStock,
      handlingDays: 1,
      estimatedDeliveryDays: 2,
      fulfillmentType: 'VYNTRA_FULFILLED',
      shipsFrom: 'Vyntra Prime Fulfillment Center, Bengaluru',
      isBuyBoxWinner: true,
    };

    const secondaryOffers: SellerOfferItem[] = [];
    if (product.brand && sellingPrice > 500) {
      secondaryOffers.push({
        id: `offer-${product.id}-artisan-reserve`,
        productId: product.id,
        vendorId: 'artisan-guild-direct',
        vendor: {
          id: 'artisan-guild-direct',
          storeName: `${product.brand} Heritage Studio`,
          storeSlug: 'heritage-studio',
          rating: 4.8,
          isVerified: true,
          city: 'Jaipur',
          state: 'Rajasthan',
        },
        condition: 'NEW',
        sellingPrice: Math.round(sellingPrice * 1.04),
        originalPrice,
        discountPercent: Math.max(
          0,
          Math.round(((originalPrice - sellingPrice * 1.04) / originalPrice) * 100)
        ),
        stock: Math.max(5, Math.round(totalStock * 0.8)),
        handlingDays: 2,
        estimatedDeliveryDays: 4,
        fulfillmentType: 'SELLER_FULFILLED',
        shipsFrom: 'Master Weavers Atelier, Jaipur',
        isBuyBoxWinner: false,
      });
    }

    allOffers = [primaryOffer, ...secondaryOffers];
  }

  const buyBox = resolveBuyBox(allOffers);

  // Merge with rich reference metadata if this matches a showcase item, or supply rich defaults
  const referenceItem = getProductBySlug(product.slug);

  return {
    id: product.id,
    slug: product.slug,
    sku: product.variants?.[0]?.sku || `VYN-${product.id.slice(-6).toUpperCase()}`,
    title: product.title,
    subtitle: product.subtitle || product.description || '',
    brand: product.brand,
    vendorName: product.vendor?.storeName || 'Vyntra Royal Guild',
    category: (product.category?.slug as any) || 'ethnic',
    subCategory: product.category?.name || 'Artisanal Collection',
    breadcrumb: [
      { label: 'Home', href: '/' },
      { label: 'Catalog', href: '/products' },
      { label: product.category?.name || 'Collections', href: `/products?category=${product.category?.slug || 'ethnic'}` },
      { label: product.title, href: `/products/${product.slug}` },
    ],
    price: sellingPrice,
    originalPrice,
    discount: discountStr,
    rating: totalApproved > 0 ? averageRating : (product.rating > 0 ? product.rating : 0),
    reviewCount: totalApproved,
    recommendedPct,
    badge: product.rating >= 4.8 ? 'HERITAGE BESTSELLER' : undefined,
    badgeVariant: 'secondary',
    giCertified: true,
    isExpress: true,
    stockCount: totalStock,
    rawVariants: (product.variants || []).map((v: any) => {
      const vStock = (v.inventories || []).reduce(
        (acc: number, inv: any) =>
          acc + Math.max(0, (inv.quantity || 0) - (inv.reservedQuantity || 0)),
        0
      );
      return {
        id: v.id,
        sku: v.sku,
        size: v.size,
        color: v.color,
        price: Number(v.price),
        originalPrice: v.originalPrice ? Number(v.originalPrice) : null,
        stock: vStock,
        imageUrl: v.imageUrl,
      };
    }),
    images,
    colors: colors.length > 0 ? colors : (referenceItem?.colors || [{ name: 'Royal Heritage', hex: '#00288e' }]),
    sizeLabel: 'Select Size / Dimension',
    sizes: sizes.length > 0 ? sizes : (referenceItem?.sizes || [{ size: 'Free Size', disabled: false }]),
    sizeGuide: referenceItem?.sizeGuide,
    modelInfo: referenceItem?.modelInfo || 'Crafted with premium natural materials and artisanal techniques.',
    tabs: referenceItem?.tabs || {
      story: {
        badge: 'Direct Artisan Weave',
        title: 'Master Craftsmanship & Heritage',
        description: [
          product.description ||
            'Each piece is produced in small batches by master craftspersons in accordance with traditional handloom standards.',
        ],
        stats: [
          { label: 'Artisan Hours', value: '36 hrs' },
          { label: 'Purity Standard', value: '100% Certified' },
        ],
        image: images[0]?.src,
      },
      specs: [
        { label: 'Brand', val: product.brand },
        { label: 'Vendor Guild', val: product.vendor?.storeName || 'Vyntra Atelier' },
        { label: 'Material Weave', val: 'Pure Organic Fiber' },
        { label: 'Origin', val: 'India' },
      ],
      care: [
        { iconName: 'sparkles', title: 'Gentle Care', desc: 'Dry clean recommended for longevity.' },
      ],
      guarantee: [
        { iconName: 'shieldCheck', title: 'Vyntra Authenticity', desc: '100% genuine guaranteed.' },
      ],
    },
    bundle: referenceItem?.bundle,
    buyBox,
    sellerOffers: allOffers,
    reviews: {
      average: totalApproved > 0 ? averageRating : (product.rating > 0 ? product.rating : 0),
      total: totalApproved,
      breakdown,
      customerPhotos: [],
      list: reviewsList,
    },
    relatedProducts: referenceItem?.relatedProducts || [],
    recentlyViewed: referenceItem?.recentlyViewed || [],
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
