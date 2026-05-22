'use client';
import { startInterviewAction } from '@/app/actions/start-interview';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
/**
 * ReRunInterviewButton — REC-06.
 * Calls startInterviewAction to create a fresh interview run,
 * then navigates to /onboarding/interview.
 */
import { useState } from 'react';

export function ReRunInterviewButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      await startInterviewAction();
      router.push('/onboarding/interview');
    } catch (err) {
      console.error('[ReRunInterviewButton] startInterviewAction failed:', err);
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" onClick={() => void handleClick()} disabled={loading}>
      {loading ? 'Starting…' : 'Run interview again'}
    </Button>
  );
}
