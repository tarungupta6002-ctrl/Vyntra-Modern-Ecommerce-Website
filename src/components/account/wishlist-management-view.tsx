'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Heart,
  ShoppingBag,
  Trash2,
  Share2,
  Plus,
  TrendingDown,
  CheckCircle,
  Clock,
  Sparkles,
  MapPin,
  Star,
  Zap,
  SlidersHorizontal,
  X,
  MessageSquare,
  Bell,
  Headphones,
  Check,
  Diamond,
  FolderPlus,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  Info,
  Layers,
} from 'lucide-react';
import {
  WishlistItem,
  CuratedBoard,
  useWishlistStore,
} from '@/store/wishlist-store';
import { useCartStore } from '@/store/cart-store';
import { useAddressStore } from '@/store/address-store';
import { formatINR } from '@/lib/utils';

interface WishlistManagementViewProps {
  embeddedInAccount?: boolean;
}

export function WishlistManagementView({
  embeddedInAccount = false,
}: WishlistManagementViewProps) {
  const [mounted, setMounted] = useState(false);
  const {
    items,
    boards,
    activeBoardId,
    filterPriceDrops,
    filterInStock,
    removeItem,
    createBoard,
    setActiveBoardId,
    setFilterPriceDrops,
    setFilterInStock,
    moveItemToCart,
    moveAllInStockToCart,
  } = useWishlistStore();

  const { openCart } = useCartStore();

  // Modals
  const [boardModalOpen, setBoardModalOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardTheme, setNewBoardTheme] = useState('Festive Celebration (Diwali / Puja)');
  const [isPublicBoard, setIsPublicBoard] = useState(true);

  // Quick size selection modal / popover
  const [sizePickerItem, setSizePickerItem] = useState<WishlistItem | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');

  // Restock alert state
  const [restockAlertIds, setRestockAlertIds] = useState<Record<string, boolean>>({});

  const { getDefaultAddress, getSelectedAddress } = useAddressStore();
  const activeAddress = getSelectedAddress() || getDefaultAddress();

  // Batch transfer loading state
  const [isTransferringAll, setIsTransferringAll] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type?: 'success' | 'info' | 'error';
  }>({
    show: false,
    message: '',
  });

  const showToast = (
    message: string,
    type: 'success' | 'info' | 'error' = 'success'
  ) => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3500);
  };

  useEffect(() => {
    setMounted(true);
    useWishlistStore.getState().syncWithDatabase();
    useWishlistStore.getState().setFilterPriceDrops(false);
    useWishlistStore.getState().setFilterInStock(false);
  }, []);

  // Filtered Items Logic
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Board Filter
      if (activeBoardId !== 'all') {
        if (!item.boardIds || !item.boardIds.includes(activeBoardId)) {
          return false;
        }
      }

      // 2. Price Drops Only Filter
      if (filterPriceDrops && !item.priceDropNote && !item.badge?.includes('Price Drop')) {
        return false;
      }

      // 3. In Stock Only Filter
      if (filterInStock && !item.inStock) {
        return false;
      }

      return true;
    });
  }, [items, activeBoardId, filterPriceDrops, filterInStock]);

  const priceDropCount = useMemo(() => {
    return items.filter((i) => i.priceDropNote || i.badge?.includes('Price Drop')).length;
  }, [items]);

  const inStockCount = useMemo(() => {
    return items.filter((i) => i.inStock).length;
  }, [items]);

  // Handlers
  const handleShareWishlist = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      showToast('Wishlist link copied to clipboard! Ready to share.', 'success');
    }
  };

  const handleCreateBoard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardName.trim()) {
      showToast('Please enter a board title', 'error');
      return;
    }

    createBoard(newBoardName.trim(), newBoardTheme, isPublicBoard);
    showToast(`Curated board "${newBoardName.trim()}" created!`, 'success');
    setNewBoardName('');
    setBoardModalOpen(false);
  };

  const handleMoveAllToBag = () => {
    setIsTransferringAll(true);
    setTimeout(() => {
      const moved = moveAllInStockToCart();
      setIsTransferringAll(false);
      showToast(`${moved} in-stock items transferred to your Bag!`, 'success');
      openCart();
    }, 600);
  };

  const handleQuickMoveToBag = (item: WishlistItem) => {
    moveItemToCart(item, item.selectedSize);
    showToast(`Added ${item.title} to your Bag!`, 'success');
  };

  const handleToggleRestock = (item: WishlistItem) => {
    const isSubscribed = !!restockAlertIds[item.id];
    setRestockAlertIds((prev) => ({ ...prev, [item.id]: !isSubscribed }));
    if (!isSubscribed) {
      showToast(`Restock alert set for ${item.title}. You'll receive instant notification!`, 'info');
    } else {
      showToast(`Restock alert turned off for ${item.title}.`, 'info');
    }
  };

  const handleRemove = async (item: WishlistItem) => {
    try {
      await removeItem(item.id);
      showToast(`Removed "${item.title}" from your wishlist.`, 'info');
    } catch (err: any) {
      showToast(err?.message || `Failed to remove item.`, 'error');
    }
  };

  if (!mounted) {
    return (
      <div className="w-full min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#007185] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[#565959] font-medium">Loading your curated wishlist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-8 pb-12 antialiased text-[#0F1111]">
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

      {/* Breadcrumbs & Top Priority Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {!embeddedInAccount ? (
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-label text-[#565959]">
            <Link href="/" className="hover:text-[#007185] transition-colors flex items-center gap-1">
              Home
            </Link>
            <span className="text-[#c4c5d5]">/</span>
            <Link href="/account" className="hover:text-[#007185] transition-colors">
              My Account
            </Link>
            <span className="text-[#c4c5d5]">/</span>
            <span className="text-[#007185] font-semibold">Wishlist &amp; Curated Collections</span>
          </nav>
        ) : (
          <div className="text-xs font-bold text-[#565959] uppercase tracking-wider">
            Curated Collections Desk
          </div>
        )}

        <div className="flex items-center gap-2 text-xs font-label text-[#904d00] font-semibold bg-[#FFE4B5]/60 px-3 py-1 rounded-full border border-[#FFE4B5]">
          <Diamond className="h-3.5 w-3.5 fill-[#FF9900] text-[#FF9900]" />
          <span>Royal Tier Priority Allocation Enabled</span>
        </div>
      </div>

      {/* Header Banner & Batch Actions */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 pb-6 border-b border-[#D5D9D9]">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-headline font-extrabold text-2xl lg:text-3xl text-[#0F1111] tracking-tight">
              My Wishlist &amp; Curated Boards
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#D5D9D9] text-[#007185] font-label text-xs font-bold rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF9900]" />
              {items.length} Items Saved • {priceDropCount} Festive Price Drops
            </span>
          </div>
          <p className="font-body text-sm text-[#444653] max-w-2xl leading-relaxed">
            Curate bespoke selections for upcoming celebrations, track instantaneous price reductions, and migrate authentic heritage items to your bag with complimentary royal delivery.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleShareWishlist}
            className="h-10 px-4 rounded-xl bg-white text-[#0F1111] hover:bg-[#F7F8F8] text-xs font-label font-semibold shadow-sm border border-[#D5D9D9] transition-all flex items-center gap-2"
          >
            <Share2 className="h-4 w-4 text-[#565959]" />
            <span>Share Wishlist</span>
          </button>

          <button
            type="button"
            onClick={() => setBoardModalOpen(true)}
            className="h-10 px-4 rounded-xl bg-white text-[#007185] hover:bg-[#D5D9D9] text-xs font-label font-bold shadow-sm border border-[#D5D9D9] transition-all flex items-center gap-2"
          >
            <FolderPlus className="h-4 w-4" />
            <span>Create Board</span>
          </button>

          <button
            type="button"
            disabled={isTransferringAll || inStockCount === 0}
            onClick={handleMoveAllToBag}
            className={`h-10 px-5 rounded-xl font-label font-bold text-xs shadow-md transition-all flex items-center gap-2 ${
              inStockCount === 0
                ? 'bg-[#c4c5d5] text-white cursor-not-allowed'
                : 'bg-[#007185] text-white hover:bg-[#004B57] active:scale-[0.98]'
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            <span>
              {isTransferringAll
                ? 'Transferring to Bag...'
                : `Move In-Stock to Bag (${inStockCount})`}
            </span>
          </button>
        </div>
      </div>

      {/* Board Tabs & Quick Dynamic Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 py-2">
        {/* Boards Horizontal Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
          {boards.map((board) => {
            const isActive = activeBoardId === board.id;
            const count =
              board.id === 'all'
                ? items.length
                : items.filter((i) => i.boardIds.includes(board.id)).length;

            return (
              <button
                key={board.id}
                type="button"
                onClick={() => setActiveBoardId(board.id)}
                className={`px-4 py-2 rounded-full text-xs font-label transition-all whitespace-nowrap shadow-xs ${
                  isActive
                    ? 'bg-[#007185] text-white font-bold shadow-sm'
                    : 'bg-white text-[#444653] hover:bg-[#F7F8F8] hover:text-[#0F1111] border border-[#D5D9D9] font-medium'
                }`}
              >
                {board.title} ({count})
              </button>
            );
          })}
        </div>

        {/* Quick Dynamic Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setFilterPriceDrops(!filterPriceDrops)}
            className={`h-8 px-3 rounded-full text-[11px] font-label font-bold flex items-center gap-1.5 shadow-xs transition-all border ${
              filterPriceDrops
                ? 'bg-[#FFE4B5] text-[#0F1111] border-[#FFE4B5] ring-1 ring-[#FF9900]'
                : 'bg-white text-[#444653] hover:bg-[#F7F8F8] border-[#D5D9D9]'
            }`}
          >
            <TrendingDown className="h-3.5 w-3.5 text-[#FF9900]" />
            <span>Price Drops ({priceDropCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterInStock(!filterInStock)}
            className={`h-8 px-3 rounded-full text-[11px] font-label font-medium flex items-center gap-1.5 shadow-xs transition-all border ${
              filterInStock
                ? 'bg-[#e2e7ff] text-[#007185] font-bold border-[#007185]'
                : 'bg-white text-[#444653] hover:bg-[#F7F8F8] border-[#D5D9D9]'
            }`}
          >
            <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
            <span>In Stock Only ({inStockCount})</span>
          </button>

          <div className="h-8 px-3 rounded-full bg-white text-[#444653] text-[11px] font-label flex items-center gap-1.5 shadow-xs border border-[#D5D9D9]">
            <MapPin className="h-3.5 w-3.5 text-[#007185]" />
            <span className="text-[#0F1111] font-semibold">
              {activeAddress ? `${activeAddress.city} ${activeAddress.pincode}` : 'Pan-India Delivery'}
            </span>
            <span className="text-[#FF9900] font-bold text-[10px]">Express 24H</span>
          </div>
        </div>
      </div>

      {/* Wishlist Bento / Grid Layout */}
      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[#c4c5d5] bg-white p-12 text-center flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#F7F8F8] text-[#007185] flex items-center justify-center shadow-inner">
            <Heart className="h-8 w-8 text-[#007185]" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="font-headline font-bold text-lg text-[#0F1111]">
              No Items Found in this Collection
            </h3>
            <p className="text-xs text-[#565959] leading-relaxed">
              {filterPriceDrops || filterInStock
                ? 'Try turning off price drop or in-stock filters to view other saved heritage pieces.'
                : 'Explore our master-crafted couture and save artisanal pieces to your wishlist.'}
            </p>
          </div>
          <div className="flex items-center gap-3 mt-2">
            {(filterPriceDrops || filterInStock) && (
              <button
                type="button"
                onClick={() => {
                  setFilterPriceDrops(false);
                  setFilterInStock(false);
                  setActiveBoardId('all');
                }}
                className="px-4 py-2 rounded-xl bg-[#F7F8F8] text-[#007185] text-xs font-bold hover:bg-[#D5D9D9]"
              >
                Reset Filters
              </button>
            )}
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#007185] text-white text-xs font-bold shadow-sm hover:bg-[#004B57] transition-all"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Explore Marketplace</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => {
            const hasRestockAlert = !!restockAlertIds[item.id];

            return (
              <div
                key={item.id}
                className="group relative flex flex-col bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-[#D5D9D9]"
              >
                {/* Media Canvas */}
                <div className="relative w-full aspect-[3/4] bg-[#F7F8F8] overflow-hidden">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className={`object-cover group-hover:scale-105 transition-transform duration-500 ${
                      !item.inStock ? 'filter grayscale-[25%]' : ''
                    }`}
                  />

                  {/* Top Left Floating Badge */}
                  {item.badge && (
                    <div
                      className={`absolute top-3 left-3 px-2.5 py-1 rounded-md text-[10px] font-label font-bold uppercase tracking-wider shadow-sm flex items-center gap-1 ${
                        item.badgeColor === 'secondary'
                          ? 'bg-[#FF9900] text-white'
                          : item.badgeColor === 'error'
                          ? 'bg-rose-600 text-white'
                          : item.badgeColor === 'dark'
                          ? 'bg-[#0F1111] text-white'
                          : 'bg-[#007185] text-white'
                      }`}
                    >
                      {item.badge.includes('Price Drop') && (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      <span>{item.badge}</span>
                    </div>
                  )}

                  {/* Top Right Remove Action */}
                  <button
                    type="button"
                    onClick={() => handleRemove(item)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md text-[#565959] hover:text-rose-600 flex items-center justify-center transition-colors shadow-sm"
                    title="Remove from Wishlist"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  {/* Bottom Left Stock / Availability Pill */}
                  {item.stockNote && (
                    <div
                      className={`absolute bottom-3 left-3 text-[11px] font-label font-bold px-2 py-0.5 rounded-full backdrop-blur-sm flex items-center gap-1 ${
                        !item.inStock
                          ? 'bg-rose-100 text-rose-800'
                          : item.stockNote.includes('Only') || item.stockNote.includes('Low')
                          ? 'bg-rose-100/90 text-rose-700'
                          : 'bg-white/90 text-[#0F1111]'
                      }`}
                    >
                      {item.stockNote.includes('Only') && (
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                      )}
                      {item.express24h && (
                        <Zap className="h-3 w-3 text-[#007185] fill-[#007185]" />
                      )}
                      <span>{item.stockNote}</span>
                    </div>
                  )}
                </div>

                {/* Info Block */}
                <div className="p-4 flex flex-col flex-1 justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[11px] text-[#565959] uppercase font-label font-bold tracking-wider">
                      <span className="truncate">{item.brand}</span>
                      {item.brandTag && (
                        <span className="text-[#007185] font-semibold">{item.brandTag}</span>
                      )}
                    </div>

                    <Link
                      href={`/products/${item.slug}`}
                      className="font-headline font-bold text-sm text-[#0F1111] line-clamp-1 group-hover:text-[#007185] transition-colors"
                      title={item.title}
                    >
                      {item.title}
                    </Link>

                    <p className="font-body text-xs text-[#444653] line-clamp-1">
                      {item.subtitle}
                    </p>

                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="font-label font-bold text-base text-[#0F1111]">
                        {formatINR(item.price)}
                      </span>
                      <span className="font-body text-xs text-[#565959] line-through">
                        {formatINR(item.originalPrice)}
                      </span>
                      <span className="font-label text-xs font-bold text-[#904d00]">
                        {item.discount}
                      </span>
                    </div>
                  </div>

                  {/* Card Action Row */}
                  <div className="flex items-center gap-2 pt-2 border-t border-[#D5D9D9]">
                    {item.inStock ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleQuickMoveToBag(item)}
                          className="flex-1 py-[5px] px-[11px] h-[31px] bg-[#FFD814] text-[#0F1111] hover:bg-[#F7CA00] border border-[#FCD200] rounded-full text-[14px] font-normal shadow-sm transition-all flex items-center justify-center"
                        >
                          <span>Add to cart</span>
                        </button>

                        {item.sizeOptions && item.sizeOptions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSizePickerItem(item);
                              setSelectedSize(item.selectedSize || item.sizeOptions![0]);
                            }}
                            className="w-9 h-9 bg-[#F7F8F8] hover:bg-[#D5D9D9] text-[#444653] hover:text-[#007185] rounded-xl flex items-center justify-center transition-colors"
                            title="Select Size Options"
                          >
                            <SlidersHorizontal className="h-4 w-4" />
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleToggleRestock(item)}
                          className={`flex-1 h-9 rounded-xl text-xs font-label font-bold transition-all flex items-center justify-center gap-1.5 ${
                            hasRestockAlert
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-[#D5D9D9] text-[#0F1111] hover:bg-[#dae2fd]'
                          }`}
                        >
                          <Bell className="h-3.5 w-3.5 text-[#007185]" />
                          <span>{hasRestockAlert ? 'Alert Set' : 'Notify Restock'}</span>
                        </button>

                        {item.sizeOptions && (
                          <select
                            defaultValue={item.selectedSize || item.sizeOptions[0]}
                            className="h-9 px-2 bg-[#F7F8F8] rounded-xl text-xs font-label text-[#0F1111] focus:outline-none border border-[#D5D9D9]"
                          >
                            {item.sizeOptions.map((sz) => (
                              <option key={sz} value={sz}>
                                {sz}
                              </option>
                            ))}
                          </select>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Create New Curated Board Tile (matches Stitch card 8) */}
          <div
            onClick={() => setBoardModalOpen(true)}
            className="group cursor-pointer flex flex-col items-center justify-center p-8 bg-[#F7F8F8]/70 hover:bg-[#D5D9D9] rounded-2xl border-2 border-dashed border-[#c4c5d5] hover:border-[#007185] transition-all duration-300 text-center min-h-[360px]"
          >
            <div className="w-16 h-16 rounded-full bg-[#dde1ff] text-[#007185] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
              <FolderPlus className="h-8 w-8 text-[#007185]" />
            </div>
            <h3 className="font-headline font-bold text-base text-[#0F1111] mb-2">
              Create a New Curated Board
            </h3>
            <p className="font-body text-xs text-[#444653] max-w-[200px] mb-6 leading-relaxed">
              Organize bespoke themes for weddings, family soirees, or upcoming festive giftings.
            </p>
            <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-[#007185] text-xs font-label font-bold rounded-xl shadow-sm group-hover:bg-[#007185] group-hover:text-white transition-all border border-[#D5D9D9]">
              <Plus className="h-4 w-4" />
              <span>New Board</span>
            </span>
          </div>
        </div>
      )}

      {/* Bottom Interactive Panels / Perks (from Stitch) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
        {/* Wishlist Smart Alerts Pill Card */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-6 bg-white rounded-2xl shadow-sm border border-[#D5D9D9]">
          <div className="w-14 h-14 rounded-2xl bg-[#FFE4B5] flex items-center justify-center shrink-0">
            <Bell className="h-7 w-7 text-[#904d00]" />
          </div>
          <div className="flex flex-col flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-headline font-bold text-base text-[#0F1111]">
                Wishlist Smart Price Alerts
              </h4>
              <span className="px-2 py-0.5 bg-[#FF9900] text-white text-[10px] font-label font-bold rounded">
                ACTIVE
              </span>
            </div>
            <p className="font-body text-xs text-[#444653] leading-relaxed">
              You receive real-time SMS &amp; WhatsApp prompts the moment your saved pieces drop in price or sizes get restocked.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-3">
              <label className="flex items-center gap-2 text-xs font-label text-[#0F1111] cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="accent-[#007185] rounded"
                />
                <span>WhatsApp (+91 98450 •••••)</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-label text-[#0F1111] cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="accent-[#007185] rounded"
                />
                <span>App Notifications</span>
              </label>
            </div>
          </div>
        </div>

        {/* Private Shopping Assistant Concierge */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-6 bg-gradient-to-br from-[#004B57] to-[#007185] text-white rounded-2xl shadow-md relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0 relative z-10">
            <Headphones className="h-7 w-7 text-white" />
          </div>
          <div className="flex flex-col flex-1 relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-headline font-bold text-base text-white">
                VYNTRA Royal Styling Concierge
              </h4>
              <span className="px-2 py-0.5 bg-[#FF9900] text-white text-[10px] font-label font-bold rounded">
                COMPLIMENTARY
              </span>
            </div>
            <p className="font-body text-xs text-white/80 leading-relaxed">
              Need matching footwear for the raw silk stole or sizing clarity for the bandhgala? Speak directly with our dedicated curator.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <button
                type="button"
                onClick={() =>
                  showToast(
                    'Opening live chat with Royal Curator Arya Sen...',
                    'info'
                  )
                }
                className="px-4 py-1.5 rounded-xl bg-white text-[#007185] hover:bg-[#F7F8F8] text-xs font-label font-bold shadow-sm transition-all flex items-center gap-1.5"
              >
                <MessageSquare className="h-4 w-4" />
                <span>1-Click Stylist Chat</span>
              </button>
              <span className="text-[11px] text-white/70 font-label">
                Available 9 AM – 10 PM IST
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: Create Curated Board Modal */}
      {/* ========================================================= */}
      {boardModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 flex flex-col gap-4 border border-[#D5D9D9]">
            <div className="flex items-center justify-between pb-2 border-b border-[#D5D9D9]">
              <h3 className="font-headline font-bold text-lg text-[#0F1111]">
                Create Curated Board
              </h3>
              <button
                type="button"
                onClick={() => setBoardModalOpen(false)}
                className="p-1 rounded-lg text-[#565959] hover:bg-[#F7F8F8]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBoard} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-label font-bold uppercase tracking-wider text-[#565959] mb-1">
                  Board Name *
                </label>
                <input
                  type="text"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  placeholder="e.g. Sangeet Evening, Jaipur Holiday"
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F7F8F8] text-sm text-[#0F1111] placeholder:text-[#565959] focus:outline-none focus:bg-white border border-[#D5D9D9] focus:border-[#007185] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-label font-bold uppercase tracking-wider text-[#565959] mb-1">
                  Occasion / Theme
                </label>
                <select
                  value={newBoardTheme}
                  onChange={(e) => setNewBoardTheme(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F7F8F8] text-sm text-[#0F1111] focus:outline-none focus:bg-white border border-[#D5D9D9] focus:border-[#007185] transition-all"
                >
                  <option>Festive Celebration (Diwali / Puja)</option>
                  <option>Wedding &amp; Royal Soirée</option>
                  <option>Everyday Heritage Chic</option>
                  <option>Bespoke Gifting</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="public-board"
                  checked={isPublicBoard}
                  onChange={(e) => setIsPublicBoard(e.target.checked)}
                  className="accent-[#007185] w-4 h-4 rounded"
                />
                <label
                  htmlFor="public-board"
                  className="text-xs font-body text-[#0F1111] cursor-pointer"
                >
                  Allow family and friends with link to view this board
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#D5D9D9]">
                <button
                  type="button"
                  onClick={() => setBoardModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-label font-semibold text-[#444653] hover:bg-[#F7F8F8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-label font-bold bg-[#007185] text-white hover:bg-[#004B57] shadow-sm"
                >
                  Save Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: Size Variant Selector */}
      {/* ========================================================= */}
      {sizePickerItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5 flex flex-col gap-4 border border-[#D5D9D9]">
            <div className="flex items-center justify-between pb-2 border-b border-[#D5D9D9]">
              <div>
                <h4 className="font-headline font-bold text-sm text-[#0F1111]">
                  Select Variant / Size
                </h4>
                <p className="text-xs text-[#565959] truncate max-w-[220px]">
                  {sizePickerItem.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSizePickerItem(null)}
                className="p-1 rounded-lg text-[#565959] hover:bg-[#F7F8F8]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {sizePickerItem.sizeOptions?.map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setSelectedSize(sz)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold text-left transition-all flex items-center justify-between border ${
                    selectedSize === sz
                      ? 'bg-[#dde1ff] border-[#007185] text-[#007185] font-bold'
                      : 'bg-[#F7F8F8] border-[#D5D9D9] text-[#0F1111] hover:bg-[#D5D9D9]'
                  }`}
                >
                  <span>{sz}</span>
                  {selectedSize === sz && <Check className="h-4 w-4 stroke-[3]" />}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D5D9D9]">
              <button
                type="button"
                onClick={() => setSizePickerItem(null)}
                className="px-3.5 py-2 text-xs font-semibold text-[#444653] hover:bg-[#F7F8F8] rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  moveItemToCart(sizePickerItem, selectedSize);
                  showToast(
                    `Added ${sizePickerItem.title} (${selectedSize}) to Bag!`,
                    'success'
                  );
                  setSizePickerItem(null);
                }}
                className="px-4 py-2 text-xs font-bold bg-[#007185] text-white hover:bg-[#004B57] rounded-xl shadow-sm"
              >
                Add with {selectedSize}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
