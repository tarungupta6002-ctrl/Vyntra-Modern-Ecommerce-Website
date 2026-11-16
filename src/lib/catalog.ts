import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { Prisma, ReviewStatus } from '@prisma/client';
import {
  PRODUCTS_DATABASE,
  getProductBySlug as getFallbackProductBySlug,
  DetailedProduct,
} from '@/data/products';
import { APlusData, createDefaultAPlusContent } from '@/types/aplus';
import { resolveBuyBox } from '@/lib/buy-box';
import { SellerOfferItem, BuyBoxResult } from '@/types/multiseller';

function getColorHex(colorName: string): string {
  const lower = (colorName || '').toLowerCase();
  if (lower.includes('blue') || lower.includes('navy') || lower.includes('indigo') || lower.includes('sapphire')) return '#00288e';
  if (lower.includes('red') || lower.includes('crimson') || lower.includes('maroon') || lower.includes('ruby')) return '#800020';
  if (lower.includes('green') || lower.includes('emerald') || lower.includes('forest') || lower.includes('olive')) return '#005a36';
  if (lower.includes('gold') || lower.includes('yellow') || lower.includes('mustard') || lower.includes('haldi')) return '#FFD814';
  if (lower.includes('black') || lower.includes('onyx') || lower.includes('charcoal')) return '#111111';
  if (lower.includes('white') || lower.includes('ivory') || lower.includes('cream')) return '#FFFFF0';
  if (lower.includes('pink') || lower.includes('rose') || lower.includes('blush') || lower.includes('rani')) return '#E07A5F';
  if (lower.includes('purple') || lower.includes('violet') || lower.includes('plum')) return '#4A154B';
  if (lower.includes('orange') || lower.includes('saffron') || lower.includes('rust') || lower.includes('terracotta')) return '#DD6B20';
  if (lower.includes('grey') || lower.includes('gray') || lower.includes('silver')) return '#718096';
  return '#2D3748';
}

