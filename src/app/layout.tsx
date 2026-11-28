import type { Metadata } from 'next';
import { Anek_Latin } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { WishlistSignInPromptHost } from '@/components/products/wishlist-sign-in-prompt-host';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

// Display face by Ek Type (an Indian type foundry); used for the storefront's large headings.
const anek = Anek_Latin({ subsets: ['latin', 'latin-ext'], variable: '--font-anek', display: 'swap', axes: ['wdth'] });

export const metadata: Metadata = {
  title: 'Vyntra: fashion, phones, appliances and books from sellers across India',
  description:
    'Shop fashion, mobiles, laptops, home appliances and books from sellers across India. Free delivery with a ₹49 packaging fee, 7-day returns on eligible items.',
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
    <html lang="en" className={anek.variable}>
      <body className="bg-surface font-body text-on-surface min-h-screen flex flex-col antialiased">
        <Header />
        <CartDrawer />
        <WishlistSignInPromptHost />
        <main className="flex-1 w-full pt-[108px] lg:pt-[100px] print:pt-0 print:p-0">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
