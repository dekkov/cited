import { type CookieOptions, createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Server-side Supabase client factory for App Router Server Components,
 * Route Handlers, and Server Actions.
 *
 * Uses @supabase/ssr (NOT deprecated @supabase/auth-helpers-nextjs).
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet: Array<{ name: string; value: string; options: CookieOptions }>) => {
          try {
            for (const { name, value, options } of toSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // setAll called from a Server Component — safe to ignore
            // The middleware handles cookie refresh
          }
        },
      },
    },
  );
}
