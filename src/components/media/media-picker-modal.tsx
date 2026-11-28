'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  Search,
  Check,
  Trash2,
  AlertCircle,
  Image as ImageIcon,
  FolderOpen,
  Filter,
  Eye,
  Info,
  Maximize2,
} from 'lucide-react';
import { validateClientImage, CATEGORY_DIMENSION_GUIDELINES } from '@/lib/media/validation';

import { CometSpinner } from '@/components/ui/loading-spinner';
export interface SelectedMedia {
  id: string;
  url: string;
  title: string;
  thumbnailUrl?: string | null;
  category?: string;
  width?: number | null;
  height?: number | null;
}

export interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (media: SelectedMedia) => void;
  allowedCategory?: 'ALL' | 'PRODUCT_GALLERY' | 'COLOR_SWATCH' | 'APLUS_CONTENT' | 'BRAND_ASSET';
  title?: string;
}

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

const CATEGORIES = [
  { id: 'ALL', label: 'All Assets' },
  { id: 'PRODUCT_GALLERY', label: 'Product Gallery' },
  { id: 'COLOR_SWATCH', label: 'Color Swatches' },
  { id: 'APLUS_CONTENT', label: 'A+ Content' },
  { id: 'BRAND_ASSET', label: 'Brand Assets' },
];

