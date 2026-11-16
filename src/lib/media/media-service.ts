/**
 * ==============================================================================
 * VYNTRA MEDIA ASSET SERVICE (Phase 6)
 * Centralized repository management, ownership verification, and reference safety
 * ==============================================================================
 */

import { prisma } from '@/lib/prisma';
import { getStorageProvider } from '@/lib/storage';
import { MediaAssetCategory } from '@prisma/client';

export interface MediaAssetItem {
  id: string;
  vendorId: string | null;
  title: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  width: number | null;
  height: number | null;
  url: string;
  thumbnailUrl: string | null;
  category: MediaAssetCategory;
  tags: string[];
  referenceCount: number;
  createdAt: string;
  updatedAt: string;
}

// Seeded Curated Heritage Craft Media Assets for instant offline & sandbox capability
const MOCK_MEDIA_REGISTRY: MediaAssetItem[] = [
  {
    id: 'med-saree-gold-1',
    vendorId: 'cm7banaras001',
    title: 'Banarasi Katan Silk Gold Zari Pallu',
    fileName: 'banarasi-gold-zari-close.jpg',
    fileSize: 1845000,
    mimeType: 'image/jpeg',
    width: 1400,
    height: 1400,
    url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=300&q=75',
    category: MediaAssetCategory.PRODUCT_GALLERY,
    tags: ['saree', 'banarasi', 'gold-zari', 'silk'],
    referenceCount: 2,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'med-swatch-marigold',
    vendorId: 'cm7banaras001',
    title: 'Marigold Yellow Silk Swatch',
    fileName: 'swatch-marigold-yellow.jpg',
    fileSize: 142000,
    mimeType: 'image/jpeg',
    width: 250,
    height: 250,
    url: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=250&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=100&q=75',
    category: MediaAssetCategory.COLOR_SWATCH,
    tags: ['swatch', 'marigold', 'yellow', 'color'],
    referenceCount: 1,
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: 'med-swatch-crimson',
    vendorId: 'cm7banaras001',
    title: 'Royal Crimson Silk Swatch',
    fileName: 'swatch-crimson-red.jpg',
    fileSize: 156000,
    mimeType: 'image/jpeg',
    width: 250,
    height: 250,
    url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=250&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=100&q=75',
    category: MediaAssetCategory.COLOR_SWATCH,
    tags: ['swatch', 'crimson', 'red', 'silk'],
    referenceCount: 1,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'med-aplus-hero-loom',
    vendorId: 'cm7banaras001',
    title: 'Master Weaver on 100-Year Pit Loom Banner',
    fileName: 'aplus-hero-pit-loom.jpg',
    fileSize: 2450000,
    mimeType: 'image/jpeg',
    width: 1464,
    height: 600,
    url: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=1464&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=400&q=75',
    category: MediaAssetCategory.APLUS_CONTENT,
    tags: ['aplus', 'banner', 'craftsmanship', 'handloom'],
    referenceCount: 1,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'med-brand-logo-seal',
    vendorId: 'cm7banaras001',
    title: 'Vyntra Atelier Heritage Seal Emblem',
    fileName: 'brand-heritage-seal.png',
    fileSize: 310000,
    mimeType: 'image/png',
    width: 500,
    height: 500,
    url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150&q=75',
    category: MediaAssetCategory.BRAND_ASSET,
    tags: ['brand', 'logo', 'crest', 'emblem'],
    referenceCount: 0,
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
];

export interface ListMediaOptions {
  vendorId?: string | null;
  isAdmin?: boolean;
  category?: string;
  query?: string;
  page?: number;
  limit?: number;
}

/**
 * Lists media assets respecting vendor ownership boundaries and filters
 */
export async function listMediaAssets(options: ListMediaOptions): Promise<{
  items: MediaAssetItem[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(50, Math.max(1, options.limit || 20));
  const skip = (page - 1) * limit;

  // Try Prisma first
  try {
    const where: any = {};
    if (!options.isAdmin) {
      // Vendors can strictly see only their own assets (or shared platform assets where vendorId is null)
      where.OR = [
        { vendorId: options.vendorId || 'unmatched-guest' },
        { vendorId: null },
      ];
    } else if (options.vendorId) {
      where.vendorId = options.vendorId;
    }

    if (options.category && options.category !== 'ALL' && Object.values(MediaAssetCategory).includes(options.category as any)) {
      where.category = options.category as MediaAssetCategory;
    }

    if (options.query && options.query.trim()) {
      const q = options.query.trim();
      where.AND = [
        {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { fileName: { contains: q, mode: 'insensitive' } },
            { tags: { has: q.toLowerCase() } },
          ],
        },
      ];
    }

    const [records, total] = await Promise.all([
      prisma.mediaAsset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.mediaAsset.count({ where }),
    ]);

    const items: MediaAssetItem[] = records.map((r) => ({
      id: r.id,
      vendorId: r.vendorId,
      title: r.title,
      fileName: r.fileName,
      fileSize: r.fileSize,
      mimeType: r.mimeType,
      width: r.width,
      height: r.height,
      url: r.url,
      thumbnailUrl: r.thumbnailUrl || r.url,
      category: r.category,
      tags: r.tags,
      referenceCount: r.referenceCount,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  } catch {
    // Database connection fallback (offline sandbox)
    let filtered = [...MOCK_MEDIA_REGISTRY];

    if (!options.isAdmin) {
      filtered = filtered.filter((item) => !item.vendorId || item.vendorId === options.vendorId);
    } else if (options.vendorId) {
      filtered = filtered.filter((item) => item.vendorId === options.vendorId);
    }

    if (options.category && options.category !== 'ALL') {
      filtered = filtered.filter((item) => item.category === options.category);
    }

    if (options.query && options.query.trim()) {
      const q = options.query.trim().toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.fileName.toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    const total = filtered.length;
    const items = filtered.slice(skip, skip + limit);

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}

/**
 * Creates a new media asset record with ownership assignment
 */
export async function createMediaAssetRecord(data: {
  vendorId?: string | null;
  title: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  width?: number | null;
  height?: number | null;
  url: string;
  thumbnailUrl?: string | null;
  category: MediaAssetCategory;
  tags?: string[];
}): Promise<MediaAssetItem> {
  const cleanTags = (data.tags || []).map((t) => t.trim().toLowerCase()).filter(Boolean);

  try {
    const record = await prisma.mediaAsset.create({
      data: {
        vendorId: data.vendorId || null,
        title: data.title,
        fileName: data.fileName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        width: data.width || null,
        height: data.height || null,
        url: data.url,
        thumbnailUrl: data.thumbnailUrl || data.url,
        category: data.category,
        tags: cleanTags,
        referenceCount: 0,
      },
    });

    return {
      id: record.id,
      vendorId: record.vendorId,
      title: record.title,
      fileName: record.fileName,
      fileSize: record.fileSize,
      mimeType: record.mimeType,
      width: record.width,
      height: record.height,
      url: record.url,
      thumbnailUrl: record.thumbnailUrl,
      category: record.category,
      tags: record.tags,
      referenceCount: record.referenceCount,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  } catch {
    // In-memory fallback
    const newItem: MediaAssetItem = {
      id: `med-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      vendorId: data.vendorId || null,
      title: data.title,
      fileName: data.fileName,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      width: data.width || null,
      height: data.height || null,
      url: data.url,
      thumbnailUrl: data.thumbnailUrl || data.url,
      category: data.category,
      tags: cleanTags,
      referenceCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    MOCK_MEDIA_REGISTRY.unshift(newItem);
    return newItem;
  }
}

/**
 * Checks if an asset is referenced by products, swatches, or A+ content
 */
export async function checkAssetReferences(assetIdOrUrl: string): Promise<number> {
  try {
    const [imagesWithUrl, variantsWithUrl] = await Promise.all([
      prisma.productImage.count({ where: { url: assetIdOrUrl } }),
      prisma.productVariant.count({ where: { imageUrl: assetIdOrUrl } }),
    ]);
    return imagesWithUrl + variantsWithUrl;
  } catch {
    const item = MOCK_MEDIA_REGISTRY.find((m) => m.id === assetIdOrUrl || m.url === assetIdOrUrl);
    return item ? item.referenceCount : 0;
  }
}

/**
 * Deletes a media asset with strict ownership and reference safeguards
 */
export async function deleteMediaAsset(
  assetId: string,
  requester: { vendorProfileId?: string | null; isAdmin?: boolean; force?: boolean }
): Promise<{
  success: boolean;
  message: string;
  referenced?: boolean;
  referenceCount?: number;
}> {
  let asset: MediaAssetItem | null = null;

  try {
    const record = await prisma.mediaAsset.findUnique({ where: { id: assetId } });
    if (record) {
      asset = {
        id: record.id,
        vendorId: record.vendorId,
        title: record.title,
        fileName: record.fileName,
        fileSize: record.fileSize,
        mimeType: record.mimeType,
        width: record.width,
        height: record.height,
        url: record.url,
        thumbnailUrl: record.thumbnailUrl,
        category: record.category,
        tags: record.tags,
        referenceCount: record.referenceCount,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      };
    }
  } catch {
    asset = MOCK_MEDIA_REGISTRY.find((m) => m.id === assetId) || null;
  }

  if (!asset) {
    return { success: false, message: 'Media asset not found.' };
  }

  // 1. Strict Ownership Check
  if (!requester.isAdmin) {
    if (!asset.vendorId || asset.vendorId !== requester.vendorProfileId) {
      return {
        success: false,
        message: 'Access Denied: You can only delete media assets owned by your vendor account.',
      };
    }
  }

  // 2. Reference Protection Check
  const liveReferences = await checkAssetReferences(asset.url);
  const totalReferences = Math.max(asset.referenceCount, liveReferences);

  if (totalReferences > 0 && !requester.force) {
    return {
      success: false,
      referenced: true,
      referenceCount: totalReferences,
      message: `Asset is currently referenced by ${totalReferences} active product(s) or swatch(es). Safe deletion requires confirmation to avoid broken images.`,
    };
  }

  // 3. Delete from Storage Provider
  const storage = getStorageProvider();
  await storage.delete(asset.url);

  // 4. Delete Database Record
  try {
    await prisma.mediaAsset.delete({ where: { id: assetId } });
  } catch {
    const idx = MOCK_MEDIA_REGISTRY.findIndex((m) => m.id === assetId);
    if (idx !== -1) {
      MOCK_MEDIA_REGISTRY.splice(idx, 1);
    }
  }

  return { success: true, message: 'Media asset permanently deleted.' };
}
