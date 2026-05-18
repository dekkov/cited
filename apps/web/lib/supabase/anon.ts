import { createClient } from '@supabase/supabase-js';

/**
 * Anonymous Supabase client for public pages (e.g., /h/[slug]).
 *
 * Critical: This client does NOT pass session cookies, so Supabase RLS treats
 * all queries as the `anon` role. This is intentional — public pages must never
 * access user-scoped tables (user_habits, profiles, etc.). RLS on user-scoped
 * tables must deny `anon` role reads (PUB-05).
 *
 * NEVER use this client for authenticated operations.
 * NEVER pass this client to functions that need user context.
 */
export function getAnonSupabase() {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const key = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set',
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
