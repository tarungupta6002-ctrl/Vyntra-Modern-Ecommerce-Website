'use client';

/* eslint-disable @next/next/no-img-element -- vendor thumbnails come from arbitrary hosts */
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Clock, Search, Tag, LayoutGrid, X } from 'lucide-react';
import { formatINR } from '@/lib/utils';
import type { SearchSuggestion } from '@/app/api/search/suggest/route';

import { CometSpinner } from '@/components/ui/loading-spinner';
const RECENT_KEY = 'vyntra:recent-searches';
const MAX_RECENT = 6;
const DEBOUNCE_MS = 200;

type SuggestionItem =
  | { kind: 'recent'; key: string; label: string; query: string }
  | { kind: 'product'; key: string; label: string; href: string; product: SearchSuggestion['products'][number] }
  | { kind: 'category'; key: string; label: string; href: string }
  | { kind: 'brand'; key: string; label: string; href: string };

export function readRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string').slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

export function saveRecentSearch(query: string) {
  const q = query.trim();
  if (!q || typeof window === 'undefined') return;
  const next = [q, ...readRecentSearches().filter((s) => s.toLowerCase() !== q.toLowerCase())].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {}
}

function removeRecentSearch(query: string) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(readRecentSearches().filter((s) => s !== query)));
  } catch {}
}

interface UseSearchAutocompleteOptions {
  query: string;
  /** Navigate to a suggestion's page. */
  onNavigate: (href: string) => void;
  /** Run a full search for a text query (used for recent-search items). */
  onSearch: (query: string) => void;
}

/**
 * Typeahead state for a search input: debounced fetching, recent searches and keyboard navigation.
 * Spread `inputProps` onto the <input> and render <SearchSuggestionsPanel {...panelProps} />.
 */
export function useSearchAutocomplete({ query, onNavigate, onSearch }: UseSearchAutocompleteOptions) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<SearchSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const trimmed = query.trim();

  // Debounced fetch; aborts stale requests so fast typing never shows old results.
  useEffect(() => {
    if (trimmed.length < 2) {
      setData(null);
      setLoading(false);
      return;
    }
    // Only the focused search bar fetches (header renders separate desktop + mobile bars).
    if (!open) return;
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        const json = await res.json();
        if (json?.success) setData(json.data);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setData(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, open]);

  // Close when clicking outside the search area.
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const items: SuggestionItem[] = useMemo(() => {
    if (trimmed.length < 2) {
      return recent.map((r) => ({ kind: 'recent' as const, key: `r:${r}`, label: r, query: r }));
    }
    if (!data) return [];
    return [
      ...data.products.map((p) => ({
        kind: 'product' as const,
        key: `p:${p.slug}`,
        label: p.title,
        href: `/products/${p.slug}`,
        product: p,
      })),
      ...data.categories.map((c) => ({
        kind: 'category' as const,
        key: `c:${c.slug}`,
        label: c.name,
        href: `/category/${c.slug}`,
      })),
      ...data.brands.map((b) => ({
        kind: 'brand' as const,
        key: `b:${b}`,
        label: b,
        // ?search= (not ?brand=): /products hides non-fashion items when no search query is set.
        href: `/products?search=${encodeURIComponent(b)}`,
      })),
    ];
  }, [trimmed, data, recent]);

  useEffect(() => setActiveIndex(-1), [items]);

  const choose = useCallback(
    (item: SuggestionItem) => {
      setOpen(false);
      if (item.kind === 'recent') {
        onSearch(item.query);
      } else {
        saveRecentSearch(trimmed);
        onNavigate(item.href);
      }
    },
    [onNavigate, onSearch, trimmed]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!open || items.length === 0) {
      if (e.key === 'ArrowDown') setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      // A highlighted suggestion wins over submitting the typed text.
      e.preventDefault();
      choose(items[activeIndex]);
    }
  };

  // useId is identical on server and client (Math.random caused a hydration mismatch).
  const listboxId = `search-suggest-${useId().replace(/:/g, '')}`;
  const visible = open && (items.length > 0 || (loading && trimmed.length >= 2) || (!!data && trimmed.length >= 2));

  return {
    containerRef,
    close: () => setOpen(false),
    inputProps: {
      onFocus: () => {
        setRecent(readRecentSearches());
        setOpen(true);
      },
      onKeyDown,
      onInput: () => setOpen(true),
      role: 'combobox' as const,
      autoComplete: 'off',
      'aria-autocomplete': 'list' as const,
      'aria-expanded': visible,
      'aria-controls': listboxId,
      'aria-activedescendant': activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined,
    },
    panelProps: {
      id: listboxId,
      visible,
      items,
      loading,
      query: trimmed,
      activeIndex,
      onHover: setActiveIndex,
      onChoose: choose,
      onRemoveRecent: (q: string) => {
        removeRecentSearch(q);
        setRecent(readRecentSearches());
      },
    },
  };
}

