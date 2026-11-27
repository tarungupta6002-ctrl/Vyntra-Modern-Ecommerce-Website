'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Printer, ArrowLeft, AlertCircle } from 'lucide-react';
import { formatINR } from '@/lib/utils';

interface InvoiceData {
  orderNumber: string;
  orderDate: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  buyer: { name: string; phone: string; address: string; cityStatePin: string } | null;
  sellers: Array<{ name: string; gstin: string | null; address: string | null }>;
  items: Array<{
    id: string;
    title: string;
    seller: string | null;
    size: string | null;
    color: string | null;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  discount: number;
  charges: Array<{ label: string; amount: number }>;
  total: number;
}

const PAYMENT_LABEL: Record<string, string> = {
  UPI: 'UPI',
  CARD: 'Card',
  NET_BANKING: 'Net banking',
  WALLET: 'Wallet',
  COD: 'Cash on Delivery',
};

/** Order invoice built only from stored order data (no invented GSTINs, HSN codes or tax rates). */
export function TaxInvoiceView({ orderId }: { orderId?: string; embedded?: boolean }) {
  const [data, setData] = useState<InvoiceData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError('No order was specified.');
      return;
    }
    let alive = true;
    fetch(`/api/orders/${encodeURIComponent(orderId)}/invoice`)
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!alive) return;
        if (res.ok && json.success) setData(json.data);
        else if (res.status === 401) setError('Sign in to see this invoice.');
        else setError(json.error?.message || json.message || 'This invoice could not be loaded.');
      })
      .catch(() => alive && setError('This invoice could not be loaded. Check your connection and try again.'));
    return () => {
      alive = false;
    };
  }, [orderId]);

  // ?print=true opens the print dialog once the invoice has rendered.
  useEffect(() => {
    if (!data || typeof window === 'undefined') return;
    if (new URLSearchParams(window.location.search).get('print') === 'true') {
      const t = setTimeout(() => window.print(), 500);
      return () => clearTimeout(t);
    }
  }, [data]);

  if (error) {
    return (
      <div className="w-full min-h-[60vh] flex items-center justify-center bg-stone-100 p-4">
        <div className="max-w-md w-full bg-white p-6 rounded-2xl border border-stone-200 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-900">Invoice not available</h2>
            <p className="text-sm text-stone-600 mt-1">{error}</p>
          </div>
          <Link
            href="/account?tab=orders"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#007185] hover:bg-[#005B6B] text-white text-sm font-semibold"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to my orders
          </Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full min-h-[60vh] flex items-center justify-center bg-stone-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#007185] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-stone-600">Loading invoice…</p>
        </div>
      </div>
    );
  }

  const date = new Date(data.orderDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const multiSeller = data.sellers.length > 1;

  return (
    <div className="w-full min-h-screen bg-stone-100 py-6 px-3 sm:px-4 print:bg-white print:p-0 print:min-h-0">
      {/* Actions (not printed) */}
      <div className="max-w-3xl mx-auto mb-4 flex items-center justify-between gap-3 print:hidden">
        <Link href="/account?tab=orders" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#007185] hover:underline">
          <ArrowLeft className="h-4 w-4" />
          My orders
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-full bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] px-4 py-2 text-sm font-semibold text-[#0F1111]"
        >
          <Printer className="h-4 w-4" />
          Print or save as PDF
        </button>
      </div>

      <article className="max-w-3xl mx-auto bg-white border border-stone-200 rounded-2xl p-6 sm:p-10 text-[#0F1111] print:border-0 print:rounded-none print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-stone-200">
          <div>
            <p className="text-xl font-extrabold tracking-tight">VYNTRA</p>
            <h1 className="mt-1 text-2xl font-bold">Order invoice</h1>
          </div>
          <dl className="text-sm grid grid-cols-[auto_auto] gap-x-4 gap-y-1">
            <dt className="text-stone-500">Order</dt>
            <dd className="font-semibold">#{data.orderNumber}</dd>
            <dt className="text-stone-500">Date</dt>
            <dd>{date}</dd>
            <dt className="text-stone-500">Payment</dt>
            <dd>
              {PAYMENT_LABEL[data.paymentMethod] || data.paymentMethod}
              {data.paymentStatus === 'PAID' ? ' (paid)' : data.paymentMethod === 'COD' ? ' (pay on delivery)' : ''}
            </dd>
          </dl>
        </header>

        <section className="grid gap-6 sm:grid-cols-2 py-6 border-b border-stone-200 text-sm">
          <div>
            <h2 className="text-xs font-semibold text-stone-500 mb-2">Sold by</h2>
            <div className="space-y-3">
              {data.sellers.map((s) => (
                <div key={s.name}>
                  <p className="font-semibold">{s.name}</p>
                  {s.address && <p className="text-stone-600">{s.address}</p>}
                  <p className="text-stone-600">GSTIN: {s.gstin || 'not provided by the seller'}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-xs font-semibold text-stone-500 mb-2">Billed and shipped to</h2>
            {data.buyer ? (
              <>
                <p className="font-semibold">{data.buyer.name}</p>
                <p className="text-stone-600">{data.buyer.address}</p>
                <p className="text-stone-600">{data.buyer.cityStatePin}</p>
                <p className="text-stone-600">Phone {data.buyer.phone}</p>
              </>
            ) : (
              <p className="text-stone-600">No address on this order.</p>
            )}
          </div>
        </section>

        <section className="py-6 border-b border-stone-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-stone-500">
                <th className="pb-2 font-semibold">Item</th>
                <th className="pb-2 font-semibold text-right w-12">Qty</th>
                <th className="pb-2 font-semibold text-right w-28">Unit price</th>
                <th className="pb-2 font-semibold text-right w-28">Amount</th>
              </tr>
            </thead>
            <tbody className="align-top">
              {data.items.map((it) => (
                <tr key={it.id} className="border-t border-stone-100">
                  <td className="py-3 pr-4">
                    <p className="font-medium leading-snug">{it.title}</p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {[it.size && `Size ${it.size}`, it.color && `Colour ${it.color}`, multiSeller && it.seller && `Sold by ${it.seller}`]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </td>
                  <td className="py-3 text-right tabular-nums">{it.quantity}</td>
                  <td className="py-3 text-right tabular-nums">{formatINR(it.unitPrice)}</td>
                  <td className="py-3 text-right tabular-nums font-medium">{formatINR(it.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="pt-6 flex justify-end">
          <dl className="w-full sm:w-72 text-sm space-y-1.5">
            <div className="flex justify-between">
              <dt className="text-stone-600">Items</dt>
              <dd className="tabular-nums">{formatINR(data.subtotal)}</dd>
            </div>
            {data.discount > 0 && (
              <div className="flex justify-between">
                <dt className="text-stone-600">Discount</dt>
                <dd className="tabular-nums">−{formatINR(data.discount)}</dd>
              </div>
            )}
            {data.charges.map((c) => (
              <div key={c.label} className="flex justify-between">
                <dt className="text-stone-600">{c.label}</dt>
                <dd className="tabular-nums">{formatINR(c.amount)}</dd>
              </div>
            ))}
            <div className="flex justify-between pt-2 mt-2 border-t border-stone-300 text-base font-bold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatINR(data.total)}</dd>
            </div>
          </dl>
        </section>

        <footer className="mt-8 pt-4 border-t border-stone-200 text-xs text-stone-500 leading-relaxed">
          Item prices include applicable GST. This is an order invoice from Vyntra, not a GST tax invoice: it does not
          list HSN codes or the tax breakup.
        </footer>
      </article>
    </div>
  );
}
