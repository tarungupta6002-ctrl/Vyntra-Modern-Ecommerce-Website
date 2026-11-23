import { CategoryProductItem } from '@/hooks/use-category-products';
import { DetailedProduct } from './products';
import { SellerOfferItem } from '@/types/multiseller';

export interface ApplianceSubCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  badge?: string;
}

export const APPLIANCE_SUBCATEGORIES: ApplianceSubCategory[] = [
  { id: 'all', name: 'All Appliances', slug: 'all', icon: 'Sparkles' },
  { id: 'refrigerators', name: 'Refrigerators', slug: 'refrigerators', icon: 'Refrigerator', badge: 'Up to 45% Off' },
  { id: 'washing-machines', name: 'Washing Machines', slug: 'washing-machines', icon: 'WashingMachine', badge: 'Free Delivery' },
  { id: 'air-conditioners', name: 'Air Conditioners', slug: 'air-conditioners', icon: 'Wind', badge: '5-Star Deals' },
  { id: 'kitchen-appliances', name: 'Kitchen & Cooking', slug: 'kitchen-appliances', icon: 'Flame', badge: 'Hot Deals' },
  { id: 'home-appliances', name: 'Home Essentials', slug: 'home-appliances', icon: 'Home' },
];

export const APPLIANCE_BRANDS = [
  'All Brands',
  'LG',
  'Samsung',
  'Bosch',
  'Daikin',
  'IFB',
  'Whirlpool',
  'Haier',
  'Voltas',
  'Philips',
  'Kent',
  'Faber',
  'Dyson',
  'Panasonic',
  'Godrej',
];

export const APPLIANCE_ENERGY_RATINGS = [
  '5 Star',
  '4 Star',
  '3 Star',
];

