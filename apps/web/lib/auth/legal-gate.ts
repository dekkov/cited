import 'server-only';

import { getDb } from '@/lib/db';
import { eq, profiles } from '@cited/db';
import { redirect } from 'next/navigation';
import type { SessionUser } from './guards';

export async function isLegalGatePassed(userId: string): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ accepted: profiles.disclaimerAcceptedAt, dob: profiles.dob })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  const row = rows[0];
  return Boolean(row?.accepted && row?.dob);
}

export async function requireLegalGatePassed(user: SessionUser): Promise<void> {
  if (!(await isLegalGatePassed(user.id))) {
    redirect('/onboarding/legal-gate');
  }
}
