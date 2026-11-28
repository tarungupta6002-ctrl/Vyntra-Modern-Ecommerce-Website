import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { Prisma, ReviewStatus } from '@prisma/client';
import {
  PRODUCTS_DATABASE,
  getProductBySlug as getFallbackProductBySlug,
  DetailedProduct,
  ProductColor,
  ProductSize,
} from '@/data/products';
import { getMobileDetailedProductBySlug } from '@/data/mobiles-fallback';
import { getElectronicsDetailedProductBySlug } from '@/data/electronics-fallback';
import { getApplianceDetailedProductBySlug } from '@/data/appliances-fallback';
import { getBooksDetailedProductBySlug } from '@/data/books-fallback';
import { APlusData, createDefaultAPlusContent } from '@/types/aplus';
import { resolveBuyBox } from '@/lib/buy-box';
import { SellerOfferItem, BuyBoxResult } from '@/types/multiseller';
import { categoryHref } from '@/lib/category-routes';

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
    isExpress: false, // no real express-delivery data yet
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
/** Breadcrumb items from the root category down to the product's category. */
function categoryTrail(category: any): Array<{ label: string; href: string }> {
  const chain: Array<{ name: string; slug: string }> = [];
  let node = category;
  while (node && chain.length < 6) {
    if (node.slug) chain.unshift({ name: node.name, slug: node.slug });
    node = node.parent;
  }
  const slugs = chain.map((c) => c.slug);
  return chain.map((c, i) => ({ label: c.name, href: categoryHref(slugs, i) }));
}

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

  const categorySlug = (product.category?.slug || '').toLowerCase();
  const categoryName = (product.category?.name || '').toLowerCase();
  const titleLower = (product.title || '').toLowerCase();
  const slugLower = (product.slug || '').toLowerCase();

  const isBook =
    categorySlug === 'books' ||
    categorySlug.includes('book') ||
    categoryName.includes('book') ||
    categoryName.includes('literature') ||
    titleLower.includes('hardcover') ||
    titleLower.includes('paperback') ||
    titleLower.includes('novel') ||
    slugLower.includes('book') ||
    slugLower.includes('habits') ||
    slugLower.includes('psychology-of-money') ||
    slugLower.includes('rich-dad') ||
    slugLower.includes('meluha') ||
    slugLower.includes('grandma') ||
    slugLower.includes('ikigai');

  const isAppliance =
    categorySlug.includes('appliance') ||
    categoryName.includes('appliance') ||
    categorySlug.includes('refrigerator') ||
    categorySlug.includes('washing') ||
    categorySlug.includes('conditioner') ||
    titleLower.includes('refrigerator') ||
    titleLower.includes('fridge') ||
    titleLower.includes('washing machine') ||
    titleLower.includes('air conditioner') ||
    titleLower.includes('split ac') ||
    titleLower.includes('microwave') ||
    titleLower.includes('water purifier') ||
    titleLower.includes('geyser') ||
    titleLower.includes('cooler') ||
    slugLower.includes('fridge') ||
    slugLower.includes('washing') ||
    slugLower.includes('ac-') ||
    slugLower.includes('app-');

  const isLaptopOrComputer =
    categorySlug.includes('laptop') ||
    categorySlug.includes('computer') ||
    categoryName.includes('laptop') ||
    categoryName.includes('computer') ||
    titleLower.includes('laptop') ||
    titleLower.includes('macbook') ||
    titleLower.includes('ultrabook') ||
    titleLower.includes('notebook') ||
    titleLower.includes('ai pc') ||
    titleLower.includes('intel core') ||
    titleLower.includes('ryzen') ||
    slugLower.includes('laptop') ||
    slugLower.includes('macbook') ||
    slugLower.includes('swift') ||
    slugLower.includes('xps') ||
    slugLower.includes('thinkpad');

  const isAudioOrHeadphones =
    categorySlug.includes('audio') ||
    categorySlug.includes('headphone') ||
    categoryName.includes('audio') ||
    categoryName.includes('headphone') ||
    titleLower.includes('headphone') ||
    titleLower.includes('earbud') ||
    titleLower.includes('airpods') ||
    titleLower.includes('tws') ||
    slugLower.includes('headphone') ||
    slugLower.includes('airpods');

  const isSmartwatch =
    categorySlug.includes('smartwatch') ||
    categorySlug.includes('wearable') ||
    categoryName.includes('smartwatch') ||
    titleLower.includes('smartwatch') ||
    titleLower.includes('apple watch') ||
    titleLower.includes('galaxy watch') ||
    slugLower.includes('smartwatch') ||
    slugLower.includes('watch-series');

  const isMobileOrElectronic =
    !isBook &&
    (categorySlug === 'mobiles' ||
      categorySlug === 'electronics' ||
      categorySlug.includes('electronic') ||
      categoryName.includes('mobile') ||
      categoryName.includes('phone') ||
      categoryName.includes('smartphone') ||
      categoryName.includes('electronic') ||
      isLaptopOrComputer ||
      isAudioOrHeadphones ||
      isSmartwatch ||
      isAppliance ||
      titleLower.includes('phone') ||
      titleLower.includes('5g') ||
      slugLower.includes('iphone') ||
      slugLower.includes('samsung-galaxy') ||
      slugLower.includes('oneplus') ||
      slugLower.includes('redmi') ||
      slugLower.includes('realme') ||
      slugLower.includes('motorola') ||
      slugLower.includes('nothing-phone') ||
      slugLower.includes('vivo') ||
      slugLower.includes('oppo'));

  const isFashionCategory =
    !isBook &&
    !isAppliance &&
    !isMobileOrElectronic &&
    !isLaptopOrComputer &&
    !isAudioOrHeadphones &&
    !isSmartwatch &&
    (categorySlug.includes('fashion') ||
      categorySlug.includes('clothing') ||
      categorySlug.includes('apparel') ||
      categorySlug.includes('shoe') ||
      categorySlug.includes('footwear') ||
      categorySlug.includes('ethnic') ||
      categorySlug.includes('western') ||
      categorySlug.includes('saree') ||
      categoryName.includes('fashion') ||
      categoryName.includes('clothing') ||
      categoryName.includes('apparel') ||
      categoryName.includes('shoe') ||
      categoryName.includes('footwear') ||
      categoryName.includes('ethnic') ||
      categoryName.includes('western') ||
      titleLower.includes('shirt') ||
      titleLower.includes('kurta') ||
      titleLower.includes('dress') ||
      titleLower.includes('shoe') ||
      titleLower.includes('sneaker') ||
      titleLower.includes('saree'));

  const isUnstitchedOrFreeSize =
    isFashionCategory &&
    (categorySlug.includes('saree') ||
      categoryName.includes('saree') ||
      titleLower.includes('saree') ||
      categorySlug.includes('shawl') ||
      titleLower.includes('shawl') ||
      categorySlug.includes('dupatta') ||
      titleLower.includes('dupatta') ||
      categorySlug.includes('jewel') ||
      categorySlug.includes('bag') ||
      categorySlug.includes('wallet'));

  // Deduplicate sizes into clean unique size options
  const sizeMap = new Map<string, { size: string; dimension?: string; disabled: boolean }>();
  (product.variants || [])
    .filter((v: any) => v.size)
    .forEach((v: any) => {
      const variantStock = (v.inventories || []).reduce(
        (acc: number, inv: any) =>
          acc + Math.max(0, (inv.quantity || 0) - (inv.reservedQuantity || 0)),
        0
      );
      const isAvailable = variantStock > 0;
      if (!sizeMap.has(v.size)) {
        sizeMap.set(v.size, {
          size: v.size,
          dimension: v.sku,
          disabled: !isAvailable,
        });
      } else {
        const existing = sizeMap.get(v.size)!;
        if (isAvailable) {
          existing.disabled = false;
        }
      }
    });
  const sizes = Array.from(sizeMap.values());

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

  // Parse structured Amazon A+ Content, Specs, Highlights or generate curated defaults
  let aplusData: APlusData | undefined = undefined;
  let customSpecs: Array<{ label: string; value: string }> | undefined = undefined;
  let customHighlights: string[] | undefined = undefined;
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
          if (Array.isArray(parsed.specs) && parsed.specs.length > 0) {
            customSpecs = parsed.specs;
          }
          if (Array.isArray(parsed.highlights) && parsed.highlights.length > 0) {
            customHighlights = parsed.highlights.filter(
              (h: any) => typeof h === 'string' && h.trim().length > 0
            );
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

  const referenceItem =
    getFallbackProductBySlug(product.slug) || getMobileDetailedProductBySlug(product.slug);

  // Title-driven dynamic resolution for smartphones & mobile devices
  let smartphoneSubtitle = '';
  let detectedStorage: string | null = null;
  let detectedColor: string | null = null;
  let detectedProcessor: string | null = null;

  if (isMobileOrElectronic) {
    // 1. Detect Color from Title (e.g. "; Cosmic Orange", "Onyx Black", "Titanium Gray", etc.)
    const colorMatch =
      product.title.match(/(?:;|—|-|\(|\/)\s*([A-Za-z\s]+(?:Orange|Black|Blue|White|Titanium|Gold|Silver|Green|Purple|Violet|Gray|Grey|Pink|Red|Yellow|Bronze|Emerald|Cyan|Burgundy))/i) ||
      product.title.match(/\b(Cosmic Orange|Desert Titanium|Natural Titanium|Titanium Gray|Titanium Black|Titanium Violet|Titanium Yellow|Phantom Black|Phantom White|Midnight Black|Starlight|Space Gray|Space Black|Alpine Green|Deep Purple|Sierra Blue|Pacific Blue|Onyx Black|Marble Gray|Cobalt Violet|Amber Yellow|Emerald Green|Mint Green|Obsidian|Porcelain|Bay Blue|Hazel|Rose Gold|Coral Pink|Sunset Orange)\b/i) ||
      product.title.match(/\b(Orange|Black|Blue|White|Gold|Silver|Green|Purple|Violet|Pink|Red|Yellow|Bronze)\b/i);
    detectedColor = colorMatch ? colorMatch[1].trim() : null;

    // 2. Detect Storage from Title (e.g. "512 GB", "256 GB", "128 GB", "1 TB")
    const storageMatch = product.title.match(/\b(64\s*GB|128\s*GB|256\s*GB|512\s*GB|1\s*TB)\b/i);
    detectedStorage = storageMatch ? storageMatch[1].toUpperCase().replace(/\s+/, ' ') : null;

    // 3. Detect Processor from Title (e.g. "A19 Pro Chip", "A18", "Snapdragon 8 Gen 3", "Dimensity 8500", etc.)
    const procMatch = product.title.match(
      /\b(A\d+\s*Pro(?:\s*Chip)?|A\d+(?:\s*Bionic)?|Snapdragon\s*[\w\s\d]+|Dimensity\s*[\w\s\d]+|Google\s*Tensor\s*[\w\s\d]+)\b/i
    );
    detectedProcessor = procMatch ? procMatch[1].trim() : null;

    // 4. Subtitle generation: if title contains new specifications, avoid obsolete reference subtitle
    const refSub = referenceItem?.subtitle || '';
    const hasObsoleteChipInSubtitle =
      detectedProcessor &&
      cleanSubtitle &&
      /\b(A\d+|Snapdragon|Dimensity|Exynos|Tensor)\b/i.test(cleanSubtitle) &&
      !cleanSubtitle.toLowerCase().includes(detectedProcessor.toLowerCase());

    const isObsoleteRef =
      Boolean(hasObsoleteChipInSubtitle) ||
      Boolean(detectedProcessor && refSub.toLowerCase().includes('bionic') && !detectedProcessor.toLowerCase().includes('bionic')) ||
      Boolean(referenceItem?.title && !product.title.toLowerCase().includes(referenceItem.title.toLowerCase().slice(0, 15)));

    if (isObsoleteRef || !cleanSubtitle) {
      const features: string[] = ['Dynamic Island'];
      if (product.title.includes('120Hz') || product.title.includes('Promotion') || product.title.includes('ProMotion')) {
        features.push('120Hz ProMotion Display');
      } else if (product.title.includes('AMOLED') || product.title.includes('OLED')) {
        features.push('Fluid AMOLED Display');
      }
      if (product.title.includes('Pro Fusion Camera') || product.title.includes('Camera')) {
        features.push('Pro Fusion Camera System');
      } else {
        features.push('48MP Main Camera');
      }
      if (detectedProcessor) {
        features.push(detectedProcessor);
      }
      if (product.title.includes('Breakthrough Battery') || product.title.includes('Battery')) {
        features.push('Breakthrough Battery Life');
      } else {
        features.push('USB-C with All-Day Battery');
      }
      smartphoneSubtitle = features.join(' • ');
    }
  }

  // Variant Resolution: NEVER inject ghost/fallback variants into a specific product
  let smartphoneColors: ProductColor[] = [];
  if (colors.length > 0) {
    smartphoneColors = [...colors];
    if (detectedColor) {
      const idx = smartphoneColors.findIndex(
        (c) =>
          c.name.toLowerCase() === detectedColor!.toLowerCase() ||
          detectedColor!.toLowerCase().includes(c.name.toLowerCase()) ||
          c.name.toLowerCase().includes(detectedColor!.toLowerCase())
      );
      if (idx > -1) {
        const found = smartphoneColors[idx];
        smartphoneColors = [found, ...smartphoneColors.filter((_, i) => i !== idx)];
      }
    }
  } else if (detectedColor) {
    smartphoneColors = [
      {
        name: detectedColor,
        hex: getColorHex(detectedColor),
        imageUrl: images[0]?.src,
      },
    ];
  } else if (referenceItem?.colors && referenceItem.colors.length > 0) {
    smartphoneColors = [...referenceItem.colors];
  }

  let smartphoneSizes: ProductSize[] = [];
  if (sizes.length > 0) {
    smartphoneSizes = [...sizes];
    if (detectedStorage) {
      const idx = smartphoneSizes.findIndex(
        (s) => s.size.toLowerCase() === detectedStorage!.toLowerCase()
      );
      if (idx > -1) {
        const found = { ...smartphoneSizes[idx], disabled: false };
        smartphoneSizes = [found, ...smartphoneSizes.filter((_, i) => i !== idx)];
      }
    }
  } else if (detectedStorage) {
    smartphoneSizes = [
      {
        size: detectedStorage,
        dimension: `${detectedStorage} ROM`,
        disabled: false,
      },
    ];
  } else if (referenceItem?.sizes && referenceItem.sizes.length > 0) {
    smartphoneSizes = [...referenceItem.sizes];
  }

  const reviewsList = (product.reviews || []).map((r: any) => ({
    id: r.id,
    author: r.user?.name || 'Vyntra customer',
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
        handlingDays: so.handlingDays || 0,
        estimatedDeliveryDays: so.handlingDays ? so.handlingDays + 2 : 0,
        fulfillmentType: (so.fulfillmentType as any) || 'SELLER_FULFILLED',
        shipsFrom: so.warehouse?.city ? `${so.warehouse.city}, ${so.warehouse.state}` : '',
        isBuyBoxWinner: false,
        offerVariants,
      };
    });
  }

  // Ensure the Original Creator / Primary Listing Vendor is ALWAYS included in multi-seller offers.
  // Built from the listing itself, so only facts we have: no invented dispatch time or fulfilment.
  const primaryWarehouse = product.vendor?.warehouses?.[0];
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
      city: primaryWarehouse?.city || product.vendor?.city || undefined,
      state: primaryWarehouse?.state || product.vendor?.state || undefined,
    },
    condition: 'NEW',
    sellingPrice,
    originalPrice,
    discountPercent:
      originalPrice > sellingPrice
        ? Math.round(((originalPrice - sellingPrice) / originalPrice) * 100)
        : 0,
    stock: totalStock,
    handlingDays: 0, // unknown: the listing has no dispatch time
    estimatedDeliveryDays: 0,
    fulfillmentType: 'SELLER_FULFILLED',
    shipsFrom: primaryWarehouse ? `${primaryWarehouse.city}, ${primaryWarehouse.state}` : '',
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
    subtitle: isMobileOrElectronic && smartphoneSubtitle ? smartphoneSubtitle : cleanSubtitle,
    brand: product.brand,
    vendorName: product.vendor?.storeName || 'Vyntra Royal Guild',
    originalVendorId: product.vendor?.id,
    originalVendorName: product.vendor?.storeName || 'Vyntra Royal Guild',
    category: (product.category?.slug as any) || 'ethnic',
    subCategory: product.category?.name || 'Artisanal Collection',
    // Home › department › … › category (the page appends the product title itself).
    breadcrumb: [{ label: 'Home', href: '/' }, ...categoryTrail(product.category)],
    price: sellingPrice,
    originalPrice,
    discount: discountStr,
    rating: Number(product.rating ?? 0),
    reviewCount: Number(product.reviewCount ?? reviewsList.length),
    recommendedPct: 96,
    // Same rule as listings: a real bestseller needs many reviews, not just a high average from a few.
    badge: (product.reviewCount ?? 0) >= 100 && (product.rating ?? 0) >= 4.5 ? 'Bestseller' : undefined,
    badgeVariant: 'secondary',
    giCertified: true,
    isExpress: false, // no real express-delivery data yet
    isCustomized: Boolean(product.isCustomized),
    stockCount: totalStock,
    rawVariants: (() => {
      const dbVariants = (product.variants || []).map((v: any) => {
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
      });

      if (isMobileOrElectronic) {
        const activeColor = detectedColor || smartphoneColors[0]?.name || 'Standard Edition';
        const activeSize = detectedStorage || smartphoneSizes[0]?.size || '128 GB';

        const hasActiveVariant = dbVariants.some(
          (v: any) =>
            (!v.size || v.size.toLowerCase() === activeSize.toLowerCase()) &&
            (!v.color || v.color.toLowerCase() === activeColor.toLowerCase())
        );

        if (!hasActiveVariant) {
          dbVariants.unshift({
            id: `variant-dynamic-${product.id}`,
            sku: product.variants?.[0]?.sku || `VYN-${product.id.slice(-6).toUpperCase()}`,
            size: activeSize,
            color: activeColor,
            price: sellingPrice,
            originalPrice: originalPrice > sellingPrice ? originalPrice : null,
            stock: totalStock > 0 ? totalStock : 15,
            imageUrl: images[0]?.src,
          });
        }

        smartphoneSizes.forEach((s) => {
          const match = dbVariants.find(
            (v: any) =>
              v.size?.toLowerCase() === s.size.toLowerCase() &&
              (!v.color || v.color.toLowerCase() === activeColor.toLowerCase())
          );
          if (!match && !s.disabled) {
            dbVariants.push({
              id: `variant-auto-${product.id}-${s.size.replace(/\s+/g, '')}`,
              sku: `VYN-${product.id.slice(-4)}-${s.size.replace(/\s+/g, '')}`,
              size: s.size,
              color: activeColor,
              price: sellingPrice,
              originalPrice: originalPrice > sellingPrice ? originalPrice : null,
              stock: 15,
              imageUrl: images[0]?.src,
            });
          }
        });
      }

      return dbVariants;
    })(),
    highlights:
      customHighlights && customHighlights.length > 0
        ? customHighlights
        : [
            `Brand: ${product.brand}`,
            `Authentic Quality: Verified under strict Vyntra quality assurance standards`,
            product.isCustomized
              ? 'Customized / Made to Order: Specially prepared upon order placement'
              : 'Ready to Ship: Express dispatch in premium protective packaging',
            'Direct from Verified Sellers across India',
          ],
    customSpecs,
    images,
    colors:
      isMobileOrElectronic
        ? smartphoneColors.length > 0
          ? smartphoneColors
          : [{ name: 'Standard Edition', hex: '#111827' }]
        : colors.length > 0
        ? colors
        : referenceItem?.colors || [{ name: 'Standard Edition', hex: '#111827' }],
    sizeLabel: isMobileOrElectronic
      ? 'Storage / Variant'
      : isUnstitchedOrFreeSize
      ? 'Size'
      : 'Select Size / Dimension',
    sizes: isUnstitchedOrFreeSize
      ? [{ size: 'Free Size', dimension: 'Length: 5.5m + 0.8m Blouse Piece', disabled: totalStock <= 0 }]
      : isMobileOrElectronic
      ? smartphoneSizes.length > 0
        ? smartphoneSizes
        : [{ size: 'Standard Edition', disabled: false }]
      : sizes.length > 0
      ? sizes
      : referenceItem?.sizes || [
          {
            size: 'Free Size',
            disabled: false,
          },
        ],
    sizeGuide: isFashionCategory && !isUnstitchedOrFreeSize ? referenceItem?.sizeGuide : undefined,
    modelInfo:
      referenceItem?.modelInfo ||
      (isMobileOrElectronic
        ? 'Flagship precision engineering with verified manufacturer warranty.'
        : 'Crafted with premium materials and quality engineering.'),
    tabs: referenceItem?.tabs || {
      story: {
        badge: isMobileOrElectronic ? 'Device Overview' : 'Product Overview',
        title: isMobileOrElectronic ? 'Technical Specifications & Quality Assurance' : 'Specifications & Quality Assurance',
        description: [
          cleanDescription ||
            (isMobileOrElectronic
              ? 'Authentic 100% genuine smartphone with official brand warranty and verified IMEI registry.'
              : 'Genuine brand product verified under Vyntra quality and authenticity standards.'),
        ],
        stats: [
          { label: 'Quality Check', value: '100% Passed' },
          { label: 'Authenticity', value: '100% Genuine' },
        ],
        image: images[0]?.src,
      },
      specs: [
        { label: 'Brand', val: product.brand },
        { label: 'Seller', val: product.vendor?.storeName || 'Vyntra Seller' },
        { label: 'Origin', val: 'India' },
      ],
      care: isMobileOrElectronic
        ? [
            {
              iconName: 'shield',
              title: 'Brand Warranty',
              desc: '1 Year Manufacturer Warranty on device and 6 Months on accessories.',
            },
          ]
        : [
            {
              iconName: 'sparkles',
              title: 'Gentle Care',
              desc: 'Dry clean recommended for longevity.',
            },
          ],
      guarantee: [
        {
          iconName: 'shieldCheck',
          title: isMobileOrElectronic ? '100% Genuine Device' : 'Vyntra Authenticity',
          desc: isMobileOrElectronic
            ? 'Official brand IMEI registered Indian stock guaranteed.'
            : '100% genuine guaranteed.',
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
            select: {
              id: true,
              name: true,
              slug: true,
              // Ancestors for the breadcrumb (Home › Fashion › Women › Clothing › Western wear › …); five levels covers the deepest branch
              parent: { select: { name: true, slug: true, parent: { select: { name: true, slug: true, parent: { select: { name: true, slug: true, parent: { select: { name: true, slug: true, parent: { select: { name: true, slug: true } } } } } } } } } },
            },
          },
          vendor: {
            select: {
              id: true,
              storeName: true,
              storeSlug: true,
              rating: true,
              isVerified: true,
              // Default warehouse: the real "ships from" location.
              warehouses: { where: { isDefault: true }, take: 1, select: { city: true, state: true } },
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
    // v2: breadcrumbs link to the department and Fashion pages
    ['detailed-product-v2', slug],
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
    const fallback =
      getFallbackProductBySlug(slug) ||
      getMobileDetailedProductBySlug(slug) ||
      getElectronicsDetailedProductBySlug(slug) ||
      getApplianceDetailedProductBySlug(slug) ||
      getBooksDetailedProductBySlug(slug);
  if (fallback) {
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
