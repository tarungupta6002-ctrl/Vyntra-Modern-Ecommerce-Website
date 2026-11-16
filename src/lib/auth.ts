import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { UserRole, VendorStatus } from '@prisma/client';
import { apiError } from '@/lib/api-response';

export interface AuthContext {
  userId: string;
  email: string;
  role: UserRole;
  dbUser: NonNullable<Awaited<ReturnType<typeof fetchDbUser>>>;
}

async function fetchDbUser(id: string) {
  return await prisma.user.findUnique({
    where: { id },
    include: {
      vendorProfile: {
        select: {
          id: true,
          storeName: true,
          storeSlug: true,
          status: true,
          isVerified: true,
          commissionRate: true,
        },
      },
    },
  });
}

/**
 * Retrieves the currently authenticated Supabase Auth user and joins their Prisma database profile.
 * Returns null if the user is unauthenticated or has not yet synced to public.User.
 */
export async function getAuthenticatedUser(): Promise<AuthContext | null> {
  // Standard Supabase Auth
  try {
    const supabase = createClient();
    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser();

    if (error || !authUser) {
      return null;
    }

    let dbUser = await fetchDbUser(authUser.id);
    if (!dbUser && authUser.email) {
      // Self-healing: Automatically create public.User if user is authenticated in Supabase
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

      dbUser = await fetchDbUser(authUser.id);
    }

    if (!dbUser) {
      return null;
    }

    return {
      userId: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      dbUser,
    };
  } catch (err) {
    console.error('[getAuthenticatedUser error]:', err);
    return null;
  }
}

/**
 * Server-side guard requiring an active authenticated user.
 * Throws an API response error (401 Unauthorized) if unauthenticated.
 */
export async function requireAuth(): Promise<AuthContext> {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    throw new AuthError('Authentication required. Please sign in.', 401, 'UNAUTHORIZED');
  }
  return auth;
}

/**
 * Server-side guard requiring one of the specified user roles.
 * Throws 401 if unauthenticated, or 403 Forbidden if the user lacks the role.
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<AuthContext> {
  const auth = await requireAuth();
  if (!allowedRoles.includes(auth.role)) {
    throw new AuthError(
      `Access denied. Role ${auth.role} is not permitted for this action.`,
      403,
      'FORBIDDEN'
    );
  }
  return auth;
}

/**
 * Guard requiring ADMIN or SUPER_ADMIN role.
 */
export async function requireAdmin(): Promise<AuthContext> {
  return await requireRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
}

/**
 * Guard requiring VENDOR role with an approved profile (or ADMIN).
 */
export async function requireVendor(): Promise<AuthContext & { vendorProfileId: string }> {
  const auth = await requireAuth();

  // Admins always have access
  if (auth.role === UserRole.ADMIN || auth.role === UserRole.SUPER_ADMIN) {
    if (auth.dbUser.vendorProfile) {
      return { ...auth, vendorProfileId: auth.dbUser.vendorProfile.id };
    }
  }

  if (auth.role !== UserRole.VENDOR || !auth.dbUser.vendorProfile) {
    throw new AuthError(
      'Access denied. A registered vendor account is required.',
      403,
      'FORBIDDEN_NOT_VENDOR'
    );
  }

  if (auth.dbUser.vendorProfile.status !== VendorStatus.APPROVED) {
    throw new AuthError(
      `Your vendor account status is ${auth.dbUser.vendorProfile.status}. Selling actions are not allowed until approval.`,
      403,
      'VENDOR_NOT_APPROVED'
    );
  }

  return {
    ...auth,
    vendorProfileId: auth.dbUser.vendorProfile.id,
  };
}

/**
 * Verifies that a vendor owns the given product before mutations (edit/delete).
 */
export async function verifyVendorOwnership(productId: string, vendorProfileId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, vendorId: true, title: true, slug: true },
  });

  if (!product) {
    throw new AuthError('Product not found.', 404, 'NOT_FOUND');
  }

  if (product.vendorId !== vendorProfileId) {
    throw new AuthError('Access denied. You do not own this product.', 403, 'FORBIDDEN_NOT_OWNER');
  }

  return product;
}

/**
 * Custom error class for clean HTTP error throwing in Route Handlers.
 */
export class AuthError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 401, code = 'AUTH_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'AuthError';
  }
}

/**
 * Formats an AuthError into a standardized Next.js JSON API response.
 */
export function handleAuthError(err: unknown) {
  if (err instanceof AuthError) {
    return apiError(err.message, err.status, null, err.code);
  }
  return apiError('Internal server error during authentication.', 500, null, 'INTERNAL_AUTH_ERROR');
}
