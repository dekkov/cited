import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { requireUser } from '@/lib/auth/guards';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <div>
      <DisclaimerBanner />
      <div className="mx-auto max-w-5xl p-6">{children}</div>
    </div>
  );
}
