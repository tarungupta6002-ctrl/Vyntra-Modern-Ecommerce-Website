/**
 * Size charts. Which measurements a product's chart has depends on its category (read from the
 * category path, root first). Sellers fill one row per size they sell; the chart is stored with
 * the product's rich content and shown to shoppers on the product page. Nothing here is shown
 * to shoppers unless the seller entered it, except the general shoe size conversion, which is
 * labelled as general.
 */

export type SizeChartKind =
  | 'topwear'
  | 'bottomwear'
  | 'dress'
  | 'apparel'
  | 'bra'
  | 'innerwear'
  | 'kids'
  | 'baby'
  | 'footwear'
  | 'free-size'
  | 'none';

export interface SizeChart {
  kind: SizeChartKind;
  columns: string[];
  rows: Array<{ size: string; values: string[] }>;
}

/** The measurements asked for each kind of chart (unit in the label). */
export const SIZE_CHART_COLUMNS: Record<SizeChartKind, string[]> = {
  topwear: ['Chest (in)', 'Shoulder (in)', 'Length (in)', 'Sleeve (in)'],
  bottomwear: ['Waist (in)', 'Hip (in)', 'Inseam (in)', 'Length (in)'],
  dress: ['Bust (in)', 'Waist (in)', 'Hip (in)', 'Length (in)'],
  apparel: ['Chest / Bust (in)', 'Waist (in)', 'Length (in)'],
  bra: ['Under-bust (in)', 'Bust (in)'],
  innerwear: ['Waist (in)', 'Hip (in)'],
  kids: ['Age', 'Height (cm)', 'Chest (in)', 'Waist (in)'],
  baby: ['Age', 'Height (cm)', 'Weight (kg)'],
  footwear: ['UK / India', 'EU', 'US', 'Foot length (cm)'],
  'free-size': [],
  none: [],
};

/** What the chart is called for sellers and shoppers. */
export const SIZE_CHART_LABEL: Record<SizeChartKind, string> = {
  topwear: 'Garment measurements',
  bottomwear: 'Garment measurements',
  dress: 'Garment measurements',
  apparel: 'Garment measurements',
  bra: 'Bra size chart',
  innerwear: 'Body measurements',
  kids: 'Kids size chart',
  baby: 'Baby size chart',
  footwear: 'Shoe size chart',
  'free-size': '',
  none: '',
};

const TOPWEAR = new Set([
  'mens-shirts', 'mens-tshirts-polos', 'mens-jackets', 'mens-kurtas-sherwanis', 'mens-vests-undershirts',
  'womens-tops-tees', 'womens-jackets',
]);
const BOTTOMWEAR = new Set([
  'mens-jeans', 'mens-trousers', 'mens-dhoti-sets', 'mens-boxers-shorts',
  'womens-jeans-jeggings', 'womens-trousers', 'womens-skirts-shorts',
]);
const DRESS = new Set(['womens-dresses', 'womens-kurtas', 'womens-salwarsuits', 'womens-lehengas']);
const INNERWEAR = new Set(['panties-briefs', 'saree-shapewear-slips', 'mens-briefs-trunks', 'boys-innerwear']);
const FREE_SIZE = new Set(['womens-sarees']);
const SHOE_BRANCHES = new Set(['mens-shoes', 'womens-shoes', 'kids-shoes']);
const CLOTHING_BRANCHES = new Set(['mens-clothing', 'womens-clothing']);

/** The kind of size chart for a category, from its path (root first). */
export function sizeChartKindFor(path: string[]): SizeChartKind {
  if (path[0] !== 'fashion') return 'none';
  const has = (set: Set<string>) => path.some((s) => set.has(s));
  if (has(SHOE_BRANCHES)) return 'footwear';
  if (path.includes('baby-clothing')) return 'baby';
  if (path.includes('boys-clothing') || path.includes('girls-clothing')) return 'kids';
  if (has(FREE_SIZE)) return 'free-size';
  if (path.includes('bras-bralettes')) return 'bra';
  if (has(INNERWEAR)) return 'innerwear';
  if (has(TOPWEAR)) return 'topwear';
  if (has(BOTTOMWEAR)) return 'bottomwear';
  if (has(DRESS)) return 'dress';
  if (has(CLOTHING_BRANCHES)) return 'apparel';
  return 'none';
}

