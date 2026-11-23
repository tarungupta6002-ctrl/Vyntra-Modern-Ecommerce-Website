import { CategoryProductItem } from '@/hooks/use-category-products';
import { DetailedProduct } from './products';
import { SellerOfferItem } from '@/types/multiseller';

export interface BookSubCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  badge?: string;
}

export const BOOK_SUBCATEGORIES: BookSubCategory[] = [
  { id: 'all', name: 'All Books', slug: 'all', icon: 'Sparkles' },
  { id: 'self-help-books', name: 'Self-Help & Mindset', slug: 'self-help-books', icon: 'Sparkles', badge: '#1 Bestseller' },
  { id: 'business-finance-books', name: 'Business & Finance', slug: 'business-finance-books', icon: 'TrendingUp', badge: 'Top Rated' },
  { id: 'fiction-literature-books', name: 'Fiction & Literature', slug: 'fiction-literature-books', icon: 'BookOpen' },
  { id: 'indian-literature-books', name: 'Indian Authors', slug: 'indian-literature-books', icon: 'Flame', badge: 'Popular' },
  { id: 'exam-prep-books', name: 'Exam Prep & Academic', slug: 'exam-prep-books', icon: 'GraduationCap' },
  { id: 'comics-manga-books', name: 'Comics & Manga', slug: 'comics-manga-books', icon: 'BookMarked' },
];

export const BOOK_AUTHORS = [
  'All Authors',
  'James Clear',
  'Morgan Housel',
  'Robert T. Kiyosaki',
  'Amish Tripathi',
  'Sudha Murty',
  'Héctor García',
  'Chetan Bhagat',
  'Munshi Premchand',
  'APJ Abdul Kalam',
];

export const BOOK_FORMATS = [
  'Paperback',
  'Hardcover',
  'Deluxe Edition',
  'Box Set',
];

export const BOOK_LANGUAGES = [
  'English',
  'Hindi',
  'Sanskrit',
];

