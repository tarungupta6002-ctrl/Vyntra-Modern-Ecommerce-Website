'use client';

import React from 'react';
import { SlidersHorizontal, Info } from 'lucide-react';
import type { AttributeTemplate } from '@/lib/catalog/attributes';

interface ProductAttributesSectionProps {
  template: AttributeTemplate | null;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  /** Highlight empty required fields (set after a failed submit). */
  showErrors: boolean;
}

/**
 * Category-specific product details (Amazon-style product type template).
 * These structured values power the filters customers use on listing pages.
 */
export function ProductAttributesSection({ template, values, onChange, showErrors }: ProductAttributesSectionProps) {
  if (!template) return null;

  return (
    <section
      id="product-attributes"
      className="bg-white rounded-2xl border border-[#D5D9D9] p-6 shadow-sm space-y-5 scroll-mt-24"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#D5D9D9]">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-[#007185]" />
          <div>
            <h2 className="font-headline font-bold text-base text-[#0F1111]">{template.name} details</h2>
            <p className="text-xs text-[#565959]">
              Customers filter by these on the category page. Fields marked * are needed to publish.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {template.attributes.map((def) => {
          const id = `attr-${def.key}`;
          const value = values[def.key] ?? '';
          const missing = showErrors && def.required && !String(value).trim();
          const border = missing ? 'border-[#B12704] ring-1 ring-[#B12704]' : 'border-[#D5D9D9] focus:border-[#007185]';
          return (
            <div key={def.key} className="space-y-1">
              <label htmlFor={id} className="block text-xs font-bold text-[#0F1111]">
                {def.label}
                {def.type === 'number' && <span className="font-normal text-[#565959]"> ({def.unit})</span>}
                {def.required && <span className="text-[#B12704]"> *</span>}
              </label>
              {def.type === 'enum' ? (
                <select
                  id={id}
                  value={value}
                  onChange={(e) => onChange(def.key, e.target.value)}
                  aria-invalid={missing || undefined}
                  className={`w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none ${border}`}
                >
                  <option value="">Select…</option>
                  {def.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="relative">
                  <input
                    id={id}
                    type="number"
                    inputMode="decimal"
                    min={def.min}
                    max={def.max}
                    step={def.step}
                    value={value}
                    onChange={(e) => onChange(def.key, e.target.value)}
                    placeholder={`${def.min} – ${def.max}`}
                    aria-invalid={missing || undefined}
                    className={`w-full pl-3 pr-14 py-2 text-sm border rounded-lg bg-white focus:outline-none ${border}`}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#565959]">
                    {def.unit}
                  </span>
                </div>
              )}
              {missing ? (
                <p className="text-[11px] text-[#B12704]">Required to publish</p>
              ) : def.hint ? (
                <p className="text-[11px] text-[#565959]">{def.hint}</p>
              ) : null}
            </div>
          );
        })}
      </div>

      <p className="flex items-start gap-1.5 text-[11px] text-[#565959]">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        If your variants differ (e.g. 1 Ton and 1.5 Ton), enter the values of the main variant.
      </p>
    </section>
  );
}
