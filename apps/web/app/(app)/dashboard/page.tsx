import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/guards';
import { createServerSupabaseClient } from '@/lib/supabase/server';

async function signOutAction() {
  'use server';
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export default async function DashboardPage() {
  await requireUser();
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold font-[family-name:var(--font-newsreader)]">Welcome</h1>
      <p className="text-sm text-[var(--color-ink-3)] mt-2">Habits dashboard ships in Phase 3.</p>
      <form action={signOutAction} className="mt-6">
        <button
          type="submit"
          className="text-sm underline text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
