import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { checkRateLimit, rateLimitResponse, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * POST /api/vendor/onboard
 * Replaces testing-only instant approval with real administrative onboarding workflow.
 * Submits a new VendorApplication with status 'SUBMITTED' and initializes VendorProfile with 'PENDING'.
 * User role remains CUSTOMER until an Administrator reviews and approves the application.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth();

    // Rate limiting: 5 onboarding submissions per 10 minutes per user / IP
    const clientIp = getClientIp(request);
    const rateCheck = checkRateLimit(`onboard:${auth.userId}:${clientIp}`, 5, 600);
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.resetInSeconds, 'Too many vendor application attempts. Please wait before retrying.');
    }

    const body = await request.json().catch(() => ({}));
    const rawStoreName = body.storeName?.trim() || `${auth.dbUser.name || 'Artisan'}'s Boutique`;
    const storeDescription =
      body.storeDescription?.trim() || 'Independent Artisan Merchant applying for Vyntra Marketplace';
    const businessEmail = body.businessEmail?.trim() || auth.email;
    const businessPhone = body.businessPhone?.trim() || auth.dbUser.phone || '';
    const gstNumber = body.gstNumber?.trim() || null;
    const panNumber = body.panNumber?.trim() || null;

    // Banking Details for Payouts
    const bankName = body.bankName?.trim() || null;
    const bankAccountNumber = body.bankAccountNumber?.trim() || null;
    const ifscCode = body.ifscCode?.trim()?.toUpperCase() || null;
    const accountHolderName = body.accountHolderName?.trim() || auth.dbUser.name || null;

    // Registered Pickup Address
    const streetAddress = body.streetAddress?.trim() || null;
    const city = body.city?.trim() || null;
    const state = body.state?.trim() || null;
    const pincode = body.pincode?.trim() || null;

    // Strict input bounds
    if (rawStoreName.length < 2 || rawStoreName.length > 100) {
      return apiError('Store name must be between 2 and 100 characters.', 400, null, 'INVALID_STORE_NAME');
    }
    if (storeDescription.length > 1000) {
      return apiError('Store description cannot exceed 1000 characters.', 400, null, 'DESCRIPTION_TOO_LONG');
    }
    if (businessEmail.length > 120 || !businessEmail.includes('@')) {
      return apiError('Please provide a valid business email address.', 400, null, 'INVALID_EMAIL');
    }
    if (businessPhone && businessPhone.length > 25) {
      return apiError('Business phone cannot exceed 25 characters.', 400, null, 'INVALID_PHONE');
    }
    if (gstNumber && gstNumber.length > 25) {
      return apiError('GST number cannot exceed 25 characters.', 400, null, 'INVALID_GST');
    }
    if (panNumber && panNumber.length > 20) {
      return apiError('PAN number cannot exceed 20 characters.', 400, null, 'INVALID_PAN');
    }

    const storeName = rawStoreName;

    // Check if user is already an approved vendor
    if (auth.dbUser.vendorProfile?.status === 'APPROVED' && auth.role === 'VENDOR') {
      return apiError(
        'You are already an approved vendor on Vyntra Marketplace.',
        400,
        { vendorProfileId: auth.dbUser.vendorProfile.id },
        'ALREADY_APPROVED'
      );
    }

    // Check if user's vendor license was permanently suspended
    if (auth.dbUser.vendorProfile && auth.dbUser.vendorProfile.status === 'SUSPENDED') {
      return apiError(
        'Your vendor license has been permanently revoked by Marketplace Administration due to policy violations. You are barred from submitting new onboarding applications.',
        403,
        { vendorProfileId: auth.dbUser.vendorProfile.id },
        'VENDOR_LICENSE_REVOKED'
      );
    }

    // Check if tax credentials (PAN) belong to a suspended store
    const suspendedPan = await prisma.vendorProfile.findFirst({
      where: {
        panNumber: panNumber.trim().toUpperCase(),
        status: 'SUSPENDED',
      },
    });
    if (suspendedPan) {
      return apiError(
        'The provided PAN card is linked to a revoked merchant license. Re-application with this tax credential is permanently barred.',
        403,
        null,
        'PAN_REVOKED'
      );
    }

    // Check for an existing pending application
    const pendingApp = await prisma.vendorApplication.findFirst({
      where: {
        userId: auth.userId,
        status: { in: ['SUBMITTED', 'UNDER_REVIEW'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (pendingApp) {
      return apiError(
        `You already have an active vendor application for "${pendingApp.storeName}" pending administrator review.`,
        400,
        {
          applicationId: pendingApp.id,
          status: pendingApp.status,
          submittedAt: pendingApp.createdAt,
        },
        'APPLICATION_ALREADY_PENDING'
      );
    }

    // Check for previously rejected application to link resubmission history
    const previousRejectedApp = await prisma.vendorApplication.findFirst({
      where: {
        userId: auth.userId,
        status: 'REJECTED',
      },
      orderBy: { createdAt: 'desc' },
    });

    // Generate unique store slug
    const baseSlug = slugify(storeName) || 'artisan-store';
    const storeSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;

    // Generate Application Reference ID (e.g. APP-VND-84920)
    const applicationRef = `APP-VND-${Date.now().toString().slice(-6)}`;
    const bankAccountLast4 = bankAccountNumber && bankAccountNumber.length >= 4 ? bankAccountNumber.slice(-4) : null;

    const complianceDocuments = {
      applicationRef,
      bank: {
        accountHolder: accountHolderName,
        bankName,
        accountNumber: bankAccountNumber,
        accountLast4: bankAccountLast4,
        ifsc: ifscCode,
      },
      address: {
        street: streetAddress,
        city,
        state,
        pincode,
      },
    };

    // Atomic transaction: create application and initialize pending profile
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create formal VendorApplication record
      const application = await tx.vendorApplication.create({
        data: {
          userId: auth.userId,
          storeName,
          storeSlug,
          storeDescription,
          businessEmail,
          businessPhone,
          gstNumber,
          panNumber,
          documents: complianceDocuments,
          status: 'SUBMITTED',
          previousApplicationId: previousRejectedApp ? previousRejectedApp.id : null,
        },
      });

      // 2. Upsert VendorProfile in PENDING state (strictly unverified, non-operational)
      const profile = await tx.vendorProfile.upsert({
        where: { userId: auth.userId },
        create: {
          userId: auth.userId,
          storeName,
          storeSlug,
          storeDescription,
          gstNumber,
          panNumber,
          bankName,
          bankAccountLast4,
          ifscCode,
          status: 'PENDING',
          isVerified: false,
        },
        update: {
          storeName,
          storeSlug,
          storeDescription,
          gstNumber,
          panNumber,
          bankName,
          bankAccountLast4,
          ifscCode,
          status: 'PENDING',
          isVerified: false,
        },
      });

      return { application, profile };
    });

    return apiSuccess({
      message:
        'Vendor application submitted successfully! Your application is now pending review by Vyntra Marketplace Administrators.',
      application: {
        id: result.application.id,
        storeName: result.application.storeName,
        status: result.application.status,
        createdAt: result.application.createdAt,
        isResubmission: Boolean(result.application.previousApplicationId),
      },
      vendorProfile: {
        id: result.profile.id,
        storeName: result.profile.storeName,
        status: result.profile.status,
        isVerified: result.profile.isVerified,
      },
    });
  } catch (err: any) {
    console.error('[Vendor Onboard Error]:', err);
    return handleApiError(err);
  }
}
