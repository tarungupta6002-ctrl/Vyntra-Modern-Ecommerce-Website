import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { validateImageUpload } from '@/lib/media/validation';
import { getStorageProvider } from '@/lib/storage';
import { createMediaAssetRecord } from '@/lib/media/media-service';
import { MediaAssetCategory, UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * POST /api/vendor/media/upload
 * Handles verified image uploads with binary magic byte validation, dimensions, and ownership
 */
export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return apiError('Authentication required to upload media.', 401);
    }

    const isAdmin = auth.role === UserRole.ADMIN || auth.role === UserRole.SUPER_ADMIN;
    const vendorProfileId = auth.dbUser?.vendorProfile?.id || null;

    if (!isAdmin && (!vendorProfileId || auth.dbUser?.vendorProfile?.status !== 'APPROVED')) {
      return apiError('Approved vendor profile required to upload media assets.', 403);
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return apiError('No image file provided in upload request.', 400);
    }

    const rawCategory = (formData.get('category') as string) || 'PRODUCT_GALLERY';
    const category: MediaAssetCategory = Object.values(MediaAssetCategory).includes(rawCategory as any)
      ? (rawCategory as MediaAssetCategory)
      : MediaAssetCategory.PRODUCT_GALLERY;

    const customTitle = (formData.get('title') as string) || file.name.replace(/\.[^/.]+$/, '');
    const rawTags = (formData.get('tags') as string) || '';
    const tags = rawTags
      ? rawTags.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    // Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Strict Image Validation
    const validation = validateImageUpload(buffer, file.name, file.type, category);
    if (!validation.valid) {
      return apiError(validation.error || 'Image validation failed.', 422);
    }

    // Upload to Storage Provider
    const storage = getStorageProvider();
    const folder = category.toLowerCase().replace('_', '-');
    const storageResult = await storage.upload(buffer, {
      fileName: file.name,
      mimeType: validation.mimeType || file.type || 'image/jpeg',
      folder,
    });

    // Save record to Media Asset Registry
    const record = await createMediaAssetRecord({
      vendorId: vendorProfileId,
      title: customTitle,
      fileName: file.name,
      fileSize: storageResult.size,
      mimeType: validation.mimeType || file.type || 'image/jpeg',
      width: validation.width,
      height: validation.height,
      url: storageResult.url,
      thumbnailUrl: storageResult.url,
      category,
      tags,
    });

    return apiSuccess(record, undefined, 201);
  } catch (err: any) {
    return handleApiError(err);
  }
}
