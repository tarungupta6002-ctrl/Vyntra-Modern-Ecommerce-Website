import React from 'react';
import Link from 'next/link';

/** Title row used at the top of every Seller Central and Admin page. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-[#0F1111]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-[#565959]">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

type Tone = 'neutral' | 'good' | 'warn' | 'info';

const TONE: Record<Tone, string> = {
  neutral: 'text-[#0F1111]',
  good: 'text-[#067D62]',
  warn: 'text-[#B7791F]',
  info: 'text-[#007185]',
};

/** A row of headline numbers. */
export function StatRow({
  items,
}: {
  items: { label: string; value: React.ReactNode; tone?: Tone; hint?: string; href?: string }[];
}) {
  return (
    <dl
      className={`grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#D5D9D9] bg-[#E3E6E6] [&>div:last-child:nth-child(odd)]:col-span-2 lg:[&>div:last-child:nth-child(odd)]:col-span-1 ${
        items.length === 3 ? 'lg:grid-cols-3' : items.length === 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'
      }`}
    >
      {items.map((s) => {
        const body = (
          <>
            <dt className="text-xs font-medium text-[#565959]">{s.label}</dt>
            <dd className={`mt-1 text-2xl font-bold tabular-nums ${TONE[s.tone || 'neutral']}`}>{s.value}</dd>
            {s.hint && <p className="mt-0.5 text-xs text-[#6F7373]">{s.hint}</p>}
          </>
        );
        return s.href ? (
          <Link key={s.label} href={s.href} className="block bg-white px-5 py-4 transition-colors hover:bg-[#F7FAFA] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#007185]">
            {body}
          </Link>
        ) : (
          <div key={s.label} className="bg-white px-5 py-4">
            {body}
          </div>
        );
      })}
    </dl>
  );
}

/** Button styles shared by page header actions. */
export const consoleButton = {
  primary:
    'inline-flex items-center justify-center gap-1.5 rounded-full border border-[#FCD200] bg-[#FFD814] px-4 py-2 text-sm font-semibold text-[#0F1111] shadow-sm transition-colors hover:bg-[#F7CA00] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007185] disabled:opacity-60',
  secondary:
    'inline-flex items-center justify-center gap-1.5 rounded-full border border-[#D5D9D9] bg-white px-4 py-2 text-sm font-semibold text-[#0F1111] shadow-sm transition-colors hover:bg-[#F7F8F8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007185] disabled:opacity-60',
};
