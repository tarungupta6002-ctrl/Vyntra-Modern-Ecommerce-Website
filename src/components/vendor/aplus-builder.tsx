'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Layout,
  Image as ImageIcon,
  Type,
  Eye,
  Sliders,
  CheckCircle2,
  Layers,
  Store,
  Grid,
  Columns,
  BookOpen,
  FolderOpen,
} from 'lucide-react';
import { APlusData, APlusModule, APlusModuleType, APlusHeaderStyle, createDefaultAPlusContent } from '@/types/aplus';
import { MediaPickerModal, SelectedMedia } from '@/components/media/media-picker-modal';

interface APlusBuilderProps {
  aplusData: APlusData;
  onChange: (data: APlusData) => void;
  brandName?: string;
}

const MODULE_DEFINITIONS: Array<{
  type: APlusModuleType;
  title: string;
  desc: string;
  icon: React.ElementType;
}> = [
  {
    type: 'hero_banner',
    title: 'Full-Width Image Banner (Standard Amazon A+)',
    desc: 'Full-width edge-to-edge product banner (970x600, 970x300, or any brand graphic)',
    icon: Layout,
  },
  {
    type: 'image_text_split',
    title: 'Image with Text (Split Layout)',
    desc: 'Editorial side-by-side photo with craft narrative (Left/Right)',
    icon: Columns,
  },
  {
    type: 'feature_cards_3',
    title: 'Three Feature Cards',
    desc: '3 responsive cards with photo headers, titles, and descriptions',
    icon: Grid,
  },
  {
    type: 'feature_cards_4',
    title: 'Four Feature Cards',
    desc: '4 compact feature cards for technical highlights or key values',
    icon: Grid,
  },
  {
    type: 'lifestyle_gallery',
    title: 'Lifestyle Image Gallery',
    desc: '3-photo lookbook showcase highlighting real-world drape & style',
    icon: ImageIcon,
  },
  {
    type: 'craftsmanship_story',
    title: 'Material & Craftsmanship Standard',
    desc: 'Deep-dive with stat badges (Artisan Hours, Purity Standard)',
    icon: Sparkles,
  },
  {
    type: 'product_highlights',
    title: 'Product Highlights Grid',
    desc: 'Checkmarked hallmark points highlighting unique handloom features',
    icon: CheckCircle2,
  },
  {
    type: 'care_and_size',
    title: 'Care Instructions & Size Matrix',
    desc: 'Detailed longevity washing guide and standard inches sizing chart',
    icon: Sliders,
  },
  {
    type: 'brand_story',
    title: 'Brand Story & Atelier Philosophy',
    desc: 'Generational atelier narrative with founder quote & signature',
    icon: BookOpen,
  },
  {
    type: 'promo_banner',
    title: 'Promotional Brand Banner',
    desc: 'Full-width visual graphic creative for seasonal edits & collections',
    icon: Layers,
  },
];