export interface FormattedCatalogProduct {
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

export interface CatalogQueryOptions {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  sort?: string;
  limit?: number;
  page?: number;
}

/**
 * Strips sensitive vendor metadata and formats a Prisma product for public listing.
 */
export function formatCatalogProduct(product: any): FormattedCatalogProduct {
  const sellingPrice = Number(product.discountPrice ?? product.basePrice);
  const originalPrice = Number(product.basePrice);
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
 * Formats a Prisma product into the DetailedProduct structure for PDP.
 */
export function formatDetailedProduct(product: any): DetailedProduct {
  const p1 = Number(product.basePrice || 0);
  const p2 = product.discountPrice ? Number(product.discountPrice) : null;

  // The actual price the customer pays should ALWAYS be the lower price (sellingPrice).
  // The original MRP / strikethrough price should ALWAYS be the higher price (originalPrice).
  let sellingPrice = p1;
  let originalPrice = p1;

  if (p2 !== null && p2 > 0) {
    sellingPrice = Math.min(p1, p2);
    originalPrice = Math.max(p1, p2);
  }

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

  // Map real image-based variant swatches
  const colorMap = new Map<string, { name: string; hex: string; imageUrl?: string }>();
  (product.variants || []).forEach((v: any) => {
    if (v.color && !colorMap.has(v.color)) {
      colorMap.set(v.color, {
        name: v.color,
        hex: getColorHex(v.color),
        imageUrl: v.imageUrl || undefined,
      });
    }
  });
  const colors = Array.from(colorMap.values());

  // Parse structured Amazon A+ Content or generate curated default
  let aplusData: APlusData | undefined = undefined;
  let cleanDescription = '';

  if (product.description) {
    const rawDesc = product.description.trim();
    if (rawDesc.startsWith('{')) {
      try {
        const parsed = JSON.parse(rawDesc);
        if (parsed) {
          if (typeof parsed.plainDescription === 'string') {
            cleanDescription = parsed.plainDescription.trim();
          }
          if (parsed.aplus && Array.isArray(parsed.aplus.modules)) {
            aplusData = parsed.aplus;
          }
        }
      } catch {
        cleanDescription = rawDesc;
      }
    } else {
      cleanDescription = rawDesc;
    }
  }

  // Sanitize subtitle so it never contains raw JSON string
  const rawSubtitle = (product.subtitle || '').trim();
  const cleanSubtitle =
    rawSubtitle && !rawSubtitle.startsWith('{')
      ? rawSubtitle
      : cleanDescription && !cleanDescription.startsWith('{')
      ? cleanDescription
      : '';

  if (!aplusData) {
    aplusData = createDefaultAPlusContent({
      title: product.title,
      brand: product.brand,
      category: product.category?.name,
      heroImage: images[0]?.src,
      secondaryImage: images[1]?.src || images[0]?.src,
      storeName: product.vendor?.storeName,
    });
  }

  const reviewsList = (product.reviews || []).map((r: any) => ({
    id: r.id,
    author: r.user?.name || 'Verified Patron',
    initials: (r.user?.name || 'VP')
      .split(' ')
      .map((s: string) => s[0])
      .join('')
      .slice(0, 2)
      .toUpperCase(),
    verified: true,
    location: 'India',
    rating: r.rating,
    date: new Date(r.createdAt).toLocaleDateString('en-IN', {
      month: 'short',
      year: 'numeric',
    }),
    title: r.title || 'Exceptional Quality',
    text: r.comment || '',
    helpfulCount: 12,
  }));

  const referenceItem = getFallbackProductBySlug(product.slug);

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

  // Ensure the Original Creator / Primary Listing Vendor is ALWAYS included in multi-seller offers
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
      city: product.vendor?.city || 'Jaipur',
      state: product.vendor?.state || 'Rajasthan',
    },
    condition: 'NEW',
    sellingPrice,
    originalPrice,
    discountPercent:
      originalPrice > sellingPrice
        ? Math.round(((originalPrice - sellingPrice) / originalPrice) * 100)
        : 0,
    stock: totalStock,
    handlingDays: 2,
    estimatedDeliveryDays: 3,
    fulfillmentType: 'VYNTRA_FULFILLED',
    shipsFrom: 'Vyntra Dispatch Hub',
    isBuyBoxWinner: false,
    isOriginalCreator: true,
  };

  const hasPrimaryInOffers = allOffers.some((o) => o.vendorId === product.vendor?.id);
  if (!hasPrimaryInOffers) {
    // Original Creator is at the beginning of the list
    allOffers.unshift(primaryOffer);
  } else {
    const existingP = allOffers.find((o) => o.vendorId === product.vendor?.id);
    if (existingP) {
      existingP.isOriginalCreator = true;
    }
  }

  // The vendor who listed/created the new product (Original Creator) is ALWAYS the primary winner for the main PDP
  const creatorOffer =
    allOffers.find((o) => o.isOriginalCreator || o.vendorId === product.vendor?.id) ||
    allOffers[0];
  const secondaryOffers = allOffers.filter((o) => o.id !== creatorOffer?.id);

  creatorOffer.isBuyBoxWinner = true;
  for (const sec of secondaryOffers) {
    sec.isBuyBoxWinner = false;
  }

  const buyBox: BuyBoxResult = {
    winner: creatorOffer,
    otherOffers: secondaryOffers,
    totalOffersCount: allOffers.length,
    lowestPrice: Math.min(...allOffers.map((o) => o.sellingPrice)),
    highestPrice: Math.max(...allOffers.map((o) => o.sellingPrice)),
  };

