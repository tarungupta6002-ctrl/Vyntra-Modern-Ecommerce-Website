import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Updates the Supabase Auth session by refreshing cookies when needed,
 * and handles route protection for customer account pages.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  // If anon key is missing or placeholder, bypass session refresh to avoid build/runtime errors
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseAnonKey === 'placeholder-anon-key') {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: Use getUser() instead of getSession() to guarantee secure server-side validation
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // CSRF Defense: Verify Origin header on state-changing API mutations
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method) && pathname.startsWith('/api')) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    if (origin && host) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          return NextResponse.json(
            {
              success: false,
              error: {
                message: 'Cross-Origin Request Blocked by Vyntra CSRF Protection Policy.',
                code: 'CSRF_BLOCKED',
              },
              timestamp: new Date().toISOString(),
            },
            { status: 403 }
          );
        }
      } catch {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: 'Invalid Origin Header.',
              code: 'INVALID_ORIGIN',
            },
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        );
      }
    }
  }

  // Protect customer account, admin, and vendor routes: redirect unauthenticated users to /login
  const isAuthenticated = Boolean(user);
  if (!isAuthenticated && (pathname.startsWith('/account') || pathname.startsWith('/admin') || pathname.startsWith('/vendor'))) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', pathname + request.nextUrl.search);
    return NextResponse.redirect(redirectUrl);
  }

  // Prevent authenticated users from getting stuck on login/signup pages
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const rawRedirect = request.nextUrl.searchParams.get('redirect');
    // Open redirect validation: strictly local relative path, blocking protocol-relative and backslash payloads
    const isSafeRelative =
      rawRedirect &&
      rawRedirect.startsWith('/') &&
      !rawRedirect.startsWith('//') &&
      !rawRedirect.startsWith('/\\') &&
      !rawRedirect.startsWith('\\') &&
      !rawRedirect.includes(':') &&
      !rawRedirect.includes('//');

    const safeRedirect = isSafeRelative ? rawRedirect : '/account';
    return NextResponse.redirect(new URL(safeRedirect, request.url));
  }

  return response;
}
