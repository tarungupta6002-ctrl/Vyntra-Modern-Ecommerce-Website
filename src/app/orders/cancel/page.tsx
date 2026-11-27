import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { OrderCancellationView } from '@/components/orders/order-cancellation-view';

export const metadata: Metadata = {
  title: 'Cancel order | Vyntra',
  description:
    'Cancel an order. Online payments are refunded to the original payment method.',
};

interface SearchProps {
  searchParams?: {
    orderId?: string;
  };
}

export default function OrderCancelQueryRoute({ searchParams }: SearchProps) {
  const orderId = searchParams?.orderId || 'VYN-ORD-91044';

  return (
    <Suspense
      fallback={
        <div className="w-full min-h-[60vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-[#007185] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-[#565959] font-medium">Loading cancellation audit ledger...</p>
          </div>
        </div>
      }
    >
      <OrderCancellationView orderId={orderId} />
    </Suspense>
  );
}
