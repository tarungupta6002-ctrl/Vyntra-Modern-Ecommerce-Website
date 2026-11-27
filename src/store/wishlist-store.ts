import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useCartStore } from './cart-store';
import { createClient } from '@/lib/supabase/client';

/** Thrown when a wishlist change needs a signed-in user (no session, or the API returned 401). */
export class WishlistAuthError extends Error {
  constructor(message = 'Please sign in to save items to your Wishlist.') {
    super(message);
    this.name = 'WishlistAuthError';
  }
}

/** Local session check (no network): lets us skip optimistic updates for guests entirely. */
async function hasClientSession(): Promise<boolean> {
  try {
    const { data } = await createClient().auth.getSession();
    return Boolean(data.session);
  } catch {
    return false;
  }
}

/** Turns a failed wishlist API response into the right error type. */
function wishlistApiError(res: Response, json: any, fallback: string): Error {
  if (res.status === 401 || json?.error?.code === 'UNAUTHORIZED') return new WishlistAuthError();
  const message = typeof json?.error === 'string' ? json.error : json?.error?.message;
  return new Error(message || fallback);
}

export interface WishlistItem {
  id: string;
  productId?: string;
  slug?: string;
  title: string;
  subtitle?: string;
  brand: string;
  brandTag?: string;
  category?: string;
  price: number;
  originalPrice: number;
  discount?: string;
  rating?: number;
  reviewCount?: number;
  image: string;
  inStock: boolean;
  stockNote?: string;
  priceDropNote?: string;
  badge?: string;
  badgeColor?: 'secondary' | 'primary' | 'dark' | 'error';
  boardIds: string[]; // e.g. ['festive', 'handloom']
  express24h?: boolean;
  sizeOptions?: string[];
  selectedSize?: string;
}

export interface CuratedBoard {
  id: string;
  title: string;
  theme: string;
  isPublic?: boolean;
  icon?: string;
}

export const INITIAL_BOARDS: CuratedBoard[] = [
  {
    id: 'all',
    title: 'All Items',
    theme: 'Complete Wishlist',
  },
  {
    id: 'festive',
    title: 'Diwali & Festive Soirée',
    theme: 'Festive Celebration (Diwali / Puja)',
  },
  {
    id: 'handloom',
    title: 'Handloom & Silk Heritage',
    theme: 'Everyday Heritage Chic',
  },
  {
    id: 'footwear-jewelry',
    title: 'Footwear & Jewelry',
    theme: 'Wedding & Royal Soirée',
  },
];

interface WishlistState {
  items: WishlistItem[];
  boards: CuratedBoard[];
  activeBoardId: string;
  filterPriceDrops: boolean;
  filterInStock: boolean;
  isLoading: boolean;
  /** Global "sign in to save" dialog, opened whenever a guest tries to change the wishlist. */
  signInPromptOpen: boolean;
  setSignInPromptOpen: (open: boolean) => void;

  syncWithDatabase: () => Promise<void>;
  addItem: (item: WishlistItem) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  toggleItem: (item: WishlistItem) => Promise<boolean>;
  /** Like toggleItem, but reports what happened and throws (WishlistAuthError for guests). */
  toggleItemResult: (item: WishlistItem) => Promise<'added' | 'removed'>;
  isInWishlist: (idOrProductId: string) => boolean;
  createBoard: (title: string, theme: string, isPublic?: boolean) => Promise<CuratedBoard>;
  setActiveBoardId: (boardId: string) => void;
  setFilterPriceDrops: (enabled: boolean) => void;
  setFilterInStock: (enabled: boolean) => void;
  moveItemToCart: (item: WishlistItem, variant?: string) => void;
  moveAllInStockToCart: () => number;
  getTotalItems: () => number;
  resetWishlist: () => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      boards: INITIAL_BOARDS,
      activeBoardId: 'all',
      filterPriceDrops: false,
      filterInStock: false,
      isLoading: false,
      signInPromptOpen: false,
      setSignInPromptOpen: (open) => set({ signInPromptOpen: open }),

