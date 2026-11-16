import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return apiError('Authentication required. Please sign in.', 401, null, 'UNAUTHORIZED');
    }

    const isVendor = auth.role === 'VENDOR' || auth.role === 'ADMIN' || auth.role === 'SUPER_ADMIN';
    const profile = auth.dbUser.vendorProfile;

    // Fetch latest vendor application (if any) to check pending / rejected state
    const latestApplication = await prisma.vendorApplication.findFirst({
      where: { userId: auth.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        storeName: true,
        storeSlug: true,
        status: true,
        rejectionReason: true,
        documents: true,
        createdAt: true,
      },
    });

    return apiSuccess({
      userId: auth.userId,
      email: auth.email,
      name: auth.dbUser.name,
      role: auth.role,
      isVendor,
      vendorProfile: profile
        ? {
            id: profile.id,
            storeName: profile.storeName,
            storeSlug: profile.storeSlug,
            status: profile.status,
            isVerified: profile.isVerified,
          }
        : null,
      vendorApplication: latestApplication,
    });
  } catch (err: any) {
    console.error('[Vendor ME GET Error]:', err);
    return apiError('Failed to fetch vendor session', 500, err.message);
  }
}

