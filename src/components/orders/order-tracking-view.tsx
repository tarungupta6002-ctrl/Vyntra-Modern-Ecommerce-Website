'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Truck,
  Plane,
  Package,
  CheckCircle,
  Clock,
  MapPin,
  Phone,
  Shield,
  ShieldCheck,
  Copy,
  Check,
  FileText,
  Headphones,
  Edit3,
  Calendar,
  MessageSquare,
  AlertCircle,
  X,
  ChevronRight,
  User,
  Heart,
  CreditCard,
  Bell,
  LogOut,
  Sparkles,
  Search,
  ArrowLeft,
  RotateCcw,
  Star,
  ExternalLink,
} from 'lucide-react';
import { Order } from '@/data/orders-data';
import { ReturnRequestModal } from '@/components/orders/return-request-modal';
import { useUserProfileStore } from '@/store/user-profile-store';
import { useOrderStore } from '@/store/order-store';
import { formatINR } from '@/lib/utils';
import { getCourierTrackingUrl } from '@/lib/courier-tracking';

interface OrderTrackingViewProps {
  orderId?: string;
  embeddedInAccount?: boolean;
}

export function OrderTrackingView({
  orderId = '',
  embeddedInAccount = false,
}: OrderTrackingViewProps) {
  const router = useRouter();
  const profileStore = useUserProfileStore();
  const { orders: userOrdersList, totalCount: userOrdersCount, fetchOrders } = useOrderStore();

  const [activeOrderId, setActiveOrderId] = useState(orderId);
  const [remoteOrder, setRemoteOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(Boolean(orderId));
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Search order state (if user wants to track another order)
  const [searchTrk, setSearchTrk] = useState('');
  const [selectedShipmentIdx, setSelectedShipmentIdx] = useState(0);

  // Modals
  const [copiedAwb, setCopiedAwb] = useState(false);
  const [instructionModalOpen, setInstructionModalOpen] = useState(false);
  const [selectedInstruction, setSelectedInstruction] = useState('Hand over directly to recipient');
  const [customInstruction, setCustomInstruction] = useState('');
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('Tomorrow, 10 AM - 2 PM');
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [verifyCertModalOpen, setVerifyCertModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [selectedReturnItem, setSelectedReturnItem] = useState<any>(null);

  // Toast feedback
  const [toast, setToast] = useState<{ show: boolean; message: string; type?: 'info' | 'success' }>({
    show: false,
    message: '',
  });

  const showToast = (message: string, type: 'info' | 'success' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3500);
  };

  useEffect(() => {
    fetchOrders({ page: 1 }).catch(() => {});
  }, [fetchOrders]);

  useEffect(() => {
    setActiveOrderId(orderId || '');
    if (!orderId) {
      setRemoteOrder(null);
      setFetchError(null);
    }
  }, [orderId]);

  useEffect(() => {
    if (!activeOrderId) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    async function fetchTracking() {
      setIsLoading(true);
      setFetchError(null);
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(activeOrderId)}`);
        const json = await res.json();
        if (!isMounted) return;

        if (json.success && json.data) {
          setRemoteOrder(json.data);
        } else {
          setFetchError(
            json.error?.message ||
              `Order #${activeOrderId} was not found or you are not authorized to view this consignment.`
          );
        }
      } catch (e: any) {
        if (!isMounted) return;
        setFetchError('Unable to load order tracking details. Please try again.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchTracking();
    return () => {
      isMounted = false;
    };
  }, [activeOrderId]);

  // Construct normalized order representation
  const order: Order | null = remoteOrder
    ? {
        id: remoteOrder.id,
        orderNumber: remoteOrder.orderNumber,
        datePlaced: new Date(remoteOrder.createdAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        placedTime: new Date(remoteOrder.createdAt).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        totalAmount: Number(remoteOrder.totalAmount),
        totalItems:
          remoteOrder.items?.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0) || 1,
        status:
          remoteOrder.status?.toLowerCase() === 'out_for_delivery'
            ? 'out_for_delivery'
            : remoteOrder.status?.toLowerCase() === 'shipped'
            ? 'shipped'
            : remoteOrder.status?.toLowerCase() === 'delivered'
            ? 'delivered'
            : remoteOrder.status?.toLowerCase() === 'cancelled'
            ? 'cancelled'
            : 'processing',
        statusLabel:
          remoteOrder.status === 'CONFIRMED'
            ? 'Order Confirmed — Handcrafted Assembly'
            : remoteOrder.status === 'PROCESSING'
            ? 'Artisan Crafting & Quality Check'
            : remoteOrder.status === 'SHIPPED'
            ? (remoteOrder.courierPartner ? `In Transit with ${remoteOrder.courierPartner}` : 'In Transit via Courier')
            : remoteOrder.status === 'OUT_FOR_DELIVERY'
            ? 'Out for Delivery'
            : remoteOrder.status === 'DELIVERED'
            ? 'Delivered to Doorstep'
            : remoteOrder.status === 'CANCELLED'
            ? 'Order Cancelled'
            : remoteOrder.status,
        rawStatus: remoteOrder.status,
        paymentMethod: remoteOrder.paymentMethod,
        paymentStatus: remoteOrder.paymentStatus,
        trackingNumber: remoteOrder.trackingNumber || undefined,
        courierPartner: remoteOrder.courierPartner || undefined,
        courierName: remoteOrder.courierPartner || undefined,
        awb: remoteOrder.trackingNumber || undefined,
        subtotal: Number(remoteOrder.subtotal || 0),
        items:
          remoteOrder.items?.map((it: any) => ({
            id: it.id,
            productId: it.productId,
            title: it.title,
            brand: it.brand,
            categoryTag: 'Authentic Handcraft',
            size: it.size || it.selectedSize || 'N/A',
            color: it.color || it.selectedColor || 'N/A',
            quantity: it.quantity,
            price: Number(it.price ?? it.unitPrice ?? 0),
            originalPrice: Number(it.originalPrice || it.price || 0),
            discount: it.discount || '',
            image: it.image,
            sellerName: it.sellerName || it.vendorName || 'Vyntra Royal Atelier',
            shippingMethod: remoteOrder.courierPartner || 'Courier not assigned yet',
          })) || [],
        shippingAddress: remoteOrder.shippingAddress
          ? {
              name: remoteOrder.shippingAddress.fullName,
              phone: remoteOrder.shippingAddress.phone,
              line1: remoteOrder.shippingAddress.streetAddress,
              line2: remoteOrder.shippingAddress.locality || '',
              cityStateZip: `${remoteOrder.shippingAddress.city}, ${remoteOrder.shippingAddress.state} ${remoteOrder.shippingAddress.postalCode}`,
            }
          : undefined,
      }
    : null;

  const activeShipment = remoteOrder?.vendorShipments?.[selectedShipmentIdx] || null;
  const displayCourier = activeShipment?.courierPartner || order?.courierPartner || order?.courierName || 'To be assigned upon dispatch';
  const displayAwb = activeShipment?.trackingNumber || order?.awb || order?.trackingNumber || '';
  const hasDisplayTracking = Boolean(displayAwb);
  const hasTracking = Boolean(order?.trackingNumber || order?.awb || displayAwb);
  const isRealOrder = Boolean(remoteOrder);

  // User details for sidebar
  const customerName = profileStore.fullName && profileStore.fullName !== 'Patron' ? profileStore.fullName : 'Customer';
  const customerEmail = profileStore.email && !profileStore.email.includes('patron@vyntra') ? profileStore.email : 'customer@vyntra.luxury';

  const userInitials = customerName
    ? customerName
        .split(' ')
        .filter(Boolean)
        .map((n: string) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'TG';

  const handleCopyAwb = () => {
    const code = displayAwb || order?.awb || order?.trackingNumber;
    if (!code) {
      showToast('Tracking ID has not been assigned yet.', 'info');
      return;
    }
    navigator.clipboard.writeText(code);
    setCopiedAwb(true);
    showToast(`AWB Tracking Number copied: ${code}`, 'success');
    setTimeout(() => setCopiedAwb(false), 2000);
  };

  const handleSaveInstructions = () => {
    const text = customInstruction.trim() || selectedInstruction;
    showToast(`Instruction saved: "${text}" will be relayed to courier partner.`, 'success');
    setInstructionModalOpen(false);
  };

  const handleConfirmReschedule = () => {
    showToast(`Delivery window preference saved for ${selectedSlot}.`, 'success');
    setRescheduleModalOpen(false);
  };

  const handleSelectOrSearchOrder = (idToTrack: string) => {
    const cleanId = idToTrack.trim().replace(/^#/, '');
    if (!cleanId) return;
    setActiveOrderId(cleanId);
    setSearchTrk('');
    if (embeddedInAccount) {
      router.replace(`/account?tab=tracking&orderId=${encodeURIComponent(cleanId)}`, { scroll: false });
    } else {
      router.replace(`/orders/${encodeURIComponent(cleanId)}/tracking`, { scroll: false });
    }
  };

  const handleSearchOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTrk.trim()) return;
    handleSelectOrSearchOrder(searchTrk);
  };

  const renderSearchAndOrderSwitcher = () => (
    <div className="bg-white rounded-2xl border border-[#D5D9D9] p-4 sm:p-5 shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-[#0F1111] flex items-center gap-2">
            <Truck className="h-4 w-4 text-[#007185]" />
            <span>Track Consignment by Order ID</span>
          </h3>
          <p className="text-xs text-[#565959] mt-0.5">
            Enter any Vyntra Order Number or select from your recent purchases below
          </p>
        </div>

        <form onSubmit={handleSearchOrder} className="flex items-center gap-2 max-w-md w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#565959]" />
            <input
              type="text"
              value={searchTrk}
              onChange={(e) => setSearchTrk(e.target.value)}
              placeholder="e.g. VYN-ORD-659414-MOBW"
              className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-[#D5D9D9] focus:outline-none focus:ring-2 focus:ring-[#FF9900]/30 focus:border-[#FF9900] text-[#0F1111]"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] text-xs font-bold rounded-lg transition-colors shadow-sm shrink-0 border border-[#FCD200]"
          >
            Track Order
          </button>
        </form>
      </div>

      {/* Quick Orders Chips */}
      {userOrdersList.length > 0 && (
        <div className="pt-2.5 border-t border-[#EAEDED] flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-[#565959] shrink-0">Your Orders:</span>
          {userOrdersList.map((ord: any) => {
            const ordId = ord.orderNumber || ord.id;
            const isCurrent =
              order?.orderNumber === ordId ||
              order?.id === ordId ||
              activeOrderId === ordId;
            return (
              <button
                key={ord.id}
                type="button"
                onClick={() => handleSelectOrSearchOrder(ordId)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold transition-all flex items-center gap-1.5 border ${
                  isCurrent
                    ? 'bg-[#131921] text-[#FFD814] border-[#131921] shadow-xs'
                    : 'bg-[#F7F8F8] text-[#0F1111] border-[#D5D9D9] hover:bg-white hover:border-[#007185]'
                }`}
              >
                <span>#{ordId}</span>
                {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-[#FF9900] animate-pulse" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  // 1. Loading State
  if (isLoading) {
    return (
      <div className={embeddedInAccount ? "w-full text-[#0F1111] antialiased" : "w-full bg-[#faf8ff] min-h-screen text-[#0F1111] antialiased py-6 sm:py-8"}>
        <div className={embeddedInAccount ? "w-full" : "max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8"}>
          <div className="flex flex-col gap-6 animate-pulse">
            <div className="h-6 bg-[#EAEDED] rounded w-1/4" />
            <div className="h-48 bg-white rounded-2xl border border-[#D5D9D9] p-6 shadow-sm" />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 h-96 bg-white rounded-2xl border border-[#D5D9D9]" />
              <div className="lg:col-span-5 h-96 bg-white rounded-2xl border border-[#D5D9D9]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Empty Order ID State (e.g. user visited /tracking directly without orderId)
  if (!activeOrderId && !order) {
    return (
      <div className={embeddedInAccount ? "w-full space-y-6" : "w-full bg-[#faf8ff] min-h-[70vh] py-8 px-4 flex flex-col items-center justify-center space-y-6"}>
        <div className="w-full max-w-4xl">
          {renderSearchAndOrderSwitcher()}
        </div>
        <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-sm border border-[#D5D9D9] text-center space-y-4 mx-auto">
          <div className="w-14 h-14 rounded-full bg-[#e2e7ff] text-[#007185] flex items-center justify-center mx-auto">
            <Truck className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-headline font-bold text-[#0F1111]">
            Track Your Consignment
          </h1>
          <p className="text-xs text-[#565959] leading-relaxed">
            Please enter your Vyntra Order Number above or select one of your recent purchases to view live preparation and delivery updates.
          </p>
          <div className="pt-2 border-t border-[#D5D9D9]">
            <Link
              href="/account?tab=orders"
              className="text-xs text-[#007185] font-bold hover:underline"
            >
              View My Orders →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Error / Not Found State
  if (fetchError || !order) {
    return (
      <div className={embeddedInAccount ? "w-full space-y-6" : "w-full bg-[#faf8ff] min-h-[70vh] py-8 px-4 flex flex-col items-center justify-center space-y-6"}>
        <div className="w-full max-w-4xl">
          {renderSearchAndOrderSwitcher()}
        </div>
        <div className="max-w-lg w-full bg-white rounded-2xl p-8 sm:p-10 shadow-sm border border-[#D5D9D9] text-center space-y-4 mx-auto">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-headline font-bold text-[#0F1111]">
            Order Not Found
          </h2>
          <p className="text-xs text-[#565959] leading-relaxed">
            {fetchError || `We could not find active tracking details for order #${activeOrderId}. If you just placed this order, please check back in a few moments.`}
          </p>
          <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/account?tab=orders"
              className="px-5 py-2.5 rounded-lg bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] text-xs font-bold shadow-sm transition-all"
            >
              Return to My Orders
            </Link>
            <Link
              href="/"
              className="px-5 py-2.5 rounded-lg bg-surface-container text-on-surface text-xs font-bold transition-all hover:bg-surface-container-high"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 4. Milestone Checkpoints Generator based on actual persisted status
  const checkpoints =
    !isRealOrder && order.checkpoints && order.checkpoints.length > 0
      ? order.checkpoints
      : [
          {
            id: 1,
            title: 'Order Confirmed',
            timestamp: order.datePlaced,
            location: 'Vyntra Order Verification Desk',
            description: 'Order confirmed and registered with the fulfillment artisan atelier.',
            status: 'completed' as const,
          },
          {
            id: 2,
            title: 'Artisan Crafting & Packaging',
            timestamp: order.status === 'processing' ? 'In Progress' : order.datePlaced,
            location: order.items[0]?.sellerName || 'Artisan Atelier',
            description: 'Handcrafted items inspected for quality certification and prepared in tamper-evident sealing.',
            status: (order.status === 'processing' ? 'current' : ['shipped', 'out_for_delivery', 'delivered'].includes(order.status) || order.rawStatus === 'OUT_FOR_DELIVERY' ? 'completed' : 'upcoming') as any,
          },
          {
            id: 3,
            title: 'Dispatched to Courier Partner',
            timestamp: hasTracking ? `AWB: ${order.trackingNumber || order.awb}` : 'Pending Dispatch',
            location: order.courierPartner || 'Logistics Partner',
            description: order.courierPartner
              ? `Consignment handed over to ${order.courierPartner}.`
              : 'Courier and tracking ID will appear once your order is dispatched.',
            status: (order.status === 'shipped' && order.rawStatus !== 'OUT_FOR_DELIVERY' ? 'current' : order.status === 'delivered' || order.status === 'out_for_delivery' || order.rawStatus === 'OUT_FOR_DELIVERY' ? 'completed' : 'upcoming') as any,
            badge: order.courierPartner || undefined,
          },
          {
            id: 4,
            title: 'Out for Delivery',
            timestamp: order.status === 'out_for_delivery' || order.rawStatus === 'OUT_FOR_DELIVERY' ? 'Today' : 'Upcoming',
            location: order.shippingAddress?.cityStateZip?.split(',')[0] || 'Local Logistics Hub',
            description: 'Local delivery partner departs from regional logistics hub for doorstep handover.',
            status: (order.status === 'out_for_delivery' || order.rawStatus === 'OUT_FOR_DELIVERY' ? 'current' : order.status === 'delivered' ? 'completed' : 'upcoming') as any,
          },
          {
            id: 5,
            title: 'Delivered to Doorstep',
            timestamp: order.deliveredDate || (order.status === 'delivered' ? 'Delivered' : 'Pending'),
            location: order.shippingAddress?.name || 'Customer Address',
            description: 'Package successfully delivered and received with authentication.',
            status: (order.status === 'delivered' ? 'completed' : 'upcoming') as any,
          },
        ];

  return (
    <div className={embeddedInAccount ? "w-full text-[#0F1111] antialiased flex flex-col gap-6" : "w-full bg-[#faf8ff] min-h-screen text-[#0F1111] antialiased py-6 sm:py-8"}>
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F1111] text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Sparkles className="h-4 w-4 text-[#FF9900]" />
          <span>{toast.message}</span>
          <button
            onClick={() => setToast({ show: false, message: '' })}
            className="text-white/60 hover:text-white ml-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className={embeddedInAccount ? "w-full" : "max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8"}>
        {/* Breadcrumb & Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-2 border-b border-[#D5D9D9]">
          <div className="flex items-center gap-2 text-xs font-medium text-[#565959]">
            {embeddedInAccount ? (
              <>
                <span>Account Central</span>
                <ChevronRight className="h-3.5 w-3.5 text-[#c4c5d5]" />
                <span className="text-[#007185] font-bold">Track {order.orderNumber}</span>
              </>
            ) : (
              <>
                <Link href="/" className="hover:text-[#007185] transition-colors">
                  Home
                </Link>
                <ChevronRight className="h-3.5 w-3.5 text-[#c4c5d5]" />
                <Link href="/account" className="hover:text-[#007185] transition-colors">
                  My Account
                </Link>
                <ChevronRight className="h-3.5 w-3.5 text-[#c4c5d5]" />
                <Link href="/account?tab=orders" className="hover:text-[#007185] transition-colors">
                  My Orders
                </Link>
                <ChevronRight className="h-3.5 w-3.5 text-[#c4c5d5]" />
                <span className="text-[#007185] font-bold">Track {order.orderNumber}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setInvoiceModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#F7F8F8] hover:bg-[#D5D9D9] text-[#007185] text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              <FileText className="h-4 w-4" />
              <span>Invoice</span>
            </button>
            <button
              type="button"
              onClick={() => setSupportModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#007185] text-white hover:bg-[#004B57] text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              <Headphones className="h-4 w-4" />
              <span>Shipment Support</span>
            </button>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className={embeddedInAccount ? "w-full" : "grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"}>
          {/* ========================================================= */}
          {/* LEFT SIDEBAR: Account Navigation */}
          {/* ========================================================= */}
          {!embeddedInAccount && (
            <aside className="lg:col-span-3 lg:sticky lg:top-36 bg-white rounded-2xl shadow-sm border border-[#D5D9D9] p-5 flex flex-col justify-between gap-6">
              <div className="flex flex-col gap-6">
                {/* User Mini Profile Header */}
                <div className="flex items-center gap-3.5 pb-5 border-b border-[#D5D9D9]">
                  <div className="w-12 h-12 rounded-full bg-[#131921] text-white flex items-center justify-center font-headline font-bold text-base shadow-sm shrink-0">
                    {userInitials}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-[#0F1111] truncate leading-snug">
                      {customerName}
                    </span>
                    <span className="text-xs text-[#565959] truncate">
                      {customerEmail}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#B12704] mt-0.5">
                      <Sparkles className="h-3 w-3 text-[#FF9900]" />
                      {profileStore.tier || 'Royal Member'}
                    </span>
                  </div>
                </div>

                {/* Group 1: Account Central */}
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#565959] block mb-2 px-2">
                    Account Central
                  </span>
                  <nav className="flex flex-col gap-1">
                    <Link
                      href="/account"
                      className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#444653] hover:bg-[#F7F8F8] hover:text-[#0F1111] transition-all"
                    >
                      <User className="h-4 w-4 shrink-0" />
                      <span>Dashboard Overview</span>
                    </Link>

                    <Link
                      href="/account?tab=profile"
                      className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#444653] hover:bg-[#F7F8F8] hover:text-[#0F1111] transition-all"
                    >
                      <Shield className="h-4 w-4 shrink-0" />
                      <span>Profile &amp; Security</span>
                    </Link>

                    <Link
                      href="/account?tab=orders"
                      className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#444653] hover:bg-[#F7F8F8] hover:text-[#0F1111] transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Package className="h-4 w-4 shrink-0" />
                        <span>My Orders</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EAEDED] text-[#0F1111]">
                        {userOrdersCount > 0 ? userOrdersCount : userOrdersList.length}
                      </span>
                    </Link>

                    <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold bg-[#131921] text-white shadow-sm">
                      <div className="flex items-center gap-3">
                        <Truck className="h-4 w-4 shrink-0" />
                        <span>Order Tracking</span>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-[#FF9900] animate-pulse" />
                    </div>

                    <Link
                      href="/account?tab=wishlist"
                      className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#444653] hover:bg-[#F7F8F8] hover:text-[#0F1111] transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Heart className="h-4 w-4 shrink-0" />
                        <span>Wishlist</span>
                      </div>
                    </Link>
                  </nav>
                </div>

                {/* Group 2: Preferences & Records */}
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#565959] block mb-2 px-2">
                    Preferences &amp; Records
                  </span>
                  <nav className="flex flex-col gap-1">
                    <Link
                      href="/account?tab=addresses"
                      className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#444653] hover:bg-[#F7F8F8] hover:text-[#0F1111] transition-all"
                    >
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span>Saved Addresses</span>
                    </Link>

                    <Link
                      href="/account?tab=payments"
                      className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#444653] hover:bg-[#F7F8F8] hover:text-[#0F1111] transition-all"
                    >
                      <CreditCard className="h-4 w-4 shrink-0" />
                      <span>Payments</span>
                    </Link>

                    <Link
                      href="/account?tab=support"
                      className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#444653] hover:bg-[#F7F8F8] hover:text-[#0F1111] transition-all text-left w-full"
                    >
                      <Headphones className="h-4 w-4 shrink-0" />
                      <span>Help &amp; Support</span>
                    </Link>
                  </nav>
                </div>
              </div>

              {/* Logout Action */}
              <div className="pt-4 border-t border-[#D5D9D9]">
                <Link
                  href="/login?redirect=/orders"
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-all"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span>Logout</span>
                </Link>
              </div>
            </aside>
          )}

          {/* ========================================================= */}
          {/* MAIN COLUMN: Order Tracking Dashboard */}
          {/* ========================================================= */}
          <main className={embeddedInAccount ? "w-full flex flex-col gap-6" : "lg:col-span-9 flex flex-col gap-6"}>
            {/* Search & Quick Order Switcher Bar */}
            {renderSearchAndOrderSwitcher()}

            {/* Header: Title + Status Pill + Metadata */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl lg:text-3xl font-headline font-extrabold text-[#0F1111] tracking-tight">
                    Order {order.orderNumber}
                  </h1>
                  {order.status === 'out_for_delivery' || order.rawStatus === 'OUT_FOR_DELIVERY' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-label font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                      {order.statusLabel}
                    </span>
                  ) : order.status === 'shipped' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-label font-bold bg-[#FFE4B5] text-[#0F1111] shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-[#FF9900] animate-pulse" />
                      {order.statusLabel}
                    </span>
                  ) : order.status === 'delivered' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-label font-bold bg-emerald-100 text-emerald-800 shadow-sm">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                      {order.statusLabel}
                    </span>
                  ) : order.status === 'cancelled' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-label font-bold bg-rose-100 text-rose-800 shadow-sm">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {order.statusLabel}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-label font-bold bg-neutral-200 text-neutral-800 shadow-sm">
                      <AlertCircle className="h-3.5 w-3.5 text-[#007185]" />
                      {order.statusLabel}
                    </span>
                  )}
                </div>

                <p className="text-xs text-[#444653] font-body flex flex-wrap items-center gap-2">
                  <span>Placed on {order.datePlaced}</span>
                  {order.placedTime && (
                    <>
                      <span className="opacity-40">•</span>
                      <span>{order.placedTime}</span>
                    </>
                  )}
                  <span className="opacity-40">•</span>
                  <span>
                    Courier:{' '}
                    <strong className="text-[#0F1111]">
                      {order.courierPartner || order.courierName || 'To be assigned upon dispatch'}
                    </strong>
                  </span>
                  <span className="opacity-40">•</span>
                  <span className="text-[#904d00] font-semibold">Guaranteed Artisanal Quality</span>
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-[#e2e7ff] text-[#007185] font-label font-medium">
                  Standard 7-Day Inspection Guarantee
                </span>
              </div>
            </div>

            {/* ========================================================= */}
            {/* MULTI-VENDOR CONSIGNMENT PACKAGES SELECTOR                */}
            {/* ========================================================= */}
            {remoteOrder?.vendorShipments && remoteOrder.vendorShipments.length > 1 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#D5D9D9] space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#EAEDED]">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-[#007185]" />
                    <h3 className="text-xs font-bold text-[#0F1111]">
                      Consignment Packages ({remoteOrder.vendorShipments.length})
                    </h3>
                  </div>
                  <span className="text-[11px] text-[#565959]">
                    Select a package to view independent courier partner &amp; live AWB
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {remoteOrder.vendorShipments.map((shp: any, idx: number) => {
                    const isSelected = idx === selectedShipmentIdx;
                    return (
                      <button
                        key={shp.id || idx}
                        type="button"
                        onClick={() => setSelectedShipmentIdx(idx)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-[#007185]/10 border-[#007185] ring-2 ring-[#007185]/20 shadow-xs'
                            : 'bg-[#F7F8F8] border-[#D5D9D9] hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 text-[11px] font-bold">
                          <span className="text-[#0F1111]">Package {idx + 1}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
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
                        <p className="text-xs font-bold text-[#007185] truncate mt-1">
                          {shp.vendor?.storeName || 'Artisan Atelier'}
                        </p>
                        <p className="text-[10px] text-[#565959] mt-0.5 font-mono">
                          {shp.trackingNumber ? `AWB: ${shp.trackingNumber}` : 'Pending Dispatch'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* HERO SHIPMENT CARD */}
            {/* ========================================================= */}
            <div className="relative overflow-hidden rounded-2xl bg-white shadow-md p-6 lg:p-8 border border-[#D5D9D9]">
              <div className="absolute -right-16 -top-16 w-64 h-64 bg-[#FF9900]/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-[#007185]/5 rounded-full blur-3xl pointer-events-none" />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
                {/* Left 8 Columns */}
                <div className="lg:col-span-8 flex flex-col justify-between gap-8">
                  <div className="flex flex-col gap-4">
                    {/* Carrier & AWB header */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[#004B57] text-white flex items-center justify-center shadow-inner">
                          <Plane className="h-6 w-6" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-label uppercase tracking-widest text-[#565959]">
                            {activeShipment
                              ? `Package ${selectedShipmentIdx + 1} Carrier (${activeShipment.vendor?.storeName || 'Vendor'})`
                              : 'Express Logistics Carrier'}
                          </span>
                          <span className="text-base font-headline font-bold text-[#0F1111]">
                            {displayCourier}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 bg-[#F7F8F8] px-3.5 py-1.5 rounded-lg shadow-sm border border-[#D5D9D9]">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-label tracking-wider text-[#565959]">
                            Tracking ID (AWB)
                          </span>
                          <span className="text-xs font-mono font-bold text-[#007185] select-all">
                            {displayAwb || 'Tracking details not available yet'}
                          </span>
                        </div>
                        {hasDisplayTracking && (
                          <>
                            <button
                              type="button"
                              onClick={handleCopyAwb}
                              className="p-1.5 hover:bg-[#D5D9D9] rounded-md text-[#444653] hover:text-[#007185] transition-all ml-1"
                              title="Copy Tracking ID"
                            >
                              {copiedAwb ? (
                                <Check className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                            {getCourierTrackingUrl(order.courierPartner, order.awb || order.trackingNumber) && (
                              <a
                                href={getCourierTrackingUrl(order.courierPartner, order.awb || order.trackingNumber)!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#007185] hover:bg-[#005A6A] text-white text-[11px] font-bold shadow-xs transition-colors ml-1"
                              >
                                <span>Track Carrier</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* ETA Banner */}
                    <div className="p-5 rounded-xl bg-gradient-to-r from-[#F7F8F8] to-[#D5D9D9] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm border border-[#e2e7ff]">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-xs font-label font-bold text-[#904d00]">
                          <Clock className="h-4 w-4" />
                          <span>
                            {order.status === 'delivered'
                              ? 'DELIVERED AT DOORSTEP'
                              : order.status === 'cancelled'
                              ? 'CONSIGNMENT STATUS'
                              : hasTracking
                              ? 'ESTIMATED TIME OF DELIVERY'
                              : 'ESTIMATED DELIVERY'}
                          </span>
                        </div>
                        <div className="text-xl sm:text-2xl font-headline font-extrabold text-[#0F1111]">
                          {order.status === 'delivered' ? (
                            order.deliveredDate || `Delivered on ${order.datePlaced}`
                          ) : order.status === 'cancelled' ? (
                            'Order Cancelled'
                          ) : hasTracking && order.expectedDate ? (
                            order.expectedDate
                          ) : (
                            <span className="text-base sm:text-lg text-[#0F1111] font-bold">
                              Tracking details not available yet
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-[#444653]">
                          {order.status === 'delivered'
                            ? 'Parcel safely received at registered address'
                            : order.status === 'cancelled'
                            ? 'This consignment has been cancelled and will not be dispatched.'
                            : hasTracking
                            ? `Arriving via ${order.courierPartner || 'express air logistics'} • Real-time courier dispatch`
                            : 'Courier and tracking ID will appear once your order is dispatched.'}
                        </span>
                      </div>
                      <div className="flex flex-col items-start sm:items-end gap-1">
                        <span className="px-2.5 py-1 rounded bg-[#FFE4B5] text-[#0F1111] font-label text-[11px] font-bold tracking-wide">
                          {hasTracking ? (order.courierTier || 'AIR PRIORITY TIER') : 'PREPARATION TIER'}
                        </span>
                        <span className="text-[11px] text-[#565959]">
                          100% Carbon Neutral Transit
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Courier Partner & Delivery Authentication Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Delivery Partner */}
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-[#F7F8F8] shadow-sm border border-[#D5D9D9]">
                      {order.deliveryAgent ? (
                        <>
                          <div className="relative">
                            <div className="w-12 h-12 rounded-full bg-[#e2e7ff] text-[#007185] flex items-center justify-center font-bold text-sm">
                              {order.deliveryAgent.initials}
                            </div>
                            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#FF9900] flex items-center justify-center text-[8px] text-white shadow-sm">
                              <Check className="h-2.5 w-2.5 stroke-[3]" />
                            </span>
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-headline font-bold text-[#0F1111] truncate">
                                {order.deliveryAgent.name}
                              </span>
                              <span title="Verified Delivery Agent">
                                <ShieldCheck className="h-4 w-4 text-[#FF9900] shrink-0" />
                              </span>
                            </div>
                            <span className="text-xs text-[#444653]">Verified Courier Partner</span>
                            <div className="flex items-center gap-1 text-[11px] text-[#904d00] font-semibold mt-0.5">
                              <Star className="h-3 w-3 fill-[#FF9900] text-[#FF9900]" />
                              <span>{order.deliveryAgent.rating || 4.9} ({order.deliveryAgent.deliveriesCount || '500+ Deliveries'})</span>
                            </div>
                          </div>
                          {order.deliveryAgent.phone && (
                            <button
                              type="button"
                              onClick={() => showToast(`Connecting to ${order.deliveryAgent?.name}...`, 'info')}
                              className="flex items-center justify-center w-10 h-10 rounded-full bg-white text-[#007185] hover:bg-[#007185] hover:text-white shadow-sm transition-all border border-[#D5D9D9]"
                              title="Call courier partner"
                            >
                              <Phone className="h-4 w-4" />
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-3.5 py-1">
                          <div className="w-11 h-11 rounded-full bg-[#EAEDED] text-[#565959] flex items-center justify-center shrink-0">
                            <Truck className="h-5 w-5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-headline font-bold text-[#0F1111]">
                              Courier Partner Assignment
                            </span>
                            <span className="text-[11px] text-[#565959] leading-relaxed">
                              {order.status === 'out_for_delivery' || order.rawStatus === 'OUT_FOR_DELIVERY'
                                ? `Out for delivery via ${order.courierPartner || 'Delhivery'}. Local delivery agent has departed for doorstep delivery.`
                                : order.status === 'shipped'
                                ? `Consignment handed over to ${order.courierPartner || 'courier'}. Local agent assigned at destination hub.`
                                : 'Delivery executive will be assigned once your parcel reaches the destination hub.'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Delivery Authentication OTP */}
                    <div className="flex flex-col justify-center p-4 rounded-xl bg-[#e2e7ff]/60 shadow-sm border border-[#c4c5d5]/50 relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-label uppercase font-bold text-[#007185]">
                          Delivery Authentication OTP
                        </span>
                        <Shield className="h-4 w-4 text-[#007185]" />
                      </div>
                      {order.otp || order.status === 'out_for_delivery' || order.rawStatus === 'OUT_FOR_DELIVERY' ? (
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="font-headline font-extrabold text-2xl tracking-widest text-[#0F1111] bg-white px-3 py-1 rounded-lg shadow-inner border border-[#D5D9D9]">
                            {order.otp || '7294'}
                          </span>
                          <span className="text-[11px] leading-tight text-[#444653]">
                            Share this 4-digit code with the delivery executive upon parcel receipt
                          </span>
                        </div>
                      ) : (
                        <div className="mt-1.5">
                          <p className="text-[11px] text-[#444653] leading-relaxed">
                            Secure 4-digit OTP will be generated when your package is out for delivery.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right 4 Columns: Destination Address & Transit Status */}
                <div className="lg:col-span-4 flex flex-col justify-between gap-6 p-6 rounded-xl bg-[#F7F8F8] shadow-sm border border-[#D5D9D9]">
                  {/* Delivery Address */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-xs font-label uppercase font-bold text-[#565959]">
                      <MapPin className="h-4 w-4 text-[#007185]" />
                      <span>Delivery Address</span>
                    </div>
                    {order.shippingAddress ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-headline font-bold text-[#0F1111]">
                          {order.shippingAddress.name}
                        </span>
                        <p className="text-xs leading-relaxed text-[#444653] font-body">
                          {order.shippingAddress.line1}
                          {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}<br />
                          {order.shippingAddress.cityStateZip}
                        </p>
                        {order.shippingAddress.phone && (
                          <div className="flex items-center gap-2 mt-2 text-xs text-[#565959]">
                            <Phone className="h-3.5 w-3.5" />
                            <span>{order.shippingAddress.phone}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-[#565959] italic py-2">
                        No delivery address recorded for this order.
                      </div>
                    )}
                  </div>

                  {/* Transit Status Card */}
                  <div className="flex flex-col gap-3 pt-4 bg-white p-4 rounded-xl shadow-sm border border-[#D5D9D9]">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-label uppercase font-bold text-[#565959]">
                        Dispatch Status
                      </span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          order.status === 'delivered'
                            ? 'bg-emerald-500'
                            : order.status === 'out_for_delivery' || order.rawStatus === 'OUT_FOR_DELIVERY'
                            ? 'bg-amber-500 animate-ping'
                            : order.status === 'shipped'
                            ? 'bg-[#FF9900] animate-ping'
                            : 'bg-primary'
                        }`}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#444653] font-medium">Current Stage</span>
                      <span className="text-[#007185] font-bold">
                        {order.status === 'delivered'
                          ? 'Delivered'
                          : order.status === 'out_for_delivery' || order.rawStatus === 'OUT_FOR_DELIVERY'
                          ? 'Out for Delivery (Doorstep)'
                          : order.status === 'shipped'
                          ? 'Dispatched / In Transit'
                          : order.status === 'cancelled'
                          ? 'Cancelled'
                          : 'At Artisan Atelier'}
                      </span>
                    </div>
                    <div className="w-full bg-[#e2e7ff] rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-[#FF9900] h-full rounded-full transition-all duration-700"
                        style={{
                          width:
                            order.status === 'delivered'
                              ? '100%'
                              : order.status === 'out_for_delivery' || order.rawStatus === 'OUT_FOR_DELIVERY'
                              ? '85%'
                              : order.status === 'shipped'
                              ? '65%'
                              : order.status === 'cancelled'
                              ? '0%'
                              : '20%',
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[#565959]">
                      <span>Seller Atelier</span>
                      <span className="font-bold text-[#904d00]">
                        {order.status === 'delivered'
                          ? 'Completed'
                          : order.status === 'out_for_delivery' || order.rawStatus === 'OUT_FOR_DELIVERY'
                          ? 'Out for Delivery'
                          : order.status === 'shipped'
                          ? (order.courierPartner ? `Via ${order.courierPartner}` : 'In Transit')
                          : 'Preparing Order'}
                      </span>
                      <span>Destination Doorstep</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* 2-COLUMN SECTION: Journey Log + Items / Billing */}
            {/* ========================================================= */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* LEFT 7 COLS: Detailed Journey Log & Management */}
              <div className="lg:col-span-7 flex flex-col gap-6">
                {/* Journey Log Stepper Card */}
                <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-md border border-[#D5D9D9]">
                  <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#D5D9D9]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#F7F8F8] text-[#007185] flex items-center justify-center">
                        <Truck className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col">
                        <h2 className="text-lg font-headline font-bold text-[#0F1111]">
                          Detailed Journey Log
                        </h2>
                        <span className="text-xs text-[#565959]">
                          {checkpoints.length} Consignment Milestones
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-label font-bold text-[#0F1111] uppercase tracking-wider bg-[#FFE4B5] px-2.5 py-1 rounded-full">
                      Verified Timeline
                    </span>
                  </div>

                  {/* Vertical Stepper */}
                  <div className="relative pl-6 space-y-8 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#dae2fd]">
                    {checkpoints.map((cp) => {
                      const isCurrent = cp.status === 'current';
                      const isCompleted = cp.status === 'completed';
                      const isUpcoming = cp.status === 'upcoming';

                      return (
                        <div
                          key={cp.id}
                          className={`relative flex items-start gap-4 transition-all ${
                            isCurrent ? 'bg-[#FFE4B5]/30 -mx-3 p-3 rounded-xl border border-[#FFE4B5]' : ''
                          }`}
                        >
                          {/* Icon Marker */}
                          {isUpcoming && (
                            <div className="absolute -left-6 top-1 w-6 h-6 rounded-full bg-[#D5D9D9] text-[#565959] flex items-center justify-center shadow-sm">
                              <span className="w-2 h-2 rounded-full bg-[#565959]" />
                            </div>
                          )}

                          {isCurrent && (
                            <div className="absolute -left-3 top-4 w-7 h-7 rounded-full bg-[#FF9900] text-white flex items-center justify-center shadow-md animate-bounce ring-4 ring-[#FF9900]/30">
                              <Truck className="h-3.5 w-3.5" />
                            </div>
                          )}

                          {isCompleted && (
                            <div className="absolute -left-6 top-1 w-6 h-6 rounded-full bg-[#007185] text-white flex items-center justify-center shadow-sm">
                              <Check className="h-3.5 w-3.5 stroke-[3]" />
                            </div>
                          )}

                          {/* Content Block */}
                          <div className={`flex flex-col flex-1 ${isCurrent ? 'pl-6' : 'pl-3'}`}>
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <span
                                className={`text-sm font-headline ${
                                  isCurrent
                                    ? 'font-extrabold text-[#904d00]'
                                    : isCompleted
                                    ? 'font-bold text-[#0F1111]'
                                    : 'font-medium text-[#565959]'
                                }`}
                              >
                                {cp.title}
                              </span>
                              <span
                                className={`text-xs font-label ${
                                  isCurrent
                                    ? 'text-[#904d00] font-semibold'
                                    : 'text-[#565959]'
                                }`}
                              >
                                {cp.timestamp}
                              </span>
                            </div>

                            {cp.location && (
                              <span className="text-xs text-[#007185] font-semibold mt-0.5">
                                {cp.location}
                              </span>
                            )}

                            <p
                              className={`text-xs mt-0.5 leading-relaxed ${
                                isUpcoming ? 'text-[#565959]' : 'text-[#444653]'
                              }`}
                            >
                              {cp.description}
                            </p>

                            {cp.badge && (
                              <div className="mt-2 flex items-center gap-2">
                                <span className="text-[11px] px-2 py-0.5 bg-white border border-[#c4c5d5] rounded text-[#007185] font-semibold shadow-sm">
                                  {cp.badge}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Shipment Management Options (Self-Service Hub) */}
                <div className="bg-white rounded-2xl p-6 shadow-md border border-[#D5D9D9] flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-headline font-bold text-[#0F1111]">
                      Shipment Management Options
                    </h3>
                    <span className="text-xs text-[#565959]">Self-Service Hub</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setInstructionModalOpen(true)}
                      className="p-4 rounded-xl bg-[#F7F8F8] hover:bg-[#D5D9D9] flex flex-col gap-2 text-left transition-all group border border-[#D5D9D9]"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white text-[#007185] flex items-center justify-center group-hover:bg-[#007185] group-hover:text-white transition-all shadow-sm">
                        <Edit3 className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-headline font-bold text-[#0F1111]">
                        Special Delivery Note
                      </span>
                      <span className="text-[11px] text-[#444653] leading-tight">
                        Leave at door, gate code, or neighbor drop-off
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRescheduleModalOpen(true)}
                      className="p-4 rounded-xl bg-[#F7F8F8] hover:bg-[#D5D9D9] flex flex-col gap-2 text-left transition-all group border border-[#D5D9D9]"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white text-[#007185] flex items-center justify-center group-hover:bg-[#007185] group-hover:text-white transition-all shadow-sm">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-headline font-bold text-[#0F1111]">
                        Reschedule Slot
                      </span>
                      <span className="text-[11px] text-[#444653] leading-tight">
                        Pick an alternate date or custom evening slot
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        showToast('Connecting to live delivery concierge desk...', 'info');
                        setSupportModalOpen(true);
                      }}
                      className="p-4 rounded-xl bg-[#F7F8F8] hover:bg-[#D5D9D9] flex flex-col gap-2 text-left transition-all group border border-[#D5D9D9]"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white text-[#FF9900] flex items-center justify-center group-hover:bg-[#FF9900] group-hover:text-white transition-all shadow-sm">
                        <MessageSquare className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-headline font-bold text-[#0F1111]">
                        Live Concierge
                      </span>
                      <span className="text-[11px] text-[#444653] leading-tight">
                        Direct support with logistics supervisor
                      </span>
                    </button>
                  </div>

                  {/* Cancel / Return / Instant Refund Options based on Order Status */}
                  {order.status === 'delivered' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReturnItem(order.items[0] || null);
                        setReturnModalOpen(true);
                      }}
                      className="w-full p-3.5 rounded-xl bg-amber-50/80 hover:bg-amber-100 flex items-center justify-between gap-3 text-left transition-all border border-amber-200/80 group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white text-amber-600 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                          <RotateCcw className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="text-xs font-headline font-bold text-amber-900 block">
                            Return or Exchange Item
                          </span>
                          <span className="text-[11px] text-amber-700">
                            Delivered to doorstep • 7-day hassle-free returns &amp; size exchanges
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-amber-800 flex items-center gap-1 shrink-0 group-hover:translate-x-0.5 transition-transform">
                        <span>Return Flow</span>
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    </button>
                  ) : order.status === 'cancelled' ? (
                    <div className="p-3.5 rounded-xl bg-stone-100 flex items-center justify-between gap-3 text-left border border-stone-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white text-stone-600 flex items-center justify-center shadow-xs">
                          <RotateCcw className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="text-xs font-headline font-bold text-stone-800 block">
                            Order Cancelled
                          </span>
                          <span className="text-[11px] text-stone-600">
                            Online payments are refunded to the original payment method
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Link
                      href={`/orders/${order.id}/cancel`}
                      className="p-3.5 rounded-xl bg-rose-50/80 hover:bg-rose-100 flex items-center justify-between gap-3 text-left transition-all border border-rose-200/80 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white text-rose-600 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                          <RotateCcw className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="text-xs font-headline font-bold text-rose-900 block">
                            Cancel order
                          </span>
                          <span className="text-[11px] text-rose-700">
                            Online payments are refunded to the original payment method
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-rose-800 flex items-center gap-1 shrink-0 group-hover:translate-x-0.5 transition-transform">
                        <span>Cancel Flow</span>
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    </Link>
                  )}
                </div>
              </div>

              {/* RIGHT 5 COLS: Items in this Package & Billing */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                {/* Items in this Package */}
                <div className="bg-white rounded-2xl p-6 lg:p-7 shadow-md border border-[#D5D9D9] flex flex-col gap-6">
                  <div className="flex items-center justify-between pb-4 border-b border-[#D5D9D9]">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-[#007185]" />
                      <h2 className="text-base font-headline font-bold text-[#0F1111]">
                        Items in this Package
                      </h2>
                    </div>
                    <span className="text-xs font-label font-semibold text-[#565959]">
                      {order.items.length} {order.items.length === 1 ? 'Piece' : 'Pieces'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-4">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex gap-4 p-3 rounded-xl bg-[#F7F8F8] shadow-sm border border-[#D5D9D9]"
                      >
                        <div className="w-20 h-24 rounded-lg overflow-hidden bg-[#e2e7ff] shrink-0 relative">
                          <Image
                            src={item.image}
                            alt={item.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex flex-col justify-between flex-1 min-w-0">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-headline font-bold text-[#0F1111] leading-snug line-clamp-2">
                              {item.title}
                            </span>
                            <span className="text-[11px] text-[#444653] font-body">
                              Size: <strong className="text-[#0F1111]">{item.size}</strong> • Color:{' '}
                              <strong className="text-[#0F1111]">{item.color}</strong> • Qty:{' '}
                              <strong className="text-[#0F1111]">{item.quantity}</strong>
                            </span>
                            <span className="text-[11px] text-[#007185] font-semibold mt-0.5">
                              Seller: {item.sellerName}
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            {item.originalPrice > item.price && (
                              <span className="text-xs font-label text-[#565959] line-through">
                                {formatINR(item.originalPrice)}
                              </span>
                            )}
                            <span className="text-sm font-headline font-bold text-[#0F1111] font-mono">
                              {formatINR(item.price)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Billing Breakdown */}
                  <div className="flex flex-col gap-2.5 pt-4 bg-[#F7F8F8] p-4 rounded-xl shadow-sm border border-[#D5D9D9]">
                    <span className="text-xs font-headline font-bold text-[#0F1111] mb-1">
                      Billing Breakdown
                    </span>
                    <div className="flex items-center justify-between text-xs text-[#444653]">
                      <span>Items Subtotal</span>
                      <span className="font-mono">
                        {formatINR(
                          Number(order.subtotal) ||
                            order.items.reduce((s, i) => s + Number(i.price) * (i.quantity || 1), 0)
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-[#444653]">
                      <span>Packaging &amp; Courier Fee</span>
                      <span className="text-[#904d00] font-semibold">
                        {Number(order.totalAmount) > Number(order.subtotal || 0)
                          ? formatINR(Number(order.totalAmount) - Number(order.subtotal || 0))
                          : 'FREE (Complimentary)'}
                      </span>
                    </div>
                    <div className="h-px bg-[#dae2fd] my-1" />
                    <div className="flex items-center justify-between text-sm font-headline font-bold text-[#0F1111]">
                      <span>Total Amount</span>
                      <span className="font-mono text-[#007185] text-base">
                        {formatINR(Number(order.totalAmount))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[11px]">
                      <span className="text-[#565959]">
                        Payment Mode: {(order as any).paymentMethod === 'COD' ? 'Cash on Delivery (COD)' : (order as any).paymentMethod || 'Prepaid Online'}
                      </span>
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        (order as any).paymentMethod === 'COD'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-[#dae2fd] text-[#007185]'
                      }`}>
                        {(order as any).paymentMethod === 'COD' ? 'CASH ON DELIVERY (COD)' : '100% PREPAID'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Vyntra Royal Authenticity Guarantee Card */}
                <div className="bg-gradient-to-br from-[#007185] to-[#004B57] text-white rounded-2xl p-6 shadow-md flex flex-col gap-4 relative overflow-hidden">
                  <div className="absolute -right-10 -bottom-10 w-36 h-36 bg-white/10 rounded-full blur-2xl" />
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                      <ShieldCheck className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-headline font-bold text-white">
                        Vyntra Royal Authenticity Guarantee
                      </span>
                      <span className="text-[11px] text-white/80">
                        100% Genuine Handcrafted Pieces
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-white/90 leading-relaxed font-body relative z-10">
                    Every artisanal item in this order undergoes rigorous quality verification at verified ateliers prior to tamper-sealed dispatch.
                  </p>
                  <div className="flex items-center justify-between text-[11px] pt-1 text-white/80 relative z-10">
                    <span>Certificate ID: #VYN-{order.orderNumber.replace(/[^a-zA-Z0-9]/g, '')}</span>
                    <button
                      type="button"
                      onClick={() => setVerifyCertModalOpen(true)}
                      className="underline hover:text-white font-semibold transition-colors"
                    >
                      Verify Certificate
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: Special Delivery Instructions Modal */}
      {/* ========================================================= */}
      {instructionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 border border-[#D5D9D9]">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-headline font-bold text-[#0F1111]">
                Delivery Instructions
              </h4>
              <button
                type="button"
                onClick={() => setInstructionModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[#F7F8F8] text-[#565959]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-[#444653]">
              Select delivery instructions to transmit to the courier partner upon dispatch:
            </p>
            <div className="flex flex-col gap-2">
              {[
                'Hand over directly to recipient',
                'Leave package with building security gate',
                'Do not ring doorbell (Baby sleeping)',
                'Call before arriving at doorstep',
              ].map((opt) => (
                <label
                  key={opt}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedInstruction === opt
                      ? 'bg-[#F7F8F8] border-[#007185] text-[#007185]'
                      : 'bg-white border-[#D5D9D9] text-[#0F1111] hover:bg-[#F7F8F8]'
                  }`}
                >
                  <input
                    type="radio"
                    name="delivery-instruction"
                    checked={selectedInstruction === opt}
                    onChange={() => setSelectedInstruction(opt)}
                    className="text-[#007185] focus:ring-0"
                  />
                  <span className="text-xs font-semibold">{opt}</span>
                </label>
              ))}
            </div>

            <div className="flex flex-col gap-1 mt-1">
              <span className="text-xs font-bold text-[#0F1111]">Add custom note:</span>
              <input
                type="text"
                placeholder="e.g. Leave with security desk if unavailable"
                value={customInstruction}
                onChange={(e) => setCustomInstruction(e.target.value)}
                className="text-xs px-3 py-2 rounded-lg border border-[#c4c5d5] focus:outline-none focus:border-[#007185]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D5D9D9]">
              <button
                type="button"
                onClick={() => setInstructionModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#444653] hover:bg-[#F7F8F8] rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveInstructions}
                className="px-4 py-2 text-xs font-semibold bg-[#007185] text-white hover:bg-[#004B57] rounded-lg shadow-sm"
              >
                Save Instructions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: Reschedule Delivery Modal */}
      {/* ========================================================= */}
      {rescheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 border border-[#D5D9D9]">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-headline font-bold text-[#0F1111]">
                Delivery Preference Window
              </h4>
              <button
                type="button"
                onClick={() => setRescheduleModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[#F7F8F8] text-[#565959]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-[#444653]">
              Select your preferred arrival slot once your consignment is dispatched:
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { day: 'Morning', date: '9:00 AM – 1:00 PM' },
                { day: 'Afternoon', date: '1:00 PM – 5:00 PM' },
                { day: 'Evening', date: '5:00 PM – 8:00 PM' },
                { day: 'Weekend Only', date: 'Saturday & Sunday' },
              ].map((slot) => {
                const label = `${slot.day} (${slot.date})`;
                const isSelected = selectedSlot === label;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setSelectedSlot(label)}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      isSelected
                        ? 'bg-[#007185] text-white border-[#007185] shadow-sm'
                        : 'bg-[#F7F8F8] hover:bg-[#D5D9D9] border-[#D5D9D9] text-[#0F1111]'
                    }`}
                  >
                    <span className="block text-xs font-bold">{slot.day}</span>
                    <span className="text-[11px] opacity-80">{slot.date}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D5D9D9]">
              <button
                type="button"
                onClick={() => setRescheduleModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#444653] hover:bg-[#F7F8F8] rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReschedule}
                className="px-4 py-2 text-xs font-semibold bg-[#FF9900] text-white hover:bg-[#e07f20] rounded-lg shadow-sm"
              >
                Save Preference
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: Invoice Modal */}
      {/* ========================================================= */}
      {invoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl flex flex-col gap-4 border border-[#D5D9D9]">
            <div className="flex items-center justify-between pb-3 border-b border-[#D5D9D9]">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#007185]" />
                <h4 className="text-base font-headline font-bold text-[#0F1111]">
                  Invoice #{order.orderNumber}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setInvoiceModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[#F7F8F8] text-[#565959]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-[#F7F8F8] p-4 rounded-xl text-xs space-y-2 font-mono">
              <div className="flex justify-between text-[#565959]">
                <span>INVOICE DATE:</span>
                <span>{order.datePlaced}</span>
              </div>
              <div className="flex justify-between text-[#565959]">
                <span>CUSTOMER:</span>
                <span>{order.shippingAddress?.name || customerName}</span>
              </div>
              <div className="flex justify-between text-[#565959]">
                <span>DELIVERY TO:</span>
                <span className="truncate max-w-[200px]">{order.shippingAddress?.cityStateZip || 'Registered Address'}</span>
              </div>
              <div className="h-px bg-[#c4c5d5]/50 my-2" />
              {order.items.map((i) => (
                <div key={i.id} className="flex justify-between text-[#0F1111]">
                  <span className="truncate max-w-[240px]">{i.title} (x{i.quantity})</span>
                  <span>{formatINR(Number(i.price) * (i.quantity || 1))}</span>
                </div>
              ))}
              <div className="h-px bg-[#c4c5d5]/50 my-2" />
              <div className="flex justify-between font-bold text-sm text-[#007185]">
                <span>TOTAL AMOUNT (INCL. TAXES):</span>
                <span>{formatINR(Number(order.totalAmount))}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInvoiceModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#444653] hover:bg-[#F7F8F8] rounded-lg"
              >
                Close
              </button>
              <Link
                href={`/orders/${encodeURIComponent(order.orderNumber.replace('#', ''))}/invoice`}
                target="_blank"
                onClick={() => setInvoiceModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold bg-[#007185] text-white hover:bg-[#004B57] rounded-lg shadow-sm flex items-center gap-1.5"
              >
                <FileText className="h-4 w-4" />
                <span>Open &amp; Print Official Invoice</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: Shipment Support Desk */}
      {/* ========================================================= */}
      {supportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 border border-[#D5D9D9]">
            <div className="flex items-center justify-between pb-3 border-b border-[#D5D9D9]">
              <div className="flex items-center gap-2">
                <Headphones className="h-5 w-5 text-[#007185]" />
                <h4 className="text-base font-headline font-bold text-[#0F1111]">
                  Vyntra Care Logistics Desk
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSupportModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[#F7F8F8] text-[#565959]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#444653]">
              <p>
                Our 24/7 dedicated logistics desk oversees your consignment packaging, courier dispatch, and doorstep handover.
              </p>
              <div className="p-3 bg-[#F7F8F8] rounded-xl space-y-1.5">
                <div className="font-bold text-[#0F1111]">Vyntra Priority Care:</div>
                <div className="text-[11px] text-[#007185]">Toll Free: 1800-419-VYNTRA</div>
                <div className="text-[11px] text-[#565959]">Email: care@vyntra.luxury</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSupportModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#444653] hover:bg-[#F7F8F8] rounded-lg"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  showToast('Connecting to customer care executive...', 'info');
                  setSupportModalOpen(false);
                }}
                className="px-4 py-2 text-xs font-semibold bg-[#007185] text-white hover:bg-[#004B57] rounded-lg shadow-sm"
              >
                Start Live Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: Authenticity Certificate Modal */}
      {/* ========================================================= */}
      {verifyCertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 border border-[#D5D9D9]">
            <div className="flex items-center justify-between pb-3 border-b border-[#D5D9D9]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#FF9900]" />
                <h4 className="text-base font-headline font-bold text-[#0F1111]">
                  Vyntra Authenticity Certificate
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setVerifyCertModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[#F7F8F8] text-[#565959]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 bg-[#F7F8F8] rounded-xl border border-[#D5D9D9] flex flex-col gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#565959]">Certificate ID:</span>
                <span className="font-mono font-bold text-[#007185]">
                  #VYN-{order.orderNumber.replace(/[^a-zA-Z0-9]/g, '')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#565959]">Artisan Atelier:</span>
                <span className="font-semibold text-[#0F1111]">
                  {order.items[0]?.sellerName || 'Vyntra Royal Atelier'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#565959]">Inspection Status:</span>
                <span className="font-bold text-emerald-700">Verified &amp; Quality Certified</span>
              </div>
            </div>

            <p className="text-[11px] text-[#444653] leading-relaxed">
              This certificate affirms that every item in this order has been verified for textile purity and artisanal authenticity.
            </p>

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => setVerifyCertModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold bg-[#007185] text-white hover:bg-[#004B57] rounded-lg shadow-sm"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 6: Return or Exchange Request Modal */}
      {/* ========================================================= */}
      {returnModalOpen && order && (order.items[0] || selectedReturnItem) && (
        <ReturnRequestModal
          isOpen={returnModalOpen}
          order={order}
          item={selectedReturnItem || order.items[0]}
          onClose={() => setReturnModalOpen(false)}
          onSuccess={(requestId) => {
            setReturnModalOpen(false);
            showToast(
              `Return/Exchange request #${requestId.slice(0, 8).toUpperCase()} submitted successfully! Our logistics team will inspect the package.`,
              'success'
            );
          }}
        />
      )}
    </div>
  );
}
