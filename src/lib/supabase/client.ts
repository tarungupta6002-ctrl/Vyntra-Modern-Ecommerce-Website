import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates and returns a Supabase client for browser (client-side) code.
 * Uses only public environment variables (URL and anon key).
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
