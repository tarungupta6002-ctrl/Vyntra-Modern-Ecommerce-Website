import { prisma } from '@/lib/prisma';
import { WishlistItem, CuratedBoard } from '@/store/wishlist-store';

/**
 * Strictly verifies that a product exists and is active/published in the database catalog.
 * Wishlist operations are purely READ-ONLY on products and NEVER create or mutate
 * Product, ProductVariant, SellerOffer or ProductInventory records.
 */
export async function resolveExistingCatalogProduct(idOrSlug: string) {
  const dbProduct = await prisma.product.findFirst({
    where: {
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      isPublished: true,
    },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      variants: { include: { inventories: true } },
      sellerOffers: { where: { isBuyBoxWinner: true } },
      vendor: true,
      category: true,
    },
  });

  if (!dbProduct) {
    throw new Error(`Product "${idOrSlug}" not found or currently unavailable in the catalog.`);
  }

  return dbProduct;
}

/**
 * Returns formatted WishlistItem array for the authenticated user.
 * Strictly scopes query to the user's authenticated ID.
 */
export async function getFormattedWishlist(userId: string): Promise<WishlistItem[]> {
  const records = await prisma.wishlistItem.findMany({
    where: { userId },
    include: {
      product: {
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
          variants: { include: { inventories: true } },
          sellerOffers: { where: { isBuyBoxWinner: true } },
          vendor: true,
          category: true,
        },
      },
      boardMemberships: {
        include: { board: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return records.map((record: any) => {
    const p = record.product;
    const defaultVariant = p.variants?.[0];

    const currentPrice = Number(defaultVariant?.price ?? p.basePrice);
    const originalPrice = Number(defaultVariant?.originalPrice ?? p.discountPrice ?? currentPrice);
    const discount =
      originalPrice > currentPrice
        ? `${Math.round(((originalPrice - currentPrice) / originalPrice) * 100)}% OFF`
        : undefined;

    const totalStock = (p.variants || []).reduce(
      (acc: number, v: any) =>
        acc +
        (v.inventories || []).reduce(
          (invAcc: number, inv: any) => invAcc + (inv.quantity || 0),
          0
        ),
      0
    );
    const inStock = totalStock > 0;

    const imageUrl =
      p.images?.[0]?.url ||
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCpwrNsj5YPVo1vY-tBQP-nqo5OW28cUelkKu1fAIXjy8j8ybHKnia7QJpGxGZhojsR8aMRp25Fed9Hz54OYs2zdU1dPdeWd0iIfWJP9sfnGF9N9j1pnBt57PEOxYqJDmj9ZWoNqXngWuiQYKDA45JQ5i5iQ3m6yVpn2Anz1lWxSbLNQDloCdeRUkTjPUkUaXvgnwcXMatjaiNym-yhEVb5gjtPFsoJ7AJMY4cyuN4';

    return {
      id: record.id,
      productId: p.id,
      slug: p.slug,
      title: p.title,
      subtitle: p.subtitle || undefined,
      brand: p.vendor?.storeName || p.brand || 'Vyntra Atelier',
      brandTag: 'Verified Luxe',
      category: p.category?.slug || 'ethnic',
      price: currentPrice,
      originalPrice: originalPrice,
      discount: discount,
      rating: p.rating || 4.8,
      reviewCount: p.reviewCount || 120,
      image: imageUrl,
      inStock: inStock,
      stockNote: inStock ? 'In Stock • Ready for Delivery' : 'Out of Stock',
      boardIds: (record.boardMemberships || []).map((b: any) => b.boardId),
      selectedSize: record.selectedSize || undefined,
      sizeOptions: (p.variants || []).map((v: any) => v.size).filter(Boolean) as string[],
      express24h: true,
    };
  });
}

/**
 * Adds an item to the user's Wishlist in Supabase.
 * Strictly verifies catalog product existence, authenticated user ownership,
 * and board ownership without modifying any product records.
 */
export async function addWishlistItem(
  userId: string,
  data: { productId: string; selectedSize?: string; boardId?: string }
): Promise<WishlistItem> {
  // 1. Strictly look up existing published product - NEVER creates or modifies products
  const dbProduct = await resolveExistingCatalogProduct(data.productId);

  // 2. Database-enforced uniqueness: 1 product entry per user
  const wishlistItem = await prisma.wishlistItem.upsert({
    where: {
      userId_productId: {
        userId,
        productId: dbProduct.id,
      },
    },
    create: {
      userId,
      productId: dbProduct.id,
      selectedSize: data.selectedSize,
    },
    update: {
      selectedSize: data.selectedSize || undefined,
    },
  });

  // 3. Verify CuratedBoard ownership if boardId is specified
  if (data.boardId && data.boardId !== 'all') {
    const boardExists = await prisma.curatedBoard.findFirst({
      where: { id: data.boardId, userId },
    });
    if (!boardExists) {
      throw new Error(`Curated board not found or not owned by authenticated user.`);
    }

    await prisma.curatedBoardItem.upsert({
      where: {
        boardId_wishlistItemId: {
          boardId: data.boardId,
          wishlistItemId: wishlistItem.id,
        },
      },
      create: {
        boardId: data.boardId,
        wishlistItemId: wishlistItem.id,
      },
      update: {},
    });
  }

  const items = await getFormattedWishlist(userId);
  const found = items.find((i) => i.productId === dbProduct.id);
  if (!found) {
    throw new Error('Failed to retrieve verified wishlist entry.');
  }
  return found;
}

/**
 * Removes an item from the user's Wishlist in Supabase.
 * Strictly enforces user ownership in the WHERE clause.
 */
export async function removeWishlistItem(
  userId: string,
  idOrProductId: string
): Promise<boolean> {
  const res = await prisma.wishlistItem.deleteMany({
    where: {
      userId,
      OR: [
        { id: idOrProductId },
        { productId: idOrProductId },
        { product: { slug: idOrProductId } },
      ],
    },
  });

  return res.count > 0;
}

/**
 * Returns user's curated boards from Supabase.
 * Strictly scoped to authenticated user ID.
 */
export async function getUserCuratedBoards(userId: string): Promise<CuratedBoard[]> {
  const boards = await prisma.curatedBoard.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });

  return boards.map((b) => ({
    id: b.id,
    title: b.name,
    theme: b.description || 'Custom Board',
    isPublic: !b.isPrivate,
  }));
}

/**
 * Creates a new curated board for the user in Supabase.
 * Strictly anchors the board to the authenticated user ID.
 */
export async function createUserCuratedBoard(
  userId: string,
  name: string,
  theme?: string,
  isPublic = true
): Promise<CuratedBoard> {
  const board = await prisma.curatedBoard.create({
    data: {
      userId,
      name: name.trim(),
      description: theme,
      isPrivate: !isPublic,
    },
  });

  return {
    id: board.id,
    title: board.name,
    theme: board.description || 'Custom Board',
    isPublic: !board.isPrivate,
  };
}
