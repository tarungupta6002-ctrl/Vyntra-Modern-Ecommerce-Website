import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'VYNTRA — Discover More. Live Better.',
  description:
    'India premier modern multi-category lifestyle discovery marketplace. Curated luxury fashion, high-performance electronics, and mindful home essentials.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-surface font-body text-on-surface min-h-screen flex flex-col antialiased">
        <Header />
        <CartDrawer />
        <main className="flex-1 w-full pt-[108px] lg:pt-[100px] print:pt-0 print:p-0">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
