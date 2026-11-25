'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Heart, X } from 'lucide-react';

interface WishlistSignInPromptProps {
  open: boolean;
  onClose: () => void;
  /** Where to return after signing in (defaults to the current page). */
  redirectTo?: string;
}

/** Shown when a signed-out shopper tries to save an item to their Wishlist. */
export function WishlistSignInPrompt({ open, onClose, redirectTo }: WishlistSignInPromptProps) {
  const signInRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    signInRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const target =
    redirectTo ?? (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/');
  const loginHref = `/login?redirect=${encodeURIComponent(target)}`;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wishlist-signin-title"
        aria-describedby="wishlist-signin-desc"
        className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl text-[#0F1111]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 p-1 rounded text-[#565959] hover:text-[#0F1111]"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#FDECEF]">
          <Heart className="h-5 w-5 text-[#CC0C39]" />
        </div>
        <h2 id="wishlist-signin-title" className="text-center text-base font-bold">
          Sign in to save to your Wishlist
        </h2>
        <p id="wishlist-signin-desc" className="mt-1.5 text-center text-xs text-[#565959]">
          Your Wishlist is saved to your Vyntra account so you can find it on any device.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Link
            ref={signInRef}
            href={loginHref}
            className="w-full rounded-full bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] py-2.5 text-center text-sm font-bold"
          >
            Sign in
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full border border-[#D5D9D9] py-2.5 text-sm font-semibold hover:bg-[#F7F8F8]"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
