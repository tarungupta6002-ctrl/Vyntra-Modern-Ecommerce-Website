import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { VendorHeader } from '@/components/vendor/vendor-header';
import { VendorNoticeBanner } from '@/components/vendor/vendor-notice-banner';
import { getAuthenticatedUser } from '@/lib/auth';

export const metadata = {
  title: 'Vendor Partner Center | Vyntra Marketplace',
  description: 'Manage your artisanal catalog, inventory, and listings on Vyntra.',
};

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getAuthenticatedUser();

  if (!auth) {
    redirect('/become-seller');
  }

  const isApprovedVendor =
    (auth.role === 'VENDOR' || auth.role === 'ADMIN' || auth.role === 'SUPER_ADMIN') &&
    Boolean(auth.dbUser.vendorProfile && auth.dbUser.vendorProfile.status === 'APPROVED');

  if (!isApprovedVendor) {
    redirect('/become-seller');
  }

  return (
    <div className="-mt-[108px] lg:-mt-[100px] min-h-screen bg-[#F7F8F8] text-[#0F1111] flex flex-col font-sans">
      {/* Dynamic Authenticated Vendor Top Navigation Bar */}
      <VendorHeader />

      {/* Main Vendor Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <VendorNoticeBanner />
        {children}
      </main>

      {/* Vendor Footer */}
      <footer className="bg-[#232F3E] text-white/70 py-6 text-xs border-t border-white/10 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} Vyntra Marketplace Partner Center. Strictly Confirmed & Encrypted.</p>
          <div className="flex items-center gap-4 text-white/80">
            <Link href="/support" className="hover:underline">Merchant Guidelines</Link>
            <span>•</span>
            <Link href="/products" className="hover:underline flex items-center gap-1">
              Customer Catalog <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
