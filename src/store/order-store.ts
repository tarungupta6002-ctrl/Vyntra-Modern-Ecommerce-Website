import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Order, OrderItem } from '@/data/orders-data';

export interface OrderState {
  orders: Order[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  fetchOrders: (params?: { page?: number; status?: string; search?: string }) => Promise<void>;
  getOrder: (idOrNumber: string) => Order | undefined;
  resetOrders: () => void;
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      orders: [],
      isLoading: false,
      error: null,
      totalCount: 0,
      currentPage: 1,
      totalPages: 1,

      fetchOrders: async (params) => {
        try {
          set({ isLoading: true, error: null });
          const query = new URLSearchParams();
          if (params?.page) query.set('page', String(params.page));
          if (params?.status && params.status !== 'all') query.set('status', params.status);
          if (params?.search) query.set('search', params.search);

          const res = await fetch(`/api/orders?${query.toString()}`);
          const json = await res.json();

          if (json.success && json.data) {
            set({
              orders: json.data.orders,
              totalCount: json.data.pagination.totalCount,
              currentPage: json.data.pagination.page,
              totalPages: json.data.pagination.totalPages,
              isLoading: false,
            });
          } else {
            // Unauthenticated or empty state
            set({
              isLoading: false,
              error: json.error?.message || null,
            });
          }
        } catch (err: any) {
          console.warn('[Orders fetch error]:', err);
          set({ isLoading: false, error: err.message });
        }
      },

      getOrder: (idOrNumber: string) => {
        if (!idOrNumber) return undefined;
        const clean = idOrNumber.trim().toLowerCase().replace(/^#/, '');
        return get().orders.find((o) => {
          const matchId = o.id.toLowerCase() === clean;
          const matchNum = o.orderNumber.toLowerCase().replace(/^#/, '') === clean;
          const matchTrk = o.trackingNumber?.toLowerCase() === clean;
          return matchId || matchNum || matchTrk;
        });
      },

      resetOrders: () => set({ orders: [] }),
    }),
    {
      name: 'vyntra_orders_vault_storage',
      partialize: (state) => ({
        orders: state.orders,
      }),
    }
  )
);
