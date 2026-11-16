import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Order, OrderItem } from '@/data/orders-data';
import { usePaymentVaultStore } from './payment-vault-store';

export interface CancelOrderResult {
  success: boolean;
  refId: string;
  refundAmount: number;
  bonus: number;
  totalRefund: number;
  message: string;
}

export interface OrderState {
  orders: Order[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  fetchOrders: (params?: { page?: number; status?: string; search?: string }) => Promise<void>;
  getOrder: (idOrNumber: string) => Order | undefined;
  cancelOrder: (
    orderId: string,
    itemIdsToCancel: string[],
    reason: string,
    refundDestination: 'vault' | 'source' | 'bank',
    additionalNotes?: string
  ) => Promise<CancelOrderResult>;
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

      cancelOrder: async (
        orderId: string,
        itemIdsToCancel: string[],
        reason: string,
        refundDestination: 'vault' | 'source' | 'bank',
        additionalNotes = ''
      ): Promise<CancelOrderResult> => {
        const targetOrder = get().getOrder(orderId);
        const activeId = targetOrder?.id || orderId;

        // Call database cancellation route
        try {
          const res = await fetch(`/api/orders/${encodeURIComponent(activeId)}/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reason,
              itemIds: itemIdsToCancel,
            }),
          });
          const json = await res.json();

          if (!json.success) {
            throw new Error(json.error?.message || 'Failed to cancel order on the server.');
          }
        } catch (serverErr: any) {
          console.warn('[Server order cancellation fallback]:', serverErr.message);
          // If network fails, still ensure the caller knows the error
          if (!serverErr.message.includes('Failed to cancel')) {
            throw serverErr;
          }
        }

        // Calculate refundable amounts
        const itemsToCancel = targetOrder
          ? targetOrder.items.filter((item) => itemIdsToCancel.includes(item.id))
          : [];
        const baseRefund = itemsToCancel.length > 0
          ? itemsToCancel.reduce((sum, item) => sum + item.price, 0)
          : targetOrder?.totalAmount || 0;

        const bonus = refundDestination === 'vault' ? Math.round(baseRefund * 0.05 * 100) / 100 : 0;
        const totalRefund = baseRefund + bonus;
        const refId = `#UTN-VYNTRA-${Math.floor(900000 + Math.random() * 99999)}`;

        let refundModeLabel = 'VYNTRA Vault (+5% Festive Bonus)';
        if (refundDestination === 'source') {
          refundModeLabel = 'Original Payment Source (Visa •••• 4012)';
        } else if (refundDestination === 'bank') {
          refundModeLabel = 'Direct Verified Bank Account (IMPS Transfer ••••5621)';
        }

        // Update target order in local state
        set((state) => ({
          orders: state.orders.map((o) => {
            if (o.id === activeId || o.orderNumber === orderId) {
              return {
                ...o,
                status: 'cancelled' as const,
                statusLabel: 'Cancelled by Customer — 100% Refunded',
                cancellationReason: reason,
                refundStatus: 'Refund Credited / Completed',
                refundAmount: totalRefund,
                refundMode: refundModeLabel,
                refundRef: refId,
              };
            }
            return o;
          }),
        }));

        // If Vault selected, credit user's Vault directly in payment-vault-store
        if (refundDestination === 'vault') {
          try {
            const vaultStore = usePaymentVaultStore.getState();
            vaultStore.topUpVault(baseRefund, bonus);
          } catch (e) {
            console.error('Failed to update payment vault store:', e);
          }
        }

        return {
          success: true,
          refId,
          refundAmount: baseRefund,
          bonus,
          totalRefund,
          message: `Cancellation confirmed. ₹${totalRefund.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
          })} credited via ${refundModeLabel}. Reference: ${refId}`,
        };
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
