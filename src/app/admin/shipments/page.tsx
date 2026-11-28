'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Truck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  ExternalLink,
  Loader2,
  Package,
  ShieldAlert,
  Send,
  X,
  Check,
  Edit2,
  Eye,
} from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { PageHeader, StatRow, consoleButton } from '@/components/console/console-ui';

export const dynamic = 'force-dynamic';

interface ShipmentItem {
  id: string;
  orderId: string;
  orderNumber: string;
  vendorId: string;
  vendorStoreName: string;
  status: string;
  carrierName: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippingFee: number;
  customerName: string;
  customerCity: string;
  orderCreatedAt: string;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  isDelayed: boolean;
  delayHours: number;
  itemsCount: number;
  items: Array<{ id: string; title: string; quantity: number; price: number }>;
}

export default function AdminShipmentsPage() {
  const [shipments, setShipments] = useState<ShipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [delayedOnly, setDelayedOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [noticesMap, setNoticesMap] = useState<Record<string, { id: string; status: string; acknowledgedAt: string | null }>>({});

  // Notice Modal State
  const [noticeShipment, setNoticeShipment] = useState<ShipmentItem | null>(null);
  const [noticeReason, setNoticeReason] = useState('SLA_DISPATCH_BREACH');
  const [noticeSeverity, setNoticeSeverity] = useState<'WARNING' | 'CRITICAL'>('WARNING');
  const [noticeDeadline, setNoticeDeadline] = useState(24);
  const [noticeMessage, setNoticeMessage] = useState('');
  const [isSubmittingNotice, setIsSubmittingNotice] = useState(false);
  const [noticeSuccess, setNoticeSuccess] = useState<string | null>(null);

  // Status & Courier Manage Modal State
  const [editingShipment, setEditingShipment] = useState<ShipmentItem | null>(null);
  const [targetStatus, setTargetStatus] = useState<string>('');
  const [courierPartnerInput, setCourierPartnerInput] = useState('');
  const [trackingNumberInput, setTrackingNumberInput] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const openManageModal = (shipment: ShipmentItem) => {
    if (shipment.status === 'DELIVERED' || shipment.status === 'CANCELLED') {
      alert(`Consignment #${shipment.orderNumber} is already finalized (${shipment.status}) and cannot be altered.`);
      return;
    }
    setEditingShipment(shipment);
    // Map internal shipment status to Order status
    let mapped = shipment.status;
    if (mapped === 'IN_TRANSIT') mapped = 'SHIPPED';
    setTargetStatus(mapped);
    setCourierPartnerInput(
      shipment.carrierName && shipment.carrierName !== 'Awaiting Logistics Pickup'
        ? shipment.carrierName
        : 'Delhivery'
    );
    setTrackingNumberInput(shipment.trackingNumber || '');
    setActionSuccess(null);
  };

  const handleUpdateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShipment) return;

    setIsUpdating(true);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/admin/orders/${editingShipment.orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: targetStatus,
          courierPartner: courierPartnerInput.trim() || null,
          trackingNumber: trackingNumberInput.trim() || null,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setActionSuccess(`Consignment #${editingShipment.orderNumber} successfully updated.`);
        setTimeout(() => {
          setEditingShipment(null);
          fetchShipments();
        }, 1200);
      } else {
        alert(json.error?.message || 'Failed to update shipment status');
      }
    } catch (e: any) {
      alert(e.message || 'Error updating shipment status');
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, [delayedOnly, statusFilter]);

  async function fetchShipments() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (delayedOnly) params.append('delayed', 'true');
      params.append('limit', '50');

      // Parallelize shipments and notices fetches to eliminate client-side network waterfall
      const [shipmentsRes, noticesRes] = await Promise.all([
        fetch(`/api/admin/shipments?${params.toString()}`),
        fetch('/api/admin/notices').catch(() => null),
      ]);

      const json = await shipmentsRes.json();
      if (shipmentsRes.ok && json.success && json.data) {
        setShipments(json.data.shipments || []);
      }

      // Process notices map
      if (noticesRes && noticesRes.ok) {
        try {
          const noticesJson = await noticesRes.json();
          if (noticesJson.success && noticesJson.data?.notices) {
            const map: Record<string, any> = {};
            for (const n of noticesJson.data.notices) {
              if (n.orderNumber) {
                map[n.orderNumber] = {
                  id: n.id,
                  status: n.status,
                  acknowledgedAt: n.acknowledgedAt,
                };
              }
            }
            setNoticesMap(map);
          }
        } catch {
          // ignore
        }
      }
    } catch {
      // Offline fallback
    } finally {
      setLoading(false);
    }
  }

  const handleOpenNoticeModal = (shipment: ShipmentItem) => {
    setNoticeShipment(shipment);
    setNoticeReason('SLA_DISPATCH_BREACH');
    setNoticeSeverity(shipment.isDelayed ? 'CRITICAL' : 'WARNING');
    setNoticeDeadline(24);
    setNoticeSuccess(null);

    const defaultMsg = shipment.isDelayed
      ? `This order has exceeded the 48-hour handling SLA by ${shipment.delayHours} hours. Please dispatch the package and update valid AWB tracking immediately within 24 hours to prevent seller account penalties.`
      : `Please ensure order #${shipment.orderNumber} is packed and handed over to the courier partner within the 48-hour fulfillment window.`;
    setNoticeMessage(defaultMsg);
  };

  const handleSendNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeShipment) return;

    setIsSubmittingNotice(true);
    setNoticeSuccess(null);

    try {
      const res = await fetch('/api/admin/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: noticeShipment.vendorId,
          storeName: noticeShipment.vendorStoreName,
          orderNumber: noticeShipment.orderNumber,
          shipmentId: noticeShipment.id,
          reason: noticeReason,
          severity: noticeSeverity,
          deadlineHours: noticeDeadline,
          message: noticeMessage,
          title:
            noticeReason === 'SLA_DISPATCH_BREACH'
              ? `SLA Dispatch Breach Warning - Order #${noticeShipment.orderNumber}`
              : `Compliance Alert - Order #${noticeShipment.orderNumber}`,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setNoticeSuccess(`Official notice issued to ${noticeShipment.vendorStoreName} successfully.`);
        await fetchShipments();
        setTimeout(() => {
          setNoticeShipment(null);
          setNoticeSuccess(null);
        }, 1500);
      } else {
        alert(json.error?.message || 'Failed to issue notice');
      }
    } catch (err: any) {
      alert(err.message || 'Network error issuing notice');
    } finally {
      setIsSubmittingNotice(false);
    }
  };

  const filtered = shipments.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.orderNumber.toLowerCase().includes(q) ||
      s.vendorStoreName.toLowerCase().includes(q) ||
      (s.trackingNumber && s.trackingNumber.toLowerCase().includes(q)) ||
      s.customerName.toLowerCase().includes(q)
    );
  });

  const delayedCount = shipments.filter((s) => s.isDelayed).length;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <PageHeader
        title="Shipments"
        description="Each seller’s packages and tracking, and sellers who are late to ship."
        actions={
          <>
          <button type="button" onClick={fetchShipments} className={consoleButton.secondary}>
            <RefreshCw className={`h-4 w-4`} />
            Refresh
          </button>
          </>
        }
      />

      {/* Delayed SLA Alert Banner */}
      {delayedCount > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">{delayedCount} Vendor Shipment(s) Exceeding Handling SLA</p>
              <p className="mt-0.5 text-rose-800">
                These consignments have remained in PENDING or CONFIRMED state for more than 48 hours without courier dispatch.
              </p>
            </div>
          </div>
          <button
            onClick={() => setDelayedOnly((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs shrink-0 transition-colors ${
              delayedOnly ? 'bg-rose-700 text-white' : 'bg-white border border-rose-300 text-rose-700 hover:bg-rose-100'
            }`}
          >
            {delayedOnly ? 'Show All Shipments' : 'Filter Delayed Only'}
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#D5D9D9] rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['ALL', 'PENDING', 'CONFIRMED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-[#007185] text-white'
                  : 'bg-[#F7F8F8] text-[#565959] hover:bg-gray-200 hover:text-[#0F1111]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#565959]" />
          <input
            type="text"
            placeholder="Search order #, vendor, AWB or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#D5D9D9] rounded-lg bg-white focus:outline-none focus:border-[#007185]"
          />
        </div>
      </div>

      {/* Shipments Table */}
      <div className="bg-white border border-[#D5D9D9] rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-24 text-center space-y-2">
            <Loader2 className="w-8 h-8 animate-spin text-[#007185] mx-auto" />
            <p className="text-xs text-[#565959]">Loading vendor shipments...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <Truck className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-sm font-bold text-[#0F1111]">No shipments found</p>
            <p className="text-xs text-[#565959]">No multi-vendor shipments match your current criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#F7F8F8] text-[#565959] border-b border-[#D5D9D9] font-bold">
                <tr>
                  <th className="py-3 px-4">Consignment / Order</th>
                  <th className="py-3 px-4">Vendor Partner</th>
                  <th className="py-3 px-4">Customer &amp; City</th>
                  <th className="py-3 px-4">Logistics / AWB</th>
                  <th className="py-3 px-4">SLA Performance</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Manage</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D5D9D9]">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/80 transition-colors">
                    {/* Order */}
                    <td className="py-3 px-4">
                      <Link
                        href={`/admin/orders/${s.orderId}`}
                        className="font-bold text-[#0F1111] hover:text-[#007185] hover:underline inline-flex items-center gap-1 group"
                        title="View Full Order Details"
                      >
                        <span>{s.orderNumber}</span>
                        <Eye className="w-3 h-3 text-[#565959] group-hover:text-[#007185]" />
                      </Link>
                      <p className="text-[10px] text-[#565959] font-mono">{s.id}</p>
                      <p className="text-[10px] text-[#565959] mt-0.5">{s.itemsCount} item(s)</p>
                    </td>

                    {/* Vendor */}
                    <td className="py-3 px-4">
                      <p className="font-bold text-[#0F1111]">{s.vendorStoreName}</p>
                      <p className="text-[10px] text-[#565959]">Fee: {formatINR(s.shippingFee)}</p>
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-4">
                      <p className="font-semibold text-[#0F1111]">{s.customerName}</p>
                      <p className="text-[10px] text-[#565959]">{s.customerCity}</p>
                    </td>

                    {/* Logistics */}
                    <td className="py-3 px-4">
                      <p className="font-semibold text-[#0F1111]">{s.carrierName}</p>
                      {s.trackingNumber ? (
                        <p className="font-mono text-[10px] text-[#007185] font-bold">{s.trackingNumber}</p>
                      ) : (
                        <span className="text-[10px] text-gray-400">No AWB yet</span>
                      )}
                    </td>

                    {/* SLA Performance */}
                    <td className="py-3 px-4">
                      {s.isDelayed ? (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[10px]">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>Delayed (+{s.delayHours}h)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[10px]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Within Handling SLA</span>
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          s.status === 'DELIVERED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : s.status === 'SHIPPED'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : s.status === 'CANCELLED'
                            ? 'bg-gray-100 text-gray-700 border border-gray-300'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>

                    {/* Manage Button */}
                    <td className="py-3 px-4 text-center">
                      {s.status === 'DELIVERED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Delivered</span>
                        </span>
                      ) : s.status === 'CANCELLED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg border border-neutral-300 bg-neutral-100 text-neutral-600 shadow-2xs">
                          <span>Cancelled</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openManageModal(s)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-[#D5D9D9] bg-white hover:bg-[#F7F8F8] text-[#007185] shadow-2xs transition-all hover:border-[#007185]"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-[#007185]" />
                          <span>Manage</span>
                        </button>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      {noticesMap[s.orderNumber] ? (
                        <div className="flex flex-col items-end gap-1">
                          {noticesMap[s.orderNumber].status === 'ACKNOWLEDGED' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Notice Ack&apos;d</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Notice Pending Ack</span>
                            </span>
                          )}
                          <button
                            onClick={() => handleOpenNoticeModal(s)}
                            className="text-[10px] text-[#007185] hover:underline font-semibold"
                          >
                            Re-issue
                          </button>
                        </div>
                      ) : s.isDelayed ? (
                        <button
                          onClick={() => handleOpenNoticeModal(s)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-lg border bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100 shadow-xs transition-all"
                          title="Fulfillment overdue: Issue official SLA breach notice"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Issue SLA Notice</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#565959] bg-[#F7F8F8] px-2.5 py-1 rounded-lg border border-[#D5D9D9]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Compliant</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Issue SLA / Compliance Notice Modal */}
      {noticeShipment && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#D5D9D9] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-600">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#0F1111]">Issue Official Notice</h3>
                  <p className="text-xs text-[#565959]">
                    To: <span className="font-semibold text-gray-900">{noticeShipment.vendorStoreName}</span> (Order #{noticeShipment.orderNumber})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setNoticeShipment(null)}
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
                      <option value="SLA_DISPATCH_BREACH">SLA Dispatch Breach (&gt;48h Delay)</option>
                      <option value="INVENTORY_STOCKOUT">Inventory Stockout / Unfulfilled</option>
                      <option value="PACKAGING_QUALITY">Packaging & Label Quality</option>
                      <option value="POLICY_VIOLATION">Marketplace Policy Breach</option>
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
                    This warning will immediately appear as a high-priority banner in {noticeShipment.vendorStoreName}&apos;s Seller Portal.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setNoticeShipment(null)}
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

      {/* Status & Shipment Management Modal */}
      {editingShipment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#D5D9D9] space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAEDED]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#007185]">
                  Logistics &amp; Consignment Control
                </span>
                <h3 className="font-bold text-base text-[#0F1111]">
                  Manage Consignment #{editingShipment.orderNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingShipment(null)}
                className="p-1 rounded-lg hover:bg-[#EAEDED] text-[#565959]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {actionSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <Check className="h-4 w-4" />
                <span>{actionSuccess}</span>
              </div>
            )}

            <div className="bg-[#F7F8F8] p-3 rounded-xl border border-[#D5D9D9] text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-[#565959]">Vendor:</span>
                <span className="font-bold text-[#0F1111]">{editingShipment.vendorStoreName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#565959]">Customer:</span>
                <span className="font-semibold text-[#0F1111]">
                  {editingShipment.customerName} ({editingShipment.customerCity})
                </span>
              </div>
            </div>

            <form onSubmit={handleUpdateShipment} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-[#0F1111] block mb-1.5">
                  Consignment / Order Status
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-lg border border-[#D5D9D9] text-[#0F1111] font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#FF9900]/30"
                >
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="PROCESSING">PROCESSING</option>
                  <option value="SHIPPED">SHIPPED (In Transit)</option>
                  <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                  <option value="DELIVERED">DELIVERED (Authorizes Doorstep Delivery)</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
                <p className="text-[11px] text-[#565959] mt-1">
                  Setting status updates customer tracking updates, carrier timeline, and seller consignment records.
                </p>
              </div>

              <div>
                <label className="font-bold text-[#0F1111] block mb-1.5">
                  Courier Logistics Partner
                </label>
                <input
                  type="text"
                  value={courierPartnerInput}
                  onChange={(e) => setCourierPartnerInput(e.target.value)}
                  placeholder="e.g. Delhivery, Blue Dart, Ekart, DTDC, Shadowfax"
                  className="w-full py-2.5 px-3 rounded-lg border border-[#D5D9D9] text-[#0F1111] focus:outline-none focus:ring-2 focus:ring-[#FF9900]/30"
                />
              </div>

              <div>
                <label className="font-bold text-[#0F1111] block mb-1.5">
                  Tracking / AWB Number
                </label>
                <input
                  type="text"
                  value={trackingNumberInput}
                  onChange={(e) => setTrackingNumberInput(e.target.value)}
                  placeholder="e.g. DEL-7729183921"
                  className="w-full py-2.5 px-3 rounded-lg border border-[#D5D9D9] text-[#0F1111] font-mono focus:outline-none focus:ring-2 focus:ring-[#FF9900]/30"
                />
              </div>

              <div className="pt-3 border-t border-[#EAEDED] flex items-center justify-between">
                <Link
                  href={`/admin/orders/${editingShipment.orderId}`}
                  className="text-xs text-[#007185] hover:underline font-bold inline-flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Full Order Details</span>
                </Link>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingShipment(null)}
                    className="px-4 py-2 rounded-lg bg-[#F7F8F8] border border-[#D5D9D9] font-bold text-[#0F1111] hover:bg-[#EAEDED]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-5 py-2 rounded-lg bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] font-bold border border-[#FCD200] shadow-sm disabled:opacity-50"
                  >
                    {isUpdating ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
