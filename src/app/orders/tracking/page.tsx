import { redirect } from 'next/navigation';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Live Order Tracking & Delivery Timeline — VYNTRA Logistics',
  description: 'Track your live Vyntra parcel shipment, courier progress, and delivery schedule.',
};

interface SearchParamsProps {
  searchParams?: {
    orderId?: string;
  };
}

export default function GenericTrackingPage({ searchParams }: SearchParamsProps) {
  const orderId = searchParams?.orderId ? encodeURIComponent(searchParams.orderId.replace(/^#/, '')) : '';
  if (orderId) {
    redirect(`/account?tab=tracking&orderId=${orderId}`);
  }
  redirect('/account?tab=tracking');
}
