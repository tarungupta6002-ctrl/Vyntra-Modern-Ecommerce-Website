import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { OrderCancellationView } from '@/components/orders/order-cancellation-view';

interface PageProps {
  params: {
    orderId: string;
  };
}

export function generateMetadata({ params }: PageProps): Metadata {
  const cleanId = params.orderId?.replace(/^#/, '');
  return {
    title: `Cancel Order #${cleanId} & Instant Refund — VYNTRA`,
    description: `1-Click order cancellation, item selection, and instant refund via Vyntra Vault or source bank for Order #${cleanId}.`,
  };
}

export default function OrderCancellationRoute({ params }: PageProps) {
  const orderId = params.orderId || 'VYN-ORD-91044';

  return (
    <Suspense
      fallback={
        <div className="w-full min-h-[60vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-[#00288e] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-[#757684] font-medium">Loading cancellation audit ledger...</p>
          </div>
        </div>
      }
    >
      <OrderCancellationView orderId={orderId} />
    </Suspense>
  );
}
