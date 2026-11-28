'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import {
  Store,
  ShieldCheck,
  Package,
  CreditCard,
  Building2,
  Phone,
  Mail,
  User,
  ExternalLink,
  ChevronLeft,
  Copy,
  Check,
  Warehouse,
  FileText,
  Tag,
  CheckCircle2,
  Clock,
  Layers,
  ShoppingBag,
  RefreshCw,
  Eye,
  ShieldAlert,
  Send,
  X,
  Loader2,
} from 'lucide-react';
import { formatINR } from '@/lib/utils';

interface VariantItem {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  price: string | number;
  originalPrice: string | number | null;
  imageUrl: string | null;
}

interface ProductInventoryItem {
  id: string;
  sku: string;
  quantity: number;
  warehouseLocation: string | null;
  variantId?: string | null;
}

interface ProductItem {
  id: string;
  title: string;
  subtitle: string | null;
  slug: string;
  brand: string;
  basePrice: string | number;
  discountPrice: string | number | null;
  isPublished: boolean;
  createdAt: string;
  category: { id: string; name: string; slug: string } | null;
  images: { id: string; url: string; isPrimary: boolean }[];
  variants: VariantItem[];
  inventories: ProductInventoryItem[];
}

interface WarehouseItem {
  id: string;
  warehouseCode: string;
  facilityName: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  contactPhone: string;
  isDefault: boolean;
}

interface VendorProfileData {
  id: string;
  storeName: string;
  storeSlug: string;
  storeDescription: string | null;
  status: string;
  isVerified: boolean;
  gstNumber: string | null;
  panNumber: string | null;
  payoutBeneficiaryId: string | null;
  bankName: string | null;
  bankAccountLast4: string | null;
  ifscCode: string | null;
  payoutsEnabled: boolean;
  commissionRate: string | number;
  rating: number;
  totalSales: number;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
  };
  warehouses: WarehouseItem[];
  products: ProductItem[];
  sellerOffers?: any[];
  _count?: {
    products: number;
    sellerOffers: number;
    shipments: number;
    orderItems: number;
  };
}