export function APlusBuilder({ aplusData, onChange, brandName = 'Official Brand' }: APlusBuilderProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [highlightedModuleId, setHighlightedModuleId] = useState<string | null>(null);

  // Central Media Manager Integration (Phase 6)
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [mediaModuleIdx, setMediaModuleIdx] = useState<number | null>(null);
  const [mediaFieldKey, setMediaFieldKey] = useState<string>('imageUrl');

  const openPickerForModule = (idx: number, field: string = 'imageUrl') => {
    setMediaModuleIdx(idx);
    setMediaFieldKey(field);
    setIsMediaModalOpen(true);
  };

  const handleSelectModuleMedia = (asset: SelectedMedia) => {
    if (mediaModuleIdx !== null) {
      handleUpdateModule(mediaModuleIdx, { [mediaFieldKey]: asset.url });
    }
  };

  // Update header configuration
  const handleUpdateHeader = (field: keyof APlusData, value: any) => {
    onChange({
      ...aplusData,
      [field]: value,
    });
  };

  // Add new module
  const handleAddModule = (type: APlusModuleType) => {
    const newId = `mod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    let newMod: APlusModule = {
      id: newId,
      type,
      title: type === 'hero_banner' ? '' : 'Product Features',
      description: type === 'hero_banner' ? '' : 'Highlight the key qualities, craftsmanship, and benefits of your product.',
      imageUrl: '',
    };

    if (type === 'hero_banner') {
      newMod.subtitle = '';
      newMod.badgeText = '';
    } else if (type === 'image_text_split') {
      newMod.imagePosition = 'left';
      newMod.badgeText = 'PREMIUM QUALITY';
    } else if (type === 'feature_cards_3' || type === 'feature_cards_4') {
      const count = type === 'feature_cards_4' ? 4 : 3;
      newMod.cards = Array.from({ length: count }).map((_, i) => ({
        id: `card-${i + 1}`,
        title: `Feature #${i + 1}`,
        description: 'Highlight a key product feature or benefit.',
        imageUrl: '',
      }));
    } else if (type === 'lifestyle_gallery') {
      newMod.imageUrl = '';
      newMod.secondaryImageUrl = '';
      newMod.tertiaryImageUrl = '';
    } else if (type === 'craftsmanship_story') {
      newMod.stats = [
        { label: 'Quality Tested', value: '100%' },
        { label: 'Durability', value: 'High Grade' },
        { label: 'Purity Standard', value: 'Certified' },
      ];
    } else if (type === 'brand_story') {
      newMod.quote = 'Committed to delivering authentic quality, enduring style, and unmatched everyday comfort.';
      newMod.author = `${brandName} Official`;
    }

    onChange({
      ...aplusData,
      modules: [...(aplusData.modules || []), newMod],
    });
    setShowAddMenu(false);
    setHighlightedModuleId(newId);

    // Smoothly scroll down to the newly created module
    setTimeout(() => {
      const el = document.getElementById(newId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 120);

    // Fade highlight after 3.5 seconds
    setTimeout(() => {
      setHighlightedModuleId((curr) => (curr === newId ? null : curr));
    }, 3500);
  };

  // Reorder module
  const handleMoveModule = (index: number, direction: 'up' | 'down') => {
    const to = direction === 'up' ? index - 1 : index + 1;
    if (to < 0 || to >= aplusData.modules.length) return;
    const copy = [...aplusData.modules];
    const [moved] = copy.splice(index, 1);
    copy.splice(to, 0, moved);
    onChange({ ...aplusData, modules: copy });
  };

  // Update specific module
  const handleUpdateModule = (index: number, updatedFields: Partial<APlusModule>) => {
    const copy = [...aplusData.modules];
    copy[index] = { ...copy[index], ...updatedFields };
    onChange({ ...aplusData, modules: copy });
  };

  // Delete module
  const handleDeleteModule = (index: number) => {
    const copy = aplusData.modules.filter((_, i) => i !== index);
    onChange({ ...aplusData, modules: copy });
  };

  // Remove all incomplete/empty modules
  const handleRemoveEmptyModules = () => {
    const cleaned = (aplusData.modules || []).filter((mod) => {
      if (mod.type === 'feature_cards_3' || mod.type === 'feature_cards_4') {
        const hasImg = (mod.cards || []).some((c) => Boolean(c.imageUrl?.trim())) || Boolean(mod.imageUrl?.trim());
        return hasImg;
      }
      if (mod.type === 'hero_banner') return Boolean(mod.imageUrl?.trim());
      if (mod.type === 'lifestyle_gallery') {
        return Boolean(mod.imageUrl?.trim() || mod.secondaryImageUrl?.trim() || mod.tertiaryImageUrl?.trim());
      }
      return true;
    });
    onChange({ ...aplusData, modules: cleaned });
  };

  const hasIncompleteModules = (aplusData.modules || []).some((mod) => {
    if (mod.type === 'feature_cards_3' || mod.type === 'feature_cards_4') {
      return !(mod.cards || []).some((c) => Boolean(c.imageUrl?.trim())) && !mod.imageUrl?.trim();
    }
    if (mod.type === 'hero_banner') return !mod.imageUrl?.trim();
    return false;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header Banner Styling Settings */}
      <div className="p-5 rounded-xl bg-[#F7F8F8] border border-[#D5D9D9] space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#D5D9D9]">
          <Sliders className="h-4 w-4 text-[#007185]" />
          <h4 className="text-xs font-bold text-[#0F1111] uppercase tracking-wider">
            A+ Content Header Banner Configuration
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Header Title Choice */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#0F1111]">Header Title Banner</label>
            <select
              value={aplusData.headerTitle || 'FROM THE MAKER'}
              onChange={(e) => handleUpdateHeader('headerTitle', e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#D5D9D9] bg-white font-bold text-[#0F1111]"
            >
              <option value="FROM THE BRAND">FROM THE BRAND</option>
              <option value="FROM THE MAKER">FROM THE MAKER</option>
              <option value="FROM THE ARTISAN ATELIER">FROM THE ARTISAN ATELIER</option>
              <option value="FROM THE MANUFACTURER">FROM THE MANUFACTURER</option>
            </select>
          </div>

          {/* Header Theme / Gradient */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#0F1111]">Color Theme / Background</label>
            <select
              value={aplusData.headerStyle || 'maroon_luxury'}
              onChange={(e) => handleUpdateHeader('headerStyle', e.target.value as APlusHeaderStyle)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#D5D9D9] bg-white font-bold text-[#0F1111]"
            >
              <option value="maroon_luxury">Royal Maroon Luxury Gradient</option>
              <option value="gold_heritage">Regal Gold &amp; Amber Gradient</option>
              <option value="midnight_navy">Deep Sapphire Midnight Gradient</option>
              <option value="emerald_artisanal">Emerald Handloom Gradient</option>
              <option value="clean_minimal">Clean Minimal Light Border</option>
            </select>
          </div>

          {/* Subtitle */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#0F1111]">Header Subtitle (Optional)</label>
            <input
              type="text"
              value={aplusData.headerSubtitle || ''}
              onChange={(e) => handleUpdateHeader('headerSubtitle', e.target.value)}
              placeholder="e.g. Master Handloom Craftsmanship & Lineage"
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#D5D9D9] bg-white text-[#0F1111]"
            />
          </div>
        </div>
      </div>

      {/* 2. Active Modules List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#565959] uppercase tracking-wider">
              Configured A+ Content Modules ({aplusData.modules?.length || 0})
            </span>
            {hasIncompleteModules && (
              <button
                type="button"
                onClick={handleRemoveEmptyModules}
                className="px-2.5 py-0.5 rounded text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
                title="Remove modules that have no photos or content"
              >
                Clear Empty Modules
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowAddMenu(true)}
            className="px-3.5 py-1.5 rounded-lg bg-[#007185] hover:bg-[#004B57] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add A+ Module</span>
          </button>
        </div>

        {(!aplusData.modules || aplusData.modules.length === 0) ? (
          <div className="py-10 border-2 border-dashed border-[#D5D9D9] rounded-xl text-center space-y-2 bg-[#F7F8F8]">
            <Layout className="h-8 w-8 text-[#565959]/40 mx-auto" />
            <p className="text-xs font-bold text-[#0F1111]">No A+ Content modules added yet (Optional)</p>
            <p className="text-[11px] text-[#565959]">
              Add hero banners, craft spotlights, and lifestyle galleries to transform your product page into an Amazon-style flagship showcase.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddMenu(true)}
                className="px-4 py-2 bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Module</span>
              </button>
              <button
                type="button"
                onClick={() => onChange(createDefaultAPlusContent({ title: brandName || 'Artisan Atelier', brand: brandName || 'Vyntra' }))}
                className="px-4 py-2 bg-white hover:bg-stone-50 text-[#565959] text-xs font-bold rounded-lg border border-[#D5D9D9] shadow-xs flex items-center gap-1.5"
              >
                <BookOpen className="h-3.5 w-3.5 text-[#800020]" />
                <span>Load Artisan Template</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {aplusData.modules.map((mod, idx) => {
              const isHighlighted = highlightedModuleId === mod.id;
              const isIncomplete =
                (mod.type === 'feature_cards_3' || mod.type === 'feature_cards_4')
                  ? !(mod.cards || []).some((c) => Boolean(c.imageUrl?.trim())) && !mod.imageUrl?.trim()
                  : mod.type === 'hero_banner'
                  ? !mod.imageUrl?.trim()
                  : false;
              return (
                <div
                  key={mod.id}
                  id={mod.id}
                  className={`rounded-xl border shadow-sm p-4 space-y-3.5 transition-all duration-500 ${
                    isHighlighted
                      ? 'bg-amber-50/50 border-[#007185] ring-2 ring-[#007185]/40 shadow-md scale-[1.01]'
                      : 'bg-white border-[#D5D9D9]'
                  }`}
                >
                  {/* Module Bar: Type Title & Reorder / Delete */}
                  <div className="flex items-center justify-between pb-2 border-b border-[#EAEDED]">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                        isHighlighted ? 'bg-[#007185] text-white' : 'bg-[#007185]/10 text-[#007185]'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-[#0F1111] uppercase tracking-wider">
                        {mod.type.replace(/_/g, ' ')}
                      </span>
                      {isHighlighted && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#007185] text-white font-extrabold uppercase animate-pulse">
                          Newly Added
                        </span>
                      )}
                      {isIncomplete && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                          Incomplete (Add photo or will be auto-omitted)
                        </span>
                      )}
                    </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveModule(idx, 'up')}
                      className="p-1 text-[#565959] hover:text-[#0F1111] disabled:opacity-30"
                      title="Move Up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === aplusData.modules.length - 1}
                      onClick={() => handleMoveModule(idx, 'down')}
                      className="p-1 text-[#565959] hover:text-[#0F1111] disabled:opacity-30"
                      title="Move Down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteModule(idx)}
                      className="p-1 text-rose-600 hover:text-rose-800 ml-1"
                      title="Remove Module"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Module Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Title */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-[#565959]">Module Heading</label>
                    <input
                      type="text"
                      value={mod.title || ''}
                      onChange={(e) => handleUpdateModule(idx, { title: e.target.value })}
                      placeholder="e.g. Master Weave Provenance"
                      className="w-full px-2.5 py-1.5 border border-[#D5D9D9] rounded-lg font-semibold bg-white"
                    />
                  </div>

                  {/* Image URL */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-[#565959]">Primary Image URL</label>
                      <button
                        type="button"
                        onClick={() => openPickerForModule(idx, 'imageUrl')}
                        className="text-[10px] text-[#007185] hover:underline font-bold flex items-center gap-1"
                      >
                        <FolderOpen className="w-3 h-3" />
                        <span>Media Library</span>
                      </button>
                    </div>
                    <input
                      type="url"
                      value={mod.imageUrl || ''}
                      onChange={(e) => handleUpdateModule(idx, { imageUrl: e.target.value })}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full px-2.5 py-1.5 border border-[#D5D9D9] rounded-lg font-mono text-[11px] bg-white"
                    />
                  </div>

                  {/* Subtitle / Badge (if applicable) */}
                  {(mod.type === 'hero_banner' || mod.type === 'image_text_split') && (
                    <>
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-[#565959]">Subtitle</label>
                        <input
                          type="text"
                          value={mod.subtitle || ''}
                          onChange={(e) => handleUpdateModule(idx, { subtitle: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-[#D5D9D9] rounded-lg bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-[#565959]">Badge Tag</label>
                        <input
                          type="text"
                          value={mod.badgeText || ''}
                          onChange={(e) => handleUpdateModule(idx, { badgeText: e.target.value })}
                          placeholder="e.g. 100% PURE SILK"
                          className="w-full px-2.5 py-1.5 border border-[#D5D9D9] rounded-lg bg-white"
                        />
                      </div>
                    </>
                  )}

                  {/* Image Position Toggle for Split Layout */}
                  {mod.type === 'image_text_split' && (
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-[#565959]">Image Alignment</label>
                      <select
                        value={mod.imagePosition || 'left'}
                        onChange={(e) => handleUpdateModule(idx, { imagePosition: e.target.value as 'left' | 'right' })}
                        className="w-full px-2.5 py-1.5 border border-[#D5D9D9] rounded-lg bg-white"
                      >
                        <option value="left">Image on Left, Text on Right</option>
                        <option value="right">Text on Left, Image on Right</option>
                      </select>
                    </div>
                  )}

                  {/* Description / Story */}
                  {(mod.type === 'image_text_split' || mod.type === 'craftsmanship_story') && (
                    <div className="md:col-span-2 space-y-1">
                      <label className="block text-[11px] font-bold text-[#565959]">Description Body</label>
                      <textarea
                        rows={3}
                        value={mod.description || ''}
                        onChange={(e) => handleUpdateModule(idx, { description: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-[#D5D9D9] rounded-lg bg-white"
                      />
                    </div>
                  )}

                  {/* Brand Story Quote */}
                  {mod.type === 'brand_story' && (
                    <div className="md:col-span-2 space-y-1">
                      <label className="block text-[11px] font-bold text-[#565959]">Artisan Philosophy Quote</label>
                      <textarea
                        rows={2}
                        value={mod.quote || ''}
                        onChange={(e) => handleUpdateModule(idx, { quote: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-[#D5D9D9] rounded-lg bg-white italic"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>

      {/* 3. Add Module Dialog / Menu */}
      {showAddMenu && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-[#D5D9D9] space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#D5D9D9]">
              <div>
                <h3 className="font-headline font-bold text-base text-[#0F1111]">
                  Choose A+ Content Module
                </h3>
                <p className="text-xs text-[#565959]">
                  Select an Amazon-style rich storytelling module to insert.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddMenu(false)}
                className="text-[#565959] hover:text-[#0F1111] font-bold text-sm px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MODULE_DEFINITIONS.map((def) => {
                const IconComponent = def.icon;
                return (
                  <button
                    key={def.type}
                    type="button"
                    onClick={() => handleAddModule(def.type)}
                    className="p-3 rounded-xl border border-[#D5D9D9] hover:border-[#007185] hover:bg-[#007185]/5 text-left transition-all group flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-8 h-8 rounded-lg bg-[#007185]/10 text-[#007185] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <h4 className="font-bold text-xs text-[#0F1111] group-hover:text-[#007185]">
                        {def.title}
                      </h4>
                      <p className="text-[11px] text-[#565959] mt-0.5 line-clamp-2">
                        {def.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Central Media Manager Picker Modal */}
      <MediaPickerModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onSelect={handleSelectModuleMedia}
        allowedCategory="APLUS_CONTENT"
        title="Select A+ Content Media Asset"
      />
    </div>
  );
}