export const FALLBACK_BOOKS: CategoryProductItem[] = [
  {
    id: 'book-atomic-habits',
    slug: 'atomic-habits-an-easy-proven-way-to-build-good-habits-break-bad-ones-james-clear',
    title: 'Atomic Habits: An Easy & Proven Way to Build Good Habits & Break Bad Ones',
    brand: 'James Clear',
    category: 'books',
    subcategory: 'self-help-books',
    subCategory: 'self-help-books',
    price: 499,
    originalPrice: 799,
    discount: '38% off',
    rating: 4.8,
    reviews: 98450,
    isBestSeller: true,
    isPrime: true,
    deliveryDate: 'Tomorrow, by 11 AM with Free Prime Delivery',
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80',
    stockCount: 85,
    inStock: true,
    vendorName: 'Tarun Store',
    vendorSlug: 'tarun-store-fdam',
    sizes: ['Paperback', 'Hardcover', 'Collector Box Set'],
    boughtPastMonth: '50K+ bought in past month',
    specs: {
      author: 'James Clear',
      publisher: 'Penguin Random House',
      language: 'English',
      print_length: '320 pages',
      isbn_10: '1847941831',
      isbn_13: '978-1847941831',
      dimensions: '15.3 x 2.3 x 23.4 cm',
      reading_age: '16 years and up',
      publication_date: '30 October 2018',
    },
  },
  {
    id: 'book-psychology-of-money',
    slug: 'the-psychology-of-money-timeless-lessons-on-wealth-greed-and-happiness-morgan-housel',
    title: 'The Psychology of Money: Timeless lessons on wealth, greed, and happiness',
    brand: 'Morgan Housel',
    category: 'books',
    subcategory: 'business-finance-books',
    subCategory: 'business-finance-books',
    price: 320,
    originalPrice: 499,
    discount: '36% off',
    rating: 4.7,
    reviews: 74200,
    isAmazonChoice: true,
    isPrime: true,
    deliveryDate: 'Tomorrow, by 2 PM',
    image: 'https://images.unsplash.com/photo-1592496431122-2349e0fbc666?w=800&auto=format&fit=crop&q=80',
    stockCount: 60,
    inStock: true,
    vendorName: 'Tarun Store',
    vendorSlug: 'tarun-store-fdam',
    sizes: ['Paperback', 'Hardcover'],
    boughtPastMonth: '35K+ bought in past month',
    specs: {
      author: 'Morgan Housel',
      publisher: 'Jaico Publishing House',
      language: 'English',
      print_length: '252 pages',
      isbn_10: '9390166268',
      isbn_13: '978-9390166268',
      dimensions: '14 x 1.6 x 21.6 cm',
      reading_age: '14 years and up',
      publication_date: '1 September 2020',
    },
  },
  {
    id: 'book-rich-dad-poor-dad',
    slug: 'rich-dad-poor-dad-what-the-rich-teach-their-kids-about-money-robert-t-kiyosaki',
    title: 'Rich Dad Poor Dad: What the Rich Teach Their Kids About Money That the Poor and Middle Class Do Not!',
    brand: 'Robert T. Kiyosaki',
    category: 'books',
    subcategory: 'business-finance-books',
    subCategory: 'business-finance-books',
    price: 389,
    originalPrice: 599,
    discount: '35% off',
    rating: 4.6,
    reviews: 112000,
    isBestSeller: true,
    isPrime: true,
    deliveryDate: 'Tomorrow, Free Delivery',
    image: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=800&auto=format&fit=crop&q=80',
    stockCount: 50,
    inStock: true,
    vendorName: 'Tarun Store',
    vendorSlug: 'tarun-store-fdam',
    sizes: ['Paperback', '25th Anniversary Edition'],
    boughtPastMonth: '25K+ bought in past month',
    specs: {
      author: 'Robert T. Kiyosaki',
      publisher: 'Plata Publishing',
      language: 'English',
      print_length: '336 pages',
      isbn_10: '1612680194',
      isbn_13: '978-1612680194',
      dimensions: '15.2 x 2.3 x 22.9 cm',
      reading_age: '15 years and up',
      publication_date: '11 April 2017',
    },
  },
  {
    id: 'book-immortals-of-meluha',
    slug: 'the-immortals-of-meluha-shiva-trilogy-book-1-amish-tripathi',
    title: 'The Immortals of Meluha (Shiva Trilogy Book 1): The Legendary Mythological Epic',
    brand: 'Amish Tripathi',
    category: 'books',
    subcategory: 'indian-literature-books',
    subCategory: 'indian-literature-books',
    price: 299,
    originalPrice: 450,
    discount: '34% off',
    rating: 4.6,
    reviews: 42100,
    isPrime: true,
    deliveryDate: 'Tomorrow, by 5 PM',
    image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&auto=format&fit=crop&q=80',
    stockCount: 40,
    inStock: true,
    vendorName: 'Tarun Store',
    vendorSlug: 'tarun-store-fdam',
    sizes: ['Paperback', 'Complete Shiva Trilogy Box Set'],
    boughtPastMonth: '15K+ bought in past month',
    specs: {
      author: 'Amish Tripathi',
      publisher: 'HarperCollins India',
      language: 'English',
      print_length: '412 pages',
      isbn_10: '935629050X',
      isbn_13: '978-9356290501',
      dimensions: '12.9 x 2.6 x 19.8 cm',
      reading_age: '14 years and up',
      publication_date: '15 July 2010',
    },
  },
  {
    id: 'book-grandmas-bag-of-stories',
    slug: 'grandmas-bag-of-stories-delightful-tales-for-children-sudha-murty',
    title: "Grandma's Bag of Stories: Illustrated Classic Tales for Children and Young Readers",
    brand: 'Sudha Murty',
    category: 'books',
    subcategory: 'comics-manga-books',
    subCategory: 'comics-manga-books',
    price: 199,
    originalPrice: 299,
    discount: '33% off',
    rating: 4.7,
    reviews: 38900,
    isBestSeller: true,
    isPrime: true,
    deliveryDate: 'Tomorrow, by 12 PM',
    image: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=800&auto=format&fit=crop&q=80',
    stockCount: 75,
    inStock: true,
    vendorName: 'Tarun Store',
    vendorSlug: 'tarun-store-fdam',
    sizes: ['Paperback', 'Hardcover Edition'],
    boughtPastMonth: '20K+ bought in past month',
    specs: {
      author: 'Sudha Murty',
      publisher: 'Puffin Classics India',
      language: 'English',
      print_length: '176 pages',
      isbn_10: '0143333621',
      isbn_13: '978-0143333623',
      dimensions: '13 x 1.2 x 19.8 cm',
      reading_age: '7 - 12 years',
      publication_date: '1 January 2015',
    },
  },
  {
    id: 'book-ikigai-japanese-secret',
    slug: 'ikigai-the-japanese-secret-to-a-long-and-happy-life-hector-garcia',
    title: 'Ikigai: The Japanese secret to a long and happy life (Hardcover international edition)',
    brand: 'Héctor García',
    category: 'books',
    subcategory: 'self-help-books',
    subCategory: 'self-help-books',
    price: 360,
    originalPrice: 550,
    discount: '35% off',
    rating: 4.6,
    reviews: 61500,
    isPrime: true,
    deliveryDate: 'Tomorrow, Free Delivery',
    image: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&auto=format&fit=crop&q=80',
    stockCount: 45,
    inStock: true,
    vendorName: 'Tarun Store',
    vendorSlug: 'tarun-store-fdam',
    sizes: ['Hardcover', 'Paperback'],
    boughtPastMonth: '18K+ bought in past month',
    specs: {
      author: 'Héctor García and Francesc Miralles',
      publisher: 'Penguin Life',
      language: 'English',
      print_length: '208 pages',
      isbn_10: '178633089X',
      isbn_13: '978-1786330895',
      dimensions: '13.6 x 2.2 x 18.5 cm',
      reading_age: '14 years and up',
      publication_date: '27 September 2017',
    },
  },
];

