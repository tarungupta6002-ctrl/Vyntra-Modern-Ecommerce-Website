'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Clock,
  ShieldAlert,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  X,
  Loader2,
  Package,
  Edit,
} from 'lucide-react';

interface VendorNotice {
  id: string;
  adminEmail: string;
  orderNumber: string | null;
  shipmentId: string | null;
  productId: string | null;
  productTitle: string | null;
  productSlug: string | null;
  reason: string;
  severity: 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  deadlineHours: number;
  status: 'OPEN' | 'ACKNOWLEDGED';
  issuedAt: string;
  acknowledgedAt: string | null;
}

export function VendorNoticeBanner() {
  const [notices, setNotices] = useState<VendorNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  const fetchNotices = async () => {
    try {
      const res = await fetch('/api/vendor/notices', { cache: 'no-store' });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setNotices(json.data.notices || []);
      }
    } catch {
      // Ignore network errors in banner
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const handleAcknowledge = async (noticeId: string) => {
    setAcknowledgingId(noticeId);
    try {
      const res = await fetch(`/api/vendor/notices/${noticeId}`, {
        method: 'PATCH',
      });
      if (res.ok) {
        await fetchNotices();
      }
    } catch {
      alert('Network error acknowledging notice');
    } finally {
      setAcknowledgingId(null);
    }
  };

  const openNotices = notices.filter((n) => n.status === 'OPEN');
  if (loading || openNotices.length === 0) return null;

  return (
    <div className="space-y-3">
      {openNotices.map((notice) => {
        const isCritical = notice.severity === 'CRITICAL';
        return (
          <div
            key={notice.id}
            className={`border rounded-xl p-4 shadow-sm transition-all animate-in fade-in duration-200 ${
              isCritical
                ? 'bg-rose-50 border-rose-300 text-rose-950'
                : 'bg-amber-50 border-amber-300 text-amber-950'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                    isCritical ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider ${
                        isCritical
                          ? 'bg-rose-700 text-white'
                          : 'bg-amber-700 text-white'
                      }`}
                    >
                      {isCritical ? 'Critical Compliance Notice' : 'Official Policy & SLA Notice'}
                    </span>

                    {notice.orderNumber && (
                      <span className="text-xs font-mono font-bold px-2 py-0.5 bg-white/80 border rounded text-gray-800">
                        Order #{notice.orderNumber}
                      </span>
                    )}

                    {notice.productTitle && (
                      <span className="text-xs font-medium px-2 py-0.5 bg-white/90 border border-gray-300 rounded text-gray-900 flex items-center gap-1 max-w-[280px] sm:max-w-md truncate" title={notice.productTitle}>
                        <Package className="w-3 h-3 text-[#007185] shrink-0" />
                        <span className="truncate">Product: {notice.productTitle}</span>
                      </span>
                    )}

                    <span className="text-[11px] text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Resolution window: {notice.deadlineHours} Hours
                    </span>
                  </div>

                  <h3 className="text-sm font-bold tracking-tight">
                    {notice.title}
                  </h3>
                  <p className="text-xs text-gray-700 leading-relaxed font-normal whitespace-pre-line">
                    {notice.message}
                  </p>
                  <p className="text-[10px] text-gray-500 pt-1">
                    Issued by: <span className="font-mono">{notice.adminEmail}</span> • Time:{' '}
                    {new Date(notice.issuedAt).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                {notice.productId ? (
                  <Link
                    href={`/vendor/products/${notice.productId}/edit`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 hover:border-gray-500 text-xs font-bold rounded-lg text-gray-800 transition-colors shadow-sm"
                  >
                    <Edit className="w-3 h-3" />
                    <span>Edit Product</span>
                  </Link>
                ) : notice.orderNumber ? (
                  <Link
                    href="/vendor/orders"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 hover:border-gray-500 text-xs font-bold rounded-lg text-gray-800 transition-colors shadow-sm"
                  >
                    <span>View Orders</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                ) : null}

                <button
                  onClick={() => handleAcknowledge(notice.id)}
                  disabled={acknowledgingId === notice.id}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg text-white transition-all shadow-sm ${
                    isCritical
                      ? 'bg-rose-700 hover:bg-rose-800'
                      : 'bg-[#007185] hover:bg-[#005a6a]'
                  } disabled:opacity-50`}
                >
                  {acknowledgingId === notice.id ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Acknowledge Notice</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
