import { requireUser } from '@/lib/auth/guards';
import { createDb, profiles, eq } from '@cited/db';
import { SettingsForm } from './settings-form';
import { ReRunInterviewButton } from './_components/ReRunInterviewButton';

export default async function SettingsPage() {
  const user = await requireUser();
  const db = createDb(process.env.DATABASE_URL!);
  const [row] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  return (
    <div className="space-y-8">
      <SettingsForm
        initial={{
          display_name: row?.displayName ?? '',
          timezone: row?.timezone ?? 'UTC',
          privacy_mode: row?.privacyMode ?? 'private',
        }}
      />

      {/* REC-06: Re-run interview */}
      <div className="border-t border-[var(--color-rule)] pt-6">
        <h2 className="font-[family-name:var(--font-newsreader)] text-xl text-[var(--color-ink)] mb-2">
          Interview
        </h2>
        <p className="font-[family-name:var(--font-geist-sans)] text-sm text-[var(--color-ink-3)] mb-4">
          Redo the onboarding interview to get fresh habit recommendations based on your current goals.
        </p>
        <ReRunInterviewButton />
      </div>
    </div>
  );
}