export default function AdminVendorDetailPage() {
  const params = useParams();
  const vendorId = params?.id as string;

  const [vendor, setVendor] = useState<VendorProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'products' | 'compliance' | 'warehouses' | 'notices'>('products');
  const [copiedId, setCopiedId] = useState(false);

  // Notices List State
  const [notices, setNotices] = useState<any[]>([]);

  // Issue Notice State
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [targetProduct, setTargetProduct] = useState<{ id: string; title: string; slug: string } | null>(null);
  const [noticeReason, setNoticeReason] = useState('SLA_DISPATCH_BREACH');
  const [noticeSeverity, setNoticeSeverity] = useState<'WARNING' | 'CRITICAL'>('WARNING');
  const [noticeDeadline, setNoticeDeadline] = useState(24);
  const [noticeMessage, setNoticeMessage] = useState('');
  const [isSubmittingNotice, setIsSubmittingNotice] = useState(false);
  const [noticeSuccess, setNoticeSuccess] = useState<string | null>(null);

  const handleOpenNotice = (product?: { id: string; title: string; slug: string }) => {
    setShowNoticeModal(true);
    setTargetProduct(product || null);
    setNoticeSeverity('WARNING');
    setNoticeDeadline(24);
    setNoticeSuccess(null);

    if (product) {
      setNoticeReason('PRICE_AUDIT_BREACH');
      setNoticeMessage(
        `Listing Notice for "${product.title}": Please review pricing/MRP, fabric specifications, and product description. Any misleading discounts or inaccurate claims must be corrected within 24 hours.`
      );
    } else {
      setNoticeReason('SLA_DISPATCH_BREACH');
      setNoticeMessage(
        `Official SLA & Compliance Warning for ${vendor?.storeName || 'Merchant'}: Please review your fulfillment SLAs and pending dispatches. Failure to meet required handling times may lead to catalog de-ranking or account restriction.`
      );
    }
  };

  const handleSendNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor) return;

    setIsSubmittingNotice(true);
    setNoticeSuccess(null);

    try {
      const res = await fetch('/api/admin/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: vendor.id,
          storeName: vendor.storeName,
          productId: targetProduct?.id || undefined,
          productTitle: targetProduct?.title || undefined,
          productSlug: targetProduct?.slug || undefined,
          reason: noticeReason,
          severity: noticeSeverity,
          deadlineHours: noticeDeadline,
          message: noticeMessage,
          title: targetProduct
            ? `Product Listing Notice - "${targetProduct.title.slice(0, 40)}..."`
            : noticeReason === 'SLA_DISPATCH_BREACH'
            ? `SLA Performance Notice - ${vendor.storeName}`
            : `Compliance Alert - ${vendor.storeName}`,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        await fetchVendorNotices();
        setNoticeSuccess(
          targetProduct
            ? `Notice for "${targetProduct.title.slice(0, 25)}..." dispatched to ${vendor.storeName}.`
            : `Notice sent to ${vendor.storeName} successfully.`
        );
        setTimeout(() => {
          setShowNoticeModal(false);
          setNoticeSuccess(null);
          setTargetProduct(null);
        }, 1800);
      } else {
        alert(json.error?.message || 'Failed to issue notice');
      }
    } catch (err: any) {
      alert(err.message || 'Network error issuing notice');
    } finally {
      setIsSubmittingNotice(false);
    }
  };

  const fetchVendorNotices = async () => {
    try {
      const res = await fetch(`/api/admin/notices?vendorId=${vendorId}`, { cache: 'no-store' });
      const json = await res.json();
      if (res.ok && json.success) {
        setNotices(json.data.notices || []);
      }
    } catch {
      // ignore
    }
  };

  const fetchVendorDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/vendors/${vendorId}`, {
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || json.message || 'Failed to load vendor details.');
      }
      setVendor(json.data.vendor);
      await fetchVendorNotices();
    } catch (err: any) {
      console.error('[Admin Vendor Detail Error]:', err);
      setError(err.message || 'Failed to load vendor profile.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (vendorId) {
      fetchVendorDetails();
      fetchVendorNotices();
    }
  }, [vendorId]);

  const copyMerchantId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="flex items-center gap-2 text-sm text-[#565959]">
          <Link href="/admin" className="hover:text-[#007185] flex items-center gap-1 font-semibold">
            <ChevronLeft className="h-4 w-4" /> Back to Admin Central
          </Link>
        </div>
        <div className="bg-white rounded-2xl border border-[#D5D9D9] p-12 text-center space-y-3 shadow-xs">
          <RefreshCw className="h-8 w-8 text-[#007185] animate-spin mx-auto" />
          <h2 className="text-base font-bold text-[#0F1111]">Loading Vendor Details &amp; Catalog...</h2>
          <p className="text-xs text-[#565959]">Fetching live database profile, warehouses, and listed products.</p>
        </div>
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="flex items-center gap-2 text-sm text-[#565959]">
          <Link href="/admin" className="hover:text-[#007185] flex items-center gap-1 font-semibold">
            <ChevronLeft className="h-4 w-4" /> Back to Admin Central
          </Link>
        </div>
        <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center space-y-3 shadow-xs">
          <p className="text-base font-bold text-rose-700">Vendor Not Found or Error Loading Profile</p>
          <p className="text-xs text-[#565959]">{error || 'Unable to retrieve vendor details.'}</p>
          <button
            type="button"
            onClick={fetchVendorDetails}
            className="px-4 py-2 bg-[#007185] text-white text-xs font-bold rounded-lg hover:bg-[#004B57] transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const merchantId = vendor.payoutBeneficiaryId || `VYN-SELLER-${vendor.id.slice(-5).toUpperCase()}`;
  const masterStock = (vendor.products || []).reduce((acc, p) => {
    return acc + (p.inventories || []).reduce((invAcc, inv) => invAcc + (inv.quantity || 0), 0);
  }, 0);

  const offerStock = (vendor.sellerOffers || []).reduce((acc, offer: any) => {
    return (
      acc +
      (offer.offerVariants || []).reduce((ovAcc: number, ov: any) => {
        return (
          ovAcc +
          (ov.inventories || []).reduce(
            (invAcc: number, inv: any) => invAcc + (inv.quantity || 0),
            0
          )
        );
      }, 0)
    );
  }, 0);

  const totalStockAcrossCatalog = masterStock + offerStock;
  const totalListedCount = (vendor.products?.length || 0) + (vendor.sellerOffers?.length || 0);

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6 select-none">
      {/* 1. Breadcrumbs & Quick Back */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D5D9D9]">
        <div className="flex items-center gap-2 text-xs text-[#565959]">
          <Link href="/admin" className="hover:text-[#007185] hover:underline font-semibold flex items-center gap-1">
            <ChevronLeft className="h-3.5 w-3.5" /> Admin Central
          </Link>
          <span>/</span>
          <Link href="/admin/vendors?tab=verified" className="hover:text-[#007185] hover:underline font-semibold">
            Vendors Directory
          </Link>
          <span>/</span>
          <span className="font-bold text-[#0F1111]">{vendor.storeName}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenNotice()}
            className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
            title="Send SLA breach warning or compliance notice to vendor"
          >
            <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
            <span>Issue Notice</span>
          </button>
          <button
            type="button"
            onClick={fetchVendorDetails}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#F7F8F8] border border-[#D5D9D9] text-[#565959] text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
            title="Refresh Vendor Details"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Vendor Header Dossier Banner */}
      <div className="bg-white rounded-2xl border border-[#D5D9D9] p-6 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-stone-800 to-black text-white flex items-center justify-center font-headline font-bold text-2xl shadow-md border-2 border-amber-400/40 shrink-0">
              {vendor.storeName.slice(0, 2).toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="flex items-center flex-wrap gap-2">
                <h1 className="text-2xl sm:text-3xl font-headline font-extrabold text-[#0F1111]">
                  {vendor.storeName}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  {vendor.status}
                </span>
                {vendor.isVerified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold text-[#007185] bg-[#E7F4F5] border border-[#007185]/30">
                    <ShieldCheck className="h-3.5 w-3.5" /> Verified seller
                  </span>
                )}
              </div>

              <div className="flex items-center flex-wrap gap-3 text-xs text-[#565959]">
                <span className="font-mono bg-[#F7F8F8] px-2 py-0.5 rounded border border-[#E7E7E7]">
                  /{vendor.storeSlug}
                </span>

                {/* Merchant ID pill with copy */}
                <div className="flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded font-mono font-bold text-xs">
                  <span>Merchant ID: {merchantId}</span>
                  <button
                    type="button"
                    onClick={() => copyMerchantId(merchantId)}
                    className="p-0.5 hover:text-black cursor-pointer transition-colors"
                    title="Copy Merchant ID"
                  >
                    {copiedId ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>

                <span>
                  Member since{' '}
                  <strong className="text-[#0F1111]">
                    {new Date(vendor.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-stretch md:self-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-[#E7E7E7]">
            <div className="text-right">
              <span className="text-[11px] font-bold text-[#565959] uppercase block">Platform Commission</span>
              <span className="text-2xl font-bold font-mono text-[#0F1111]">{vendor.commissionRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. KPI Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Listed Products */}
        <div className="bg-white rounded-2xl p-5 border border-[#D5D9D9] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#565959] block">Listed Products</span>
            <span className="text-3xl font-extrabold font-headline text-[#0F1111] block mt-1">
              {totalListedCount}
            </span>
            <span className="text-[11px] text-[#565959]">
              {vendor.products.length > 0 && vendor.sellerOffers && vendor.sellerOffers.length > 0
                ? `${vendor.products.length} master • ${vendor.sellerOffers.length} co-listed`
                : 'Live in Marketplace Catalog'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-[#007185] flex items-center justify-center shrink-0">
            <Package className="h-6 w-6" />
          </div>
        </div>

        {/* Card 2: Total Units in Stock */}
        <div className="bg-white rounded-2xl p-5 border border-[#D5D9D9] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#565959] block">Total Stock Units</span>
            <span className="text-3xl font-extrabold font-headline text-[#0F1111] block mt-1">
              {totalStockAcrossCatalog}
            </span>
            <span className="text-[11px] text-[#565959]">Physical Units Available</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Layers className="h-6 w-6" />
          </div>
        </div>

        {/* Card 3: Registered Warehouses */}
        <div className="bg-white rounded-2xl p-5 border border-[#D5D9D9] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#565959] block">Dispatch Warehouses</span>
            <span className="text-3xl font-extrabold font-headline text-[#0F1111] block mt-1">
              {vendor.warehouses.length}
            </span>
            <span className="text-[11px] text-[#565959]">
              {vendor.warehouses[0]?.city ? `Primary: ${vendor.warehouses[0].city}` : 'No Facility'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
            <Warehouse className="h-6 w-6" />
          </div>
        </div>

        {/* Card 4: Payout Status */}
        <div className="bg-white rounded-2xl p-5 border border-[#D5D9D9] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#565959] block">Payout Settlement</span>
            <span className={`text-base font-extrabold block mt-1.5 ${vendor.payoutsEnabled ? 'text-emerald-700' : 'text-amber-800'}`}>
              {vendor.payoutsEnabled ? 'Active (Automated)' : 'Pending Bank Setup'}
            </span>
            <span className="text-[11px] text-[#565959]">
              {vendor.bankName || 'COD / Manual'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <CreditCard className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* 4. Tab Navigation (Products | Compliance & Banking | Warehouses) */}
      <div className="border-b border-[#D5D9D9] flex items-center gap-8">
        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'products'
              ? 'border-[#007185] text-[#007185]'
              : 'border-transparent text-[#565959] hover:text-[#0F1111]'
          }`}
        >
          <Package className="h-4 w-4" />
          <span>Listed Products ({totalListedCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('compliance')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'compliance'
              ? 'border-[#007185] text-[#007185]'
              : 'border-transparent text-[#565959] hover:text-[#0F1111]'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Compliance &amp; Banking</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('warehouses')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'warehouses'
              ? 'border-[#007185] text-[#007185]'
              : 'border-transparent text-[#565959] hover:text-[#0F1111]'
          }`}
        >
          <Warehouse className="h-4 w-4" />
          <span>Registered Warehouses ({vendor.warehouses.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('notices')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'notices'
              ? 'border-[#007185] text-[#007185]'
              : 'border-transparent text-[#565959] hover:text-[#0F1111]'
          }`}
        >
          <ShieldAlert className="h-4 w-4" />
          <span>Notices &amp; SLA Warnings ({notices.length})</span>
          {notices.filter((n) => n.status === 'OPEN').length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-600 text-white font-mono font-bold leading-none">
              {notices.filter((n) => n.status === 'OPEN').length} Pending
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: LISTED PRODUCTS CATALOG                                            */}
      {/* ========================================================================= */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold font-headline text-[#0F1111] flex items-center gap-2">
              <span>Catalog Pieces Listed by {vendor.storeName}</span>
              <span className="text-xs bg-[#F7F8F8] text-[#565959] border border-[#D5D9D9] px-2.5 py-0.5 rounded-full font-sans font-semibold">
                {totalListedCount} Items Live
              </span>
            </h2>
          </div>

          {totalListedCount === 0 ? (
            <div className="bg-white rounded-2xl border border-[#D5D9D9] p-12 text-center space-y-3">
              <Package className="h-10 w-10 text-stone-300 mx-auto" />
              <p className="text-base font-bold text-[#0F1111]">No Products Listed Yet</p>
              <p className="text-xs text-[#565959]">This vendor has not published or co-listed any products to the Vyntra storefront.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* SECTION A: MASTER CREATED PRODUCTS */}
              {vendor.products.length > 0 && (
                <div className="space-y-4">
                  {vendor.sellerOffers && vendor.sellerOffers.length > 0 && (
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#565959]">
                      <Package className="h-4 w-4 text-[#007185]" />
                      <span>Original Master Creations ({vendor.products.length})</span>
                    </div>
                  )}

                  <div className="space-y-4">
                    {vendor.products.map((product) => {
                      const totalUnits = product.inventories.reduce((sum, inv) => sum + (inv.quantity || 0), 0);
                      const primaryImage = product.images.find((img) => img.isPrimary)?.url || product.images[0]?.url || '/placeholder.png';

                      return (
                        <div
                          key={product.id}
                          className="bg-white rounded-2xl border border-[#D5D9D9] p-5 shadow-xs hover:border-[#007185] transition-all flex flex-col lg:flex-row gap-6 items-start justify-between"
                        >
                          {/* Left: Product Image & Core Details */}
                          <div className="flex items-start gap-4 flex-1 min-w-0">
                            <div className="relative aspect-[3/4] w-24 sm:w-28 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shrink-0">
                              <Image
                                src={primaryImage}
                                alt={product.title}
                                fill
                                unoptimized
                                className="object-cover object-top"
                              />
                            </div>

                            <div className="space-y-2 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-800 text-[11px] font-bold uppercase tracking-wider">
                                  {product.brand}
                                </span>
                                {product.category && (
                                  <span className="text-xs text-[#565959] font-medium">
                                    • {product.category.name}
                                  </span>
                                )}
                                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                  product.isPublished ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-amber-50 text-amber-800'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${product.isPublished ? 'bg-emerald-600' : 'bg-amber-600'}`} />
                                  {product.isPublished ? 'Published & Live' : 'Draft'}
                                </span>
                              </div>

                              <h3 className="text-base font-bold text-[#0F1111] leading-snug line-clamp-2">
                                {product.title}
                              </h3>

                              {product.subtitle && (
                                <p className="text-xs text-[#565959] line-clamp-1">{product.subtitle}</p>
                              )}

                              {/* Price Badge */}
                              <div className="flex items-baseline gap-2 pt-1">
                                <span className="text-lg font-bold text-[#B12704]">
                                  ₹{Number(product.basePrice).toLocaleString('en-IN')}
                                </span>
                                {product.discountPrice && Number(product.discountPrice) > Number(product.basePrice) && (
                                  <span className="text-xs text-[#565959] line-through">
                                    M.R.P: ₹{Number(product.discountPrice).toLocaleString('en-IN')}
                                  </span>
                                )}
                              </div>

                              {/* Variants Breakdown Grouped by Color */}
                              {product.variants.length > 0 && (() => {
                                // Group variants by colorway
                                const colorGroups: Record<string, typeof product.variants> = {};
                                product.variants.forEach((v) => {
                                  const c = (v.color || 'Classic').trim();
                                  if (!colorGroups[c]) colorGroups[c] = [];
                                  colorGroups[c].push(v);
                                });

                                const colorKeys = Object.keys(colorGroups);

                                return (
                                  <div className="pt-2 border-t border-[#F0F0F0] space-y-3">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#565959] block">
                                      Colorways &amp; Sizes Matrix ({product.variants.length} Variants across {colorKeys.length} {colorKeys.length === 1 ? 'Color' : 'Colors'})
                                    </span>

                                    <div className="space-y-3">
                                      {colorKeys.map((colorName) => {
                                        const colorVariants = colorGroups[colorName];
                                        const swatchUrl = colorVariants.find((cv) => cv.imageUrl)?.imageUrl || product.images[0]?.url;

                                        return (
                                          <div
                                            key={colorName}
                                            className="rounded-xl border border-stone-200 bg-[#FAFAFA] p-3 space-y-2.5"
                                          >
                                            {/* Colorway Header */}
                                            <div className="flex items-center justify-between gap-2 border-b border-stone-200 pb-2">
                                              <div className="flex items-center gap-2.5">
                                                {swatchUrl ? (
                                                  <div className="relative w-7 h-7 rounded-lg overflow-hidden border border-stone-300 shadow-2xs shrink-0">
                                                    <Image
                                                      src={swatchUrl}
                                                      alt={colorName}
                                                      fill
                                                      unoptimized
                                                      className="object-cover object-top"
                                                    />
                                                  </div>
                                                ) : (
                                                  <span className="w-5 h-5 rounded-full border border-stone-300 bg-stone-400 shrink-0" />
                                                )}
                                                <div>
                                                  <span className="text-xs font-bold text-[#0F1111]">
                                                    Colorway: <span className="text-[#007185] font-extrabold">{colorName}</span>
                                                  </span>
                                                </div>
                                              </div>
                                              <span className="text-[10px] bg-stone-200 text-stone-700 px-2 py-0.5 rounded-full font-bold">
                                                {colorVariants.length} {colorVariants.length === 1 ? 'Size' : 'Sizes'} Available
                                              </span>
                                            </div>

                                            {/* Sizes Grid */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
                                              {colorVariants.map((v) => {
                                                const inv = product.inventories.find(
                                                  (i) =>
                                                    (i.variantId && i.variantId === v.id) ||
                                                    (i.sku && v.sku && i.sku.trim().toLowerCase() === v.sku.trim().toLowerCase())
                                                );
                                                const defaultWh = vendor.warehouses.find((w) => w.isDefault) || vendor.warehouses[0];
                                                const fallbackWh = defaultWh ? `${defaultWh.facilityName} (${defaultWh.city})` : 'Vendor Dispatch Facility';
                                                const warehouse = inv?.warehouseLocation || fallbackWh;

                                                return (
                                                  <div
                                                    key={v.id}
                                                    className="p-2.5 rounded-lg bg-white border border-[#E7E7E7] text-xs flex flex-col justify-between shadow-2xs hover:border-[#007185] transition-all"
                                                  >
                                                    <div className="flex items-center justify-between font-bold text-[#0F1111]">
                                                      <span className="bg-stone-100 text-stone-900 px-2 py-0.5 rounded text-[11px] font-extrabold tracking-wide">
                                                        Size {v.size || 'Standard'}
                                                      </span>
                                                      <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-[11px]">
                                                        Qty: {inv?.quantity ?? 0}
                                                      </span>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-stone-100 font-mono text-[11px]">
                                                      <span className="text-[#007185] font-bold">{v.sku}</span>
                                                    </div>
                                                    <div className="text-[10px] text-[#565959] truncate mt-1 flex items-center gap-1 font-sans">
                                                      <span className="shrink-0">📍</span>
                                                      <span className="truncate font-medium" title={warehouse}>
                                                        {warehouse}
                                                      </span>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>

                          {/* Right: Quick Actions */}
                          <div className="flex flex-row lg:flex-col gap-2 w-full lg:w-auto shrink-0 justify-end">
                            <Link
                              href={`/products/${product.slug}`}
                              target="_blank"
                              className="px-3.5 py-2 rounded-lg bg-[#007185] hover:bg-[#004B57] text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 text-center flex-1 lg:flex-initial"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>View on Storefront</span>
                            </Link>

                            <Link
                              href={`/admin/products?vendorId=${encodeURIComponent(vendor.id)}`}
                              className="px-3.5 py-2 rounded-lg bg-white hover:bg-[#F7F8F8] border border-[#D5D9D9] text-[#0F1111] text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 text-center flex-1 lg:flex-initial"
                              title="Moderate, publish or delist this vendor's catalog"
                            >
                              <ShieldAlert className="h-3.5 w-3.5 text-[#007185]" />
                              <span>Moderate Catalog</span>
                            </Link>

                            <button
                              type="button"
                              onClick={() => handleOpenNotice({ id: product.id, title: product.title, slug: product.slug })}
                              className="px-3.5 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 text-center flex-1 lg:flex-initial"
                              title="Issue pricing, quality or policy notice on this specific product"
                            >
                              <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
                              <span>Issue Product Notice</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION B: MULTI-SELLER CO-LISTED OFFERS (SELL EXISTING PRODUCT) */}
              {vendor.sellerOffers && vendor.sellerOffers.length > 0 && (
                <div className="space-y-4 pt-6 border-t border-[#D5D9D9]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#565959] flex items-center gap-2">
                      <Layers className="h-4 w-4 text-[#007185]" />
                      <span>Multi-Seller Co-Listed Offers ({vendor.sellerOffers.length})</span>
                      <span className="text-[10px] bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-full font-bold">
                        Sell Existing Product
                      </span>
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {vendor.sellerOffers.map((offer: any) => {
                      const prod = offer.product;
                      const primaryImage =
                        prod?.images?.find((img: any) => img.isPrimary)?.url ||
                        prod?.images?.[0]?.url ||
                        '/placeholder.png';

                      const totalOfferUnits = (offer.offerVariants || []).reduce(
                        (sum: number, ov: any) =>
                          sum +
                          (ov.inventories || []).reduce(
                            (isum: number, inv: any) => isum + (inv.quantity || 0),
                            0
                          ),
                        0
                      );

                      const minOfferPrice =
                        offer.offerVariants && offer.offerVariants.length > 0
                          ? Math.min(...offer.offerVariants.map((ov: any) => Number(ov.sellingPrice)))
                          : Number(prod?.basePrice || 0);

                      return (
                        <div
                          key={offer.id}
                          className="bg-white rounded-2xl border border-teal-200 p-5 shadow-xs hover:border-[#007185] transition-all flex flex-col lg:flex-row gap-6 items-start justify-between"
                        >
                          {/* Left: Product Image & Details */}
                          <div className="flex items-start gap-4 flex-1 min-w-0">
                            <div className="relative aspect-[3/4] w-24 sm:w-28 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shrink-0">
                              <Image
                                src={primaryImage}
                                alt={prod?.title || 'Product'}
                                fill
                                unoptimized
                                className="object-cover object-top"
                              />
                            </div>

                            <div className="space-y-2 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-900 text-[10px] font-bold uppercase tracking-wider">
                                  Multi-Seller Listing
                                </span>
                                {offer.isBuyBoxWinner && (
                                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                                    ★ Featured Buy Box Winner
                                  </span>
                                )}
                                <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 text-[10px] font-medium">
                                  Creator: <strong className="text-[#0F1111]">{prod?.vendor?.storeName || 'Seller'}</strong>
                                </span>
                                {prod?.category && (
                                  <span className="text-xs text-[#565959] font-medium">
                                    • {prod.category.name}
                                  </span>
                                )}
                                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                  offer.status === 'ACTIVE'
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                    : 'bg-amber-50 text-amber-800'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${offer.status === 'ACTIVE' ? 'bg-emerald-600' : 'bg-amber-600'}`} />
                                  {offer.status === 'ACTIVE' ? 'Active Offer' : offer.status}
                                </span>
                              </div>

                              <h3 className="text-base font-bold text-[#0F1111] leading-snug line-clamp-2">
                                {prod?.title}
                              </h3>

                              {/* Offer Price vs Master Price */}
                              <div className="flex items-baseline gap-2 pt-1">
                                <span className="text-lg font-bold text-teal-800">
                                  Offer Price: ₹{minOfferPrice.toLocaleString('en-IN')}
                                </span>
                                {prod?.basePrice && (
                                  <span className="text-xs text-[#565959]">
                                    (Master MSRP: ₹{Number(prod.basePrice).toLocaleString('en-IN')})
                                  </span>
                                )}
                                <span className="text-xs font-semibold text-emerald-700 ml-2">
                                  Total Offer Stock: {totalOfferUnits} units
                                </span>
                              </div>

                              {/* Offer Variants Matrix */}
                              {offer.offerVariants && offer.offerVariants.length > 0 && (
                                <div className="pt-2 border-t border-[#F0F0F0] space-y-2">
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#565959] block">
                                    Vendor Offer Inventory ({offer.offerVariants.length} Sizes/Variants)
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
                                    {offer.offerVariants.map((ov: any) => {
                                      const variantStock = (ov.inventories || []).reduce(
                                        (sum: number, inv: any) => sum + (inv.quantity || 0),
                                        0
                                      );
                                      return (
                                        <div
                                          key={ov.id}
                                          className="p-2.5 rounded-lg bg-teal-50/40 border border-teal-200 text-xs flex flex-col justify-between shadow-2xs hover:border-[#007185] transition-all"
                                        >
                                          <div className="flex items-center justify-between font-bold text-[#0F1111]">
                                            <span className="bg-white text-stone-900 border border-stone-200 px-2 py-0.5 rounded text-[11px] font-extrabold tracking-wide">
                                              Size {ov.productVariant?.size || 'Standard'}
                                            </span>
                                            <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-[11px]">
                                              Qty: {variantStock}
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-teal-100 font-mono text-[11px]">
                                            <span className="text-teal-900 font-bold">₹{Number(ov.sellingPrice).toLocaleString('en-IN')}</span>
                                            <span className="text-[#565959] text-[10px]">{ov.sellerSku}</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right: Actions */}
                          <div className="flex flex-row lg:flex-col gap-2 w-full lg:w-auto shrink-0 justify-end">
                            <Link
                              href={`/products/${prod?.slug}`}
                              target="_blank"
                              className="px-3.5 py-2 rounded-lg bg-[#007185] hover:bg-[#004B57] text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 text-center flex-1 lg:flex-initial"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>View on Storefront</span>
                            </Link>

                            <Link
                              href={`/admin/products?vendorId=${encodeURIComponent(vendor.id)}`}
                              className="px-3.5 py-2 rounded-lg bg-white hover:bg-[#F7F8F8] border border-[#D5D9D9] text-[#0F1111] text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 text-center flex-1 lg:flex-initial"
                              title="Moderate catalog"
                            >
                              <ShieldAlert className="h-3.5 w-3.5 text-[#007185]" />
                              <span>Moderate Catalog</span>
                            </Link>

                            <button
                              type="button"
                              onClick={() => handleOpenNotice({ id: prod?.id, title: prod?.title, slug: prod?.slug })}
                              className="px-3.5 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 text-center flex-1 lg:flex-initial"
                              title="Issue notice"
                            >
                              <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
                              <span>Issue Notice</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: COMPLIANCE & BANKING DETAILS                                       */}
      {/* ========================================================================= */}
      {activeTab === 'compliance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Owner & Legal Identity */}
          <div className="bg-white rounded-2xl border border-[#D5D9D9] p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#D5D9D9]">
              <User className="h-5 w-5 text-[#007185]" />
              <h2 className="text-base font-bold font-headline text-[#0F1111]">
                Owner &amp; Authorised Contact
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[#565959] block text-[11px]">Full Legal Name:</span>
                <span className="font-bold text-sm text-[#0F1111]">{vendor.user?.name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[#565959] block text-[11px]">Registered Account Email:</span>
                <span className="font-mono font-semibold text-xs text-[#0F1111]">{vendor.user?.email || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[#565959] block text-[11px]">Dispatch Contact Phone:</span>
                <span className="font-mono font-semibold text-xs text-[#0F1111]">{vendor.user?.phone || 'Not provided'}</span>
              </div>
              <div>
                <span className="text-[#565959] block text-[11px]">Account Access Role:</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-stone-100 text-stone-800">
                  {vendor.user?.role || 'VENDOR'}
                </span>
              </div>
            </div>

            {/* Tax IDs */}
            <div className="pt-3 border-t border-[#D5D9D9] grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[#F7F8F8] border border-[#D5D9D9]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#565959] block">GSTIN</span>
                <span className="font-mono font-bold text-xs text-[#0F1111]">
                  {vendor.gstNumber || 'Not Required / Unregistered'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#F7F8F8] border border-[#D5D9D9]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#565959] block">PAN Number</span>
                <span className="font-mono font-bold text-xs text-[#0F1111]">
                  {vendor.panNumber || 'Verified'}
                </span>
              </div>
            </div>
          </div>

          {/* Bank Settlement Account */}
          <div className="bg-white rounded-2xl border border-[#D5D9D9] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D5D9D9]">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-amber-600" />
                <h2 className="text-base font-bold font-headline text-[#0F1111]">
                  Bank Settlement &amp; Payout Account
                </h2>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                vendor.payoutsEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {vendor.payoutsEnabled ? 'Payouts Active' : 'Setup Required'}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[#565959] block text-[11px]">Settlement Beneficiary Bank:</span>
                <span className="font-bold text-sm text-[#0F1111]">{vendor.bankName || 'Not configured'}</span>
              </div>
              <div>
                <span className="text-[#565959] block text-[11px]">IFSC Code:</span>
                <span className="font-mono font-bold text-xs text-[#0F1111]">{vendor.ifscCode || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[#565959] block text-[11px]">Bank Account Number (Tokenized):</span>
                <span className="font-mono font-bold text-xs text-[#0F1111]">
                  •••• •••• •••• {vendor.bankAccountLast4 || 'XXXX'}
                </span>
              </div>
              <div>
                <span className="text-[#565959] block text-[11px]">Merchant Beneficiary ID:</span>
                <span className="font-mono font-bold text-xs text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {merchantId}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-[11px] text-[#565959]">
                💡 Settlements are credited every Tuesday and Friday directly via automated NEFT to the linked bank account after deducting standard marketplace commission ({vendor.commissionRate}%).
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: REGISTERED WAREHOUSES                                              */}
      {/* ========================================================================= */}
      {activeTab === 'warehouses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold font-headline text-[#0F1111] flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-[#007185]" />
              <span>Registered Pickup &amp; Dispatch Facilities</span>
            </h2>
          </div>

          {vendor.warehouses.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#D5D9D9] p-12 text-center space-y-3">
              <Warehouse className="h-10 w-10 text-stone-300 mx-auto" />
              <p className="text-base font-bold text-[#0F1111]">No Registered Warehouses</p>
              <p className="text-xs text-[#565959]">This vendor does not have a registered dispatch facility.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vendor.warehouses.map((wh) => (
                <div
                  key={wh.id}
                  className="bg-white rounded-2xl border border-[#D5D9D9] p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-base text-[#0F1111]">{wh.facilityName}</h3>
                      <span className="font-mono text-xs text-[#007185] font-bold block mt-0.5">
                        Code: {wh.warehouseCode}
                      </span>
                    </div>
                    {wh.isDefault && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-300">
                        Default Dispatch Facility
                      </span>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-[#F7F8F8] border border-[#E7E7E7] space-y-1 text-xs text-[#0F1111]">
                    <p className="font-medium">{wh.streetAddress}</p>
                    <p className="text-[#565959]">
                      {wh.city}, {wh.state} — <strong className="text-[#0F1111] font-mono">{wh.postalCode}</strong>
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 text-[#565959]">
                    <span>Dispatch Phone: <strong className="text-[#0F1111] font-mono">{wh.contactPhone}</strong></span>
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Courier Pickup Active
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: ISSUED NOTICES & ACKNOWLEDGMENT TRACKER                            */}
      {/* ========================================================================= */}
      {activeTab === 'notices' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold font-headline text-[#0F1111] flex items-center gap-2">
                <span>Notices sent to this seller</span>
                <span className="text-xs bg-[#F7F8F8] text-[#565959] border border-[#D5D9D9] px-2.5 py-0.5 rounded-full font-sans font-semibold">
                  {notices.length} Total Issued
                </span>
              </h2>
              <p className="text-xs text-[#565959] mt-0.5">
                Track official SLA breach warnings, quality audit notices, and merchant acknowledgment status with timestamps.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleOpenNotice()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold shadow-xs transition-all self-start sm:self-auto"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Issue New Notice</span>
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 border border-[#D5D9D9] shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-[#565959] block">Total Notices Issued</span>
              <span className="text-2xl font-black text-[#0F1111] mt-1 block">{notices.length}</span>
              <span className="text-[11px] text-[#565959]">Lifetime governance notices</span>
            </div>
            <div className="bg-white rounded-xl p-4 border border-[#D5D9D9] shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-700 block">Pending Seller Action</span>
              <span className="text-2xl font-black text-rose-700 mt-1 block">
                {notices.filter((n) => n.status === 'OPEN').length}
              </span>
              <span className="text-[11px] text-[#565959]">Awaiting seller acknowledgment</span>
            </div>
            <div className="bg-white rounded-xl p-4 border border-[#D5D9D9] shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 block">Acknowledged by Seller</span>
              <span className="text-2xl font-black text-emerald-700 mt-1 block">
                {notices.filter((n) => n.status === 'ACKNOWLEDGED').length}
              </span>
              <span className="text-[11px] text-[#565959]">Acknowledged with timestamp</span>
            </div>
          </div>

          {/* Notices Table */}
          {notices.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#D5D9D9] p-12 text-center space-y-3">
              <ShieldCheck className="h-10 w-10 text-emerald-500 mx-auto" />
              <p className="text-base font-bold text-[#0F1111]">No Notices Issued (Account in Good Standing)</p>
              <p className="text-xs text-[#565959]">
                {vendor.storeName} currently has a clean compliance and fulfillment track record with zero active warnings.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-[#D5D9D9] rounded-xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#F7F8F8] text-[#565959] border-b border-[#D5D9D9] font-bold">
                    <tr>
                      <th className="py-3 px-4">Notice Title &amp; Details</th>
                      <th className="py-3 px-4">Target (Order / Product)</th>
                      <th className="py-3 px-4">Severity &amp; Deadline</th>
                      <th className="py-3 px-4">Issued By</th>
                      <th className="py-3 px-4">Seller Acknowledgment Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D5D9D9]">
                    {notices.map((n) => (
                      <tr key={n.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 px-4 max-w-xs">
                          <p className="font-bold text-[#0F1111]">{n.title}</p>
                          <p className="text-gray-600 text-[11px] mt-0.5 line-clamp-2">{n.message}</p>
                          <span className="inline-block mt-1 font-mono text-[10px] text-gray-400">
                            ID: {n.id}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {n.productTitle ? (
                            <div>
                              <span className="font-semibold text-[#0F1111] line-clamp-1">📦 {n.productTitle}</span>
                              <span className="text-[10px] text-[#007185] font-mono">Product Notice</span>
                            </div>
                          ) : n.orderNumber ? (
                            <div>
                              <span className="font-bold text-[#0F1111]">Order #{n.orderNumber}</span>
                              <span className="text-[10px] text-[#007185] font-mono">Consignment SLA</span>
                            </div>
                          ) : (
                            <span className="text-gray-500">General Merchant Notice</span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                              n.severity === 'CRITICAL'
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {n.severity}
                          </span>
                          <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {n.deadlineHours}h resolution
                          </p>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <p className="font-mono text-[11px] text-[#0F1111]">{n.adminEmail}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            {new Date(n.issuedAt).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </p>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {n.status === 'ACKNOWLEDGED' ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 text-emerald-800 font-bold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-300 text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Acknowledged by Seller</span>
                              </span>
                              {n.acknowledgedAt && (
                                <p className="text-[10px] text-emerald-700 pl-1 font-mono">
                                  ✓ {new Date(n.acknowledgedAt).toLocaleString('en-IN', {
                                    dateStyle: 'medium',
                                    timeStyle: 'short',
                                  })}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 text-amber-800 font-bold bg-amber-50 px-2.5 py-1 rounded-md border border-amber-300 text-[11px]">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                <span>Pending Acknowledgment</span>
                              </span>
                              <p className="text-[10px] text-gray-500 pl-1">
                                Awaiting seller response
                              </p>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Issue Official Notice Modal */}
      {showNoticeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#D5D9D9] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-600">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#0F1111]">
                    {targetProduct ? 'Issue Product Listing Notice' : 'Issue Official Vendor Notice'}
                  </h3>
                  <p className="text-xs text-[#565959]">
                    To: <span className="font-semibold text-gray-900">{vendor.storeName}</span>
                    {targetProduct && (
                      <span className="block text-[11px] text-[#007185] font-semibold truncate max-w-sm mt-0.5">
                        📦 Product: {targetProduct.title}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNoticeModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {noticeSuccess ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-5 h-5" />
                </div>
                <p className="text-sm font-bold text-emerald-800">{noticeSuccess}</p>
                <p className="text-xs text-gray-500">Notice has been delivered to seller dashboard banner.</p>
              </div>
            ) : (
              <form onSubmit={handleSendNotice} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#565959] uppercase tracking-wider mb-1">
                      Notice Category
                    </label>
                    <select
                      value={noticeReason}
                      onChange={(e) => setNoticeReason(e.target.value)}
                      className="w-full text-xs border border-[#D5D9D9] rounded-lg p-2 bg-white focus:outline-none focus:border-[#007185]"
                    >
                      {targetProduct ? (
                        <>
                          <option value="PRICE_AUDIT_BREACH">Price &amp; MRP Audit (Fake Discount / Inflated MRP)</option>
                          <option value="PRODUCT_DESCRIPTION_MISMATCH">Description / Fabric Mismatch</option>
                          <option value="IMAGE_COPYRIGHT_POLICY">Image &amp; Brand Infringement</option>
                          <option value="QUALITY_DEFECT_RATE">High Return / Defect Complaints</option>
                          <option value="POLICY_VIOLATION">General Catalog Policy Breach</option>
                        </>
                      ) : (
                        <>
                          <option value="SLA_DISPATCH_BREACH">SLA Dispatch &amp; Handling Breach</option>
                          <option value="INVENTORY_STOCKOUT">Inventory Stockout / Unfulfilled</option>
                          <option value="PACKAGING_QUALITY">Packaging Quality Standards</option>
                          <option value="POLICY_VIOLATION">Marketplace Policy Breach</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#565959] uppercase tracking-wider mb-1">
                      Severity Level
                    </label>
                    <select
                      value={noticeSeverity}
                      onChange={(e) => setNoticeSeverity(e.target.value as any)}
                      className="w-full text-xs border border-[#D5D9D9] rounded-lg p-2 bg-white focus:outline-none focus:border-[#007185]"
                    >
                      <option value="WARNING">Level 1: Warning Notice</option>
                      <option value="CRITICAL">Level 2: Critical (Suspension Risk)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#565959] uppercase tracking-wider mb-1">
                    Action Deadline Window
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[12, 24, 48].map((hours) => (
                      <button
                        type="button"
                        key={hours}
                        onClick={() => setNoticeDeadline(hours)}
                        className={`py-1.5 text-xs font-bold rounded-lg border text-center transition-colors ${
                          noticeDeadline === hours
                            ? 'bg-[#007185] text-white border-[#007185]'
                            : 'bg-white border-[#D5D9D9] text-[#565959] hover:bg-gray-50'
                        }`}
                      >
                        {hours} Hours
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#565959] uppercase tracking-wider mb-1">
                    Official Notice Message
                  </label>
                  <textarea
                    rows={4}
                    value={noticeMessage}
                    onChange={(e) => setNoticeMessage(e.target.value)}
                    placeholder="Enter explicit instructions and requirements for the vendor..."
                    className="w-full text-xs border border-[#D5D9D9] rounded-lg p-2.5 bg-white focus:outline-none focus:border-[#007185] resize-none"
                    required
                  />
                  <p className="text-[10px] text-[#565959] mt-1">
                    This warning will immediately appear as a high-priority banner in {vendor.storeName}&apos;s Seller Portal.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowNoticeModal(false)}
                    className="px-3.5 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingNotice}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-lg shadow-sm transition-all disabled:opacity-50"
                  >
                    {isSubmittingNotice ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Dispatching...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Official Notice</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
