import { NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/addresses
 * Returns all saved delivery addresses for the authenticated user.
 */
export async function GET() {
  try {
    const auth = await requireAuth();

    const addresses = await prisma.address.findMany({
      where: { userId: auth.userId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return apiSuccess({ addresses });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    return handleApiError(err);
  }
}

/**
 * POST /api/addresses
 * Creates a new delivery address for the authenticated user.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireAuth();
    const body = await req.json();

    const {
      fullName,
      phone,
      streetAddress,
      locality,
      landmark,
      city,
      state,
      postalCode,
      country = 'India',
      addressType = 'HOME',
      isDefault = false,
    } = body;

    // Strict field validation
    if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
      return apiError('Full recipient name is required.', 400);
    }
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return apiError('Valid phone number is required.', 400);
    }
    if (!streetAddress || typeof streetAddress !== 'string' || !streetAddress.trim()) {
      return apiError('Street address / Flat / Building is required.', 400);
    }
    if (!city || typeof city !== 'string' || !city.trim()) {
      return apiError('City is required.', 400);
    }
    if (!state || typeof state !== 'string' || !state.trim()) {
      return apiError('State is required.', 400);
    }
    if (!postalCode || typeof postalCode !== 'string' || !postalCode.trim()) {
      return apiError('PIN / Postal code is required.', 400);
    }

    const validAddressType = ['HOME', 'WORK', 'OTHER'].includes(addressType)
      ? addressType
      : 'HOME';

    const existingCount = await prisma.address.count({
      where: { userId: auth.userId },
    });

    const shouldBeDefault = isDefault || existingCount === 0;

    const newAddress = await prisma.$transaction(async (tx) => {
      if (shouldBeDefault && existingCount > 0) {
        await tx.address.updateMany({
          where: { userId: auth.userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.address.create({
        data: {
          userId: auth.userId,
          fullName: fullName.trim(),
          phone: phone.trim(),
          streetAddress: streetAddress.trim(),
          locality: locality?.trim() || null,
          landmark: landmark?.trim() || null,
          city: city.trim(),
          state: state.trim(),
          postalCode: postalCode.trim(),
          country: country.trim() || 'India',
          addressType: validAddressType,
          isDefault: shouldBeDefault,
        },
      });
    });

    return apiSuccess({ address: newAddress }, undefined, 201);
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    return handleApiError(err);
  }
}