      syncWithDatabase: async () => {
        try {
          set({ isLoading: true });
          const res = await fetch('/api/wishlist');
          const json = await res.json();

          if (json.success && json.data) {
            const serverItems: WishlistItem[] = Array.isArray(json.data.items)
              ? json.data.items
              : [];
            const isGuest = Boolean(json.meta?.isGuest);

            if (!isGuest) {
              const currentLocal = get().items;
              // If user has local items not yet on server, merge them to Supabase
              const unsaved = currentLocal.filter(
                (loc) => !serverItems.some((s) => s.productId === loc.productId || s.id === loc.id)
              );

              if (unsaved.length > 0) {
                try {
                  const mergeRes = await fetch('/api/wishlist', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mergeItems: unsaved }),
                  });
                  const mergeJson = await mergeRes.json();
                  if (mergeJson.success && Array.isArray(mergeJson.data?.items)) {
                    set({ items: mergeJson.data.items, isLoading: false });
                    return;
                  }
                } catch (mergeErr) {
                  console.warn('[Wishlist sync merge error]:', mergeErr);
                }
              }

              // Update with server verified wishlist
              set({ items: serverItems, isLoading: false });
            }
          }
        } catch (err) {
          console.warn('[Wishlist fetch error]:', err);
        } finally {
          set({ isLoading: false });
        }
      },

      addItem: async (item) => {
        const exists = get().items.some(
          (i) => i.id === item.id || (item.productId && i.productId === item.productId)
        );
        if (exists) return;

        // Guests can't save: fail before touching state so the heart never flickers on.
        if (!(await hasClientSession())) {
          set({ signInPromptOpen: true });
          throw new WishlistAuthError();
        }

        const previousItems = get().items;
        // Optimistic UI update
        const updatedList = [item, ...previousItems];
        set({ items: updatedList });

        // Server synchronization to Supabase
        try {
          const res = await fetch('/api/wishlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: item.productId || item.id || item.slug,
              selectedSize: item.selectedSize,
              boardId: item.boardIds?.[0],
            }),
          });
          const json = await res.json();
          if (json.success && json.data?.item) {
            // Replace optimistic item with server verified item
            const verified = json.data.item;
            set({
              items: get().items.map((i) =>
                i.id === item.id || (item.productId && i.productId === item.productId)
                  ? verified
                  : i
              ),
            });
          } else {
            // Revert optimistic addition if rejected by server (e.g. unauthenticated or invalid product)
            set({ items: previousItems });
            const error = wishlistApiError(res, json, 'Failed to save to Wishlist.');
            console.warn('[Wishlist Add Error - Reverted]:', error.message);
            throw error;
          }
        } catch (err: any) {
          // Revert optimistic addition on network error
          set({ items: previousItems });
          if (err instanceof WishlistAuthError) {
            set({ signInPromptOpen: true }); // session expired: server answered 401
          } else {
            console.warn('[Wishlist Add Network Failure - Reverted]:', err?.message);
          }
          throw err;
        }
      },

      removeItem: async (id) => {
        // Guests can't change the server wishlist: never optimistically remove for them.
        if (!(await hasClientSession())) {
          set({ signInPromptOpen: true });
          throw new WishlistAuthError();
        }

        const previousItems = get().items;

        // Optimistic removal
        set({
          items: previousItems.filter(
            (i) => i.id !== id && i.productId !== id && i.slug !== id
          ),
        });

        // Server synchronization to Supabase
        try {
          const res = await fetch(`/api/wishlist?id=${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
          });
          const json = await res.json();
          if (!json.success) {
            // Rollback optimistic removal on server rejection
            set({ items: previousItems });
            const error = wishlistApiError(res, json, 'Failed to remove from Wishlist.');
            console.warn('[Wishlist Remove Error - Reverted]:', error.message);
            throw error;
          }
        } catch (err: any) {
          // Rollback optimistic removal on network error
          set({ items: previousItems });
          if (err instanceof WishlistAuthError) {
            set({ signInPromptOpen: true }); // session expired: server answered 401
          } else {
            console.warn('[Wishlist Remove Network Failure - Reverted]:', err?.message);
          }
          throw err;
        }
      },

      toggleItemResult: async (item) => {
        const exists = get().isInWishlist(item.productId || item.id || item.slug || '');
        if (exists) {
          await get().removeItem(item.id || item.productId || item.slug || '');
          return 'removed';
        }
        await get().addItem(item);
        return 'added';
      },

      // Legacy boolean API used by listing pages: returns whether the item is in the
      // wishlist afterwards, and never throws (a failed change leaves the state as it was).
      toggleItem: async (item) => {
        try {
          return (await get().toggleItemResult(item)) === 'added';
        } catch {
          return get().isInWishlist(item.productId || item.id || item.slug || '');
        }
      },

      isInWishlist: (idOrProductId) => {
        return get().items.some(
          (i) =>
            i.id === idOrProductId ||
            i.productId === idOrProductId ||
            (i.slug && i.slug === idOrProductId)
        );
      },

      createBoard: async (title, theme, isPublic = true) => {
        const previousBoards = get().boards;
        const tempId = `board-${Date.now()}`;
        const newBoard: CuratedBoard = {
          id: tempId,
          title: title.trim(),
          theme,
          isPublic,
        };
        set({ boards: [...previousBoards, newBoard], activeBoardId: newBoard.id });

        try {
          const res = await fetch('/api/wishlist/boards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: title.trim(), theme, isPublic }),
          });
          const json = await res.json();
          if (json.success && json.data?.board) {
            set({
              boards: get().boards.map((b) => (b.id === tempId ? json.data.board : b)),
              activeBoardId: json.data.board.id,
            });
            return json.data.board;
          } else {
            set({ boards: previousBoards, activeBoardId: 'all' });
            throw new Error(json.error || 'Failed to create board on server');
          }
        } catch (err) {
          set({ boards: previousBoards, activeBoardId: 'all' });
          console.warn('[Failed to sync board create to Supabase - Reverted]:', err);
          throw err;
        }
      },

      setActiveBoardId: (boardId) => {
        set({ activeBoardId: boardId });
      },

      setFilterPriceDrops: (enabled) => {
        set({ filterPriceDrops: enabled });
      },

      setFilterInStock: (enabled) => {
        set({ filterInStock: enabled });
      },

      moveItemToCart: (item, variant) => {
        if (!item.inStock) return;
        const { addItem: addCartItem, openCart } = useCartStore.getState();

        addCartItem({
          id: `cart-${item.id}-${Date.now()}`,
          productId: item.productId || item.id,
          title: item.title,
          brand: item.brand,
          variantId: `var-${item.id}`,
          size: variant || item.selectedSize || 'Standard',
          color: 'Original',
          price: item.price,
          originalPrice: item.originalPrice,
          image: item.image,
          vendorName: item.brand,
          quantity: 1,
        });

        openCart();
      },

      moveAllInStockToCart: () => {
        const inStockItems = get().items.filter((i) => i.inStock);
        if (inStockItems.length === 0) return 0;

        const { addItem: addCartItem, openCart } = useCartStore.getState();

        inStockItems.forEach((item) => {
          addCartItem({
            id: `batch-${item.id}-${Date.now()}`,
            productId: item.productId || item.id,
            title: item.title,
            brand: item.brand,
            variantId: `var-${item.id}`,
            size: item.selectedSize || 'Standard',
            color: 'Original',
            price: item.price,
            originalPrice: item.originalPrice,
            image: item.image,
            vendorName: item.brand,
            quantity: 1,
          });
        });

        openCart();
        return inStockItems.length;
      },

      getTotalItems: () => {
        return get().items.length;
      },

      resetWishlist: () => {
        set({
          items: [],
          boards: INITIAL_BOARDS,
          activeBoardId: 'all',
          filterPriceDrops: false,
          filterInStock: false,
        });
      },
    }),
    {
      name: 'vyntra-wishlist',
      partialize: (state) => ({
        items: state.items,
        boards: state.boards,
      }),
    }
  )
);
