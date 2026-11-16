'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Image as ImageIcon,
  Upload,
  Search,
  Filter,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  FolderOpen,
  Layers,
  Palette,
  Sparkles,
} from 'lucide-react';
import { MediaPickerModal, SelectedMedia } from '@/components/media/media-picker-modal';

export const dynamic = 'force-dynamic';

interface MediaItem {
  id: string;
  vendorId: string | null;
  title: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  width: number | null;
  height: number | null;
  url: string;
  thumbnailUrl: string | null;
  category: string;
  tags: string[];
  referenceCount: number;
  createdAt: string;
}

export default function VendorMediaPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Deletion state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteWarning, setDeleteWarning] = useState<{ id: string; message: string; refCount: number } | null>(null);

  useEffect(() => {
    fetchMedia();
  }, [activeCategory, searchQuery]);

  async function fetchMedia() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeCategory !== 'ALL') {
        params.append('category', activeCategory);
      }
      if (searchQuery.trim()) {
        params.append('q', searchQuery.trim());
      }
      params.append('limit', '50');

      const res = await fetch(`/api/vendor/media?${params.toString()}`);
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setItems(json.data.items || []);
      }
    } catch {
      // Offline fallback handling
    } finally {
      setLoading(false);
    }
  }

  const handleCopyUrl = (url: string) => {
    navigator.clipboard?.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleDelete = async (id: string, force: boolean = false) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/vendor/media/${encodeURIComponent(id)}${force ? '?force=true' : ''}`, {
        method: 'DELETE',
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setItems((prev) => prev.filter((item) => item.id !== id));
        setDeleteWarning(null);
      } else if (res.status === 409 && json.referenced) {
        setDeleteWarning({
          id,
          message: json.error?.message || 'This asset is linked to active products.',
          refCount: json.referenceCount || 1,
        });
      } else {
        alert(json.error?.message || 'Unable to delete asset.');
      }
    } catch {
      alert('Network error while deleting asset.');
    } finally {
      setDeletingId(null);
    }
  };

  // Stats calculation
  const totalCount = items.length;
  const galleryCount = items.filter((i) => i.category === 'PRODUCT_GALLERY').length;
  const swatchCount = items.filter((i) => i.category === 'COLOR_SWATCH').length;
  const aplusCount = items.filter((i) => i.category === 'APLUS_CONTENT').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white border border-[#D5D9D9] rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#565959] mb-1">
            <Link href="/vendor" className="hover:text-[#007185] hover:underline">
              Seller Central
            </Link>
            <span>/</span>
            <span className="text-[#0F1111]">Media Library</span>
          </div>
          <h1 className="text-xl font-bold text-[#0F1111] tracking-tight">Central Media Asset Manager</h1>
          <p className="text-xs text-[#565959] mt-0.5">
            Store, organize, and reuse verified high-resolution images for catalog listings, color swatches, and A+ content.
          </p>
        </div>

        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#FFD814] hover:bg-[#F7CA00] text-black text-xs font-bold rounded-lg shadow-sm transition-colors shrink-0"
        >
          <Upload className="w-4 h-4" />
          <span>Upload New Asset</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-[#D5D9D9] rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#007185] flex items-center justify-center shrink-0">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-[#565959] font-medium">Total Assets</p>
            <p className="text-lg font-bold text-[#0F1111]">{totalCount}</p>
          </div>
        </div>

        <div className="bg-white border border-[#D5D9D9] rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-[#565959] font-medium">Gallery Photos</p>
            <p className="text-lg font-bold text-[#0F1111]">{galleryCount}</p>
          </div>
        </div>

        <div className="bg-white border border-[#D5D9D9] rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-[#565959] font-medium">Color Swatches</p>
            <p className="text-lg font-bold text-[#0F1111]">{swatchCount}</p>
          </div>
        </div>

        <div className="bg-white border border-[#D5D9D9] rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-[#565959] font-medium">A+ Banners</p>
            <p className="text-lg font-bold text-[#0F1111]">{aplusCount}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#D5D9D9] rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: 'All Assets' },
            { id: 'PRODUCT_GALLERY', label: 'Product Gallery' },
            { id: 'COLOR_SWATCH', label: 'Color Swatches' },
            { id: 'APLUS_CONTENT', label: 'A+ Content' },
            { id: 'BRAND_ASSET', label: 'Brand Assets' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                activeCategory === cat.id
                  ? 'bg-[#007185] text-white'
                  : 'bg-[#F7F8F8] text-[#565959] hover:bg-gray-200 hover:text-[#0F1111]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#565959]" />
          <input
            type="text"
            placeholder="Search by title, tag or file..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#D5D9D9] rounded-lg bg-white focus:outline-none focus:border-[#007185]"
          />
        </div>
      </div>

      {/* Delete Warning Notice */}
      {deleteWarning && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Active Product Reference Safeguard</p>
              <p className="mt-0.5">{deleteWarning.message}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleDelete(deleteWarning.id, true)}
              className="px-3 py-1.5 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700 text-xs"
            >
              Force Delete Anyway
            </button>
            <button
              onClick={() => setDeleteWarning(null)}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg font-semibold text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Asset Grid */}
      <div className="bg-white border border-[#D5D9D9] rounded-xl p-5 shadow-sm">
        {loading ? (
          <div className="py-24 text-center space-y-2">
            <Loader2 className="w-8 h-8 animate-spin text-[#007185] mx-auto" />
            <p className="text-xs text-[#565959]">Retrieving media asset library...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <ImageIcon className="w-12 h-12 text-gray-300 mx-auto" />
            <h3 className="text-sm font-bold text-[#0F1111]">No Assets Found</h3>
            <p className="text-xs text-[#565959] max-w-sm mx-auto">
              Your media library has no assets matching the active criteria. Upload high-res images to use across your catalog.
            </p>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FFD814] hover:bg-[#F7CA00] text-black text-xs font-bold rounded-lg"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Image</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="group rounded-xl border border-[#D5D9D9] overflow-hidden bg-white hover:border-[#007185] hover:shadow-md transition-all flex flex-col"
              >
                {/* Image Container */}
                <div className="aspect-square bg-[#F7F8F8] relative overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.thumbnailUrl || item.url}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
                    {item.width && item.height ? `${item.width}×${item.height}` : 'Photo'}
                  </div>

                  {item.referenceCount > 0 && (
                    <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold shadow">
                      {item.referenceCount} active
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#0F1111] truncate" title={item.title}>
                      {item.title}
                    </p>
                    <p className="text-[10px] text-[#565959] font-mono truncate mt-0.5">{item.fileName}</p>

                    <div className="flex items-center justify-between text-[10px] text-[#565959] mt-2">
                      <span className="capitalize">{item.category.toLowerCase().replace('_', ' ')}</span>
                      <span>{(item.fileSize / 1024).toFixed(0)} KB</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-[#D5D9D9] mt-3 flex items-center justify-between gap-1">
                    <button
                      onClick={() => handleCopyUrl(item.url)}
                      className="p-1.5 text-xs text-[#565959] hover:text-[#007185] hover:bg-gray-100 rounded flex items-center gap-1 transition-colors"
                      title="Copy Public Image URL"
                    >
                      {copiedUrl === item.url ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-[10px] text-emerald-600 font-bold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span className="text-[10px]">Copy URL</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleDelete(item.id, false)}
                      disabled={deletingId === item.id}
                      className="p-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded transition-colors"
                      title="Delete Asset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for uploads or picking */}
      <MediaPickerModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSelect={(selected: SelectedMedia) => {
          setIsUploadModalOpen(false);
          fetchMedia();
        }}
        allowedCategory="ALL"
      />
    </div>
  );
}
