import { HealthDisclaimer } from '@/components/disclaimer/HealthDisclaimer';
import { requireUser } from '@/lib/auth/guards';

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
    <div className="min-h-screen bg-[var(--color-paper)] flex flex-col items-center pt-16">
      <div className="w-full max-w-xl flex-1 px-4">{children}</div>
      {/* pb clears the AdoptBoard's fixed bottom bar on the recommendations step */}
      <footer className="w-full max-w-xl px-4 pt-8 pb-28">
        <HealthDisclaimer variant="footer" />
      </footer>
    </div>
  );
}
