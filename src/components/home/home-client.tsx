'use client';

import React, { useState } from 'react';
import { Check, Copy, Heart } from 'lucide-react';
import { useWishlistStore } from '@/store/wishlist-store';
import type { HomeProduct } from '@/lib/home-catalog';

/** Save-to-wishlist toggle on a homepage product. Guests get the store's sign-in prompt. */
export function WishlistToggle({ product }: { product: HomeProduct }) {
  const { toggleItemResult, isInWishlist } = useWishlistStore();
  const saved = isInWishlist(product.id);
  const [busy, setBusy] = useState(false);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    try {
      await toggleItemResult({
        id: product.id,
        productId: product.id,
        slug: product.slug,
        title: product.title,
        brand: product.brand,
        price: product.price,
        originalPrice: product.mrp,
        image: product.image || '',
        inStock: product.inStock,
        boardIds: ['all'],
      } as any);
    } catch {
      // Signed-out shoppers see the sign-in prompt; nothing changed.
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${product.title} from wishlist` : `Save ${product.title} to wishlist`}
      className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[#0F1111] shadow-sm ring-1 ring-black/5 transition-colors hover:text-[#B12704] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#007185] disabled:opacity-60"
    >
      <Heart className={`h-[18px] w-[18px] ${saved ? 'fill-[#B12704] text-[#B12704]' : ''}`} />
    </button>
  );
}

/** Copies the first-order coupon code. */
export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(code).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        });
      }}
      className="inline-flex items-center gap-2 rounded-lg border-2 border-dashed border-[#0F1111] bg-white px-4 py-2.5 font-brand text-xl font-bold tracking-wide text-[#0F1111] [font-stretch:85%] hover:bg-[#FFFBE5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007185]"
    >
      {code}
      {copied ? <Check className="h-5 w-5 text-[#067D62]" /> : <Copy className="h-5 w-5 text-[#565959]" />}
      <span className="sr-only" aria-live="polite">{copied ? 'Copied' : 'Copy code'}</span>
    </button>
  );
}
