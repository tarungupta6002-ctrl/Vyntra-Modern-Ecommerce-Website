import { NextResponse } from 'next/server';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { ApplicationStatus, VendorStatus, UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * GET /api/admin/vendor-applications/[id]
 * Inspects a single vendor application in full detail.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const admin = await requireAdmin();
    const { id } = context.params;

    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return apiError('Invalid application ID.', 400, null, 'INVALID_ID');
    }

    const application = await prisma.vendorApplication.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            createdAt: true,
          },
        },
        previousApplication: {
          select: {
            id: true,
            storeName: true,
            status: true,
            rejectionReason: true,
            reviewedAt: true,
            createdAt: true,
          },
        },
        resubmissions: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            reviewedAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!application) {
      return apiError('Vendor application not found.', 404);
    }

    // Mask sensitive identifiers
    const maskedPan = application.panNumber
      ? `••••••••${application.panNumber.slice(-2)}`
      : null;
    const maskedGst = application.gstNumber
      ? `${application.gstNumber.slice(0, 2)}•••••••••${application.gstNumber.slice(-3)}`
      : null;

    return apiSuccess({
      ...application,
      gstNumber: maskedGst,
      panNumber: maskedPan,
    });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    return handleApiError(err);
  }
}

/**
 * PATCH /api/admin/vendor-applications/[id]
 * Approves, rejects, or marks a vendor application under review.
 * Enforces atomic state transitions across VendorApplication, VendorProfile, and User models.
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const admin = await requireAdmin();
    const { id } = context.params;

    // Rate limiting: 60 admin moderation actions per minute per admin user
    const rateCheck = checkRateLimit(`admin-mod:${admin.userId}`, 60, 60);
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.resetInSeconds, 'Admin moderation rate limit reached. Please slow down.');
    }

    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return apiError('Invalid application ID.', 400, null, 'INVALID_ID');
    }

    const body = await request.json().catch(() => ({}));
    const action = body.action?.toUpperCase(); // 'APPROVE' | 'REJECT' | 'UNDER_REVIEW'
    const rejectionReason = body.rejectionReason?.trim();
    const internalAdminNotes = body.internalAdminNotes?.trim();

    if (!['APPROVE', 'REJECT', 'UNDER_REVIEW'].includes(action)) {
      return apiError(
        'Invalid moderation action. Permitted actions: APPROVE, REJECT, UNDER_REVIEW.',
        400,
        null,
        'INVALID_ACTION'
      );
    }

    if (rejectionReason && rejectionReason.length > 500) {
      return apiError('Rejection reason cannot exceed 500 characters.', 400, null, 'INPUT_TOO_LONG');
    }

    if (internalAdminNotes && internalAdminNotes.length > 1000) {
      return apiError('Internal admin notes cannot exceed 1000 characters.', 400, null, 'INPUT_TOO_LONG');
    }

    const application = await prisma.vendorApplication.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!application) {
      return apiError('Vendor application not found.', 404);
    }

    // Critical Requirement: Users cannot approve or reject their own vendor application
    if (application.userId === admin.userId) {
      return apiError(
        'Self-approval is forbidden. Platform administrators cannot approve or reject their own vendor applications. Segregation of duties is enforced.',
        403,
        null,
        'FORBIDDEN_SELF_APPROVAL'
      );
    }

    // Process Action
    if (action === 'APPROVE') {
      // Idempotency: Prevent repeating approval if already approved
      if (application.status === ApplicationStatus.APPROVED) {
        return apiError(
          'This vendor application has already been approved.',
          400,
          null,
          'APPLICATION_ALREADY_APPROVED'
        );
      }

      const result = await prisma.$transaction(async (tx) => {
        // Generate Unique Official Vyntra Merchant ID (Amazon Seller Token format)
        const uniqueSellerId = `VYN-SELLER-${Math.floor(10000 + Math.random() * 90000)}`;

        // Extract compliance documents (bank & address details)
        const docs = (application.documents as any) || {};
        const bankData = docs.bank || {};

        // 1. Update application status
        const updatedApp = await tx.vendorApplication.update({
          where: { id: application.id },
          data: {
            status: ApplicationStatus.APPROVED,
            reviewedByAdminId: admin.userId,
            reviewedAt: new Date(),
            rejectionReason: null,
            documents: {
              ...docs,
              assignedSellerId: uniqueSellerId,
              approvedAt: new Date().toISOString(),
            },
            ...(internalAdminNotes ? { internalAdminNotes } : {}),
          },
        });

        // 2. Activate VendorProfile to APPROVED with Unique Merchant ID
        const updatedProfile = await tx.vendorProfile.upsert({
          where: { userId: application.userId },
          create: {
            userId: application.userId,
            storeName: application.storeName,
            storeSlug: application.storeSlug,
            storeDescription: application.storeDescription,
            gstNumber: application.gstNumber,
            panNumber: application.panNumber,
            payoutBeneficiaryId: uniqueSellerId,
            bankName: bankData.bankName || null,
            bankAccountLast4: bankData.accountLast4 || null,
            ifscCode: bankData.ifsc || null,
            payoutsEnabled: true,
            status: VendorStatus.APPROVED,
            isVerified: true,
          },
          update: {
            storeName: application.storeName,
            gstNumber: application.gstNumber || undefined,
            panNumber: application.panNumber || undefined,
            payoutBeneficiaryId: uniqueSellerId,
            bankName: bankData.bankName || undefined,
            bankAccountLast4: bankData.accountLast4 || undefined,
            ifscCode: bankData.ifsc || undefined,
            payoutsEnabled: true,
            status: VendorStatus.APPROVED,
            isVerified: true,
          },
        });

        // 3. Create or Upsert default VendorWarehouse from application address
        const addressData = (application.documents as any)?.address || {};
        const whCode = `WH-${(application.storeSlug || 'VND').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).toUpperCase()}-01`;
        const facilityName = `${application.storeName} Dispatch Facility`;

        await tx.vendorWarehouse.upsert({
          where: {
            vendorId_warehouseCode: {
              vendorId: updatedProfile.id,
              warehouseCode: whCode,
            },
          },
          create: {
            vendorId: updatedProfile.id,
            warehouseCode: whCode,
            facilityName: facilityName,
            streetAddress: addressData.street || 'Primary Vendor Facility',
            city: addressData.city || 'Primary City',
            state: addressData.state || 'Primary State',
            postalCode: addressData.pincode || '110001',
            contactPhone: application.businessPhone || '9876543210',
            isDefault: true,
          },
          update: {
            facilityName: facilityName,
            streetAddress: addressData.street || undefined,
            city: addressData.city || undefined,
            state: addressData.state || undefined,
            postalCode: addressData.pincode || undefined,
            contactPhone: application.businessPhone || undefined,
            isDefault: true,
          },
        });

        // 4. Elevate user role to VENDOR only if not already ADMIN or SUPER_ADMIN
        const currentTargetUser = await tx.user.findUnique({
          where: { id: application.userId },
          select: { role: true },
        });

        if (
          currentTargetUser &&
          currentTargetUser.role !== UserRole.ADMIN &&
          currentTargetUser.role !== UserRole.SUPER_ADMIN
        ) {
          await tx.user.update({
            where: { id: application.userId },
            data: { role: UserRole.VENDOR },
          });
        }

        return { updatedApp, updatedProfile };
      });

      return apiSuccess({
        message: `Application for "${result.updatedApp.storeName}" has been APPROVED. Vendor is now authorized to publish and sell on Vyntra.`,
        application: result.updatedApp,
        vendorProfile: result.updatedProfile,
      });
    }

    if (action === 'REJECT') {
      // Idempotency: Prevent repeating rejection if already rejected
      if (application.status === ApplicationStatus.REJECTED) {
        return apiError(
          'This vendor application has already been rejected.',
          400,
          null,
          'APPLICATION_ALREADY_REJECTED'
        );
      }

      if (!rejectionReason) {
        return apiError(
          'A clear rejection reason is required when rejecting a vendor application.',
          400,
          null,
          'REJECTION_REASON_REQUIRED'
        );
      }

      const result = await prisma.$transaction(async (tx) => {
        // 1. Update application status to REJECTED
        const updatedApp = await tx.vendorApplication.update({
          where: { id: application.id },
          data: {
            status: ApplicationStatus.REJECTED,
            rejectionReason,
            reviewedByAdminId: admin.userId,
            reviewedAt: new Date(),
            ...(internalAdminNotes ? { internalAdminNotes } : {}),
          },
        });

        // 2. Mark VendorProfile as REJECTED
        await tx.vendorProfile.updateMany({
          where: { userId: application.userId },
          data: {
            status: VendorStatus.REJECTED,
            isVerified: false,
          },
        });

        // 3. Revert user role to CUSTOMER only if not ADMIN or SUPER_ADMIN
        const currentTargetUser = await tx.user.findUnique({
          where: { id: application.userId },
          select: { role: true },
        });

        if (
          currentTargetUser &&
          currentTargetUser.role !== UserRole.ADMIN &&
          currentTargetUser.role !== UserRole.SUPER_ADMIN
        ) {
          await tx.user.update({
            where: { id: application.userId },
            data: { role: UserRole.CUSTOMER },
          });
        }

        return updatedApp;
      });

      return apiSuccess({
        message: `Application for "${result.storeName}" has been REJECTED. Reason recorded for resubmission feedback.`,
        application: result,
      });
    }

    if (action === 'UNDER_REVIEW') {
      const updatedApp = await prisma.vendorApplication.update({
        where: { id: application.id },
        data: {
          status: ApplicationStatus.UNDER_REVIEW,
          reviewedByAdminId: admin.userId,
          ...(internalAdminNotes ? { internalAdminNotes } : {}),
        },
      });

      return apiSuccess({
        message: `Application for "${updatedApp.storeName}" status set to UNDER_REVIEW.`,
        application: updatedApp,
      });
    }
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    return handleApiError(err);
  }
}
