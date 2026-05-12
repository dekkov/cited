import { getSessionUser } from '@/lib/auth/guards';
import { redirect } from 'next/navigation';
import { IngestionForm } from '../_components/ingest/IngestionForm';

export default async function IngestPage() {
  const user = await getSessionUser();
  if (!user || (user.role !== 'curator' && user.role !== 'admin')) {
    redirect('/admin');
  }

  return (
    <div className="flex flex-col gap-6 p-6 bg-[var(--color-paper)] min-h-screen">
      <h1
        className="text-2xl font-semibold text-[var(--color-ink)]"
        style={{ fontFamily: 'var(--font-geist-sans)' }}
      >
        Ingest source
      </h1>
      <div className="max-w-[720px]">
        <IngestionForm />
      </div>
    </div>
  );
}
