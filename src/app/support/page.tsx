import React, { Suspense } from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { HelpSupportView } from '@/components/account/help-support-view';

export const metadata: Metadata = {
  title: 'Help & Support | Vyntra',
  description: 'Help with orders, delivery, returns, refunds and payments on Vyntra, and a way to contact our team.',
};

export default function GeneralSupportPage() {
  return (
    <div className="w-full bg-[#F7F8F8] min-h-screen text-[#0F1111] antialiased py-6 sm:py-8">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-2 text-xs text-[#565959]">
          <Link href="/" className="hover:text-[#007185] hover:underline">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-semibold text-[#0F1111]">Help &amp; Support</span>
        </nav>

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
