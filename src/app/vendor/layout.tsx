import React from 'react';
import { redirect } from 'next/navigation';
import { VendorShell } from '@/components/vendor/vendor-shell';
import { VendorNoticeBanner } from '@/components/vendor/vendor-notice-banner';
import { getAuthenticatedUser } from '@/lib/auth';

export const metadata = {
  title: 'Seller Central | Vyntra',
  description: 'Manage your products, orders, returns and payouts on Vyntra.',
};

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuthenticatedUser();

  if (!auth) {
    redirect('/become-seller');
  }

  const profile = auth.dbUser.vendorProfile;
  const isApprovedVendor =
    (auth.role === 'VENDOR' || auth.role === 'ADMIN' || auth.role === 'SUPER_ADMIN') &&
    Boolean(profile && profile.status === 'APPROVED');

  if (!isApprovedVendor || !profile) {
    redirect('/become-seller');
  }

  return (
    <VendorShell
      identity={{
        name: auth.dbUser.name || auth.email.split('@')[0],
        email: auth.email,
        storeName: profile.storeName,
        isVerified: profile.isVerified,
      }}
    >
      <div className="space-y-6">
        <VendorNoticeBanner />
        {children}
      </div>
    </VendorShell>
  );
}
