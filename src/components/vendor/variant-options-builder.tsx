'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import type { AttributeDef, ProductAttributes } from '@/lib/catalog/attributes';

export interface GeneratedVariant {
  attributes: ProductAttributes;
}

interface VariantOptionsBuilderProps {
  /** Attributes that may differ per variant (the template's variation theme). */
  defs: AttributeDef[];
  /** Called with every combination of the chosen values, plus the optional colour. */
  onGenerate: (combos: GeneratedVariant[], color: string) => void;
}

/**
 * Amazon-style variation builder for categories with attribute templates: the seller picks the
 * values each variation attribute comes in (e.g. Capacity 1, 1.5 Ton × Energy 3, 5 Star) and one
 * variant is generated per combination, carrying its own structured attributes.
 */
export function VariantOptionsBuilder({ defs, onGenerate }: VariantOptionsBuilderProps) {
  const [numberText, setNumberText] = useState<Record<string, string>>({});
  const [enumPicks, setEnumPicks] = useState<Record<string, string[]>>({});
  const [color, setColor] = useState('');
  const [error, setError] = useState('');

  const valuesFor = (def: AttributeDef): Array<string | number> => {
    if (def.type === 'enum') return enumPicks[def.key] || [];
    return (numberText[def.key] || '')
      .split(/[,\s]+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map(Number);
  };

  const invalidNumbers = defs.filter(
    (d) => d.type === 'number' && valuesFor(d).some((n) => !Number.isFinite(n as number) || (n as number) < d.min || (n as number) > d.max)
  );
  const chosen = defs.filter((d) => valuesFor(d).length > 0);
  const comboCount = chosen.reduce((acc, d) => acc * new Set(valuesFor(d)).size, chosen.length > 0 ? 1 : 0);

  const generate = () => {
    setError('');
    if (invalidNumbers.length > 0) {
      const d = invalidNumbers[0] as Extract<AttributeDef, { type: 'number' }>;
      setError(`${d.label} values must be numbers between ${d.min} and ${d.max} ${d.unit}.`);
      return;
    }
    if (chosen.length === 0) {
      setError(`Enter at least one ${defs.map((d) => d.label.toLowerCase()).join(' or ')} value.`);
      return;
    }
    let combos: ProductAttributes[] = [{}];
    for (const d of chosen) {
      const vals = Array.from(new Set(valuesFor(d)));
      combos = combos.flatMap((c) => vals.map((v) => ({ ...c, [d.key]: v })));
    }
    onGenerate(combos.map((attributes) => ({ attributes })), color.trim());
    setNumberText({});
    setEnumPicks({});
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-[#565959]">
        Choose the values your variants come in. One variant is created for each combination, and each variant is
        filterable by its own values.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {defs.map((def) =>
          def.type === 'number' ? (
            <div key={def.key} className="space-y-1.5">
              <label htmlFor={`vopt-${def.key}`} className="block text-xs font-bold text-[#0F1111]">
                {def.label} ({def.unit})
              </label>
              <input
                id={`vopt-${def.key}`}
                type="text"
                inputMode="decimal"
                value={numberText[def.key] || ''}
                onChange={(e) => setNumberText((prev) => ({ ...prev, [def.key]: e.target.value }))}
                placeholder={`Values in ${def.unit}, e.g. ${def.min} – ${def.max}`}
                className="w-full px-3 py-2 text-xs border border-[#D5D9D9] rounded-lg bg-white focus:outline-none focus:border-[#007185]"
              />
              <p className="text-xs text-[#565959]">Separate several values with commas.</p>
            </div>
          ) : (
            <fieldset key={def.key} className="space-y-1.5">
              <legend className="block text-xs font-bold text-[#0F1111] mb-1.5">{def.label}</legend>
              <div className="flex flex-wrap gap-1.5">
                {def.options.map((o) => {
                  const on = (enumPicks[def.key] || []).includes(o);
                  return (
                    <button
                      key={o}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setEnumPicks((prev) => {
                          const cur = prev[def.key] || [];
                          return { ...prev, [def.key]: on ? cur.filter((x) => x !== o) : [...cur, o] };
                        })
                      }
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                        on
                          ? 'bg-[#007185] text-white border-[#007185]'
                          : 'bg-white text-[#0F1111] border-[#D5D9D9] hover:border-[#007185]'
                      }`}
                    >
                      {o}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )
        )}

        <div className="space-y-1.5">
          <label htmlFor="vopt-color" className="block text-xs font-bold text-[#0F1111]">
            Colour <span className="font-normal text-[#565959]">(optional)</span>
          </label>
          <input
            id="vopt-color"
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="Only if this batch has a specific colour, e.g. White"
            className="w-full px-3 py-2 text-xs border border-[#D5D9D9] rounded-lg bg-white focus:outline-none focus:border-[#007185]"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-xs font-semibold text-[#B12704]">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={generate}
          className="py-2.5 px-4 rounded-xl bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] text-xs font-extrabold shadow-sm border border-[#FCD200] inline-flex items-center gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          {comboCount > 0 ? `Add ${comboCount} variant${comboCount === 1 ? '' : 's'}` : 'Add variants'}
        </button>
        <span className="text-xs text-[#565959]">Price and stock can be set per variant below.</span>
      </div>
    </div>
  );
}
