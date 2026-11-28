import { randomBytes } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { INDIAN_STATES } from './indian-states';

/**
 * Seller pickup addresses (VendorWarehouse rows). The default one is where couriers collect
 * orders, what product pages show as "Ships from", and the seller address on invoices.
 */

export { INDIAN_STATES };

export const PICKUP_ADDRESS_REQUIRED =
  'Add a pickup address in Seller Central → Pickup addresses first. Couriers collect orders from it and it is printed on invoices.';

export interface PickupAddressInput {
  facilityName: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  contactPhone: string;
}

function clean(value: unknown, max: number) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

/** Validates a full address (create) or the fields present (update). */
export function parsePickupAddress(
  body: any,
  partial = false
): { ok: true; data: Partial<PickupAddressInput> } | { ok: false; error: string } {
  const data: Partial<PickupAddressInput> = {};
  const has = (k: string) => body?.[k] !== undefined;

  if (!partial || has('facilityName')) {
    const v = clean(body?.facilityName, 80);
    if (v.length < 2) return { ok: false, error: 'Give this address a name, e.g. "Main shop" or "Godown".' };
    data.facilityName = v;
  }
  if (!partial || has('streetAddress')) {
    const v = clean(body?.streetAddress, 200);
    if (v.length < 8) return { ok: false, error: 'Enter the full address: building, street and area.' };
    data.streetAddress = v;
  }
  if (!partial || has('city')) {
    const v = clean(body?.city, 60);
    if (v.length < 2) return { ok: false, error: 'Enter the city.' };
    data.city = v;
  }
  if (!partial || has('state')) {
    const v = clean(body?.state, 60);
    if (!(INDIAN_STATES as readonly string[]).includes(v)) return { ok: false, error: 'Choose a state.' };
    data.state = v;
  }
  if (!partial || has('postalCode')) {
    const v = String(body?.postalCode ?? '').replace(/\s/g, '');
    if (!/^[1-9]\d{5}$/.test(v)) return { ok: false, error: 'Enter a valid 6-digit PIN code.' };
    data.postalCode = v;
  }
  if (!partial || has('contactPhone')) {
    const digits = String(body?.contactPhone ?? '').replace(/[\s-]/g, '').replace(/^(\+91|0)/, '');
    if (!/^[6-9]\d{9}$/.test(digits)) return { ok: false, error: 'Enter a 10-digit mobile number the courier can call.' };
    if (/^(\d)\1{9}$/.test(digits)) return { ok: false, error: 'Enter a real mobile number the courier can call.' };
    data.contactPhone = `+91 ${digits}`;
  }
  return { ok: true, data };
}

export function newWarehouseCode() {
  return `WH-${randomBytes(3).toString('hex').toUpperCase()}`;
}

/** The seller's default pickup address, or null if they have not added one. */
export function findDefaultPickupAddress(vendorId: string, db: Pick<typeof prisma, 'vendorWarehouse'> = prisma) {
  return db.vendorWarehouse.findFirst({ where: { vendorId, isDefault: true } });
}

/** Text stored on product inventory rows, e.g. "Main shop (Jaipur)". */
export function warehouseLabel(w: { facilityName: string; city: string }) {
  return `${w.facilityName} (${w.city})`;
}

/** The seller's addresses for Seller Central, with how much stock and how many shipments use each. */
export async function listPickupAddresses(vendorId: string) {
  const rows = await prisma.vendorWarehouse.findMany({
    where: { vendorId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    include: {
      inventories: { select: { quantity: true } },
      _count: { select: { shipments: true, inventories: true } },
    },
  });
  return rows.map((w) => ({
    id: w.id,
    facilityName: w.facilityName,
    streetAddress: w.streetAddress,
    city: w.city,
    state: w.state,
    postalCode: w.postalCode,
    contactPhone: w.contactPhone,
    isDefault: w.isDefault,
    stockUnits: w.inventories.reduce((n, i) => n + i.quantity, 0),
    stockRows: w._count.inventories,
    shipments: w._count.shipments,
    updatedAt: w.updatedAt.toISOString(),
  }));
}
