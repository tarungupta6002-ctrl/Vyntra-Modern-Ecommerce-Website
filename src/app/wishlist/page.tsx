import { redirect } from 'next/navigation';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Wishlist & Curated Collections — VYNTRA',
  description: 'Explore your curated collections, saved luxury ethnic pieces, price-drop alerts, and artisan heirlooms.',
};

export default function WishlistPage() {
  redirect('/account?tab=wishlist');
}
