import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { ShieldAlert } from 'lucide-react';
import { AdminShell } from '@/components/admin/admin-shell';

export const metadata = {
  title: 'Admin | Vyntra',
  description: 'Run the Vyntra marketplace: sellers, catalog, orders, returns and payouts.',
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
    <AdminShell
      user={{
        name: auth.dbUser.name || 'Admin',
        email: auth.dbUser.email,
        role: auth.role,
      }}
    >
      {children}
    </AdminShell>
  );
}
