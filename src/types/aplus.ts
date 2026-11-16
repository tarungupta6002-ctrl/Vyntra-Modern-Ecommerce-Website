/**
 * ==============================================================================
 * VYNTRA AMAZON A+ CONTENT ARCHITECTURE
 * Structured models for Rich Product Description & Editorial Content
 * ==============================================================================
 */

export type APlusModuleType =
  | 'hero_banner'
  | 'image_text_split'
  | 'feature_cards_3'
  | 'feature_cards_4'
  | 'lifestyle_gallery'
  | 'craftsmanship_story'
  | 'product_highlights'
  | 'care_and_size'
  | 'brand_story'
  | 'promo_banner';

export interface APlusFeatureCard {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  altText?: string;
}

export interface APlusStat {
  label: string;
  value: string;
}

export interface APlusModule {
  id: string;
  type: APlusModuleType;
  title?: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  secondaryImageUrl?: string;
  tertiaryImageUrl?: string;
  altText?: string;
  imagePosition?: 'left' | 'right';
  badgeText?: string;
  quote?: string;
  author?: string;
  cards?: APlusFeatureCard[];
  stats?: APlusStat[];
  highlights?: string[];
  carePoints?: Array<{ title: string; desc: string }>;
  sizeChartRows?: Array<{ size: string; chest: string; waist: string; length: string }>;
}

export type APlusHeaderStyle =
  | 'maroon_luxury'
  | 'gold_heritage'
  | 'midnight_navy'
  | 'emerald_artisanal'
  | 'clean_minimal';

export interface APlusData {
  headerTitle: string; // e.g. "FROM THE BRAND" | "FROM THE MAKER" | "FROM THE ARTISAN ATELIER" | "FROM THE MANUFACTURER"
  headerSubtitle?: string;
  headerStyle: APlusHeaderStyle;
  modules: APlusModule[];
}

/**
 * Creates default curated A+ modules for an artisan product
 */
export function createDefaultAPlusContent(params: {
  title: string;
  brand: string;
  category?: string;
  heroImage?: string;
  secondaryImage?: string;
  storeName?: string;
}): APlusData {
  const brandName = params.brand || 'Vyntra Atelier';
  const heroImg =
    params.heroImage ||
    'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=1600&q=80';
  const secondaryImg =
    params.secondaryImage ||
    'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&q=80';

  return {
    headerTitle: 'FROM THE MAKER',
    headerSubtitle: `Authentic Handloom & Heritage Atelier Experience by ${brandName}`,
    headerStyle: 'maroon_luxury',
    modules: [
      {
        id: 'mod-hero-1',
        type: 'hero_banner',
        title: `The Heritage Art of ${brandName}`,
        subtitle: 'Preserving Centuries of Handloom Weaving & Authentic Indian Craftsmanship',
        imageUrl: heroImg,
        altText: `${brandName} Atelier Banner`,
        badgeText: 'HERITAGE ARCHIVE',
      },
      {
        id: 'mod-split-1',
        type: 'image_text_split',
        title: 'Artisanal Weaving & Natural Fibers',
        description:
          'Each creation is woven by generational master weavers utilizing natural organic yarns, pure mulberry silk, and hand-spun cotton. The distinctive texture and subtle natural variations celebrate authentic handmade imperfection.',
        imageUrl: secondaryImg,
        altText: 'Artisan weaving at traditional wooden handloom',
        imagePosition: 'left',
        badgeText: 'HANDCRAFTED INTEGRITY',
      },
      {
        id: 'mod-cards-1',
        type: 'feature_cards_3',
        title: 'Artisan Quality Hallmarks',
        cards: [
          {
            id: 'c-1',
            title: '100% Certified Handloom',
            description:
              'Crafted under geographical indication standards ensuring true artisan lineage and direct craft compensation.',
            imageUrl:
              'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80',
            altText: 'Certified handloom fibers',
          },
          {
            id: 'c-2',
            title: 'Eco-conscious Dyeing',
            description:
              'Colored with low-impact natural botanical dyes that protect weaver health and preserve river eco-systems.',
            imageUrl:
              'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=600&q=80',
            altText: 'Natural organic dyes',
          },
          {
            id: 'c-3',
            title: 'Tailored for Longevity',
            description:
              'Reinforced seams, double-needle finishing, and heirloom-grade structural balance that softens with every wash.',
            imageUrl:
              'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&q=80',
            altText: 'Hand finishing and tailored stitching',
          },
        ],
      },
      {
        id: 'mod-craft-1',
        type: 'craftsmanship_story',
        title: 'Master Craftsmanship & Purity Metrics',
        description:
          'Our atelier collaborates with rural weaving clusters across Rajasthan, Varanasi, and Bengal to bring master creations directly to modern discerning patrons.',
        imageUrl:
          'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=1200&q=80',
        stats: [
          { label: 'Artisan Hours', value: '36+ hrs' },
          { label: 'Weaver Fair Share', value: '100%' },
          { label: 'Pure Natural Yarns', value: 'Certified' },
        ],
        badgeText: 'ATELIER TRANSPARENCY',
      },
      {
        id: 'mod-brand-1',
        type: 'brand_story',
        title: 'The Atelier Philosophy',
        quote:
          'True luxury is not mass manufactured; it is born from patience, dedication of hands, and reverence for traditional Indian textiles.',
        author: `${brandName} Guild Master`,
        imageUrl:
          'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1000&q=80',
        altText: 'Artisan designer working with textiles',
      },
    ],
  };
}
