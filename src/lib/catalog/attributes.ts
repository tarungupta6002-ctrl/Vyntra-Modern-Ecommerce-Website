/**
 * Category attribute templates (Amazon-style "product type" templates).
 *
 * Each template lists the structured fields a seller fills in for a category. The values are
 * stored in Product.attributes and drive category-specific filters (e.g. AC tonnage, washing
 * machine capacity). Templates are matched by category slug: the most specific category in the
 * product's path that has a template wins, so a leaf can override its parent.
 *
 * Pure module: used by the vendor form (client), the product APIs (server) and listing pages.
 */

export interface NumberBucket {
  label: string;
  /** inclusive lower bound */
  min: number;
  /** exclusive upper bound (Infinity for open-ended) */
  max: number;
}

interface BaseAttribute {
  key: string;
  label: string;
  required?: boolean;
  /** Short helper text under the field in the seller form. */
  hint?: string;
}

export interface NumberAttribute extends BaseAttribute {
  type: 'number';
  unit: string;
  min: number;
  max: number;
  step: number;
  /** Ranges shown as filter options on listing pages. */
  buckets: NumberBucket[];
}

export interface EnumAttribute extends BaseAttribute {
  type: 'enum';
  options: string[];
}

export type AttributeDef = NumberAttribute | EnumAttribute;

export interface AttributeTemplate {
  id: string;
  name: string;
  /** Category slugs this template applies to (the category and everything under it). */
  categorySlugs: string[];
  attributes: AttributeDef[];
  /**
   * Attributes that may differ between variants of one listing (Amazon's "variation theme"),
   * e.g. an AC sold as 1 Ton and 1.5 Ton. Each variant stores its own values for these keys.
   */
  variantKeys?: string[];
}

export type ProductAttributes = Record<string, string | number>;

/* ------------------------------------------------------------------ */
/* Shared field definitions                                            */
/* ------------------------------------------------------------------ */

const energyRating = (required = false): EnumAttribute => ({
  key: 'energy_rating',
  label: 'Energy rating (BEE)',
  type: 'enum',
  options: ['5 Star', '4 Star', '3 Star', '2 Star', '1 Star', 'Not rated'],
  required,
});

const powerWatts = (buckets: NumberBucket[], required = false): NumberAttribute => ({
  key: 'power_watts',
  label: 'Power',
  type: 'number',
  unit: 'W',
  min: 1,
  max: 10000,
  step: 1,
  buckets,
  required,
});

const capacityLitres = (buckets: NumberBucket[], max = 2000, required = true): NumberAttribute => ({
  key: 'capacity_litres',
  label: 'Capacity',
  type: 'number',
  unit: 'L',
  min: 0.1,
  max,
  step: 0.1,
  buckets,
  required,
});

const ramGb = (buckets: NumberBucket[], required = true): NumberAttribute => ({
  key: 'ram_gb',
  label: 'RAM',
  type: 'number',
  unit: 'GB',
  min: 1,
  max: 256,
  step: 1,
  buckets,
  required,
});

const storageGb = (buckets: NumberBucket[], required = true): NumberAttribute => ({
  key: 'storage_gb',
  label: 'Storage',
  type: 'number',
  unit: 'GB',
  min: 4,
  max: 16384,
  step: 1,
  hint: 'In GB: 1 TB = 1024',
  buckets,
  required,
});

const screenInch = (buckets: NumberBucket[], required = true): NumberAttribute => ({
  key: 'screen_inch',
  label: 'Screen size',
  type: 'number',
  unit: 'inch',
  min: 1,
  max: 100,
  step: 0.1,
  buckets,
  required,
});

/* ------------------------------------------------------------------ */
/* Templates                                                           */
/* ------------------------------------------------------------------ */

