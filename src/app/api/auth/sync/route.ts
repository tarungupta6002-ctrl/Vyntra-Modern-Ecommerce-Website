import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api-response';
import { checkRateLimit, rateLimitResponse, getClientIp } from '@/lib/rate-limit';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/sync
 * Synchronizes the authenticated Supabase Auth user to Prisma (public.User).
 * Supports both Cookie-based session and Authorization: Bearer <token> header.
 * Strictly assigns CUSTOMER role on creation; never overwrites elevated roles.
 */
export async function POST(request: Request) {
  try {
    // Rate limit: 40 requests per minute per IP
    const clientIp = getClientIp(request);
    const rateCheck = checkRateLimit(`auth-sync:${clientIp}`, 40, 60);
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.resetInSeconds, 'Too many authentication sync requests. Please wait a moment.');
    }

    const supabase = createClient();

    // Check for Authorization Bearer token in request headers
    const authHeader = request.headers.get('Authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;

    // Validate user with Supabase Auth (using token if provided, or cookies)
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser(bearerToken);

    if (authError || !authUser || !authUser.email) {
      console.warn('[Auth Sync] Supabase validation failed:', authError?.message || 'No user/email');
      return apiError('Unauthorized: No valid session found.', 401, null, 'UNAUTHORIZED');
    }

    // Optional metadata from request body (name, phone)
    let bodyName: string | undefined;
    let bodyPhone: string | undefined;
    try {
      const body = await request.json();
      if (typeof body.name === 'string' && body.name.trim()) {
        bodyName = body.name.trim();
      }
      if (typeof body.phone === 'string' && body.phone.trim()) {
        bodyPhone = body.phone.trim();
      }
    } catch {
      // Body is optional
    }

    const trustedName =
      bodyName ||
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      authUser.email.split('@')[0];

    const trustedPhone =
      bodyPhone ||
      authUser.user_metadata?.phone ||
      authUser.phone ||
      null;

    // Secure Upsert:
    // 1. If new user: role is strictly CUSTOMER (never trust browser role)
    // 2. If existing user: DO NOT overwrite role! Only update name/phone/email
    const user = await prisma.user.upsert({
      where: { id: authUser.id },
      create: {
        id: authUser.id,
        email: authUser.email,
        name: trustedName,
        phone: trustedPhone,
        role: UserRole.CUSTOMER,
        tier: 'Royal Member',
      },
      update: {
        email: authUser.email,
        name: trustedName,
        ...(trustedPhone ? { phone: trustedPhone } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        avatar: true,
        tier: true,
        createdAt: true,
      },
    });

    console.log(`[Auth Sync] Successfully synced user ${user.id} (${user.email}) to public.User`);

    return apiSuccess({
      user,
      synced: true,
    });
  } catch (error) {
    console.error('[Auth Sync Error]:', error);
    return apiError('Failed to synchronize user profile.', 500, null, 'SYNC_FAILED');
  }
}

/**
 * GET /api/auth/sync
 * Retrieves the current authenticated user profile from database.
 */
export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const authHeader = request.headers.get('Authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser(bearerToken);

    if (authError || !authUser) {
      return apiError('Unauthenticated.', 401, null, 'UNAUTHORIZED');
    }

    let user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        avatar: true,
        tier: true,
        createdAt: true,
        vendorProfile: {
          select: {
            id: true,
            storeName: true,
            storeSlug: true,
            status: true,
            isVerified: true,
          },
        },
      },
    });

    // Self-healing: if found in auth but missing in public.User, upsert now
    if (!user && authUser.email) {
      const trustedName =
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        authUser.email.split('@')[0];

      await prisma.user.upsert({
        where: { id: authUser.id },
        create: {
          id: authUser.id,
          email: authUser.email,
          name: trustedName,
          phone: authUser.user_metadata?.phone || authUser.phone || null,
          role: UserRole.CUSTOMER,
          tier: 'Royal Member',
        },
        update: {
          email: authUser.email,
        },
      });

      user = await prisma.user.findUnique({
        where: { id: authUser.id },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          avatar: true,
          tier: true,
          createdAt: true,
          vendorProfile: {
            select: {
              id: true,
              storeName: true,
              storeSlug: true,
              status: true,
              isVerified: true,
            },
          },
        },
      });
    }

    if (!user) {
      return apiError('User record not found in database.', 404, null, 'USER_NOT_FOUND');
    }

    return apiSuccess({ user });
  } catch (error) {
    console.error('[Auth Get Error]:', error);
    return apiError('Server error retrieving user profile.', 500, null, 'SERVER_ERROR');
  }
}
