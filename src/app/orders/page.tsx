import { redirect } from 'next/navigation';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Your Orders & Returns — VYNTRA',
  description: 'Track orders, request instant doorstep returns, download GST invoices, and review purchases on Vyntra.',
};

interface SearchParamsProps {
  searchParams?: {
    [key: string]: string | string[] | undefined;
  };
}

export default function OrdersPage({ searchParams }: SearchParamsProps) {
  const params = new URLSearchParams();
  params.set('tab', 'orders');

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
