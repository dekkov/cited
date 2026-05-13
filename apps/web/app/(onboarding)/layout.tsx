import { requireUser } from '@/lib/auth/guards';
import { HealthDisclaimer } from '@/components/disclaimer/HealthDisclaimer';

/**
 * Onboarding route group layout.
 *
 * - Requires a signed-in user (redirects to /login if not).
 * - Does NOT call requireLegalGatePassed — that would create an infinite redirect loop.
 * - No app chrome: clean surface for the legal gate form.
 */
export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <div className="min-h-screen bg-[var(--color-paper)] flex items-start justify-center pt-16">
      <div className="w-full max-w-xl px-4">{children}</div>
      <HealthDisclaimer variant="footer" />
    </div>
  );
}
