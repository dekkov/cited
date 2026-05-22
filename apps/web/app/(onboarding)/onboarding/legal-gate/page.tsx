import { redirect } from 'next/navigation';

import { requireUser } from '@/lib/auth/guards';
import { isLegalGatePassed } from '@/lib/auth/legal-gate';
import { getDb } from '@/lib/db';
import { eq, userHabits } from '@cited/db';
import { LegalGateForm } from './legal-gate-form';

export default async function LegalGatePage() {
  const user = await requireUser();
  if (await isLegalGatePassed(user.id)) {
    // Send to dashboard if they already have habits (interview done), otherwise interview
    const db = getDb();
    const habit = await db.query.userHabits.findFirst({ where: eq(userHabits.userId, user.id) });
    redirect(habit ? '/dashboard' : '/onboarding/interview');
  }
  return (
    <main className="py-8">
      <h1 className="text-2xl font-semibold mb-2 font-[family-name:var(--font-newsreader)]">
        Before we start
      </h1>
      <p className="text-sm text-[var(--color-ink-3)] mb-6">
        A few legal acknowledgments. Each consent below is independently togglable — see{' '}
        <a className="underline hover:text-[var(--color-ink)]" href="/docs/legal/privacy-policy">
          our privacy policy
        </a>{' '}
        for what each one means.
      </p>
      <LegalGateForm />
    </main>
  );
}