export const FALLBACK_APPLIANCES: CategoryProductItem[] = [
  {
    id: 'app-lg-242l-fridge',
    slug: 'lg-242l-3-star-smart-inverter-frost-free-double-door-refrigerator-gl-i292rpzx',
    title: 'LG 242L 3 Star Smart Inverter Frost-Free Double Door Refrigerator (Shiny Steel, Door Cooling+ & Smart Connect)',
    brand: 'LG',
    category: 'appliances',
    subcategory: 'refrigerators',
    subCategory: 'refrigerators',
    price: 25990,
    originalPrice: 37099,
    discount: '30% off',
    rating: 4.4,
    reviews: 14280,
    isBestSeller: true,
    isPrime: true,
    deliveryDate: 'Tomorrow, by 11 AM with Free Installation & Demo',
    image: 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=800&auto=format&fit=crop&q=80',
    stockCount: 18,
    inStock: true,
    vendorName: 'Tarun Store',
    vendorSlug: 'tarun-store-fdam',
    sizes: ['242 L (3 Star)', '260 L (3 Star)', '343 L (3 Star)'],
    boughtPastMonth: '3K+ bought in past month',
    specs: {
      capacity: '242 Litres',
      energy_rating: '3 Star BEE Rating',
      configuration: 'Double Door Frost Free',
      compressor: 'Smart Inverter Compressor with 10 Year Warranty',
      door_cooling: 'Door Cooling+ with Multi Air Flow',
      annual_energy_consumption: '232 Kilowatt Hours Per Year',
      freezer_capacity: '61 Litres',
      installation_type: 'Free Scheduled Standard Installation',
    },
  },
  {
    id: 'app-bosch-8kg-frontload',
    slug: 'bosch-8kg-5-star-inverter-touch-control-fully-automatic-front-load-washing-machine',
    title: 'Bosch 8 kg 5 Star Inverter Touch Control Fully Automatic Front Load Washing Machine with In-Built Heater (Silver, WAJ28262IN)',
    brand: 'Bosch',
    category: 'appliances',
    subcategory: 'washing-machines',
    subCategory: 'washing-machines',
    price: 36990,
    originalPrice: 53790,
    discount: '31% off',
    rating: 4.5,
    reviews: 9820,
    isAmazonChoice: true,
    isPrime: true,
    deliveryDate: 'Tomorrow, by 2 PM with Free Expert Demo',
    image: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=800&auto=format&fit=crop&q=80',
    stockCount: 12,
    inStock: true,
    vendorName: 'Tarun Store',
    vendorSlug: 'tarun-store-fdam',
    sizes: ['8 kg (5 Star)', '7 kg (5 Star)', '9 kg (5 Star)'],
    boughtPastMonth: '2K+ bought in past month',
    specs: {
      capacity: '8 Kilograms',
      energy_rating: '5 Star BEE Highest Efficiency',
      motor_type: 'EcoSilence Drive Inverter Motor with 12 Year Warranty',
      max_spin_speed: '1400 RPM for Faster Drying',
      heater: 'In-Built Anti-Wrinkle 90°C AllergyPlus Heater',
      wash_programs: '15 Specialized Custom Fabric Programs',
      drum_type: 'VarioDrum Gentle Fabric Protection',
      installation_type: 'Free Delivery & Doorstep Installation Included',
    },
  },
  {
    id: 'app-daikin-1-5t-5star-ac',
    slug: 'daikin-1-5-ton-5-star-inverter-split-ac-copper-pm-2-5-filter-mtkm50u',
    title: 'Daikin 1.5 Ton 5 Star Inverter Split AC (100% Copper, PM 2.5 Air Filter, Triple Display, 2024 Model, MTKM50U)',
    brand: 'Daikin',
    category: 'appliances',
    subcategory: 'air-conditioners',
    subCategory: 'air-conditioners',
    price: 44990,
    originalPrice: 67200,
    discount: '33% off',
    rating: 4.4,
    reviews: 18450,
    isBestSeller: true,
    isPrime: true,
    deliveryDate: 'Tomorrow, by 12 PM with Same-Day Installation',
    image: 'https://images.unsplash.com/photo-1614633833026-0e12d453dc67?w=800&auto=format&fit=crop&q=80',
    stockCount: 15,
    inStock: true,
    vendorName: 'Tarun Store',
    vendorSlug: 'tarun-store-fdam',
    sizes: ['1.5 Ton (5 Star)', '1.0 Ton (5 Star)', '2.0 Ton (5 Star)'],
    boughtPastMonth: '5K+ bought in past month',
    specs: {
      capacity: '1.5 Ton suitable for rooms up to 160 sq ft',
      energy_rating: '5 Star (ISEER 5.2 - Best in Class Efficiency)',
      compressor: 'Swing Inverter Compressor with 10 Year Warranty',
      condenser: '100% Grooved Copper Tubes with Anti-Corrosion Fin',
      special_feature: 'Dew Clean Technology & PM 2.5 Air Filter',
      power_consumption: '785.67 kWh per year',
      installation_type: 'Free Doorstep Inspection & Express Installation',
    },
  },
  {
    id: 'app-samsung-side-by-side-fridge',
    slug: 'samsung-653l-3-star-convertible-5in1-side-by-side-refrigerator-rs76cg8003s9',
    title: 'Samsung 653 L, 3 Star, Convertible 5-in-1 Digital Inverter Side-by-Side AI Refrigerator (Silver, RS76CG8003S9)',
    brand: 'Samsung',
    category: 'appliances',
    subcategory: 'refrigerators',
    subCategory: 'refrigerators',
    price: 79990,
    originalPrice: 113000,
    discount: '29% off',
    rating: 4.5,
    reviews: 3200,
    isLimitedDeal: true,
    isPrime: true,
    deliveryDate: 'Friday, Free Delivery & Unboxing by Certified Technician',
    image: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=800&auto=format&fit=crop&q=80',
    stockCount: 8,
    inStock: true,
    vendorName: 'Tarun Store',
    vendorSlug: 'tarun-store-fdam',
    sizes: ['653 L Convertible', '700 L Family Hub'],
    boughtPastMonth: '900+ bought in past month',
    specs: {
      capacity: '653 Litres (Side by Side)',
      convertible_modes: '5 Convertible Modes with SmartThings AI Energy',
      compressor: 'Digital Inverter with 20 Year Compressor Warranty',
      cooling_technology: 'All-Around Cooling & Power Freeze',
      energy_rating: '3 Star High Energy Efficiency',
      door_finish: 'Refined Inox Metallic Design',
    },
  },
  {
    id: 'app-ifb-30l-microwave',
    slug: 'ifb-30l-convection-microwave-oven-30brc2-black',
    title: 'IFB 30 L Convection Microwave Oven with 101 Auto-Cook Menus, Steam Clean & Deodorize (Black, 30BRC2)',
    brand: 'IFB',
    category: 'appliances',
    subcategory: 'kitchen-appliances',
    subCategory: 'kitchen-appliances',
    price: 14990,
    originalPrice: 20490,
    discount: '27% off',
    rating: 4.3,
    reviews: 8120,
    isPrime: true,
    deliveryDate: 'Tomorrow, Free Express Delivery',
    image: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=800&auto=format&fit=crop&q=80',
    stockCount: 20,
    inStock: true,
    vendorName: 'Tarun Store',
    vendorSlug: 'tarun-store-fdam',
    sizes: ['30 Litres', '25 Litres', '20 Litres'],
    boughtPastMonth: '1K+ bought in past month',
    specs: {
      capacity: '30 Litres suitable for large families',
      cooking_modes: 'Baking, Grilling, Reheating, Defrosting, Roasting',
      programs: '101 Indian & International Auto Cook Menus',
      cavity: 'Stainless Steel Anti-Bacterial Cavity',
      warranty: '1 Year on Machine + 3 Years on Magnetron & Cavity',
    },
  },
  {
    id: 'app-kent-grand-water-purifier',
    slug: 'kent-grand-plus-ro-uv-uf-water-purifier-with-tds-controller',
    title: 'KENT Grand Plus RO + UV + UF + TDS Control In-Tank UV Disinfection Wall Mount Water Purifier (White, 9L)',
    brand: 'Kent',
    category: 'appliances',
    subcategory: 'home-appliances',
    subCategory: 'home-appliances',
    price: 15490,
    originalPrice: 21000,
    discount: '26% off',
    rating: 4.4,
    reviews: 26500,
    isBestSeller: true,
    isPrime: true,
    deliveryDate: 'Tomorrow, with Free Installation & Pre-Filter Included',
    image: 'https://images.unsplash.com/photo-1542013936693-884638332954?w=800&auto=format&fit=crop&q=80',
    stockCount: 25,
    inStock: true,
    vendorName: 'Tarun Store',
    vendorSlug: 'tarun-store-fdam',
    sizes: ['9 Litres Standard', '11 Litres Storage'],
    boughtPastMonth: '4K+ bought in past month',
    specs: {
      purification_technology: 'RO + UV + UF + Alkaline Mineral RO',
      storage_capacity: '9 Litres Storage Tank with Water Level Indicator',
      purification_capacity: 'Up to 20 Litres per Hour',
      tds_controller: 'Retains Essential Natural Minerals',
      warranty: '1 Year Warranty + 3 Years Free Service',
    },
  },
];

