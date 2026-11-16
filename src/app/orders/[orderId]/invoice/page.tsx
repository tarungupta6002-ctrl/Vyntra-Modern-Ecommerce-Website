import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { TaxInvoiceView } from '@/components/orders/tax-invoice-view';

interface PageProps {
  params: {
    orderId: string;
  };
}

export function generateMetadata({ params }: PageProps): Metadata {
  const cleanId = params.orderId?.replace(/^#/, '') || '';
  return {
    title: `Tax Invoice #${cleanId} — VYNTRA`,
    description: `Official GST Tax Invoice, HSN itemized details, and payment proof for order #${cleanId} on Vyntra.`,
  };
}

export default function OrderInvoicePage({ params }: PageProps) {
  const orderId = decodeURIComponent(params.orderId || '');

  return (
    <Suspense
      fallback={
        <div className="w-full min-h-screen flex items-center justify-center bg-stone-100">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-[#007185] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-stone-600 font-semibold font-sans">
              Generating Authorized GST Tax Invoice...
            </p>
          </div>
        </div>
      }
    >
      <TaxInvoiceView orderId={orderId} />
    </Suspense>
  );
}
