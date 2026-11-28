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
import { getCategoryMeasurementProfile } from '@/lib/category-measurement';
import { ProductPricingSection } from '@/components/vendor/product-pricing-section';

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

export function ProductForm({ mode, productId, initialData }: ProductFormProps) {
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
    initialData?.totalStock ? String(initialData.totalStock) : '15'
  );
  const [variants, setVariants] = useState<ProductVariantItem[]>(
    initialData?.variants && initialData.variants.length > 0
      ? initialData.variants.map((v: any) => ({
          id: v.id,
          size: v.size || (v.sku?.includes('FREE') ? 'Free Size' : 'Standard'),
          color: v.color || 'Classic',
          sku: v.sku || '',
          price: v.price ? String(v.price) : '',
          stock: v.stock !== undefined ? String(v.stock) : '10',
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
          { label: 'Country of Origin', value: 'India' },
        ]
  );

  // Size Guide
  const [sizeChart, setSizeChart] = useState<Array<{ size: string; chest: string; waist: string; length: string }>>([
    { size: 'S', chest: '38 in', waist: '32 in', length: '40 in' },
    { size: 'M', chest: '40 in', waist: '34 in', length: '41 in' },
    { size: 'L', chest: '42 in', waist: '36 in', length: '42 in' },
    { size: 'XL', chest: '44 in', waist: '38 in', length: '43 in' },
  ]);

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
          setCategories(json.data);
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
    setSuccessMessage('Restored your unsaved product draft successfully!');
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
      const matchName = c.name.toLowerCase().includes(q);
      const matchSlug = c.slug.toLowerCase().includes(q);
      const matchPath = pathString.toLowerCase().includes(q);

      if (matchName || matchSlug || matchPath) {
        const children = childrenMap.get(c.id) || [];
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

  // Active Category & Measurement Profile (Intelligently classifies multi-tier categories)
  const [showChartOverride, setShowChartOverride] = useState<boolean | null>(null);

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

  // Amazon-style product type template for the chosen category (null when the category has none).
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

  const measurementProfile = React.useMemo(() => {
    return getCategoryMeasurementProfile(
      activeCategory?.slug,
      activeCategory?.parentSlug,
      activeCategory?.name
    );
  }, [activeCategory]);

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

  // Reset manual override whenever category changes so category defaults apply immediately
  useEffect(() => {
    setShowChartOverride(null);
  }, [categoryId]);

  const isMeasurementChartVisible =
    showChartOverride !== null ? showChartOverride : measurementProfile.showApparelChart;

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
      alert('Please enter a valid image URL starting with http:// or https://');
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

  // Preset sample image loader for quick demos
  const handleLoadSampleImages = () => {
    setImages([
      {
        id: 'sample-1',
        url: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=1200&q=80',
        isPrimary: true,
      },
      {
        id: 'sample-2',
        url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&q=80',
        isPrimary: false,
      },
      {
        id: 'sample-3',
        url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1200&q=80',
        isPrimary: false,
      },
    ]);
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
          stock: '10',
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
          stock: '10',
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
      alert('Please enter a Color Name (e.g. Green, Royal Blue, Black).');
      return;
    }
    let effectiveSizes = [...selectedSizes];
    if (effectiveSizes.length === 0) {
      if (isAudioCategory) {
        effectiveSizes = ['Standard Edition'];
      } else if (isCameraCategory) {
        effectiveSizes = ['Body Only'];
      } else {
        alert(isFootwearCategory ? 'Please select at least one UK shoe size.' : 'Please select at least one size.');
        return;
      }
    }
    const cleanTag = rawColor.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'COL';
    const newItems: ProductVariantItem[] = effectiveSizes.map((sz) => ({
      size: sz,
      color: rawColor,
      sku: `${skuPrefix}-${cleanTag}-${sz}`,
      price: price || '',
      stock: '10',
      imageUrl: images[0]?.url || '',
    }));
    setVariants((prev) => [...prev, ...newItems]);
    setBuilderColor('');
  };

  // Clear all variants from matrix
  const handleClearAllVariants = () => {
    if (confirm('Are you sure you want to clear all variants? You can add fresh colors & sizes right away.')) {
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
    setSpecs((prev) => [...prev, { label: 'New Attribute', value: 'Value' }]);
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
      setErrorMessage('Please specify the artisan/brand name.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!categoryId) {
      setErrorMessage('Please select a catalog category.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
      setErrorMessage('Please provide at least one product image URL.');
      window.scrollTo({ top: 400, behavior: 'smooth' });
      return;
    }
    if (hasVariants && variants.length === 0) {
      setErrorMessage('Please add at least one color & size variation using the Variations Builder.');
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
        images: images.map((img) => img.url),
        stock: hasVariants ? undefined : parseInt(standardStock, 10) || 10,
        variants: hasVariants
          ? variants.map((v, i) => ({
              id: v.id,
              size: v.size.trim(),
              color: v.color.trim(),
              sku: (v.sku.trim() || `${skuPrefix}-V${i + 1}`).toUpperCase(),
              price: v.price ? parseFloat(v.price) : numericPrice,
              stock: parseInt(v.stock, 10) || 10,
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
            ? 'Listing request submitted successfully for Admin review!'
            : 'Product saved safely as draft.'
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
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D5D9D9]">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#565959] mb-1">
            <Link href="/vendor/products" className="hover:text-[#007185] flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Seller Catalog</span>
            </Link>
            <span>/</span>
            <span className="text-[#0F1111]">
              {mode === 'create' ? 'Add New Product' : `Edit Product (${title || 'Draft'})`}
            </span>
          </div>
          <h1 className="text-2xl font-headline font-extrabold text-[#0F1111] flex items-center gap-2.5">
            <Package className="h-6 w-6 text-[#007185]" />
            <span>{mode === 'create' ? 'Create Marketplace Listing' : 'Edit Product Listing'}</span>
          </h1>
          <p className="text-xs text-[#565959] mt-0.5">
            Provide comprehensive product details, high-resolution imagery, and variant inventory for Vyntra patrons.
          </p>
        </div>

        {/* Quick Top Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/vendor/products"
            className="px-4 py-2 rounded-lg bg-white border border-[#D5D9D9] hover:bg-[#F7F8F8] text-xs font-bold text-[#0F1111] transition-all"
          >
            Discard
          </Link>
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg bg-white border border-[#007185] text-[#007185] hover:bg-[#007185]/5 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save Draft</span>
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting}
            className="px-5 py-2 rounded-lg bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] text-xs font-extrabold shadow-sm transition-all flex items-center gap-1.5 border border-[#FCD200]"
          >
            <CheckCircle2 className="h-4 w-4 text-[#0F1111]" />
            <span>Publish to Marketplace</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-3 animate-in fade-in">
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
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 1: BASIC INFORMATION                                         */}
      {/* ===================================================================== */}
      <section className="bg-white rounded-2xl border border-[#D5D9D9] p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-[#D5D9D9]">
          <Tag className="h-4 w-4 text-[#007185]" />
          <h2 className="font-headline font-bold text-base text-[#0F1111]">1. Basic Product Information</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Product Title */}
          <div className="md:col-span-2 space-y-1">
            <label className="block text-xs font-bold text-[#0F1111]">
              Product Title <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Handcrafted Royal Mulberry Silk Saree with Zari Border"
              className="w-full px-3.5 py-2 text-xs rounded-lg border border-[#D5D9D9] focus:outline-none focus:border-[#007185] focus:ring-1 focus:ring-[#007185] bg-white"
            />
            <p className="text-[11px] text-[#565959]">
              Include brand, primary craft/material, and silhouette for optimal search visibility.
            </p>
          </div>

          {/* Subtitle */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#0F1111]">Product Subtitle / Edition</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="e.g., Festive Edit 2026 • Certified Handloom Weave"
              className="w-full px-3.5 py-2 text-xs rounded-lg border border-[#D5D9D9] focus:outline-none focus:border-[#007185] bg-white"
            />
          </div>

          {/* Brand Name (Separated from Seller) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[#0F1111]">
                Product Brand <span className="text-rose-600">*</span>
              </label>
              {vendorStoreName && (
                <button
                  type="button"
                  onClick={() => setBrand(vendorStoreName)}
                  className="text-[11px] text-[#007185] hover:text-[#C7511F] hover:underline"
                >
                  Use my store name ({vendorStoreName})
                </button>
              )}
            </div>
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g., U.S. Polo Assn., Allen Solly, Levi's, Nike, Zara, FabIndia"
              className="w-full px-3.5 py-2 text-xs rounded-lg border border-[#D5D9D9] focus:outline-none focus:border-[#007185] focus:ring-1 focus:ring-[#007185] bg-white font-medium"
            />
            <p className="text-[11px] text-[#565959]">
              Enter the exact product brand (e.g. <strong>U.S. Polo Assn.</strong>). Customers use this to filter products by brand on Vyntra.
            </p>
          </div>

          {/* Seller / Merchant (Sold By) - Automatic Vendor Store Identification */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#0F1111]">
              Seller / Merchant (Sold By)
            </label>
            <div className="flex items-center gap-2 px-3.5 py-2 text-xs rounded-lg border border-[#D5D9D9] bg-[#F7F8F8] text-[#0F1111]">
              <Store className="w-3.5 h-3.5 text-[#007185]" />
              <span className="font-bold">{vendorStoreName || 'Your Registered Store'}</span>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-semibold ml-auto">
                Verified Seller Account
              </span>
            </div>
            <p className="text-[11px] text-[#565959]">
              This is your merchant storefront on Vyntra. All products automatically display &quot;Sold by {vendorStoreName || 'Your Store'}&quot;.
            </p>
          </div>

          {/* Amazon-Style Cascading Category Pathfinder (Dynamic Miller Columns) */}
          <div className="space-y-3 pt-2 md:col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1 border-b border-[#E7E7E7]">
              <div>
                <label className="block text-sm font-bold text-[#0F1111]">
                  Product Classification / Category <span className="text-rose-600">*</span>
                </label>
                <p className="text-xs text-[#565959]">
                  Browse step-by-step through Department › Section › Category › Sub-Category › Product Type (Leaf).
                </p>
              </div>
              {activeCategory && (
                <button
                  type="button"
                  onClick={() => {
                    setCategoryId('');
                    const fashion = rootCategories.find((r) => r.slug === 'fashion') || rootCategories[0];
                    setSelectedPath(fashion ? [fashion.id] : []);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-[#007185] hover:text-[#C7511F] hover:underline self-start sm:self-auto font-medium"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Category
                </button>
              )}
            </div>

            {/* Keyword Search Bar (Amazon Pathfinder Style) */}
            <div className="relative">
              <div className="relative">
                <Search className="w-4 h-4 text-[#565959] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={categorySearchQuery}
                  onChange={(e) => setCategorySearchQuery(e.target.value)}
                  placeholder="Search for a category (e.g., T-Shirts, Western Wear, Dresses, Boys Clothing, Handbags)..."
                  className="w-full pl-9 pr-9 py-2 text-xs rounded-lg border border-[#D5D9D9] focus:outline-none focus:border-[#007185] focus:ring-1 focus:ring-[#007185] bg-white shadow-inner"
                />
                {categorySearchQuery && (
                  <button
                    type="button"
                    onClick={() => setCategorySearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#565959] hover:text-[#0F1111]"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Instant Search Results Dropdown */}
              {categorySearchQuery.trim().length >= 2 && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-[#D5D9D9] rounded-lg shadow-xl overflow-hidden max-h-72 overflow-y-auto divide-y divide-[#F0F2F2]">
                  {searchResults.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#565959]">
                      No categories found matching &quot;{categorySearchQuery}&quot;. Browse via the columns below.
                    </div>
                  ) : (
                    searchResults.map((res) => (
                      <div
                        key={res.category.id}
                        className="p-2.5 px-3.5 hover:bg-[#F7F8F8] flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#0F1111] truncate">
                            {res.category.name}
                          </div>
                          <div className="text-[11px] text-[#565959] truncate flex items-center gap-1">
                            {res.pathString}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCategoryId(res.category.id);
                            setSelectedPath(res.trail.map((t) => t.id));
                            setCategorySearchQuery('');
                          }}
                          className="shrink-0 px-3 py-1 bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] border border-[#FCD200] text-xs font-bold rounded-md shadow-sm active:scale-95 transition-transform"
                        >
                          Select
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Dynamic Miller Columns Cascading Pathfinder */}
            {isLoadingCategories ? (
              <div className="h-64 bg-[#F7F8F8] rounded-xl border border-[#D5D9D9] animate-pulse flex items-center justify-center">
                <span className="text-xs text-[#565959] font-medium">Loading category hierarchy...</span>
              </div>
            ) : (
              <div className="border border-[#D5D9D9] rounded-xl bg-white shadow-sm overflow-hidden">
                <div className="flex overflow-x-auto divide-x divide-[#D5D9D9]">
                  {pathfinderColumns.map((col) => (
                    <div
                      key={`col-${col.levelIndex}`}
                      className="min-w-[210px] max-w-[260px] flex-1 flex-shrink-0 flex flex-col"
                    >
                      <div className="bg-[#F0F2F2] px-3 py-2 border-b border-[#D5D9D9] flex items-center justify-between">
                        <span className="text-xs font-bold text-[#0F1111] truncate">{col.title}</span>
                        <span className="text-[10px] text-[#565959] bg-white px-1.5 py-0.5 rounded border border-[#D5D9D9]">
                          {col.items.length}
                        </span>
                      </div>
                      <div className="h-64 overflow-y-auto divide-y divide-[#F7F8F8] p-1">
                        {col.items.length === 0 ? (
                          <div className="h-full flex items-center justify-center p-4 text-center text-xs text-[#565959]">
                            No subcategories
                          </div>
                        ) : (
                          col.items.map((cat) => {
                            const isSelectedInPath = col.selectedId === cat.id;
                            const isFinalSelected = categoryId === cat.id;
                            const hasChildren = (childrenMap.get(cat.id) || []).length > 0;

                            return (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => {
                                  const newPath = selectedPath.slice(0, col.levelIndex);
                                  newPath.push(cat.id);
                                  setSelectedPath(newPath);

                                  if (!hasChildren) {
                                    setCategoryId(cat.id);
                                  } else {
                                    // If vendor clicked an intermediate parent, set categoryId or leave open
                                    setCategoryId(cat.id);
                                  }
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                                  isFinalSelected && !hasChildren
                                    ? 'bg-emerald-50 text-emerald-800 font-bold border-l-4 border-emerald-600'
                                    : isSelectedInPath
                                    ? 'bg-[#007185]/10 text-[#007185] font-bold border-l-4 border-[#007185]'
                                    : 'text-[#0F1111] hover:bg-[#F7F8F8] font-medium'
                                }`}
                              >
                                <span className="truncate">{cat.name}</span>
                                {hasChildren ? (
                                  <ChevronRight className="w-3.5 h-3.5 text-[#565959] shrink-0 ml-1" />
                                ) : isFinalSelected ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-1" />
                                ) : (
                                  <span className="text-[10px] text-[#007185] font-semibold">Select</span>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Selected Classification Confirmation Bar */}
                <div className="bg-[#F7F8F8] border-t border-[#D5D9D9] p-3 px-4">
                  {activeCategory ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="text-[11px] font-bold text-[#565959] uppercase tracking-wide flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                          Selected Product Classification Path:
                        </div>
                        <div className="text-xs font-bold text-[#0F1111] flex items-center flex-wrap gap-1">
                          {activeCategory.trail.map((t, idx) => (
                            <React.Fragment key={t.id}>
                              {idx > 0 && <span className="text-[#565959] font-normal">›</span>}
                              <span
                                className={
                                  idx === activeCategory.trail.length - 1
                                    ? 'text-[#007185] bg-white px-2 py-0.5 rounded border border-[#007185]/30'
                                    : 'text-[#0F1111]'
                                }
                              >
                                {t.name}
                              </span>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Ready for Listing
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-[#C7511F]">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Please browse and click a category in the columns above or search by keyword to select.</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Product Type Configuration (Ready-made vs Made-to-Order) */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#0F1111]">
              Product Fulfillment Model <span className="text-rose-600">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <label
                onClick={() => setIsCustomized(false)}
                className={`cursor-pointer p-3 rounded-xl border flex flex-col justify-between transition-all ${
                  !isCustomized
                    ? 'border-[#007185] bg-[#007185]/5 shadow-sm'
                    : 'border-[#D5D9D9] bg-white hover:border-[#565959]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#0F1111]">Ready-made (Standard)</span>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      !isCustomized ? 'border-[#007185] bg-[#007185]' : 'border-[#D5D9D9]'
                    }`}
                  >
                    {!isCustomized && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <p className="text-[10px] text-[#565959] mt-1">Pre-stocked units dispatched within 24 hours.</p>
              </label>

              <label
                onClick={() => setIsCustomized(true)}
                className={`cursor-pointer p-3 rounded-xl border flex flex-col justify-between transition-all ${
                  isCustomized
                    ? 'border-[#800020] bg-rose-50/50 shadow-sm'
                    : 'border-[#D5D9D9] bg-white hover:border-[#565959]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#800020] flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    <span>Made-to-Order</span>
                  </span>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      isCustomized ? 'border-[#800020] bg-[#800020]' : 'border-[#D5D9D9]'
                    }`}
                  >
                    {isCustomized && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <p className="text-[10px] text-[#565959] mt-1">Bespoke tailored pieces crafted on client order.</p>
              </label>
            </div>
          </div>
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
      <section className="bg-white rounded-2xl border border-[#D5D9D9] p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D5D9D9]">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-[#007185]" />
            <div>
              <h2 className="font-headline font-bold text-base text-[#0F1111]">
                3. Product Media &amp; Image Gallery
              </h2>
              <p className="text-xs text-[#565959]">
                Add multiple high-resolution images. First image or starred image serves as primary hero thumbnail.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLoadSampleImages}
            className="text-xs font-bold text-[#007185] hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <Sparkles className="h-3 w-3" />
            <span>Load Curated Sample Images</span>
          </button>
        </div>

        {/* Add Image URL Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="relative flex-1 w-full">
            <Upload className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#565959]" />
            <input
              type="url"
              value={imageUrlInput}
              onChange={(e) => setImageUrlInput(e.target.value)}
              placeholder="Enter HTTPS image URL (e.g. Unsplash, Cloudinary, Supabase Storage)..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#D5D9D9] focus:outline-none focus:border-[#007185] bg-white font-mono"
            />
          </div>
          <button
            type="button"
            onClick={handleAddImageUrl}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#007185] hover:bg-[#004B57] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Image</span>
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
            <span>Browse Media Library</span>
          </button>
        </div>

        {/* Image Grid with Thumbnails, Reordering & Primary Selector */}
        {images.length === 0 ? (
          <div className="py-12 border-2 border-dashed border-[#D5D9D9] rounded-2xl text-center space-y-2 bg-[#F7F8F8]">
            <ImageIcon className="h-8 w-8 text-[#565959]/50 mx-auto" />
            <p className="font-bold text-xs text-[#0F1111]">No images uploaded yet</p>
            <p className="text-[11px] text-[#565959]">
              Add image URLs above or click &ldquo;Load Curated Sample Images&rdquo; to test.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {/* Left: Thumbnail & Management List */}
            <div className="md:col-span-2 space-y-3">
              <span className="text-xs font-bold text-[#565959] uppercase tracking-wider">
                Uploaded Images ({images.length})
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
                        <img src={img.url} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                        {img.isPrimary && (
                          <div className="absolute top-0 right-0 bg-[#FFD814] text-[#0F1111] text-[8px] font-black px-1 rounded-bl">
                            ★
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#0F1111]">Angle #{idx + 1}</span>
                          {img.isPrimary ? (
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-[#FFD814] text-[#0F1111]">
                              Primary Cover
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryImage(idx)}
                              className="text-[10px] text-[#007185] hover:underline font-semibold"
                            >
                              Set as Cover
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-[#565959] font-mono truncate max-w-sm mt-0.5">{img.url}</p>
                      </div>
                    </div>

                    {/* Actions: Reorder & Delete */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveImage(idx, 'up')}
                        className="p-1 text-[#565959] hover:text-[#0F1111] disabled:opacity-30"
                        title="Move Up"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === images.length - 1}
                        onClick={() => handleMoveImage(idx, 'down')}
                        className="p-1 text-[#565959] hover:text-[#0F1111] disabled:opacity-30"
                        title="Move Down"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="p-1 text-rose-600 hover:text-rose-800 ml-1"
                        title="Remove Image"
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
              <span className="text-xs font-bold text-[#565959] uppercase tracking-wider">
                Storefront Preview
              </span>
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-[#F7F8F8] border border-[#D5D9D9] shadow-inner flex items-center justify-center">
                {images[activePreviewIndex] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={images[activePreviewIndex]?.url}
                    alt="Main Preview"
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                ) : (
                  <ImageIcon className="h-12 w-12 text-[#565959]/30" />
                )}
                {images[activePreviewIndex]?.isPrimary && (
                  <div className="absolute top-3 left-3 bg-[#FFD814] text-[#0F1111] text-[10px] font-black px-2 py-0.5 rounded shadow">
                    HERO COVER IMAGE
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ===================================================================== */}
      {/* SECTION 4: PRODUCT VARIANTS & WAREHOUSE INVENTORY                     */}
      {/* ===================================================================== */}
      <section className="bg-white rounded-2xl border border-[#D5D9D9] p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D5D9D9]">
          <div className="flex items-center gap-2">
            <Boxes className="h-4 w-4 text-[#007185]" />
            <div>
              <h2 className="font-headline font-bold text-base text-[#0F1111]">
                4. Product Variants &amp; Inventory Matrix
              </h2>
              <p className="text-xs text-[#565959]">
                Configure sizes, colors, SKUs, and variant-wise stock allocations.
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
              Single Unit
            </button>
            <button
              type="button"
              onClick={() => setHasVariants(true)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                hasVariants ? 'bg-[#007185] text-white shadow-sm' : 'text-[#565959] hover:text-[#0F1111]'
              }`}
            >
              Multiple Variants (Size/Color)
            </button>
          </div>
        </div>

        {!hasVariants ? (
          /* Single Standard Variant Stock */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-4 bg-[#F7F8F8] rounded-xl border border-[#D5D9D9]">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#0F1111]">
                Warehouse Available Stock Units <span className="text-rose-600">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={standardStock}
                onChange={(e) => setStandardStock(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-mono font-bold rounded-lg border border-[#D5D9D9] focus:outline-none focus:border-[#007185] bg-white"
              />
              <p className="text-[10px] text-[#565959]">Total physical pieces available for direct fulfillment.</p>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#0F1111]">Generated Master SKU</label>
              <input
                type="text"
                readOnly
                value={`${skuPrefix}-STD`}
                className="w-full px-3.5 py-2 text-xs font-mono rounded-lg border border-[#D5D9D9] bg-[#EAEDED] text-[#565959]"
              />
              <p className="text-[10px] text-[#565959]">Auto-generated inventory identification code.</p>
            </div>
          </div>
        ) : (
          /* Multi-Variant Matrix Table */
          <div className="space-y-5">
            {/* Amazon-Style Variation Creator */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#F7F8F8] border border-[#D5D9D9] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#D5D9D9]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#007185]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F1111]">
                    Amazon-Style Variations Builder
                  </h3>
                </div>
                {variants.length > 0 && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#565959]">
                      Configured SKUs: <strong className="text-[#0F1111]">{variants.length}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={handleClearAllVariants}
                      className="text-xs text-rose-600 hover:text-rose-800 hover:underline font-bold"
                    >
                      Clear All
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
                    1. Color Name <span className="text-rose-600">*</span>
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
                  <p className="text-[10px] text-[#565959]">Enter color to generate sizes for.</p>
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
                        <span className="text-[#007185] font-extrabold">2. Choose UK Shoe Sizes (India Standard)</span>
                      ) : (
                        <span>2. Choose Sizes</span>
                      )}
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedSizes(
                          selectedSizes.length === AVAILABLE_SIZES.length ? [] : [...AVAILABLE_SIZES]
                        )
                      }
                      className="text-[10px] text-[#007185] font-bold hover:underline"
                    >
                      {selectedSizes.length === AVAILABLE_SIZES.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  {/* Dynamic Custom Capacity / Metric Creator for Appliances */}
                  {isApplianceCategory && (
                    <div className="bg-[#F0F8FF] border border-[#BCE1EB] rounded-xl p-2.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#007185] flex items-center gap-1">
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
                        <span className="text-[10px] text-[#565959] italic">Direct custom spec</span>
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
                            <span className="text-[10px] font-bold text-[#565959] px-1.5">BEE Star:</span>
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
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] pb-1">
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
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] pb-1">
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
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] pb-1">
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
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] pb-1">
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
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] pb-1">
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
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] pb-1">
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
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] pb-1">
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
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] pb-1">
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
                    <span className="text-[10px] text-[#565959] font-medium whitespace-nowrap">Can&apos;t find your variant?</span>
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
                    <span>+ Add Variations</span>
                  </button>
                </div>
              </div>
              </>
              )}
            </div>

            {/* Empty State vs Matrix Table */}
            {variants.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-[#D5D9D9] bg-[#FAFAFA] p-8 text-center space-y-2">
                <Layers className="w-8 h-8 text-[#565959]/40 mx-auto" />
                <p className="text-sm font-bold text-[#0F1111]">No Variants Added Yet</p>
                <p className="text-xs text-[#565959] max-w-md mx-auto">
                  Type a color name above (e.g. <strong>{isFootwearCategory ? 'Black White' : 'Green'}</strong>), select your sizes ({isFootwearCategory ? '6 UK, 7 UK, 8 UK...' : 'S, M, L, XL, 2XL'}), and click <strong>&quot;+ Add Variations&quot;</strong> to generate your clean catalog matrix.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto border border-[#D5D9D9] rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F7F8F8] border-b border-[#D5D9D9] text-[#565959] uppercase tracking-wider text-[10px]">
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
                        <th className="py-2.5 px-3 font-bold">Image Swatch (Amazon-Style)</th>
                        <th className="py-2.5 px-3 font-bold">Variant SKU</th>
                        <th className="py-2.5 px-3 font-bold">Price Override (₹)</th>
                        <th className="py-2.5 px-3 font-bold">Warehouse Stock</th>
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
                              className="w-full px-2 py-1 text-[11px] border border-[#D5D9D9] rounded focus:outline-none focus:border-[#007185] bg-white font-mono"
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
                          className="w-32 px-2 py-1.5 text-xs border border-[#D5D9D9] rounded focus:outline-none focus:border-[#007185] bg-white font-mono uppercase"
                        />
                      </td>

                      {/* Price */}
                      <td className="py-2 px-3 align-top">
                        <input
                          type="number"
                          value={v.price}
                          placeholder={price || 'Default'}
                          onChange={(e) => handleUpdateVariant(idx, 'price', e.target.value)}
                          className="w-24 px-2 py-1.5 text-xs border border-[#D5D9D9] rounded focus:outline-none focus:border-[#007185] bg-white font-mono"
                        />
                      </td>

                      {/* Stock */}
                      <td className="py-2 px-3 align-top">
                        <input
                          type="number"
                          min="0"
                          value={v.stock}
                          onChange={(e) => handleUpdateVariant(idx, 'stock', e.target.value)}
                          className="w-20 px-2 py-1.5 text-xs border border-[#D5D9D9] rounded focus:outline-none focus:border-[#007185] bg-white font-mono font-bold"
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
                    <span>+ Add Custom Single Row</span>
                  </button>
                  <p className="text-[11px] text-[#565959]">
                    Tip: Use the builder above to quickly add another complete colorway.
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
      <section className="bg-white rounded-2xl border border-[#D5D9D9] p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-[#D5D9D9]">
          <Ruler className="h-4 w-4 text-[#007185]" />
          <h2 className="font-headline font-bold text-base text-[#0F1111]">
            5. Specifications, Attributes &amp; Measurements
          </h2>
        </div>

        {/* Specifications Grid */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#565959] uppercase tracking-wider">
              Technical Specifications Table
            </span>
            <div className="flex items-center gap-2">
              {isBookCategory ? (
                <button
                  type="button"
                  onClick={() =>
                    setSpecs([
                      { label: 'Author', value: brand || 'James Clear' },
                      { label: 'Publisher', value: 'Penguin Random House' },
                      { label: 'Language', value: 'English' },
                      { label: 'Print Length', value: '320 pages' },
                      { label: 'Binding', value: variants[0]?.size || 'Paperback' },
                      { label: 'ISBN-10', value: '935302484X' },
                      { label: 'ISBN-13', value: '978-9353024840' },
                      { label: 'Reading Age', value: '13 years and up' },
                      { label: 'Country of Origin', value: 'India' },
                    ])
                  }
                  className="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-md hover:bg-amber-100 flex items-center gap-1 transition-all"
                >
                  <Sparkles className="h-3 w-3 text-amber-700" />
                  <span>Pre-fill Book Specs Template</span>
                </button>
              ) : isCameraCategory ? (
                <button
                  type="button"
                  onClick={() =>
                    setSpecs([
                      { label: 'Brand', value: brand || 'Sony' },
                      { label: 'Model Name', value: title ? title.slice(0, 40) : 'ILCE-6700M' },
                      { label: 'Compatible Mountings', value: 'Sony E' },
                      { label: 'Aspect Ratio', value: '1:1, 3:2, 4:3, 16:9' },
                      { label: 'Photo Sensor Technology', value: 'APS-C Exmor R CMOS' },
                      { label: 'Supported File Format', value: 'HEIF, JPEG, RAW' },
                      { label: 'Image Stabilisation', value: '5-Axis In-Body Sensor-shift' },
                      { label: 'Maximum Focal Length', value: '135 Millimeters' },
                      { label: 'Maximum Aperture', value: '2.8 f' },
                      { label: 'Expanded ISO Minimum', value: '50' },
                      { label: 'Metering Description', value: 'Center Weighted / Multi / Spot' },
                      { label: 'Video Capture Resolution', value: '4K 120p, 4K 60p, 10-bit 4:2:2' },
                      { label: 'Warranty', value: '2 Years Manufacturer Warranty' },
                    ])
                  }
                  className="text-xs font-bold text-indigo-800 bg-indigo-50 border border-indigo-300 px-2.5 py-1 rounded-md hover:bg-indigo-100 flex items-center gap-1 transition-all"
                >
                  <Sparkles className="h-3 w-3 text-indigo-600" />
                  <span>Pre-fill Camera Specs Template</span>
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
                        { label: 'Brand', value: brand || 'LG' },
                        { label: 'Model Name', value: title ? title.slice(0, 45) : 'Smart Inverter Refrigerator' },
                        { label: 'Energy Star Rating', value: starValue },
                        { label: 'Capacity', value: capNum ? `${capNum} Litres` : '251 Litres' },
                        { label: 'Configuration', value: 'Double Door Frost Free' },
                        { label: 'Compressor Type', value: 'Smart Inverter Compressor with 10 Year Warranty' },
                        { label: 'Annual Energy Consumption', value: '232 Kilowatt Hours Per Year' },
                        { label: 'Installation Type', value: 'Free Scheduled Standard Installation Included' },
                        { label: 'Warranty Summary', value: '10 Years on Compressor + 1 Year Comprehensive' },
                      ]);
                    } else if (isWashingMachineCategory) {
                      setSpecs([
                        { label: 'Brand', value: brand || 'LG' },
                        { label: 'Model Name', value: title ? title.slice(0, 45) : 'Smart Inverter Washing Machine' },
                        { label: 'Energy Star Rating', value: starValue },
                        { label: 'Capacity', value: capNum ? `${capNum} Kilograms` : '7.5 Kilograms' },
                        { label: 'Operation Type', value: 'Fully-Automatic Front Load' },
                        { label: 'Motor Type', value: 'Smart Inverter Direct Drive Motor with 10-Yr Warranty' },
                        { label: 'Maximum Rotational Speed', value: '1200 RPM' },
                        { label: 'Installation Type', value: 'Free Certified Doorstep Installation with Demo' },
                        { label: 'Warranty Summary', value: '10 Years on Motor + 2 Years Comprehensive Warranty' },
                      ]);
                    } else if (isAirCoolerCategory) {
                      setSpecs([
                        { label: 'Brand', value: brand || 'Symphony' },
                        { label: 'Model Name', value: title ? title.slice(0, 45) : 'Heavy Duty Desert Air Cooler' },
                        { label: 'Tank Capacity', value: capNum ? `${capNum} Litres` : '70 Litres' },
                        { label: 'Cooling Media', value: 'High Density Honeycomb Pads' },
                        { label: 'Air Throw Distance', value: '45 Feet Powerful Air Throw' },
                        { label: 'Blower / Fan Type', value: '3-Speed Rust-Proof Heavy Duty Aerodynamic Fan' },
                        { label: 'Special Features', value: 'Ice Chamber, Inverter Compatible, Dura-Pump Tech' },
                        { label: 'Warranty Summary', value: '1 Year Brand Manufacturer Warranty' },
                      ]);
                    } else if (isWaterPurifierCategory) {
                      setSpecs([
                        { label: 'Brand', value: brand || 'Kent' },
                        { label: 'Model Name', value: title ? title.slice(0, 45) : 'Mineral RO Water Purifier' },
                        { label: 'Storage Tank Capacity', value: capNum ? `${capNum} Litres` : '8 Litres' },
                        { label: 'Purification Technology', value: 'RO + UV + UF + Alkaline TDS Controller' },
                        { label: 'Purification Stages', value: '8 Stage Advanced Multi-Barrier Purification' },
                        { label: 'Filtration Capacity', value: 'Up to 20 Litres Per Hour' },
                        { label: 'Material', value: '100% Food Grade Non-Toxic ABS Plastic' },
                        { label: 'Installation Type', value: 'Wall Mountable / Counter Top' },
                        { label: 'Warranty Summary', value: '1 Year Comprehensive + 3 Years Service Warranty' },
                      ]);
                    } else if (isDryerCategory) {
                      setSpecs([
                        { label: 'Brand', value: brand || 'Philips' },
                        { label: 'Model Name', value: title ? title.slice(0, 45) : 'Professional Hair Dryer with Ionic Care' },
                        { label: 'Power Wattage', value: capNum ? `${capNum} Watts` : '2000 Watts' },
                        { label: 'Heat & Speed Settings', value: '3 Heat Settings + 2 Speed Settings with Cool Shot' },
                        { label: 'Motor Type', value: 'Long-Life Heavy Duty AC Motor' },
                        { label: 'Special Features', value: 'Ionic Conditioning for Frizz-Free Shiny Hair' },
                        { label: 'Cord Length', value: '1.8 Metres Salon Swivel Cord' },
                        { label: 'In-The-Box', value: 'Hair Dryer Unit, Styling Concentrator Nozzle, User Manual' },
                        { label: 'Warranty Summary', value: '2 Years Worldwide Brand Warranty' },
                      ]);
                    } else if (isAirConditionerCategory) {
                      setSpecs([
                        { label: 'Brand', value: brand || 'Daikin' },
                        { label: 'Model Name', value: title ? title.slice(0, 45) : 'Dual Inverter Split Air Conditioner' },
                        { label: 'Energy Star Rating', value: starValue },
                        { label: 'Capacity', value: capNum ? `${capNum} Ton` : '1.5 Ton' },
                        { label: 'Cooling Capacity', value: '5000 Watts' },
                        { label: 'Compressor Type', value: 'Dual Inverter Rotary Compressor with 10-Yr Warranty' },
                        { label: 'Condenser Coil', value: '100% Grooved Copper Tubes with Anti-Corrosion Coating' },
                        { label: 'Installation Type', value: 'Standard Copper Pipe Installation by Brand Technician' },
                        { label: 'Warranty Summary', value: '10 Years on Compressor + 5 Years on PCB + 1 Year Machine' },
                      ]);
                    } else if (isMicrowaveCategory) {
                      setSpecs([
                        { label: 'Brand', value: brand || 'Samsung' },
                        { label: 'Model Name', value: title ? title.slice(0, 45) : 'Convection Microwave Oven' },
                        { label: 'Cavity Capacity', value: capNum ? `${capNum} Litres` : '28 Litres' },
                        { label: 'Type', value: 'Convection with Grill and Solo Baking Modes' },
                        { label: 'Auto Cook Menus', value: 'Over 200 Indian Recipes Pre-Programmed' },
                        { label: 'Cavity Material', value: 'Ceramic Enamel Cavity with 99.9% Anti-Bacterial Protection' },
                        { label: 'Warranty Summary', value: '10 Years on Ceramic Enamel Cavity + 1 Year Machine' },
                      ]);
                    } else if (isChimneyCategory) {
                      setSpecs([
                        { label: 'Brand', value: brand || 'Faber' },
                        { label: 'Model Name', value: title ? title.slice(0, 45) : 'Auto-Clean Kitchen Chimney' },
                        { label: 'Suction Capacity', value: capNum ? `${capNum} m³/hr` : '1350 m³/hr' },
                        { label: 'Size', value: '60 cm (Ideal for 2-4 Burner Stoves)' },
                        { label: 'Filter Type', value: 'Filterless with Thermal Auto-Clean Technology' },
                        { label: 'Control Type', value: 'Touch & Motion Gesture Sensor Controls' },
                        { label: 'Warranty Summary', value: '12 Years on Motor + 2 Years Comprehensive Warranty' },
                      ]);
                    } else {
                      setSpecs([
                        { label: 'Brand', value: brand || 'LG' },
                        { label: 'Model Name', value: title ? title.slice(0, 40) : 'Premium Smart Home Appliance' },
                        { label: 'Energy Star Rating', value: starValue },
                        { label: 'Capacity', value: capNum ? `${capNum}` : 'Standard Capacity' },
                        { label: 'Motor / Compressor', value: 'Smart Digital Inverter Technology' },
                        { label: 'Installation Type', value: 'Free Scheduled Doorstep Installation Included' },
                        { label: 'Warranty Summary', value: '10 Years on Motor/Compressor + 1 Year Machine Warranty' },
                      ]);
                    }
                  }}
                  className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-300 px-2.5 py-1 rounded-md hover:bg-teal-100 flex items-center gap-1 transition-all"
                >
                  <Sparkles className="h-3 w-3 text-teal-600" />
                  <span>
                    {isRefrigeratorCategory
                      ? 'Pre-fill Refrigerator Specs'
                      : isWashingMachineCategory
                      ? 'Pre-fill Washing Machine Specs'
                      : isAirConditionerCategory
                      ? 'Pre-fill AC Specs'
                      : isAirCoolerCategory
                      ? 'Pre-fill Cooler Specs'
                      : isWaterPurifierCategory
                      ? 'Pre-fill Purifier Specs'
                      : isDryerCategory
                      ? 'Pre-fill Dryer Specs'
                      : isMicrowaveCategory
                      ? 'Pre-fill Microwave Specs'
                      : isChimneyCategory
                      ? 'Pre-fill Chimney Specs'
                      : 'Pre-fill Appliance Specs'}
                  </span>
                </button>
              ) : isAudioCategory ? (
                <button
                  type="button"
                  onClick={() =>
                    setSpecs([
                      { label: 'Brand', value: brand || 'JBL' },
                      { label: 'Colour', value: variants[0]?.color || 'Black' },
                      { label: 'Ear Placement', value: 'Over Ear' },
                      { label: 'Form Factor', value: 'Over Ear' },
                      { label: 'Impedance', value: '32 Ohms' },
                      { label: 'Noise Cancellation', value: 'Adaptive Noise Cancelling with Smart Ambient' },
                      { label: 'Battery Life', value: 'Up to 76 hours of battery life' },
                      { label: 'Connectivity', value: 'Bluetooth 5.3 Wireless' },
                      { label: 'Microphone', value: 'Built-in Beamforming Mics' },
                      { label: 'Warranty', value: '1 Year Brand Warranty' },
                    ])
                  }
                  className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-md hover:bg-amber-100 flex items-center gap-1 transition-all"
                >
                  <Sparkles className="h-3 w-3 text-amber-600" />
                  <span>Pre-fill Headphone / Audio Specs Template</span>
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
                      { label: 'Network', value: '5G' },
                      { label: 'Operating System', value: 'Android / iOS' },
                      { label: 'Warranty', value: '1 Year Manufacturer Warranty' },
                    ])
                  }
                  className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-md hover:bg-emerald-100 flex items-center gap-1 transition-all"
                >
                  <Sparkles className="h-3 w-3 text-emerald-600" />
                  <span>Pre-fill Mobile Specs Template</span>
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
                      { label: 'Connectivity', value: 'Bluetooth & Wi-Fi' },
                      { label: 'Operating System', value: 'Windows / macOS' },
                      { label: 'Warranty', value: '1 Year Brand Warranty' },
                    ])
                  }
                  className="text-xs font-bold text-sky-800 bg-sky-50 border border-sky-300 px-2.5 py-1 rounded-md hover:bg-sky-100 flex items-center gap-1 transition-all"
                >
                  <Sparkles className="h-3 w-3 text-sky-600" />
                  <span>Pre-fill Electronics Specs Template</span>
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleAddSpec}
                className="text-xs font-bold text-[#007185] hover:underline flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                <span>Add Specification</span>
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
                  placeholder="Attribute"
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
                  placeholder="Value"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveSpec(idx)}
                  className="text-rose-600 hover:text-rose-800 p-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Category-Aware Measurement Chart & Explanatory Guidance (Fashion & Footwear only) */}
        {!isElectronicsCategory && !isApplianceCategory && !isBookCategory && (
          <div className="space-y-3 pt-4 border-t border-[#D5D9D9]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Ruler className="h-4 w-4 text-[#007185]" />
              <span className="text-xs font-bold text-[#0F1111] uppercase tracking-wider">
                {isFootwearCategory
                  ? 'Footwear Sizing & Fit Conversion Matrix (India / UK / EU)'
                  : isMeasurementChartVisible
                  ? 'Apparel Measurement Chart (Inches)'
                  : 'Category Sizing & Dimensions Guide'}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isFootwearCategory
                    ? 'bg-sky-50 text-[#007185] border border-sky-200'
                    : measurementProfile.showApparelChart
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                {isFootwearCategory ? (isWomenFootwear ? "Women's Footwear" : "Men's Footwear") : measurementProfile.badge}
              </span>
            </div>

            {/* Optional override toggle for special listings */}
            {!isFootwearCategory && !measurementProfile.showApparelChart && (
              <button
                type="button"
                onClick={() => setShowChartOverride(!isMeasurementChartVisible)}
                className="text-[11px] text-[#007185] hover:text-[#C7511F] font-medium underline flex items-center gap-1"
              >
                {isMeasurementChartVisible ? 'Hide custom chart' : '+ Show custom size chart anyway'}
              </button>
            )}
          </div>

          {/* Conditional Display: Footwear vs Stitched Apparel vs Unstitched / Non-Apparel Guidance */}
          {isFootwearCategory ? (
            <div className="space-y-3">
              <p className="text-[11px] text-[#565959]">
                Standard India/UK footwear fit reference. Buyers will see this size conversion guide in the <strong>&quot;Size Chart&quot;</strong> modal on your product detail page.
              </p>

              <div className="overflow-x-auto border border-[#D5D9D9] rounded-xl max-w-2xl bg-white shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F8F8] border-b border-[#D5D9D9] text-[#565959] uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3 font-bold">Brand Size</th>
                      <th className="py-2.5 px-3 font-bold text-[#007185]">UK / India</th>
                      <th className="py-2.5 px-3 font-bold">EU</th>
                      <th className="py-2.5 px-3 font-bold">USA</th>
                      <th className="py-2.5 px-3 font-bold">Heel to Toe (in)</th>
                      <th className="py-2.5 px-3 font-bold">Foot Length (cm)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D5D9D9]/50">
                    {(isWomenFootwear
                      ? [
                          { brand: '3', uk: '3 UK', eu: '35.5', us: '4.5', in: '8.7 in', cm: '22.1 cm' },
                          { brand: '4', uk: '4 UK', eu: '36.7', us: '5.5', in: '9.0 in', cm: '22.9 cm' },
                          { brand: '5', uk: '5 UK', eu: '38.0', us: '6.5', in: '9.3 in', cm: '23.7 cm' },
                          { brand: '6', uk: '6 UK', eu: '39.3', us: '7.5', in: '9.7 in', cm: '24.6 cm' },
                          { brand: '7', uk: '7 UK', eu: '40.7', us: '8.5', in: '10.0 in', cm: '25.4 cm' },
                          { brand: '8', uk: '8 UK', eu: '42.0', us: '9.5', in: '10.3 in', cm: '26.2 cm' },
                        ]
                      : [
                          { brand: '6', uk: '6 UK', eu: '40.0', us: '7.0', in: '9.8 in', cm: '25.0 cm' },
                          { brand: '7', uk: '7 UK', eu: '41.0', us: '8.0', in: '10.2 in', cm: '26.0 cm' },
                          { brand: '8', uk: '8 UK', eu: '42.0', us: '9.0', in: '10.6 in', cm: '27.0 cm' },
                          { brand: '9', uk: '9 UK', eu: '43.0', us: '10.0', in: '11.0 in', cm: '28.0 cm' },
                          { brand: '10', uk: '10 UK', eu: '44.5', us: '11.0', in: '11.4 in', cm: '29.0 cm' },
                          { brand: '11', uk: '11 UK', eu: '46.0', us: '12.0', in: '11.8 in', cm: '30.0 cm' },
                          { brand: '12', uk: '12 UK', eu: '47.0', us: '13.0', in: '12.2 in', cm: '31.0 cm' },
                        ]
                    ).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-bold text-[#0F1111]">{row.brand}</td>
                        <td className="py-2 px-3 font-extrabold text-[#007185]">{row.uk}</td>
                        <td className="py-2 px-3 text-[#565959]">{row.eu}</td>
                        <td className="py-2 px-3 text-[#565959]">{row.us}</td>
                        <td className="py-2 px-3 text-[#565959]">{row.in}</td>
                        <td className="py-2 px-3 text-[#565959]">{row.cm}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : isMeasurementChartVisible ? (
            <div className="space-y-3">
              <p className="text-[11px] text-[#565959]">
                Specify garment measurements in inches for standard sizes S to XL. This measurement table helps buyers pick their exact fit and significantly reduces returns.
              </p>

              <div className="overflow-x-auto border border-[#D5D9D9] rounded-xl max-w-xl bg-white shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F8F8] border-b border-[#D5D9D9] text-[#565959] uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3 font-bold">Size</th>
                      <th className="py-2.5 px-3 font-bold">Chest (in)</th>
                      <th className="py-2.5 px-3 font-bold">Waist (in)</th>
                      <th className="py-2.5 px-3 font-bold">Length (in)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D5D9D9]/50">
                    {sizeChart.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-bold text-[#0F1111]">{row.size}</td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={row.chest}
                            onChange={(e) => {
                              const copy = [...sizeChart];
                              copy[idx].chest = e.target.value;
                              setSizeChart(copy);
                            }}
                            className="w-20 px-2 py-1 border border-[#D5D9D9] rounded text-xs focus:outline-none focus:border-[#007185]"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={row.waist}
                            onChange={(e) => {
                              const copy = [...sizeChart];
                              copy[idx].waist = e.target.value;
                              setSizeChart(copy);
                            }}
                            className="w-20 px-2 py-1 border border-[#D5D9D9] rounded text-xs focus:outline-none focus:border-[#007185]"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={row.length}
                            onChange={(e) => {
                              const copy = [...sizeChart];
                              copy[idx].length = e.target.value;
                              setSizeChart(copy);
                            }}
                            className="w-20 px-2 py-1 border border-[#D5D9D9] rounded text-xs focus:outline-none focus:border-[#007185]"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-gradient-to-r from-amber-50/60 to-slate-50 border border-amber-200/80 rounded-xl text-xs space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2 text-amber-900 font-semibold">
                <Info className="h-4 w-4 text-amber-700 shrink-0" />
                <span>{measurementProfile.title}</span>
              </div>
              <p className="text-[#565959] text-[11px] leading-relaxed">
                {measurementProfile.description}
              </p>
              <div className="pt-1 text-[11px] text-[#0F1111] font-medium flex items-center gap-1.5">
                <span className="text-[#007185]">💡 Recommendation:</span>
                <span>{measurementProfile.recommendation}</span>
              </div>
            </div>
          )}
        </div>
        )}
      </section>

      {/* ===================================================================== */}
      {/* SECTION 6: RICH DESCRIPTION & HIGHLIGHTS                              */}
      {/* ===================================================================== */}
      <section className="bg-white rounded-2xl border border-[#D5D9D9] p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-[#D5D9D9]">
          <Sparkles className="h-4 w-4 text-[#007185]" />
          <h2 className="font-headline font-bold text-base text-[#0F1111]">
            6. Highlights &amp; Full Story Description
          </h2>
        </div>

        {/* Amazon-style Bullet Highlights ("About this item") */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-[#0F1111]">
            Key Bullet Highlights (&ldquo;About this item&rdquo;)
          </label>
          <div className="space-y-2">
            {highlights.map((h, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#007185]/10 text-[#007185] flex items-center justify-center font-bold text-[10px] shrink-0">
                  ✓
                </span>
                <input
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
                placeholder="Add another highlight bullet..."
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
          <label className="block text-xs font-bold text-[#0F1111]">
            Full Artisan Story &amp; Product Narrative
          </label>
          <textarea
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Share the heritage, handloom weaving history, atelier backstory, and styling guidance..."
            className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-[#D5D9D9] focus:outline-none focus:border-[#007185] bg-white"
          />
          <p className="text-[11px] text-[#565959]">
            Displayed directly in the full-width scrollable description section of the product detail page.
          </p>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* SECTION 7: AMAZON A+ RICH PRODUCT DESCRIPTION (EDITORIAL MODULES)    */}
      {/* ===================================================================== */}
      <section className="bg-white rounded-2xl border border-[#D5D9D9] p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D5D9D9]">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#800020]" />
            <div>
              <h3 className="text-base font-bold text-[#0F1111]">
                Amazon A+ Rich Product Description (Editorial Modules)
              </h3>
              <p className="text-xs text-[#565959]">
                Add visually rich editorial sections for desktop and mobile: Hero banners, image-with-text splits, feature cards, and craftsmanship stories.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 text-[#800020] border border-amber-200">
            A+ Brand Content
          </span>
        </div>

        <APlusBuilder
          aplusData={aplusData}
          onChange={setAplusData}
          brandName={brand || 'Artisan Studio'}
        />
      </section>

      {/* ===================================================================== */}
      {/* BOTTOM STICKY BAR: DRAFT & PUBLISH ACTIONS                            */}
      {/* ===================================================================== */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#D5D9D9] shadow-2xl py-3 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-[#0F1111]">{title || 'Untitled Product'}</span>
            <span className="text-[#565959]">•</span>
            <span className="font-mono font-bold text-[#007185]">
              {price ? formatINR(numericPrice) : 'Price TBD'}
            </span>
            {isCustomized && (
              <span className="bg-rose-100 text-[#800020] text-[10px] font-bold px-2 py-0.5 rounded-full">
                Made to Order
              </span>
            )}
            {lastAutoSavedTime && (
              <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold whitespace-nowrap">
                <Check className="h-2.5 w-2.5 text-emerald-600" />
                Auto-saved ({lastAutoSavedTime})
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/vendor/products"
              className="px-4 py-2 rounded-lg bg-[#F7F8F8] border border-[#D5D9D9] hover:bg-[#EAEDED] text-xs font-bold text-[#0F1111] transition-all"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-white border border-[#007185] text-[#007185] hover:bg-[#007185]/5 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isSubmitting ? 'Saving...' : 'Save as Draft'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
              className="px-6 py-2 rounded-lg bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] text-xs font-extrabold shadow-sm transition-all flex items-center gap-1.5 border border-[#FCD200]"
            >
              <CheckCircle2 className="h-4 w-4 text-[#0F1111]" />
              <span>{isSubmitting ? 'Publishing...' : 'Publish Product'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* RESTORE DRAFT RECOVERY MODAL                                         */}
      {/* ===================================================================== */}
      {showDraftModal && existingDraft && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#D5D9D9] max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#232F3E] to-[#131921] text-white p-5 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FF9900]/20 border border-[#FF9900]/40 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5 text-[#FF9900]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">Restore Unsaved Draft?</h3>
                  <p className="text-xs text-stone-300 mt-0.5">We recovered your progress from an earlier session</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <p className="text-xs text-[#565959] leading-relaxed">
                You were working on a product before the window was closed or refreshed. Would you like to restore your details or discard and start fresh?
              </p>

              {/* Draft snapshot card */}
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex items-baseline justify-between gap-2 border-b border-stone-200/80 pb-2">
                  <span className="font-bold text-[#0F1111] line-clamp-1">
                    {existingDraft.title || 'Untitled Product'}
                  </span>
                  <span className="font-mono font-bold text-[#007185] whitespace-nowrap">
                    {existingDraft.price ? `₹${Number(existingDraft.price).toLocaleString('en-IN')}` : 'Price TBD'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-[#565959]">
                  <div>
                    Brand: <strong className="text-[#0F1111]">{existingDraft.brand || 'None'}</strong>
                  </div>
                  <div>
                    Variants: <strong className="text-[#0F1111]">{existingDraft.variants?.length || 0} configured</strong>
                  </div>
                  <div>
                    Images: <strong className="text-[#0F1111]">{existingDraft.images?.length || 0} uploaded</strong>
                  </div>
                  <div>
                    Saved: <strong className="text-[#0F1111]">{existingDraft.savedAt ? new Date(existingDraft.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}</strong>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleRestoreDraft}
                  className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] font-bold text-xs shadow-sm transition-all border border-[#FCD200] flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore My Draft</span>
                </button>
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-white hover:bg-stone-100 text-[#565959] hover:text-rose-600 font-semibold text-xs border border-stone-200 transition-all text-center"
                >
                  Discard & Start Fresh
                </button>
              </div>
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
        title={mediaTarget === 'gallery' ? 'Select Product Gallery Image' : 'Select Color Swatch Image'}
      />
    </div>
  );
}
