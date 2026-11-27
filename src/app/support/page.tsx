import React, { Suspense } from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, User, Package } from 'lucide-react';
import { HelpSupportView } from '@/components/account/help-support-view';

export const metadata: Metadata = {
  title: 'Customer Care & Support Concierge — VYNTRA Luxury Marketplace',
  description:
    'Help with orders, returns, refunds and payments on Vyntra.',
};

export default function GeneralSupportPage() {
  return (
    <div className="w-full bg-[#faf8ff] min-h-screen text-[#0F1111] antialiased py-6 sm:py-8">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2 text-xs text-[#565959] font-medium">
            <Link href="/" className="hover:text-[#007185] transition-colors">
              Home
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-[#c4c5d5]" />
            <span className="text-[#007185] font-bold">Help &amp; Support Concierge</span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <Link
              href="/account"
              className="px-3.5 py-1.5 rounded-xl bg-white border border-[#D5D9D9] text-[#0F1111] font-semibold hover:border-[#007185] transition-colors shadow-xs flex items-center gap-1.5"
            >
              <User className="h-3.5 w-3.5 text-[#007185]" />
              <span>Go to My Account</span>
            </Link>
            <Link
              href="/account?tab=orders"
              className="px-3.5 py-1.5 rounded-xl bg-[#007185] text-white font-semibold hover:bg-[#002175] transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Package className="h-3.5 w-3.5" />
              <span>My Orders</span>
            </Link>
          </div>
        </div>

        <Suspense
          fallback={
            <div className="w-full min-h-[400px] flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-[#007185] border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <HelpSupportView embeddedInAccount={false} />
        </Suspense>
      </div>
    </div>
  );
}
