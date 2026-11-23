import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useCartStore } from './cart-store';

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

export const INITIAL_WISHLIST_ITEMS: WishlistItem[] = [
  // 1. Kurta Set (Price Drop Hero)
  {
    id: 'wish-1',
    productId: 'VYN-LNN-8402',
    slug: 'handcrafted-premium-linen-kurta',
    title: 'Handcrafted Linen Kurta & Trouser Set',
    subtitle: 'Royal Sapphire Blue • 100% Organic Flax',
    brand: 'RIVAAZ ATELIER',
    brandTag: 'Festive Ed.',
    category: 'ethnic',
    price: 1899,
    originalPrice: 3799,
    discount: '50% OFF',
    rating: 4.8,
    reviewCount: 256,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCpwrNsj5YPVo1vY-tBQP-nqo5OW28cUelkKu1fAIXjy8j8ybHKnia7QJpGxGZhojsR8aMRp25Fed9Hz54OYs2zdU1dPdeWd0iIfWJP9sfnGF9N9j1pnBt57PEOxYqJDmj9ZWoNqXngWuiQYKDA45JQ5i5iQ3m6yVpn2Anz1lWxSbLNQDloCdeRUkTjPUkUaXvgnwcXMatjaiNym-yhEVb5gjtPFsoJ7AJMY4cyuN4',
    inStock: true,
    stockNote: 'Only 2 left in Size M',
    priceDropNote: '₹200 Price Drop',
    badge: '₹200 Price Drop',
    badgeColor: 'secondary',
    boardIds: ['festive', 'handloom'],
    express24h: true,
    sizeOptions: ['M (38)', 'L (40)', 'XL (42)'],
    selectedSize: 'M (38)',
  },
  // 2. Chanderi Silk Indigo Tunic
  {
    id: 'wish-2',
    productId: 'VYN-NIC-201',
    slug: 'handcrafted-premium-linen-kurta',
    title: 'Chanderi Silk Indigo Overlay Tunic',
    subtitle: 'Handwoven Pure Silk Blend • Hand block printed',
    brand: 'VARANASI SILKS',
    brandTag: 'Heritage Silk',
    category: 'ethnic',
    price: 2000,
    originalPrice: 3333,
    discount: '40% OFF',
    rating: 4.7,
    reviewCount: 184,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDM7Dxo61XiblZ1ix6RAXyKpNBMobSMFABRL7R0IdgwMRLW0v7pmjDlQQav6FOOCmaBlAp2YcvOF95MH_tVxHOpRgoe2RnElby2Soly6rVG0GZihPz3ppYy11AfqWvQbAE8UPEjj8yyD3wawajA_qU6yMnLod4jqS4qW32QpVku7cxLsatC0N0jDSbpqH2PIJNN1qBIl0iIfq6hw2kl3UxfbkXEqplaViZVLraqMC4',
    inStock: true,
    stockNote: 'Express 24h Available',
    badge: 'Festive Favorite',
    badgeColor: 'primary',
    boardIds: ['festive', 'handloom'],
    express24h: true,
    sizeOptions: ['S', 'M', 'L', 'XL'],
    selectedSize: 'L',
  },
  // 3. Kolhapuri Slippers
  {
    id: 'wish-3',
    productId: 'VYN-KOL-901',
    slug: 'artisanal-grain-leather-city-tote',
    title: 'Hand-Braided Leather Kolhapuris',
    subtitle: 'Tan Brown • Cushioned Sole • Hand-punched',
    brand: 'KARIGAR LEATHERS',
    brandTag: 'Artisanal Footwear',
    category: 'footwear',
    price: 1850,
    originalPrice: 2999,
    discount: '38% OFF',
    rating: 4.8,
    reviewCount: 92,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAY_doHyobsUSusx8EXOu4X17RRjzsiALpc6UnG_fnTADEnoLBl8SigLtbvIoEaeRMTpKHFhg3P0ZaCYM-4o4uhjHFj3H3_Hq7zJsdH4bOnpCyFRMxKrcNUS04bU8N_srxAwLFJaU1RdtGCMqi9q4PxyORKwbhWyk1IykmrEWFyjaPsubpWwRzndPGXsJh3dBK6XeiybYJCgsekYizmOkcF8SIJIQbDAbp4OktEJLs',
    inStock: true,
    stockNote: 'Low Stock (Size 42)',
    badge: 'Heritage Classic',
    badgeColor: 'secondary',
    boardIds: ['footwear-jewelry'],
    express24h: false,
    sizeOptions: ['EU 40', 'EU 41', 'EU 42', 'EU 43'],
    selectedSize: 'EU 42',
  },
  // 4. Tussar Raw Silk Stole with Zari
  {
    id: 'wish-4',
    productId: 'VYN-DUP-301',
    slug: 'marigold-lotus-banarasi-saree',
    title: 'Tussar Raw Silk Stole with Zari',
    subtitle: 'Ivory & Pure Metallic Gold Lurex • 2.5m',
    brand: 'BHAGALPUR WEAVES',
    brandTag: 'Tussar Pure',
    category: 'accessories',
    price: 899,
    originalPrice: 1799,
    discount: '50% OFF',
    rating: 4.9,
    reviewCount: 312,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCKnlnP7zKVUNJgLmeNacOsZuFQbacs47UQfpavSFHXgqSnx8yJ-55Ir943m57RApLE3l5T5uEx-9aFZpDFtuXNUVtEwpewzbdoXDziarVYMumMahFH2QdQf5F2xF8ZoiFyCaB9i351KJeoDeyVABvkuX-LjTCXn30hlpnCIHdDYdYFXoMK1A4J3h9Kky_-l6HmN01t3n-V21HaEbpXn5D9erz-v4VoSeRHQb36C00',
    inStock: true,
    stockNote: 'In Stock',
    priceDropNote: '₹300 Price Drop',
    badge: '₹300 Price Drop',
    badgeColor: 'secondary',
    boardIds: ['festive', 'handloom'],
    express24h: true,
    sizeOptions: ['Free Size (2.5m)'],
    selectedSize: 'Free Size (2.5m)',
  },
  // 5. Antique Brass Filigree Jhumkas
  {
    id: 'wish-5',
    productId: 'VYN-JHM-202',
    slug: 'marigold-lotus-banarasi-saree',
    title: 'Antique Brass Filigree Jhumkas',
    subtitle: '22k Micro Gold Dipped • Handcrafted Motifs',
    brand: 'AMRAPALI COUTURE',
    brandTag: 'Temple Jewels',
    category: 'accessories',
    price: 999,
    originalPrice: 1500,
    discount: '33% OFF',
    rating: 4.6,
    reviewCount: 78,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDVxzPbTnGfHTWvsk-KPvGi8_IUNAfUe8T61r99k9qYF7fYEFEwwupQ4JX-W1hob6oGJgdmO958c8GRDuCrXjwQfqaIIO4K_mcdLL_TXVhJg1pQem_KT4U7d_lgOWLuUYf0KiG-H3fVUZi0zAwoLOQrbn_tmVliRIzxEGweTln0brKKILrcNE4RopSwiWsem99ry4a7X4UJVkAUu2YdBqAmCF3G4Ies31udBG4U_60',
    inStock: true,
    stockNote: 'Temple Collection',
    badge: 'Limited Edition',
    badgeColor: 'dark',
    boardIds: ['festive', 'footwear-jewelry'],
    express24h: false,
    sizeOptions: ['Standard Pair'],
    selectedSize: 'Standard Pair',
  },
  // 6. Ivory & Gold Bandhgala Waistcoat
  {
    id: 'wish-6',
    productId: 'VYN-BNG-601',
    slug: 'handcrafted-premium-linen-kurta',
    title: 'Ivory & Gold Bandhgala Waistcoat',
    subtitle: 'Raw Silk Heritage • Mother of Pearl buttons',
    brand: 'RAGHAV RAJPUT LUXE',
    brandTag: 'Bespoke',
    category: 'ethnic',
    price: 18499,
    originalPrice: 24999,
    discount: '26% OFF',
    rating: 4.9,
    reviewCount: 42,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBrLN1aKvSwJUKUNiKrBmEsprbcrw-SqlRsPrksq-NHVyU3mVpoLPYThAD2dwudL_gw-4rzCXfaEh5YnqR2Eg9f7VXwwr_bMs7HcShuGp8r8Vcsq9VnwYRqDAAspEwDJ5AYxyn9WklwUKPO1iW86dFgNNShX7lV0klEZrDkq_zoqsNm-xF2GWPFnpfJbeNFmdGpz6Sc2ftHfyvcJ-bV7XLoaxQiVzR2EZiTJ-KqKt4',
    inStock: true,
    stockNote: 'Made to Order (3 Days)',
    badge: 'Royal Atelier',
    badgeColor: 'primary',
    boardIds: ['festive'],
    express24h: false,
    sizeOptions: ['38 Regular', '40 Regular', '42 Regular', '44 Tailored'],
    selectedSize: '40 Regular',
  },
  // 7. Marigold Zardozi Heritage Mules (Out of Stock / Notify Me)
  {
    id: 'wish-7',
    productId: 'VYN-MUL-701',
    slug: 'artisanal-grain-leather-city-tote',
    title: 'Marigold Zardozi Heritage Mules',
    subtitle: 'Pure Silk Velvet • Cushion Insole • Gold Wire',
    brand: 'NEEDLEDUST ARTISANS',
    brandTag: 'Bridal Velvet',
    category: 'footwear',
    price: 5990,
    originalPrice: 7490,
    discount: '20% OFF',
    rating: 4.7,
    reviewCount: 65,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDRukZrqi9phXBTXvIojLwBDawCyIcVsHnzi94S-KP1x_j8OSV5nH7TM0PFd6tqJXFYGPzRjtLXtZR4zMezj5H6nM0RmNk1znDFRrgDz20dVtzqKLKy2_mBrViGTZzMIwbCUR4EcUOfC85-jdgKuHMFDObxmseZ8ryjb5U-Vli7wvSSioOs1f6WBcXwC6Vfd3xUcSOHp32WHbv4sDSp1i7vUrCo04-Pgd_Edfdxrck',
    inStock: false,
    stockNote: 'Sold Out in Size 38',
    badge: 'Sold Out in Size 38',
    badgeColor: 'error',
    boardIds: ['festive', 'footwear-jewelry'],
    express24h: false,
    sizeOptions: ['Sz 38', 'Sz 39', 'Sz 40'],
    selectedSize: 'Sz 38',
  },
  // 8. Marigold Lotus Pure Katan Silk Banarasi Saree
  {
    id: 'wish-8',
    productId: 'VYN-BAN-104',
    slug: 'marigold-lotus-banarasi-saree',
    title: 'Marigold Lotus Pure Katan Silk Banarasi Saree',
    subtitle: 'Pure Varanasi Katan Silk with Kadwa Zari Weave',
    brand: 'VARANASI MASTER WEAVERS',
    brandTag: 'GI Certified',
    category: 'ethnic',
    price: 32900,
    originalPrice: 48000,
    discount: '31% OFF',
    rating: 5.0,
    reviewCount: 420,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAZY6Rn1sX9zajvu57JMzOmU7lTmvqI-LwLj8FZkGKPKa2fDRcswkkFSPDEu2zQusfLQWUiFp9H4LzwuJYFJbuF9bGPKbWzWd4XagxqkVICEurmu18QQYfHOCl534lDi1BtAdVsfQh39l8Mvx4sE-mOFzw7JsKJkwKtMR1GcEXqC7L8Z5IXFPP91xobDUp-qeMs0I6rAor8wRM1atkC0vFuzXoUFhDnmnOtgVY-ahc',
    inStock: true,
    stockNote: 'In Stock',
    badge: 'Festive Grand Pick',
    badgeColor: 'primary',
    boardIds: ['festive', 'handloom'],
    express24h: true,
    sizeOptions: ['Standard 6.5m (With Blouse)'],
    selectedSize: 'Standard 6.5m (With Blouse)',
  },
  // 9. Sapphire Sunburst Automatic Heritage Watch
  {
    id: 'wish-9',
    productId: 'VYN-WTC-501',
    slug: 'sapphire-sunburst-automatic-watch',
    title: 'Sapphire Sunburst Automatic Heritage Watch',
    subtitle: 'Calibre 8215 Automatic • 316L Surgical Steel • Exhibition Caseback',
    brand: 'TITAN STELLAR ATELIER',
    brandTag: 'Horology',
    category: 'watches',
    price: 14995,
    originalPrice: 19995,
    discount: '25% OFF',
    rating: 4.9,
    reviewCount: 160,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuD3TQqUUrqLlSG__a15hiDsMEQrbeg2ohhu3D8-oXuqIbbMZBmhHPnatk-kdu06-jo31UtWGyZxZ5tJ0TWboVWlnK0fFvexBv9dOxrML0tz6mkcyF6wEqhA51wwtQop7plz3bA1RKxPJB-10LuG4PvJjeXt6PTQEPfM_Zdx_Ms8e6_VIPFkVbdw9sbUxRQY_Lb9kE1v_YxZ2Uqz8WvqpgQqh8cn-bfqLZQMhneYSnw',
    inStock: true,
    stockNote: 'Only 3 pieces left',
    badge: 'Limited Run',
    badgeColor: 'dark',
    boardIds: ['footwear-jewelry'],
    express24h: true,
    sizeOptions: ['40mm Case'],
    selectedSize: '40mm Case',
  },
  // 10. Artisanal Full-Grain City Tote
  {
    id: 'wish-10',
    productId: 'VYN-BAG-401',
    slug: 'artisanal-grain-leather-city-tote',
    title: 'Artisanal Full-Grain Vegetable Tanned City Tote',
    subtitle: 'Full-Grain Tuscan Cowhide • Antique Brass Hardware • Laptop Sleeve',
    brand: 'HIDESIGN HERITAGE',
    brandTag: 'Leather Goods',
    category: 'bags',
    price: 6499,
    originalPrice: 8999,
    discount: '28% OFF',
    rating: 4.8,
    reviewCount: 110,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCJhvaeyjBiAqQ6uWFUtQuOw5vlYtqq7a-khcH9Vjk8YwzsaC_xKGe4LVIsXuZIC0s7W_49m0peR_jJn5PRIFurVPRW4CsPvAV0zUu3pdc_TBnSE7XWv79Ww2wNNCrtNT0EosNu6DV6nq1PFS7dI6GtI0lqQErBJcEO6EkKRwPFn224viNWzQ7qTDX16ijOhdcV0WTOzXJ49Fsnbj20i-IISMuvBlwerY7HQaTq61Q',
    inStock: true,
    stockNote: 'In Stock',
    badge: 'Handcrafted',
    badgeColor: 'primary',
    boardIds: ['handloom'],
    express24h: true,
    sizeOptions: ['Standard 15-inch'],
    selectedSize: 'Standard 15-inch',
  },
];