const APPLIANCES_MAP = new Map<string, CategoryProductItem>();
for (const p of FALLBACK_APPLIANCES) {
  APPLIANCES_MAP.set(p.slug.toLowerCase(), p);
}

export function getApplianceProductBySlug(slug: string): CategoryProductItem | undefined {
  if (!slug) return undefined;
  return APPLIANCES_MAP.get(slug.toLowerCase());
}

export function getApplianceDetailedProductBySlug(slug: string): DetailedProduct | undefined {
  const item = getApplianceProductBySlug(slug);
  if (!item) return undefined;

  const specEntries = Object.entries(item.specs || {});
  const customSpecs = specEntries.map(([k, v]) => ({
    label: k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    value: String(v),
  }));

  const primaryOffer: SellerOfferItem = {
    id: `offer-${item.id}-tarun-store`,
    productId: item.id,
    vendorId: 'vendor-tarun-store',
    vendor: {
      id: 'vendor-tarun-store',
      storeName: item.vendorName || 'Tarun Store',
      storeSlug: item.vendorSlug || 'tarun-store-fdam',
      rating: 4.9,
      isVerified: true,
      city: 'Mahoba',
      state: 'Uttar Pradesh',
    },
    condition: 'NEW',
    sellingPrice: item.price,
    originalPrice: item.originalPrice,
    discountPercent:
      item.originalPrice > item.price
        ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)
        : 0,
    stock: item.stockCount || 15,
    handlingDays: 1,
    estimatedDeliveryDays: 2,
    fulfillmentType: 'VYNTRA_FULFILLED',
    shipsFrom: 'Vyntra Express Logistics Hub',
    isBuyBoxWinner: true,
    isOriginalCreator: true,
  };

  return {
    id: item.id,
    slug: item.slug,
    sku: `APP-${item.id.slice(-6).toUpperCase()}`,
    title: item.title,
    subtitle: `${item.brand} Official Appliances Warranty - Free Scheduled Delivery & Technician Installation`,
    brand: item.brand,
    vendorName: item.vendorName,
    originalVendorId: 'vendor-tarun-store',
    originalVendorName: item.vendorName,
    category: 'appliances',
    subCategory: item.subcategory || 'Major & Small Appliances',
    breadcrumb: [
      { label: 'Home', href: '/' },
      { label: 'Appliances', href: '/appliances' },
      { label: item.brand, href: `/appliances?brand=${encodeURIComponent(item.brand)}` },
      { label: item.title, href: `/products/${item.slug}` },
    ],
    price: item.price,
    originalPrice: item.originalPrice,
    discount: item.discount,
    rating: item.rating,
    reviewCount: item.reviews,
    recommendedPct: 95,
    badge: item.isBestSeller ? 'BESTSELLER' : item.isAmazonChoice ? "VYNTRA'S CHOICE" : undefined,
    badgeVariant: 'primary',
    isExpress: item.isPrime,
    stockCount: item.stockCount,
    highlights: [
      `Official 100% genuine ${item.brand} product with authentic warranty`,
      'Free doorstep scheduled delivery with unboxing & inspection',
      'Professional certified technician installation and demonstration',
      '10-Day return and replacement guarantee with Vyntra Assured',
      'Up to ₹5,000 instant bank discount and exchange bonus',
    ],
    customSpecs,
    images: [
      { id: 1, title: item.title, alt: item.title, src: item.image },
    ],
    colors: [
      { name: 'Classic Inox', hex: '#6B7280', imageUrl: item.image },
      { name: 'Glossy Silver', hex: '#D1D5DB', imageUrl: item.image },
      { name: 'Black Mirror', hex: '#111827', imageUrl: item.image },
    ],
    sizeLabel: 'Capacity / Configuration',
    sizes: (item.sizes || ['Standard Edition']).map((s) => ({
      size: s,
      dimension: s,
    })),
    rawVariants: (item.sizes || ['Standard Edition']).map((s, idx) => ({
      id: `var-${item.id}-${idx}`,
      sku: `APP-${item.id.slice(-4)}-${idx + 1}`,
      size: s,
      color: 'Classic Inox',
      price: item.price,
      originalPrice: item.originalPrice,
      stock: item.stockCount || 10,
      imageUrl: item.image,
    })),
    tabs: {
      specs: customSpecs.map((s) => ({ label: s.label, val: s.value })),
      care: [
        { iconName: 'wrench', title: 'Free Installation', desc: 'Brand certified doorstep installation included.' },
        { iconName: 'shield', title: '10-Year Warranty', desc: '10 Years on Motor/Compressor + 1 Year Comprehensive.' },
      ],
      guarantee: [
        { iconName: 'shieldCheck', title: '100% Genuine Appliance', desc: 'Direct from authorized brand manufacturers.' },
      ],
    },
    sellerOffers: [primaryOffer],
    reviews: {
      average: item.rating,
      total: item.reviews,
      breakdown: [
        { stars: 5, pct: 82 },
        { stars: 4, pct: 14 },
        { stars: 3, pct: 3 },
        { stars: 2, pct: 1 },
        { stars: 1, pct: 0 },
      ],
      customerPhotos: [],
      list: [],
    },
    relatedProducts: [],
    recentlyViewed: [],
  };
}
