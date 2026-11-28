'use client';

import React from 'react';
import { validatePayoutDetails, type PayoutMethod } from '@/lib/returns/payout-details';

export interface PayoutFormValue {
  method: PayoutMethod;
  upiId: string;
  accountHolderName: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifsc: string;
}

export const EMPTY_PAYOUT: PayoutFormValue = {
  method: 'UPI',
  upiId: '',
  accountHolderName: '',
  accountNumber: '',
  confirmAccountNumber: '',
  ifsc: '',
};

/** Checks the form; returns the body to send, or a message for the customer. */
export function checkPayoutForm(v: PayoutFormValue): { body: Record<string, string> } | { error: string } {
  if (v.method === 'BANK_ACCOUNT' && v.accountNumber.replace(/\s+/g, '') !== v.confirmAccountNumber.replace(/\s+/g, '')) {
    return { error: 'The two account numbers do not match.' };
  }
  const body: Record<string, string> =
    v.method === 'UPI'
      ? { method: 'UPI', upiId: v.upiId }
      : { method: 'BANK_ACCOUNT', accountHolderName: v.accountHolderName, accountNumber: v.accountNumber, ifsc: v.ifsc };
  const check = validatePayoutDetails(body);
  return 'error' in check ? { error: check.error } : { body };
}

const input =
  'w-full rounded-lg border border-[#D5D9D9] bg-white px-3 py-2 text-sm text-[#0F1111] focus:border-[#007185] focus:outline-none focus:ring-1 focus:ring-[#007185]';

/**
 * Where a Cash on Delivery refund should go: a UPI ID or a bank account.
 * Used when requesting a return and when changing the details later.
 */
export function PayoutDetailsFields({
  value,
  onChange,
  idPrefix = 'payout',
}: {
  value: PayoutFormValue;
  onChange: (next: PayoutFormValue) => void;
  idPrefix?: string;
}) {
  const set = (patch: Partial<PayoutFormValue>) => onChange({ ...value, ...patch });
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-[#0F1111]">Where should we send your refund?</legend>
      <p className="text-xs text-[#565959]">
        You paid cash on delivery, so we send the refund to your UPI ID or bank account. Only Vyntra&apos;s refunds team sees these
        details, and we delete them once the refund is sent.
      </p>

      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Refund to">
        {(
          [
            ['UPI', 'UPI ID'],
            ['BANK_ACCOUNT', 'Bank account'],
          ] as [PayoutMethod, string][]
        ).map(([m, label]) => (
          <label
            key={m}
            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
              value.method === m ? 'border-[#007185] bg-[#007185]/5 font-semibold text-[#0F1111]' : 'border-[#D5D9D9] text-[#0F1111]'
            }`}
          >
            <input
              type="radio"
              name={id('method')}
              checked={value.method === m}
              onChange={() => set({ method: m })}
              className="h-4 w-4 accent-[#007185]"
            />
            {label}
          </label>
        ))}
      </div>

      {value.method === 'UPI' ? (
        <div>
          <label htmlFor={id('upi')} className="mb-1 block text-xs font-semibold text-[#0F1111]">UPI ID</label>
          <input
            id={id('upi')}
            type="text"
            inputMode="email"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={value.upiId}
            onChange={(e) => set({ upiId: e.target.value })}
            placeholder="name@okhdfcbank"
            className={input}
          />
          <p className="mt-1 text-xs text-[#565959]">Find it in your UPI app (Google Pay, PhonePe, Paytm…) under your profile.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor={id('name')} className="mb-1 block text-xs font-semibold text-[#0F1111]">Account holder name</label>
            <input
              id={id('name')}
              type="text"
              autoComplete="name"
              value={value.accountHolderName}
              onChange={(e) => set({ accountHolderName: e.target.value })}
              className={input}
            />
          </div>
          <div>
            <label htmlFor={id('acc')} className="mb-1 block text-xs font-semibold text-[#0F1111]">Account number</label>
            <input
              id={id('acc')}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={value.accountNumber}
              onChange={(e) => set({ accountNumber: e.target.value.replace(/[^\d\s]/g, '') })}
              className={`${input} tabular-nums`}
            />
          </div>
          <div>
            <label htmlFor={id('acc2')} className="mb-1 block text-xs font-semibold text-[#0F1111]">Account number again</label>
            <input
              id={id('acc2')}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              onPaste={(e) => e.preventDefault()}
              value={value.confirmAccountNumber}
              onChange={(e) => set({ confirmAccountNumber: e.target.value.replace(/[^\d\s]/g, '') })}
              className={`${input} tabular-nums`}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={id('ifsc')} className="mb-1 block text-xs font-semibold text-[#0F1111]">IFSC code</label>
            <input
              id={id('ifsc')}
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              maxLength={11}
              value={value.ifsc}
              onChange={(e) => set({ ifsc: e.target.value.toUpperCase() })}
              placeholder="HDFC0001234"
              className={`${input} uppercase`}
            />
            <p className="mt-1 text-xs text-[#565959]">11 characters, printed on your cheque book or passbook.</p>
          </div>
        </div>
      )}
    </fieldset>
  );
}
