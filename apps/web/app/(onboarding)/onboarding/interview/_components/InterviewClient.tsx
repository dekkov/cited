'use client';
/**
 * InterviewClient — streaming chat surface (chips-only, no bubble mode).
 * Uses AI SDK v6 useChat + DefaultChatTransport against POST /api/interview.
 * State machine: interview → synthesizing → tell-me-more → done (→ router.push)
 *
 * AUTH-05c gate: freeTextOptIn controls textarea visibility.
 * D-01: 3–4 choice chips per turn.
 * D-02: ProgressDots + DomainBadge after turn 3.
 * D-03: SynthesisLoader → TellMeMore → recommendations page.
 */
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ProgressDots } from './ProgressDots';
import { DomainBadge } from './DomainBadge';
import { ChoiceChips } from './ChoiceChips';
import { SynthesisLoader } from './SynthesisLoader';
import { TellMeMore } from './TellMeMore';
import { extractTurnOutput } from './extractTurnOutput';
import { MAX_TURNS } from '@cited/core';
import type { Domain } from '@cited/core';

type InterviewPhase = 'interview' | 'synthesizing' | 'tell-me-more';

type StructuredAnswer = {
  turn: number;
  domain?: Domain | undefined;
  question: string;
  choiceLabel: string;
  freeText?: string | undefined;
};

interface InterviewClientProps {
  runId: string;
  freeTextOptIn: boolean;
}

export function InterviewClient({ runId, freeTextOptIn }: InterviewClientProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<InterviewPhase>('interview');
  const [domainCoverage, setDomainCoverage] = useState<Record<Domain, number>>({
    sleep: 0,
    nutrition_gut: 0,
    exercise_longevity: 0,
    mental_health: 0,
  });
  const [structuredAnswers, setStructuredAnswers] = useState<StructuredAnswer[]>([]);
  const [retrievedClipIds, setRetrievedClipIds] = useState<string[]>([]);
  const [freeText, setFreeText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track whether we've already triggered synthesis to prevent double-fire
  const synthTriggered = useRef(false);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/interview',
      body: () => ({
        runId,
        turnCount: structuredAnswers.length,
        domainCoverage,
        userDoneSignal: false,
      }),
    }),
  });

  // Parse latest assistant message
  const lastAssistant = messages.filter((m) => m.role === 'assistant').at(-1);
  const turnOutput = extractTurnOutput(lastAssistant);

  // Trigger synthesis if doneSignal is set (only once)
  if (
    phase === 'interview' &&
    turnOutput?.doneSignal &&
    !synthTriggered.current
  ) {
    synthTriggered.current = true;
    setPhase('synthesizing');
  }

  const onChoiceSelect = useCallback(
    async (choice: { id: string; label: string }) => {
      const turn = structuredAnswers.length + 1;
      const newAnswer: StructuredAnswer = {
        turn,
        domain: turnOutput?.domain,
        question: turnOutput?.questionText ?? '',
        choiceLabel: choice.label,
        freeText: freeTextOptIn && freeText.trim() ? freeText : undefined,
      };

      const nextAnswers = [...structuredAnswers, newAnswer];
      setStructuredAnswers(nextAnswers);

      if (turnOutput?.domain) {
        setDomainCoverage((dc) => ({
          ...dc,
          [turnOutput.domain!]: dc[turnOutput.domain!] + 1,
        }));
      }

      if (turnOutput?.citedClipIds?.length) {
        setRetrievedClipIds((ids) => [
          ...new Set([...ids, ...turnOutput.citedClipIds]),
        ]);
      }

      setFreeText('');

      // Hard cap: advance to synthesis if MAX_TURNS reached
      if (nextAnswers.length >= MAX_TURNS) {
        synthTriggered.current = true;
        setPhase('synthesizing');
        return;
      }

      // Send choice as user message (AI SDK v6 sendMessage)
      await sendMessage({
        text: `Selected: ${choice.label}${newAnswer.freeText ? ` | Note: ${newAnswer.freeText}` : ''}`,
      });
    },
    [structuredAnswers, turnOutput, freeText, freeTextOptIn, sendMessage],
  );

  const onTellMeMoreSubmit = useCallback(
    async (moreText: string) => {
      setIsSubmitting(true);
      try {
        const res = await fetch('/api/synthesize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            runId,
            structuredAnswers,
            tellMeMoreFreeText: moreText.trim() || undefined,
            retrievedClipIds: retrievedClipIds.length > 0 ? retrievedClipIds : ['00000000-0000-0000-0000-000000000000'],
          }),
        });
        if (!res.ok) {
          const err = await res.text();
          throw new Error(`Synthesis failed: ${err}`);
        }
        router.push(`/onboarding/recommendations?runId=${runId}`);
      } catch (err) {
        // Log server-side error context; show generic message in UI
        console.error('[InterviewClient] Synthesis error:', err);
        setIsSubmitting(false);
      }
    },
    [runId, structuredAnswers, retrievedClipIds, router],
  );

  // ── Render phase gates ───────────────────────────────────────────────────

  if (phase === 'synthesizing') {
    return <SynthesisLoader onComplete={() => setPhase('tell-me-more')} />;
  }

  if (phase === 'tell-me-more') {
    return (
      <TellMeMore
        allowFreeText={freeTextOptIn}
        onSubmit={isSubmitting ? () => {} : onTellMeMoreSubmit}
      />
    );
  }

  // ── Interview turn ───────────────────────────────────────────────────────

  const isStreaming = status === 'streaming' || status === 'submitted';

  return (
    <main className="min-h-screen bg-[var(--color-paper)] px-5 py-8">
      {/* Progress */}
      <ProgressDots current={structuredAnswers.length} total={MAX_TURNS} />

      {/* Priority domain badge — shown after turn 3 */}
      {turnOutput?.domain && structuredAnswers.length >= 3 && (
        <DomainBadge domain={turnOutput.domain} />
      )}

      {/* Question */}
      <h2 className="mt-6 font-[family-name:var(--font-newsreader)] text-2xl leading-snug text-[var(--color-ink)]">
        {isStreaming && !turnOutput
          ? 'Loading next question…'
          : (turnOutput?.questionText ?? 'Getting your first question…')}
      </h2>

      {/* Choice chips */}
      {turnOutput?.choices && (
        <ChoiceChips
          choices={turnOutput.choices}
          onSelect={onChoiceSelect}
          disabled={isStreaming}
        />
      )}

      {/* Optional free-text (AUTH-05c) — only when consent granted */}
      {freeTextOptIn && turnOutput && (
        <textarea
          className="
            mt-4 w-full rounded-[var(--radius-md)] border border-[var(--color-rule)]
            bg-[var(--color-paper-2)] p-3
            font-[family-name:var(--font-geist-sans)] text-sm text-[var(--color-ink)]
            placeholder:text-[var(--color-ink-4)]
            focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]
            resize-none
          "
          placeholder="Add a note (optional)…"
          rows={2}
          maxLength={500}
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          disabled={isStreaming}
          aria-label="Optional note to accompany your answer"
        />
      )}

      {/* Loading indicator */}
      {isStreaming && (
        <p
          className="mt-4 font-[family-name:var(--font-geist-mono)] text-xs text-[var(--color-ink-4)]"
          aria-live="polite"
        >
          Thinking…
        </p>
      )}
    </main>
  );
}
