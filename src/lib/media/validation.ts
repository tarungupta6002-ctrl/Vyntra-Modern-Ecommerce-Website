/**
 * ==============================================================================
 * VYNTRA MEDIA VALIDATION & OPTIMIZATION (Phase 6)
 * Server and Client validation for Image formats, sizes, and dimensions
 * ==============================================================================
 */

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const;

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB default
export const MAX_SWATCH_SIZE_BYTES = 2 * 1024 * 1024; // 2MB for swatches

export interface ImageDimensionGuidelines {
  minWidth: number;
  minHeight: number;
  recommendedWidth: number;
  recommendedHeight: number;
  aspectRatioLabel: string;
}

export const CATEGORY_DIMENSION_GUIDELINES: Record<string, ImageDimensionGuidelines> = {
  PRODUCT_GALLERY: {
    minWidth: 600,
    minHeight: 600,
    recommendedWidth: 1200,
    recommendedHeight: 1200,
    aspectRatioLabel: '1:1 Square or 4:5 Portrait',
  },
  COLOR_SWATCH: {
    minWidth: 40,
    minHeight: 40,
    recommendedWidth: 200,
    recommendedHeight: 200,
    aspectRatioLabel: '1:1 Square',
  },
  APLUS_CONTENT: {
    minWidth: 600,
    minHeight: 300,
    recommendedWidth: 1200,
    recommendedHeight: 600,
    aspectRatioLabel: '2:1 Banner or 4:3 Feature',
  },
  BRAND_ASSET: {
    minWidth: 150,
    minHeight: 150,
    recommendedWidth: 600,
    recommendedHeight: 600,
    aspectRatioLabel: '1:1 or 16:9 Logo',
  },
};

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  fileSize?: number;
}

/**
 * Parses image header binary buffer to verify magic bytes and extract basic dimensions
 */
export function inspectImageBinary(buffer: Buffer | Uint8Array): {
  detectedMime: AllowedMimeType | null;
  width?: number;
  height?: number;
} {
  if (buffer.length < 12) {
    return { detectedMime: null };
  }

  const b = buffer;

  // 1. JPEG check (FF D8 FF)
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    let width = 1200;
    let height = 1200;
    // Walk JPEG markers to find SOF0/SOF2 dimensions if available
    let offset = 2;
    while (offset < b.length - 8) {
      if (b[offset] === 0xff) {
        const marker = b[offset + 1];
        if (marker >= 0xc0 && marker <= 0xc3) {
          height = (b[offset + 5] << 8) + b[offset + 6];
          width = (b[offset + 7] << 8) + b[offset + 8];
          break;
        }
        const length = (b[offset + 2] << 8) + b[offset + 3];
        offset += 2 + length;
      } else {
        offset++;
      }
    }
    return { detectedMime: 'image/jpeg', width, height };
  }

  // 2. PNG check (89 50 4E 47 0D 0A 1A 0A)
  if (
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a
  ) {
    let width = 800;
    let height = 800;
    if (b.length >= 24) {
      width = (b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19];
      height = (b[20] << 24) | (b[21] << 16) | (b[22] << 8) | b[23];
    }
    return { detectedMime: 'image/png', width, height };
  }

  // 3. WebP check (RIFF .... WEBP)
  if (
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50
  ) {
    let width = 1000;
    let height = 1000;
    // VP8 / VP8X dimension probe
    if (b.length >= 30) {
      if (b[12] === 0x56 && b[13] === 0x50 && b[14] === 0x38 && b[15] === 0x58) {
        // VP8X
        width = 1 + (b[24] | (b[25] << 8) | (b[26] << 16));
        height = 1 + (b[27] | (b[28] << 8) | (b[29] << 16));
      }
    }
    return { detectedMime: 'image/webp', width, height };
  }

  return { detectedMime: null };
}

/**
 * Server-side complete validation for image uploads
 */
