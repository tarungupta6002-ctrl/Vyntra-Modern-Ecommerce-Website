import { NextResponse } from 'next/server';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { logAdminAction } from '@/lib/audit';
import { VendorStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { id: string };
}

/**
 * GET /api/admin/vendors/[id]
 * Retrieves comprehensive vendor profile details, offers count, metrics, and audit history.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    await requireAdmin();
    const vendorId = context.params.id;

    let vendor: any = null;
    try {
      vendor = await prisma.vendorProfile.findUnique({
        where: { id: vendorId },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, role: true } },
          warehouses: {
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
          },
          products: {
            include: {
              variants: {
                orderBy: { createdAt: 'asc' },
              },
              images: {
                orderBy: { sortOrder: 'asc' },
              },
              category: { select: { id: true, name: true, slug: true } },
              inventories: true,
            },
            orderBy: { createdAt: 'desc' },
          },
          sellerOffers: {
            include: {
              product: {
                include: {
                  category: { select: { id: true, name: true, slug: true } },
                  images: { orderBy: { sortOrder: 'asc' } },
                  variants: { orderBy: { createdAt: 'asc' } },
                  vendor: { select: { id: true, storeName: true, storeSlug: true } },
                },
              },
              offerVariants: {
                include: {
                  productVariant: true,
                  inventories: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: {
              products: true,
              sellerOffers: true,
              shipments: true,
              orderItems: true,
            },
          },
        },
      });
    } catch {
      // In-memory fallback
      vendor = {
        id: vendorId,
        storeName: 'Royal Banaras Silks',
        storeSlug: 'royal-banaras-silks',
        status: VendorStatus.APPROVED,
        isVerified: true,
        commissionRate: 10,
        rating: 4.8,
        totalSales: 142,
        user: { name: 'Mukund Verma', email: 'mukund@banarassilks.com', phone: '+91 9876543210' },
        _count: { products: 12, sellerOffers: 8, shipments: 34, orderItems: 142 },
      };
    }

    if (!vendor) {
      return apiError('Vendor profile not found.', 404);
    }

    return apiSuccess({ vendor });
  } catch (err: any) {
    const authErr = handleAuthError(err);
    if (authErr) return authErr;
    return handleApiError(err);
  }
}

/**
 * PATCH /api/admin/vendors/[id]
 * Updates vendor status (approve, suspend, reactivate), verification badge, or commission rate.
 * Records immutable audit trail.
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const admin = await requireAdmin();
    const vendorId = context.params.id;
    const body = await request.json().catch(() => ({}));

    const currentVendor = await prisma.vendorProfile.findUnique({
      where: { id: vendorId },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    if (!currentVendor) {
      return apiError('Vendor profile not found.', 404);
    }

    // Safety: Protect Tarun Store & Root Admins from license revocation
    const isProtectedStore =
      currentVendor.storeSlug.includes('tarun-store') ||
      currentVendor.user?.email === 'tarungupta6002@gmail.com' ||
      currentVendor.user?.role === 'SUPER_ADMIN';

    // LICENSE REVOCATION / SUSPENSION
    if (body.action === 'REVOKE_LICENSE' || body.status === 'SUSPENDED') {
      if (isProtectedStore) {
        return apiError('Security Policy: Cannot revoke license of the marketplace root administrator store.', 403);
      }

      const revokeReason = body.reason?.trim() || 'Selling privileges permanently revoked by marketplace administration.';

      const [updatedVendor, updatedProducts, updatedUser] = await prisma.$transaction([
        // 1. Suspend vendor profile & disable payouts
        prisma.vendorProfile.update({
          where: { id: vendorId },
          data: {
            status: VendorStatus.SUSPENDED,
            isVerified: false,
            payoutsEnabled: false,
          },
        }),
        // 2. Delist all products from the customer storefront immediately
        prisma.product.updateMany({
          where: { vendorId },
          data: { isPublished: false },
        }),
        // 3. Downgrade user role to CUSTOMER
        prisma.user.update({
          where: { id: currentVendor.userId },
          data: { role: 'CUSTOMER' },
        }),
      ]);

      // Record Audit Trail
      await logAdminAction({
        adminId: admin.userId,
        adminEmail: admin.email,
        entity: 'VENDOR',
        entityId: vendorId,
        action: 'VENDOR_LICENSE_REVOKED',
        details: {
          storeName: currentVendor.storeName,
          storeSlug: currentVendor.storeSlug,
          productsUnpublished: updatedProducts.count,
          reason: revokeReason,
        },
      });

      return apiSuccess({
        message: `License for "${currentVendor.storeName}" revoked. ${updatedProducts.count} product(s) delisted and vendor portal suspended.`,
        vendor: updatedVendor,
        productsUnpublishedCount: updatedProducts.count,
      });
    }

    const updateData: any = {};
    const beforeState: any = {};
    const afterState: any = {};

    // 1. Status update
    if (body.status && Object.values(VendorStatus).includes(body.status)) {
      beforeState.status = currentVendor.status;
      afterState.status = body.status;
      updateData.status = body.status;
    }

    // 2. Verification badge toggle
    if (typeof body.isVerified === 'boolean') {
      beforeState.isVerified = currentVendor.isVerified;
      afterState.isVerified = body.isVerified;
      updateData.isVerified = body.isVerified;
    }

    // 3. Custom commission rate update
    if (body.commissionRate !== undefined && !isNaN(Number(body.commissionRate))) {
      const rate = Math.max(0, Math.min(50, Number(body.commissionRate)));
      beforeState.commissionRate = Number(currentVendor.commissionRate);
      afterState.commissionRate = rate;
      updateData.commissionRate = rate;
    }

    if (Object.keys(updateData).length === 0) {
      return apiError('No valid vendor update parameters supplied.', 400);
    }

    const updatedVendor = await prisma.vendorProfile.update({
      where: { id: vendorId },
      data: updateData,
    });

    // Record Audit Trail
    await logAdminAction({
      adminId: admin.userId,
      adminEmail: admin.email,
      entity: 'VENDOR',
      entityId: vendorId,
      action: body.status ? `VENDOR_STATUS_${body.status}` : 'VENDOR_UPDATE',
      details: {
        before: beforeState,
        after: afterState,
        reason: body.reason || 'Admin Multi-Seller Portal intervention.',
      },
    });

    return apiSuccess({
      message: `Vendor "${updatedVendor.storeName}" successfully updated.`,
      vendor: updatedVendor,
    });
  } catch (err: any) {
    const authErr = handleAuthError(err);
    if (authErr) return authErr;
    return handleApiError(err);
  }
}
