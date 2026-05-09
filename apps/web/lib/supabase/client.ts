import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client factory for Client Components.
 *
 * Uses @supabase/ssr (NOT deprecated @supabase/auth-helpers-nextjs).
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
