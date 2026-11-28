'use client';

import { Ruler } from 'lucide-react';
import {
  SIZE_CHART_COLUMNS,
  SIZE_CHART_LABEL,
  prefillShoeRow,
  type FootwearFit,
  type SizeChartKind,
} from '@/lib/catalog/size-chart';

interface Props {
  kind: SizeChartKind;
  fit: FootwearFit;
  /** The sizes the seller sells (from the variants), in order. */
  sizes: string[];
  /** size -> one value per column */
  values: Record<string, string[]>;
  onChange: (next: Record<string, string[]>) => void;
}

const HINT: Partial<Record<SizeChartKind, string>> = {
  topwear: 'Measure the garment laid flat: chest is armpit to armpit, doubled.',
  bottomwear: 'Measure the garment laid flat: waist across the top, doubled; inseam from crotch to hem.',
  dress: 'Measure the garment laid flat and double the bust, waist and hip widths.',
  apparel: 'Measure the garment laid flat and double the chest and waist widths.',
  bra: 'Under-bust is the band size in inches; bust is measured over the fullest part.',
  innerwear: 'Body measurements each size fits.',
  kids: 'Write the age range each size fits (for example 4–5 years).',
  baby: 'Write the age range each size fits (for example 0–3 months).',
  footwear: 'UK / India size, its EU and US equivalents, and the foot length it fits.',
};

/**
 * The seller's size chart: one row per size they sell, with the measurements that suit the
 * category. Shown to shoppers on the product page exactly as entered.
 */
export function SizeChartEditor({ kind, fit, sizes, values, onChange }: Props) {
  const columns = SIZE_CHART_COLUMNS[kind];

  if (kind === 'free-size') {
    return (
      <div id="size-chart" className="rounded-xl border border-[#D5D9D9] bg-[#F7F8F8] p-4 text-sm text-[#565959]">
        <p className="font-semibold text-[#0F1111]">No size chart needed</p>
        <p className="mt-1">
          This category is free size. Put the length and blouse piece details in Specifications so shoppers know what they get.
        </p>
      </div>
    );
  }
  if (columns.length === 0) return null;

  const setValue = (size: string, col: number, value: string) => {
    const row = [...(values[size] || columns.map(() => ''))];
    row[col] = value;
    onChange({ ...values, [size]: row });
  };

  const canPrefill = kind === 'footwear' && fit !== 'kids' && sizes.length > 0;
  const prefill = () => {
    const next = { ...values };
    sizes.forEach((size) => {
      const current = next[size] || columns.map(() => '');
      const suggested = prefillShoeRow(size, fit);
      // Fill only empty cells, so nothing the seller typed is overwritten.
      next[size] = current.map((v, i) => v || suggested[i] || '');
    });
    onChange(next);
  };

  const filledRows = sizes.filter((s) => (values[s] || []).some((v) => v.trim())).length;

  return (
    <div id="size-chart" className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[#0F1111]">
            <Ruler className="h-4 w-4 text-[#007185]" aria-hidden="true" />
            {SIZE_CHART_LABEL[kind]}
            <span className="font-normal text-[#565959]">(optional, recommended)</span>
          </h3>
          <p className="mt-1 text-sm text-[#565959]">
            {HINT[kind]} Shoppers see this chart on the product page; sizes left blank are not shown.
          </p>
        </div>
        {canPrefill && (
          <button
            type="button"
            onClick={prefill}
            className="rounded-lg border border-[#D5D9D9] bg-white px-3 py-1.5 text-sm font-medium text-[#0F1111] hover:bg-[#F7F8F8]"
          >
            Fill standard conversions
          </button>
        )}
      </div>

      {sizes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#D5D9D9] p-4 text-sm text-[#565959]">
          Add the sizes you sell under Variants. Each size gets a row here.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-[#D5D9D9] bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#D5D9D9] bg-[#F7F8F8] text-[#565959]">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">Size</th>
                  {columns.map((c) => (
                    <th key={c} scope="col" className="px-3 py-2 font-semibold whitespace-nowrap">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAEDED]">
                {sizes.map((size) => (
                  <tr key={size}>
                    <th scope="row" className="px-3 py-2 font-semibold text-[#0F1111] whitespace-nowrap">{size}</th>
                    {columns.map((c, i) => (
                      <td key={c} className="px-3 py-1.5">
                        <input
                          type="text"
                          inputMode={c === 'Age' ? 'text' : 'decimal'}
                          maxLength={24}
                          value={values[size]?.[i] ?? ''}
                          onChange={(e) => setValue(size, i, e.target.value)}
                          aria-label={`${c} for size ${size}`}
                          className="w-24 rounded-md border border-[#D5D9D9] px-2 py-1 text-sm tabular-nums focus:border-[#007185] focus:outline-none focus:ring-1 focus:ring-[#007185]"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-[#565959]">
            {filledRows === 0
              ? 'No measurements yet. Without them, shoppers see no chart for this product.'
              : `${filledRows} of ${sizes.length} sizes have measurements.`}
            {canPrefill && ' Standard conversions are typical values; check them against your brand.'}
          </p>
        </>
      )}
    </div>
  );
}
