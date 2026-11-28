'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronUp, Lock, RotateCcw, Store, Truck } from 'lucide-react';
import { BrandLogo } from './brand-logo';

const PROMISES = [
  { icon: Truck, title: 'Free delivery', body: 'No shipping charge; ₹49 packaging fee per order' },
  { icon: RotateCcw, title: '7-day returns', body: 'On eligible items; refunds go to the original payment method' },
  { icon: Lock, title: 'Secure payments', body: 'Card and UPI details are handled by Razorpay, never stored by Vyntra' },
  { icon: Store, title: 'Approved sellers', body: 'Every seller is reviewed by Vyntra before they can list' },
];

const SHOP = [
  { label: 'Fashion', href: '/products?category=fashion' },
  { label: 'Mobiles', href: '/mobiles' },
  { label: 'Laptops and electronics', href: '/electronics' },
  { label: 'Home appliances', href: '/appliances' },
  { label: 'Books', href: '/books' },
  { label: 'New arrivals', href: '/products?sort=newest' },
];

const HELP = [
  { label: 'Your orders', href: '/account?tab=orders' },
  { label: 'Returns', href: '/account?tab=returns' },
  { label: 'Help and support', href: '/support' },
  { label: 'Saved addresses', href: '/account?tab=addresses' },
  { label: 'Payments', href: '/account?tab=payments' },
  { label: 'Login and security', href: '/account?tab=profile' },
];

export function Footer() {
  const pathname = usePathname();

  if (pathname === '/login' || pathname === '/signup' || pathname?.startsWith('/admin') || pathname?.startsWith('/vendor')) {
    return null;
  }

  return (
    <footer className="mt-16 w-full bg-[#232F3E] text-white print:hidden">
      {/* What every order gets */}
      <div className="w-full border-y border-[#D5D9D9] bg-white py-6 text-[#0F1111]">
        <ul className="mx-auto grid max-w-[1400px] grid-cols-1 gap-5 px-4 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {PROMISES.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex items-start gap-3">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#007185]" />
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-0.5 text-xs leading-snug text-[#565959]">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        type="button"
        className="flex w-full items-center justify-center gap-1.5 bg-[#37475A] py-3.5 text-center text-xs font-semibold text-white transition-colors hover:bg-[#485769]"
      >
        Back to top
        <ChevronUp className="h-4 w-4" />
      </button>

      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-8 px-4 py-10 md:grid-cols-2 lg:grid-cols-5 lg:px-8">
        <div className="space-y-3.5 lg:col-span-2">
          <BrandLogo className="h-8 w-auto" variant="light" />
          <p className="max-w-sm text-sm leading-relaxed text-[#CCCCCC]">
            Fashion, mobiles, laptops, home appliances and books from sellers across India.
          </p>
        </div>

        <nav aria-label="Shop">
          <h2 className="mb-3 text-sm font-semibold text-white">Shop</h2>
          <ul className="space-y-2 text-sm text-[#CCCCCC]">
            {SHOP.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className="hover:text-white hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Help">
          <h2 className="mb-3 text-sm font-semibold text-white">Help</h2>
          <ul className="space-y-2 text-sm text-[#CCCCCC]">
            {HELP.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className="hover:text-white hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-white">Sell</h2>
          <p className="mb-3 text-sm text-[#CCCCCC]">List your products and reach shoppers across India.</p>
          <Link href="/become-seller" className="text-sm font-semibold text-[#FFD814] hover:underline">
            Sell on Vyntra
          </Link>
        </div>
      </div>

      <div className="w-full border-t border-white/10 bg-[#131921] py-4 text-xs text-[#CCCCCC]">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-3 px-4 md:flex-row lg:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <span>Pay with:</span>
            {['UPI', 'Cards', 'Net banking', 'Cash on Delivery'].map((m) => (
              <span key={m} className="rounded bg-white px-2 py-0.5 text-[10px] font-semibold text-[#0F1111]">
                {m}
              </span>
            ))}
          </div>
          <p>© {new Date().getFullYear()} Vyntra</p>
        </div>
      </div>
    </footer>
  );
}