interface SearchSuggestionsPanelProps {
  id: string;
  visible: boolean;
  items: SuggestionItem[];
  loading: boolean;
  query: string;
  activeIndex: number;
  onHover: (index: number) => void;
  onChoose: (item: SuggestionItem) => void;
  onRemoveRecent: (query: string) => void;
}

export function SearchSuggestionsPanel({
  id,
  visible,
  items,
  loading,
  query,
  activeIndex,
  onHover,
  onChoose,
  onRemoveRecent,
}: SearchSuggestionsPanelProps) {
  if (!visible) return null;

  const showingRecent = query.length < 2;

  return (
    <div className="absolute left-0 right-0 top-full mt-1 z-[60] bg-white text-[#0F1111] rounded-md shadow-xl border border-[#D5D9D9] overflow-hidden">
      {showingRecent && items.length > 0 && (
        <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[#565959]">
          Recent searches
        </div>
      )}

      <ul id={id} role="listbox" className="max-h-[70vh] overflow-y-auto py-1">
        {items.map((item, index) => {
          const active = index === activeIndex;
          return (
            <li
              key={item.key}
              id={`${id}-${index}`}
              role="option"
              aria-selected={active}
              onMouseEnter={() => onHover(index)}
              // mousedown (not click) so the input's blur doesn't close the panel first
              onMouseDown={(e) => {
                e.preventDefault();
                onChoose(item);
              }}
              className={`flex items-center gap-3 px-3 py-2 cursor-pointer text-sm ${
                active ? 'bg-[#F0F2F2]' : 'hover:bg-[#F7F8F8]'
              }`}
            >
              <SuggestionRow item={item} />
              {item.kind === 'recent' && (
                <button
                  type="button"
                  aria-label={`Remove ${item.label} from recent searches`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemoveRecent(item.query);
                  }}
                  className="ml-auto p-1 text-[#565959] hover:text-[#0F1111] rounded"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {!showingRecent && loading && items.length === 0 && (
        <div className="flex items-center gap-2 px-3 py-3 text-sm text-[#565959]">
          <CometSpinner className="h-4 w-4 text-current" decorative /> Searching…
        </div>
      )}
      {!showingRecent && !loading && items.length === 0 && (
        <div className="px-3 py-3 text-sm text-[#565959]">
          No quick matches. Press Enter to search all products for “{query}”.
        </div>
      )}
    </div>
  );
}

function SuggestionRow({ item }: { item: SuggestionItem }) {
  switch (item.kind) {
    case 'recent':
      return (
        <>
          <Clock className="h-4 w-4 text-[#565959] shrink-0" />
          <span className="truncate">{item.label}</span>
        </>
      );
    case 'product':
      return (
        <>
          <div className="h-10 w-10 shrink-0 rounded bg-[#F7F8F8] overflow-hidden flex items-center justify-center">
            {item.product.image ? (
              <img src={item.product.image} alt="" className="h-full w-full object-contain" loading="lazy" />
            ) : (
              <Search className="h-4 w-4 text-[#565959]" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate">{item.label}</div>
            <div className="text-xs text-[#565959] truncate">
              {item.product.brand}
              {item.product.category ? ` · ${item.product.category}` : ''}
            </div>
          </div>
          <span className="text-sm font-semibold shrink-0">{formatINR(item.product.price)}</span>
        </>
      );
    case 'category':
      return (
        <>
          <LayoutGrid className="h-4 w-4 text-[#007185] shrink-0" />
          <span className="truncate">
            in <span className="font-semibold text-[#007185]">{item.label}</span>
          </span>
        </>
      );
    case 'brand':
      return (
        <>
          <Tag className="h-4 w-4 text-[#007185] shrink-0" />
          <span className="truncate">
            Brand: <span className="font-semibold">{item.label}</span>
          </span>
        </>
      );
  }
}
