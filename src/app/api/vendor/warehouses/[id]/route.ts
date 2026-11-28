import { prisma } from '@/lib/prisma';
import { requireVendor, handleAuthError, AuthError } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { listPickupAddresses, parsePickupAddress, warehouseLabel } from '@/lib/vendor/pickup-address';
import { invalidateProduct } from '@/lib/cache-invalidation';

export const dynamic = 'force-dynamic';

async function ownAddress(id: string, vendorId: string) {
  return prisma.vendorWarehouse.findFirst({ where: { id, vendorId } });
}

/**
 * Edits a pickup address and/or makes it the default.
 * Body: any address fields, makeDefault?: true
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireVendor();
    const rate = checkRateLimit(`vendor-warehouse:${auth.vendorProfileId}`, 30, 3600);
    if (!rate.allowed) return rateLimitResponse(rate.resetInSeconds, 'Too many changes. Please try again later.');

    const vendorId = auth.vendorProfileId;
    const current = await ownAddress(params.id, vendorId);
    if (!current) return apiError('Address not found.', 404);

    const body = await request.json().catch(() => ({}));
    const parsed = parsePickupAddress(body, true);
    if (!parsed.ok) return apiError(parsed.error, 400);
    const makeDefault = body.makeDefault === true && !current.isDefault;
    if (Object.keys(parsed.data).length === 0 && !makeDefault) return apiError('Nothing to update.', 400);

    await prisma.$transaction(async (tx) => {
      if (makeDefault) await tx.vendorWarehouse.updateMany({ where: { vendorId }, data: { isDefault: false } });
      const updated = await tx.vendorWarehouse.update({
        where: { id: current.id },
        data: { ...parsed.data, ...(makeDefault ? { isDefault: true } : {}) },
      });
      if (updated.isDefault) {
        await tx.productInventory.updateMany({ where: { vendorId }, data: { warehouseLocation: warehouseLabel(updated) } });
      }
    });

    // Product pages cache "Ships from" for a few minutes.
    invalidateProduct(); // no keys: clears the shared 'products' tag
    return apiSuccess({ addresses: await listPickupAddresses(vendorId) });
  } catch (err) {
    if (err instanceof AuthError) return handleAuthError(err);
    return handleApiError(err);
  }
}

/**
 * Removes a pickup address. The default cannot be removed (make another one default first),
 * and neither can an address that holds stock records, since deleting it would delete that stock.
 */
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireVendor();
    const vendorId = auth.vendorProfileId;
    const current = await ownAddress(params.id, vendorId);
    if (!current) return apiError('Address not found.', 404);
    if (current.isDefault) return apiError('This is your default pickup address. Make another address the default first.', 400);

    const stockRows = await prisma.offerInventory.count({ where: { warehouseId: current.id } });
    if (stockRows > 0) {
      return apiError('Stock for your listings is recorded at this address, so it cannot be removed. Edit it instead.', 400);
    }

    await prisma.vendorWarehouse.delete({ where: { id: current.id } });
    return apiSuccess({ addresses: await listPickupAddresses(vendorId) });
  } catch (err) {
    if (err instanceof AuthError) return handleAuthError(err);
    return handleApiError(err);
  }
}
