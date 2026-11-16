import { NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * PATCH /api/addresses/[id]
 * Updates an address belonging to the authenticated user.
 */
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const auth = await requireAuth();
    const { id } = params;

    const existingAddress = await prisma.address.findUnique({
      where: { id },
    });

    if (!existingAddress) {
      return apiError('Address not found.', 404);
    }

    if (existingAddress.userId !== auth.userId) {
      return apiError('Unauthorized: You do not own this address.', 403);
    }

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
      country,
      addressType,
      isDefault,
    } = body;

    const updated = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.address.updateMany({
          where: { userId: auth.userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.address.update({
        where: { id },
        data: {
          fullName: fullName !== undefined ? String(fullName).trim() : undefined,
          phone: phone !== undefined ? String(phone).trim() : undefined,
          streetAddress: streetAddress !== undefined ? String(streetAddress).trim() : undefined,
          locality: locality !== undefined ? (locality ? String(locality).trim() : null) : undefined,
          landmark: landmark !== undefined ? (landmark ? String(landmark).trim() : null) : undefined,
          city: city !== undefined ? String(city).trim() : undefined,
          state: state !== undefined ? String(state).trim() : undefined,
          postalCode: postalCode !== undefined ? String(postalCode).trim() : undefined,
          country: country !== undefined ? String(country).trim() : undefined,
          addressType: addressType && ['HOME', 'WORK', 'OTHER'].includes(addressType)
            ? addressType
            : undefined,
          isDefault: isDefault !== undefined ? Boolean(isDefault) : undefined,
        },
      });
    });

    return apiSuccess({ address: updated });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    return handleApiError(err);
  }
}

/**
 * DELETE /api/addresses/[id]
 * Deletes an address belonging to the authenticated user.
 */
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const auth = await requireAuth();
    const { id } = params;

    const existingAddress = await prisma.address.findUnique({
      where: { id },
    });

    if (!existingAddress) {
      return apiError('Address not found.', 404);
    }

    if (existingAddress.userId !== auth.userId) {
      return apiError('Unauthorized: You do not own this address.', 403);
    }

    // Check if linked to existing orders
    const orderCount = await prisma.order.count({
      where: { shippingAddressId: id },
    });

    if (orderCount > 0) {
      return apiError(
        'This address is associated with previous orders and cannot be permanently deleted. You can add a new address instead.',
        400,
        undefined,
        'ADDRESS_IN_USE'
      );
    }

    await prisma.address.delete({
      where: { id },
    });

    return apiSuccess({ message: 'Address removed successfully.' });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    return handleApiError(err);
  }
}
