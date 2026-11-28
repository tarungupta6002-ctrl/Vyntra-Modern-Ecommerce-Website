import { Prisma } from '@prisma/client';

/**
 * Puts units of an order item back into sellable stock, in the same place they were sold from:
 * the seller's offer inventory when the item was bought through an offer, otherwise the product
 * inventory (the seller's own row first). Used by cancellations and by returns that can be resold.
 */
export type RestockTarget =
  | { kind: 'offer'; inventoryId: string }
  | { kind: 'product'; inventoryId: string; variantId: string; vendorId: string };

export async function restockOrderItem(
  tx: Prisma.TransactionClient,
  item: { offerVariantId: string | null; variantId: string | null; productId?: string; vendorId: string },
  quantity: number
): Promise<RestockTarget | null> {
  if (quantity <= 0) return null;

  if (item.offerVariantId) {
    const inv = await tx.offerInventory.findFirst({
      where: { offerVariantId: item.offerVariantId },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (!inv) return null;
    await tx.$executeRaw`
      UPDATE "OfferInventory" SET "quantity" = "quantity" + ${quantity}, "updatedAt" = NOW()
      WHERE "id" = ${inv.id}
    `;
    return { kind: 'offer', inventoryId: inv.id };
  }

  const where: Prisma.ProductInventoryWhereInput = item.variantId
    ? { variantId: item.variantId }
    : item.productId
    ? { productId: item.productId }
    : { id: '__none__' };
  const select = { id: true, variantId: true, vendorId: true } as const;
  const inv =
    (await tx.productInventory.findFirst({ where: { ...where, vendorId: item.vendorId }, orderBy: { createdAt: 'asc' }, select })) ||
    (await tx.productInventory.findFirst({ where, orderBy: { createdAt: 'asc' }, select }));
  if (!inv) return null;
  await tx.$executeRaw`
    UPDATE "ProductInventory" SET "quantity" = "quantity" + ${quantity}, "updatedAt" = NOW()
    WHERE "id" = ${inv.id}
  `;
  return { kind: 'product', inventoryId: inv.id, variantId: inv.variantId, vendorId: inv.vendorId };
}
