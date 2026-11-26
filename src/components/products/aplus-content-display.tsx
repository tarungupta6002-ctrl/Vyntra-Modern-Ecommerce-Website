'use client';

import React from 'react';
import Link from 'next/link';
import {
  Award,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Ruler,
  RotateCcw,
  Store,
  Quote,
  Feather,
  Layers,
  Heart,
  ChevronRight,
} from 'lucide-react';
import { APlusData, APlusModule, cleanAplusText } from '@/types/aplus';

interface APlusContentDisplayProps {
  aplus: APlusData;
  brandName?: string;
  /** Link to the brand's products; shows a "Visit the … Store" button in the brand header. */
  brandStoreHref?: string;
}

export function APlusContentDisplay({ aplus, brandName = 'Vyntra Artisan', brandStoreHref }: APlusContentDisplayProps) {
  // Smart validation & cleanup filter: strips unconfigured/blank/duplicate/foreign-sample modules.
  // (Runs before any early return: hooks must be called in the same order on every render.)
  const validModules = React.useMemo(() => {
    if (!aplus?.modules || !Array.isArray(aplus.modules)) return [];

    const seenSignatures = new Set<string>();

    return aplus.modules.filter((mod) => {
      if (!mod || !mod.type) return false;

      // 1. Feature Cards (3 or 4)
      if (mod.type === 'feature_cards_3' || mod.type === 'feature_cards_4') {
        const cards = mod.cards || [];

        // Check for boilerplate placeholder cards (e.g. "Feature #1", "Highlight a key...")
        const isAllBlankPlaceholders =
          cards.length > 0 &&
          cards.every(
            (c) =>
              !c.imageUrl?.trim() &&
              (c.title?.startsWith('Feature #') || c.title?.startsWith('Hallmark #') || !c.title)
          );

        // If module has no banner image and all cards are blank placeholders, discard it
        if (isAllBlankPlaceholders && !mod.imageUrl?.trim()) {
          return false;
        }

        // Check if cards have foreign brand Nike sample photos (photo-1542291026-7eec264c27ff) on a non-Nike brand
        const hasSampleNikeImages = cards.some((c) =>
          c.imageUrl?.includes('photo-1542291026-7eec264c27ff')
        );
        const isNikeBrand = brandName.toLowerCase().includes('nike');
        if (hasSampleNikeImages && !isNikeBrand && !mod.imageUrl?.trim()) {
          return false;
        }

        // If cards are completely empty (0 cards) and no banner imageUrl, discard
        if (cards.length === 0 && !mod.imageUrl?.trim()) {
          return false;
        }

        // Deduplication signature: must include mod.imageUrl so different banners are never dropped!
        const cardSig = cards.map((c) => `${c.title}-${c.imageUrl || ''}`).join('|');
        const signature = `${mod.type}-${mod.imageUrl?.trim() || ''}-${mod.title || ''}-${cardSig}`;
        if (seenSignatures.has(signature)) {
          return false;
        }
        seenSignatures.add(signature);
        return true;
      }

      // 2. Hero Banner
      if (mod.type === 'hero_banner') {
        if (!mod.imageUrl?.trim() && !mod.title?.trim()) {
          return false;
        }
        const signature = `hero-${mod.imageUrl || ''}-${mod.title || ''}`;
        if (seenSignatures.has(signature)) return false;
        seenSignatures.add(signature);
        return true;
      }

      // 3. Image with Text Split
      if (mod.type === 'image_text_split') {
        if (!mod.imageUrl?.trim() && !mod.description?.trim()) {
          return false;
        }
        const signature = `split-${mod.imageUrl || ''}-${mod.title || ''}`;
        if (seenSignatures.has(signature)) return false;
        seenSignatures.add(signature);
        return true;
      }

      // 4. Lifestyle Gallery
      if (mod.type === 'lifestyle_gallery') {
        const hasAnyImg = Boolean(
          mod.imageUrl?.trim() ||
          mod.secondaryImageUrl?.trim() ||
          mod.tertiaryImageUrl?.trim()
        );
        if (!hasAnyImg) return false;
        return true;
      }

      return true;
    });
  }, [aplus?.modules, brandName]);

  // Header theme (vendor-chosen). Gradients keep white text at >= 4.5:1 contrast.
  const getHeaderTheme = (style: string) => {
    switch (style) {
      case 'gold_heritage':
        return {
          bg: 'bg-gradient-to-r from-[#7A4510] via-[#9A6418] to-[#5E3409]',
          text: 'text-white',
          subtext: 'text-amber-50/90',
          monogram: 'bg-white/15 text-white ring-white/40',
          cta: 'bg-white text-[#5E3409] hover:bg-amber-50',
        };
      case 'midnight_navy':
        return {
          bg: 'bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0B1120]',
          text: 'text-white',
          subtext: 'text-slate-300',
          monogram: 'bg-white/10 text-white ring-white/30',
          cta: 'bg-white text-[#0F172A] hover:bg-slate-100',
        };
      case 'emerald_artisanal':
        return {
          bg: 'bg-gradient-to-r from-[#064E3B] via-[#047857] to-[#022C22]',
          text: 'text-white',
          subtext: 'text-emerald-50/90',
          monogram: 'bg-white/15 text-white ring-white/40',
          cta: 'bg-white text-[#064E3B] hover:bg-emerald-50',
        };
      case 'clean_minimal':
        return {
          bg: 'bg-[#F7F8F8] border border-[#D5D9D9]',
          text: 'text-[#0F1111]',
          subtext: 'text-[#565959]',
          monogram: 'bg-white text-[#0F1111] ring-[#D5D9D9]',
          cta: 'bg-[#FFD814] text-[#0F1111] hover:bg-[#F7CA00] border border-[#FCD200]',
        };
      case 'maroon_luxury':
      default:
        return {
          bg: 'bg-gradient-to-r from-[#5C0017] via-[#800020] to-[#36000E]',
          text: 'text-white',
          subtext: 'text-rose-50/90',
          monogram: 'bg-white/15 text-white ring-white/40',
          cta: 'bg-white text-[#800020] hover:bg-rose-50',
        };
    }
  };

  if (validModules.length === 0) {
    return null;
  }

  const theme = getHeaderTheme(aplus.headerStyle);
  const showHeader = Boolean(aplus.headerTitle || aplus.headerSubtitle);
  const monogram = brandName.trim().charAt(0).toUpperCase() || 'V';

  return (
    <section className="w-full space-y-10 animate-in fade-in duration-300">
      {/* 1. Brand header: identity on the left, link to the brand's store on the right */}
      {showHeader && (
        <div className={`rounded-2xl shadow-sm ${theme.bg}`}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 px-5 py-5 sm:px-8 sm:py-6">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div
                aria-hidden="true"
                className={`h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-full ring-2 flex items-center justify-center text-2xl sm:text-3xl font-headline font-extrabold ${theme.monogram}`}
              >
                {monogram}
              </div>
              <div className="min-w-0">
                <p className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.18em] ${theme.subtext}`}>
                  {aplus.headerTitle || 'From the brand'}
                </p>
                <h2 className={`text-xl sm:text-2xl font-headline font-extrabold tracking-tight truncate ${theme.text}`}>
                  {brandName}
                </h2>
                {aplus.headerSubtitle && (
                  <p className={`mt-0.5 text-xs sm:text-sm font-medium leading-relaxed line-clamp-2 ${theme.subtext}`}>
                    {aplus.headerSubtitle}
                  </p>
                )}
              </div>
            </div>

            {brandStoreHref && (
              <Link
                href={brandStoreHref}
                className={`self-start sm:self-center shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs sm:text-sm font-bold shadow-sm transition-colors ${theme.cta}`}
              >
                <Store className="h-4 w-4" />
                <span>Visit the {brandName} Store</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* 2. Sequential Vendor-Configured Modules */}
      <div className="space-y-12">
        {validModules.map((mod) => (
          <div key={mod.id} className="w-full">
            {renderModule(mod, brandName)}
          </div>
        ))}
      </div>
    </section>
  );
}

function renderModule(mod: APlusModule, brandName: string) {
  switch (mod.type) {
    /* ----------------------------------------------------------------------- */
    /* MODULE 1: FULL-WIDTH HERO BANNER (AMAZON A+ RESPONSIVE NATURAL HEIGHT)  */
    /* ----------------------------------------------------------------------- */
    case 'hero_banner':
      const isBoilerplateTitle =
        !mod.title ||
        mod.title.trim().toLowerCase() === 'product description' ||
        mod.title.trim().toLowerCase() === 'new section heading';
      const isBoilerplateSubtitle =
        !mod.subtitle ||
        mod.subtitle.toLowerCase().includes('preserving centuries') ||
        mod.subtitle.toLowerCase().includes('authentic handcrafted masterpiece');
      const isBoilerplateBadge =
        !mod.badgeText ||
        mod.badgeText === 'HERITAGE ARCHIVE' ||
        mod.badgeText === 'HERITAGE ATELIER';

      const showCustomOverlay =
        (!isBoilerplateTitle && Boolean(mod.title)) ||
        (!isBoilerplateSubtitle && Boolean(mod.subtitle)) ||
        (!isBoilerplateBadge && Boolean(mod.badgeText));

      return (
        <div className="relative w-full rounded-2xl overflow-hidden shadow-lg border border-[#D5D9D9] bg-white group">
          <div className="relative w-full bg-[#131921] flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mod.imageUrl || 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=1600&q=80'}
              alt={mod.altText || mod.title || 'Hero Banner'}
              loading="lazy"
              decoding="async"
              className="w-full h-auto block object-contain mx-auto"
            />
            {/* Dark gradient overlay ONLY if the vendor provided real custom text */}
            {showCustomOverlay && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col justify-end p-6 sm:p-10 text-white pointer-events-none">
                <div className="max-w-2xl space-y-1.5">
                  {!isBoilerplateBadge && mod.badgeText && (
                    <span className="bg-[#FFD814] text-[#0F1111] text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded shadow inline-block">
                      {mod.badgeText}
                    </span>
                  )}
                  {!isBoilerplateTitle && mod.title && (
                    <h3 className="text-xl sm:text-2xl font-headline font-bold text-white drop-shadow-sm">
                      {mod.title}
                    </h3>
                  )}
                  {!isBoilerplateSubtitle && mod.subtitle && (
                    <p className="text-xs sm:text-sm text-white/90 font-medium leading-relaxed drop-shadow-sm max-w-xl">
                      {mod.subtitle}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      );

    /* ----------------------------------------------------------------------- */
    /* MODULE 2: IMAGE WITH TEXT (LEFT OR RIGHT LAYOUT)                        */
    /* ----------------------------------------------------------------------- */
    case 'image_text_split':
      const isLeft = mod.imagePosition !== 'right';
      return (
        <div className="bg-[#F7F8F8] rounded-2xl p-6 sm:p-8 border border-[#D5D9D9] shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Image Column */}
            <div className={`md:col-span-6 ${isLeft ? 'md:order-1' : 'md:order-2'}`}>
              <div className="rounded-xl overflow-hidden bg-white border border-[#D5D9D9] shadow-sm flex items-center justify-center p-2 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mod.imageUrl || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1000&q=80'}
                  alt={mod.altText || mod.title || 'Artisan split showcase'}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-auto max-h-[550px] object-contain rounded-lg group-hover:scale-102 transition-transform duration-500"
                />
              </div>
            </div>

            {/* Narrative Column */}
            <div className={`md:col-span-6 space-y-3 ${isLeft ? 'md:order-2' : 'md:order-1'}`}>
              {cleanAplusText(mod.badgeText) && (
                <span className="bg-[#800020] text-white text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full inline-block">
                  {cleanAplusText(mod.badgeText)}
                </span>
              )}
              {cleanAplusText(mod.title) && (
                <h3 className="text-xl sm:text-2xl font-headline font-bold text-[#0F1111] leading-snug">
                  {cleanAplusText(mod.title)}
                </h3>
              )}
              {cleanAplusText(mod.description) && (
                <p className="text-xs sm:text-sm text-[#0F1111] leading-relaxed">
                  {cleanAplusText(mod.description)}
                </p>
              )}
            </div>
          </div>
        </div>
      );

    /* ----------------------------------------------------------------------- */
    /* MODULE 3: THREE / FOUR FEATURE CARDS                                    */
    /* ----------------------------------------------------------------------- */
    case 'feature_cards_3':
    case 'feature_cards_4':
      const isFour = mod.type === 'feature_cards_4';
      const cards = mod.cards || [];

      // If the vendor provided an overall graphic banner image (e.g. 970x600 Amazon creative),
      // and cards are either empty or boilerplate placeholders, render the full-width graphic banner!
      const hasBoilerplateOrEmptyCards =
        cards.length === 0 ||
        cards.every((c) => {
          const isBlankImg = !c.imageUrl || c.imageUrl.trim() === '';
          const isSampleImg =
            c.imageUrl?.includes('photo-1583391733956') ||
            c.imageUrl?.includes('photo-1542291026-7eec264c27ff') ||
            c.imageUrl?.includes('photo-1560769629-975ec94e6a86') ||
            c.imageUrl?.includes('photo-1595950653106-6c9ebd614d3a');
          const isPlaceholderTitle =
            !c.title ||
            c.title.startsWith('Feature #') ||
            c.title.startsWith('Hallmark #') ||
            c.title === 'Product Features';
          return (isBlankImg && isPlaceholderTitle) || isSampleImg;
        });

      const moduleTitle = cleanAplusText(mod.title);
      const moduleDescription = cleanAplusText(mod.description);

      if (mod.imageUrl && hasBoilerplateOrEmptyCards) {
        return (
          <div className="space-y-4">
            {(moduleTitle || moduleDescription) && (
              <div className="pb-2 border-b border-[#D5D9D9]">
                {moduleTitle && (
                  <h3 className="text-lg sm:text-xl font-headline font-bold text-[#0F1111]">{moduleTitle}</h3>
                )}
                {moduleDescription && (
                  <p className="mt-1 text-xs sm:text-sm text-[#565959] leading-relaxed max-w-3xl">{moduleDescription}</p>
                )}
              </div>
            )}
            <div className="relative w-full rounded-2xl overflow-hidden shadow-lg border border-[#D5D9D9] bg-white group">
              <div className="relative w-full bg-white flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mod.imageUrl}
                  alt={mod.altText || moduleTitle || 'Brand Banner'}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-auto block object-contain mx-auto"
                />
              </div>
            </div>
          </div>
        );
      }

      const displayCards = cards.filter((c) => Boolean(c.imageUrl?.trim()) || Boolean(cleanAplusText(c.title)));

      if (displayCards.length === 0 && !mod.imageUrl) {
        return null;
      }

      return (
        <div className="space-y-4">
          {(moduleTitle || moduleDescription) && (
            <div className="pb-2 border-b border-[#D5D9D9]">
              {moduleTitle && (
                <h3 className="text-lg sm:text-xl font-headline font-bold text-[#0F1111]">{moduleTitle}</h3>
              )}
              {moduleDescription && (
                <p className="mt-1 text-xs sm:text-sm text-[#565959] leading-relaxed max-w-3xl">{moduleDescription}</p>
              )}
            </div>
          )}

          <div className={`grid grid-cols-1 sm:grid-cols-2 ${isFour ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-5`}>
            {displayCards.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-xl border border-[#D5D9D9] overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                {c.imageUrl && (
                  <div className="relative aspect-[4/3] bg-[#F7F8F8] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.imageUrl} alt={c.altText || cleanAplusText(c.title) || moduleTitle || 'Feature'} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-4 space-y-1.5 flex-1 flex flex-col justify-between">
                  <div>
                    {cleanAplusText(c.title) && (
                      <h4 className="font-headline font-bold text-sm text-[#0F1111]">{cleanAplusText(c.title)}</h4>
                    )}
                    {cleanAplusText(c.description) && (
                      <p className="text-xs text-[#565959] leading-relaxed mt-1">{cleanAplusText(c.description)}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    /* ----------------------------------------------------------------------- */
    /* MODULE 4: LIFESTYLE IMAGE GALLERY                                       */
    /* ----------------------------------------------------------------------- */
    case 'lifestyle_gallery':
      const galleryImgs = [mod.imageUrl, mod.secondaryImageUrl, mod.tertiaryImageUrl].filter(Boolean) as string[];
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#D5D9D9]">
            <h3 className="text-lg sm:text-xl font-headline font-bold text-[#0F1111]">
              {mod.title || 'Atelier Lifestyle Gallery'}
            </h3>
            <span className="text-xs text-[#565959] font-semibold">Curated Editorial Lookbook</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {galleryImgs.map((src, i) => (
              <div
                key={i}
                className="relative aspect-[3/4] rounded-xl overflow-hidden bg-[#F7F8F8] border border-[#D5D9D9] shadow-sm group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`Lookbook ${i + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded">
                  Look #{i + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    /* ----------------------------------------------------------------------- */
    /* MODULE 5: MATERIAL & CRAFTSMANSHIP DEEP DIVE                            */
    /* ----------------------------------------------------------------------- */
    case 'craftsmanship_story':
      return (
        <div className="bg-[#FFFBE6] rounded-2xl p-6 sm:p-8 border border-[#FFD814] shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#F7CA00]/40">
            <div className="space-y-1">
              {mod.badgeText && (
                <span className="bg-[#800020] text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                  {mod.badgeText}
                </span>
              )}
              <h3 className="text-xl sm:text-2xl font-headline font-bold text-[#0F1111]">
                {mod.title || 'Material & Craftsmanship Standard'}
              </h3>
            </div>
            <span className="text-xs font-bold text-[#800020] flex items-center gap-1">
              <ShieldCheck className="h-4 w-4" />
              <span>Certified Handloom Integrity</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-7 space-y-3">
              <p className="text-xs sm:text-sm text-[#0F1111] leading-relaxed">
                {mod.description ||
                  'Produced in certified artisan weaver collectives. Our zero-compromise fiber standard uses natural dyes, non-toxic processing, and ethical remuneration for master craftsmen.'}
              </p>

              {mod.stats && mod.stats.length > 0 && (
                <div className="grid grid-cols-3 gap-3 pt-3">
                  {mod.stats.map((s, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-xl border border-[#FFD814] text-center shadow-xs">
                      <span className="text-[10px] text-[#565959] uppercase font-bold">{s.label}</span>
                      <p className="text-base sm:text-lg font-headline font-black text-[#800020] mt-0.5">
                        {s.value}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {mod.imageUrl && (
              <div className="md:col-span-5 relative aspect-[4/3] rounded-xl overflow-hidden bg-white border border-[#FFD814]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mod.imageUrl} alt="Craftsmanship" loading="lazy" decoding="async" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>
      );

    /* ----------------------------------------------------------------------- */
    /* MODULE 6: PRODUCT HIGHLIGHTS GRID                                       */
    /* ----------------------------------------------------------------------- */
    case 'product_highlights':
      const bullets = mod.highlights || [
        'Pure Handloom Origin certified by artisan co-operative',
        'Natural yarn count calibrated for breathable year-round comfort',
        'Double-reinforced seams tested for over 50 wash cycles',
        'Express Dispatch in climate-sealed sustainable presentation packaging',
      ];
      return (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#D5D9D9] shadow-sm space-y-4">
          <h3 className="text-lg sm:text-xl font-headline font-bold text-[#0F1111] pb-2 border-b border-[#D5D9D9]">
            {mod.title || 'Product Craft Highlights'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {bullets.map((b, i) => (
              <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl bg-[#F7F8F8] border border-[#D5D9D9]">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                  ✓
                </div>
                <span className="text-xs sm:text-sm font-semibold text-[#0F1111] leading-snug">{b}</span>
              </div>
            ))}
          </div>
        </div>
      );

    /* ----------------------------------------------------------------------- */
    /* MODULE 7: SIZE CHART & CARE INSTRUCTIONS                                */
    /* ----------------------------------------------------------------------- */
    case 'care_and_size':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Care Tips */}
          <div className="bg-white rounded-2xl p-6 border border-[#D5D9D9] shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#D5D9D9]">
              <RotateCcw className="h-4 w-4 text-[#007185]" />
              <h4 className="font-headline font-bold text-base text-[#0F1111]">Care &amp; Longevity Instructions</h4>
            </div>
            <ul className="space-y-2.5 text-xs text-[#0F1111]">
              <li className="flex items-start gap-2">
                <span className="font-bold text-[#007185]">•</span>
                <span>Dry clean recommended for first 2-3 washes to preserve natural luster.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-[#007185]">•</span>
                <span>Cold hand wash with mild botanical or silk-friendly detergent thereafter.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-[#007185]">•</span>
                <span>Dry inside out in shade; avoid harsh direct midday sunlight.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-[#007185]">•</span>
                <span>Warm iron on reverse side under protective cotton press cloth.</span>
              </li>
            </ul>
          </div>

          {/* Size Matrix */}
          <div className="bg-white rounded-2xl p-6 border border-[#D5D9D9] shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#D5D9D9]">
              <Ruler className="h-4 w-4 text-[#007185]" />
              <h4 className="font-headline font-bold text-base text-[#0F1111]">Fit &amp; Sizing Matrix (Inches)</h4>
            </div>
            <div className="overflow-x-auto border border-[#D5D9D9] rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F8F8] border-b border-[#D5D9D9] text-[#565959] uppercase text-[10px]">
                  <tr>
                    <th className="p-2 font-bold">Size</th>
                    <th className="p-2 font-bold">Chest</th>
                    <th className="p-2 font-bold">Waist</th>
                    <th className="p-2 font-bold">Length</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D5D9D9]">
                  {[
                    { s: 'S', c: '38"', w: '32"', l: '40"' },
                    { s: 'M', c: '40"', w: '34"', l: '41"' },
                    { s: 'L', c: '42"', w: '36"', l: '42"' },
                    { s: 'XL', c: '44"', w: '38"', l: '43"' },
                  ].map((r) => (
                    <tr key={r.s} className="hover:bg-[#F7F8F8]/50">
                      <td className="p-2 font-bold text-[#0F1111]">{r.s}</td>
                      <td className="p-2 text-[#565959]">{r.c}</td>
                      <td className="p-2 text-[#565959]">{r.w}</td>
                      <td className="p-2 text-[#565959]">{r.l}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );

    /* ----------------------------------------------------------------------- */
    /* MODULE 8: BRAND STORY & ATELIER PHILOSOPHY                              */
    /* ----------------------------------------------------------------------- */
    case 'brand_story':
      return (
        <div className="bg-gradient-to-br from-[#131921] to-[#232F3E] text-white rounded-2xl p-6 sm:p-10 shadow-lg border border-white/10 space-y-6">
          <div className="max-w-3xl space-y-4">
            <span className="bg-[#FFD814] text-[#0F1111] text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded">
              ATELIER PHILOSOPHY
            </span>
            <div className="flex items-start gap-3">
              <Quote className="h-8 w-8 text-[#FFD814] shrink-0 opacity-80" />
              <blockquote className="text-base sm:text-xl font-headline italic font-medium leading-relaxed text-slate-100">
                &ldquo;{mod.quote || 'We believe heritage textiles carry the soul of the craftsperson. Every warp and weft tells a story of patience, dignity, and cultural continuity.'}&rdquo;
              </blockquote>
            </div>
            {mod.author && (
              <p className="text-xs sm:text-sm font-bold text-[#FFD814] pl-11">— {mod.author}</p>
            )}
          </div>
        </div>
      );

    /* ----------------------------------------------------------------------- */
    /* MODULE 9: FULL-WIDTH PROMOTIONAL BANNER                                 */
    /* ----------------------------------------------------------------------- */
    case 'promo_banner':
      return (
        <div className="w-full rounded-2xl overflow-hidden shadow-md border border-[#D5D9D9] bg-white">
          <div className="relative w-full bg-[#EAEDED] flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mod.imageUrl || 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1600&q=80'}
              alt={mod.altText || 'Promotional Banner'}
              loading="lazy"
              decoding="async"
              className="w-full h-auto block object-contain mx-auto"
            />
            {mod.title && (
              <div className="p-4 sm:p-6 bg-white border-t border-[#EAEDED] text-center w-full">
                <div className="space-y-1">
                  <h3 className="text-xl sm:text-2xl font-headline font-black text-[#0F1111]">
                    {mod.title}
                  </h3>
                  {mod.subtitle && (
                    <p className="text-xs sm:text-sm text-[#565959] max-w-md mx-auto font-medium">
                      {mod.subtitle}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      );

    default:
      return null;
  }
}
