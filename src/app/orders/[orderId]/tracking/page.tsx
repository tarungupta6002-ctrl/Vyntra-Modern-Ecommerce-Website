import { redirect } from 'next/navigation';
import { Metadata } from 'next';

interface PageProps {
  params: {
    orderId: string;
  };
}

export function generateMetadata({ params }: PageProps): Metadata {
  const cleanId = params.orderId?.replace(/^#/, '');
  return {
    title: `Track Order #${cleanId} — VYNTRA Logistics`,
    description: `Live shipment timeline and courier tracking for order #${cleanId} on Vyntra.`,
  };
}

export default function OrderTrackingPage({ params }: PageProps) {
  const cleanId = params.orderId ? encodeURIComponent(params.orderId.replace(/^#/, '')) : '';
  redirect(`/account?tab=tracking&orderId=${cleanId}`);
}
