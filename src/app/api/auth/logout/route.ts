import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiSuccess, apiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    const response = apiSuccess({ message: 'Signed out successfully.' });
    if (error) {
      return apiError(error.message, 400, null, 'LOGOUT_FAILED');
    }
    return response;
  } catch (err) {
    console.error('[Logout Error]:', err);
    return apiError('Failed to sign out.', 500, null, 'SERVER_ERROR');
  }
}

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.error('[Logout GET Error]:', err);
  }
  const requestUrl = new URL(request.url);
  const redirectResponse = NextResponse.redirect(new URL('/login', requestUrl.origin));
  return redirectResponse;
}
