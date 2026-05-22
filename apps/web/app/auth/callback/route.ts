import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * OAuth + magic-link code-exchange handler.
 *
 * Both magic-link and Google OAuth callbacks land here after Supabase
 * redirects back with a `code` query parameter. We exchange the code for
 * a session (sets httpOnly cookies) and redirect to the intended destination.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  // Exchange failed or no code present — send to login with error flag
  return NextResponse.redirect(new URL('/login?error=auth', url.origin));
}