export const ATTRIBUTE_TEMPLATES: AttributeTemplate[] = [
  {
    id: 'air-conditioner',
    variantKeys: ['capacity_ton', 'energy_rating'],
    name: 'Air conditioner',
    categorySlugs: ['air-conditioners', 'split-inverter-acs', 'window-air-conditioners', 'smart-wifi-acs'],
    attributes: [
      {
        key: 'capacity_ton',
        label: 'Capacity',
        type: 'number',
        unit: 'Ton',
        min: 0.5,
        max: 5,
        step: 0.05,
        required: true,
        hint: 'Rated cooling capacity, e.g. 1.5',
        buckets: [
          { label: 'Up to 1 Ton', min: 0, max: 1.05 },
          { label: '1.1 – 1.4 Ton', min: 1.05, max: 1.4 },
          { label: '1.5 Ton', min: 1.4, max: 1.6 },
          { label: '1.6 Ton & above', min: 1.6, max: Infinity },
        ],
      },
      { key: 'ac_type', label: 'Type', type: 'enum', options: ['Split', 'Window', 'Portable', 'Cassette', 'Tower'], required: true },
      { key: 'compressor', label: 'Compressor', type: 'enum', options: ['Inverter', 'Non-inverter'], required: true },
      { key: 'condenser_coil', label: 'Condenser coil', type: 'enum', options: ['Copper', 'Aluminium', 'Alloy'] },
      energyRating(true),
    ],
  },
  {
    id: 'air-cooler',
    variantKeys: ['capacity_litres'],
    name: 'Air cooler',
    categorySlugs: ['air-coolers'],
    attributes: [
      capacityLitres([
        { label: 'Up to 20 L', min: 0, max: 20.01 },
        { label: '21 – 40 L', min: 20.01, max: 40.01 },
        { label: '41 – 60 L', min: 40.01, max: 60.01 },
        { label: 'Above 60 L', min: 60.01, max: Infinity },
      ], 300),
      { key: 'cooler_type', label: 'Type', type: 'enum', options: ['Personal', 'Desert', 'Tower', 'Window'], required: true },
    ],
  },
  {
    id: 'refrigerator',
    variantKeys: ['capacity_litres', 'energy_rating'],
    name: 'Refrigerator',
    categorySlugs: ['refrigerators'],
    attributes: [
      capacityLitres([
        { label: 'Up to 200 L', min: 0, max: 200.01 },
        { label: '201 – 300 L', min: 200.01, max: 300.01 },
        { label: '301 – 450 L', min: 300.01, max: 450.01 },
        { label: 'Above 450 L', min: 450.01, max: Infinity },
      ]),
      {
        key: 'door_type',
        label: 'Door type',
        type: 'enum',
        options: ['Single Door', 'Double Door', 'Triple Door', 'Side by Side', 'French Door', 'Mini / Deep Freezer'],
        required: true,
      },
      { key: 'defrost', label: 'Defrost', type: 'enum', options: ['Direct Cool', 'Frost Free'], required: true },
      { key: 'compressor', label: 'Compressor', type: 'enum', options: ['Inverter', 'Non-inverter'] },
      energyRating(true),
    ],
  },
  {
    id: 'washing-machine',
    variantKeys: ['capacity_kg', 'energy_rating'],
    name: 'Washing machine',
    categorySlugs: ['washing-machines', 'front-load-washing-machines', 'top-load-washing-machines', 'semi-automatic-washing-machines'],
    attributes: [
      {
        key: 'capacity_kg',
        label: 'Capacity',
        type: 'number',
        unit: 'kg',
        min: 1,
        max: 30,
        step: 0.5,
        required: true,
        hint: 'Wash load in kg, e.g. 7',
        buckets: [
          { label: 'Up to 6 kg', min: 0, max: 6.01 },
          { label: '6.5 – 7 kg', min: 6.01, max: 7.01 },
          { label: '7.5 – 8 kg', min: 7.01, max: 8.01 },
          { label: 'Above 8 kg', min: 8.01, max: Infinity },
        ],
      },
      { key: 'load_type', label: 'Load type', type: 'enum', options: ['Front Load', 'Top Load'], required: true },
      { key: 'automation', label: 'Function', type: 'enum', options: ['Fully Automatic', 'Semi Automatic'], required: true },
      {
        key: 'max_rpm',
        label: 'Max spin speed',
        type: 'number',
        unit: 'RPM',
        min: 100,
        max: 2000,
        step: 10,
        buckets: [
          { label: 'Up to 800 RPM', min: 0, max: 800.01 },
          { label: '801 – 1000 RPM', min: 800.01, max: 1000.01 },
          { label: '1001 – 1200 RPM', min: 1000.01, max: 1200.01 },
          { label: 'Above 1200 RPM', min: 1200.01, max: Infinity },
        ],
      },
      energyRating(),
    ],
  },
  {
    id: 'clothes-dryer',
    variantKeys: ['capacity_kg'],
    name: 'Clothes dryer',
    categorySlugs: ['clothes-dryers'],
    attributes: [
      {
        key: 'capacity_kg',
        label: 'Capacity',
        type: 'number',
        unit: 'kg',
        min: 1,
        max: 30,
        step: 0.5,
        required: true,
        buckets: [
          { label: 'Up to 7 kg', min: 0, max: 7.01 },
          { label: '7.5 – 9 kg', min: 7.01, max: 9.01 },
          { label: 'Above 9 kg', min: 9.01, max: Infinity },
        ],
      },
      { key: 'dryer_type', label: 'Dryer type', type: 'enum', options: ['Vented', 'Condenser', 'Heat Pump'], required: true },
    ],
  },
  {
    id: 'microwave',
    variantKeys: ['capacity_litres'],
    name: 'Microwave / OTG',
    categorySlugs: ['microwave-ovens'],
    attributes: [
      { key: 'oven_type', label: 'Type', type: 'enum', options: ['Solo', 'Grill', 'Convection', 'OTG'], required: true },
      capacityLitres([
        { label: 'Up to 20 L', min: 0, max: 20.01 },
        { label: '21 – 25 L', min: 20.01, max: 25.01 },
        { label: '26 – 30 L', min: 25.01, max: 30.01 },
        { label: 'Above 30 L', min: 30.01, max: Infinity },
      ], 100),
    ],
  },
  {
    id: 'chimney',
    variantKeys: ['suction_m3h'],
    name: 'Kitchen chimney / hob',
    categorySlugs: ['kitchen-chimneys'],
    attributes: [
      { key: 'chimney_type', label: 'Type', type: 'enum', options: ['Wall Mounted', 'Island', 'Built-in', 'Hob'], required: true },
      {
        key: 'suction_m3h',
        label: 'Suction power',
        type: 'number',
        unit: 'm³/hr',
        min: 100,
        max: 3000,
        step: 10,
        buckets: [
          { label: 'Up to 1000 m³/hr', min: 0, max: 1000.01 },
          { label: '1001 – 1200 m³/hr', min: 1000.01, max: 1200.01 },
          { label: 'Above 1200 m³/hr', min: 1200.01, max: Infinity },
        ],
      },
      { key: 'auto_clean', label: 'Auto clean', type: 'enum', options: ['Yes', 'No'] },
    ],
  },
  {
    id: 'induction',
    variantKeys: ['power_watts'],
    name: 'Induction cooktop',
    categorySlugs: ['induction-cooktops'],
    attributes: [
      powerWatts([
        { label: 'Up to 1600 W', min: 0, max: 1600.01 },
        { label: '1601 – 2000 W', min: 1600.01, max: 2000.01 },
        { label: 'Above 2000 W', min: 2000.01, max: Infinity },
      ], true),
    ],
  },
  {
    id: 'air-fryer',
    variantKeys: ['capacity_litres'],
    name: 'Air fryer',
    categorySlugs: ['air-fryers'],
    attributes: [
      capacityLitres([
        { label: 'Up to 4 L', min: 0, max: 4.01 },
        { label: '4.1 – 6 L', min: 4.01, max: 6.01 },
        { label: 'Above 6 L', min: 6.01, max: Infinity },
      ], 30),
      powerWatts([
        { label: 'Up to 1500 W', min: 0, max: 1500.01 },
        { label: 'Above 1500 W', min: 1500.01, max: Infinity },
      ]),
    ],
  },
  {
    id: 'dishwasher',
    variantKeys: ['place_settings'],
    name: 'Dishwasher',
    categorySlugs: ['dishwashers'],
    attributes: [
      {
        key: 'place_settings',
        label: 'Place settings',
        type: 'number',
        unit: 'settings',
        min: 1,
        max: 20,
        step: 1,
        required: true,
        buckets: [
          { label: 'Up to 8', min: 0, max: 8.01 },
          { label: '9 – 12', min: 8.01, max: 12.01 },
          { label: '13 & above', min: 12.01, max: Infinity },
        ],
      },
      { key: 'install_type', label: 'Installation', type: 'enum', options: ['Freestanding', 'Built-in', 'Countertop'] },
      energyRating(),
    ],
  },
  {
    id: 'mixer-grinder',
    variantKeys: ['jars'],
    name: 'Mixer grinder',
    categorySlugs: ['mixer-grinders'],
    attributes: [
      powerWatts([
        { label: 'Up to 500 W', min: 0, max: 500.01 },
        { label: '501 – 750 W', min: 500.01, max: 750.01 },
        { label: 'Above 750 W', min: 750.01, max: Infinity },
      ], true),
      {
        key: 'jars',
        label: 'Number of jars',
        type: 'number',
        unit: 'jars',
        min: 1,
        max: 10,
        step: 1,
        buckets: [
          { label: '1 – 2 jars', min: 0, max: 2.01 },
          { label: '3 jars', min: 2.01, max: 3.01 },
          { label: '4 jars & more', min: 3.01, max: Infinity },
        ],
      },
    ],
  },
  {
    id: 'water-purifier',
    variantKeys: ['capacity_litres'],
    name: 'Water purifier',
    categorySlugs: ['water-purifiers'],
    attributes: [
      {
        key: 'purification',
        label: 'Purification',
        type: 'enum',
        options: ['RO', 'RO + UV', 'RO + UV + UF', 'UV', 'UF', 'Gravity'],
        required: true,
      },
      capacityLitres([
        { label: 'Up to 7 L', min: 0, max: 7.01 },
        { label: '7.1 – 10 L', min: 7.01, max: 10.01 },
        { label: 'Above 10 L', min: 10.01, max: Infinity },
      ], 100),
    ],
  },
  {
    id: 'vacuum-cleaner',
    name: 'Vacuum cleaner',
    categorySlugs: ['vacuum-cleaners'],
    attributes: [
      {
        key: 'vacuum_type',
        label: 'Type',
        type: 'enum',
        options: ['Canister', 'Upright', 'Handheld', 'Robot', 'Wet & Dry'],
        required: true,
      },
      powerWatts([
        { label: 'Up to 1000 W', min: 0, max: 1000.01 },
        { label: 'Above 1000 W', min: 1000.01, max: Infinity },
      ]),
    ],
  },
  {
    id: 'geyser',
    variantKeys: ['capacity_litres'],
    name: 'Water geyser',
    categorySlugs: ['water-geysers'],
    attributes: [
      { key: 'geyser_type', label: 'Type', type: 'enum', options: ['Storage', 'Instant', 'Gas'], required: true },
      capacityLitres([
        { label: 'Up to 10 L', min: 0, max: 10.01 },
        { label: '11 – 25 L', min: 10.01, max: 25.01 },
        { label: 'Above 25 L', min: 25.01, max: Infinity },
      ], 200),
      energyRating(),
    ],
  },
  {
    id: 'iron-steamer',
    name: 'Iron / garment steamer',
    categorySlugs: ['steamers-irons'],
    attributes: [
      { key: 'iron_type', label: 'Type', type: 'enum', options: ['Dry Iron', 'Steam Iron', 'Garment Steamer'], required: true },
      powerWatts([
        { label: 'Up to 1200 W', min: 0, max: 1200.01 },
        { label: 'Above 1200 W', min: 1200.01, max: Infinity },
      ]),
    ],
  },
  {
    id: 'air-purifier',
    variantKeys: ['coverage_sqft'],
    name: 'Air purifier',
    categorySlugs: ['air-purifiers'],
    attributes: [
      {
        key: 'coverage_sqft',
        label: 'Room coverage',
        type: 'number',
        unit: 'sq ft',
        min: 50,
        max: 3000,
        step: 10,
        required: true,
        buckets: [
          { label: 'Up to 300 sq ft', min: 0, max: 300.01 },
          { label: '301 – 500 sq ft', min: 300.01, max: 500.01 },
          { label: 'Above 500 sq ft', min: 500.01, max: Infinity },
        ],
      },
      { key: 'filter_type', label: 'Filter', type: 'enum', options: ['HEPA', 'HEPA + Carbon', 'Ionic', 'Other'] },
    ],
  },

  /* ---------------------------- Electronics ---------------------------- */
  {
    id: 'laptop',
    variantKeys: ['ram_gb', 'storage_gb'],
    name: 'Laptop',
    categorySlugs: ['laptops'],
    attributes: [
      {
        key: 'processor_brand',
        label: 'Processor brand',
        type: 'enum',
        options: ['Intel', 'AMD', 'Apple', 'Qualcomm', 'MediaTek', 'Other'],
        required: true,
      },
      ramGb([
        { label: 'Up to 8 GB', min: 0, max: 8.01 },
        { label: '16 GB', min: 8.01, max: 16.01 },
        { label: '32 GB & above', min: 16.01, max: Infinity },
      ]),
      storageGb([
        { label: 'Up to 256 GB', min: 0, max: 256.01 },
        { label: '512 GB', min: 256.01, max: 512.01 },
        { label: '1 TB', min: 512.01, max: 1024.01 },
        { label: 'Above 1 TB', min: 1024.01, max: Infinity },
      ]),
      screenInch([
        { label: 'Under 13 inch', min: 0, max: 13 },
        { label: '13 – 14.9 inch', min: 13, max: 15 },
        { label: '15 – 15.9 inch', min: 15, max: 16 },
        { label: '16 inch & above', min: 16, max: Infinity },
      ]),
      { key: 'os', label: 'Operating system', type: 'enum', options: ['Windows', 'macOS', 'ChromeOS', 'Linux', 'None'] },
    ],
  },
  {
    id: 'mobile',
    variantKeys: ['ram_gb', 'storage_gb'],
    name: 'Mobile phone',
    categorySlugs: ['mobiles', 'smartphones'],
    attributes: [
      ramGb([
        { label: 'Up to 4 GB', min: 0, max: 4.01 },
        { label: '6 GB', min: 4.01, max: 6.01 },
        { label: '8 GB', min: 6.01, max: 8.01 },
        { label: '12 GB & above', min: 8.01, max: Infinity },
      ]),
      storageGb([
        { label: 'Up to 64 GB', min: 0, max: 64.01 },
        { label: '128 GB', min: 64.01, max: 128.01 },
        { label: '256 GB', min: 128.01, max: 256.01 },
        { label: '512 GB & above', min: 256.01, max: Infinity },
      ]),
      { key: 'network', label: 'Network', type: 'enum', options: ['5G', '4G'], required: true },
      { key: 'os', label: 'Operating system', type: 'enum', options: ['Android', 'iOS', 'Other'], required: true },
      screenInch(
        [
          { label: 'Under 6 inch', min: 0, max: 6 },
          { label: '6 – 6.4 inch', min: 6, max: 6.5 },
          { label: '6.5 inch & above', min: 6.5, max: Infinity },
        ],
        false
      ),
    ],
  },
  {
    id: 'audio',
    name: 'Audio',
    categorySlugs: ['audio-headphones'],
    attributes: [
      {
        key: 'audio_type',
        label: 'Type',
        type: 'enum',
        options: ['Over-ear', 'On-ear', 'In-ear / TWS', 'Neckband', 'Speaker', 'Soundbar'],
        required: true,
      },
      { key: 'connectivity', label: 'Connectivity', type: 'enum', options: ['Wireless', 'Wired', 'Wireless & wired'], required: true },
      { key: 'noise_cancellation', label: 'Noise cancellation', type: 'enum', options: ['Active (ANC)', 'None'] },
      {
        key: 'battery_hours',
        label: 'Battery life',
        type: 'number',
        unit: 'hours',
        min: 1,
        max: 500,
        step: 1,
        buckets: [
          { label: 'Up to 20 hours', min: 0, max: 20.01 },
          { label: '21 – 40 hours', min: 20.01, max: 40.01 },
          { label: 'Above 40 hours', min: 40.01, max: Infinity },
        ],
      },
    ],
  },
  {
    id: 'smartwatch',
    name: 'Smartwatch',
    categorySlugs: ['smartwatches-wearables'],
    attributes: [
      { key: 'display_type', label: 'Display', type: 'enum', options: ['AMOLED', 'LCD', 'Other'], required: true },
      {
        key: 'dial_mm',
        label: 'Dial size',
        type: 'number',
        unit: 'mm',
        min: 20,
        max: 60,
        step: 1,
        buckets: [
          { label: 'Under 40 mm', min: 0, max: 40 },
          { label: '40 – 44 mm', min: 40, max: 45 },
          { label: '45 mm & above', min: 45, max: Infinity },
        ],
      },
      { key: 'calling', label: 'Calling', type: 'enum', options: ['Bluetooth calling', 'No calling'], required: true },
      { key: 'compatibility', label: 'Works with', type: 'enum', options: ['Android & iOS', 'iOS only', 'Android only'] },
    ],
  },
  {
    id: 'tablet',
    variantKeys: ['storage_gb'],
    name: 'Tablet',
    categorySlugs: ['tablets-ipads'],
    attributes: [
      screenInch([
        { label: 'Under 9 inch', min: 0, max: 9 },
        { label: '9 – 11 inch', min: 9, max: 11.01 },
        { label: 'Above 11 inch', min: 11.01, max: Infinity },
      ]),
      storageGb([
        { label: 'Up to 64 GB', min: 0, max: 64.01 },
        { label: '128 GB', min: 64.01, max: 128.01 },
        { label: '256 GB & above', min: 128.01, max: Infinity },
      ]),
      { key: 'connectivity', label: 'Connectivity', type: 'enum', options: ['Wi-Fi', 'Wi-Fi + Cellular'], required: true },
      { key: 'os', label: 'Operating system', type: 'enum', options: ['Android', 'iPadOS', 'Windows', 'Other'] },
    ],
  },
  {
    id: 'gaming',
    name: 'Gaming & PC accessory',
    categorySlugs: ['gaming-accessories'],
    attributes: [
      {
        key: 'gaming_type',
        label: 'Type',
        type: 'enum',
        options: ['Console', 'Controller', 'Keyboard', 'Mouse', 'Headset', 'Monitor', 'Other'],
        required: true,
      },
      { key: 'connectivity', label: 'Connectivity', type: 'enum', options: ['Wireless', 'Wired', 'Wireless & wired'] },
    ],
  },
  {
    id: 'camera',
    name: 'Camera',
    categorySlugs: ['cameras-photography'],
    attributes: [
      {
        key: 'camera_type',
        label: 'Type',
        type: 'enum',
        options: ['DSLR', 'Mirrorless', 'Action', 'Point & shoot', 'Instant', 'Lens', 'Accessory'],
        required: true,
      },
      {
        key: 'megapixels',
        label: 'Resolution',
        type: 'number',
        unit: 'MP',
        min: 1,
        max: 200,
        step: 0.1,
        buckets: [
          { label: 'Up to 20 MP', min: 0, max: 20.01 },
          { label: '20.1 – 30 MP', min: 20.01, max: 30.01 },
          { label: 'Above 30 MP', min: 30.01, max: Infinity },
        ],
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Template for a product whose category path is `categorySlugs` (root → leaf, or any order).
 * The deepest category with a template wins.
 */
export function getTemplateForCategoryPath(categorySlugs: string[]): AttributeTemplate | null {
  for (let i = categorySlugs.length - 1; i >= 0; i--) {
    const slug = categorySlugs[i];
    const t = ATTRIBUTE_TEMPLATES.find((tpl) => tpl.categorySlugs.includes(slug));
    if (t) return t;
  }
  return null;
}

export function getTemplateById(id: string): AttributeTemplate | null {
  return ATTRIBUTE_TEMPLATES.find((t) => t.id === id) || null;
}

export function formatAttributeValue(def: AttributeDef, value: string | number): string {
  if (def.type === 'number') return `${Number(value).toLocaleString('en-IN')} ${def.unit}`;
  return String(value);
}

export function bucketFor(def: NumberAttribute, value: number): NumberBucket | null {
  return def.buckets.find((b) => value >= b.min && value < b.max) || null;
}

export interface AttributeValidationResult {
  attributes: ProductAttributes;
  errors: string[];
}

/**
 * Keeps only the template's keys, coerces numbers, checks ranges/options and required fields.
 * Unknown keys are dropped. With no template, attributes are cleared.
 */
export function validateAttributes(
  template: AttributeTemplate | null,
  input: unknown,
  {
    enforceRequired = true,
    satisfiedKeys = [],
  }: {
    enforceRequired?: boolean;
    /** Required keys already provided elsewhere (e.g. by every variant), so not needed here. */
    satisfiedKeys?: string[];
  } = {}
): AttributeValidationResult {
  const out: ProductAttributes = {};
  const errors: string[] = [];
  if (!template) return { attributes: out, errors };
  const raw = input && typeof input === 'object' && !Array.isArray(input) ? (input as Record<string, unknown>) : {};

  for (const def of template.attributes) {
    const value = raw[def.key];
    const empty = value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

    if (empty) {
      if (def.required && enforceRequired && !satisfiedKeys.includes(def.key)) errors.push(`${def.label} is required for ${template.name.toLowerCase()} listings.`);
      continue;
    }

    if (def.type === 'number') {
      const n = typeof value === 'number' ? value : Number(String(value).trim());
      if (!Number.isFinite(n)) {
        errors.push(`${def.label} must be a number.`);
        continue;
      }
      if (n < def.min || n > def.max) {
        errors.push(`${def.label} must be between ${def.min} and ${def.max} ${def.unit}.`);
        continue;
      }
      out[def.key] = Math.round(n * 100) / 100;
    } else {
      const s = String(value).trim();
      const match = def.options.find((o) => o.toLowerCase() === s.toLowerCase());
      if (!match) {
        errors.push(`${def.label} must be one of: ${def.options.join(', ')}.`);
        continue;
      }
      out[def.key] = match;
    }
  }

  return { attributes: out, errors };
}

/** Reads a stored Product.attributes JSON value safely. */
export function readStoredAttributes(value: unknown): ProductAttributes {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: ProductAttributes = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === 'string' || typeof v === 'number') out[k] = v;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Variants                                                            */
/* ------------------------------------------------------------------ */

/** Attribute definitions that may differ per variant for this template, in template order. */
export function getVariantDefs(template: AttributeTemplate | null): AttributeDef[] {
  if (!template?.variantKeys?.length) return [];
  return template.attributes.filter((d) => template.variantKeys!.includes(d.key));
}

/** Validates one variant's attributes: only the template's variant keys, no required check. */
export function validateVariantAttributes(template: AttributeTemplate | null, input: unknown): AttributeValidationResult {
  const variantOnly: AttributeTemplate | null = template
    ? { ...template, attributes: getVariantDefs(template) }
    : null;
  return validateAttributes(variantOnly, input, { enforceRequired: false });
}

/** Human label for a variant from its attributes, e.g. "1.5 Ton · 5 Star". */
export function variantLabel(template: AttributeTemplate | null, attrs: ProductAttributes): string {
  return getVariantDefs(template)
    .filter((d) => attrs[d.key] !== undefined && attrs[d.key] !== '')
    .map((d) => (d.type === 'number' ? `${Number(attrs[d.key])} ${d.unit}` : String(attrs[d.key])))
    .join(' · ');
}

/** Variant-key attributes that every variant provides (so the listing-level value isn't required). */
export function keysProvidedByAllVariants(template: AttributeTemplate | null, variants: ProductAttributes[]): string[] {
  if (variants.length === 0) return [];
  return getVariantDefs(template)
    .map((d) => d.key)
    .filter((k) => variants.every((v) => v[k] !== undefined && v[k] !== ''));
}
