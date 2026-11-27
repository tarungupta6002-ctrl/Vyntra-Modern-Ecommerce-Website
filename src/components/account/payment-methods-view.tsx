'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Smartphone, CreditCard, Landmark, Banknote, RotateCcw } from 'lucide-react';
import { DEFAULT_RETURN_WINDOW_DAYS } from '@/lib/policy-constants';

const METHODS = [
  { icon: Smartphone, name: 'UPI', detail: 'Google Pay, PhonePe, Paytm or any UPI app' },
  { icon: CreditCard, name: 'Credit and debit cards', detail: 'Visa, Mastercard, RuPay and more' },
  { icon: Landmark, name: 'Net banking', detail: 'All major Indian banks' },
  { icon: Banknote, name: 'Cash on Delivery', detail: 'Pay when the order arrives (₹49 COD fee)' },
];

/**
 * How payments work on Vyntra. Vyntra keeps no wallet and stores no cards or UPI IDs: online
 * payments go through Razorpay at checkout, and refunds go back to the original payment method.
 */
export function PaymentMethodsView(_props: { embeddedInAccount?: boolean }) {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-white border border-[#D5D9D9] p-6">
        <h2 className="text-lg font-bold text-[#0F1111]">Payments</h2>
        <p className="mt-1 text-sm text-[#565959] max-w-2xl">
          Online payments are handled by Razorpay at checkout. Vyntra doesn&apos;t keep a wallet and doesn&apos;t
          store your card numbers, CVV or UPI IDs, so there is nothing saved here to manage.
        </p>

        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {METHODS.map(({ icon: Icon, name, detail }) => (
            <li key={name} className="flex items-start gap-3 rounded-xl border border-[#EAEDED] p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#007185]/10 text-[#007185]">
                <Icon className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-[#0F1111]">{name}</span>
                <span className="block text-xs text-[#565959] mt-0.5">{detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-white border border-[#D5D9D9] p-5 flex gap-3">
          <ShieldCheck className="h-5 w-5 text-[#067D62] shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-[#0F1111]">Card details stay with Razorpay</h3>
            <p className="text-xs text-[#565959] mt-1">
              You enter card or UPI details in Razorpay&apos;s secure window. Razorpay may offer to remember your card
              for faster checkout; that is managed by Razorpay, not Vyntra.
            </p>
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-[#D5D9D9] p-5 flex gap-3">
          <RotateCcw className="h-5 w-5 text-[#007185] shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-[#0F1111]">Refunds</h3>
            <p className="text-xs text-[#565959] mt-1">
              Refunds for cancelled orders and eligible returns (within {DEFAULT_RETURN_WINDOW_DAYS} days of delivery) go
              back to the original payment method, usually in 5–7 business days.{' '}
              <Link href="/account?tab=orders" className="text-[#007185] hover:underline">
                See your orders
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