export function MediaPickerModal({
  isOpen,
  onClose,
  onSelect,
  allowedCategory = 'ALL',
  title = 'Media Asset Library',
}: MediaPickerModalProps) {
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const [selectedCategory, setSelectedCategory] = useState<string>(allowedCategory || 'ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);

  // Upload States
  const [uploadCategory, setUploadCategory] = useState<string>(
    allowedCategory !== 'ALL' ? allowedCategory : 'PRODUCT_GALLERY'
  );
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Deletion State
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteWarning, setDeleteWarning] = useState<{ id: string; message: string; refCount: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (allowedCategory && allowedCategory !== 'ALL') {
      setSelectedCategory(allowedCategory);
      setUploadCategory(allowedCategory);
    }
  }, [allowedCategory]);

  useEffect(() => {
    if (isOpen) {
      fetchMedia();
    }
  }, [isOpen, selectedCategory, searchQuery]);

  async function fetchMedia() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== 'ALL') {
        params.append('category', selectedCategory);
      }
      if (searchQuery.trim()) {
        params.append('q', searchQuery.trim());
      }
      params.append('limit', '30');

      const res = await fetch(`/api/vendor/media?${params.toString()}`);
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setItems(json.data.items || []);
        if (json.data.items && json.data.items.length > 0 && !selectedItem) {
          setSelectedItem(json.data.items[0]);
        }
      }
    } catch {
      // Offline fallback handling
    } finally {
      setLoading(false);
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadFile(file);
    setUploadTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));

    // Client-side instant validation
    const validation = await validateClientImage(file, uploadCategory);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid image file.');
    }

    const reader = new FileReader();
    reader.onload = () => {
      setUploadPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(20);

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('category', uploadCategory);
      formData.append('title', uploadTitle || uploadFile.name);
      if (uploadTags) formData.append('tags', uploadTags);

      setUploadProgress(50);
      const res = await fetch('/api/vendor/media/upload', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(85);
      const json = await res.json();

      if (res.ok && json.success && json.data) {
        setUploadProgress(100);
        setUploadFile(null);
        setUploadPreview(null);
        setUploadTitle('');
        setUploadTags('');
        setActiveTab('library');
        fetchMedia();
        setSelectedItem(json.data);
      } else {
        setUploadError(json.error?.message || 'Failed to upload media asset.');
      }
    } catch (err: any) {
      setUploadError('Network error while uploading asset. Please retry.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
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
        if (selectedItem?.id === id) {
          setSelectedItem(null);
        }
        setDeleteWarning(null);
      } else if (res.status === 409 && json.referenced) {
        setDeleteWarning({
          id,
          message: json.error?.message || 'This asset is linked to active products.',
          refCount: json.referenceCount || 1,
        });
      } else {
        alert(json.error?.message || 'Unable to delete media asset.');
      }
    } catch {
      alert('Network error while deleting media asset.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSelectCurrent = () => {
    if (!selectedItem) return;
    onSelect({
      id: selectedItem.id,
      url: selectedItem.url,
      title: selectedItem.title,
      thumbnailUrl: selectedItem.thumbnailUrl,
      category: selectedItem.category,
      width: selectedItem.width,
      height: selectedItem.height,
    });
    onClose();
  };

  if (!isOpen) return null;

  const currentGuidelines = CATEGORY_DIMENSION_GUIDELINES[uploadCategory];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border border-[#D5D9D9]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#232F3E] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <ImageIcon className="w-5 h-5 text-[#FF9900]" />
            <div>
              <h2 className="text-sm font-bold tracking-wide">{title}</h2>
              <p className="text-[11px] text-gray-300">
                Centralized High-Resolution Asset Management for Catalog & A+ Content
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls & Filter Bar */}
        <div className="px-6 py-2.5 bg-[#F7F8F8] border-b border-[#D5D9D9] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('library')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors ${
                activeTab === 'library'
                  ? 'bg-white text-[#0F1111] shadow-sm border border-[#D5D9D9]'
                  : 'text-[#565959] hover:text-[#0F1111]'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Asset Library ({items.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors ${
                activeTab === 'upload'
                  ? 'bg-white text-[#0F1111] shadow-sm border border-[#D5D9D9]'
                  : 'text-[#565959] hover:text-[#0F1111]'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload New Asset</span>
            </button>
          </div>

          {activeTab === 'library' && (
            <div className="flex items-center gap-2 flex-1 max-w-md ml-auto">
              {/* Category Filter Pills */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs bg-white border border-[#D5D9D9] rounded-md px-2.5 py-1.5 font-medium text-[#0F1111] focus:outline-none focus:border-[#007185]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>

              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#565959]" />
                <input
                  type="text"
                  placeholder="Search assets by title, filename or tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#D5D9D9] rounded-md bg-white focus:outline-none focus:border-[#007185]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {activeTab === 'library' ? (
            <>
              {/* Media Grid */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6">
                {deleteWarning && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Active Reference Warning</p>
                        <p className="mt-0.5">{deleteWarning.message}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleDelete(deleteWarning.id, true)}
                        className="px-2.5 py-1 bg-rose-600 text-white rounded font-bold hover:bg-rose-700 text-[11px]"
                      >
                        Force Delete
                      </button>
                      <button
                        onClick={() => setDeleteWarning(null)}
                        className="px-2.5 py-1 bg-gray-200 text-gray-700 rounded font-semibold text-[11px]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {loading ? (
                  <div className="py-20 text-center space-y-2">
                    <CometSpinner className="h-12 w-12 mx-auto block text-[#007185]" />
                    <p className="text-xs text-[#565959]">Loading media assets...</p>
                  </div>
                ) : items.length === 0 ? (
                  <div className="py-20 text-center space-y-3">
                    <ImageIcon className="w-10 h-10 text-gray-300 mx-auto" />
                    <p className="text-xs font-bold text-[#0F1111]">No media assets found</p>
                    <p className="text-[11px] text-[#565959] max-w-sm mx-auto">
                      No assets match your search or filter. Upload your first high-resolution photo or swatch image.
                    </p>
                    <button
                      onClick={() => setActiveTab('upload')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FFD814] hover:bg-[#F7CA00] text-black text-xs font-bold rounded-lg"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Asset</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {items.map((item) => {
                      const isSelected = selectedItem?.id === item.id;
                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedItem(item)}
                          className={`group relative rounded-lg border overflow-hidden cursor-pointer bg-white transition-all ${
                            isSelected
                              ? 'border-[#007185] ring-2 ring-[#007185]/30 shadow-md'
                              : 'border-[#D5D9D9] hover:border-[#007185]/60 hover:shadow-sm'
                          }`}
                        >
                          {/* Image Box */}
                          <div className="aspect-square bg-[#F7F8F8] overflow-hidden relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.thumbnailUrl || item.url}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {isSelected && (
                              <div className="absolute top-2 right-2 w-5 h-5 bg-[#007185] text-white rounded-full flex items-center justify-center shadow">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            )}
                            <div className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
                              {item.width && item.height ? `${item.width}×${item.height}` : 'Photo'}
                            </div>
                          </div>

                          {/* Info Box */}
                          <div className="p-2">
                            <p className="text-[11px] font-bold text-[#0F1111] truncate" title={item.title}>
                              {item.title}
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-[#565959] mt-0.5">
                              <span className="capitalize">{item.category.toLowerCase().replace('_', ' ')}</span>
                              <span>{(item.fileSize / 1024).toFixed(0)} KB</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Asset Detail & Action Sidebar */}
              <div className="w-full md:w-80 bg-[#F7F8F8] border-t md:border-t-0 md:border-l border-[#D5D9D9] p-4 flex flex-col justify-between shrink-0">
                {selectedItem ? (
                  <div className="space-y-4">
                    {/* Selected Image Preview */}
                    <div className="aspect-square rounded-lg border border-[#D5D9D9] bg-white overflow-hidden shadow-sm relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedItem.url}
                        alt={selectedItem.title}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {/* Metadata Specs */}
                    <div className="space-y-1.5 text-xs text-[#0F1111]">
                      <p className="font-bold text-sm leading-snug">{selectedItem.title}</p>
                      <p className="text-[11px] text-[#565959] font-mono truncate">{selectedItem.fileName}</p>

                      <div className="pt-2 border-t border-[#D5D9D9] space-y-1 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-[#565959]">Category:</span>
                          <span className="font-semibold">{selectedItem.category.replace('_', ' ')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#565959]">Resolution:</span>
                          <span className="font-mono font-semibold">
                            {selectedItem.width && selectedItem.height
                              ? `${selectedItem.width} × ${selectedItem.height} px`
                              : 'Standard'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#565959]">Size:</span>
                          <span className="font-mono">{(selectedItem.fileSize / 1024).toFixed(1)} KB</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#565959]">MIME Format:</span>
                          <span className="font-mono">{selectedItem.mimeType}</span>
                        </div>
                        {selectedItem.referenceCount > 0 && (
                          <div className="flex justify-between text-emerald-700 font-semibold">
                            <span>Active References:</span>
                            <span>{selectedItem.referenceCount} product(s)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-[#565959]">
                    <Info className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                    Select an asset from the grid to view details and insert.
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="pt-4 border-t border-[#D5D9D9] space-y-2">
                  <button
                    type="button"
                    disabled={!selectedItem}
                    onClick={handleSelectCurrent}
                    className="w-full py-2 bg-[#FFD814] hover:bg-[#F7CA00] disabled:bg-gray-200 disabled:text-gray-400 text-black text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    <span>Select & Use Asset</span>
                  </button>

                  {selectedItem && (
                    <button
                      type="button"
                      disabled={deletingId === selectedItem.id}
                      onClick={() => handleDelete(selectedItem.id, false)}
                      className="w-full py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded font-semibold flex items-center justify-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{deletingId === selectedItem.id ? 'Deleting...' : 'Delete Asset'}</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Upload Tab */
            <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full">
              <form onSubmit={handleUploadSubmit} className="space-y-5">
                {uploadError && (
                  <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg text-xs text-rose-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {/* Category Selection */}
                <div>
                  <label className="block text-xs font-bold text-[#0F1111] mb-1">Asset Category</label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#D5D9D9] rounded-lg bg-white font-medium text-[#0F1111] focus:outline-none focus:border-[#007185]"
                  >
                    <option value="PRODUCT_GALLERY">Product Gallery (Main catalog photo)</option>
                    <option value="COLOR_SWATCH">Color Swatch (Variant color thumbnail)</option>
                    <option value="APLUS_CONTENT">A+ Content (Editorial rich module image)</option>
                    <option value="BRAND_ASSET">Brand Asset (Storefront logo/crest)</option>
                  </select>
                  {currentGuidelines && (
                    <p className="text-[11px] text-[#565959] mt-1">
                      Recommended: {currentGuidelines.recommendedWidth}×{currentGuidelines.recommendedHeight}px ({currentGuidelines.aspectRatioLabel}). Min: {currentGuidelines.minWidth}×{currentGuidelines.minHeight}px.
                    </p>
                  )}
                </div>

                {/* Drop Zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#D5D9D9] hover:border-[#007185] bg-[#F7F8F8] rounded-xl p-8 text-center cursor-pointer transition-colors group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {uploadPreview ? (
                    <div className="space-y-3">
                      <div className="w-32 h-32 mx-auto rounded-lg overflow-hidden border border-[#D5D9D9] bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={uploadPreview} alt="Upload preview" className="w-full h-full object-cover" />
                      </div>
                      <p className="text-xs font-bold text-[#0F1111]">{uploadFile?.name}</p>
                      <p className="text-[11px] text-[#007185] group-hover:underline">Click to choose a different image</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-10 h-10 text-[#007185] mx-auto group-hover:scale-110 transition-transform" />
                      <p className="text-xs font-bold text-[#0F1111]">
                        Drag and drop your image here, or <span className="text-[#007185]">browse</span>
                      </p>
                      <p className="text-[11px] text-[#565959]">
                        Supported formats: JPG, PNG, WebP (Max 10 MB, Swatches max 2 MB)
                      </p>
                    </div>
                  )}
                </div>

                {/* Title & Tags */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#0F1111] mb-1">Asset Title</label>
                    <input
                      type="text"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      placeholder="e.g. Banarasi Katan Silk Gold Pallu"
                      className="w-full px-3 py-2 text-xs border border-[#D5D9D9] rounded-lg bg-white focus:outline-none focus:border-[#007185]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#0F1111] mb-1">Tags (Comma-separated)</label>
                    <input
                      type="text"
                      value={uploadTags}
                      onChange={(e) => setUploadTags(e.target.value)}
                      placeholder="e.g. silk, saree, zari, festive"
                      className="w-full px-3 py-2 text-xs border border-[#D5D9D9] rounded-lg bg-white focus:outline-none focus:border-[#007185]"
                    />
                  </div>
                </div>

                {/* Upload Progress */}
                {isUploading && (
                  <div className="space-y-1">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#007185] transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-center text-[#565959]">Uploading and validating media binary...</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={!uploadFile || isUploading}
                  className="w-full py-2.5 bg-[#FFD814] hover:bg-[#F7CA00] disabled:bg-gray-200 disabled:text-gray-400 text-black text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                >
                  {isUploading ? (
                    <>
                      <CometSpinner className="h-4 w-4 text-[#007185]" decorative />
                      <span>Validating & Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Complete Upload to Library</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
