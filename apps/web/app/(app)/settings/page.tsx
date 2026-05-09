import { requireUser } from '@/lib/auth/guards';
import { createDb, profiles, eq } from '@cited/db';
import { SettingsForm } from './settings-form';

export default async function SettingsPage() {
  const user = await requireUser();
  const db = createDb(process.env.DATABASE_URL!);
  const [row] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  return (
    <SettingsForm
      initial={{
        display_name: row?.displayName ?? '',
        timezone: row?.timezone ?? 'UTC',
        privacy_mode: row?.privacyMode ?? 'private',
      }}
    />
  );
}
