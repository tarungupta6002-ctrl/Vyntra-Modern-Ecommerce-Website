import { NextResponse } from 'next/server';

// ==============================================================================
// VYNTRA STANDARDIZED API RESPONSE & ERROR HANDLING UTILITY
// ==============================================================================

export interface ApiSuccessPayload<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
  timestamp: string;
}

export interface ApiErrorPayload {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
  timestamp: string;
}

/**
 * Creates a uniform success response envelope for Next.js Route Handlers.
 */
export function apiSuccess<T>(
  data: T,
  meta?: Record<string, unknown>,
  status = 200
): NextResponse<ApiSuccessPayload<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      meta,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Creates a uniform error response envelope for Next.js Route Handlers.
 */
export function apiError(
  message: string,
  status = 500,
  details?: unknown,
  code?: string
): NextResponse<ApiErrorPayload> {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        code,
        details,
      },
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Helper to safely handle uncaught route errors, including known Prisma errors.
 */
export function handleApiError(err: unknown): NextResponse<ApiErrorPayload> {
  console.error('[API Error]:', err);

  // Prisma unique constraint violation (code P2002)
  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    err.code === 'P2002'
  ) {
    const meta = (err as { meta?: { target?: string[] } }).meta;
    const fields = meta?.target?.join(', ') || 'field';
    return apiError(`A record with this ${fields} already exists.`, 409, null, 'DUPLICATE_RECORD');
  }

  // Standard Error instance
  if (err instanceof Error) {
    // Sanitize error message to prevent leaking internal database paths or secrets
    const isSensitive =
      err.message.includes('password') ||
      err.message.includes('DATABASE_URL') ||
      err.message.includes('SELECT') ||
      err.message.includes('UPDATE') ||
      err.message.includes('INSERT') ||
      err.message.includes('DELETE') ||
      err.message.includes('PrismaClient');

    const clientMessage = isSensitive
      ? 'A database error occurred while processing your request.'
      : err.message;

    return apiError(clientMessage, 500, null, 'INTERNAL_SERVER_ERROR');
  }

  return apiError('An unexpected server error occurred.', 500, null, 'UNKNOWN_ERROR');
}
