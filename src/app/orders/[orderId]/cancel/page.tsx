import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { OrderCancellationView } from '@/components/orders/order-cancellation-view';
import { PageLoader } from '@/components/ui/loading-spinner';

interface PageProps {
  params: {
    orderId: string;
  };
}

export function generateMetadata({ params }: PageProps): Metadata {
  const cleanId = params.orderId?.replace(/^#/, '');
  return {
    title: `Cancel Order #${cleanId} | Vyntra`,
    description: `Cancel order #${cleanId}. Online payments are refunded to the original payment method.`,
  };
}

export default function OrderCancellationRoute({ params }: PageProps) {
  const orderId = params.orderId || '';

  return (
    <Suspense fallback={<PageLoader message="Loading your order…" />}>
      <OrderCancellationView orderId={orderId} />
    </Suspense>
  );
}
