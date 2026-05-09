import Link from 'next/link';

import { requireCurator } from '@/lib/auth/guards';
import { requireLegalGatePassed } from '@/lib/auth/legal-gate';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCurator();
  await requireLegalGatePassed(user);
  return (
    <div>
      <header className="border-b border-[var(--color-rule)] bg-[var(--color-paper-2)] px-4 py-2 text-sm flex gap-4 items-center">
        <span className="font-semibold text-[var(--color-ink)]">Admin</span>
        <Link href="/admin" className="text-[var(--color-ink-3)] hover:text-[var(--color-ink)]">
          Home
        </Link>
        <Link
          href="/admin/clips"
          className="text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"
        >
          Clips
        </Link>
        <span className="ml-auto text-[var(--color-ink-4)] font-[family-name:var(--font-geist-mono)] text-xs">
          {user.email} ({user.role})
        </span>
      </header>
      <div className="mx-auto max-w-6xl p-6">{children}</div>
    </div>
  );
}
