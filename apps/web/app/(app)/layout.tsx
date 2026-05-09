import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { requireUser } from '@/lib/auth/guards';
import { requireLegalGatePassed } from '@/lib/auth/legal-gate';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  await requireLegalGatePassed(user);
  return (
    <div>
      <DisclaimerBanner />
      <div className="mx-auto max-w-5xl p-6">{children}</div>
    </div>
  );
}
