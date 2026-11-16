import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import {
  ShieldAlert,
  ExternalLink,
} from 'lucide-react';
import { AdminHeader } from '@/components/admin/admin-header';

export const metadata = {
  title: 'Admin Central | Vyntra Marketplace Governance',
  description: 'Enterprise administration, vendor onboarding approval, and catalog moderation.',
};

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getAuthenticatedUser();

  // Guard 1: Must be authenticated
  if (!auth) {
    redirect('/login?redirect=/admin');
  }

  // Guard 2: Server-side role verification — strictly ADMIN or SUPER_ADMIN
  const isAdmin = auth.role === UserRole.ADMIN || auth.role === UserRole.SUPER_ADMIN;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#F7F8F8] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-[#D5D9D9] p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-headline font-bold text-[#0F1111]">
            403 — Unauthorized Administrative Access
          </h1>
          <p className="text-xs text-[#565959] leading-relaxed">
            Access to Vyntra Admin Central is strictly restricted to verified platform administrators.
            Your current authenticated account role is{' '}
            <strong className="text-rose-700 uppercase font-mono">{auth.role}</strong>.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/"
              className="w-full py-2.5 rounded-lg bg-[#0F1111] text-white text-xs font-bold hover:bg-[#232F3E] transition-all"
            >
              Return to Storefront
            </Link>
            {auth.role === UserRole.VENDOR && (
              <Link
                href="/vendor/products"
                className="w-full py-2.5 rounded-lg bg-[#F7F8F8] border border-[#D5D9D9] text-[#007185] text-xs font-bold hover:bg-[#EAEDED] transition-all"
              >
                Go to Seller Central
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="-mt-[108px] lg:-mt-[100px] min-h-screen bg-[#F7F8F8] text-[#0F1111] flex flex-col font-sans">
      {/* Enterprise Governance Top Navigation Bar */}
      <AdminHeader
        user={{
          name: auth.dbUser.name || 'Admin',
          email: auth.dbUser.email,
          role: auth.role,
        }}
      />

      {/* Main Admin Content */}
      <main className="flex-1 max-w-[1500px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Admin Footer */}
      <footer className="bg-[#232F3E] text-white/70 py-6 text-xs border-t border-white/10 text-center">
        <div className="max-w-[1500px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} Vyntra Marketplace Enterprise Governance Desk. Authenticated &amp; Encrypted.</p>
          <div className="flex items-center gap-4 text-white/80">
            <Link href="/admin/vendors?tab=verified" className="hover:underline">Verified Vendors</Link>
            <span>•</span>
            <Link href="/admin/vendors?tab=applications" className="hover:underline">Applications</Link>
            <span>•</span>
            <Link href="/admin/products" className="hover:underline">Catalog Moderation</Link>
            <span>•</span>
            <Link href="/" className="hover:underline flex items-center gap-1">
              Live Store <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
