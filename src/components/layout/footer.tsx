'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldCheck,
  Zap,
  RotateCcw,
  Lock,
  ArrowRight,
  ShieldAlert,
  ChevronUp,
} from 'lucide-react';
import { BrandLogo } from './brand-logo';

export function Footer() {
  const pathname = usePathname();

  if (
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/vendor')
  ) {
    return null;
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="w-full mt-16 bg-[#232F3E] text-white print:hidden">
      {/* 1. Trust Assurance Feature Strip (Clean White) */}
      <div className="w-full bg-white text-[#0F1111] py-6 border-y border-[#D5D9D9]">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-[#E7F4F5] text-[#007185] flex items-center justify-center shrink-0 border border-[#BDE3E8]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#0F1111]">100% Genuine Products</h4>
              <p className="text-[11px] text-[#565959] mt-0.5 leading-tight">
                Sourced directly from verified brands &amp; artisans
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-[#FFF4E5] text-[#FF9900] flex items-center justify-center shrink-0 border border-[#FFE1B5]">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#0F1111]">Free delivery</h4>
              <p className="text-[11px] text-[#565959] mt-0.5 leading-tight">
                No shipping charge; ₹49 packaging fee per order
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-[#E7F4F5] text-[#007185] flex items-center justify-center shrink-0 border border-[#BDE3E8]">
              <RotateCcw className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#0F1111]">7-day returns</h4>
              <p className="text-[11px] text-[#565959] mt-0.5 leading-tight">
                On eligible items; refunds to the original payment method
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-[#F7F8F8] text-[#0F1111] flex items-center justify-center shrink-0 border border-[#D5D9D9]">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#0F1111]">100% Secure Payments</h4>
              <p className="text-[11px] text-[#565959] mt-0.5 leading-tight">
                Encrypted via UPI, RuPay, NetBanking &amp; Cards
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Back to Top Button */}
      <button
        onClick={scrollToTop}
        type="button"
        className="w-full bg-[#37475A] hover:bg-[#485769] text-white text-xs font-semibold py-3.5 text-center transition-colors flex items-center justify-center gap-1.5"
      >
        <span>Back to top</span>
        <ChevronUp className="h-4 w-4" />
      </button>

      {/* 3. Main Footer Directory */}
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
        {/* Brand Column */}
        <div className="lg:col-span-2 space-y-3.5">
          <BrandLogo className="h-8 w-auto" variant="light" />
          <p className="text-xs text-[#CCCCCC] leading-relaxed max-w-sm">
            India&apos;s premier multi-category lifestyle discovery marketplace. Curated luxury fashion, high-performance electronics, and mindful home essentials engineered for modern living.
          </p>

          <div className="pt-2">
            <h5 className="text-xs font-bold text-white mb-1">
              Join Vyntra Insider Club
            </h5>
            <p className="text-[11px] text-[#CCCCCC] mb-2">
              Get exclusive festive drop alerts &amp; early coupon access.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert('Welcome to VYNTRA Insider Club! Use code FIRST15.');
              }}
              className="flex max-w-sm gap-1.5"
            >
              <input
                type="text"
                placeholder="Enter email or mobile no."
                className="flex-1 h-9 bg-white rounded-[4px] px-3 text-xs text-[#0F1111] placeholder:text-[#565959] focus:outline-none focus:ring-1 focus:ring-[#FF9900]"
                required
              />
              <button
                type="submit"
                className="h-9 px-4 bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] text-xs font-bold rounded-[4px] transition-colors flex items-center gap-1 shrink-0"
              >
                <span>Join</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Popular Categories */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
            Shop By Category
          </h4>
          <ul className="space-y-2 text-xs text-[#CCCCCC]">
            <li><Link href="/products?category=fashion" className="hover:text-white hover:underline">Ethnic &amp; Fusion Wear</Link></li>
            <li><Link href="/products?category=men" className="hover:text-white hover:underline">Men&apos;s Premium Fashion</Link></li>
            <li><Link href="/products?category=footwear" className="hover:text-white hover:underline">Sneakers &amp; Formal Shoes</Link></li>
            <li><Link href="/products?category=beauty" className="hover:text-white hover:underline">Clean Beauty &amp; Skincare</Link></li>
            <li><Link href="/products?category=electronics" className="hover:text-white hover:underline">Smart Audio &amp; Gadgets</Link></li>
            <li><Link href="/products?category=home" className="hover:text-white hover:underline">Artisanal Home &amp; Living</Link></li>
          </ul>
        </div>

        {/* Customer Care */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
            Let Us Help You
          </h4>
          <ul className="space-y-2 text-xs text-[#CCCCCC]">
            <li><Link href="/account?tab=orders" className="hover:text-white hover:underline">Track Your Orders</Link></li>
            <li><Link href="/account?tab=orders" className="hover:text-white hover:underline">Returns &amp; Replacements</Link></li>
            <li><Link href="/support" className="hover:text-white hover:underline">Customer Help Center</Link></li>
            <li><Link href="/account?tab=addresses" className="hover:text-white hover:underline">Manage Saved Addresses</Link></li>
            <li><Link href="/account?tab=payments" className="hover:text-white hover:underline">Payments</Link></li>
            <li><Link href="/account?tab=profile" className="hover:text-white hover:underline">Security &amp; 2FA Settings</Link></li>
          </ul>
        </div>

        {/* About & Sell */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
            About Vyntra
          </h4>
          <ul className="space-y-2 text-xs text-[#CCCCCC]">
            <li><Link href="/products" className="hover:text-white hover:underline">About Our Marketplace</Link></li>
            <li><Link href="/products" className="hover:text-white hover:underline">Direct Artisans of India</Link></li>
            <li><Link href="/become-seller" className="hover:text-white hover:underline text-[#FFD814] font-semibold">Sell on Vyntra</Link></li>
            <li><Link href="/support" className="hover:text-white hover:underline">Careers &amp; Press</Link></li>
            <li><Link href="/support" className="hover:text-white hover:underline">Terms of Service</Link></li>
            <li><Link href="/support" className="hover:text-white hover:underline">Privacy Notice</Link></li>
          </ul>
        </div>
      </div>

      {/* 4. Bottom Compliance and Copyright Row */}
      <div className="w-full bg-[#131921] py-4 border-t border-white/10 text-xs text-[#CCCCCC]">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-[#007185] font-semibold">
              <ShieldAlert className="h-3.5 w-3.5" />
              100% Purchase Protection • Supported Gateways:
            </span>
            <div className="flex items-center gap-1.5 font-bold text-[10px] text-[#0F1111]">
              <span className="bg-white px-2 py-0.5 rounded shadow-sm">UPI</span>
              <span className="bg-white px-2 py-0.5 rounded shadow-sm">RuPay</span>
              <span className="bg-white px-2 py-0.5 rounded shadow-sm">VISA</span>
              <span className="bg-white px-2 py-0.5 rounded shadow-sm">Mastercard</span>
              <span className="bg-white px-2 py-0.5 rounded shadow-sm">NetBanking</span>
            </div>
          </div>
          <div className="text-center md:text-right">
            © {new Date().getFullYear()} Vyntra Marketplace Private Limited. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
