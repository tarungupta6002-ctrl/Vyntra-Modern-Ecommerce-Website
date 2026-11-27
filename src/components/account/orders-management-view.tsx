'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Package,
  Truck,
  CheckCircle,
  Copy,
  Check,
  Search,
  Calendar,
  Filter,
  Download,
  RotateCcw,
  RefreshCw,
  Star,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Receipt,
  Info,
  CreditCard,
  Headphones,
  AlertCircle,
  X,
  Navigation,
  FileText,
  ShieldCheck,
  ShieldAlert,
  Clock,
  HelpCircle,
} from 'lucide-react';
import { Order, OrderItem } from '@/data/orders-data';
import { useCartStore } from '@/store/cart-store';
import { useOrderStore } from '@/store/order-store';
import { formatINR } from '@/lib/utils';
import { formatCustomerRefundSummary } from '@/lib/refund-ui-helpers';
import { ReturnRequestModal } from '@/components/orders/return-request-modal';
import { CustomerDisputeModal } from '@/components/orders/customer-dispute-modal';
import { computeIstDisputeDeadline, isWithinDeadline } from '@/lib/date-utils';

interface OrdersManagementViewProps {
  embeddedInAccount?: boolean;
}

export function OrdersManagementView({ embeddedInAccount = false }: OrdersManagementViewProps) {
  const { addItem, openCart } = useCartStore();
  const { orders: storeOrders, isLoading, fetchOrders, totalCount, totalPages } = useOrderStore();
  const [mounted, setMounted] = useState(false);

  // Filters & Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('2024');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setMounted(true);
    fetchOrders({ page: currentPage, status: selectedStatus, search: searchQuery });
  }, [currentPage, selectedStatus]);

  const sourceOrders = mounted ? storeOrders : [];

  // Modal states
  const [activeOrderModal, setActiveOrderModal] = useState<Order | null>(null);
  const [modalType, setModalType] = useState<'tracking' | 'invoice' | 'cancellation' | 'review' | 'price_details' | null>(null);
  const [feesExpanded, setFeesExpanded] = useState(false);
  const [discountExpanded, setDiscountExpanded] = useState(false);
  const [returnItemModal, setReturnItemModal] = useState<{
    order: Order;
    item: OrderItem;
  } | null>(null);
  const [disputeModal, setDisputeModal] = useState<{
    order: Order;
    item: OrderItem;
    returnRequest: NonNullable<OrderItem['returnRequest']>;
  } | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [selectedReviewItem, setSelectedReviewItem] = useState<OrderItem | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Toast feedback
  const [toast, setToast] = useState<{ show: boolean; message: string; type?: 'success' | 'info' | 'error' }>({
    show: false,
    message: '',
  });

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3000);
  };

  // Copy Order ID
  const handleCopyOrderId = (orderId: string) => {
    navigator.clipboard.writeText(orderId);
    showToast(`Order ID ${orderId} copied to clipboard!`, 'info');
  };

  // Reorder / Buy Again
  const handleReorder = (item: OrderItem) => {
    addItem({
      id: `reorder-${item.id}-${Date.now()}`,
      productId: item.productId,
      title: item.title,
      brand: item.brand,
      variantId: `var-${item.id}`,
      size: item.size,
      color: item.color,
      price: item.price,
      originalPrice: item.originalPrice,
      quantity: 1,
      image: item.image,
      vendorName: item.sellerName,
    });
    showToast(`Added ${item.title} to your Bag!`, 'success');
  };

  // Submit Customer Review
  const handleSubmitReview = async () => {
    if (!selectedReviewItem) {
      setReviewError('Please select an item to review.');
      return;
    }

    const trimmedComment = reviewComment.trim();
    if (!trimmedComment) {
      setReviewError('Review comment is required.');
      return;
    }
    if (trimmedComment.length < 10) {
      setReviewError('Review comment must be at least 10 characters long.');
      return;
    }
    if (trimmedComment.length > 1000) {
      setReviewError('Review comment cannot exceed 1000 characters.');
      return;
    }

    try {
      setIsSubmittingReview(true);
      setReviewError(null);

      const targetProductId = selectedReviewItem.productId;
      const res = await fetch(`/api/products/${targetProductId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderItemId: selectedReviewItem.id,
          rating: reviewRating,
          title: reviewTitle.trim() || undefined,
          comment: trimmedComment,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        const errorMsg = data?.error?.message || 'Failed to submit review. Please try again.';
        setReviewError(errorMsg);
        showToast(errorMsg, 'error');
        return;
      }

      setModalType(null);
      showToast('Thank you! Your review has been submitted for moderation approval.', 'success');
      setReviewTitle('');
      setReviewComment('');
    } catch (err: any) {
      const errorMsg = err?.message || 'Network error while submitting review.';
      setReviewError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Filtered orders logic
  const filteredOrders = useMemo(() => {
    return sourceOrders.filter((order) => {
      // 1. Status Filter
      if (selectedStatus !== 'all' && order.status !== selectedStatus) {
        return false;
      }

      // 2. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = order.id.toLowerCase().includes(q) || order.orderNumber.toLowerCase().includes(q);
        const matchesProduct = order.items.some(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            item.brand.toLowerCase().includes(q) ||
            item.sellerName.toLowerCase().includes(q)
        );
        if (!matchesId && !matchesProduct) {
          return false;
        }
      }

      return true;
    });
  }, [sourceOrders, selectedStatus, searchQuery]);

  // Counts for status tabs
  const statusCounts = useMemo(() => {
    return {
      all: sourceOrders.length,
      processing: sourceOrders.filter((o) => o.status === 'processing').length,
      shipped: sourceOrders.filter((o) => o.status === 'shipped').length,
      delivered: sourceOrders.filter((o) => o.status === 'delivered').length,
      cancelled: sourceOrders.filter((o) => o.status === 'cancelled').length,
    };
  }, [sourceOrders]);

  return (
    <div className="w-full flex flex-col">
      {/* Top Header & Summary Bar */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs uppercase font-headline font-bold tracking-widest text-primary">
              Order Management
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-secondary-container" />
            <span className="text-xs font-label text-on-surface-variant font-medium">
              Account ID #AS-99214
            </span>
          </div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="font-headline text-3xl lg:text-4xl font-extrabold tracking-tight text-on-surface">
              My Orders
            </h1>
            <span className="text-sm font-label font-semibold text-on-surface-variant bg-surface-container-high px-3 py-1 rounded-full">
              ({totalCount || sourceOrders.length} {((totalCount || sourceOrders.length) === 1) ? 'order' : 'orders'} placed)
            </span>
          </div>
        </div>

        {/* Quick Purchase Health & Points Summary Pill */}
        <div className="flex items-center gap-3 bg-surface-container p-2 rounded-xl shadow-sm self-start lg:self-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-lowest rounded-lg border border-surface-container">
            <Star className="h-4 w-4 text-secondary-container fill-secondary-container" />
            <div className="text-left">
              <p className="text-[10px] font-label font-bold uppercase tracking-wider text-outline">
                Vyntra Royal Club
              </p>
              <p className="text-xs font-bold text-on-surface">850 Coins Active</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-surface-container-lowest rounded-lg border border-surface-container">
            <Truck className="h-4 w-4 text-primary" />
            <div className="text-left">
              <p className="text-[10px] font-label font-bold uppercase tracking-wider text-outline">
                Active Transit
              </p>
              <p className="text-xs font-bold text-primary">
                {statusCounts.shipped + statusCounts.processing} In-Flight Delivery
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Controls Ribbon */}
      <div className="bg-surface-container-lowest p-4 lg:p-5 rounded-2xl shadow-sm mb-8 space-y-4 border border-surface-container">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Field */}
          <div className="relative flex-1 max-w-2xl">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline h-4 w-4" />
            <input
              type="text"
              id="orderSearchInput"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search across all orders by product, brand, or Order ID..."
              className="w-full h-11 pl-11 pr-10 bg-surface-container-low rounded-xl text-sm text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-surface-container transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface p-1"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Year Selector Dropdown */}
          <div className="flex items-center gap-2">
            <div className="relative min-w-[210px]">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full h-11 pl-3.5 pr-9 appearance-none bg-surface-container-low rounded-xl text-xs sm:text-sm font-semibold text-on-surface focus:outline-none cursor-pointer border border-surface-container"
              >
                <option value="2024">2024 (Last 6 Months)</option>
                <option value="2024-h1">2024 (Jan - Jun)</option>
                <option value="2023">Year 2023</option>
                <option value="2022">Year 2022</option>
                <option value="archived">Archived Orders</option>
              </select>
              <Calendar className="h-4 w-4 text-on-surface-variant absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Filter Segmented Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-sm font-label scrollbar-none">
          {[
            { id: 'all', label: 'All Orders', count: statusCounts.all },
            { id: 'processing', label: 'Processing', count: statusCounts.processing },
            { id: 'shipped', label: 'Shipped', count: statusCounts.shipped },
            { id: 'delivered', label: 'Delivered', count: statusCounts.delivered },
            { id: 'cancelled', label: 'Cancelled', count: statusCounts.cancelled },
          ].map((tab) => {
            const isActive = selectedStatus === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedStatus(tab.id)}
                className={`px-3.5 py-1.5 rounded-md text-xs whitespace-nowrap transition-all font-semibold ${
                  isActive
                    ? 'bg-[#232F3E] text-white font-bold shadow-sm'
                    : 'bg-white text-[#0F1111] border border-[#D5D9D9] hover:bg-[#F7FAFA]'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`ml-1 text-xs ${isActive ? 'opacity-90 font-normal' : 'opacity-70'}`}>
                  ({tab.count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders List Container */}
      <div className="flex flex-col gap-6" id="ordersContainer">
        {isLoading ? (
          <div className="bg-surface-container-lowest rounded-2xl p-12 text-center my-6 flex flex-col items-center justify-center border border-surface-container">
            <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-semibold text-on-surface-variant">Loading your purchase history...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          /* Empty State */
          <div className="bg-surface-container-lowest rounded-2xl p-12 text-center my-6 flex flex-col items-center justify-center border border-surface-container">
            <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center text-primary mb-4 shadow-sm">
              <Package className="h-8 w-8" />
            </div>
            <h3 className="font-headline font-bold text-lg text-on-surface mb-1">
              {searchQuery || selectedStatus !== 'all'
                ? 'No orders found matching your criteria'
                : 'You have not placed any orders yet'}
            </h3>
            <p className="text-xs sm:text-sm text-on-surface-variant max-w-sm mb-6 leading-relaxed">
              {searchQuery || selectedStatus !== 'all'
                ? 'Check your search query or reset filters to display your full verified purchase history.'
                : 'Explore India’s finest artisanal handlooms, luxury festive attire, and master artisan creations.'}
            </p>
            {searchQuery || selectedStatus !== 'all' ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedStatus('all');
                  fetchOrders({ page: 1, status: 'all', search: '' });
                }}
                className="bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] border border-[#FCD200] px-4 py-2 rounded-md text-xs font-bold transition-all shadow-sm"
              >
                Clear Search &amp; Show All Orders
              </button>
            ) : (
              <Link
                href="/products"
                className="bg-primary hover:bg-primary-container text-on-primary px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                Explore Handcrafted Products
              </Link>
            )}
          </div>
        ) : (
          filteredOrders.map((order) => {
            const refundSummary = formatCustomerRefundSummary(order as any);

            return (
              <article
                key={order.id}
                className="bg-white rounded-xl p-6 lg:p-7 shadow-sm transition-all duration-300 hover:shadow-md border border-[#D5D9D9] overflow-hidden"
              >
                {/* Order Header Row with Dark Navy Header Theme */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-5 bg-[#131921] text-white -mx-6 lg:-mx-7 -mt-6 lg:-mt-7 p-5 sm:p-6 rounded-t-xl border-b border-[#232F3E]">
                  <div className="flex flex-wrap items-center gap-y-2 gap-x-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#CCCCCC] block">
                        Order Number
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm sm:text-base text-[#FFD814] tracking-tight">
                          {order.orderNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyOrderId(order.orderNumber)}
                          className="text-[#CCCCCC] hover:text-[#FFD814] transition-colors p-1"
                          title="Copy Order ID"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <span className="hidden sm:inline text-white/30">•</span>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#CCCCCC] block">
                        Date Placed
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-white">
                        {order.datePlaced}
                      </span>
                    </div>
                    <span className="hidden sm:inline text-white/30">•</span>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#CCCCCC] block">
                        {refundSummary.hasRefund ? 'Refund & Payment Status' : (order.status === 'cancelled' ? 'Order Status' : 'Total Amount')}
                      </span>
                      <span
                        className={`text-xs sm:text-sm font-bold ${
                          refundSummary.hasRefund
                            ? refundSummary.isPartial
                              ? 'text-amber-300'
                              : 'text-emerald-400'
                            : order.status === 'cancelled'
                            ? 'text-rose-400'
                            : 'text-white'
                        }`}
                      >
                        {refundSummary.hasRefund
                          ? refundSummary.badgeLabel
                          : order.status === 'cancelled'
                          ? order.paymentMethod === 'COD'
                            ? 'Cancelled • No Payment Collected (COD)'
                            : 'Cancelled'
                          : `${formatINR(order.totalAmount)} (${order.totalItems} Items)`}
                      </span>
                    </div>
                  </div>

                {/* Status Badges */}
                {order.status === 'shipped' && (
                  <div className="flex items-center gap-2 bg-[#232F3E] text-white px-3.5 py-1.5 rounded-full self-start md:self-auto border border-[#FF9900]/40">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF9900] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF9900]" />
                    </span>
                    <Truck className="h-4 w-4 text-[#FF9900]" />
                    <span className="text-xs font-bold text-[#FFD814]">
                      {order.statusLabel}
                    </span>
                  </div>
                )}

                {order.status === 'delivered' && (
                  <div className="flex items-center gap-2 bg-[#232F3E] text-white px-3.5 py-1.5 rounded-full self-start md:self-auto border border-[#067D62]/40">
                    <CheckCircle className="h-4 w-4 text-[#067D62]" />
                    <span className="text-xs font-bold text-emerald-400">
                      {order.statusLabel}
                    </span>
                  </div>
                )}

                {order.status === 'cancelled' && (
                  <div className="flex items-center gap-2 bg-[#232F3E] text-white px-3.5 py-1.5 rounded-full self-start md:self-auto border border-rose-500/40">
                    <AlertCircle className="h-4 w-4 text-rose-400" />
                    <span className="text-xs font-bold text-rose-300">
                      Cancelled by Customer
                    </span>
                  </div>
                )}
              </div>

              {/* Shipped Stepper Milestone Indicator */}
              {order.status === 'shipped' && (
                <div className="bg-surface-container-low p-4 rounded-xl mb-6 border border-surface-container">
                  <div className="flex items-center justify-between text-xs font-semibold text-on-surface mb-2">
                    <span className="text-primary font-bold flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5" /> Order Confirmed
                    </span>
                    <span className="text-primary font-bold flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5" /> Dispatched ({order.courierName})
                    </span>
                    <span className="text-secondary-container font-bold flex items-center gap-1">
                      <Truck className="h-3.5 w-3.5" /> Out for Delivery Soon
                    </span>
                    <span className="text-outline">Delivered</span>
                  </div>
                  <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-primary to-secondary-container h-full rounded-full transition-all duration-700"
                      style={{ width: `${order.stepperProgress || 75}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center mt-2 text-[11px] text-on-surface-variant font-medium">
                    <span>AWB: {order.awb}</span>
                    <span className="text-secondary-container font-semibold">
                      Latest scan: {order.latestScan}
                    </span>
                  </div>
                </div>
              )}

              {/* Multi-Vendor Shipments Indicator */}
              {order.vendorShipments && order.vendorShipments.length > 1 && (
                <div className="mb-4 p-3 bg-surface-container-low rounded-xl border border-surface-container flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-bold text-on-surface">
                      Multi-Vendor Order ({order.vendorShipments.length} Independent Packages)
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {order.vendorShipments.map((shp: any, sIdx: number) => (
                      <span
                        key={shp.id || sIdx}
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          shp.status === 'DELIVERED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : shp.status === 'SHIPPED'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : shp.status === 'CANCELLED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        Pkg {sIdx + 1}: {shp.vendor?.storeName || 'Vendor'} • {shp.status}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Items Section (Multi-Vendor Marketplace Support) */}
              <div className="flex flex-col gap-6">
                {order.items.map((item, idx) => (
                  <React.Fragment key={item.id}>
                    {idx > 0 && <div className="h-px bg-surface-container w-full" />}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-1">
                      <div className="flex items-start gap-4">
                        <div className="w-20 h-24 rounded-xl overflow-hidden bg-surface-container relative shrink-0 shadow-sm border border-surface-container">
                          <Image
                            src={item.image}
                            alt={item.title}
                            fill
                            className={`object-cover ${order.status === 'cancelled' ? 'grayscale opacity-80' : ''}`}
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-headline font-bold uppercase tracking-wider bg-surface-container-high text-primary px-2 py-0.5 rounded">
                              {item.categoryTag}
                            </span>
                            {/* `> 0`, not `&&`: React renders a bare 0 when the window is closed or not open yet */}
                            {(order.returnWindowDaysLeft ?? 0) > 0 && (
                              <span className="text-[11px] font-medium text-secondary-container flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Return Window Open ({order.returnWindowDaysLeft} days left)
                              </span>
                            )}
                          </div>
                          <h4 className="font-headline font-bold text-sm lg:text-base text-on-surface">
                            {item.title}
                          </h4>
                          <p className="text-xs text-on-surface-variant font-label">
                            {(() => {
                              const isUnstitched =
                                item.title?.toLowerCase().includes('saree') ||
                                item.title?.toLowerCase().includes('shawl') ||
                                item.title?.toLowerCase().includes('dupatta');
                              const displaySize = isUnstitched
                                ? 'Free Size'
                                : (item.size || (item as any).selectedSize || 'N/A');
                              return (
                                <>
                                  Size: <span className="font-semibold text-on-surface">{displaySize}</span>{' '}
                                  &nbsp;|&nbsp; Color:{' '}
                                </>
                              );
                            })()}
                            <span className="font-semibold text-on-surface">{item.color || (item as any).selectedColor || 'N/A'}</span>{' '}
                            &nbsp;|&nbsp; Qty:{' '}
                            <span className="font-semibold text-on-surface">{item.quantity}</span>
                          </p>
                          <div className="flex items-center gap-2 pt-1">
                            <span
                              className={`font-bold text-sm ${
                                order.status === 'cancelled' ? 'text-outline line-through' : 'text-on-surface'
                              }`}
                            >
                              {formatINR(Number(item.price ?? (item as any).unitPrice ?? 0))}
                            </span>
                            {Number(item.originalPrice ?? 0) > Number(item.price ?? (item as any).unitPrice ?? 0) && (
                              <span className="text-xs text-outline line-through">
                                {formatINR(Number(item.originalPrice))}
                              </span>
                            )}
                            {item.discount && (
                              <span className="text-xs font-semibold text-secondary-container">
                                {item.discount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Multi-Vendor Seller Badge */}
                      <div className="flex sm:flex-col items-center sm:items-end gap-1.5 shrink-0 self-end sm:self-auto">
                        <span className="text-xs font-medium text-on-surface-variant">
                          {item.shippingMethod || (order as any).courierPartner || 'Courier not assigned yet'}
                        </span>
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20">
                          Seller: {item.sellerName || (item as any).vendorName || 'Seller'}
                        </span>
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>

              {/* Action Footer */}
              <div className="mt-6 pt-5 bg-surface-container-lowest flex flex-wrap items-center justify-between gap-3 border-t border-surface-container">
                <div className="flex items-center gap-2">
                  {order.status === 'processing' && (
                    <>
                      <Link
                        href={`/orders/${order.id}/cancel`}
                        className="text-xs font-headline font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-2 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <X className="h-4 w-4" /> Cancel Order
                      </Link>
                      <Link
                        href={`/support?topic=ORDER&order=${encodeURIComponent(order.orderNumber || order.id)}#support-contact-form`}
                        className="text-xs font-headline font-medium text-on-surface-variant hover:text-primary px-3 py-2 rounded-lg hover:bg-surface-container transition-colors flex items-center gap-1"
                      >
                        <HelpCircle className="h-4 w-4" /> Need Help?
                      </Link>
                    </>
                  )}

                  {order.status === 'delivered' && (
                    <>
                      {order.items[0]?.hasReviewed || order.items[0]?.review ? (
                        <span className="text-xs font-headline font-semibold text-emerald-700 bg-emerald-50 px-3.5 py-2 rounded-lg flex items-center gap-1.5 border border-emerald-200">
                          <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[2.5]" />
                          <span>Reviewed</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveOrderModal(order);
                            setSelectedReviewItem(order.items[0] || null);
                            setReviewRating(5);
                            setReviewTitle('');
                            setReviewComment('');
                            setReviewError(null);
                            setModalType('review');
                          }}
                          className="text-xs font-headline font-semibold text-secondary-container hover:bg-secondary-container/10 px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 border border-secondary-container/30"
                        >
                          <Star className="h-3.5 w-3.5 fill-secondary-container" />
                          <span>Write a Review</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveOrderModal(order);
                          setFeesExpanded(false);
                          setDiscountExpanded(false);
                          setModalType('price_details');
                        }}
                        className="text-xs font-headline font-semibold text-[#0F1111] hover:text-[#007185] hover:bg-stone-50 px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 border border-[#D5D9D9] bg-white shadow-2xs"
                      >
                        <Receipt className="h-3.5 w-3.5 text-[#007185]" />
                        <span>Price Details</span>
                        <ChevronDown className="h-3 w-3 text-stone-400" />
                      </button>
                    </>
                  )}

                  {order.status === 'cancelled' && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveOrderModal(order);
                        setModalType('cancellation');
                      }}
                      className="text-xs font-headline font-medium text-on-surface-variant hover:text-primary px-3 py-2 rounded-lg hover:bg-surface-container transition-colors flex items-center gap-1"
                    >
                      <FileText className="h-4 w-4" /> View Cancellation Summary
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {order.status === 'processing' && (
                    <Link
                      href={`/account?tab=tracking&orderId=${encodeURIComponent(order.orderNumber || order.id)}`}
                      className="text-xs font-bold text-[#0F1111] bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] px-4 py-2 rounded-md shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <Truck className="h-3.5 w-3.5" />
                      <span>Track Order</span>
                    </Link>
                  )}

                  {order.status === 'shipped' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveOrderModal(order);
                          setFeesExpanded(false);
                          setDiscountExpanded(false);
                          setModalType('price_details');
                        }}
                        className="text-xs font-medium text-[#0F1111] hover:bg-[#F7FAFA] bg-white border border-[#D5D9D9] px-3.5 py-2 rounded-md transition-colors flex items-center gap-1.5"
                      >
                        <Receipt className="h-3.5 w-3.5 text-[#007185]" />
                        <span>Price Details</span>
                        <ChevronDown className="h-3 w-3 text-stone-400" />
                      </button>
                      <Link
                        href={`/account?tab=tracking&orderId=${encodeURIComponent(order.orderNumber || order.id)}`}
                        className="text-xs font-bold text-[#0F1111] bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] px-4 py-2 rounded-md shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <Navigation className="h-3.5 w-3.5" />
                        <span>Track Package</span>
                      </Link>
                    </>
                  )}

                  {order.status === 'delivered' && (
                    <>
                      <Link
                        href={`/account?tab=tracking&orderId=${encodeURIComponent(order.orderNumber || order.id)}`}
                        className="text-xs font-medium text-[#0F1111] hover:bg-[#F7FAFA] bg-white border border-[#D5D9D9] px-3.5 py-2 rounded-md transition-colors flex items-center gap-1"
                      >
                        <Truck className="h-3.5 w-3.5 text-[#007185]" />
                        <span>Track Delivery</span>
                      </Link>
                      {order.items[0]?.returnRequest ? (
                        order.items[0].returnRequest.status === 'REFUND_OFFERED' ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-md flex items-center gap-1.5">
                              <span>Out of Stock • Refund Offered</span>
                            </span>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const reqId = order.items[0]?.returnRequest?.id;
                                  if (!reqId) return;
                                  const res = await fetch(`/api/returns/${reqId}/accept-refund`, { method: 'POST' });
                                  if (res.ok) {
                                    showToast('Refund offer accepted. Converted to return for refund.', 'success');
                                    window.location.reload();
                                  } else {
                                    showToast('Failed to accept refund offer', 'error');
                                  }
                                } catch {
                                  showToast('Network error', 'error');
                                }
                              }}
                              className="text-xs font-bold text-white bg-primary hover:bg-primary-container px-3 py-1.5 rounded-md transition-all shadow-sm"
                            >
                              Accept Refund
                            </button>
                          </div>
                        ) : order.items[0].returnRequest.status === 'QC_DISPUTED' || order.items[0].returnRequest.isDisputed ? (
                          <span className="text-xs font-semibold text-amber-900 bg-amber-100/90 border border-amber-300 px-3 py-1.5 rounded-md flex items-center gap-1.5 shadow-xs">
                            <Clock className="h-3.5 w-3.5 text-amber-700" />
                            <span>
                              Dispute Under Review
                              {order.items[0].returnRequest.disputeResolution && (
                                <span className="font-bold text-amber-950">
                                  {' '}• {order.items[0].returnRequest.disputeResolution.replace(/_/g, ' ')}
                                </span>
                              )}
                            </span>
                          </span>
                        ) : (order.items[0].returnRequest.status === 'REJECTED' || order.items[0].returnRequest.status === 'QC_FAILED') ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-md flex items-center gap-1.5">
                              <span>Return: {order.items[0].returnRequest.status.replace(/_/g, ' ')}</span>
                            </span>
                            {(() => {
                              const ret = order.items[0].returnRequest;
                              const trigger = ret.rejectedAt || ret.qcCompletedAt || ret.createdAt;
                              let canDispute = true;
                              if (trigger) {
                                try {
                                  const deadline = computeIstDisputeDeadline(trigger, 5);
                                  canDispute = isWithinDeadline(new Date(), deadline);
                                } catch {
                                  canDispute = true;
                                }
                              }
                              if (canDispute) {
                                return (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDisputeModal({
                                        order,
                                        item: order.items[0],
                                        returnRequest: ret,
                                      })
                                    }
                                    className="text-xs font-bold text-white bg-amber-800 hover:bg-amber-900 px-3 py-1.5 rounded-md transition-all shadow-sm flex items-center gap-1.5"
                                    title="Dispute the seller's decision"
                                  >
                                    <ShieldAlert className="h-3.5 w-3.5 text-amber-300" />
                                    <span>Raise Dispute</span>
                                  </button>
                                );
                              }
                              return (
                                <span className="text-[11px] font-medium text-gray-500 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-md">
                                  Dispute Window Expired
                                </span>
                              );
                            })()}
                          </div>
                        ) : (
                          <Link
                            href="/account?tab=returns"
                            className="text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors shadow-2xs group"
                            title="Track live return status and refund"
                          >
                            <RotateCcw className="h-3 w-3 text-amber-600 group-hover:rotate-45 transition-transform" />
                            <span>
                              {order.items[0].returnRequest.type === 'REPLACEMENT' ? 'Replacement' : 'Return'}: {order.items[0].returnRequest.status.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] text-amber-900 font-extrabold underline ml-0.5">Track &rarr;</span>
                          </Link>
                        )
                      ) : order.isReturnEligible !== false && (order.returnWindowDaysLeft === undefined || order.returnWindowDaysLeft > 0) ? (
                        <button
                          type="button"
                          onClick={() => setReturnItemModal({ order, item: order.items[0] })}
                          className="text-xs font-medium text-[#0F1111] hover:bg-[#F7FAFA] bg-white border border-[#D5D9D9] px-3.5 py-2 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="h-3 w-3 text-gray-500" />
                          <span>Return / Exchange</span>
                        </button>
                      ) : (
                        <span
                          className="text-xs font-medium text-stone-500 bg-stone-100 border border-stone-200 px-3 py-1.5 rounded-md flex items-center gap-1.5"
                          title="The 7-day return and exchange policy window has closed."
                        >
                          <Clock className="h-3 w-3 text-stone-400" />
                          <span>Window Closed</span>
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleReorder(order.items[0])}
                        className="text-xs font-bold text-[#0F1111] bg-[#FF9900] hover:bg-[#FA8900] border border-[#FF8F00] px-4 py-2 rounded-md shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Buy It Again</span>
                      </button>
                    </>
                  )}

                  {order.status === 'cancelled' && (
                    <button
                      type="button"
                      onClick={() => handleReorder(order.items[0])}
                      className="text-xs font-bold text-[#0F1111] bg-[#FF9900] hover:bg-[#FA8900] border border-[#FF8F00] px-4 py-2 rounded-md shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Reorder Item</span>
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })
        )}
      </div>

      {/* Pagination & Catalog Counter */}
      <div className="mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-surface-container">
        <div className="text-xs font-medium text-on-surface-variant">
          Showing <span className="font-bold text-on-surface">{filteredOrders.length > 0 ? (currentPage - 1) * 10 + 1 : 0}–{Math.min(currentPage * 10, totalCount || filteredOrders.length)}</span> of{' '}
          <span className="font-bold text-on-surface">{totalCount || filteredOrders.length}</span> {((totalCount || filteredOrders.length) === 1) ? 'order' : 'orders'}
        </div>

        {/* Pagination Controls */}
        {(totalPages > 1 || (totalCount > 10)) && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-2 rounded-lg bg-surface-container-lowest text-outline hover:text-on-surface hover:bg-surface-container disabled:opacity-40 transition-colors border border-surface-container"
              aria-label="Previous Page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(5, Math.max(1, totalPages || Math.ceil((totalCount || 1) / 10))) }).map((_, pIdx) => {
              const pNum = pIdx + 1;
              return (
                <button
                  key={pNum}
                  type="button"
                  onClick={() => setCurrentPage(pNum)}
                  className={`w-8 h-8 rounded-lg font-bold text-xs shadow-sm transition-all ${
                    currentPage === pNum ? 'bg-primary text-white' : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container border border-surface-container'
                  }`}
                >
                  {pNum}
                </button>
              );
            })}
            <button
              type="button"
              disabled={currentPage >= (totalPages || 1)}
              onClick={() => setCurrentPage((p) => Math.min(totalPages || 1, p + 1))}
              className="p-2 rounded-lg bg-surface-container-lowest text-on-surface-variant hover:text-on-surface hover:bg-surface-container disabled:opacity-40 transition-colors border border-surface-container"
              aria-label="Next Page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Help banner */}
      <section className="mt-12 rounded-2xl border border-[#D5D9D9] bg-white p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-headline font-bold text-lg text-[#0F1111]">Need help with an order or return?</h3>
          <p className="text-xs text-[#565959] max-w-xl leading-relaxed">
            Send us a request from Help &amp; Support. Our team replies in your account and by email.
          </p>
        </div>
        <Link
          href="/support#support-contact-form"
          className="shrink-0 rounded-full bg-[#FFD814] px-5 py-2.5 text-xs font-headline font-bold text-[#0F1111] hover:bg-[#F7CA00]"
        >
          Contact Customer Service
        </Link>
      </section>

      {/* ============================================================= */}
      {/* MODAL 1: LIVE SHIPMENT TRACKING */}
      {/* ============================================================= */}
      {modalType === 'tracking' && activeOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-surface-container space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div>
                <span className="text-[10px] font-headline font-bold uppercase tracking-widest text-secondary-container">
                  Live Logistics Tracker
                </span>
                <h3 className="font-headline font-bold text-lg text-on-surface">
                  Order {activeOrderModal.orderNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="p-1 rounded-lg hover:bg-surface-container text-on-surface-variant"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {activeOrderModal.vendorShipments && activeOrderModal.vendorShipments.length > 1 ? (
              <div className="space-y-3">
                <span className="text-xs font-bold text-on-surface block">
                  Consignment Packages ({activeOrderModal.vendorShipments.length}):
                </span>
                {activeOrderModal.vendorShipments.map((shp: any, sIdx: number) => (
                  <div
                    key={shp.id || sIdx}
                    className="bg-surface-container-low p-3.5 rounded-xl border border-surface-container space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-primary">
                        Package {sIdx + 1}: {shp.vendor?.storeName || 'Seller'}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full ${
                          shp.status === 'DELIVERED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : shp.status === 'SHIPPED'
                            ? 'bg-amber-100 text-amber-900'
                            : shp.status === 'CANCELLED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {shp.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-on-surface-variant font-medium">
                      <span>{shp.courierPartner || 'Assigned Courier'}</span>
                      <span className="font-mono">
                        {shp.trackingNumber ? `AWB: ${shp.trackingNumber}` : 'Pending Dispatch'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-surface-container-low p-4 rounded-xl space-y-2 border border-surface-container">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-primary flex items-center gap-1.5">
                    <Navigation className="h-4 w-4" />
                    {activeOrderModal.courierPartner || activeOrderModal.courierName || 'To be assigned upon dispatch'}
                  </span>
                  <span className="font-mono text-outline">
                    {activeOrderModal.trackingNumber ? `AWB: ${activeOrderModal.trackingNumber}` : 'Tracking details not available yet'}
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant font-medium">
                  Destination: {activeOrderModal.shippingAddress?.cityStateZip || 'Registered Address'}
                </p>
              </div>
            )}

            {/* Stepper Milestones */}
            <div className="space-y-4 text-xs pl-2 border-l-2 border-primary/30 ml-3">
              <div className="relative pl-4">
                <span className="absolute -left-[23px] top-0.5 w-3.5 h-3.5 rounded-full bg-primary ring-4 ring-primary/20" />
                <span className="font-bold text-on-surface block">Order Confirmed</span>
                <span className="text-[11px] text-outline">Placed on {activeOrderModal.datePlaced || 'Recently'}</span>
              </div>
              <div className="relative pl-4">
                <span className={`absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full ${activeOrderModal.status === 'processing' ? 'bg-secondary-container' : activeOrderModal.status === 'shipped' || activeOrderModal.status === 'delivered' ? 'bg-primary' : 'bg-surface-container-highest'}`} />
                <span className="font-bold text-on-surface block">Artisan Crafting &amp; Packaging</span>
                <span className="text-[11px] text-outline">
                  {activeOrderModal.status === 'processing' ? 'In progress at fulfillment atelier' : activeOrderModal.status === 'shipped' || activeOrderModal.status === 'delivered' ? 'Completed & tamper sealed' : 'Pending artisan start'}
                </span>
              </div>
              <div className="relative pl-4">
                <span className={`absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full ${activeOrderModal.status === 'shipped' ? 'bg-secondary-container' : activeOrderModal.status === 'delivered' ? 'bg-primary' : 'bg-surface-container-highest'}`} />
                <span className="font-bold text-on-surface block">Dispatched to Courier</span>
                <span className="text-[11px] text-outline">
                  {activeOrderModal.trackingNumber ? `Handed over to ${activeOrderModal.courierPartner || 'courier'}` : 'Courier and tracking ID will appear once dispatched'}
                </span>
              </div>
              <div className="relative pl-4">
                <span className={`absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full ${activeOrderModal.status === 'delivered' ? 'bg-primary' : 'bg-surface-container-highest'}`} />
                <span className="font-bold text-on-surface block">Delivered to Doorstep</span>
                <span className="text-[11px] text-outline">
                  {activeOrderModal.status === 'delivered' ? 'Package handed over to recipient' : 'Pending dispatch and arrival'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Link
                href={`/orders/${activeOrderModal.orderNumber || activeOrderModal.id}/tracking`}
                className="flex-1 py-3 rounded-xl bg-primary text-white text-xs font-headline font-bold hover:bg-primary-container transition-all shadow-sm text-center flex items-center justify-center gap-1.5"
              >
                <Navigation className="h-4 w-4" />
                <span>Open Live Tracking Page</span>
              </Link>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-4 py-3 rounded-xl bg-surface-container text-on-surface text-xs font-headline font-semibold hover:bg-surface-container-high transition-all border border-surface-container"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 2: PRICE DETAILS BREAKDOWN (FLIPKART STYLE)              */}
      {/* ============================================================= */}
      {(modalType === 'price_details' || modalType === 'invoice') && activeOrderModal && (() => {
        const listingPrice = activeOrderModal.items.reduce(
          (sum, it) => sum + (it.originalPrice || it.price * 2) * (it.quantity || 1),
          0
        );
        const specialPrice = activeOrderModal.items.reduce(
          (sum, it) => sum + it.price * (it.quantity || 1),
          0
        );
        const couponDiscount = Number(activeOrderModal.discount || 0);
        const deliveryFee = Number(activeOrderModal.shippingFee || 0);
        const finalAmount = Number(activeOrderModal.totalAmount || 0);

        // Effective extra fees: totalAmount - (specialPrice - couponDiscount)
        const netProductCost = Math.max(0, specialPrice - couponDiscount);
        const calculatedExtraFees = Math.max(0, finalAmount - netProductCost);

        const isCOD =
          activeOrderModal.paymentMethod?.toLowerCase().includes('cod') ||
          activeOrderModal.paymentMethod?.toLowerCase().includes('cash');

        // Extract packaging fee & COD verification fee
        let codVerificationFee = 0;
        let packagingFee = 0;

        if (isCOD) {
          if (calculatedExtraFees >= 98) {
            packagingFee = 49;
            codVerificationFee = 49;
          } else if (calculatedExtraFees >= 49) {
            packagingFee = 49;
            codVerificationFee = Math.max(0, calculatedExtraFees - packagingFee - deliveryFee);
          } else {
            packagingFee = Math.max(0, calculatedExtraFees - deliveryFee);
          }
        } else {
          packagingFee = Math.max(0, calculatedExtraFees - deliveryFee);
        }

        const totalFees = deliveryFee + packagingFee + codVerificationFee;

        const paymentMode =
          activeOrderModal.paymentMethod?.toLowerCase().includes('cod') ||
          activeOrderModal.paymentMethod?.toLowerCase().includes('cash')
            ? 'Cash on Delivery (COD)'
            : 'Prepaid (UPI / Card / NetBanking)';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-sm sm:max-w-md w-full p-5 sm:p-6 shadow-2xl border border-stone-200 space-y-4 font-sans animate-in zoom-in-95">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-[#007185]" />
                  <h3 className="font-headline font-extrabold text-lg text-[#0F1111]">
                    Price details
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Price Breakdown Body */}
              <div className="space-y-3.5 text-xs text-[#0F1111]">
                {/* 1. Listing price */}
                <div className="flex items-center justify-between">
                  <span className="text-stone-600 font-medium">Listing price</span>
                  <span className="font-semibold text-stone-900 font-mono text-xs sm:text-sm">
                    {formatINR(listingPrice)}
                  </span>
                </div>

                {/* 2. Special price */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-stone-700 font-medium">
                    <span>Special price</span>
                    <Info className="h-3.5 w-3.5 text-stone-400" />
                  </div>
                  <span className="font-semibold text-stone-900 font-mono text-xs sm:text-sm">
                    {formatINR(specialPrice)}
                  </span>
                </div>

                {/* 3. Total fees (Expandable) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setFeesExpanded(!feesExpanded)}
                      className="flex items-center gap-1 text-stone-700 hover:text-[#007185] font-medium transition-colors"
                    >
                      <span>Total fees</span>
                      {feesExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5 text-stone-500" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-stone-500" />
                      )}
                    </button>
                    <span className="font-semibold text-stone-900 font-mono text-xs sm:text-sm">
                      {formatINR(totalFees)}
                    </span>
                  </div>

                  {/* Dropdown breakdown */}
                  {feesExpanded && (
                    <div className="pl-3 py-1 space-y-1.5 border-l-2 border-stone-200 text-[11px] text-stone-600 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span>Delivery Charges</span>
                        <span className="text-emerald-700 font-bold">
                          {deliveryFee > 0 ? formatINR(deliveryFee) : 'FREE'}
                        </span>
                      </div>
                      {packagingFee > 0 && (
                        <div className="flex items-center justify-between">
                          <span>Artisan Care &amp; Packaging</span>
                          <span className="font-mono">{formatINR(packagingFee)}</span>
                        </div>
                      )}
                      {codVerificationFee > 0 && (
                        <div className="flex items-center justify-between">
                          <span>Cash on Delivery Verification</span>
                          <span className="font-mono">{formatINR(codVerificationFee)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 4. Other discount (Expandable) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setDiscountExpanded(!discountExpanded)}
                      className="flex items-center gap-1 text-stone-700 hover:text-[#007185] font-medium transition-colors"
                    >
                      <span>Other discount</span>
                      {discountExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5 text-stone-500" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-stone-500" />
                      )}
                    </button>
                    <span className="font-bold text-emerald-700 font-mono text-xs sm:text-sm">
                      -{formatINR(couponDiscount)}
                    </span>
                  </div>

                  {/* Dropdown breakdown */}
                  {discountExpanded && (
                    <div className="pl-3 py-1 space-y-1.5 border-l-2 border-stone-200 text-[11px] text-stone-600 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span>Coupon / Promo Discount</span>
                        <span className="text-emerald-700 font-bold">-{formatINR(couponDiscount)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Card / SuperCoins Discount</span>
                        <span className="text-stone-400 font-bold">-₹0</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Dotted Divider Line */}
                <div className="border-t border-dashed border-stone-300 pt-3" />

                {/* 5. Total amount */}
                <div className="flex items-center justify-between">
                  <span className="font-headline font-extrabold text-sm sm:text-base text-[#0F1111]">
                    Total amount
                  </span>
                  <span className="font-headline font-extrabold text-base sm:text-lg text-[#0F1111] font-mono">
                    {formatINR(finalAmount)}
                  </span>
                </div>

                {/* 6. Paid By Card */}
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 flex items-center justify-between text-xs mt-3">
                  <span className="text-stone-500 font-medium">Paid By</span>
                  <span className="font-bold text-[#0F1111] flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-[#007185]" />
                    <span>{paymentMode}</span>
                  </span>
                </div>

                {/* 7. Download Invoice Button */}
                <div className="pt-2">
                  <a
                    href={`/orders/${encodeURIComponent((activeOrderModal.orderNumber || activeOrderModal.id || '').replace(/^#/, ''))}/invoice`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-stone-50 border border-stone-300 text-[#0F1111] text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 hover:border-[#007185] hover:text-[#007185]"
                  >
                    <FileText className="h-4 w-4 text-[#007185]" />
                    <span>Download Invoice</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ============================================================= */}
      {/* MODAL 3: CANCELLATION & REFUND DETAILS */}
      {/* ============================================================= */}
      {modalType === 'cancellation' && activeOrderModal && (() => {
        const modalRefundSummary = formatCustomerRefundSummary(activeOrderModal as any);
        const canonicalReturnId = activeOrderModal.items?.find((i) => i.returnRequest)?.returnRequest?.id;
        const cxlRefund = activeOrderModal.cancellationRefund || null;
        const isCodOrder = (activeOrderModal.paymentMethod || '').toUpperCase() === 'COD';
        // Who cancelled comes from the refund record; no free-text reason is stored for cancellations.
        const cancelledBy = !cxlRefund
          ? null
          : cxlRefund.initiatedBy === 'CUSTOMER'
          ? 'You'
          : cxlRefund.initiatedBy === 'VENDOR'
          ? 'The seller'
          : 'Vyntra';
        const reasonText = activeOrderModal.cancellationReason || null;
        const cxlRefundFailed = cxlRefund?.status === 'FAILED' || cxlRefund?.status === 'RECONCILIATION_REQUIRED';
        const cxlRefundState = !cxlRefund
          ? null
          : cxlRefund.status === 'CONFIRMED'
          ? `Refund completed${cxlRefund.processedAt ? ` on ${new Date(cxlRefund.processedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}`
          : cxlRefundFailed
          ? "Refund is delayed. We're retrying it, and you don't need to do anything."
          : `Refund initiated on ${new Date(cxlRefund.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}. It usually reaches your account in 5–7 business days.`;
        const refundRef = cxlRefund?.reference || null;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-2xl border border-surface-container space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-surface-container">
                <div>
                  <span className="text-[10px] font-headline font-bold uppercase tracking-widest text-rose-600">
                    Cancellation &amp; Refund Ledger
                  </span>
                  <h3 className="font-headline font-bold text-base text-on-surface">
                    Order {activeOrderModal.orderNumber}
                  </h3>
                  {canonicalReturnId && (
                    <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
                      Return Request ID: #{canonicalReturnId.slice(-8)}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="p-1 rounded-lg hover:bg-surface-container text-on-surface-variant"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 text-xs space-y-2.5">
                {(cancelledBy || reasonText) && (
                  <div className="flex justify-between items-center text-rose-950 pb-2 border-b border-rose-200/60">
                    <span className="font-semibold">{cancelledBy ? 'Cancelled by:' : 'Reason:'}</span>
                    <span className="text-rose-900 font-medium">{cancelledBy || reasonText}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-zinc-700">
                  <span>Order Total:</span>
                  <span className="font-semibold text-zinc-900">{formatINR(activeOrderModal.totalAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-zinc-700">
                  <span>Items Subtotal:</span>
                  <span className="font-semibold text-zinc-900">{formatINR(activeOrderModal.subtotal || activeOrderModal.totalAmount)}</span>
                </div>
                {activeOrderModal.shippingFee !== undefined && Number(activeOrderModal.shippingFee) > 0 && (
                  <div className="flex justify-between items-center text-zinc-700">
                    <span>Delivery / Shipping Fee:</span>
                    <span className="font-semibold text-zinc-900">{formatINR(activeOrderModal.shippingFee)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-rose-200/60">
                  <span className="font-bold text-rose-950">
                    {cxlRefund && cxlRefund.status !== 'CONFIRMED' ? 'Refund Amount:' : 'Amount Refunded to Date:'}
                  </span>
                  <span className="font-bold text-base text-rose-900">{modalRefundSummary.refundedAmountFormatted}</span>
                </div>
                <div className="flex justify-between items-center text-zinc-600 text-[11px]">
                  <span>Remaining Non-Refunded:</span>
                  <span className="font-medium text-zinc-800">{modalRefundSummary.remainingAmountFormatted}</span>
                </div>
                {isCodOrder && !modalRefundSummary.hasRefund ? (
                  <p className="pt-1 text-zinc-700">
                    This was a Cash on Delivery order, so no payment was collected and nothing needs to be refunded.
                  </p>
                ) : (
                  <>
                    <div className="flex justify-between items-center gap-3 text-zinc-700 pt-1">
                      <span className="font-semibold text-rose-950 shrink-0">Refund Destination:</span>
                      <span className="text-rose-900 font-medium text-right">{modalRefundSummary.refundDestinationLabel}</span>
                    </div>
                    <div className="flex justify-between items-center gap-3 text-zinc-700">
                      <span className="font-semibold text-rose-950 shrink-0">
                        {refundRef ? 'Refund Reference:' : 'Bank Reference / UTR:'}
                      </span>
                      <span className="font-mono text-rose-900 font-bold break-all text-right">
                        {refundRef || modalRefundSummary.verifiedReferenceNumber}
                      </span>
                    </div>
                  </>
                )}
                {cxlRefundState && (
                  <p
                    className={`pt-2 border-t border-rose-200/60 text-[11px] leading-relaxed ${
                      cxlRefundFailed ? 'text-amber-800' : 'text-zinc-700'
                    }`}
                  >
                    {cxlRefundState}
                    {refundRef && !cxlRefundFailed && cxlRefund?.status !== 'CONFIRMED' && (
                      <> If it hasn&apos;t arrived after that, share the refund reference with your bank.</>
                    )}
                  </p>
                )}
                {modalRefundSummary.hasRefund && !cxlRefund && (
                  <div className="mt-1 pt-1.5 border-t border-rose-200/60 text-[10px] text-zinc-500 font-mono">
                    Status: {modalRefundSummary.paymentStatusLabel} ({modalRefundSummary.isPartial ? 'Partial Refund' : 'Full Refund'})
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setModalType(null)}
                className="w-full py-3 rounded-xl bg-primary text-white text-xs font-headline font-bold hover:bg-primary-container transition-all shadow-sm"
              >
                Acknowledge
              </button>
            </div>
          </div>
        );
      })()}

      {/* ============================================================= */}
      {/* MODAL 4: WRITE A REVIEW */}
      {/* ============================================================= */}
      {modalType === 'review' && activeOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-surface-container space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div>
                <span className="text-[10px] font-headline font-bold uppercase tracking-widest text-primary">
                  Verified Purchase Feedback
                </span>
                <h3 className="font-headline font-bold text-base text-on-surface">
                  Review Your Purchase
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="p-1 rounded-lg hover:bg-surface-container text-on-surface-variant"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Item Details Banner */}
            {activeOrderModal.items && activeOrderModal.items.length > 0 && (
              <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container space-y-2">
                {activeOrderModal.items.length > 1 ? (
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface mb-1.5">
                      Select Item to Review:
                    </label>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {activeOrderModal.items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedReviewItem(item)}
                          className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors border ${
                            selectedReviewItem?.id === item.id
                              ? 'bg-primary/5 border-primary text-primary'
                              : 'bg-white border-surface-container text-on-surface hover:bg-surface-container-high'
                          }`}
                        >
                          <div className="w-10 h-12 rounded overflow-hidden relative shrink-0 bg-surface-container">
                            <Image src={item.image} alt={item.title} fill className="object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">{item.title}</p>
                            <p className="text-[10px] text-on-surface-variant">
                              Size: {item.size || 'Standard'} &bull; Qty: {item.quantity}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-14 rounded-lg overflow-hidden relative shrink-0 bg-surface-container border border-surface-container">
                      <Image
                        src={selectedReviewItem?.image || activeOrderModal.items[0].image}
                        alt={selectedReviewItem?.title || activeOrderModal.items[0].title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-on-surface truncate">
                        {selectedReviewItem?.title || activeOrderModal.items[0].title}
                      </p>
                      <p className="text-[11px] text-on-surface-variant">
                        Brand: {selectedReviewItem?.brand || activeOrderModal.items[0].brand} &bull; Delivered
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error Banner */}
            {reviewError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{reviewError}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Star Rating */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-2">
                  Rate Item Quality <span className="text-rose-600">*</span>
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`h-6 w-6 ${
                          star <= reviewRating
                            ? 'text-secondary fill-secondary'
                            : 'text-outline-variant'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-on-surface ml-2">
                    {reviewRating} / 5 Stars
                  </span>
                </div>
              </div>

              {/* Review Title */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Headline / Title <span className="text-on-surface-variant font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  placeholder="e.g. Exceptional handloom quality and flawless fit"
                  className="w-full bg-surface-container-low rounded-xl px-3 py-2 text-xs text-on-surface border border-surface-container focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Review Comment */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-on-surface">
                    Written Feedback <span className="text-rose-600">*</span>
                  </label>
                  <span className="text-[10px] text-on-surface-variant">
                    {reviewComment.trim().length} / 1000 (min 10)
                  </span>
                </div>
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share details on fabric weave, fitting, and doorstep packaging..."
                  className="w-full bg-surface-container-low rounded-xl p-3 text-xs text-on-surface border border-surface-container focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmittingReview || reviewComment.trim().length < 10}
                onClick={handleSubmitReview}
                className="w-full py-2.5 rounded-xl bg-primary text-white text-xs font-headline font-bold hover:bg-primary-container disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2"
              >
                {isSubmittingReview ? (
                  <span>Submitting Review...</span>
                ) : (
                  <span>Submit Review</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 12: Customer Return & Replacement Request Modal */}
      {returnItemModal && (
        <ReturnRequestModal
          order={returnItemModal.order}
          item={returnItemModal.item}
          isOpen={true}
          onClose={() => setReturnItemModal(null)}
          onSuccess={(requestId, type) => {
            showToast(
              `${type === 'REPLACEMENT' ? 'Replacement' : 'Return'} request #${requestId.slice(-6)} submitted successfully!`,
              'success'
            );
            fetchOrders({ page: currentPage, status: selectedStatus, search: searchQuery });
          }}
        />
      )}

      {/* Dispute Filing Modal */}
      {disputeModal && (
        <CustomerDisputeModal
          isOpen={true}
          order={disputeModal.order}
          item={disputeModal.item}
          returnRequest={disputeModal.returnRequest}
          onClose={() => setDisputeModal(null)}
          onSuccess={() => {
            showToast(
              'Dispute submitted. Our team will review it and reply in your account.',
              'success'
            );
            fetchOrders({ page: currentPage, status: selectedStatus, search: searchQuery });
          }}
        />
      )}

      {/* Floating Notification Toast */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 transform transition-all duration-300 bg-on-surface text-white px-4 py-3 rounded-xl shadow-2xl text-xs z-50 flex items-center gap-2.5 max-w-sm border border-white/10 animate-in fade-in slide-in-from-bottom-2">
          {toast.type === 'success' && <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />}
          {toast.type === 'info' && <Truck className="h-4 w-4 text-secondary-container shrink-0" />}
          <span className="flex-1 font-medium leading-relaxed">{toast.message}</span>
          <button
            onClick={() => setToast((prev) => ({ ...prev, show: false }))}
            className="text-white/70 hover:text-white ml-1 p-0.5 rounded transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
