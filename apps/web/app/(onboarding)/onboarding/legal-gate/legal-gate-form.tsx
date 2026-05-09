'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { submitLegalGate } from './actions';

type FormState = { error?: string };

export function LegalGateForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    submitLegalGate,
    {} as FormState,
  );

  return (
    <form action={action} className="space-y-6">
      {/* DOB + jurisdiction */}
      <fieldset className="space-y-3">
        <legend className="font-medium text-[var(--color-ink)]">
          Date of birth + jurisdiction
        </legend>
        <div className="space-y-1">
          <Label htmlFor="dob">Date of birth</Label>
          <Input id="dob" name="dob" type="date" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="dob_jurisdiction">I am subject to the laws of</Label>
          <select
            id="dob_jurisdiction"
            name="dob_jurisdiction"
            required
            className="w-full border border-[var(--color-rule)] rounded-md bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink-3)]"
          >
            <option value="">Select…</option>
            <option value="us">United States</option>
            <option value="eu">European Union / EEA / UK</option>
            <option value="other">Other</option>
          </select>
        </div>
        <p className="text-xs text-[var(--color-ink-4)]">Minimum age: 13 (US) / 16 (EU).</p>
      </fieldset>

      {/* Article 9 granular consent */}
      <fieldset className="space-y-3">
        <legend className="font-medium text-[var(--color-ink)]">
          Consent (Article 9 special-category data)
        </legend>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="consent_account"
            required
            className="mt-1 accent-[var(--color-sage)]"
          />
          <span className="text-sm text-[var(--color-ink)]">
            <strong>Account creation</strong> — required. We process your email and basic profile to
            provide the service.
          </span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="consent_health_adjacent"
            className="mt-1 accent-[var(--color-sage)]"
          />
          <span className="text-sm text-[var(--color-ink)]">
            <strong>Health-adjacent data processing</strong> — habit check-ins, mood entries,
            sleep/nutrition/exercise inputs. Optional; you can use a reduced experience without
            this.
          </span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="consent_ai_free_text"
            className="mt-1 accent-[var(--color-sage)]"
          />
          <span className="text-sm text-[var(--color-ink)]">
            <strong>AI/LLM analysis of your free-text answers</strong> — your free-text inputs are
            sent to OpenAI/Anthropic for analysis. Optional; the onboarding interview falls back to
            structured choices without this.
          </span>
        </label>
        <p className="text-xs text-[var(--color-ink-4)]">
          You can change these at any time in Settings.
        </p>
      </fieldset>

      {/* Disclaimer acknowledgment */}
      <fieldset>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="disclaimer_ack"
            required
            className="mt-1 accent-[var(--color-sage)]"
          />
          <span className="text-sm text-[var(--color-ink)]">
            <strong>I understand</strong> Cited is not medical advice. I will consult a qualified
            healthcare professional before changing health habits.
          </span>
        </label>
      </fieldset>

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Continue'}
      </Button>
    </form>
  );
}
