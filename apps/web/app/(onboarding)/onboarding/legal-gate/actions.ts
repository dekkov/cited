'use server';

import { createHash } from 'node:crypto';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { z } from 'zod';

import { createDb, profiles, consentRecords, eq } from '@cited/db';
import { requireUser } from '@/lib/auth/guards';
import { isAgeAllowed } from '@/lib/auth/age';
import type { Jurisdiction } from '@/lib/auth/age';

const LegalGateSchema = z.object({
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dob_jurisdiction: z.enum(['us', 'eu', 'other']),
  consent_account: z.literal('on'),
  consent_health_adjacent: z.string().optional(),
  consent_ai_free_text: z.string().optional(),
  disclaimer_ack: z.literal('on'),
});

type FormState = { error?: string };

export async function submitLegalGate(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();

  const parsed = LegalGateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return {
      error:
        'Please complete all required fields, including the account-creation consent and disclaimer acknowledgment.',
    };
  }

  const { dob, dob_jurisdiction, consent_health_adjacent, consent_ai_free_text } = parsed.data;

  if (!isAgeAllowed(dob, dob_jurisdiction as Jurisdiction)) {
    return {
      error: 'Per local law, you must be at least 13 (US) or 16 (EU) to use Cited.',
    };
  }

  const h = await headers();
  const ua = h.get('user-agent') ?? '';
  const ipRaw = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  const ipHash = ipRaw ? createHash('sha256').update(ipRaw).digest('hex') : null;

  const db = createDb(process.env.DATABASE_URL!);
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(profiles)
      .set({
        disclaimerAcceptedAt: now,
        dob,
        dobJurisdiction: dob_jurisdiction,
        updatedAt: now,
      })
      .where(eq(profiles.id, user.id));

    const grants = [
      { scope: 'account' as const, granted: true },
      { scope: 'health_adjacent' as const, granted: consent_health_adjacent === 'on' },
      { scope: 'ai_free_text' as const, granted: consent_ai_free_text === 'on' },
    ];

    await tx.insert(consentRecords).values(
      grants.map((g) => ({
        userId: user.id,
        scope: g.scope,
        granted: g.granted,
        grantedAt: now,
        userAgent: ua,
        ...(ipHash ? { ipHash } : {}),
      })),
    );
  });

  // redirect throws — not caught
  redirect('/onboarding/interview');
}
