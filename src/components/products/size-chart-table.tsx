import { Info, Ruler } from 'lucide-react';
import {
  SHOE_CONVERSION,
  SIZE_CHART_COLUMNS,
  SIZE_CHART_LABEL,
  ukNumberOf,
  type FootwearFit,
  type SizeChart,
  type SizeChartKind,
} from '@/lib/catalog/size-chart';

interface Props {
  chart?: SizeChart | null;
  kind?: SizeChartKind;
  fit?: FootwearFit;
  /** Sizes this listing is sold in; `disabled` = out of stock. */
  offered: Array<{ size: string; disabled?: boolean }>;
  selectedSize?: string;
}

/** Shoe sizes given as UK numbers ("7 UK", "UK 7", "7"), which the general conversion covers. */
const hasUkSizes = (offered: Props['offered']) => offered.some((o) => /^\s*(uk\s*)?\d+(\.5)?\s*(uk)?\s*$/i.test(o.size));

/** Whether a product page has a size guide to show (the seller's chart, or general shoe sizes). */
export function hasSizeGuide({ chart, kind, fit, offered }: Pick<Props, 'chart' | 'kind' | 'fit' | 'offered'>) {
  if (chart) return true;
  return kind === 'footwear' && (fit === 'men' || fit === 'women') && hasUkSizes(offered);
}

const sameSize = (a: string, b: string) => {
  if (a.trim().toLowerCase() === b.trim().toLowerCase()) return true;
  const ua = ukNumberOf(a);
  return ua !== null && /uk|^\d/i.test(a) && /uk|^\d/i.test(b) && ua === ukNumberOf(b);
};

/** The size chart on the product page: the seller's own, or a clearly labelled general shoe chart. */
export function SizeChartTable({ chart, kind, fit, offered, selectedSize }: Props) {
  const general = !chart && kind === 'footwear' && (fit === 'men' || fit === 'women') && hasUkSizes(offered);
  if (!chart && !general) return null;

  const columns = chart ? chart.columns : SIZE_CHART_COLUMNS.footwear;
  const rows = chart
    ? chart.rows
    : SHOE_CONVERSION[fit as 'men' | 'women'].map((r) => ({ size: `${r.uk} UK`, values: [r.uk, r.eu, r.us, r.cm] }));
  const title = chart
    ? SIZE_CHART_LABEL[chart.kind]
    : `General shoe size conversion (${fit === 'women' ? "women's" : "men's"})`;

  const availability = (size: string) => {
    const match = offered.find((o) => sameSize(o.size, size));
    if (!match) return { text: 'Not sold', tone: 'text-[#565959]' };
    return match.disabled ? { text: 'Out of stock', tone: 'text-[#B12704]' } : { text: 'In stock', tone: 'text-[#067D62]' };
  };

  return (
    <div id="size-chart" className="space-y-3 pt-4 border-t border-[#D5D9D9]">
      <h2 className="flex items-center gap-2 text-xl font-bold text-[#0F1111]">
        <Ruler className="h-5 w-5 text-[#007185]" aria-hidden="true" />
        {title}
      </h2>
      <p className="text-sm text-[#565959]">
        {chart
          ? 'Measurements from the seller.'
          : "The seller hasn't added a chart for this brand. Sizes can differ by about half a size between brands."}
      </p>
      <div className="max-w-3xl overflow-x-auto rounded-xl border border-[#D5D9D9] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#D5D9D9] bg-[#F7F8F8] text-[#565959]">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-semibold">Size</th>
              {columns.map((c) => (
                <th key={c} scope="col" className="px-4 py-2.5 font-semibold whitespace-nowrap">{c}</th>
              ))}
              <th scope="col" className="px-4 py-2.5 font-semibold">Availability</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EAEDED]">
            {rows.map((row) => {
              const isSelected = Boolean(selectedSize && sameSize(selectedSize, row.size));
              const a = availability(row.size);
              return (
                <tr key={row.size} className={isSelected ? 'bg-[#007185]/[0.07]' : undefined} aria-current={isSelected || undefined}>
                  <th scope="row" className="px-4 py-2.5 font-semibold text-[#0F1111] whitespace-nowrap">{row.size}</th>
                  {columns.map((c, i) => (
                    <td key={c} className="px-4 py-2.5 tabular-nums text-[#0F1111]">{row.values[i] || '–'}</td>
                  ))}
                  <td className={`px-4 py-2.5 font-medium ${a.tone}`}>{a.text}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {(chart?.kind === 'footwear' || general) && (
        <p className="flex max-w-3xl items-start gap-2 text-xs text-[#565959]">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#007185]" aria-hidden="true" />
          To measure your foot, stand on a sheet of paper, mark your heel and longest toe, and measure the distance in centimetres.
        </p>
      )}
    </div>
  );
}
