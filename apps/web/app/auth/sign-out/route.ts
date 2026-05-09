import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Sign-out route handler. Must be called via POST to prevent CSRF.
 *
 * Clears the Supabase session (removes httpOnly cookies) and redirects
 * to the landing page.
 */
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/', request.url), { status: 303 });
}