export type FootwearFit = 'men' | 'women' | 'kids';

export function footwearFitFor(path: string[]): FootwearFit {
  if (path.includes('womens-shoes')) return 'women';
  if (path.includes('kids-shoes')) return 'kids';
  return 'men';
}

/**
 * General UK -> EU / US / foot length conversion (common Indian brand charts). Used to prefill a
 * seller's shoe chart, and on the product page only when the seller gave no chart, labelled as general.
 */
export const SHOE_CONVERSION: Record<'men' | 'women', Array<{ uk: string; eu: string; us: string; cm: string }>> = {
  men: [
    { uk: '6', eu: '40', us: '7', cm: '24.5' },
    { uk: '7', eu: '41', us: '8', cm: '25.4' },
    { uk: '8', eu: '42', us: '9', cm: '26.2' },
    { uk: '9', eu: '43', us: '10', cm: '27.1' },
    { uk: '10', eu: '44', us: '11', cm: '27.9' },
    { uk: '11', eu: '45', us: '12', cm: '28.8' },
    { uk: '12', eu: '46', us: '13', cm: '29.6' },
  ],
  women: [
    { uk: '3', eu: '36', us: '5', cm: '22.0' },
    { uk: '4', eu: '37', us: '6', cm: '22.9' },
    { uk: '5', eu: '38', us: '7', cm: '23.7' },
    { uk: '6', eu: '39', us: '8', cm: '24.6' },
    { uk: '7', eu: '40', us: '9', cm: '25.4' },
    { uk: '8', eu: '41', us: '10', cm: '26.2' },
  ],
};

/** The UK number in a shoe size label ("8 UK", "UK 8", "8"), if any. */
export function ukNumberOf(size: string): string | null {
  const m = size.match(/(\d+(?:\.5)?)/);
  return m ? m[1] : null;
}

/** Prefilled values for one shoe size, from the general conversion (empty when unknown). */
export function prefillShoeRow(size: string, fit: FootwearFit): string[] {
  const uk = ukNumberOf(size);
  const row = fit === 'kids' || !uk ? undefined : SHOE_CONVERSION[fit].find((r) => r.uk === uk);
  return row ? [row.uk, row.eu, row.us, row.cm] : [uk ?? '', '', '', ''];
}

const MAX_ROWS = 40;
const MAX_VALUE = 24;

/**
 * Cleans a size chart sent by a seller: known kind, its own columns, short text values,
 * rows with at least one value. Returns null when there is nothing to keep.
 */
export function sanitizeSizeChart(input: unknown): SizeChart | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  const kind = raw.kind as SizeChartKind;
  const columns = SIZE_CHART_COLUMNS[kind];
  if (!columns || columns.length === 0 || !Array.isArray(raw.rows)) return null;
  const seen = new Set<string>();
  const rows: SizeChart['rows'] = [];
  for (const r of raw.rows.slice(0, MAX_ROWS)) {
    if (!r || typeof r !== 'object') continue;
    const size = String((r as any).size ?? '').trim().slice(0, MAX_VALUE);
    if (!size || seen.has(size.toLowerCase())) continue;
    const vals = Array.isArray((r as any).values) ? (r as any).values : [];
    const values = columns.map((_, i) => String(vals[i] ?? '').trim().slice(0, MAX_VALUE));
    if (values.every((v) => v === '')) continue;
    seen.add(size.toLowerCase());
    rows.push({ size, values });
  }
  return rows.length > 0 ? { kind, columns, rows } : null;
}
