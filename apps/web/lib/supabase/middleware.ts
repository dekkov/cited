import { type CookieOptions, createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Refresh the Supabase session on every request so httpOnly cookies
 * are kept up-to-date. Must be called from the root Next.js middleware.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet: Array<{ name: string; value: string; options: CookieOptions }>) => {
          for (const { name, value } of toSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of toSet) {
            // options is CookieSerializeOptions (from `cookie` package); spread into ResponseCookie
            response.cookies.set({ name, value, ...(options ?? {}) });
          }
        },
      },
    },
  );

  // Calling getUser() here forces a session refresh and updates the cookies.
  // IMPORTANT: do not remove — this is what keeps the session alive.
  await supabase.auth.getUser();

  return response;
}