const BOOKS_MAP = new Map<string, CategoryProductItem>();
for (const p of FALLBACK_BOOKS) {
  BOOKS_MAP.set(p.slug.toLowerCase(), p);
}

export function getBooksProductBySlug(slug: string): CategoryProductItem | undefined {
  if (!slug) return undefined;
  return BOOKS_MAP.get(slug.toLowerCase());
}

export function getBooksDetailedProductBySlug(slug: string): DetailedProduct | undefined {
  const item = getBooksProductBySlug(slug);
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
    stock: item.stockCount || 50,
    handlingDays: 1,
    estimatedDeliveryDays: 1,
    fulfillmentType: 'VYNTRA_FULFILLED',
    shipsFrom: 'Vyntra Express Logistics Hub',
    isBuyBoxWinner: true,
    isOriginalCreator: true,
  };

  return {
    id: item.id,
    slug: item.slug,
    sku: `BOOK-${item.id.slice(-6).toUpperCase()}`,
    title: item.title,
    subtitle: `by ${item.brand} (Author) • Official Publisher Edition • 100% Genuine`,
    brand: item.brand,
    vendorName: item.vendorName,
    originalVendorId: 'vendor-tarun-store',
    originalVendorName: item.vendorName,
    category: 'books',
    subCategory: item.subcategory || 'Books & Literature',
    breadcrumb: [
      { label: 'Home', href: '/' },
      { label: 'Books', href: '/books' },
      { label: item.brand, href: `/books?author=${encodeURIComponent(item.brand)}` },
      { label: item.title, href: `/products/${item.slug}` },
    ],
    price: item.price,
    originalPrice: item.originalPrice,
    discount: item.discount,
    rating: item.rating,
    reviewCount: item.reviews,
    recommendedPct: 98,
    badge: item.isBestSeller ? 'BESTSELLER' : item.isAmazonChoice ? "VYNTRA'S CHOICE" : undefined,
    badgeVariant: 'primary',
    isExpress: item.isPrime,
    stockCount: item.stockCount,
    highlights: [
      `Official 100% authentic publisher edition by ${item.brand}`,
      'High-grade archival paper and premium binding quality',
      'Dispatched with sturdy protective book mailer packaging',
      'Eligible for 7-Day Replacement Guarantee with Vyntra Assured',
    ],
    customSpecs,
    images: [
      { id: 1, title: item.title, alt: item.title, src: item.image },
    ],
    colors: [
      { name: 'Standard Edition', hex: '#111827', imageUrl: item.image },
    ],
    sizeLabel: 'Format / Binding',
    sizes: (item.sizes || ['Paperback']).map((s) => ({
      size: s,
      dimension: s,
    })),
    rawVariants: (item.sizes || ['Paperback']).map((s, idx) => ({
      id: `var-${item.id}-${idx}`,
      sku: `BOOK-${item.id.slice(-4)}-${idx + 1}`,
      size: s,
      color: 'Standard Edition',
      price: item.price,
      originalPrice: item.originalPrice,
      stock: item.stockCount || 50,
      imageUrl: item.image,
    })),
    tabs: {
      specs: customSpecs.map((s) => ({ label: s.label, val: s.value })),
      care: [
        { iconName: 'shield', title: 'Authentic Edition', desc: 'Direct publisher print edition with verified ISBN.' },
        { iconName: 'zap', title: 'Fast Dispatch', desc: 'Ships within 24 hours in tamper-evident protective mailer.' },
      ],
      guarantee: [
        { iconName: 'shieldCheck', title: '100% Genuine Book', desc: 'Direct from authorized publishing houses.' },
      ],
    },
    sellerOffers: [primaryOffer],
    reviews: {
      average: item.rating,
      total: item.reviews,
      breakdown: [
        { stars: 5, pct: 86 },
        { stars: 4, pct: 10 },
        { stars: 3, pct: 2 },
        { stars: 2, pct: 1 },
        { stars: 1, pct: 1 },
      ],
      customerPhotos: [],
      list: [],
    },
    relatedProducts: [],
    recentlyViewed: [],
  };
}
