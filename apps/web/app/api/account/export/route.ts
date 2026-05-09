import { NextResponse } from 'next/server';

import { createDb, profiles, consentRecords, eq } from '@cited/db';
import { requireUser } from '@/lib/auth/guards';

export const runtime = 'nodejs';

/**
 * PROF-03 — Phase 1 stub: JSON export of profile + consent_records.
 *
 * Phase 4 expands this to include habits, check-ins, and streaks.
 * See REQUIREMENTS.md PROF-03 for the full spec.
 */
export async function GET() {
  const user = await requireUser();
  const db = createDb(process.env.DATABASE_URL!);

  const profileRows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  const consents = await db
    .select()
    .from(consentRecords)
    .where(eq(consentRecords.userId, user.id));

  // Phase 1: profile + consent_records only.
  // Phase 4 expands to habits, check-ins, streaks (PROF-03 full UX).
  const payload = {
    schema_version: '0.1.0-phase1',
    exported_at: new Date().toISOString(),
    profile: profileRows[0] ?? null,
    consent_records: consents,
    _note: 'Phase 1 export covers profile + consent only. Habits/check-ins/streaks land in Phase 4 (PROF-03).',
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'content-type': 'application/json',
      'content-disposition': `attachment; filename="cited-export-${user.id}-${Date.now()}.json"`,
    },
  });
}
