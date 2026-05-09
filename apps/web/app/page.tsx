import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl p-8 space-y-6">
      <h1 className="text-3xl font-semibold font-[family-name:var(--font-newsreader)]">Cited</h1>
      <p className="text-[var(--color-ink-3)]">
        Habits backed by people who study this for a living. Pre-alpha.
      </p>
      <Button asChild>
        <Link href="/login">Sign in</Link>
      </Button>
    </main>
  );
}
