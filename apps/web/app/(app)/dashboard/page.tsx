import { requireUser } from '@/lib/auth/guards';

export default async function DashboardPage() {
  await requireUser();
  return (
    <div>
      <h1 className="text-2xl font-semibold font-[family-name:var(--font-newsreader)]">Welcome</h1>
      <p className="text-sm text-[var(--color-ink-3)] mt-2">Habits dashboard ships in Phase 3.</p>
    </div>
  );
}
