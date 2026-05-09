import 'server-only';

import { redirect } from 'next/navigation';

export type SessionUser = { id: string; email: string; role: 'user' | 'curator' | 'admin' };

/**
 * Resolves the current Supabase session user + their profile.role.
 * Returns null if not signed in.
 *
 * Implementation deferred to plan 01-07 (Supabase Auth wiring).
 * This stub returns null so the route guards behave as "not signed in" until 01-07.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  // TODO(01-07): replace with @supabase/ssr createServerClient + db role lookup
  return null;
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
