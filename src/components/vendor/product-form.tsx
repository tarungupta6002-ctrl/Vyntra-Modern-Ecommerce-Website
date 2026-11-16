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
} from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { APlusData, createDefaultAPlusContent } from '@/types/aplus';
import { APlusBuilder } from '@/components/vendor/aplus-builder';
import { MediaPickerModal, SelectedMedia } from '@/components/media/media-picker-modal';
import { getCategoryMeasurementProfile } from '@/lib/category-measurement';

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
}

export interface ProductFormProps {
  mode: 'create' | 'edit';
  productId?: string;
  initialData?: any;
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
        }))
      : []
  );

  // Amazon-Style Variations Builder State
  const [builderColor, setBuilderColor] = useState('');
  const [selectedSizes, setSelectedSizes] = useState<string[]>(['S', 'M', 'L', 'XL', '2XL']);

  // Description & Highlights
  const [description, setDescription] = useState(initialData?.description || '');
  const [highlights, setHighlights] = useState<string[]>([
    'Handcrafted in small artisan batches by master weavers.',
    '100% genuine natural fibers certified for sustainability.',
    'Traditional heritage weaving technique with modern tailoring.',
    'Pre-shrunk and color-fast tested for long-lasting luxury.',
  ]);
  const [newHighlight, setNewHighlight] = useState('');

  // Specifications
  const [specs, setSpecs] = useState<Array<{ label: string; value: string }>>([
    { label: 'Material & Fabric', value: '100% Pure Organic Handloom Weave' },
    { label: 'Weave Type', value: 'Heritage Artisan Loom' },
    { label: 'Fit Type', value: 'Contemporary Tailored Fit' },
    { label: 'Care Instructions', value: 'Dry Clean Recommended' },
    { label: 'Country of Origin', value: 'India' },
  ]);

  // Size Guide
  const [sizeChart, setSizeChart] = useState<Array<{ size: string; chest: string; waist: string; length: string }>>([
    { size: 'S', chest: '38 in', waist: '32 in', length: '40 in' },
    { size: 'M', chest: '40 in', waist: '34 in', length: '41 in' },
    { size: 'L', chest: '42 in', waist: '36 in', length: '42 in' },
    { size: 'XL', chest: '44 in', waist: '38 in', length: '43 in' },
  ]);

  // Amazon A+ Rich Product Description Modules
  const [aplusData, setAplusData] = useState<APlusData>(() => {
    if (initialData?.aplus && initialData.aplus.modules && initialData.aplus.modules.length > 0) {
      return initialData.aplus;
    }
    return createDefaultAPlusContent({
      title: initialData?.title || 'Handcrafted Heritage Collection',
      brand: initialData?.brand || 'Vyntra Atelier',
      category: 'fashion',
    });
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

  const AVAILABLE_SIZES = React.useMemo(() => {
    return isFreeSizeCategory
      ? ['Free Size']
      : ['S', 'M', 'L', 'XL', '2XL', '3XL', 'Free Size'];
  }, [isFreeSizeCategory]);

  useEffect(() => {
    if (isFreeSizeCategory) {
      setSelectedSizes(['Free Size']);
    }
  }, [isFreeSizeCategory]);

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

  // Amazon-style: Generate variants from Color + Selected Sizes
  const handleGenerateAmazonVariants = () => {
    const rawColor = builderColor.trim();
    if (!rawColor) {
      alert('Please enter a Color Name (e.g. Green, Royal Blue, Black).');
      return;
    }
    if (selectedSizes.length === 0) {
      alert('Please select at least one size.');
      return;
    }
    const cleanTag = rawColor.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'COL';
    const newItems: ProductVariantItem[] = selectedSizes.map((sz) => ({
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
        aplus: aplusData,
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
          <span>{errorMessage}</span>
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

      {/* ===================================================================== */}
      {/* SECTION 2: PRICING & INVENTORY COMMERCIALS                           */}
      {/* ===================================================================== */}
      <section className="bg-white rounded-2xl border border-[#D5D9D9] p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-[#D5D9D9]">
          <DollarSign className="h-4 w-4 text-[#007185]" />
          <h2 className="font-headline font-bold text-base text-[#0F1111]">2. Pricing &amp; Commercials</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Selling Price */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#0F1111]">
              Selling Price (₹ INR) <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-bold text-[#565959]">₹</span>
              <input
                type="number"
                min="1"
                step="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="2499"
                className="w-full pl-7 pr-3 py-2 text-xs font-mono font-bold rounded-lg border border-[#D5D9D9] focus:outline-none focus:border-[#007185] bg-white"
              />
            </div>
            <p className="text-[10px] text-[#565959]">Final amount charged to customer inclusive of taxes.</p>
          </div>

          {/* Original MRP */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#0F1111]">Original MRP (₹ INR)</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-bold text-[#565959]">₹</span>
              <input
                type="number"
                min="1"
                step="1"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                placeholder="4999"
                className="w-full pl-7 pr-3 py-2 text-xs font-mono font-bold rounded-lg border border-[#D5D9D9] focus:outline-none focus:border-[#007185] bg-white"
              />
            </div>
            <p className="text-[10px] text-[#565959]">Used to display strikethrough discount badge.</p>
          </div>

          {/* Discount Preview Pill */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#0F1111]">Marketplace Offer Preview</label>
            <div className="h-[38px] px-3.5 rounded-lg bg-[#F7F8F8] border border-[#D5D9D9] flex items-center justify-between">
              <span className="text-xs text-[#565959]">Calculated Deal:</span>
              {discountPercent > 0 ? (
                <span className="bg-[#CC0C39] text-white text-[11px] font-extrabold px-2 py-0.5 rounded">
                  {discountPercent}% OFF
                </span>
              ) : (
                <span className="text-xs font-bold text-[#565959]">Regular Price</span>
              )}
            </div>
          </div>
        </div>
      </section>

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
                    placeholder="e.g. Green, Royal Blue, Black..."
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
                      2. Choose Sizes
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
            </div>

            {/* Empty State vs Matrix Table */}
            {variants.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-[#D5D9D9] bg-[#FAFAFA] p-8 text-center space-y-2">
                <Layers className="w-8 h-8 text-[#565959]/40 mx-auto" />
                <p className="text-sm font-bold text-[#0F1111]">No Variants Added Yet</p>
                <p className="text-xs text-[#565959] max-w-md mx-auto">
                  Type a color name above (e.g. <strong>Green</strong>), select your sizes (S, M, L, XL, 2XL), and click <strong>&quot;+ Add Variations&quot;</strong> to generate your clean catalog matrix.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto border border-[#D5D9D9] rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F7F8F8] border-b border-[#D5D9D9] text-[#565959] uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3 font-bold">Size</th>
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
                          placeholder="e.g. S, M, Free Size"
                          className="w-24 px-2 py-1.5 text-xs border border-[#D5D9D9] rounded focus:outline-none focus:border-[#007185] bg-white font-semibold"
                        />
                      </td>

                      {/* Color */}
                      <td className="py-2 px-3 align-top">
                        <input
                          type="text"
                          value={v.color}
                          onChange={(e) => handleUpdateVariant(idx, 'color', e.target.value)}
                          placeholder="e.g. Royal Navy"
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
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#565959] uppercase tracking-wider">
              Technical Specifications Table
            </span>
            <button
              type="button"
              onClick={handleAddSpec}
              className="text-xs font-bold text-[#007185] hover:underline flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              <span>Add Specification</span>
            </button>
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

        {/* Dynamic Category-Aware Measurement Chart & Explanatory Guidance */}
        <div className="space-y-3 pt-4 border-t border-[#D5D9D9]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Ruler className="h-4 w-4 text-[#007185]" />
              <span className="text-xs font-bold text-[#0F1111] uppercase tracking-wider">
                {isMeasurementChartVisible ? 'Apparel Measurement Chart (Inches)' : 'Category Sizing & Dimensions Guide'}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  measurementProfile.showApparelChart
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                {measurementProfile.badge}
              </span>
            </div>

            {/* Optional override toggle for special listings */}
            {!measurementProfile.showApparelChart && (
              <button
                type="button"
                onClick={() => setShowChartOverride(!isMeasurementChartVisible)}
                className="text-[11px] text-[#007185] hover:text-[#C7511F] font-medium underline flex items-center gap-1"
              >
                {isMeasurementChartVisible ? 'Hide custom chart' : '+ Show custom size chart anyway'}
              </button>
            )}
          </div>

          {/* Conditional Display: Stitched Apparel vs Unstitched / Non-Apparel Guidance */}
          {isMeasurementChartVisible ? (
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
