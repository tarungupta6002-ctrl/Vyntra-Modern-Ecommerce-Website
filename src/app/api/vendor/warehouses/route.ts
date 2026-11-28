import { prisma } from '@/lib/prisma';
import { requireVendor, handleAuthError, AuthError } from '@/lib/auth';
import { apiError, apiSuccess, handleApiError } from '@/lib/api-response';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { invalidateProduct } from '@/lib/cache-invalidation';
import { listPickupAddresses, newWarehouseCode, parsePickupAddress, warehouseLabel } from '@/lib/vendor/pickup-address';

export const dynamic = 'force-dynamic';

const MAX_ADDRESSES = 10;

/** The seller's pickup addresses, default first. */
export async function GET() {
  try {
    const auth = await requireVendor();
    return apiSuccess({ addresses: await listPickupAddresses(auth.vendorProfileId) });
  } catch (err) {
    if (err instanceof AuthError) return handleAuthError(err);
    return handleApiError(err);
  }
}

/** Adds a pickup address. The first one becomes the default. Body: address fields + makeDefault? */
export async function POST(request: Request) {
  try {
    const auth = await requireVendor();
    const rate = checkRateLimit(`vendor-warehouse:${auth.vendorProfileId}`, 30, 3600);
    if (!rate.allowed) return rateLimitResponse(rate.resetInSeconds, 'Too many changes. Please try again later.');

    const body = await request.json().catch(() => ({}));
    const parsed = parsePickupAddress(body);
    if (!parsed.ok) return apiError(parsed.error, 400);
    const data = parsed.data as Required<typeof parsed.data>;

    const vendorId = auth.vendorProfileId;
    const existing = await prisma.vendorWarehouse.count({ where: { vendorId } });
    if (existing >= MAX_ADDRESSES) return apiError(`You can save up to ${MAX_ADDRESSES} pickup addresses.`, 400);
    const makeDefault = existing === 0 || body.makeDefault === true;

    await prisma.$transaction(async (tx) => {
      if (makeDefault) await tx.vendorWarehouse.updateMany({ where: { vendorId }, data: { isDefault: false } });
      const created = await tx.vendorWarehouse.create({
        data: { ...data, vendorId, warehouseCode: newWarehouseCode(), isDefault: makeDefault },
      });
      if (makeDefault) {
        await tx.productInventory.updateMany({ where: { vendorId }, data: { warehouseLocation: warehouseLabel(created) } });
      }
    });

    if (makeDefault) invalidateProduct(); // product pages show "Ships from" from the default
    return apiSuccess({ addresses: await listPickupAddresses(vendorId) }, undefined, 201);
  } catch (err) {
    if (err instanceof AuthError) return handleAuthError(err);
    return handleApiError(err);
  }
}