  return {
    id: product.id,
    slug: product.slug,
    sku: product.variants?.[0]?.sku || `VYN-${product.id.slice(-6).toUpperCase()}`,
    title: product.title,
    subtitle: cleanSubtitle,
    brand: product.brand,
    vendorName: product.vendor?.storeName || 'Vyntra Royal Guild',
    originalVendorId: product.vendor?.id,
    originalVendorName: product.vendor?.storeName || 'Vyntra Royal Guild',
    category: (product.category?.slug as any) || 'ethnic',
    subCategory: product.category?.name || 'Artisanal Collection',
    breadcrumb: [
      { label: 'Home', href: '/' },
      { label: 'Catalog', href: '/products' },
      {
        label: product.category?.name || 'Collections',
        href: `/products?category=${product.category?.slug || 'ethnic'}`,
      },
      { label: product.title, href: `/products/${product.slug}` },
    ],
    price: sellingPrice,
    originalPrice,
    discount: discountStr,
    rating: Number(product.rating ?? 0),
    reviewCount: Number(product.reviewCount ?? reviewsList.length),
    recommendedPct: 96,
    badge: (product.rating ?? 0) >= 4.8 && (product.reviewCount ?? 0) > 0 ? 'HERITAGE BESTSELLER' : undefined,
    badgeVariant: 'secondary',
    giCertified: true,
    isExpress: true,
    isCustomized: Boolean(product.isCustomized),
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
    highlights: [
      `Artisan Heritage Brand: ${product.brand}`,
      `Authentic Certified: Crafted under strict Vyntra quality assurance`,
      product.isCustomized
        ? 'Customized / Made to Order: Specially handcrafted upon order placement'
        : 'Ready to Ship: Express dispatch in premium protective packaging',
      'Direct from Verified Weaver & Artisan Guild across India',
    ],
    images,
    colors:
      colors.length > 0
        ? colors
        : referenceItem?.colors || [{ name: 'Royal Heritage', hex: '#00288e' }],
    sizeLabel: 'Select Size / Dimension',
    sizes:
      sizes.length > 0
        ? sizes
        : referenceItem?.sizes || [{ size: 'Free Size', disabled: false }],
    sizeGuide: referenceItem?.sizeGuide,
    modelInfo:
      referenceItem?.modelInfo ||
      'Crafted with premium natural materials and artisanal techniques.',
    tabs: referenceItem?.tabs || {
      story: {
        badge: 'Direct Artisan Weave',
        title: 'Master Craftsmanship & Heritage',
        description: [
          cleanDescription ||
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
        {
          iconName: 'sparkles',
          title: 'Gentle Care',
          desc: 'Dry clean recommended for longevity.',
        },
      ],
      guarantee: [
        {
          iconName: 'shieldCheck',
          title: 'Vyntra Authenticity',
          desc: '100% genuine guaranteed.',
        },
      ],
    },
    bundle: referenceItem?.bundle,
    aplusContent: aplusData,
    reviews: {
      average: Number(product.rating ?? 0),
      total: Number(product.reviewCount ?? reviewsList.length),
      breakdown: [5, 4, 3, 2, 1].map((stars) => {
        const count = reviewsList.filter((r: any) => r.rating === stars).length;
        const pct = reviewsList.length > 0 ? Math.round((count / reviewsList.length) * 100) : 0;
        return { stars, pct };
      }),
      customerPhotos: referenceItem?.reviews?.customerPhotos || [],
      list: reviewsList,
    },
    buyBox,
    sellerOffers: allOffers,
    relatedProducts: referenceItem?.relatedProducts || [],
    recentlyViewed: referenceItem?.recentlyViewed || [],
  };
}

/**
 * Cached DB query layer using Next.js unstable_cache.
 * NO try/catch inside so DB errors throw and fallbacks are never cached.
 */
function getCachedProduct(slug: string): Promise<DetailedProduct | null> {
  return unstable_cache(
    async () => {
      const productFromDb = await prisma.product.findFirst({
        where: {
          OR: [{ slug }, { id: slug }],
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
            where: { status: 'ACTIVE' },
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
            where: { status: ReviewStatus.APPROVED },
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
              user: {
                select: { name: true, avatar: true },
              },
            },
          },
        },
      });

      if (!productFromDb) return null;
      const formatted = formatDetailedProduct(productFromDb);
      return JSON.parse(JSON.stringify(formatted));
    },
    ['detailed-product', slug],
    {
      tags: ['products', `product-${slug}`],
      revalidate: 300,
    }
  )();
}

/**
 * Server-side function to query a detailed product by slug with fallback.
 * Wrapped with React cache() for per-request deduplication between generateMetadata and Page.
 */
