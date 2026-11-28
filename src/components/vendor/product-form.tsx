'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Package,
  ArrowLeft,
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  Ruler,
  Info,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Save,
  Eye,
  Check,
  Tag,
  Store,
  DollarSign,
  Boxes,
  HelpCircle,
  ExternalLink,
  FolderOpen,
  Search,
  ChevronRight,
  RotateCcw,
  X,
} from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { APlusData, createDefaultAPlusContent, cleanAplusText } from '@/types/aplus';
import { APlusBuilder } from '@/components/vendor/aplus-builder';
import { ProductAttributesSection } from '@/components/vendor/product-attributes-section';
import {
  getTemplateForCategoryPath,
  validateAttributes,
  getVariantDefs,
  variantLabel,
  keysProvidedByAllVariants,
  type ProductAttributes,
} from '@/lib/catalog/attributes';
import { VariantOptionsBuilder, type GeneratedVariant } from '@/components/vendor/variant-options-builder';
import { MediaPickerModal, SelectedMedia } from '@/components/media/media-picker-modal';
import { SIZE_CHART_COLUMNS, footwearFitFor, sizeChartKindFor } from '@/lib/catalog/size-chart';
import { SizeChartEditor } from '@/components/vendor/size-chart-editor';
import { HIDDEN_FROM_SELLERS, categoryPageFor } from '@/lib/category-routes';
import { vendorButton } from '@/components/vendor/vendor-ui';
import { ProductPricingSection } from '@/components/vendor/product-pricing-section';

import { CometSpinner } from '@/components/ui/loading-spinner';
export interface CategoryOption {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  parent?: { id: string; name: string; slug: string } | null;
  children?: Array<{ id: string; name: string; slug: string; description?: string | null }>;
}

export interface ProductVariantItem {
  id?: string;
  size: string;
  color: string;
  sku: string;
  price: string;
  stock: string;
  imageUrl?: string;
  /** Structured values of this variant (e.g. capacity, energy rating) for categories with templates. */
  attributes?: ProductAttributes;
}

export interface ProductFormProps {
  mode: 'create' | 'edit';
  productId?: string;
  initialData?: any;
  /** Inside a page that has its own heading (Add a product): hide the form's header. */
  embedded?: boolean;
}

const DRAFT_STORAGE_KEY = 'vyntra_vendor_product_draft';

interface ProductDraft {
  savedAt: string;
  title: string;
  subtitle: string;
  brand: string;
  categoryId: string;
  selectedPath: string[];
  isCustomized: boolean;
  price: string;
  originalPrice: string;
  images: Array<{ id: string; url: string; isPrimary: boolean }>;
  hasVariants: boolean;
  standardStock: string;
  variants: ProductVariantItem[];
  selectedSizes: string[];
  customAddedSizes: string[];
  description: string;
  highlights: string[];
  specs: Array<{ label: string; value: string }>;
  aplusData?: APlusData;
  attributes?: Record<string, string>;
}

const COMMON_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free Size'];
const COMMON_COLORS = [
  { name: 'Royal Navy Blue', hex: '#00288e' },
  { name: 'Deep Crimson Red', hex: '#800020' },
  { name: 'Emerald Forest Green', hex: '#005a36' },
  { name: 'Heritage Gold', hex: '#FFD814' },
  { name: 'Onyx Jet Black', hex: '#111111' },
  { name: 'Ivory Raw Silk', hex: '#FFFFF0' },
  { name: 'Blush Terracotta', hex: '#E07A5F' },
];

/** Text inputs across the form. */
const inputClass =
  'w-full rounded-lg border border-[#D5D9D9] bg-white px-3 py-2 text-sm focus:border-[#007185] focus:outline-none focus:ring-1 focus:ring-[#007185]';

