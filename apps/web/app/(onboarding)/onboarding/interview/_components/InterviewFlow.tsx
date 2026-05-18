'use client';
/**
 * InterviewFlow — 3-phase onboarding interview.
 *
 *   about-you        → free-form text dump
 *   loading-questions → one cheap-tier LLM call selects 8 questions from the pool
 *   questions        → user answers 8 selected (+ optional "go deeper" expander)
 *   submitting       → calls /api/synthesize and routes to /onboarding/recommendations
 *
 * No streaming, no per-turn LLM. One selection call up front, one synthesis call at the end.
 * AUTH-05c: per-question free-text only shown if freeTextOptIn is true.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PoolQuestion } from '@cited/core';
import { Button } from '@/components/ui/button';

type Phase = 'about-you' | 'loading-questions' | 'questions' | 'submitting';

type Answer = {
  questionId: string;
  choiceId: string;
  freeText?: string;
};

interface InterviewFlowProps {
  runId: string;
  freeTextOptIn: boolean;
}

export function InterviewFlow({ runId, freeTextOptIn }: InterviewFlowProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('about-you');
  const [aboutYou, setAboutYou] = useState('');
  const [selected, setSelected] = useState<PoolQuestion[]>([]);
  const [remaining, setRemaining] = useState<PoolQuestion[]>([]);
  const [showMore, setShowMore] = useState(false);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [error, setError] = useState<string | null>(null);

  function setChoice(questionId: string, choiceId: string) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] ?? { questionId, choiceId }),
        questionId,
        choiceId,
      },
    }));
  }

  function setFreeText(questionId: string, freeText: string) {
    setAnswers((prev) => {
      const existing = prev[questionId];
      if (!existing) return prev;
      const next: Answer = { questionId: existing.questionId, choiceId: existing.choiceId };
      const trimmed = freeText.trim();
      if (trimmed) next.freeText = trimmed;
      return { ...prev, [questionId]: next };
    });
  }

  async function onAboutYouSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (aboutYou.trim().length < 10) {
      setError('Tell us at least a sentence or two so we can personalise your questions.');
      return;
    }
    setError(null);
    setPhase('loading-questions');
    try {
      const res = await fetch('/api/interview/select-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ freeFormText: aboutYou }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        selected: PoolQuestion[];
        remaining: PoolQuestion[];
      };
      setSelected(data.selected);
      setRemaining(data.remaining);
      setPhase('questions');
    } catch (err) {
      console.error('[InterviewFlow] selectQuestions failed:', err);
      setError('Could not personalise questions. Please try again.');
      setPhase('about-you');
    }
  }

  async function onSubmitAnswers() {
    const required = selected.filter((q) => !answers[q.id]);
    if (required.length > 0) {
      setError(`Please answer all ${selected.length} questions.`);
      return;
    }
    setError(null);
    setPhase('submitting');
    try {
      const res = await fetch('/api/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId,
          freeFormText: aboutYou,
          answers: Object.values(answers),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push(`/onboarding/recommendations?runId=${runId}`);
    } catch (err) {
      console.error('[InterviewFlow] synthesis failed:', err);
      setError('Could not generate recommendations. Please try again.');
      setPhase('questions');
    }
  }

  if (phase === 'about-you') {
    return (
      <main className="mx-auto min-h-screen max-w-2xl bg-[var(--color-paper)] px-5 py-10">
        <h1 className="font-[family-name:var(--font-newsreader)] text-3xl leading-tight text-[var(--color-ink)]">
          Tell us about yourself
        </h1>
        <p className="mt-3 font-[family-name:var(--font-geist-sans)] text-sm text-[var(--color-ink-4)]">
          Anything — your job, schedule, foods you love, hobbies, what stresses you out,
          what you&apos;ve already tried. The more you share, the better we can tailor your questions.
        </p>

        <form onSubmit={onAboutYouSubmit} className="mt-6 space-y-4">
          <textarea
            value={aboutYou}
            onChange={(e) => setAboutYou(e.target.value)}
            rows={10}
            maxLength={4000}
            placeholder="e.g. I'm a software engineer, mostly desk-bound. Sleep okay but stay up late. I love spicy food and weekend hikes…"
            className="
              w-full rounded-[var(--radius-md)] border border-[var(--color-rule)]
              bg-[var(--color-paper-2)] p-4
              font-[family-name:var(--font-geist-sans)] text-base text-[var(--color-ink)]
              placeholder:text-[var(--color-ink-4)]
              focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]
              resize-none
            "
            aria-label="Tell us about yourself"
          />
          <div className="flex items-center justify-between">
            <span className="font-[family-name:var(--font-geist-mono)] text-xs text-[var(--color-ink-4)]">
              {aboutYou.length} / 4000
            </span>
            <Button type="submit" disabled={aboutYou.trim().length < 10}>
              Continue
            </Button>
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
        </form>
      </main>
    );
  }

  if (phase === 'loading-questions') {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center bg-[var(--color-paper)] px-5 py-10">
        <p className="font-[family-name:var(--font-newsreader)] text-2xl italic text-[var(--color-ink)]">
          Personalising your questions…
        </p>
      </main>
    );
  }

  if (phase === 'submitting') {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center bg-[var(--color-paper)] px-5 py-10">
        <p className="font-[family-name:var(--font-newsreader)] text-2xl italic text-[var(--color-ink)]">
          Analysing your profile…
        </p>
      </main>
    );
  }

  // phase === 'questions'
  const answeredCount = Object.keys(answers).length;
  const totalDisplayed = selected.length + (showMore ? remaining.length : 0);

  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-[var(--color-paper)] px-5 py-10">
      <h1 className="font-[family-name:var(--font-newsreader)] text-3xl leading-tight text-[var(--color-ink)]">
        A few questions for you
      </h1>
      <p className="mt-3 font-[family-name:var(--font-geist-sans)] text-sm text-[var(--color-ink-4)]">
        {answeredCount} of {totalDisplayed} answered.
      </p>

      <div className="mt-8 space-y-10">
        {selected.map((q, idx) => (
          <QuestionBlock
            key={q.id}
            question={q}
            index={idx + 1}
            answer={answers[q.id]}
            freeTextOptIn={freeTextOptIn}
            onChoice={(choiceId) => setChoice(q.id, choiceId)}
            onFreeText={(t) => setFreeText(q.id, t)}
          />
        ))}

        {!showMore && remaining.length > 0 && (
          <button
            type="button"
            onClick={() => setShowMore(true)}
            className="
              w-full rounded-[var(--radius-md)] border border-dashed border-[var(--color-rule)]
              bg-transparent px-4 py-4
              font-[family-name:var(--font-geist-mono)] text-sm text-[var(--color-ink-4)]
              hover:border-[var(--color-accent)] hover:text-[var(--color-ink)]
            "
          >
            Want to go deeper? Show {remaining.length} more optional questions
          </button>
        )}

        {showMore &&
          remaining.map((q, idx) => (
            <QuestionBlock
              key={q.id}
              question={q}
              index={selected.length + idx + 1}
              answer={answers[q.id]}
              freeTextOptIn={freeTextOptIn}
              optional
              onChoice={(choiceId) => setChoice(q.id, choiceId)}
              onFreeText={(t) => setFreeText(q.id, t)}
            />
          ))}
      </div>

      <div className="mt-12 flex items-center justify-between">
        <span className="font-[family-name:var(--font-geist-mono)] text-xs text-[var(--color-ink-4)]">
          {answeredCount} answered
        </span>
        <Button type="button" onClick={onSubmitAnswers}>
          Generate recommendations
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}
    </main>
  );
}

interface QuestionBlockProps {
  question: PoolQuestion;
  index: number;
  answer: Answer | undefined;
  freeTextOptIn: boolean;
  optional?: boolean;
  onChoice: (choiceId: string) => void;
  onFreeText: (freeText: string) => void;
}

function QuestionBlock({
  question,
  index,
  answer,
  freeTextOptIn,
  optional = false,
  onChoice,
  onFreeText,
}: QuestionBlockProps) {
  return (
    <div>
      <h2 className="font-[family-name:var(--font-newsreader)] text-xl leading-snug text-[var(--color-ink)]">
        <span className="font-[family-name:var(--font-geist-mono)] text-xs text-[var(--color-ink-4)]">
          {String(index).padStart(2, '0')}
          {optional && ' · optional'}
        </span>
        <br />
        {question.text}
      </h2>

      <div role="radiogroup" aria-label={question.text} className="mt-4 flex flex-col gap-2">
        {question.choices.map((c) => {
          const selectedNow = answer?.choiceId === c.id;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={selectedNow}
              onClick={() => onChoice(c.id)}
              className={`
                w-full rounded-[var(--radius-sm)] border px-4 py-3
                text-left font-[family-name:var(--font-geist-mono)] text-sm tracking-[0.04em]
                transition-all duration-150
                hover:-translate-y-px hover:shadow-[var(--shadow-soft)]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]
                ${
                  selectedNow
                    ? 'border-[var(--color-accent)] bg-[var(--color-paper)] text-[var(--color-ink)]'
                    : 'border-[var(--color-rule)] bg-[var(--color-paper-2)] text-[var(--color-ink)] hover:border-[var(--color-accent)]'
                }
              `}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {freeTextOptIn && answer && (
        <textarea
          value={answer.freeText ?? ''}
          onChange={(e) => onFreeText(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="Add a note (optional)…"
          className="
            mt-3 w-full rounded-[var(--radius-md)] border border-[var(--color-rule)]
            bg-[var(--color-paper-2)] p-3
            font-[family-name:var(--font-geist-sans)] text-sm text-[var(--color-ink)]
            placeholder:text-[var(--color-ink-4)]
            focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]
            resize-none
          "
          aria-label={`Note for: ${question.text}`}
        />
      )}
    </div>
  );
}
