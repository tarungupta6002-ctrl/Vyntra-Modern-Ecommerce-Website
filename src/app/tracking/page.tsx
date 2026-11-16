import { redirect } from 'next/navigation';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Live Order Tracking & Delivery Timeline — VYNTRA',
  description: 'Live order tracking, courier status, and delivery milestones on Vyntra.',
};

interface SearchParamsProps {
  searchParams?: {
    [key: string]: string | string[] | undefined;
  };
}

export default function RootTrackingPage({ searchParams }: SearchParamsProps) {
  const params = new URLSearchParams();
  params.set('tab', 'tracking');

  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (key !== 'tab' && value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach((v) => params.append(key, v));
        } else {
          params.set(key, value);
        }
      }
    });
  }

  redirect(`/account?${params.toString()}`);
}