export const getDetailedProductBySlug = cache(
  async (slug: string): Promise<{ product: DetailedProduct | null; isFallback: boolean }> => {
    try {
      const product = await getCachedProduct(slug);
      if (product) {
        return { product, isFallback: false };
      }
    } catch (err) {
      console.warn(`[getDetailedProductBySlug DB Query Warning for "${slug}"]`, err);
    }

    // Fallback to static reference database
    const fallback = getFallbackProductBySlug(slug);
  if (fallback) {
    if (!fallback.aplusContent) {
      fallback.aplusContent = createDefaultAPlusContent({
        title: fallback.title,
        brand: fallback.brand,
        category: fallback.category || 'fashion',
      });
    }
    if (fallback.colors && fallback.colors.length > 0) {
      fallback.colors = fallback.colors.map((c, i) => ({
        ...c,
        imageUrl: c.imageUrl || fallback.images[i]?.src || fallback.images[0]?.src,
      }));
    }
    if (!fallback.rawVariants || fallback.rawVariants.length === 0) {
      fallback.rawVariants = (fallback.sizes || [{ size: 'M' }]).flatMap((s) =>
        (fallback.colors || [{ name: 'Default' }]).map((c, idx) => ({
          id: `var-${fallback.id}-${s.size}-${c.name.replace(/\s+/g, '-').toLowerCase()}`,
          size: s.size,
          color: c.name,
          sku: `${fallback.sku}-${s.size}-${idx + 1}`,
          price: fallback.price,
          stock: 15,
        }))
      );
    }
    if (!fallback.sellerOffers || fallback.sellerOffers.length === 0) {
      const primaryOffer: SellerOfferItem = {
        id: `offer-${fallback.id}-primary`,
        productId: fallback.id,
        vendorId: 'vendor-vyntra-guild',
        vendor: {
          id: 'vendor-vyntra-guild',
          storeName: fallback.vendorName || 'Vyntra Prime Atelier',
          storeSlug: 'vyntra-prime',
          rating: 4.9,
          isVerified: true,
          city: 'Bengaluru',
          state: 'Karnataka',
        },
        condition: 'NEW',
        sellingPrice: fallback.price,
        originalPrice: fallback.originalPrice,
        discountPercent:
          fallback.originalPrice > fallback.price
            ? Math.round(((fallback.originalPrice - fallback.price) / fallback.originalPrice) * 100)
            : 0,
        stock: fallback.stockCount || 15,
        handlingDays: 1,
        estimatedDeliveryDays: 2,
        fulfillmentType: 'VYNTRA_FULFILLED',
        shipsFrom: 'Vyntra Prime Fulfillment Center, Bengaluru',
        isBuyBoxWinner: true,
      };

      const partnerOffer: SellerOfferItem = {
        id: `offer-${fallback.id}-artisan-reserve`,
        productId: fallback.id,
        vendorId: 'vendor-kora-heritage',
        vendor: {
          id: 'vendor-kora-heritage',
          storeName: 'Kora Artisanal Living Guild',
          storeSlug: 'kora-artisanal',
          rating: 4.7,
          isVerified: true,
          city: 'Jaipur',
          state: 'Rajasthan',
        },
        condition: 'NEW',
        sellingPrice: Math.round(fallback.price * 1.05),
        originalPrice: fallback.originalPrice,
        discountPercent: Math.max(
          0,
          Math.round(((fallback.originalPrice - fallback.price * 1.05) / fallback.originalPrice) * 100)
        ),
        stock: 8,
        handlingDays: 2,
        estimatedDeliveryDays: 4,
        fulfillmentType: 'SELLER_FULFILLED',
        shipsFrom: 'Master Weavers Studio, Jaipur',
        isBuyBoxWinner: false,
      };

      const allOffers = [primaryOffer, partnerOffer];
      fallback.sellerOffers = allOffers;
      fallback.buyBox = resolveBuyBox(allOffers);
    }
  }
  return { product: fallback || null, isFallback: true };
});
