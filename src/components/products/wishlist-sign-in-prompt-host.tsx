'use client';

import { useCallback } from 'react';
import { useWishlistStore } from '@/store/wishlist-store';
import { WishlistSignInPrompt } from './wishlist-sign-in-prompt';

/**
 * Single app-wide sign-in dialog for the wishlist. The wishlist store opens it whenever a
 * signed-out shopper tries to save or remove an item, from any page.
 */
export function WishlistSignInPromptHost() {
  const open = useWishlistStore((s) => s.signInPromptOpen);
  const setOpen = useWishlistStore((s) => s.setSignInPromptOpen);
  const close = useCallback(() => setOpen(false), [setOpen]);
  return <WishlistSignInPrompt open={open} onClose={close} />;
}