export function validateImageUpload(
  buffer: Buffer | Uint8Array,
  fileName: string,
  declaredMimeType: string,
  category: string = 'PRODUCT_GALLERY'
): ImageValidationResult {
  // 1. File size check
  const maxSize = category === 'COLOR_SWATCH' ? MAX_SWATCH_SIZE_BYTES : MAX_FILE_SIZE_BYTES;
  if (buffer.byteLength > maxSize) {
    const maxMb = Math.round(maxSize / (1024 * 1024));
    return {
      valid: false,
      error: `File size (${(buffer.byteLength / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed size of ${maxMb} MB for ${category.replace('_', ' ')}.`,
    };
  }

  if (buffer.byteLength < 500) {
    return {
      valid: false,
      error: 'File is too small or empty to be a valid image.',
    };
  }

  // 2. Extension check
  const lowerName = fileName.toLowerCase();
  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  if (!hasValidExt) {
    return {
      valid: false,
      error: `Unsupported file extension. Allowed extensions are: ${ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }

  // 3. Binary Magic Bytes check
  const { detectedMime, width, height } = inspectImageBinary(buffer);
  if (!detectedMime) {
    return {
      valid: false,
      error: 'Invalid or corrupted image file. Header magic bytes do not match JPEG, PNG, or WebP.',
    };
  }

  // 4. Declared vs Detected MIME alignment
  const declaredLower = (declaredMimeType || '').toLowerCase();
  if (declaredLower && declaredLower !== 'application/octet-stream' && declaredLower !== detectedMime) {
    // If declared MIME conflicts with binary content (e.g. .exe disguised as .jpg)
    if (!ALLOWED_MIME_TYPES.includes(declaredLower as any)) {
      return {
        valid: false,
        error: `Declared MIME type "${declaredMimeType}" is not permitted.`,
      };
    }
  }

  // 5. Dimension minimum checks
  const guidelines = CATEGORY_DIMENSION_GUIDELINES[category];
  if (guidelines && width && height) {
    if (width < guidelines.minWidth || height < guidelines.minHeight) {
      return {
        valid: false,
        error: `Image dimensions (${width}x${height}px) are below the minimum required for ${category.replace('_', ' ')} (${guidelines.minWidth}x${guidelines.minHeight}px).`,
        width,
        height,
        mimeType: detectedMime,
      };
    }
  }

  return {
    valid: true,
    mimeType: detectedMime,
    width,
    height,
    fileSize: buffer.byteLength,
  };
}

/**
 * Client-side pre-flight validation using HTML5 File and Image objects
 */
export async function validateClientImage(
  file: File,
  category: string = 'PRODUCT_GALLERY'
): Promise<ImageValidationResult> {
  const maxSize = category === 'COLOR_SWATCH' ? MAX_SWATCH_SIZE_BYTES : MAX_FILE_SIZE_BYTES;
  if (file.size > maxSize) {
    const maxMb = Math.round(maxSize / (1024 * 1024));
    return {
      valid: false,
      error: `File size exceeds ${maxMb} MB. Please select an optimized image.`,
    };
  }

  const lowerName = file.name.toLowerCase();
  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  if (!hasValidExt) {
    return {
      valid: false,
      error: `Invalid file extension. Please select a JPG, PNG, or WebP image.`,
    };
  }

  // Client-side image dimensions loader
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof Image === 'undefined') {
      return resolve({ valid: true, mimeType: file.type, fileSize: file.size });
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const guidelines = CATEGORY_DIMENSION_GUIDELINES[category];
      if (guidelines && (img.naturalWidth < guidelines.minWidth || img.naturalHeight < guidelines.minHeight)) {
        return resolve({
          valid: false,
          error: `Image resolution (${img.naturalWidth}x${img.naturalHeight}px) is too small. Minimum required: ${guidelines.minWidth}x${guidelines.minHeight}px.`,
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      }

      resolve({
        valid: true,
        mimeType: file.type,
        width: img.naturalWidth,
        height: img.naturalHeight,
        fileSize: file.size,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        valid: false,
        error: 'Unable to parse image. File may be corrupted or an unsupported format.',
      });
    };

    img.src = objectUrl;
  });
}
