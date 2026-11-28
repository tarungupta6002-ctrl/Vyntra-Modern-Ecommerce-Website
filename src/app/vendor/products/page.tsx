'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Package,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  Store,
  Layers,
  ArrowRight,
  X,
  Image as ImageIcon,
  Check,
  Sparkles,
  Clock,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { VendorPageHeader, VendorStats, vendorButton } from '@/components/vendor/vendor-ui';

interface VendorProduct {
  id: string;
  title: string;
  subtitle?: string | null;
  slug: string;
  brand: string;
  price: number;
  originalPrice: number;
  isPublished: boolean;
  status: 'PUBLISHED' | 'DRAFT';
  category: { id: string; name: string; slug: string };
  image: string;
  images: Array<{ id: string; url: string; isPrimary: boolean }>;
  totalStock: number;
  variantsCount: number;
  rating: number;
  reviewCount: number;
  isOriginalCreator?: boolean;
  listingType?: string;
  isBuyBoxWinner?: boolean;
  offerId?: string;
  createdAt: string;
  updatedAt: string;
}

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

interface VendorSession {
  userId: string;
  email: string;
  name?: string;
  role: string;
  isVendor: boolean;
  vendorProfile: {
    id: string;
    storeName: string;
    storeSlug: string;
    status: string;
    isVerified: boolean;
  } | null;
  vendorApplication?: {
    id: string;
    storeName: string;
    storeSlug: string;
    status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
    rejectionReason: string | null;
    documents?: any;
    createdAt: string;
  } | null;
}

function VendorProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editParam = searchParams.get('edit');

  const [session, setSession] = useState<VendorSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<VendorProduct | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    brand: '',
    categoryId: '',
    price: '',
    originalPrice: '',
    sku: '',
    stock: '15',
    imageUrl: '',
    description: '',
  });
  const [formError, setFormError] = useState('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Onboarding Store State
  const [storeNameInput, setStoreNameInput] = useState('');
  const [isOnboarding, setIsOnboarding] = useState(false);

  // Show Toast
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Fetch Vendor Session
  const fetchSession = async () => {
    try {
      setSessionLoading(true);
      const res = await fetch('/api/vendor/me');
      const json = await res.json();
      if (json.success && json.data) {
        setSession(json.data);
      } else {
        setSession(null);
      }
    } catch (err) {
      setSession(null);
    } finally {
      setSessionLoading(false);
    }
  };

  // 2. Fetch Products
  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res = await fetch(`/api/vendor/products?${params.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setProducts(json.data);
      } else {
        setProducts([]);
      }
    } catch (err) {
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Fetch Categories
  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/vendor/categories');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setCategories(json.data);
        if (json.data.length > 0 && !formData.categoryId) {
          setFormData((prev) => ({ ...prev, categoryId: json.data[0].id }));
        }
      }
    } catch (err) {
      console.warn('Failed to load categories');
    }
  };

  useEffect(() => {
    fetchSession();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (session?.isVendor && session.vendorProfile) {
      fetchProducts();
    }
  }, [session, statusFilter]);

  // Handle URL ?edit= query parameter with strict ownership authorization
  useEffect(() => {
    if (!editParam || !session?.isVendor) return;
    const cleanId = String(editParam);
    async function loadEditProduct(idToLoad: string) {
      try {
        const res = await fetch(`/api/vendor/products/${encodeURIComponent(idToLoad)}`);
        const json = await res.json();
        if (res.ok && json.success && json.data) {
          handleOpenEditModal(json.data);
        } else {
          showToast(json.error?.message || 'Access denied: You cannot edit products from other sellers.', 'error');
        }
      } catch (e: any) {
        showToast(e.message || 'Error loading product', 'error');
      }
    }
    loadEditProduct(cleanId);
  }, [editParam, session]);

  // Handle Search Debounce
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  // Open Modal for New Product
  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      title: '',
      subtitle: '',
      brand: session?.vendorProfile?.storeName || 'Vyntra Artisan',
      categoryId: categories[0]?.id || '',
      price: '',
      originalPrice: '',
      sku: `VYN-${Date.now().toString().slice(-6)}`,
      stock: '20',
      imageUrl: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80',
      description: '',
    });
    setFormError('');
    setModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (prod: VendorProduct) => {
    setEditingProduct(prod);
    setFormData({
      title: prod.title,
      subtitle: prod.subtitle || '',
      brand: prod.brand,
      categoryId: prod.category?.id || categories[0]?.id || '',
      price: prod.price.toString(),
      originalPrice: prod.originalPrice.toString(),
      sku: prod.slug,
      stock: prod.totalStock.toString(),
      imageUrl: prod.image,
      description: '',
    });
    setFormError('');
    setModalOpen(true);
  };

  // Handle Form Submit (Draft or Publish)
  const handleSubmitProduct = async (shouldPublish: boolean) => {
    if (!formData.title.trim()) {
      setFormError('Product title is required.');
      return;
    }
    if (!formData.price || isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      setFormError('Please enter a valid positive price.');
      return;
    }
    if (!formData.categoryId) {
      setFormError('Please select a product category.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const payload = {
        title: formData.title.trim(),
        subtitle: formData.subtitle.trim(),
        brand: formData.brand.trim() || 'Vyntra Artisan',
        categoryId: formData.categoryId,
        price: Number(formData.price),
        originalPrice: formData.originalPrice ? Number(formData.originalPrice) : Number(formData.price),
        sku: formData.sku.trim(),
        stock: Number(formData.stock) || 10,
        images: formData.imageUrl ? [formData.imageUrl.trim()] : [],
        description: formData.description.trim(),
        isPublished: shouldPublish,
      };

      const endpoint = editingProduct
        ? `/api/vendor/products/${editingProduct.id}`
        : '/api/vendor/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to save product');
      }

      showToast(
        shouldPublish
          ? 'Product successfully PUBLISHED to customer catalog!'
          : 'Product successfully saved as DRAFT.'
      );
      setModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Toggle Publish / Draft
  const handleTogglePublish = async (prod: VendorProduct) => {
    try {
      const res = await fetch(`/api/vendor/products/${prod.id}/publish`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !prod.isPublished }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(
          prod.isPublished
            ? `"${prod.title}" changed to DRAFT.`
            : `"${prod.title}" is now LIVE on customer storefront!`
        );
        fetchProducts();
      } else {
        showToast(json.error?.message || 'Action failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Network error', 'error');
    }
  };

  // Handle Delete
  const handleDeleteProduct = async (id: string) => {
    try {
      const res = await fetch(`/api/vendor/products/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast('Product listing deleted successfully.');
        setDeleteConfirmId(null);
        fetchProducts();
      } else {
        showToast(json.error?.message || 'Failed to delete product', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Network error', 'error');
    }
  };

  // Handle Merchant Onboarding Application Submission
  const handleOnboardVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsOnboarding(true);
    try {
      const res = await fetch('/api/vendor/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName: storeNameInput.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast('Application submitted! Your merchant profile is now pending administrator review.');
        await fetchSession();
      } else {
        showToast(json.error?.message || 'Failed to submit application', 'error');
        await fetchSession();
      }
    } catch (err: any) {
      showToast(err.message || 'Error onboarding vendor', 'error');
    } finally {
      setIsOnboarding(false);
    }
  };

  const handleCheckStatus = async () => {
    setIsCheckingStatus(true);
    try {
      await fetchSession();
      showToast('Merchant profile status refreshed.');
    } catch (err) {
      showToast('Failed to refresh status', 'error');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // RENDER: Loading session state
  if (sessionLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <RefreshCw className="h-8 w-8 text-[#FF9900] animate-spin mb-4" />
        <p className="text-sm text-[#565959]">Verifying merchant credentials & atelier security...</p>
      </div>
    );
  }

  // RENDER: Unauthenticated State
  if (!session) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-[#D5D9D9] p-8 max-w-xl mx-auto text-center mt-8">
        <Store className="h-12 w-12 text-[#FF9900] mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-[#0F1111] mb-2">Merchant Sign-In Required</h2>
        <p className="text-sm text-[#565959] mb-6">
          You must be signed in to access the Vyntra Vendor Partner Center and manage your catalog.
        </p>
        <Link
          href="/login?redirect=/vendor/products"
          className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] font-bold text-sm shadow-sm transition-all"
        >
          Sign In as Merchant
        </Link>
      </div>
    );
  }

  // RENDER: Suspended / Revoked License State
  if (session.vendorProfile?.status === 'SUSPENDED') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-rose-300 p-8 max-w-2xl mx-auto mt-8 text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300 font-mono">
            License Revoked &bull; Portal Access Suspended
          </span>
          <h2 className="text-2xl font-bold text-[#0F1111] pt-2">
            Seller Central Privileges Suspended
          </h2>
          <p className="text-xs text-[#565959]">Store: <strong className="text-[#0F1111]">{session.vendorProfile.storeName}</strong> ({session.email})</p>
        </div>

        <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 text-xs text-rose-900 leading-relaxed text-left space-y-1.5">
          <span className="font-bold block text-rose-950">Marketplace Administration Notice:</span>
          <p>
            Your vendor license to sell on Vyntra Marketplace has been permanently revoked by Enterprise Governance. In accordance with platform compliance policies:
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-800 pt-1">
            <li>All active product listings have been unlisted from the customer storefront.</li>
            <li>Catalog publishing and inventory management rights are frozen.</li>
            <li>Payout disbursements are halted pending final reconciliation.</li>
            <li>New merchant applications under this identity are restricted.</li>
          </ul>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#0F1111] text-white text-xs font-bold hover:bg-[#232F3E] transition-all"
          >
            <span>Return to Customer Storefront</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  // RENDER: Application Pending Administrator Review
  const isPending =
    session.vendorProfile?.status === 'PENDING' ||
    session.vendorApplication?.status === 'SUBMITTED' ||
    session.vendorApplication?.status === 'UNDER_REVIEW';

  if (isPending && !session.isVendor) {
    const storeName =
      session.vendorApplication?.storeName ||
      session.vendorProfile?.storeName ||
      'Your Artisan Atelier';
    const appDate = session.vendorApplication?.createdAt
      ? new Date(session.vendorApplication.createdAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Recently submitted';

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-[#D5D9D9] p-8 max-w-2xl mx-auto mt-8">
        <div className="flex items-start justify-between pb-6 border-b border-[#EAEDED] gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-amber-50 rounded-2xl text-amber-600 border border-amber-200/60 shadow-inner">
              <Clock className="h-7 w-7 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  Review in Progress
                </span>
                {session.vendorApplication?.id && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#F7F8F8] border border-[#D5D9D9] text-[#565959] font-bold">
                    Application Ref:{' '}
                    <span className="text-[#0F1111]">
                      {session.vendorApplication.documents?.applicationRef ||
                        `APP-VND-${session.vendorApplication.id.slice(-6).toUpperCase()}`}
                    </span>
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-[#0F1111]">{storeName} — Seller Central</h2>
              <p className="text-xs text-[#565959]">Signed in as: <strong className="text-[#0F1111]">{session.email}</strong></p>
            </div>
          </div>
          <button
            onClick={handleCheckStatus}
            disabled={isCheckingStatus}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D5D9D9] hover:bg-[#F7F8F8] text-xs font-semibold text-[#0F1111] shadow-sm transition-all shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isCheckingStatus ? 'animate-spin' : ''}`} />
            <span>{isCheckingStatus ? 'Checking...' : 'Refresh Status'}</span>
          </button>
        </div>

        <div className="py-6 space-y-4">
          <div className="bg-[#F7F8F8] rounded-xl p-4 border border-[#EAEDED] text-xs text-[#0F1111] space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#565959]">Submission Date:</span>
              <span className="font-semibold">{appDate}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#565959]">Curation Status:</span>
              <span className="font-bold text-amber-700">Awaiting Administrator Review</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#565959]">Catalog Permissions:</span>
              <span className="font-medium text-[#565959]">Unlocks automatically upon approval</span>
            </div>
          </div>

          <div className="text-sm text-[#565959] leading-relaxed space-y-2">
            <p>
              Your seller dossier for <strong>{storeName}</strong> has been received by Vyntra Marketplace Governance. In accordance with platform luxury curation standards, all merchant applications undergo verification prior to product publishing.
            </p>
            <p className="text-xs text-[#767676]">
              Once an administrator reviews and approves your application in Admin Central, your Seller Central product catalog and order fulfillment desk will activate immediately without needing any further action.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/60 text-xs text-blue-900 flex items-start gap-2.5">
            <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block mb-0.5">Administrator Approval Flow</strong>
              <span>
                Testing as platform admin? Sign in with an administrator account and visit{' '}
                <Link href="/admin/vendors" className="underline font-bold text-blue-700 hover:text-blue-900">
                  Admin Central / Vendor Applications
                </Link>{' '}
                to approve or manage this merchant dossier.
              </span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[#EAEDED] flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[#F7F8F8] border border-[#D5D9D9] hover:bg-[#EAEDED] text-xs font-semibold text-[#0F1111] text-center"
          >
            &larr; Return to Storefront
          </Link>
          <button
            onClick={handleCheckStatus}
            disabled={isCheckingStatus}
            className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isCheckingStatus ? 'animate-spin' : ''}`} />
            <span>Check Application Status</span>
          </button>
        </div>
      </div>
    );
  }

  // RENDER: Application Rejected -> Provide Reason & Resubmit Form
  const isRejected =
    session.vendorApplication?.status === 'REJECTED' ||
    session.vendorProfile?.status === 'REJECTED';

  if (isRejected && !session.isVendor) {
    const storeName =
      session.vendorApplication?.storeName ||
      session.vendorProfile?.storeName ||
      'Artisan Atelier';
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-rose-200 p-8 max-w-2xl mx-auto mt-8">
        <div className="flex items-center gap-3.5 pb-6 border-b border-[#EAEDED]">
          <div className="p-3 bg-rose-50 rounded-2xl text-rose-600 border border-rose-200">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                Application Needs Revision
              </span>
            </div>
            <h2 className="text-2xl font-bold text-[#0F1111]">{storeName}</h2>
            <p className="text-xs text-[#565959]">Logged in as: {session.email}</p>
          </div>
        </div>

        <div className="py-6 space-y-4">
          <div className="bg-rose-50/60 rounded-xl p-4 border border-rose-200/60 text-xs text-rose-900 space-y-1">
            <span className="font-bold block text-rose-950">Administrator Feedback / Rejection Reason:</span>
            <p className="text-xs leading-relaxed">
              {session.vendorApplication?.rejectionReason ||
                'Your application did not satisfy marketplace seller guidelines.'}
            </p>
          </div>

          <p className="text-sm text-[#565959] leading-relaxed">
            Please update your business details, compliance tax documents, and bank settlement account in the Seller Onboarding portal.
          </p>

          <div className="pt-2">
            <Link
              href="/become-seller"
              className="w-full py-3.5 rounded-full bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <span>Update Compliance Details &amp; Resubmit</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // RENDER: Not Yet a Vendor (Customer Account) -> Direct to Seller Onboarding Page
  if (!session.isVendor || !session.vendorProfile) {
    if (typeof window !== 'undefined') {
      router.replace('/become-seller');
    }
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <RefreshCw className="h-8 w-8 text-[#FF9900] animate-spin mb-4" />
        <p className="text-sm font-semibold text-[#0F1111]">Redirecting to Seller Onboarding...</p>
        <p className="text-xs text-[#565959] mt-1">Please complete your merchant setup to access Seller Central.</p>
      </div>
    );
  }

  // Calculate Statistics
  const totalListings = products.length;
  const publishedCount = products.filter((p) => p.isPublished).length;
  const draftCount = products.filter((p) => !p.isPublished).length;
  const totalStockUnits = products.reduce((sum, p) => sum + p.totalStock, 0);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-sm font-semibold transition-all animate-in slide-in-from-bottom-5 ${
            toastMessage.type === 'success'
              ? 'bg-[#067D62] text-white'
              : 'bg-[#B12704] text-white'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      <VendorPageHeader
        title="Products"
        description="Your listings, their stock and whether customers can see them."
        actions={
          <>
            <Link href="/vendor/products/new?mode=sell-existing" className={vendorButton.secondary}>
              <Search className="h-4 w-4 text-[#007185]" />
              Sell an existing product
            </Link>
            <Link href="/vendor/products/new?mode=request-new" className={vendorButton.primary}>
              <Plus className="h-4 w-4" />
              Add a new product
            </Link>
          </>
        }
      />

      <VendorStats
        items={[
          { label: 'Listings', value: totalListings },
          { label: 'Live', value: publishedCount, tone: 'good' },
          { label: 'Drafts', value: draftCount, tone: draftCount > 0 ? 'warn' : 'neutral' },
          { label: 'Units in stock', value: totalStockUnits },
        ]}
      />

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-[#D5D9D9] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-[#F0F2F2] p-1 rounded-lg w-full sm:w-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex-1 sm:flex-none ${
              statusFilter === 'all'
                ? 'bg-white text-[#0F1111] shadow-sm'
                : 'text-[#565959] hover:text-[#0F1111]'
            }`}
          >
            All ({totalListings})
          </button>
          <button
            onClick={() => setStatusFilter('published')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex-1 sm:flex-none ${
              statusFilter === 'published'
                ? 'bg-white text-[#067D62] shadow-sm'
                : 'text-[#565959] hover:text-[#067D62]'
            }`}
          >
            Published ({publishedCount})
          </button>
          <button
            onClick={() => setStatusFilter('draft')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex-1 sm:flex-none ${
              statusFilter === 'draft'
                ? 'bg-white text-amber-700 shadow-sm'
                : 'text-[#565959] hover:text-amber-700]'
            }`}
          >
            Drafts ({draftCount})
          </button>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72 flex items-center">
          <Search className="h-4 w-4 text-[#565959] absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or SKU..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-[#D5D9D9] focus:outline-none focus:ring-1 focus:ring-[#FF9900] focus:border-[#FF9900]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                fetchProducts();
              }}
              className="absolute right-2.5 text-[#565959] hover:text-[#0F1111]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </form>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-[#D5D9D9] shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center">
            <RefreshCw className="h-6 w-6 text-[#FF9900] animate-spin mx-auto mb-2" />
            <p className="text-xs text-[#565959]">Loading vendor catalog from Prisma database...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <Package className="h-12 w-12 text-[#888C8C] mx-auto mb-3 stroke-[1.5]" />
            <h3 className="text-base font-bold text-[#0F1111]">No products found</h3>
            <p className="text-xs text-[#565959] max-w-sm mx-auto mt-1 mb-4">
              {searchQuery || statusFilter !== 'all'
                ? 'No listings matched your active search or status filter. Try clearing filters.'
                : 'You have not added any products to your boutique yet. Add your first listing now.'}
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link
                href="/vendor/products/new?mode=sell-existing"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-[#F7F8F8] text-[#0F1111] font-bold text-xs border border-[#D5D9D9] shadow-sm transition-all"
              >
                <Search className="h-3.5 w-3.5 text-[#007185]" />
                <span>Sell Existing Product</span>
              </Link>
              <Link
                href="/vendor/products/new?mode=request-new"
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] font-bold text-xs shadow-sm transition-all border border-[#FCD200]"
              >
                <Plus className="h-3.5 w-3.5 stroke-[3]" />
                <span>Request New Listing</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F7F8F8] text-[#565959] font-semibold border-b border-[#D5D9D9]">
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Stock</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E7E7]">
                {products.map((prod) => (
                  <tr key={prod.id} className="hover:bg-[#F7FAFA] transition-colors">
                    {/* Details Column */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-14 rounded-md overflow-hidden bg-[#EAEDED] shrink-0 border border-[#D5D9D9] relative">
                          <img
                            src={prod.image}
                            alt={prod.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80';
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/products/${prod.slug}`}
                            target="_blank"
                            className="font-bold text-sm text-[#0F1111] hover:text-[#007185] line-clamp-1 transition-colors"
                          >
                            {prod.title}
                          </Link>
                          <div className="flex items-center gap-2 text-[11px] text-[#565959] mt-0.5 flex-wrap">
                            <span>{prod.brand}</span>
                            <span
                              className="rounded border border-[#D5D9D9] px-1.5 text-[10px] font-semibold text-[#565959]"
                              title={prod.isOriginalCreator ? 'You created this product page' : 'You sell on a product page another seller created'}
                            >
                              {prod.isOriginalCreator ? 'Your listing' : 'Your offer'}
                            </span>
                            {prod.isBuyBoxWinner && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-rose-50 text-[#800020] border border-rose-200 flex items-center gap-0.5">
                                <Sparkles className="h-2.5 w-2.5 text-[#FF9900]" />
                                Buy Box Winner
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category Column */}
                    <td className="py-3 px-4 text-[12px] text-[#565959] max-w-[160px]">{prod.category?.name || '—'}</td>

                    {/* Price Column */}
                    <td className="py-3 px-4">
                      <span className="font-bold text-[#0F1111] text-sm font-sans">
                        ₹{prod.price.toLocaleString('en-IN')}
                      </span>
                      {prod.originalPrice > prod.price && (
                        <span className="block text-[11px] text-[#565959] line-through font-sans">
                          ₹{prod.originalPrice.toLocaleString('en-IN')}
                        </span>
                      )}
                    </td>

                    {/* Stock Column */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded text-[11px] font-bold ${
                          prod.totalStock > 10
                            ? 'bg-emerald-50 text-[#067D62]'
                            : prod.totalStock > 0
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-red-50 text-[#B12704]'
                        }`}
                      >
                        {prod.totalStock > 0 ? `${prod.totalStock} in stock` : 'Out of stock'}
                      </span>
                    </td>

                    {/* Status Column */}
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(prod)}
                        title="Click to toggle publish status"
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-all ${
                          prod.isPublished
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            prod.isPublished ? 'bg-emerald-600' : 'bg-slate-400'
                          }`}
                        />
                        <span>{prod.isPublished ? 'Live' : 'Draft'}</span>
                      </button>
                    </td>

                    {/* Actions Column */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/products/${prod.slug}`}
                          target="_blank"
                          title="View on Storefront"
                          className="p-1.5 rounded text-[#565959] hover:text-[#007185] hover:bg-[#F0F2F2] transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/vendor/products/${prod.id}/edit`}
                          title="Edit Product"
                          className="p-1.5 rounded text-[#565959] hover:text-[#0F1111] hover:bg-[#F0F2F2] transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(prod.id)}
                          title="Delete Product"
                          className="p-1.5 rounded text-[#565959] hover:text-[#B12704] hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl border border-[#D5D9D9]">
            <h3 className="text-base font-bold text-[#0F1111] mb-2">Delete Product Listing?</h3>
            <p className="text-xs text-[#565959] mb-5 leading-relaxed">
              This action will remove the product, associated variants, and warehouse inventory records from Vyntra. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-md border border-[#D5D9D9] text-xs font-semibold text-[#0F1111] hover:bg-[#F7FAFA]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteProduct(deleteConfirmId)}
                className="px-4 py-2 rounded-md bg-[#B12704] hover:bg-[#911f03] text-white text-xs font-bold shadow-sm"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legacy modal replaced by dedicated full-page architecture at /vendor/products/new */}
      {false && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-[#D5D9D9] my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#D5D9D9] mb-6">
              <div>
                <h2 className="text-xl font-bold text-[#0F1111]">
                  {editingProduct ? 'Edit Product Listing' : 'Add New Product to Atelier'}
                </h2>
                <p className="text-xs text-[#565959] mt-0.5">
                  Real-time database catalog item with inventory sync.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-[#565959] hover:text-[#0F1111] rounded-lg hover:bg-[#F0F2F2]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-4 text-xs">
              {/* Product Title */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-[#0F1111] mb-1">
                  Product Name / Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Royal Handcrafted Linen Kurta"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#D5D9D9] focus:outline-none focus:ring-1 focus:ring-[#FF9900] focus:border-[#FF9900]"
                  required
                />
              </div>

              {/* Subtitle & Brand */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-[#0F1111] mb-1">
                    Brand Name *
                  </label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="e.g. Vyntra Royal Atelier"
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#D5D9D9] focus:outline-none focus:ring-1 focus:ring-[#FF9900] focus:border-[#FF9900]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase tracking-wider text-[#0F1111] mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#D5D9D9] focus:outline-none focus:ring-1 focus:ring-[#FF9900] focus:border-[#FF9900] bg-white"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pricing & Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-[#0F1111] mb-1">
                    Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="2499"
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#D5D9D9] focus:outline-none focus:ring-1 focus:ring-[#FF9900] focus:border-[#FF9900]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase tracking-wider text-[#0F1111] mb-1">
                    Original Price / MRP (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.originalPrice}
                    onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                    placeholder="4999"
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#D5D9D9] focus:outline-none focus:ring-1 focus:ring-[#FF9900] focus:border-[#FF9900]"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase tracking-wider text-[#0F1111] mb-1">
                    Stock Units *
                  </label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    placeholder="20"
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#D5D9D9] focus:outline-none focus:ring-1 focus:ring-[#FF9900] focus:border-[#FF9900]"
                  />
                </div>
              </div>

              {/* SKU & Image URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-[#0F1111] mb-1">
                    SKU Code *
                  </label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="e.g. VRA-LNK-01"
                    disabled={!!editingProduct}
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#D5D9D9] focus:outline-none focus:ring-1 focus:ring-[#FF9900] focus:border-[#FF9900] disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase tracking-wider text-[#0F1111] mb-1">
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#D5D9D9] focus:outline-none focus:ring-1 focus:ring-[#FF9900] focus:border-[#FF9900]"
                  />
                </div>
              </div>

              {/* Image Preview */}
              {formData.imageUrl && (
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[#F7FAFA] border border-[#D5D9D9]">
                  <div className="w-12 h-14 rounded overflow-hidden bg-gray-200 shrink-0">
                    <img
                      src={formData.imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80';
                      }}
                    />
                  </div>
                  <div className="text-[11px] text-[#565959]">
                    <span className="font-bold text-[#0F1111] block">Image Preview</span>
                    <span>Verified web image URL for storefront display.</span>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-[#0F1111] mb-1">
                  Product Description &amp; Craft Details
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe material, weave, craftsmanship, fit and care instructions..."
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#D5D9D9] focus:outline-none focus:ring-1 focus:ring-[#FF9900] focus:border-[#FF9900]"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-6 border-t border-[#D5D9D9] mt-6">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-full border border-[#D5D9D9] text-[#0F1111] font-semibold text-xs hover:bg-[#F7FAFA] transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmitProduct(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-[#EAEDED] hover:bg-[#D5D9D9] text-[#0F1111] font-bold text-xs transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <span>Save as Draft</span>
                )}
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmitProduct(true)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Publishing to Catalog...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{editingProduct ? 'Update & Publish' : 'Publish Product'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VendorProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <RefreshCw className="h-8 w-8 text-[#FF9900] animate-spin mb-4" />
          <p className="text-sm text-[#565959]">Loading atelier catalog...</p>
        </div>
      }
    >
      <VendorProductsContent />
    </Suspense>
  );
}
