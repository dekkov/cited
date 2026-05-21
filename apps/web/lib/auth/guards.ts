import 'server-only';

import { getDb } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { eq, profiles } from '@cited/db';
import { redirect } from 'next/navigation';

export type UserRole = 'user' | 'curator' | 'admin';
export type SessionUser = { id: string; email: string; role: UserRole };

/**
 * Resolves the current Supabase session user + their profile.role.
 * Returns null if not signed in.
 *
 * Uses @supabase/ssr createServerClient for session resolution,
 * then queries public.profiles via Drizzle for the role.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const rows = await getDb()
    .select({ role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  const role = (rows[0]?.role ?? 'user') as UserRole;
  return { id: user.id, email: user.email ?? '', role };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  return user;
}

export async function requireCurator(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role !== 'curator' && user.role !== 'admin') redirect('/dashboard');
  return user;
}
