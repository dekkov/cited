'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/guards';
import { createDb, profiles, eq } from '@cited/db';

const Schema = z.object({
  display_name: z.string().min(0).max(80),
  timezone: z.string().min(1).max(80),
  privacy_mode: z.enum(['public', 'private']),
});

export async function updateProfile(
  _: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; message?: string; error?: string }> {
  const user = await requireUser();
  const parsed = Schema.safeParse({
    display_name: formData.get('display_name'),
    timezone: formData.get('timezone'),
    privacy_mode: formData.get('privacy_mode'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const db = createDb(process.env.DATABASE_URL!);
  await db
    .update(profiles)
    .set({
      displayName: parsed.data.display_name,
      timezone: parsed.data.timezone,
      privacyMode: parsed.data.privacy_mode,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, user.id));

  revalidatePath('/settings');
  return { ok: true, message: 'Saved.' };
}
