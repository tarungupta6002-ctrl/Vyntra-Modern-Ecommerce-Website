import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const rawNext = requestUrl.searchParams.get('next');

  // Open redirect validation: strictly local relative path
  const isSafeRelative =
    rawNext &&
    rawNext.startsWith('/') &&
    !rawNext.startsWith('//') &&
    !rawNext.startsWith('/\\') &&
    !rawNext.startsWith('\\') &&
    !rawNext.includes(':') &&
    !rawNext.includes('//');

  const next = isSafeRelative ? rawNext : '/account';

  const supabase = createClient();

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session && data.user) {
      // Synchronize verified user to Prisma public.User
      try {
        await prisma.user.upsert({
          where: { id: data.user.id },
          update: {
            email: data.user.email!,
            name: data.user.user_metadata?.full_name || data.user.email!.split('@')[0],
            phone: data.user.user_metadata?.phone || null,
          },
          create: {
            id: data.user.id,
            email: data.user.email!,
            name: data.user.user_metadata?.full_name || data.user.email!.split('@')[0],
            phone: data.user.user_metadata?.phone || null,
            role: 'CUSTOMER',
          },
        });
      } catch (syncErr) {
        console.error('[Auth Callback Sync Error]:', syncErr);
      }
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash,
    });
    if (!error && data.session && data.user) {
      try {
        await prisma.user.upsert({
          where: { id: data.user.id },
          update: {
            email: data.user.email!,
            name: data.user.user_metadata?.full_name || data.user.email!.split('@')[0],
            phone: data.user.user_metadata?.phone || null,
          },
          create: {
            id: data.user.id,
            email: data.user.email!,
            name: data.user.user_metadata?.full_name || data.user.email!.split('@')[0],
            phone: data.user.user_metadata?.phone || null,
            role: 'CUSTOMER',
          },
        });
      } catch (syncErr) {
        console.error('[Auth Callback Verify Sync Error]:', syncErr);
      }
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // If code exchange failed or expired
  return NextResponse.redirect(new URL('/login?error=confirmation_failed', requestUrl.origin));
}