interface WishlistState {
  items: WishlistItem[];
  boards: CuratedBoard[];
  activeBoardId: string;
  filterPriceDrops: boolean;
  filterInStock: boolean;
  isLoading: boolean;

  syncWithDatabase: () => Promise<void>;
  addItem: (item: WishlistItem) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  toggleItem: (item: WishlistItem) => Promise<boolean>;
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
            const errorMsg = json.error || 'Failed to save to Wishlist.';
            console.warn('[Wishlist Add Error - Reverted]:', errorMsg);
            throw new Error(errorMsg);
          }
        } catch (err: any) {
          // Revert optimistic addition on network error
          set({ items: previousItems });
          console.warn('[Wishlist Add Network Failure - Reverted]:', err?.message);
          throw err;
        }
      },

      removeItem: async (id) => {
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
            const errorMsg = json.error || 'Failed to remove from Wishlist.';
            console.warn('[Wishlist Remove Error - Reverted]:', errorMsg);
            throw new Error(errorMsg);
          }
        } catch (err: any) {
          // Rollback optimistic removal on network error
          set({ items: previousItems });
          console.warn('[Wishlist Remove Network Failure - Reverted]:', err?.message);
          throw err;
        }
      },

      toggleItem: async (item) => {
        const exists = get().isInWishlist(item.productId || item.id || item.slug || '');
        if (exists) {
          try {
            await get().removeItem(item.id || item.productId || item.slug || '');
            return false;
          } catch {
            return true;
          }
        } else {
          try {
            await get().addItem(item);
            return true;
          } catch {
            return false;
          }
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
          items: INITIAL_WISHLIST_ITEMS,
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