export function ProductForm({ mode, productId, initialData, embedded = false }: ProductFormProps) {
  const router = useRouter();

  // Basic Information
  const [title, setTitle] = useState(initialData?.title || '');
  const [subtitle, setSubtitle] = useState(initialData?.subtitle || '');
  const [brand, setBrand] = useState(initialData?.brand || '');
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || '');
  const [isCustomized, setIsCustomized] = useState<boolean>(initialData?.isCustomized ?? false);

  // Pricing
  const [price, setPrice] = useState(initialData?.price ? String(initialData.price) : '');
  const [originalPrice, setOriginalPrice] = useState(initialData?.originalPrice ? String(initialData.originalPrice) : '');
  const [productUid] = useState(() => Math.random().toString(36).substring(2, 6).toUpperCase());
  const [skuPrefix, setSkuPrefix] = useState('');

  // Media
  const [images, setImages] = useState<Array<{ id: string; url: string; isPrimary: boolean }>>(
    initialData?.images && initialData.images.length > 0
      ? initialData.images.map((img: any, idx: number) => ({
          id: img.id || `img-${idx}`,
          url: img.url,
          isPrimary: Boolean(img.isPrimary || idx === 0),
        }))
      : []
  );
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);

  // Central Media Manager Integration (Phase 6)
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [mediaTarget, setMediaTarget] = useState<'gallery' | { type: 'variant'; index: number }>('gallery');

  const handleSelectMediaAsset = (asset: SelectedMedia) => {
    if (mediaTarget === 'gallery') {
      setImages((prev) => [
        ...prev,
        {
          id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          url: asset.url,
          isPrimary: prev.length === 0,
        },
      ]);
    } else if (mediaTarget.type === 'variant') {
      handleUpdateVariant(mediaTarget.index, 'imageUrl', asset.url);
    }
  };

  // Variants & Inventory
  const [hasVariants, setHasVariants] = useState<boolean>(
    initialData?.variants && initialData.variants.length > 1 ? true : false
  );
  const [standardStock, setStandardStock] = useState(
    initialData?.totalStock !== undefined ? String(initialData.totalStock) : ''
  );
  const [variants, setVariants] = useState<ProductVariantItem[]>(
    initialData?.variants && initialData.variants.length > 0
      ? initialData.variants.map((v: any) => ({
          id: v.id,
          size: v.size || (v.sku?.includes('FREE') ? 'Free Size' : 'Standard'),
          color: v.color || 'Classic',
          sku: v.sku || '',
          price: v.price ? String(v.price) : '',
          stock: v.stock !== undefined ? String(v.stock) : '',
          imageUrl: v.imageUrl || '',
          attributes: v.attributes && Object.keys(v.attributes).length > 0 ? v.attributes : undefined,
        }))
      : []
  );

  // Amazon-Style Variations Builder State
  const [builderColor, setBuilderColor] = useState('');
  const [selectedSizes, setSelectedSizes] = useState<string[]>(['S', 'M', 'L', 'XL', '2XL']);

  // Dynamic Appliance & Universal Custom Variant State
  const [customCapacityValue, setCustomCapacityValue] = useState('');
  const [customStarRating, setCustomStarRating] = useState('3 Star');
  const [customExtraSpec, setCustomExtraSpec] = useState('');
  const [universalCustomVariant, setUniversalCustomVariant] = useState('');
  const [customAddedSizes, setCustomAddedSizes] = useState<string[]>([]);

  // Description & Highlights
  const [description, setDescription] = useState(initialData?.description || '');
  const [highlights, setHighlights] = useState<string[]>(
    Array.isArray(initialData?.highlights) && initialData.highlights.length > 0
      ? initialData.highlights
      : []
  );
  const [newHighlight, setNewHighlight] = useState('');

  // Specifications
  // Category-specific attributes (capacity, type, energy rating...). Kept as strings while editing.
  const [attributes, setAttributes] = useState<Record<string, string>>(() => {
    const init = initialData?.attributes;
    if (!init || typeof init !== 'object') return {};
    return Object.fromEntries(Object.entries(init).map(([k, v]) => [k, String(v)]));
  });
  const [showAttributeErrors, setShowAttributeErrors] = useState(false);

  const [specs, setSpecs] = useState<Array<{ label: string; value: string }>>(
    Array.isArray(initialData?.specs) && initialData.specs.length > 0
      ? initialData.specs
      : [
          { label: 'Country of Origin', value: '' },
        ]
  );

  // Size chart: size -> one value per measurement column (columns depend on the category).
  const [chartValues, setChartValues] = useState<Record<string, string[]>>(() => {
    const rows = initialData?.sizeChart?.rows;
    if (!Array.isArray(rows)) return {};
    return Object.fromEntries(rows.map((r: any) => [String(r.size), Array.isArray(r.values) ? r.values.map(String) : []]));
  });

  // Amazon A+ Rich Product Description Modules (Optional - defaults to empty)
  const [aplusData, setAplusData] = useState<APlusData>(() => {
    if (initialData?.aplus && Array.isArray(initialData.aplus.modules) && initialData.aplus.modules.length > 0) {
      return initialData.aplus;
    }
    return {
      headerTitle: '',
      headerSubtitle: '',
      headerStyle: 'clean_minimal',
      modules: [],
    };
  });

  // Meta & Categories
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Dynamic Miller Columns Path for Amazon-style Pathfinder
  const [selectedPath, setSelectedPath] = useState<string[]>([]);

  // Fetch categories on mount
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch('/api/vendor/categories');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setCategories(
            json.data.filter((c: CategoryOption) => !HIDDEN_FROM_SELLERS.has(c.slug) || c.id === initialData?.categoryId)
          );
        }
      } catch (err) {
        console.warn('Failed to fetch categories:', err);
      } finally {
        setIsLoadingCategories(false);
      }
    }
    loadCategories();
  }, []);

  // Auto-Save Draft & Crash Recovery State
  const [existingDraft, setExistingDraft] = useState<ProductDraft | null>(null);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [lastAutoSavedTime, setLastAutoSavedTime] = useState<string | null>(null);

  const isFormDirty = Boolean(
    title.trim() ||
    brand.trim() ||
    price.trim() ||
    categoryId ||
    images.length > 0 ||
    variants.length > 0 ||
    description.trim() ||
    highlights.length > 0 ||
    (specs && specs.length > 1)
  );

  // Level 1: Accidental window close or refresh warning (beforeunload)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (mode === 'create' && isFormDirty && !isSubmitting) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [mode, isFormDirty, isSubmitting]);

  // Level 2: Check for existing draft on mount (only in create mode)
  useEffect(() => {
    if (mode !== 'create') return;
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed: ProductDraft = JSON.parse(saved);
        if (parsed && (parsed.title || parsed.brand || parsed.price || (parsed.images && parsed.images.length > 0))) {
          setExistingDraft(parsed);
          setShowDraftModal(true);
        }
      }
    } catch (err) {
      console.warn('[ProductDraft Parse Warning]', err);
    }
  }, [mode]);

  // Level 2: Debounced background auto-save to localStorage
  useEffect(() => {
    if (mode !== 'create') return;
    if (!isFormDirty || isSubmitting) return;

    const timer = setTimeout(() => {
      try {
        const draft: ProductDraft = {
          savedAt: new Date().toISOString(),
          title,
          subtitle,
          brand,
          categoryId,
          selectedPath,
          isCustomized,
          price,
          originalPrice,
          images,
          hasVariants,
          standardStock,
          variants,
          selectedSizes,
          customAddedSizes,
          description,
          highlights,
          specs,
          aplusData,
          attributes,
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
        const now = new Date();
        setLastAutoSavedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } catch (err) {
        console.warn('[Auto-save Draft Warning]', err);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [
    mode,
    isFormDirty,
    isSubmitting,
    title,
    subtitle,
    brand,
    categoryId,
    selectedPath,
    isCustomized,
    price,
    originalPrice,
    images,
    hasVariants,
    standardStock,
    variants,
    selectedSizes,
    customAddedSizes,
    description,
    highlights,
    specs,
    aplusData,
    attributes,
  ]);

  const handleRestoreDraft = () => {
    if (!existingDraft) return;
    if (existingDraft.title !== undefined) setTitle(existingDraft.title);
    if (existingDraft.subtitle !== undefined) setSubtitle(existingDraft.subtitle);
    if (existingDraft.brand !== undefined) setBrand(existingDraft.brand);
    if (existingDraft.categoryId !== undefined) setCategoryId(existingDraft.categoryId);
    if (existingDraft.selectedPath !== undefined) setSelectedPath(existingDraft.selectedPath);
    if (existingDraft.isCustomized !== undefined) setIsCustomized(existingDraft.isCustomized);
    if (existingDraft.price !== undefined) setPrice(existingDraft.price);
    if (existingDraft.originalPrice !== undefined) setOriginalPrice(existingDraft.originalPrice);
    if (existingDraft.images !== undefined) setImages(existingDraft.images);
    if (existingDraft.hasVariants !== undefined) setHasVariants(existingDraft.hasVariants);
    if (existingDraft.standardStock !== undefined) setStandardStock(existingDraft.standardStock);
    if (existingDraft.variants !== undefined) setVariants(existingDraft.variants);
    if (existingDraft.selectedSizes !== undefined) setSelectedSizes(existingDraft.selectedSizes);
    if (existingDraft.customAddedSizes !== undefined) setCustomAddedSizes(existingDraft.customAddedSizes);
    if (existingDraft.description !== undefined) setDescription(existingDraft.description);
    if (existingDraft.highlights !== undefined) setHighlights(existingDraft.highlights);
    if (existingDraft.specs !== undefined) setSpecs(existingDraft.specs);
    if (existingDraft.aplusData !== undefined) setAplusData(existingDraft.aplusData);
    if (existingDraft.attributes !== undefined) setAttributes(existingDraft.attributes);

    setShowDraftModal(false);
    setSuccessMessage('Your unsaved product is back.');
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {}
    setExistingDraft(null);
    setShowDraftModal(false);
  };

  // Category quick filter state
  const [categorySearchQuery, setCategorySearchQuery] = useState('');

  // Map category by ID and parent-child hierarchy
  const { byId, childrenMap, rootCategories } = React.useMemo(() => {
    const byId = new Map<string, CategoryOption>();
    const childrenMap = new Map<string, CategoryOption[]>();
    const rootCategories: CategoryOption[] = [];

    for (const c of categories) {
      byId.set(c.id, c);
      if (c.parentId) {
        if (!childrenMap.has(c.parentId)) childrenMap.set(c.parentId, []);
        childrenMap.get(c.parentId)!.push(c);
      } else {
        rootCategories.push(c);
      }
    }

    return { byId, childrenMap, rootCategories };
  }, [categories]);

  // Ancestry path tracer: root -> leaf
  const getCategoryAncestry = React.useCallback(
    (catId: string): CategoryOption[] => {
      if (!catId || !byId.has(catId)) return [];
      const trail: CategoryOption[] = [];
      let curr: CategoryOption | undefined = byId.get(catId);
      while (curr) {
        trail.unshift(curr);
        if (!curr.parentId) break;
        curr = byId.get(curr.parentId);
      }
      return trail;
    },
    [byId]
  );

  // Sync columns with current categoryId or default to Fashion root
  useEffect(() => {
    if (!categories.length) return;

    if (categoryId && byId.has(categoryId)) {
      const trail = getCategoryAncestry(categoryId);
      setSelectedPath(trail.map((t) => t.id));
    } else if (!categoryId && rootCategories.length > 0) {
      const fashion = rootCategories.find((r) => r.slug === 'fashion') || rootCategories[0];
      if (fashion) {
        setSelectedPath([fashion.id]);
      }
    }
  }, [categoryId, categories, byId, rootCategories, getCategoryAncestry]);

  // Dynamic Miller Columns computation
  const pathfinderColumns = React.useMemo(() => {
    if (!categories.length) return [];

    const levelTitles = [
      '1. Department',
      '2. Section',
      '3. Category',
      '4. Sub-Category',
      '5. Product Type (Leaf)',
      '6. Classification',
    ];

    const cols: Array<{
      levelIndex: number;
      title: string;
      items: CategoryOption[];
      selectedId?: string;
    }> = [];

    // Column 0: Root Departments
    cols.push({
      levelIndex: 0,
      title: levelTitles[0],
      items: rootCategories,
      selectedId: selectedPath[0],
    });

    // Subsequent columns based on selected category at previous level
    for (let i = 0; i < selectedPath.length; i++) {
      const parentId = selectedPath[i];
      const children = childrenMap.get(parentId) || [];
      if (children.length > 0) {
        cols.push({
          levelIndex: i + 1,
          title: levelTitles[i + 1] || `${i + 1}. Classification`,
          items: children,
          selectedId: selectedPath[i + 1],
        });
      }
    }

    return cols;
  }, [categories, rootCategories, selectedPath, childrenMap]);

  // Search results for category autocomplete
  const searchResults = React.useMemo(() => {
    const q = categorySearchQuery.trim().toLowerCase();
    if (!q || q.length < 2) return [];

    const results: Array<{
      category: CategoryOption;
      trail: CategoryOption[];
      pathString: string;
      isLeaf: boolean;
    }> = [];

    for (const c of categories) {
      const trail = getCategoryAncestry(c.id);
      const pathString = trail.map((t) => t.name).join(' › ');
      // Words must start with the query ("tops" finds Tops & Tees, not Laptops).
      const escaped = q.replace(/[^a-z0-9\s]/gi, (ch) => `\\${ch}`);
      const startsWord = (text: string) => new RegExp(`(^|[^a-z0-9])${escaped}`, 'i').test(text);
      const matchName = startsWord(c.name);
      const matchSlug = startsWord(c.slug.replace(/-/g, ' '));
      const matchPath = startsWord(pathString);

      const children = childrenMap.get(c.id) || [];
      // Only final categories can be chosen, so only they are offered.
      if ((matchName || matchSlug || matchPath) && children.length === 0) {
        results.push({
          category: c,
          trail,
          pathString,
          isLeaf: children.length === 0,
        });
      }
    }

    // Sort: leaves first, then alphabetically
    results.sort((a, b) => {
      if (a.isLeaf && !b.isLeaf) return -1;
      if (!a.isLeaf && b.isLeaf) return 1;
      return a.pathString.localeCompare(b.pathString);
    });

    return results.slice(0, 10);
  }, [categorySearchQuery, categories, getCategoryAncestry, childrenMap]);


  const activeCategory = React.useMemo(() => {
    if (!categoryId || !byId.has(categoryId)) return null;
    const cat = byId.get(categoryId)!;
    const trail = getCategoryAncestry(categoryId);
    const parent = cat.parentId ? byId.get(cat.parentId) : undefined;
    return {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      parentSlug: parent?.slug,
      parentName: parent?.name,
      trail,
      fullPath: trail.map((t) => t.name).join(' › '),
    };
  }, [categoryId, byId, getCategoryAncestry]);

  /** The chosen category is a final one (no sub-categories), as listing pages require. */
  const isFinalCategory = Boolean(categoryId) && (childrenMap.get(categoryId) || []).length === 0;

  // Product type template for the chosen category (null when the category has none).
  const attributeTemplate = React.useMemo(
    () => getTemplateForCategoryPath((activeCategory?.trail || []).map((t) => t.slug)),
    [activeCategory]
  );

  // Attributes that can differ per variant (e.g. AC capacity, energy rating) and those every variant sets.
  const variantDefs = React.useMemo(() => getVariantDefs(attributeTemplate), [attributeTemplate]);
  const keysFromVariants = React.useMemo(
    () => (hasVariants ? keysProvidedByAllVariants(attributeTemplate, variants.map((v) => v.attributes || {})) : []),
    [hasVariants, attributeTemplate, variants]
  );

  // Which size chart the category takes, and the sizes it has rows for (from the variants).
  const categorySlugs = React.useMemo(() => (activeCategory?.trail || []).map((t) => t.slug), [activeCategory]);
  const chartKind = React.useMemo(() => sizeChartKindFor(categorySlugs), [categorySlugs]);
  const chartFit = React.useMemo(() => footwearFitFor(categorySlugs), [categorySlugs]);
  const chartSizes = React.useMemo(() => {
    if (!hasVariants) return [];
    const seen = new Set<string>();
    return variants
      .map((v) => v.size.trim())
      .filter((size) => size && !/^(standard|free size)$/i.test(size) && !seen.has(size.toLowerCase()) && seen.add(size.toLowerCase()));
  }, [hasVariants, variants]);

  const isFreeSizeCategory = React.useMemo(() => {
    const slug = (activeCategory?.slug || '').toLowerCase();
    const name = (activeCategory?.name || '').toLowerCase();
    const fullPath = (activeCategory?.fullPath || '').toLowerCase();
    return (
      slug.includes('saree') ||
      name.includes('saree') ||
      fullPath.includes('saree') ||
      slug.includes('shawl') ||
      name.includes('shawl') ||
      slug.includes('dupatta') ||
      name.includes('dupatta') ||
      slug.includes('jewel') ||
      name.includes('jewel') ||
      slug.includes('bag') ||
      name.includes('bag') ||
      slug.includes('wallet') ||
      name.includes('wallet')
    );
  }, [activeCategory]);

  const isFootwearCategory = React.useMemo(() => {
    const slug = (activeCategory?.slug || '').toLowerCase();
    const name = (activeCategory?.name || '').toLowerCase();
    const fullPath = (activeCategory?.fullPath || '').toLowerCase();
    const pathStr = selectedPath.join(' ').toLowerCase();
    const titleLower = (title || '').toLowerCase();
    return (
      slug.includes('shoe') ||
      slug.includes('footwear') ||
      slug.includes('sneaker') ||
      slug.includes('sandal') ||
      slug.includes('boot') ||
      slug.includes('loafer') ||
      slug.includes('jutti') ||
      slug.includes('mojri') ||
      slug.includes('clog') ||
      name.includes('shoe') ||
      name.includes('footwear') ||
      name.includes('sneaker') ||
      name.includes('sandal') ||
      fullPath.includes('shoe') ||
      fullPath.includes('footwear') ||
      pathStr.includes('shoe') ||
      pathStr.includes('footwear') ||
      titleLower.includes('shoe') ||
      titleLower.includes('sneaker') ||
      titleLower.includes('sandal') ||
      titleLower.includes('footwear')
    );
  }, [activeCategory, selectedPath, title]);

  const isAudioCategory = React.useMemo(() => {
    const slug = (activeCategory?.slug || '').toLowerCase();
    const name = (activeCategory?.name || '').toLowerCase();
    const pathStr = selectedPath.join(' ').toLowerCase();
    const titleLower = (title || '').toLowerCase();
    return (
      slug.includes('headphone') ||
      slug.includes('earphone') ||
      slug.includes('earbud') ||
      slug.includes('audio') ||
      slug.includes('speaker') ||
      slug.includes('soundbar') ||
      name.includes('headphone') ||
      name.includes('earphone') ||
      name.includes('audio') ||
      name.includes('speaker') ||
      pathStr.includes('audio') ||
      pathStr.includes('headphone') ||
      titleLower.includes('headphone') ||
      titleLower.includes('earphone') ||
      titleLower.includes('earbud') ||
      titleLower.includes('speaker') ||
      titleLower.includes('soundbar') ||
      titleLower.includes('tws') ||
      titleLower.includes('airpods') ||
      titleLower.includes('tune 7') ||
      titleLower.includes('tune 5') ||
      titleLower.includes('over ear') ||
      titleLower.includes('in-ear')
    );
  }, [activeCategory, selectedPath, title]);

  const isLaptopCategory = React.useMemo(() => {
    const slug = (activeCategory?.slug || '').toLowerCase();
    const name = (activeCategory?.name || '').toLowerCase();
    const pathStr = selectedPath.join(' ').toLowerCase();
    const titleLower = (title || '').toLowerCase();
    return (
      slug.includes('laptop') ||
      slug.includes('notebook') ||
      slug.includes('macbook') ||
      name.includes('laptop') ||
      pathStr.includes('laptop') ||
      titleLower.includes('laptop') ||
      titleLower.includes('macbook') ||
      titleLower.includes('ultrabook') ||
      titleLower.includes('ai pc') ||
      titleLower.includes('intel core') ||
      titleLower.includes('ryzen')
    );
  }, [activeCategory, selectedPath, title]);

  const isSmartwatchCategory = React.useMemo(() => {
    const slug = (activeCategory?.slug || '').toLowerCase();
    const name = (activeCategory?.name || '').toLowerCase();
    const pathStr = selectedPath.join(' ').toLowerCase();
    const titleLower = (title || '').toLowerCase();
    return (
      slug.includes('smartwatch') ||
      slug.includes('wearable') ||
      name.includes('smartwatch') ||
      titleLower.includes('smartwatch') ||
      titleLower.includes('smart watch') ||
      titleLower.includes('apple watch') ||
      titleLower.includes('galaxy watch')
    );
  }, [activeCategory, selectedPath, title]);

  const isTabletCategory = React.useMemo(() => {
    const slug = (activeCategory?.slug || '').toLowerCase();
    const name = (activeCategory?.name || '').toLowerCase();
    const pathStr = selectedPath.join(' ').toLowerCase();
    const titleLower = (title || '').toLowerCase();
    return (
      slug.includes('tablet') ||
      slug.includes('ipad') ||
      name.includes('tablet') ||
      titleLower.includes('tablet') ||
      titleLower.includes('ipad')
    );
  }, [activeCategory, selectedPath, title]);

  const isCameraCategory = React.useMemo(() => {
    const slug = (activeCategory?.slug || '').toLowerCase();
    const name = (activeCategory?.name || '').toLowerCase();
    const pathStr = selectedPath.join(' ').toLowerCase();
    const titleLower = (title || '').toLowerCase();
    return (
      slug.includes('camera') ||
      slug.includes('photography') ||
      slug.includes('dslr') ||
      slug.includes('mirrorless') ||
      name.includes('camera') ||
      name.includes('photography') ||
      pathStr.includes('camera') ||
      pathStr.includes('photography') ||
      titleLower.includes('camera') ||
      titleLower.includes('dslr') ||
      titleLower.includes('mirrorless') ||
      titleLower.includes('alpha ilce') ||
      titleLower.includes('eos r') ||
      titleLower.includes('gopro') ||
      titleLower.includes('action cam') ||
      titleLower.includes('lens kit')
    );
  }, [activeCategory, selectedPath, title]);

  const isRefrigeratorCategory = React.useMemo(() => {
    const slug = (activeCategory?.slug || '').toLowerCase();
    const name = (activeCategory?.name || '').toLowerCase();
    const pathStr = selectedPath.join(' ').toLowerCase();
    const titleLower = (title || '').toLowerCase();
    return (
      slug.includes('refrigerator') ||
      name.includes('refrigerator') ||
      pathStr.includes('refrigerator') ||
      titleLower.includes('refrigerator') ||
      titleLower.includes('fridge')
    );
  }, [activeCategory, selectedPath, title]);

  const isWashingMachineCategory = React.useMemo(() => {
    const slug = (activeCategory?.slug || '').toLowerCase();
    const name = (activeCategory?.name || '').toLowerCase();
    const pathStr = selectedPath.join(' ').toLowerCase();
    const titleLower = (title || '').toLowerCase();
    return (
      slug.includes('washing-machine') ||
      name.includes('washing') ||
      pathStr.includes('washing') ||
      titleLower.includes('washing machine') ||
      titleLower.includes('washer')
    );
  }, [activeCategory, selectedPath, title]);

  const isAirConditionerCategory = React.useMemo(() => {
    const slug = (activeCategory?.slug || '').toLowerCase();
    const name = (activeCategory?.name || '').toLowerCase();
    const pathStr = selectedPath.join(' ').toLowerCase();
    const titleLower = (title || '').toLowerCase();
    return (
      slug.includes('air-conditioner') ||
      name.includes('conditioner') ||
      pathStr.includes('conditioner') ||
      titleLower.includes('air conditioner') ||
      titleLower.includes('split ac') ||
      titleLower.includes('inverter ac') ||
      /\bac\b/i.test(titleLower)
    );
  }, [activeCategory, selectedPath, title]);

  const isAirCoolerCategory = React.useMemo(() => {
    const slug = (activeCategory?.slug || '').toLowerCase();
    const name = (activeCategory?.name || '').toLowerCase();
    const pathStr = selectedPath.join(' ').toLowerCase();
    const titleLower = (title || '').toLowerCase();
    return (
      slug.includes('cooler') ||
      name.includes('cooler') ||
      pathStr.includes('cooler') ||
      titleLower.includes('cooler')
    );
  }, [activeCategory, selectedPath, title]);

  const isWaterPurifierCategory = React.useMemo(() => {
    const slug = (activeCategory?.slug || '').toLowerCase();
    const name = (activeCategory?.name || '').toLowerCase();
    const pathStr = selectedPath.join(' ').toLowerCase();
    const titleLower = (title || '').toLowerCase();
    return (
      slug.includes('purifier') ||
      name.includes('purifier') ||
      pathStr.includes('purifier') ||
      titleLower.includes('water purifier') ||
      titleLower.includes('purifier')
    );
  }, [activeCategory, selectedPath, title]);

  const isGeyserCategory = React.useMemo(() => {
    const slug = (activeCategory?.slug || '').toLowerCase();
    const name = (activeCategory?.name || '').toLowerCase();
    const pathStr = selectedPath.join(' ').toLowerCase();
    const titleLower = (title || '').toLowerCase();
    return (
      slug.includes('geyser') ||
      slug.includes('water-heater') ||
      name.includes('geyser') ||
      name.includes('heater') ||
      pathStr.includes('geyser') ||
      titleLower.includes('geyser') ||
      titleLower.includes('water heater')
    );
  }, [activeCategory, selectedPath, title]);

  const isDryerCategory = React.useMemo(() => {
    const slug = (activeCategory?.slug || '').toLowerCase();
    const name = (activeCategory?.name || '').toLowerCase();
    const pathStr = selectedPath.join(' ').toLowerCase();
    const titleLower = (title || '').toLowerCase();
    return (
      slug.includes('dryer') ||
      name.includes('dryer') ||
      pathStr.includes('dryer') ||
      titleLower.includes('hair dryer') ||
      titleLower.includes('dryer')
    );
  }, [activeCategory, selectedPath, title]);

  const isMicrowaveCategory = React.useMemo(() => {
    const slug = (activeCategory?.slug || '').toLowerCase();
    const name = (activeCategory?.name || '').toLowerCase();
    const pathStr = selectedPath.join(' ').toLowerCase();
    const titleLower = (title || '').toLowerCase();
    return (
      slug.includes('microwave') ||
      slug.includes('oven') ||
      name.includes('microwave') ||
      name.includes('oven') ||
      pathStr.includes('microwave') ||
      titleLower.includes('microwave') ||
      titleLower.includes('convection')
    );
  }, [activeCategory, selectedPath, title]);

  const isAirFryerCategory = React.useMemo(() => {
    const slug = (activeCategory?.slug || '').toLowerCase();
    const name = (activeCategory?.name || '').toLowerCase();
    const pathStr = selectedPath.join(' ').toLowerCase();
    const titleLower = (title || '').toLowerCase();
    return (
      slug.includes('fryer') ||
      name.includes('fryer') ||
      pathStr.includes('fryer') ||
      titleLower.includes('air fryer') ||
      titleLower.includes('fryer')
    );
  }, [activeCategory, selectedPath, title]);

  const isChimneyCategory = React.useMemo(() => {
    const slug = (activeCategory?.slug || '').toLowerCase();
    const name = (activeCategory?.name || '').toLowerCase();
    const pathStr = selectedPath.join(' ').toLowerCase();
    const titleLower = (title || '').toLowerCase();
    return (
      slug.includes('chimney') ||
      name.includes('chimney') ||
      pathStr.includes('chimney') ||
      titleLower.includes('chimney') ||
      titleLower.includes('exhaust hood')
    );
  }, [activeCategory, selectedPath, title]);

  const isMixerInductionCategory = React.useMemo(() => {
    const slug = (activeCategory?.slug || '').toLowerCase();
    const name = (activeCategory?.name || '').toLowerCase();
    const pathStr = selectedPath.join(' ').toLowerCase();
    const titleLower = (title || '').toLowerCase();
    return (
      slug.includes('mixer') ||
      slug.includes('grinder') ||
      slug.includes('induction') ||
      slug.includes('cooktop') ||
      name.includes('mixer') ||
      name.includes('induction') ||
      pathStr.includes('mixer') ||
      titleLower.includes('mixer grinder') ||
      titleLower.includes('induction') ||
      titleLower.includes('cooktop')
    );
  }, [activeCategory, selectedPath, title]);

  const isDishwasherCategory = React.useMemo(() => {
    const slug = (activeCategory?.slug || '').toLowerCase();
    const name = (activeCategory?.name || '').toLowerCase();
    const pathStr = selectedPath.join(' ').toLowerCase();
    const titleLower = (title || '').toLowerCase();
    return (
      slug.includes('dishwasher') ||
      name.includes('dishwasher') ||
      pathStr.includes('dishwasher') ||
      titleLower.includes('dishwasher')
    );
  }, [activeCategory, selectedPath, title]);

  const isVacuumCleanerCategory = React.useMemo(() => {
    const slug = (activeCategory?.slug || '').toLowerCase();
    const name = (activeCategory?.name || '').toLowerCase();
    const pathStr = selectedPath.join(' ').toLowerCase();
    const titleLower = (title || '').toLowerCase();
    return (
      slug.includes('vacuum') ||
      name.includes('vacuum') ||
      pathStr.includes('vacuum') ||
      titleLower.includes('vacuum cleaner') ||
      titleLower.includes('vacuum')
    );
  }, [activeCategory, selectedPath, title]);

  const isApplianceCategory = React.useMemo(() => {
    const slug = (activeCategory?.slug || '').toLowerCase();
    const name = (activeCategory?.name || '').toLowerCase();
    const pathStr = selectedPath.join(' ').toLowerCase();
    return (
      isRefrigeratorCategory ||
      isWashingMachineCategory ||
      isAirConditionerCategory ||
      isAirCoolerCategory ||
      isWaterPurifierCategory ||
      isGeyserCategory ||
      isDryerCategory ||
      isMicrowaveCategory ||
      isAirFryerCategory ||
      isChimneyCategory ||
      isMixerInductionCategory ||
      isDishwasherCategory ||
      isVacuumCleanerCategory ||
      slug.includes('appliance') ||
      name.includes('appliance') ||
      pathStr.includes('appliance')
    );
  }, [
    isRefrigeratorCategory,
    isWashingMachineCategory,
    isAirConditionerCategory,
    isAirCoolerCategory,
    isWaterPurifierCategory,
    isGeyserCategory,
    isDryerCategory,
    isMicrowaveCategory,
    isAirFryerCategory,
    isChimneyCategory,
    isMixerInductionCategory,
    isDishwasherCategory,
    isVacuumCleanerCategory,
    activeCategory,
    selectedPath,
  ]);

  const isBookCategory = React.useMemo(() => {
    const slug = (activeCategory?.slug || '').toLowerCase();
    const name = (activeCategory?.name || '').toLowerCase();
    const pathStr = selectedPath.join(' ').toLowerCase();
    const titleLower = (title || '').toLowerCase();
    return (
      slug.includes('book') ||
      slug.includes('literature') ||
      name.includes('book') ||
      name.includes('literature') ||
      pathStr.includes('book') ||
      pathStr.includes('literature') ||
      titleLower.includes('book') ||
      titleLower.includes('novel') ||
      titleLower.includes('paperback') ||
      titleLower.includes('hardcover') ||
      titleLower.includes('author') ||
      titleLower.includes('isbn') ||
      titleLower.includes('reading')
    );
  }, [activeCategory, selectedPath, title]);

  const isMobileCategory = React.useMemo(() => {
    // Audio, Laptops, Smartwatches, Tablets, Cameras, Appliances, Books are NEVER mobile phones
    if (isAudioCategory || isLaptopCategory || isSmartwatchCategory || isTabletCategory || isCameraCategory || isApplianceCategory || isBookCategory) return false;
    const slug = (activeCategory?.slug || '').toLowerCase();
    const name = (activeCategory?.name || '').toLowerCase();
    const pathStr = selectedPath.join(' ').toLowerCase();
    const titleLower = (title || '').toLowerCase();
    return (
      slug === 'mobiles' ||
      slug === 'smartphones' ||
      name.includes('mobile') ||
      name.includes('smartphone') ||
      pathStr.includes('mobile') ||
      pathStr.includes('smartphone') ||
      titleLower.includes('smartphone') ||
      titleLower.includes('iphone') ||
      titleLower.includes('galaxy s') ||
      /\b(phone|mobile|5g phone)\b/i.test(titleLower)
    );
  }, [isAudioCategory, isLaptopCategory, isSmartwatchCategory, isTabletCategory, isCameraCategory, isApplianceCategory, isBookCategory, activeCategory, selectedPath, title]);

  const isElectronicsCategory = React.useMemo(() => {
    return (
      isMobileCategory ||
      isLaptopCategory ||
      isAudioCategory ||
      isSmartwatchCategory ||
      isTabletCategory ||
      isCameraCategory ||
      (activeCategory?.slug || '').toLowerCase().includes('electronic') ||
      (activeCategory?.name || '').toLowerCase().includes('electronic')
    );
  }, [isMobileCategory, isLaptopCategory, isAudioCategory, isSmartwatchCategory, isTabletCategory, isCameraCategory, activeCategory]);

  const isWomenFootwear = React.useMemo(() => {
    if (!isFootwearCategory) return false;
    const combined = `${activeCategory?.slug || ''} ${activeCategory?.name || ''} ${title || ''} ${selectedPath.join(' ')}`.toLowerCase();
    return (
      combined.includes('women') ||
      combined.includes('girl') ||
      combined.includes('female') ||
      combined.includes('ladies')
    );
  }, [isFootwearCategory, activeCategory, title, selectedPath]);

  const AVAILABLE_SIZES = React.useMemo(() => {
    let base: string[] = [];
    if (isMobileCategory) {
      base = [
        '128 GB',
        '256 GB',
        '512 GB',
        '1 TB',
        '6GB + 128GB',
        '8GB + 128GB',
        '8GB + 256GB',
        '12GB + 256GB',
        '12GB + 512GB',
        '16GB + 512GB',
      ];
    } else if (isCameraCategory) {
      base = [
        'Body Only',
        'With 16-50mm Lens',
        'With 18-135mm Lens',
        'Dual Lens Kit',
        'Creator Kit',
        'Standard Edition',
      ];
    } else if (isRefrigeratorCategory) {
      base = [
        '185 L (2 Star)',
        '215 L (3 Star)',
        '242 L (3 Star)',
        '251 L (1 Star)',
        '260 L (3 Star)',
        '343 L (3 Star)',
        '653 L (Side by Side)',
      ];
    } else if (isWashingMachineCategory) {
      base = [
        '6.5 kg (5 Star)',
        '7.0 kg (5 Star)',
        '7.5 kg (5 Star)',
        '8.0 kg (5 Star)',
        '9.0 kg (5 Star)',
      ];
    } else if (isAirConditionerCategory) {
      base = [
        '1.0 Ton (3 Star)',
        '1.5 Ton (3 Star)',
        '1.5 Ton (5 Star)',
        '2.0 Ton (5 Star)',
      ];
    } else if (isAirCoolerCategory) {
      base = [
        '40 L Personal',
        '55 L Desert',
        '70 L Desert',
        '85 L Desert',
        '100 L Heavy Duty',
      ];
    } else if (isWaterPurifierCategory) {
      base = [
        '7 L (RO+UV)',
        '8 L (RO+UV+UF)',
        '10 L (RO+UV+Copper)',
        '12 L Heavy Storage',
      ];
    } else if (isGeyserCategory) {
      base = [
        '3 L Instant (3000W)',
        '15 L (2000W, 5 Star)',
        '25 L (2000W, 5 Star)',
      ];
    } else if (isDryerCategory) {
      base = [
        '1200 W Compact',
        '1600 W Fast Dry',
        '2000 W Professional',
        '2200 W Salon Grade',
      ];
    } else if (isMicrowaveCategory) {
      base = [
        '20 L Solo',
        '23 L Grill',
        '28 L Convection',
        '32 L Convection',
      ];
    } else if (isAirFryerCategory) {
      base = [
        '4.0 L (1400W)',
        '5.5 L (1800W)',
        '6.5 L (1800W)',
        '8.0 L Dual Basket',
      ];
    } else if (isChimneyCategory) {
      base = [
        '1100 m³/hr (60cm)',
        '1200 m³/hr (60cm)',
        '1350 m³/hr (90cm)',
        '1500 m³/hr Auto-Clean',
      ];
    } else if (isMixerInductionCategory) {
      base = [
        '500 W (3 Jars)',
        '750 W (3 Jars)',
        '1000 W (4 Jars)',
        '2000 W Induction',
      ];
    } else if (isDishwasherCategory) {
      base = [
        '12 Place Settings',
        '14 Place Settings',
        '16 Place Settings',
      ];
    } else if (isVacuumCleanerCategory) {
      base = [
        '1600 W Canister',
        '2000 W Wet & Dry',
        '150 AW Cordless Stick',
        'Robotic Auto-Mop',
      ];
    } else if (isApplianceCategory) {
      base = ['Standard Edition', 'Pro Edition'];
    } else if (isAudioCategory) {
      base = ['Standard Edition', 'Wireless', 'Wired', 'Active ANC Edition'];
    } else if (isLaptopCategory) {
      base = [
        '8GB + 512GB',
        '16GB + 512GB',
        '16GB + 1TB',
        '32GB + 1TB',
        '8GB + 256GB',
        '32GB + 2TB',
      ];
    } else if (isSmartwatchCategory) {
      base = ['40mm', '41mm', '42mm', '44mm', '45mm', '46mm', '49mm'];
    } else if (isTabletCategory) {
      base = ['128 GB', '256 GB', '512 GB', '1 TB', '64 GB'];
    } else if (isElectronicsCategory) {
      base = ['Standard Edition', 'Pro Edition', 'Wireless', '128 GB', '256 GB', '512 GB', '1 TB'];
    } else if (isBookCategory) {
      base = ['Paperback', 'Hardcover', 'Deluxe Edition', 'Box Set'];
    } else if (isFreeSizeCategory) {
      base = ['Free Size'];
    } else if (isFootwearCategory) {
      if (isWomenFootwear) {
        base = ['3 UK', '4 UK', '5 UK', '6 UK', '7 UK', '8 UK', '9 UK'];
      } else {
        base = ['5 UK', '6 UK', '7 UK', '8 UK', '9 UK', '10 UK', '11 UK', '12 UK'];
      }
    } else {
      base = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', 'Free Size'];
    }

    return Array.from(new Set([...customAddedSizes, ...base]));
  }, [
    isMobileCategory,
    isCameraCategory,
    isRefrigeratorCategory,
    isWashingMachineCategory,
    isAirConditionerCategory,
    isAirCoolerCategory,
    isWaterPurifierCategory,
    isGeyserCategory,
    isDryerCategory,
    isMicrowaveCategory,
    isAirFryerCategory,
    isChimneyCategory,
    isMixerInductionCategory,
    isDishwasherCategory,
    isVacuumCleanerCategory,
    isApplianceCategory,
    isAudioCategory,
    isLaptopCategory,
    isSmartwatchCategory,
    isTabletCategory,
    isElectronicsCategory,
    isBookCategory,
    isFreeSizeCategory,
    isFootwearCategory,
    isWomenFootwear,
    customAddedSizes,
  ]);

  useEffect(() => {
    if (isMobileCategory) {
      setSelectedSizes(['128 GB', '256 GB']);
    } else if (isCameraCategory) {
      setSelectedSizes(['Body Only', 'With 18-135mm Lens']);
    } else if (isRefrigeratorCategory) {
      setSelectedSizes(['251 L (1 Star)']);
    } else if (isWashingMachineCategory) {
      setSelectedSizes(['7.0 kg (5 Star)']);
    } else if (isAirConditionerCategory) {
      setSelectedSizes(['1.5 Ton (5 Star)']);
    } else if (isAirCoolerCategory) {
      setSelectedSizes(['70 L Desert']);
    } else if (isWaterPurifierCategory) {
      setSelectedSizes(['8 L (RO+UV+UF)']);
    } else if (isGeyserCategory) {
      setSelectedSizes(['15 L (2000W, 5 Star)']);
    } else if (isDryerCategory) {
      setSelectedSizes(['2000 W Professional']);
    } else if (isMicrowaveCategory) {
      setSelectedSizes(['28 L Convection']);
    } else if (isAirFryerCategory) {
      setSelectedSizes(['5.5 L (1800W)']);
    } else if (isChimneyCategory) {
      setSelectedSizes(['1200 m³/hr (60cm)']);
    } else if (isMixerInductionCategory) {
      setSelectedSizes(['750 W (3 Jars)']);
    } else if (isDishwasherCategory) {
      setSelectedSizes(['14 Place Settings']);
    } else if (isVacuumCleanerCategory) {
      setSelectedSizes(['2000 W Wet & Dry']);
    } else if (isApplianceCategory) {
      setSelectedSizes(['Standard Edition']);
    } else if (isAudioCategory) {
      setSelectedSizes(['Standard Edition']);
    } else if (isLaptopCategory) {
      setSelectedSizes(['16GB + 512GB', '16GB + 1TB']);
    } else if (isSmartwatchCategory) {
      setSelectedSizes(['41mm', '45mm']);
    } else if (isTabletCategory) {
      setSelectedSizes(['128 GB', '256 GB']);
    } else if (isBookCategory) {
      setSelectedSizes(['Paperback', 'Hardcover']);
    } else if (isElectronicsCategory) {
      setSelectedSizes(['Standard Edition']);
    } else if (isFreeSizeCategory) {
      setSelectedSizes(['Free Size']);
    } else if (isFootwearCategory) {
      if (isWomenFootwear) {
        setSelectedSizes(['3 UK', '4 UK', '5 UK', '6 UK', '7 UK', '8 UK']);
      } else {
        setSelectedSizes(['6 UK', '7 UK', '8 UK', '9 UK', '10 UK']);
      }
    } else {
      setSelectedSizes((prev) => {
        const hasShoeSizes = prev.some((s) => s.includes('UK'));
        const hasMobileSizes = prev.some((s) => s.includes('GB') || s.includes('TB'));
        if (hasShoeSizes || hasMobileSizes || prev.includes('Free Size')) {
          return ['S', 'M', 'L', 'XL', '2XL'];
        }
        return prev;
      });
    }
  }, [
    isMobileCategory,
    isCameraCategory,
    isApplianceCategory,
    isAudioCategory,
    isLaptopCategory,
    isSmartwatchCategory,
    isTabletCategory,
    isElectronicsCategory,
    isBookCategory,
    isFreeSizeCategory,
    isFootwearCategory,
    isWomenFootwear,
  ]);


  // Vendor store name
  const [vendorStoreName, setVendorStoreName] = useState<string>('');

  useEffect(() => {
    fetch('/api/vendor/me')
      .then((res) => res.json())
      .then((data) => {
        if (data?.data?.vendorProfile?.storeName) {
          setVendorStoreName(data.data.vendorProfile.storeName);
        }
      })
      .catch(() => {});
  }, []);

  // Auto-generate store-isolated unique SKU prefix
  useEffect(() => {
    // 1. Store identifier (e.g. VAR for Varun Store, TAR for Tarun Store)
    const storeCode = (vendorStoreName || 'VYN')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 3)
      .toUpperCase() || 'VYN';

    // 2. Brand or Title tag
    const brandTag = (brand || title || 'PRD')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 3)
      .toUpperCase() || 'PRD';

    setSkuPrefix(`${storeCode}-${brandTag}-${productUid}`);
  }, [vendorStoreName, brand, title, productUid]);

  // Helper: Discount calculation
  const numericPrice = parseFloat(price) || 0;
  const numericOriginal = parseFloat(originalPrice) || 0;
  const discountPercent =
    numericOriginal > numericPrice && numericPrice > 0
      ? Math.round(((numericOriginal - numericPrice) / numericOriginal) * 100)
      : 0;

  // Image actions
  const handleAddImageUrl = () => {
    const trimmed = imageUrlInput.trim();
    if (!trimmed) return;
    try {
      new URL(trimmed);
    } catch {
      setErrorMessage('That photo link is not valid. It should start with https://');
      return;
    }

    setImages((prev) => [
      ...prev,
      {
        id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        url: trimmed,
        isPrimary: prev.length === 0,
      },
    ]);
    setImageUrlInput('');
  };

  const handleSetPrimaryImage = (index: number) => {
    setImages((prev) =>
      prev.map((img, i) => ({
        ...img,
        isPrimary: i === index,
      }))
    );
    setActivePreviewIndex(index);
  };

  const handleMoveImage = (from: number, direction: 'up' | 'down') => {
    const to = direction === 'up' ? from - 1 : from + 1;
    if (to < 0 || to >= images.length) return;
    const reordered = [...images];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    setImages(reordered);
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      if (filtered.length > 0 && !filtered.some((img) => img.isPrimary)) {
        filtered[0].isPrimary = true;
      }
      return filtered;
    });
    if (activePreviewIndex >= images.length - 1) {
      setActivePreviewIndex(Math.max(0, images.length - 2));
    }
  };


  // Variant actions
  const handleAddVariant = () => {
    setVariants((prev) => {
      const lastColor = prev[prev.length - 1]?.color || 'Classic';
      const cleanTag = lastColor.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'VAR';
      const lastImage = prev[prev.length - 1]?.imageUrl || images[0]?.url || '';
      return [
        ...prev,
        {
          size: 'Free Size',
          color: lastColor,
          sku: `${skuPrefix}-${cleanTag}-${prev.length + 1}`,
          price: price || '',
          stock: '',
          imageUrl: lastImage,
        },
      ];
    });
  };

  // Toggle size selection in Amazon-style builder
  const toggleSize = (sz: string) => {
    setSelectedSizes((prev) =>
      prev.includes(sz) ? prev.filter((s) => s !== sz) : [...prev, sz]
    );
  };

  // Add custom capacity or tailored metric for Appliances
  const handleAddCustomApplianceVariant = () => {
    const num = customCapacityValue.trim();
    let constructed = '';
    if (isRefrigeratorCategory) {
      if (!num) return;
      constructed = `${num} L (${customStarRating || '3 Star'})`;
      if (customExtraSpec) constructed += ` ${customExtraSpec}`;
    } else if (isWashingMachineCategory) {
      if (!num) return;
      constructed = `${num} kg (${customStarRating || '5 Star'})`;
      if (customExtraSpec) constructed += ` ${customExtraSpec}`;
    } else if (isAirConditionerCategory) {
      if (!num) return;
      constructed = `${num} Ton (${customStarRating || '5 Star'})`;
      if (customExtraSpec) constructed += ` ${customExtraSpec}`;
    } else if (isAirCoolerCategory) {
      if (!num) return;
      constructed = `${num} L ${customExtraSpec || 'Desert Cooler'}`.trim();
    } else if (isWaterPurifierCategory) {
      if (!num) return;
      constructed = `${num} L (${customExtraSpec || 'RO+UV+UF'})`;
    } else if (isGeyserCategory) {
      if (!num) return;
      constructed = `${num} L (${customExtraSpec || '2000W, 5 Star'})`;
    } else if (isDryerCategory) {
      if (!num) return;
      constructed = `${num} W ${customExtraSpec || 'Professional'}`.trim();
    } else if (isMicrowaveCategory) {
      if (!num) return;
      constructed = `${num} L (${customExtraSpec || 'Convection'})`;
    } else if (isAirFryerCategory) {
      if (!num) return;
      constructed = `${num} L ${customExtraSpec || '(1800W)'}`.trim();
    } else if (isMixerInductionCategory) {
      if (!num) return;
      constructed = `${num} W ${customExtraSpec || '(3 Jars)'}`.trim();
    } else if (isChimneyCategory) {
      if (!num) return;
      constructed = `${num} m³/hr (${customExtraSpec || '60 cm'})`;
    } else if (isDishwasherCategory) {
      if (!num) return;
      constructed = `${num} Place Settings ${customExtraSpec || ''}`.trim();
    } else if (isVacuumCleanerCategory) {
      if (!num) return;
      constructed = `${num} W ${customExtraSpec || 'Canister'}`.trim();
    } else if (num) {
      constructed = `${num} ${customExtraSpec || ''}`.trim();
    }

    if (constructed) {
      setCustomAddedSizes((prev) => Array.from(new Set([constructed, ...prev])));
      setSelectedSizes((prev) => Array.from(new Set([...prev, constructed])));
      setCustomCapacityValue('');
    }
  };

  // Add universal custom variant tag for any category
  const handleAddUniversalCustomVariant = () => {
    const val = universalCustomVariant.trim();
    if (!val) return;
    setCustomAddedSizes((prev) => Array.from(new Set([val, ...prev])));
    setSelectedSizes((prev) => Array.from(new Set([...prev, val])));
    setUniversalCustomVariant('');
  };

  // Template categories: one variant per combination of variation values, each with its own attributes.
  const handleGenerateAttributeVariants = (combos: GeneratedVariant[], color: string) => {
    const colorTag = color.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase();
    setVariants((prev) => {
      const existing = new Set(prev.map((v) => `${v.size}|${v.color}`.toLowerCase()));
      const fresh: ProductVariantItem[] = [];
      combos.forEach(({ attributes: attrs }) => {
        const label = variantLabel(attributeTemplate, attrs);
        if (!label || existing.has(`${label}|${color}`.toLowerCase())) return;
        existing.add(`${label}|${color}`.toLowerCase());
        const tag = label.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 12);
        fresh.push({
          size: label,
          color,
          sku: `${skuPrefix}-${colorTag ? `${colorTag}-` : ''}${tag}`,
          price: price || '',
          stock: '',
          imageUrl: images[0]?.url || '',
          attributes: attrs,
        });
      });
      return [...prev, ...fresh];
    });
  };

  // Amazon-style: Generate variants from Color + Selected Sizes
  const handleGenerateAmazonVariants = () => {
    const rawColor = builderColor.trim();
    if (!rawColor) {
      setErrorMessage('Enter a colour first, for example Black.');
      return;
    }
    let effectiveSizes = [...selectedSizes];
    if (effectiveSizes.length === 0) {
      if (isAudioCategory) {
        effectiveSizes = ['Standard Edition'];
      } else if (isCameraCategory) {
        effectiveSizes = ['Body Only'];
      } else {
        setErrorMessage(isFootwearCategory ? 'Select at least one shoe size.' : 'Select at least one size.');
        return;
      }
    }
    const cleanTag = rawColor.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'COL';
    const newItems: ProductVariantItem[] = effectiveSizes.map((sz) => ({
      size: sz,
      color: rawColor,
      sku: `${skuPrefix}-${cleanTag}-${sz}`,
      price: price || '',
      stock: '',
      imageUrl: images[0]?.url || '',
    }));
    setVariants((prev) => [...prev, ...newItems]);
    setBuilderColor('');
  };

  // Clear all variants from matrix
  const handleClearAllVariants = () => {
    if (confirm('Remove all variants? You can add them again.')) {
      setVariants([]);
    }
  };

  // Quick sync swatch photo to all sizes of the same color
  const handleSyncSwatchForColor = (targetColor: string, imageUrl: string) => {
    if (!targetColor || !imageUrl) return;
    setVariants((prev) =>
      prev.map((v) =>
        v.color.trim().toLowerCase() === targetColor.trim().toLowerCase()
          ? { ...v, imageUrl }
          : v
      )
    );
  };

  const handleUpdateVariant = (index: number, field: keyof ProductVariantItem, val: string) => {
    setVariants((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleRemoveVariant = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  // Highlights & Specs
  const handleAddHighlight = () => {
    if (!newHighlight.trim()) return;
    setHighlights((prev) => [...prev, newHighlight.trim()]);
    setNewHighlight('');
  };

  const handleRemoveHighlight = (idx: number) => {
    setHighlights((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddSpec = () => {
    setSpecs((prev) => [...prev, { label: '', value: '' }]);
  };

  const handleRemoveSpec = (idx: number) => {
    setSpecs((prev) => prev.filter((_, i) => i !== idx));
  };

  // Submission handler (Draft or Publish)
  const handleSubmit = async (publishIntent: boolean) => {
    setErrorMessage('');
    setSuccessMessage('');

    // Validation
    if (!title.trim()) {
      setErrorMessage('Please enter a product title.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!brand.trim()) {
      setErrorMessage('Please enter the brand.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!categoryId || !isFinalCategory) {
      setErrorMessage(categoryId ? 'Please choose a more specific category.' : 'Please choose a category.');
      document.getElementById('category-search')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    // Required category details are needed to publish (drafts may be incomplete).
    const attributeCheck = validateAttributes(attributeTemplate, attributes, {
      enforceRequired: publishIntent,
      satisfiedKeys: keysFromVariants,
    });
    if (attributeCheck.errors.length > 0) {
      setShowAttributeErrors(true);
      setErrorMessage(attributeCheck.errors[0]);
      document.getElementById('product-attributes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (!price || numericPrice <= 0) {
      setErrorMessage('Please specify a valid base price greater than 0.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (images.length === 0) {
      setErrorMessage('Add at least one photo of the product.');
      window.scrollTo({ top: 400, behavior: 'smooth' });
      return;
    }
    if (hasVariants && variants.length === 0) {
      setErrorMessage('Add at least one variant, or switch to One option.');
      window.scrollTo({ top: 1200, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);

    try {
      // Sanitize A+ Content: strip unconfigured/empty/duplicate modules before saving
      const cleanedAplusModules = (aplusData.modules || []).filter((mod) => {
        if (!mod || !mod.type) return false;

        if (mod.type === 'feature_cards_3' || mod.type === 'feature_cards_4') {
          const cards = mod.cards || [];
          const validCards = cards.filter((c) => {
            const hasRealImg = Boolean(c.imageUrl?.trim()) && !c.imageUrl?.includes('photo-1542291026-7eec264c27ff');
            const isCustom = !c.title?.startsWith('Feature #') && !c.title?.startsWith('Hallmark #') && Boolean(c.title?.trim());
            return hasRealImg || isCustom;
          });
          if (Boolean(mod.imageUrl?.trim())) {
            // If cards were just boilerplate placeholders, clean them out so only the real banner stays
            if (validCards.length === 0) {
              mod.cards = [];
            } else {
              mod.cards = validCards;
            }
            return true;
          }
          mod.cards = validCards;
          return validCards.length > 0;
        }

        if (mod.type === 'hero_banner') {
          return Boolean(mod.imageUrl?.trim());
        }

        if (mod.type === 'image_text_split') {
          return Boolean(mod.imageUrl?.trim() || mod.description?.trim());
        }

        if (mod.type === 'lifestyle_gallery') {
          return Boolean(mod.imageUrl?.trim() || mod.secondaryImageUrl?.trim() || mod.tertiaryImageUrl?.trim());
        }

        return true;
      });

      // Deduplicate modules
      const seenModSignatures = new Set<string>();
      const deduplicatedModules = cleanedAplusModules.filter((mod) => {
        const sig = `${mod.type}-${mod.imageUrl?.trim() || ''}-${mod.title || ''}`;
        if (seenModSignatures.has(sig)) return false;
        seenModSignatures.add(sig);
        return true;
      });

      // Never save builder placeholder text as if the vendor wrote it.
      const textCleanedModules = deduplicatedModules.map((mod) => ({
        ...mod,
        title: cleanAplusText(mod.title),
        subtitle: cleanAplusText(mod.subtitle),
        description: cleanAplusText(mod.description),
        badgeText: cleanAplusText(mod.badgeText),
        cards: mod.cards?.map((c) => ({ ...c, title: cleanAplusText(c.title), description: cleanAplusText(c.description) })),
      }));

      const sanitizedAplus =
        textCleanedModules.length > 0
          ? {
              ...aplusData,
              modules: textCleanedModules,
            }
          : undefined;

      const payload: any = {
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        brand: brand.trim(),
        categoryId,
        price: numericPrice,
        originalPrice: numericOriginal > numericPrice ? numericOriginal : numericPrice,
        isPublished: publishIntent,
        isCustomized,
        description: description.trim() || undefined,
        specs: specs.filter((s) => s.label.trim() && s.value.trim()),
        attributes: attributeCheck.attributes,
        highlights: highlights.filter((h) => h.trim()),
        aplus: sanitizedAplus,
        sizeChart:
          SIZE_CHART_COLUMNS[chartKind].length > 0
            ? { kind: chartKind, rows: chartSizes.map((size) => ({ size, values: chartValues[size] || [] })) }
            : undefined,
        images: images.map((img) => img.url),
        stock: hasVariants ? undefined : Math.max(0, parseInt(standardStock, 10) || 0),
        variants: hasVariants
          ? variants.map((v, i) => ({
              id: v.id,
              size: v.size.trim(),
              color: v.color.trim(),
              sku: (v.sku.trim() || `${skuPrefix}-V${i + 1}`).toUpperCase(),
              price: v.price ? parseFloat(v.price) : numericPrice,
              stock: Math.max(0, parseInt(v.stock, 10) || 0),
              imageUrl: v.imageUrl || images[0]?.url,
              attributes: v.attributes || {},
            }))
          : undefined,
      };

      const url = mode === 'create' ? '/api/vendor/products' : `/api/vendor/products/${productId}`;
      const method = mode === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        try {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        } catch {}
        setSuccessMessage(
          publishIntent
            ? 'Product published.'
            : 'Draft saved.'
        );
        setTimeout(() => {
          router.push('/vendor/products');
          router.refresh();
        }, 1200);
      } else {
        setErrorMessage(json.error?.message || 'Failed to save product. Please review the form.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected network error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-24">
      {/* Header: back link, title and the save actions */}
      {!embedded && (
      <div className="flex flex-col gap-4 border-b border-[#D5D9D9] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/vendor/products" className="inline-flex items-center gap-1 text-sm text-[#565959] hover:text-[#007185]">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Products
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-[#0F1111]">
            {mode === 'create' ? 'Add a product' : 'Edit product'}
          </h1>
          <p className="mt-1 text-sm text-[#565959]">
            {mode === 'create'
              ? 'Fill in the details shoppers need. You can save a draft and finish later.'
              : title || 'Untitled product'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/vendor/products"
            className={vendorButton.secondary}
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
            className={vendorButton.secondary}
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            Save draft
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting}
            className={vendorButton.primary}
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {mode === 'create' ? 'Publish' : 'Save and publish'}
          </button>
        </div>
      </div>
      )}

      {/* Notifications */}
      {errorMessage && (
        <div role="alert" className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <span>
            {errorMessage}
            {/Pickup addresses/.test(errorMessage) && (
              <>
                {' '}
                <Link href="/vendor/pickup-addresses" className="font-bold underline">
                  Add a pickup address
                </Link>
              </>
            )}
          </span>
        </div>
      )}
      {successMessage && (
        <div role="status" className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 1: BASIC INFORMATION                                         */}
      {/* ===================================================================== */}
      <section className="bg-white rounded-xl border border-[#D5D9D9] p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-[#D5D9D9]">
          <Tag className="h-4 w-4 text-[#007185]" />
          <h2 className="text-base font-semibold text-[#0F1111]">Basic details</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Title */}
          <div className="space-y-1 md:col-span-2">
            <label htmlFor="product-title" className="block text-sm font-semibold text-[#0F1111]">
              Title <span className="text-[#B12704]">*</span>
            </label>
            <input
              id="product-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="For example: Cotton oversized T-shirt for women, graphic print"
              className={inputClass}
            />
            <p className="text-xs text-[#565959]">Brand, product type, material and the main feature help shoppers find it in search.</p>
          </div>

          {/* Subtitle */}
          <div className="space-y-1">
            <label htmlFor="product-subtitle" className="block text-sm font-semibold text-[#0F1111]">
              Subtitle <span className="font-normal text-[#565959]">(optional)</span>
            </label>
            <input
              id="product-subtitle"
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="For example: Pack of 2, or Regular fit"
              className={inputClass}
            />
          </div>

          {/* Brand */}
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="product-brand" className="block text-sm font-semibold text-[#0F1111]">
                Brand <span className="text-[#B12704]">*</span>
              </label>
              {vendorStoreName && (
                <button type="button" onClick={() => setBrand(vendorStoreName)} className="text-xs text-[#007185] hover:underline">
                  Use my store name
                </button>
              )}
            </div>
            <input
              id="product-brand"
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="The brand printed on the product"
              className={inputClass}
            />
            <p className="text-xs text-[#565959]">
              Shoppers filter by brand. Products are sold by {vendorStoreName || 'your store'}.
            </p>
          </div>

          {/* Category: browse column by column, or search; only final categories can be chosen */}
          <div className="space-y-3 pt-2 md:col-span-2">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <label htmlFor="category-search" className="block text-sm font-semibold text-[#0F1111]">
                  Category <span className="text-[#B12704]">*</span>
                </label>
                <p className="text-sm text-[#565959]">
                  Pick the most specific category. It decides where shoppers find the product and which details and size chart we ask for.
                </p>
              </div>
              {categoryId && (
                <button
                  type="button"
                  onClick={() => {
                    setCategoryId('');
                    const fashion = rootCategories.find((r) => r.slug === 'fashion') || rootCategories[0];
                    setSelectedPath(fashion ? [fashion.id] : []);
                  }}
                  className="inline-flex items-center gap-1 self-start text-sm font-medium text-[#007185] hover:underline sm:self-auto"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Change category
                </button>
              )}
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#565959]" aria-hidden="true" />
              <input
                id="category-search"
                type="search"
                value={categorySearchQuery}
                onChange={(e) => setCategorySearchQuery(e.target.value)}
                placeholder="Search categories, for example kurtas, sneakers or laptops"
                className="w-full rounded-lg border border-[#D5D9D9] bg-white py-2 pl-9 pr-3 text-sm focus:border-[#007185] focus:outline-none focus:ring-1 focus:ring-[#007185]"
              />
              {categorySearchQuery.trim().length >= 2 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-[#D5D9D9] bg-white shadow-lg divide-y divide-[#F0F2F2]">
                  {searchResults.length === 0 ? (
                    <p className="p-4 text-center text-sm text-[#565959]">
                      No category matches &ldquo;{categorySearchQuery.trim()}&rdquo;. Browse the columns below instead.
                    </p>
                  ) : (
                    searchResults.map((res) => (
                      <button
                        key={res.category.id}
                        type="button"
                        onClick={() => {
                          setCategoryId(res.category.id);
                          setSelectedPath(res.trail.map((t) => t.id));
                          setCategorySearchQuery('');
                        }}
                        className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-[#F7F8F8]"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-[#0F1111]">{res.category.name}</span>
                          <span className="block truncate text-xs text-[#565959]">{res.pathString}</span>
                        </span>
                        <span className="shrink-0 text-sm font-medium text-[#007185]">Choose</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {isLoadingCategories ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-[#D5D9D9] bg-[#F7F8F8]" aria-live="polite">
                <CometSpinner className="h-12 w-12" decorative />
                <span className="text-sm text-[#565959]">Loading categories…</span>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-[#D5D9D9] bg-white">
                <div className="flex divide-x divide-[#D5D9D9] overflow-x-auto">
                  {pathfinderColumns.map((col) => {
                    const parent = col.levelIndex > 0 ? byId.get(selectedPath[col.levelIndex - 1]) : undefined;
                    return (
                      <div key={`col-${col.levelIndex}`} className="flex min-w-[200px] max-w-[260px] flex-1 flex-shrink-0 flex-col">
                        <div className="truncate border-b border-[#D5D9D9] bg-[#F7F8F8] px-3 py-2 text-xs font-semibold text-[#565959]">
                          {parent ? parent.name : 'Department'}
                        </div>
                        <ul className="h-64 overflow-y-auto p-1" role="list">
                          {col.items.map((cat) => {
                            const inPath = col.selectedId === cat.id;
                            const hasChildren = (childrenMap.get(cat.id) || []).length > 0;
                            const chosen = categoryId === cat.id && !hasChildren;
                            return (
                              <li key={cat.id}>
                                <button
                                  type="button"
                                  aria-pressed={hasChildren ? undefined : chosen}
                                  onClick={() => {
                                    const newPath = selectedPath.slice(0, col.levelIndex);
                                    newPath.push(cat.id);
                                    setSelectedPath(newPath);
                                    // Opening a group clears a choice made elsewhere; a final category is the choice.
                                    setCategoryId(hasChildren ? '' : cat.id);
                                  }}
                                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                                    chosen
                                      ? 'bg-[#007185] font-semibold text-white'
                                      : inPath
                                      ? 'bg-[#007185]/10 font-semibold text-[#005B6B]'
                                      : 'text-[#0F1111] hover:bg-[#F7F8F8]'
                                  }`}
                                >
                                  <span className="truncate">{cat.name}</span>
                                  {hasChildren ? (
                                    <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
                                  ) : chosen ? (
                                    <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                  ) : null}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-[#D5D9D9] bg-[#F7F8F8] px-4 py-3 text-sm" aria-live="polite">
                  {activeCategory && isFinalCategory ? (
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-[#0F1111]">
                        <CheckCircle2 className="mr-1.5 inline h-4 w-4 text-[#067D62]" aria-hidden="true" />
                        {activeCategory.fullPath}
                      </p>
                      <a
                        href={categoryPageFor(activeCategory.trail.map((t) => t.slug))}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 font-medium text-[#007185] hover:underline"
                      >
                        See where shoppers find it ↗
                      </a>
                    </div>
                  ) : activeCategory ? (
                    <p className="text-[#B12704]">
                      <AlertCircle className="mr-1.5 inline h-4 w-4" aria-hidden="true" />
                      &ldquo;{activeCategory.name}&rdquo; has sub-categories. Choose one of them.
                    </p>
                  ) : (
                    <p className="text-[#565959]">Open a department and keep going until you reach a category without an arrow.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Ready-made or made to order */}
          <fieldset className="space-y-2 md:col-span-2">
            <legend className="text-sm font-semibold text-[#0F1111]">
              How is it made? <span className="text-[#B12704]">*</span>
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { value: false, label: 'Ready-made', hint: 'Already made and in stock.' },
                { value: true, label: 'Made to order', hint: 'Made or tailored after the customer orders.' },
              ].map((opt) => (
                <label
                  key={opt.label}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${
                    isCustomized === opt.value ? 'border-[#007185] bg-[#007185]/5' : 'border-[#D5D9D9] bg-white hover:border-[#8A8F8F]'
                  }`}
                >
                  <input
                    type="radio"
                    name="made-how"
                    checked={isCustomized === opt.value}
                    onChange={() => setIsCustomized(opt.value)}
                    className="mt-0.5 h-4 w-4 accent-[#007185]"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-[#0F1111]">{opt.label}</span>
                    <span className="block text-xs text-[#565959]">{opt.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </section>

      {/* Category-specific details that power customer filters */}
      <ProductAttributesSection
        template={attributeTemplate}
        values={attributes}
        onChange={(key, value) => setAttributes((prev) => ({ ...prev, [key]: value }))}
        showErrors={showAttributeErrors}
        keysFromVariants={keysFromVariants}
      />

      {/* ===================================================================== */}
      {/* SECTION 2: PRICING & INVENTORY COMMERCIALS                           */}
      {/* ===================================================================== */}
      <ProductPricingSection
        price={price}
        setPrice={setPrice}
        originalPrice={originalPrice}
        setOriginalPrice={setOriginalPrice}
        discountPercent={discountPercent}
      />

      {/* ===================================================================== */}
      {/* SECTION 3: MEDIA & MULTI-IMAGE MANAGEMENT                             */}
      {/* ===================================================================== */}
      <section className="bg-white rounded-xl border border-[#D5D9D9] p-6 shadow-sm space-y-6">
        <div className="border-b border-[#D5D9D9] pb-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-[#0F1111]">
            <ImageIcon className="h-4 w-4 text-[#007185]" aria-hidden="true" />
            Photos
          </h2>
          <p className="mt-1 text-sm text-[#565959]">
            Add your own photos of this product. The cover photo is shown in search results and listings.
          </p>
        </div>

        {/* Add Image URL Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="relative flex-1 w-full">
            <Upload className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#565959]" />
            <input
              type="url"
              value={imageUrlInput}
              onChange={(e) => setImageUrlInput(e.target.value)}
              placeholder="Paste a photo link starting with https://"
              aria-label="Photo link"
              className="w-full rounded-lg border border-[#D5D9D9] bg-white py-2 pl-9 pr-3 text-sm focus:border-[#007185] focus:outline-none focus:ring-1 focus:ring-[#007185]"
            />
          </div>
          <button
            type="button"
            onClick={handleAddImageUrl}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#007185] hover:bg-[#004B57] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add link</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMediaTarget('gallery');
              setIsMediaModalOpen(true);
            }}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-white border border-[#D5D9D9] hover:border-[#007185] text-[#0F1111] text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
          >
            <FolderOpen className="h-3.5 w-3.5 text-[#007185]" />
            <span>Choose from my photos</span>
          </button>
        </div>

        {/* Image Grid with Thumbnails, Reordering & Primary Selector */}
        {images.length === 0 ? (
          <div className="py-12 border-2 border-dashed border-[#D5D9D9] rounded-xl text-center space-y-2 bg-[#F7F8F8]">
            <ImageIcon className="h-8 w-8 text-[#565959]/50 mx-auto" />
            <p className="text-sm font-semibold text-[#0F1111]">No photos yet</p>
            <p className="text-sm text-[#565959]">Add at least one photo to publish.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {/* Left: Thumbnail & Management List */}
            <div className="md:col-span-2 space-y-3">
              <span className="text-xs font-bold text-[#565959]">
                {images.length} {images.length === 1 ? 'photo' : 'photos'}
              </span>

              <div className="space-y-2.5">
                {images.map((img, idx) => (
                  <div
                    key={img.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      img.isPrimary
                        ? 'border-[#FFD814] bg-[#FFFBE6] shadow-sm'
                        : 'border-[#D5D9D9] bg-white hover:border-[#565959]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Thumbnail */}
                      <div className="relative w-12 h-14 rounded-lg overflow-hidden bg-[#F7F8F8] border border-[#D5D9D9] shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#0F1111]">Photo {idx + 1}</span>
                          {img.isPrimary ? (
                            <span className="rounded bg-[#FFD814] px-1.5 py-0.5 text-xs font-semibold text-[#0F1111]">Cover</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryImage(idx)}
                              className="text-xs text-[#007185] hover:underline font-semibold"
                            >
                              Make cover
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-[#565959] tabular-nums truncate max-w-sm mt-0.5">{img.url}</p>
                      </div>
                    </div>

                    {/* Actions: Reorder & Delete */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveImage(idx, 'up')}
                        className="p-1 text-[#565959] hover:text-[#0F1111] disabled:opacity-30"
                        title="Move up" aria-label={`Move photo ${idx + 1} up`}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === images.length - 1}
                        onClick={() => handleMoveImage(idx, 'down')}
                        className="p-1 text-[#565959] hover:text-[#0F1111] disabled:opacity-30"
                        title="Move down" aria-label={`Move photo ${idx + 1} down`}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="p-1 text-rose-600 hover:text-rose-800 ml-1"
                        title="Remove photo" aria-label={`Remove photo ${idx + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Live Interactive Main Image Preview */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#565959]">
                Preview
              </span>
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-[#F7F8F8] border border-[#D5D9D9] shadow-inner flex items-center justify-center">
                {images[activePreviewIndex] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={images[activePreviewIndex]?.url}
                    alt="Selected photo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="h-12 w-12 text-[#565959]/30" />
                )}
                {images[activePreviewIndex]?.isPrimary && (
                  <div className="absolute left-3 top-3 rounded bg-[#FFD814] px-2 py-0.5 text-xs font-semibold text-[#0F1111]">Cover</div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ===================================================================== */}
      {/* SECTION 4: PRODUCT VARIANTS & WAREHOUSE INVENTORY                     */}
      {/* ===================================================================== */}
      <section className="bg-white rounded-xl border border-[#D5D9D9] p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D5D9D9]">
          <div className="flex items-center gap-2">
            <Boxes className="h-4 w-4 text-[#007185]" />
            <div>
              <h2 className="text-base font-semibold text-[#0F1111]">Variants and stock</h2>
              <p className="text-sm text-[#565959]">
                One option, or several sizes, colours or capacities, each with its own price and stock.
              </p>
            </div>
          </div>

          {/* Toggle: Single Variant vs Multi-Variant */}
          <div className="flex items-center gap-2 bg-[#F7F8F8] p-1 rounded-xl border border-[#D5D9D9]">
            <button
              type="button"
              onClick={() => setHasVariants(false)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                !hasVariants ? 'bg-white text-[#0F1111] shadow-sm' : 'text-[#565959] hover:text-[#0F1111]'
              }`}
            >
              One option
            </button>
            <button
              type="button"
              onClick={() => setHasVariants(true)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                hasVariants ? 'bg-[#007185] text-white shadow-sm' : 'text-[#565959] hover:text-[#0F1111]'
              }`}
            >
              Several variants
            </button>
          </div>
        </div>

        {!hasVariants ? (
          /* Single Standard Variant Stock */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-4 bg-[#F7F8F8] rounded-xl border border-[#D5D9D9]">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#0F1111]">
                Stock <span className="text-[#B12704]">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={standardStock}
                onChange={(e) => setStandardStock(e.target.value)}
                className="w-full px-3.5 py-2 text-xs tabular-nums font-bold rounded-lg border border-[#D5D9D9] focus:outline-none focus:border-[#007185] bg-white"
              />
              <p className="text-xs text-[#565959]">Pieces you have ready to ship. 0 shows the product as out of stock.</p>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#0F1111]">SKU</label>
              <input
                type="text"
                readOnly
                value={`${skuPrefix}-STD`}
                className="w-full px-3.5 py-2 text-xs tabular-nums rounded-lg border border-[#D5D9D9] bg-[#EAEDED] text-[#565959]"
              />
              <p className="text-xs text-[#565959]">Created for you; it identifies this item in your orders.</p>
            </div>
          </div>
        ) : (
          /* Multi-Variant Matrix Table */
          <div className="space-y-5">
            {/* Amazon-Style Variation Creator */}
            <div className="p-4 sm:p-5 rounded-xl bg-[#F7F8F8] border border-[#D5D9D9] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#D5D9D9]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#007185]" />
                  <h3 className="text-sm font-semibold text-[#0F1111]">Add variants</h3>
                </div>
                {variants.length > 0 && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#565959]">
                      <strong className="text-[#0F1111]">{variants.length}</strong> {variants.length === 1 ? 'variant' : 'variants'}
                    </span>
                    <button
                      type="button"
                      onClick={handleClearAllVariants}
                      className="text-xs text-rose-600 hover:text-rose-800 hover:underline font-bold"
                    >
                      Remove all
                    </button>
                  </div>
                )}
              </div>

              {variantDefs.length > 0 ? (
                <VariantOptionsBuilder defs={variantDefs} onGenerate={handleGenerateAttributeVariants} />
              ) : (
              <>
              {/* Step 1 & 2: Color and Sizes input */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                {/* Step 1: Color Name */}
                <div className="lg:col-span-4 space-y-1.5">
                  <label className="block text-xs font-bold text-[#0F1111]">
                    1. Colour <span className="text-[#B12704]">*</span>
                  </label>
                  <input
                    type="text"
                    value={builderColor}
                    onChange={(e) => setBuilderColor(e.target.value)}
                    placeholder={isFootwearCategory ? 'e.g. Black White, Grey Pink, Navy Blue...' : 'e.g. Green, Royal Blue, Black...'}
                    className="w-full px-3 py-2 text-xs border border-[#D5D9D9] rounded-lg focus:outline-none focus:border-[#007185] bg-white font-semibold"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleGenerateAmazonVariants();
                      }
                    }}
                  />
                  <p className="text-xs text-[#565959]">The colour these sizes come in.</p>
                </div>

                {/* Step 2: Select Sizes */}
                <div className="lg:col-span-5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-[#0F1111]">
                      {isBookCategory ? (
                        <span className="text-[#007185] font-extrabold">2. Choose Book Binding / Format</span>
                      ) : isMobileCategory ? (
                        <span className="text-[#007185] font-extrabold">2. Choose Storage / RAM Capacity</span>
                      ) : isCameraCategory ? (
                        <span className="text-[#007185] font-extrabold">2. Choose Camera Kit / Lens Configuration</span>
                      ) : isRefrigeratorCategory ? (
                        <span className="text-[#007185] font-extrabold">2. Refrigerator Capacity & BEE Star Rating</span>
                      ) : isWashingMachineCategory ? (
                        <span className="text-[#007185] font-extrabold">2. Washing Machine Load Capacity & Star Rating</span>
                      ) : isAirConditionerCategory ? (
                        <span className="text-[#007185] font-extrabold">2. AC Tonnage & BEE Energy Star Rating</span>
                      ) : isAirCoolerCategory ? (
                        <span className="text-[#007185] font-extrabold">2. Air Cooler Water Tank Capacity & Type</span>
                      ) : isWaterPurifierCategory ? (
                        <span className="text-[#007185] font-extrabold">2. Water Purifier Storage Tank & Tech</span>
                      ) : isGeyserCategory ? (
                        <span className="text-[#007185] font-extrabold">2. Geyser Tank Capacity & Wattage</span>
                      ) : isDryerCategory ? (
                        <span className="text-[#007185] font-extrabold">2. Dryer Power Wattage & Settings</span>
                      ) : isMicrowaveCategory ? (
                        <span className="text-[#007185] font-extrabold">2. Microwave Cavity Capacity & Type</span>
                      ) : isAirFryerCategory ? (
                        <span className="text-[#007185] font-extrabold">2. Air Fryer Basket Capacity</span>
                      ) : isChimneyCategory ? (
                        <span className="text-[#007185] font-extrabold">2. Chimney Suction Power & Width</span>
                      ) : isMixerInductionCategory ? (
                        <span className="text-[#007185] font-extrabold">2. Motor / Heating Wattage</span>
                      ) : isDishwasherCategory ? (
                        <span className="text-[#007185] font-extrabold">2. Dishwasher Place Settings</span>
                      ) : isVacuumCleanerCategory ? (
                        <span className="text-[#007185] font-extrabold">2. Vacuum Cleaner Suction Power</span>
                      ) : isApplianceCategory ? (
                        <span className="text-[#007185] font-extrabold">2. Choose Capacity / Energy Star Rating</span>
                      ) : isAudioCategory ? (
                        <span className="text-[#007185] font-extrabold">2. Headphone Variation (Color-Only / Edition)</span>
                      ) : isLaptopCategory ? (
                        <span className="text-[#007185] font-extrabold">2. Choose RAM + SSD Configuration</span>
                      ) : isSmartwatchCategory ? (
                        <span className="text-[#007185] font-extrabold">2. Choose Dial / Case Size</span>
                      ) : isTabletCategory ? (
                        <span className="text-[#007185] font-extrabold">2. Choose Storage Capacity</span>
                      ) : isElectronicsCategory ? (
                        <span className="text-[#007185] font-extrabold">2. Choose Configuration / Storage / Spec</span>
                      ) : isFootwearCategory ? (
                        <span className="text-[#007185] font-extrabold">2. UK / India shoe sizes</span>
                      ) : (
                        <span>2. Sizes</span>
                      )}
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedSizes(
                          selectedSizes.length === AVAILABLE_SIZES.length ? [] : [...AVAILABLE_SIZES]
                        )
                      }
                      className="text-xs text-[#007185] font-bold hover:underline"
                    >
                      {selectedSizes.length === AVAILABLE_SIZES.length ? 'Clear' : 'Select all'}
                    </button>
                  </div>

                  {/* Dynamic Custom Capacity / Metric Creator for Appliances */}
                  {isApplianceCategory && (
                    <div className="bg-[#F0F8FF] border border-[#BCE1EB] rounded-xl p-2.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#007185] flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-[#007185]" />
                          {isRefrigeratorCategory
                            ? 'Specify Custom Refrigerator Capacity & Star Rating:'
                            : isWashingMachineCategory
                            ? 'Specify Custom Washing Machine Load Capacity & Rating:'
                            : isAirConditionerCategory
                            ? 'Specify Custom AC Tonnage & Star Rating:'
                            : isAirCoolerCategory
                            ? 'Specify Custom Cooler Tank Capacity & Type:'
                            : isWaterPurifierCategory
                            ? 'Specify Custom Water Purifier Tank Capacity:'
                            : isGeyserCategory
                            ? 'Specify Custom Geyser Tank Capacity:'
                            : isDryerCategory
                            ? 'Specify Custom Dryer Wattage:'
                            : isMicrowaveCategory
                            ? 'Specify Custom Microwave Capacity:'
                            : isAirFryerCategory
                            ? 'Specify Custom Air Fryer Capacity:'
                            : isChimneyCategory
                            ? 'Specify Custom Chimney Suction Power:'
                            : isMixerInductionCategory
                            ? 'Specify Custom Motor / Heating Wattage:'
                            : isDishwasherCategory
                            ? 'Specify Custom Dishwasher Place Settings:'
                            : 'Specify Custom Capacity / Spec:'}
                        </span>
                        <span className="text-xs text-[#565959] italic">Direct custom spec</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Numeric input with unit badge */}
                        <div className="flex items-center bg-white border border-[#D5D9D9] rounded-lg overflow-hidden shadow-2xs">
                          <input
                            type="text"
                            value={customCapacityValue}
                            onChange={(e) => setCustomCapacityValue(e.target.value)}
                            placeholder={
                              isRefrigeratorCategory
                                ? 'e.g. 251'
                                : isWashingMachineCategory
                                ? 'e.g. 7.5'
                                : isAirConditionerCategory
                                ? 'e.g. 1.5'
                                : isAirCoolerCategory
                                ? 'e.g. 55'
                                : isWaterPurifierCategory
                                ? 'e.g. 8'
                                : isGeyserCategory
                                ? 'e.g. 15'
                                : isDryerCategory
                                ? 'e.g. 2000'
                                : isMicrowaveCategory
                                ? 'e.g. 28'
                                : isAirFryerCategory
                                ? 'e.g. 5.5'
                                : isChimneyCategory
                                ? 'e.g. 1350'
                                : isMixerInductionCategory
                                ? 'e.g. 750'
                                : isDishwasherCategory
                                ? 'e.g. 14'
                                : 'e.g. 250'
                            }
                            className="w-20 px-2.5 py-1 text-xs font-bold text-[#0F1111] focus:outline-none"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddCustomApplianceVariant();
                              }
                            }}
                          />
                          <span className="bg-stone-100 px-2 py-1 text-xs font-bold text-[#565959] border-l border-[#D5D9D9]">
                            {isRefrigeratorCategory || isAirCoolerCategory || isWaterPurifierCategory || isGeyserCategory || isMicrowaveCategory || isAirFryerCategory
                              ? 'Litres (L)'
                              : isWashingMachineCategory
                              ? 'kg'
                              : isAirConditionerCategory
                              ? 'Ton'
                              : isDryerCategory || isMixerInductionCategory
                              ? 'Watts (W)'
                              : isChimneyCategory
                              ? 'm³/hr'
                              : isDishwasherCategory
                              ? 'Places'
                              : 'Units'}
                          </span>
                        </div>

                        {/* BEE Star Rating Selector */}
                        {(isRefrigeratorCategory || isWashingMachineCategory || isAirConditionerCategory) && (
                          <div className="flex items-center gap-1 bg-white border border-[#D5D9D9] p-0.5 rounded-lg shadow-2xs">
                            <span className="text-xs font-bold text-[#565959] px-1.5">BEE Star:</span>
                            {(isRefrigeratorCategory
                              ? ['1 Star', '2 Star', '3 Star', '4 Star', '5 Star']
                              : isWashingMachineCategory
                              ? ['3 Star', '4 Star', '5 Star']
                              : ['3 Star', '5 Star']
                            ).map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setCustomStarRating(star)}
                                className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all ${
                                  customStarRating === star
                                    ? 'bg-[#FF9900] text-white shadow-2xs'
                                    : 'text-[#0F1111] hover:bg-stone-100'
                                }`}
                              >
                                {star}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Extra Feature / Type Pills */}
                        {isAirCoolerCategory && (
                          <div className="flex items-center gap-1 bg-white border border-[#D5D9D9] p-0.5 rounded-lg">
                            {['Desert Cooler', 'Personal Cooler', 'Tower Cooler', 'Window Cooler'].map((type) => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => setCustomExtraSpec(type)}
                                className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                                  customExtraSpec === type ? 'bg-[#007185] text-white' : 'text-[#0F1111] hover:bg-stone-100'
                                }`}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        )}

                        {isWaterPurifierCategory && (
                          <div className="flex items-center gap-1 bg-white border border-[#D5D9D9] p-0.5 rounded-lg">
                            {['RO+UV', 'RO+UV+UF', 'RO+UV+Copper', 'Alkaline+TDS'].map((tech) => (
                              <button
                                key={tech}
                                type="button"
                                onClick={() => setCustomExtraSpec(tech)}
                                className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                                  customExtraSpec === tech ? 'bg-[#007185] text-white' : 'text-[#0F1111] hover:bg-stone-100'
                                }`}
                              >
                                {tech}
                              </button>
                            ))}
                          </div>
                        )}

                        {isDryerCategory && (
                          <div className="flex items-center gap-1 bg-white border border-[#D5D9D9] p-0.5 rounded-lg">
                            {['Professional', 'Ionic Care', 'Fast Dry', 'Salon AC Motor'].map((dr) => (
                              <button
                                key={dr}
                                type="button"
                                onClick={() => setCustomExtraSpec(dr)}
                                className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                                  customExtraSpec === dr ? 'bg-[#007185] text-white' : 'text-[#0F1111] hover:bg-stone-100'
                                }`}
                              >
                                {dr}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Add Button */}
                        <button
                          type="button"
                          onClick={handleAddCustomApplianceVariant}
                          className="px-3 py-1.5 rounded-lg bg-[#007185] hover:bg-[#005a6a] text-white text-xs font-bold shadow-xs flex items-center gap-1 transition-all"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Add Capacity</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Book Quick Presets */}
                  {isBookCategory && (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs pb-1">
                      <span className="text-[#565959] font-medium">Binding Presets:</span>
                      <button
                        type="button"
                        onClick={() => setSelectedSizes(['Paperback'])}
                        className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 text-[#0F1111] font-semibold border border-stone-200"
                      >
                        Paperback
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedSizes(['Paperback', 'Hardcover'])}
                        className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 text-[#0F1111] font-semibold border border-stone-200"
                      >
                        Paperback + Hardcover
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedSizes(['Paperback', 'Hardcover', 'Box Set'])}
                        className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 text-[#0F1111] font-semibold border border-stone-200"
                      >
                        Collector / Box Set
                      </button>
                    </div>
                  )}

                  {/* Camera / Lens Kit Presets */}
                  {isCameraCategory && (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs pb-1">
                      <span className="text-[#565959] font-medium">Camera Lens Kits:</span>
                      <button
                        type="button"
                        onClick={() => setSelectedSizes(['Body Only'])}
                        className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 text-[#0F1111] font-semibold border border-stone-200"
                      >
                        Body Only
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedSizes(['Body Only', 'With 16-50mm Lens', 'With 18-135mm Lens'])}
                        className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 text-[#0F1111] font-semibold border border-stone-200"
                      >
                        Body + Zoom Kits
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedSizes(['Single Lens Kit', 'Dual Lens Kit'])}
                        className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 text-[#0F1111] font-semibold border border-stone-200"
                      >
                        Single vs Dual Lens
                      </button>
                    </div>
                  )}

                  {/* Appliance Quick Presets */}
                  {isApplianceCategory && (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs pb-1">
                      <span className="text-[#565959] font-medium">Quick Presets:</span>
                      <button
                        type="button"
                        onClick={() => setSelectedSizes(['242 L (3 Star)', '260 L (3 Star)', '343 L (3 Star)'])}
                        className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 text-[#0F1111] font-semibold border border-stone-200"
                      >
                        Refrigerators (242L - 343L)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedSizes(['7 kg (5 Star)', '8 kg (5 Star)'])}
                        className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 text-[#0F1111] font-semibold border border-stone-200"
                      >
                        Washing Machines (7-8 kg)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedSizes(['1.5 Ton (5 Star)', '1.0 Ton (5 Star)'])}
                        className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 text-[#0F1111] font-semibold border border-stone-200"
                      >
                        Air Conditioners (1.5 Ton)
                      </button>
                    </div>
                  )}

                  {/* Audio / Headphone Presets */}
                  {isAudioCategory && (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs pb-1">
                      <span className="text-[#565959] font-medium">Headphone Variations:</span>
                      <button
                        type="button"
                        onClick={() => setSelectedSizes(['Standard Edition'])}
                        className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 text-[#0F1111] font-semibold border border-stone-200"
                      >
                        Color-Only (Standard Edition)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedSizes(['Wireless', 'Wired'])}
                        className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 text-[#0F1111] font-semibold border border-stone-200"
                      >
                        Wireless vs Wired
                      </button>
                    </div>
                  )}

                  {/* Laptop Quick Presets */}
                  {isLaptopCategory && (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs pb-1">
                      <span className="text-[#565959] font-medium">Laptop Presets:</span>
                      <button
                        type="button"
                        onClick={() => setSelectedSizes(['8GB + 512GB', '16GB + 512GB'])}
                        className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 text-[#0F1111] font-semibold border border-stone-200"
                      >
                        Standard (8GB / 16GB + 512GB)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedSizes(['16GB + 512GB', '16GB + 1TB'])}
                        className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 text-[#0F1111] font-semibold border border-stone-200"
                      >
                        Performance (16GB + 512GB / 1TB)
                      </button>
                    </div>
                  )}

                  {/* Smartwatch Quick Presets */}
                  {isSmartwatchCategory && (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs pb-1">
                      <span className="text-[#565959] font-medium">Dial Sizes:</span>
                      <button
                        type="button"
                        onClick={() => setSelectedSizes(['41mm', '45mm'])}
                        className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 text-[#0F1111] font-semibold border border-stone-200"
                      >
                        Standard (41mm / 45mm)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedSizes(['40mm', '44mm'])}
                        className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 text-[#0F1111] font-semibold border border-stone-200"
                      >
                        Compact / Large (40mm / 44mm)
                      </button>
                    </div>
                  )}

                  {/* Mobile Quick Storage Presets */}
                  {isMobileCategory && (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs pb-1">
                      <span className="text-[#565959] font-medium">Quick Storage Presets:</span>
                      <button
                        type="button"
                        onClick={() => setSelectedSizes(['128 GB', '256 GB'])}
                        className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 text-[#0F1111] font-semibold border border-stone-200"
                      >
                        Standard (128GB / 256GB)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedSizes(['128 GB', '256 GB', '512 GB'])}
                        className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 text-[#0F1111] font-semibold border border-stone-200"
                      >
                        Flagship (128GB / 256GB / 512GB)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedSizes(['8GB + 128GB', '8GB + 256GB', '12GB + 256GB'])}
                        className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 text-[#0F1111] font-semibold border border-stone-200"
                      >
                        RAM + ROM Combos
                      </button>
                    </div>
                  )}

                  {/* Footwear Quick Range Presets */}
                  {isFootwearCategory && (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs pb-1">
                      <span className="text-[#565959] font-medium">Quick Presets:</span>
                      <button
                        type="button"
                        onClick={() => setSelectedSizes(['3 UK', '4 UK', '5 UK', '6 UK', '7 UK', '8 UK'])}
                        className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 text-[#0F1111] font-semibold border border-stone-200"
                      >
                        Women (3-8 UK)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedSizes(['6 UK', '7 UK', '8 UK', '9 UK', '10 UK', '11 UK'])}
                        className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 text-[#0F1111] font-semibold border border-stone-200"
                      >
                        Men (6-11 UK)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedSizes(['3 UK', '4 UK', '5 UK', '6 UK', '7 UK', '8 UK', '9 UK', '10 UK', '11 UK', '12 UK'])}
                        className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 text-[#0F1111] font-semibold border border-stone-200"
                      >
                        All UK Sizes
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {AVAILABLE_SIZES.map((sz) => {
                      const isSelected = selectedSizes.includes(sz);
                      return (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => toggleSize(sz)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                            isSelected
                              ? 'bg-[#007185] text-white border-[#007185] shadow-2xs'
                              : 'bg-white text-[#565959] border-[#D5D9D9] hover:border-stone-400 hover:text-[#0F1111]'
                          }`}
                        >
                          {sz}
                        </button>
                      );
                    })}
                  </div>

                  {/* Universal Custom Variant Tag Input */}
                  <div className="pt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-[#565959] font-medium whitespace-nowrap">Can&apos;t find your variant?</span>
                    <div className="flex items-center flex-1 min-w-[200px] max-w-sm bg-white border border-[#D5D9D9] rounded-lg overflow-hidden shadow-2xs">
                      <input
                        type="text"
                        value={universalCustomVariant}
                        onChange={(e) => setUniversalCustomVariant(e.target.value)}
                        placeholder="Type any custom variant (e.g. 251 L, 1 Star)..."
                        className="flex-1 px-2.5 py-1 text-xs text-[#0F1111] focus:outline-none font-medium"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddUniversalCustomVariant();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddUniversalCustomVariant}
                        className="bg-stone-100 hover:bg-stone-200 px-2.5 py-1 text-xs font-bold text-[#0F1111] border-l border-[#D5D9D9] transition-all"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* Step 3: Button */}
                <div className="lg:col-span-3">
                  <button
                    type="button"
                    onClick={handleGenerateAmazonVariants}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] text-xs font-extrabold shadow-sm transition-all border border-[#FCD200] flex items-center justify-center gap-1.5"
                  >
                    <span>Add variants</span>
                  </button>
                </div>
              </div>
              </>
              )}
            </div>

            {/* Empty State vs Matrix Table */}
            {variants.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-[#D5D9D9] bg-[#FAFAFA] p-8 text-center space-y-2">
                <Layers className="w-8 h-8 text-[#565959]/40 mx-auto" />
                <p className="text-sm font-bold text-[#0F1111]">No Variants Added Yet</p>
                <p className="text-xs text-[#565959] max-w-md mx-auto">
                  Type a color name above (e.g. <strong>{isFootwearCategory ? 'Black White' : 'Green'}</strong>), select your sizes ({isFootwearCategory ? '6 UK, 7 UK, 8 UK...' : 'S, M, L, XL, 2XL'}), and choose <strong>Add variants</strong>.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto border border-[#D5D9D9] rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F7F8F8] border-b border-[#D5D9D9] text-[#565959] text-xs">
                      <tr>
                        <th className="py-2.5 px-3 font-bold">
                          {isBookCategory
                            ? 'Binding / Format'
                            : isMobileCategory
                            ? 'Storage / Variant'
                            : isCameraCategory
                            ? 'Kit / Configuration'
                            : isAudioCategory
                            ? 'Edition / Model'
                            : isLaptopCategory
                            ? 'RAM + SSD'
                            : isSmartwatchCategory
                            ? 'Dial Size'
                            : isApplianceCategory
                            ? 'Capacity / Star Rating'
                            : isElectronicsCategory
                            ? 'Configuration / Spec'
                            : 'Size'}
                        </th>
                        <th className="py-2.5 px-3 font-bold">Color Name</th>
                        <th className="py-2.5 px-3 font-bold">Photo</th>
                        <th className="py-2.5 px-3 font-bold">Variant SKU</th>
                        <th className="py-2.5 px-3 font-bold">Price Override (₹)</th>
                        <th className="py-2.5 px-3 font-bold">Stock</th>
                        <th className="py-2.5 px-3 font-bold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D5D9D9]/60">
                  {variants.map((v, idx) => (
                    <tr key={idx} className="hover:bg-[#F7F8F8]/50">
                      {/* Size */}
                      <td className="py-2 px-3 align-top">
                        <input
                          type="text"
                          value={v.size}
                          onChange={(e) => handleUpdateVariant(idx, 'size', e.target.value)}
                          readOnly={Boolean(v.attributes && variantDefs.length > 0)}
                          title={v.size}
                          placeholder={
                            isBookCategory
                              ? 'e.g. Paperback, Hardcover'
                              : isCameraCategory
                              ? 'e.g. Body Only, With 18-135mm Lens'
                              : isAudioCategory
                              ? 'e.g. Standard Edition'
                              : isMobileCategory
                              ? 'e.g. 128 GB, 256 GB'
                              : isLaptopCategory
                              ? 'e.g. 16GB + 512GB'
                              : 'e.g. S, M, Free Size'
                          }
                          className="w-24 px-2 py-1.5 text-xs border border-[#D5D9D9] rounded focus:outline-none focus:border-[#007185] bg-white font-semibold"
                        />
                      </td>

                      {/* Color */}
                      <td className="py-2 px-3 align-top">
                        <input
                          type="text"
                          value={v.color}
                          onChange={(e) => handleUpdateVariant(idx, 'color', e.target.value)}
                          placeholder={
                            isBookCategory
                              ? 'e.g. Paperback, Hardcover'
                              : isCameraCategory
                              ? 'e.g. Black, Silver'
                              : isAudioCategory
                              ? 'e.g. Black, Blue, Sand, White'
                              : isMobileCategory
                              ? 'e.g. Titanium Black'
                              : isFootwearCategory
                              ? 'e.g. Black White, Grey'
                              : 'e.g. Royal Navy'
                          }
                          className="w-32 px-2 py-1.5 text-xs border border-[#D5D9D9] rounded focus:outline-none focus:border-[#007185] bg-white"
                        />
                      </td>

                      {/* Swatch Image */}
                      <td className="py-2 px-3 align-top">
                        <div className="flex items-start gap-2">
                          <div className="w-9 h-9 rounded-md border border-[#D5D9D9] bg-[#F7F8F8] flex items-center justify-center overflow-hidden shrink-0 mt-0.5">
                            {v.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={v.imageUrl} alt={v.color} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-4 h-4 text-[#565959]/40" />
                            )}
                          </div>
                          <div className="flex flex-col gap-1 min-w-[170px] max-w-[220px]">
                            <input
                              type="url"
                              value={v.imageUrl || ''}
                              onChange={(e) => handleUpdateVariant(idx, 'imageUrl', e.target.value)}
                              placeholder="Swatch Image HTTPS URL..."
                              className="w-full px-2 py-1 text-xs border border-[#D5D9D9] rounded focus:outline-none focus:border-[#007185] bg-white tabular-nums"
                            />
                            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setMediaTarget({ type: 'variant', index: idx });
                                  setIsMediaModalOpen(true);
                                }}
                                className="text-[9px] text-[#007185] hover:underline shrink-0 font-bold flex items-center gap-0.5 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200"
                                title="Choose Swatch from Media Library"
                              >
                                <FolderOpen className="w-2.5 h-2.5" />
                                <span>Library</span>
                              </button>
                              {images.length > 0 && (
                                <>
                                  <span className="text-[9px] text-[#565959] shrink-0 font-medium">Quick:</span>
                                  {images.slice(0, 3).map((img, i) => (
                                    <button
                                      key={img.id || i}
                                      type="button"
                                      onClick={() => handleUpdateVariant(idx, 'imageUrl', img.url)}
                                      className="w-4 h-4 rounded border border-[#D5D9D9] overflow-hidden shrink-0 hover:border-[#007185] hover:scale-110 transition-transform"
                                      title={`Use uploaded image #${i + 1}`}
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                                    </button>
                                  ))}
                                </>
                              )}
                              {v.imageUrl && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateVariant(idx, 'imageUrl', '')}
                                    className="text-[9px] text-rose-600 hover:underline shrink-0 ml-1"
                                    title="Clear image"
                                  >
                                    Clear
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSyncSwatchForColor(v.color, v.imageUrl!)}
                                    className="text-[9px] text-[#007185] hover:bg-[#E7F4F5] shrink-0 ml-1 font-bold px-1.5 py-0.5 rounded border border-[#007185]/30 transition-colors"
                                    title={`Copy this photo to all ${v.color || 'matching'} sizes`}
                                  >
                                    Sync to all {v.color || 'same color'}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="py-2 px-3 align-top">
                        <input
                          type="text"
                          value={v.sku || `${skuPrefix}-${v.size || idx + 1}`}
                          onChange={(e) => handleUpdateVariant(idx, 'sku', e.target.value)}
                          className="w-32 px-2 py-1.5 text-xs border border-[#D5D9D9] rounded focus:outline-none focus:border-[#007185] bg-white tabular-nums"
                        />
                      </td>

                      {/* Price */}
                      <td className="py-2 px-3 align-top">
                        <input
                          type="number"
                          value={v.price}
                          placeholder={price || 'Default'}
                          onChange={(e) => handleUpdateVariant(idx, 'price', e.target.value)}
                          className="w-24 px-2 py-1.5 text-xs border border-[#D5D9D9] rounded focus:outline-none focus:border-[#007185] bg-white tabular-nums"
                        />
                      </td>

                      {/* Stock */}
                      <td className="py-2 px-3 align-top">
                        <input
                          type="number"
                          min="0"
                          value={v.stock}
                          onChange={(e) => handleUpdateVariant(idx, 'stock', e.target.value)}
                          className="w-20 px-2 py-1.5 text-xs border border-[#D5D9D9] rounded focus:outline-none focus:border-[#007185] bg-white tabular-nums font-bold"
                        />
                      </td>

                      {/* Delete */}
                      <td className="py-2 px-3 text-right align-top">
                        <button
                          type="button"
                          onClick={() => handleRemoveVariant(idx)}
                          className="p-1.5 text-rose-600 hover:text-rose-800 rounded hover:bg-rose-50"
                          title="Delete Variant"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="px-3.5 py-1.5 rounded-lg bg-white border border-[#D5D9D9] hover:bg-[#F7F8F8] text-xs font-bold text-[#007185] transition-all flex items-center gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add one row</span>
                  </button>
                  <p className="text-xs text-[#565959]">
                    To add another colour in all sizes, use Add variants above.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ===================================================================== */}
      {/* SECTION 5: ATTRIBUTES, SPECIFICATIONS & SIZE CHART                     */}
      {/* ===================================================================== */}
      <section className="bg-white rounded-xl border border-[#D5D9D9] p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-[#D5D9D9]">
          <Ruler className="h-4 w-4 text-[#007185]" />
          <h2 className="text-base font-semibold text-[#0F1111]">Specifications and size chart</h2>
        </div>

        {/* Specifications Grid */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-[#565959]">
              Shown in the product details table. Rows left empty are not shown.
            </span>
            <div className="flex items-center gap-2">
              {isBookCategory ? (
                <button
                  type="button"
                  onClick={() =>
                    setSpecs([
                      { label: 'Author', value: brand || '' },
                      { label: 'Publisher', value: '' },
                      { label: 'Language', value: '' },
                      { label: 'Print Length', value: '' },
                      { label: 'Binding', value: variants[0]?.size || '' },
                      { label: 'ISBN-10', value: '' },
                      { label: 'ISBN-13', value: '' },
                      { label: 'Reading Age', value: '' },
                      { label: 'Country of Origin', value: '' },
                    ])
                  }
                  className="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-md hover:bg-amber-100 flex items-center gap-1 transition-all"
                >
                  <Sparkles className="h-3 w-3 text-amber-700" />
                  <span>Add common book spec rows</span>
                </button>
              ) : isCameraCategory ? (
                <button
                  type="button"
                  onClick={() =>
                    setSpecs([
                      { label: 'Brand', value: brand || '' },
                      { label: 'Model Name', value: title.slice(0, 40) },
                      { label: 'Compatible Mountings', value: '' },
                      { label: 'Aspect Ratio', value: '' },
                      { label: 'Photo Sensor Technology', value: '' },
                      { label: 'Supported File Format', value: '' },
                      { label: 'Image Stabilisation', value: '' },
                      { label: 'Maximum Focal Length', value: '' },
                      { label: 'Maximum Aperture', value: '' },
                      { label: 'Expanded ISO Minimum', value: '' },
                      { label: 'Metering Description', value: '' },
                      { label: 'Video Capture Resolution', value: '' },
                      { label: 'Warranty', value: '' },
                    ])
                  }
                  className="text-xs font-bold text-indigo-800 bg-indigo-50 border border-indigo-300 px-2.5 py-1 rounded-md hover:bg-indigo-100 flex items-center gap-1 transition-all"
                >
                  <Sparkles className="h-3 w-3 text-indigo-600" />
                  <span>Add common camera spec rows</span>
                </button>
              ) : isApplianceCategory ? (
                <button
                  type="button"
                  onClick={() => {
                    const primaryVariantStr = variants[0]?.size || selectedSizes[0] || '';
                    const capMatch = primaryVariantStr.match(/(\d+(?:\.\d+)?)\s*(L|kg|Ton|W|m³\/hr)/i) || 
                                     title.match(/(\d+(?:\.\d+)?)\s*(L|Litres?|kg|Ton|W|m³\/hr)/i);
                    const capNum = capMatch ? capMatch[1] : '';
                    const starMatch = primaryVariantStr.match(/([1-5])\s*Star/i) || title.match(/([1-5])\s*Star/i);
                    const starValue = starMatch ? `${starMatch[1]} Star BEE Certified` : '5 Star BEE Certified';

                    if (isRefrigeratorCategory) {
                      setSpecs([
                        { label: 'Brand', value: brand || '' },
                        { label: 'Model Name', value: title.slice(0, 45) },
                        { label: 'Energy Star Rating', value: starValue },
                        { label: 'Capacity', value: capNum ? `${capNum} Litres` : '' },
                        { label: 'Configuration', value: '' },
                        { label: 'Compressor Type', value: '' },
                        { label: 'Annual Energy Consumption', value: '' },
                        { label: 'Installation Type', value: '' },
                        { label: 'Warranty Summary', value: '' },
                      ]);
                    } else if (isWashingMachineCategory) {
                      setSpecs([
                        { label: 'Brand', value: brand || '' },
                        { label: 'Model Name', value: title.slice(0, 45) },
                        { label: 'Energy Star Rating', value: starValue },
                        { label: 'Capacity', value: capNum ? `${capNum} Kilograms` : '' },
                        { label: 'Operation Type', value: '' },
                        { label: 'Motor Type', value: '' },
                        { label: 'Maximum Rotational Speed', value: '' },
                        { label: 'Installation Type', value: '' },
                        { label: 'Warranty Summary', value: '' },
                      ]);
                    } else if (isAirCoolerCategory) {
                      setSpecs([
                        { label: 'Brand', value: brand || '' },
                        { label: 'Model Name', value: title.slice(0, 45) },
                        { label: 'Tank Capacity', value: capNum ? `${capNum} Litres` : '' },
                        { label: 'Cooling Media', value: '' },
                        { label: 'Air Throw Distance', value: '' },
                        { label: 'Blower / Fan Type', value: '' },
                        { label: 'Special Features', value: '' },
                        { label: 'Warranty Summary', value: '' },
                      ]);
                    } else if (isWaterPurifierCategory) {
                      setSpecs([
                        { label: 'Brand', value: brand || '' },
                        { label: 'Model Name', value: title.slice(0, 45) },
                        { label: 'Storage Tank Capacity', value: capNum ? `${capNum} Litres` : '' },
                        { label: 'Purification Technology', value: '' },
                        { label: 'Purification Stages', value: '' },
                        { label: 'Filtration Capacity', value: '' },
                        { label: 'Material', value: '' },
                        { label: 'Installation Type', value: '' },
                        { label: 'Warranty Summary', value: '' },
                      ]);
                    } else if (isDryerCategory) {
                      setSpecs([
                        { label: 'Brand', value: brand || '' },
                        { label: 'Model Name', value: title.slice(0, 45) },
                        { label: 'Power Wattage', value: capNum ? `${capNum} Watts` : '' },
                        { label: 'Heat & Speed Settings', value: '' },
                        { label: 'Motor Type', value: '' },
                        { label: 'Special Features', value: '' },
                        { label: 'Cord Length', value: '' },
                        { label: 'In-The-Box', value: '' },
                        { label: 'Warranty Summary', value: '' },
                      ]);
                    } else if (isAirConditionerCategory) {
                      setSpecs([
                        { label: 'Brand', value: brand || '' },
                        { label: 'Model Name', value: title.slice(0, 45) },
                        { label: 'Energy Star Rating', value: starValue },
                        { label: 'Capacity', value: capNum ? `${capNum} Ton` : '' },
                        { label: 'Cooling Capacity', value: '' },
                        { label: 'Compressor Type', value: '' },
                        { label: 'Condenser Coil', value: '' },
                        { label: 'Installation Type', value: '' },
                        { label: 'Warranty Summary', value: '' },
                      ]);
                    } else if (isMicrowaveCategory) {
                      setSpecs([
                        { label: 'Brand', value: brand || '' },
                        { label: 'Model Name', value: title.slice(0, 45) },
                        { label: 'Cavity Capacity', value: capNum ? `${capNum} Litres` : '' },
                        { label: 'Type', value: '' },
                        { label: 'Auto Cook Menus', value: '' },
                        { label: 'Cavity Material', value: '' },
                        { label: 'Warranty Summary', value: '' },
                      ]);
                    } else if (isChimneyCategory) {
                      setSpecs([
                        { label: 'Brand', value: brand || '' },
                        { label: 'Model Name', value: title.slice(0, 45) },
                        { label: 'Suction Capacity', value: capNum ? `${capNum} m³/hr` : '' },
                        { label: 'Size', value: '' },
                        { label: 'Filter Type', value: '' },
                        { label: 'Control Type', value: '' },
                        { label: 'Warranty Summary', value: '' },
                      ]);
                    } else {
                      setSpecs([
                        { label: 'Brand', value: brand || '' },
                        { label: 'Model Name', value: title.slice(0, 40) },
                        { label: 'Energy Star Rating', value: starValue },
                        { label: 'Capacity', value: capNum ? `${capNum}` : '' },
                        { label: 'Motor / Compressor', value: '' },
                        { label: 'Installation Type', value: '' },
                        { label: 'Warranty Summary', value: '' },
                      ]);
                    }
                  }}
                  className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-300 px-2.5 py-1 rounded-md hover:bg-teal-100 flex items-center gap-1 transition-all"
                >
                  <Sparkles className="h-3 w-3 text-teal-600" />
                  <span>
                    {isRefrigeratorCategory
                      ? 'Add common refrigerator spec rows'
                      : isWashingMachineCategory
                      ? 'Add common washing machine spec rows'
                      : isAirConditionerCategory
                      ? 'Add common ac spec rows'
                      : isAirCoolerCategory
                      ? 'Add common cooler spec rows'
                      : isWaterPurifierCategory
                      ? 'Add common purifier spec rows'
                      : isDryerCategory
                      ? 'Add common dryer spec rows'
                      : isMicrowaveCategory
                      ? 'Add common microwave spec rows'
                      : isChimneyCategory
                      ? 'Add common chimney spec rows'
                      : 'Add common appliance spec rows'}
                  </span>
                </button>
              ) : isAudioCategory ? (
                <button
                  type="button"
                  onClick={() =>
                    setSpecs([
                      { label: 'Brand', value: brand || '' },
                      { label: 'Colour', value: variants[0]?.color || '' },
                      { label: 'Ear Placement', value: '' },
                      { label: 'Form Factor', value: '' },
                      { label: 'Impedance', value: '' },
                      { label: 'Noise Cancellation', value: '' },
                      { label: 'Battery Life', value: '' },
                      { label: 'Connectivity', value: '' },
                      { label: 'Microphone', value: '' },
                      { label: 'Warranty', value: '' },
                    ])
                  }
                  className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-md hover:bg-amber-100 flex items-center gap-1 transition-all"
                >
                  <Sparkles className="h-3 w-3 text-amber-600" />
                  <span>Add common headphone / audio spec rows</span>
                </button>
              ) : isMobileCategory ? (
                <button
                  type="button"
                  onClick={() =>
                    setSpecs([
                      { label: 'Processor', value: '' },
                      { label: 'Display', value: '' },
                      { label: 'RAM', value: '' },
                      { label: 'Storage', value: '' },
                      { label: 'Primary Camera', value: '' },
                      { label: 'Front Camera', value: '' },
                      { label: 'Battery', value: '' },
                      { label: 'Network', value: '' },
                      { label: 'Operating System', value: '' },
                      { label: 'Warranty', value: '' },
                    ])
                  }
                  className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-md hover:bg-emerald-100 flex items-center gap-1 transition-all"
                >
                  <Sparkles className="h-3 w-3 text-emerald-600" />
                  <span>Add common mobile spec rows</span>
                </button>
              ) : isElectronicsCategory ? (
                <button
                  type="button"
                  onClick={() =>
                    setSpecs([
                      { label: 'Processor / Chipset', value: '' },
                      { label: 'Display / Resolution', value: '' },
                      { label: 'RAM / Memory', value: '' },
                      { label: 'Storage / SSD', value: '' },
                      { label: 'Graphics / GPU', value: '' },
                      { label: 'Battery / Playtime', value: '' },
                      { label: 'Connectivity', value: '' },
                      { label: 'Operating System', value: '' },
                      { label: 'Warranty', value: '' },
                    ])
                  }
                  className="text-xs font-bold text-sky-800 bg-sky-50 border border-sky-300 px-2.5 py-1 rounded-md hover:bg-sky-100 flex items-center gap-1 transition-all"
                >
                  <Sparkles className="h-3 w-3 text-sky-600" />
                  <span>Add common electronics spec rows</span>
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleAddSpec}
                className="text-xs font-bold text-[#007185] hover:underline flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                <span>Add a row</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {specs.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-[#F7F8F8] border border-[#D5D9D9]">
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => {
                    const copy = [...specs];
                    copy[idx].label = e.target.value;
                    setSpecs(copy);
                  }}
                  className="w-1/3 px-2 py-1 text-xs font-bold bg-white border border-[#D5D9D9] rounded"
                  placeholder="Name, e.g. Material"
                  aria-label={`Specification ${idx + 1} name`}
                />
                <input
                  type="text"
                  value={item.value}
                  onChange={(e) => {
                    const copy = [...specs];
                    copy[idx].value = e.target.value;
                    setSpecs(copy);
                  }}
                  className="w-2/3 px-2 py-1 text-xs bg-white border border-[#D5D9D9] rounded"
                  placeholder="Value, e.g. 100% cotton"
                  aria-label={`Specification ${idx + 1} value`}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveSpec(idx)}
                  className="text-rose-600 hover:text-rose-800 p-1"
                  aria-label={`Remove specification ${idx + 1}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Size chart (clothing and shoes): one row per size sold, shown to shoppers as entered */}
        {chartKind !== 'none' && (
          <div className="border-t border-[#D5D9D9] pt-4">
            <SizeChartEditor kind={chartKind} fit={chartFit} sizes={chartSizes} values={chartValues} onChange={setChartValues} />
          </div>
        )}
      </section>

      {/* ===================================================================== */}
      {/* SECTION 6: RICH DESCRIPTION & HIGHLIGHTS                              */}
      {/* ===================================================================== */}
      <section className="bg-white rounded-xl border border-[#D5D9D9] p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-[#D5D9D9]">
          <Sparkles className="h-4 w-4 text-[#007185]" />
          <h2 className="text-base font-semibold text-[#0F1111]">Highlights and description</h2>
        </div>

        {/* Highlights: short points shown under "About this item" */}
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-[#0F1111]">Highlights</p>
            <p className="text-xs text-[#565959]">Short points shown under &ldquo;About this item&rdquo;, such as fabric, fit or what&apos;s in the box.</p>
          </div>
          <div className="space-y-2">
            {highlights.map((h, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#565959]" aria-hidden="true" />
                <input
                  aria-label={`Highlight ${idx + 1}`}
                  type="text"
                  value={h}
                  onChange={(e) => {
                    const copy = [...highlights];
                    copy[idx] = e.target.value;
                    setHighlights(copy);
                  }}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-[#D5D9D9] focus:outline-none focus:border-[#007185] bg-white"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveHighlight(idx)}
                  className="text-rose-600 hover:text-rose-800 p-1"
                  aria-label={`Remove highlight ${idx + 1}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newHighlight}
                onChange={(e) => setNewHighlight(e.target.value)}
                placeholder="For example: 100% cotton, machine washable"
                aria-label="New highlight"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddHighlight();
                  }
                }}
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-[#D5D9D9] focus:outline-none focus:border-[#007185] bg-white"
              />
              <button
                type="button"
                onClick={handleAddHighlight}
                className="px-3.5 py-1.5 rounded-lg bg-[#007185] text-white text-xs font-bold hover:bg-[#004B57] transition-all"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Full Markdown / Text Narrative */}
        <div className="space-y-1 pt-3 border-t border-[#D5D9D9]">
          <label htmlFor="product-description" className="block text-sm font-semibold text-[#0F1111]">
            Description
          </label>
          <textarea
            id="product-description"
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the product: what it is, what it's made of, how it fits or works, and how to care for it."
            className={inputClass}
          />
          <p className="text-xs text-[#565959]">
            Shown in the description section of the product page.
          </p>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* SECTION 7: AMAZON A+ RICH PRODUCT DESCRIPTION (EDITORIAL MODULES)    */}
      {/* ===================================================================== */}
      <section className="bg-white rounded-xl border border-[#D5D9D9] p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D5D9D9]">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#007185]" />
            <div>
              <h2 className="text-base font-semibold text-[#0F1111]">
                Brand story <span className="font-normal text-[#565959]">(optional)</span>
              </h2>
              <p className="text-sm text-[#565959]">
                Extra sections with your own photos and text, shown below the description: banners, photo-and-text blocks and feature cards.
              </p>
            </div>
          </div>
        </div>

        <APlusBuilder
          aplusData={aplusData}
          onChange={setAplusData}
          brandName={brand}
        />
      </section>

      {/* ===================================================================== */}
      {/* BOTTOM STICKY BAR: DRAFT & PUBLISH ACTIONS                            */}
      {/* ===================================================================== */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#D5D9D9] bg-white px-4 py-3 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3 text-sm">
            <span className="hidden max-w-[16rem] truncate font-semibold text-[#0F1111] sm:inline">{title || 'Untitled product'}</span>
            <span className="tabular-nums font-semibold text-[#0F1111]">{price ? formatINR(numericPrice) : 'No price yet'}</span>
            {lastAutoSavedTime && (
              <span className="hidden whitespace-nowrap text-[#565959] md:inline">Kept on this device at {lastAutoSavedTime}</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/vendor/products"
              className={`${vendorButton.secondary} hidden sm:inline-flex`}
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              className={vendorButton.secondary}
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              <span>{isSubmitting ? 'Saving…' : 'Save draft'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
              className={vendorButton.primary}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <span>{isSubmitting ? 'Saving…' : mode === 'create' ? 'Publish' : 'Save and publish'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* RESTORE DRAFT RECOVERY MODAL                                         */}
      {/* ===================================================================== */}
      {showDraftModal && existingDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="restore-draft-title" className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-[#D5D9D9] bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="restore-draft-title" className="text-lg font-semibold text-[#0F1111]">Continue where you left off?</h3>
                <p className="mt-1 text-sm text-[#565959]">This browser kept a product you hadn&apos;t saved.</p>
              </div>
              <button type="button" onClick={() => setShowDraftModal(false)} className="rounded-lg p-1 text-[#565959] hover:bg-[#F7F8F8]" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-[#D5D9D9] bg-[#F7F8F8] p-3.5 text-sm">
              <dt className="text-[#565959]">Title</dt>
              <dd className="truncate font-medium text-[#0F1111]">{existingDraft.title || 'Untitled product'}</dd>
              <dt className="text-[#565959]">Price</dt>
              <dd className="tabular-nums font-medium text-[#0F1111]">
                {existingDraft.price ? `₹${Number(existingDraft.price).toLocaleString('en-IN')}` : 'Not set'}
              </dd>
              <dt className="text-[#565959]">Variants and photos</dt>
              <dd className="font-medium text-[#0F1111]">
                {existingDraft.variants?.length || 0} variants, {existingDraft.images?.length || 0} photos
              </dd>
              <dt className="text-[#565959]">Last change</dt>
              <dd className="font-medium text-[#0F1111]">
                {existingDraft.savedAt
                  ? new Date(existingDraft.savedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                  : 'Earlier'}
              </dd>
            </dl>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleRestoreDraft}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#FCD200] bg-[#FFD814] px-4 py-2 text-sm font-semibold text-[#0F1111] hover:bg-[#F7CA00]"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Continue it
              </button>
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="rounded-lg border border-[#D5D9D9] bg-white px-4 py-2 text-sm font-medium text-[#0F1111] hover:bg-[#F7F8F8]"
              >
                Start a new one
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Central Media Manager Picker Modal */}
      <MediaPickerModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onSelect={handleSelectMediaAsset}
        allowedCategory={mediaTarget === 'gallery' ? 'PRODUCT_GALLERY' : 'COLOR_SWATCH'}
        title={mediaTarget === 'gallery' ? 'Choose a product photo' : 'Choose a photo for this colour'}
      />
    </div>
  );
}
