import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem } from '@/types';

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  couponCode: string | null;
  isCouponApplied: boolean;
  isLoading: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  syncWithDatabase: () => Promise<void>;
  mergeGuestCart: () => Promise<void>;
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  applyCoupon: (code: string) => boolean;
  removeCoupon: () => void;
  getTotalItems: () => number;
  getSubtotal: () => number;
  getTotalSavings: () => number;
}

let mutationCounter = 0;
let pendingMutations = 0;

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      couponCode: null,
      isCouponApplied: false,
      isLoading: false,

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      // Synchronizes cart with Prisma database when authenticated (pure read operation)
      syncWithDatabase: async () => {
        // If a mutation (add/update/delete) is in flight, never overwrite optimistic state
        if (pendingMutations > 0) return;

        const syncSeq = mutationCounter;
        try {
          set({ isLoading: true });
          const res = await fetch('/api/cart');
          const json = await res.json();

          // Discard stale GET response if a mutation started while this request was in flight
          if (syncSeq !== mutationCounter || pendingMutations > 0) {
            set({ isLoading: false });
            return;
          }

          if (json.success && json.data) {
            const isGuest = json.meta?.isGuest;
            if (!isGuest) {
              // Authenticated user: DB cart is the single source of truth
              set({
                items: json.data.items || [],
                isLoading: false,
              });
            } else {
              set({ isLoading: false });
            }
          } else {
            set({ isLoading: false });
          }
        } catch (err) {
          console.warn('[Cart sync error, using local fallback]:', err);
          set({ isLoading: false });
        }
      },

      // Merges guest cart items into authenticated user DB cart once on sign-in
      mergeGuestCart: async () => {
        const localItems = get().items;
        if (!localItems || localItems.length === 0) return;

        mutationCounter++;
        const thisSeq = mutationCounter;
        pendingMutations++;

        try {
          const mergeRes = await fetch('/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mergeItems: localItems }),
          });
          const mergeJson = await mergeRes.json();
          if (thisSeq === mutationCounter && mergeJson.success && mergeJson.data?.cart) {
            set({
              items: mergeJson.data.cart.items,
            });
          }
        } catch (err) {
          console.warn('[Cart merge on login error]:', err);
        } finally {
          pendingMutations = Math.max(0, pendingMutations - 1);
        }
      },

      // Add item to bag with server-side validation and database persistence
      addItem: async (newItem) => {
        mutationCounter++;
        const thisSeq = mutationCounter;
        pendingMutations++;

        const currentItems = get().items;
        const requestedQty = newItem.quantity || 1;

        // Optimistic local update (differentiated by product, size, color, and seller offer)
        const existing = currentItems.find(
          (item) =>
            item.productId === newItem.productId &&
            item.size === newItem.size &&
            item.color === newItem.color &&
            (item.sellerOfferId || '') === (newItem.sellerOfferId || '')
        );

        let updatedItems: CartItem[] = [];
        if (existing) {
          updatedItems = currentItems.map((item) =>
            item.id === existing.id
              ? { ...item, quantity: item.quantity + requestedQty }
              : item
          );
        } else {
          updatedItems = [
            ...currentItems,
            {
              ...newItem,
              id: newItem.id || `item-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
              quantity: requestedQty,
            },
          ];
        }

        set({ items: updatedItems, isOpen: true });

        // Database persistence for authenticated session
        try {
          const res = await fetch('/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: newItem.productId,
              variantId: newItem.variantId?.startsWith('var-') ? undefined : newItem.variantId,
              sellerOfferId: newItem.sellerOfferId,
              offerVariantId: newItem.offerVariantId,
              quantity: requestedQty,
              selectedSize: newItem.size,
              selectedColor: newItem.color,
            }),
          });
          const json = await res.json();
          if (thisSeq === mutationCounter && json.success && json.data?.cart) {
            set({ items: json.data.cart.items });
          }
        } catch (err) {
          // Keep optimistic update in localStorage if guest or offline
        } finally {
          pendingMutations = Math.max(0, pendingMutations - 1);
        }
      },

      // Remove item
      removeItem: async (id) => {
        mutationCounter++;
        const thisSeq = mutationCounter;
        pendingMutations++;

        set({ items: get().items.filter((item) => item.id !== id) });

        try {
          const res = await fetch(`/api/cart/items/${id}`, {
            method: 'DELETE',
          });
          const json = await res.json();
          if (thisSeq === mutationCounter && json.success && json.data?.cart) {
            set({ items: json.data.cart.items });
          }
        } catch (err) {
        } finally {
          pendingMutations = Math.max(0, pendingMutations - 1);
        }
      },

      // Update quantity
      updateQuantity: async (id, quantity) => {
        mutationCounter++;
        const thisSeq = mutationCounter;
        pendingMutations++;

        const currentItems = get().items;
        if (quantity <= 0) {
          set({ items: currentItems.filter((item) => item.id !== id) });
        } else {
          set({
            items: currentItems.map((i) =>
              i.id === id ? { ...i, quantity } : i
            ),
          });
        }

        try {
          const res = await fetch(`/api/cart/items/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity }),
          });
          const json = await res.json();
          if (thisSeq === mutationCounter && json.success && json.data?.cart) {
            set({ items: json.data.cart.items });
          }
        } catch (err) {
        } finally {
          pendingMutations = Math.max(0, pendingMutations - 1);
        }
      },

      // Clear all items
      clearCart: async () => {
        mutationCounter++;
        const thisSeq = mutationCounter;
        pendingMutations++;

        set({ items: [] });
        try {
          await fetch('/api/cart', { method: 'DELETE' });
        } catch (err) {
        } finally {
          pendingMutations = Math.max(0, pendingMutations - 1);
        }
      },

      // Coupon application (Only VYNTRAFIRST is active)
      applyCoupon: (code) => {
        const clean = code.trim().toUpperCase();
        if (clean === 'VYNTRAFIRST') {
          set({ couponCode: clean, isCouponApplied: true });
          return true;
        }
        return false;
      },
      removeCoupon: () => set({ couponCode: null, isCouponApplied: false }),

      getTotalItems: () => get().items.reduce((acc, item) => acc + item.quantity, 0),
      getSubtotal: () =>
        get().items.reduce((acc, item) => acc + item.price * item.quantity, 0),
      getTotalSavings: () =>
        get().items.reduce(
          (acc, item) =>
            acc + Math.max(0, item.originalPrice - item.price) * item.quantity,
          0
        ),
    }),
    {
      name: 'vyntra-cart-storage',
      partialize: (state) => ({
        items: state.items,
        couponCode: state.couponCode,
        isCouponApplied: state.isCouponApplied,
      }),
    }
  )
);
