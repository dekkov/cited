import { z } from 'zod';

export const DomainSchema = z.enum([
  'sleep', 'nutrition_gut', 'exercise_longevity', 'mental_health',
]);
export type Domain = z.infer<typeof DomainSchema>;

export const CitationSchema = z.object({
  clipId: z.string().uuid(),
  claim: z.string().min(1),       // model-quoted; revalidated by groundingCheck
  speaker: z.string().min(1),
});
export type Citation = z.infer<typeof CitationSchema>;

export const HabitCandidateSchema = z.object({
  templateSlug: z.string().min(1),
  title: z.string().min(8).max(80),
  rationale: z.string().min(20).max(280),
  domain: DomainSchema,
  trigger: z.string().min(8),                    // REC-04: implementation-intention (when/where)
  tinyAction: z.string().min(4).max(80),         // REC-04: BJ Fogg minimum
  citations: z.array(CitationSchema).min(2).max(3),  // REC-02
});
export type HabitCandidate = z.infer<typeof HabitCandidateSchema>;

// One summary entry per domain (fixed shape — OpenAI strict schemas reject `propertyNames`)
export const DomainSummariesSchema = z.object({
  sleep: z.string(),
  nutrition_gut: z.string(),
  exercise_longevity: z.string(),
  mental_health: z.string(),
});
export type DomainSummaries = z.infer<typeof DomainSummariesSchema>;

export const SynthesisOutputSchema = z.object({
  profileSummary: z.object({
    gapDomains: z.array(DomainSchema).min(1),
    summaries: DomainSummariesSchema, // per-domain one-sentence summary
  }),
  candidates: z.array(HabitCandidateSchema).min(3).max(5),  // REC-01
});
export type SynthesisOutput = z.infer<typeof SynthesisOutputSchema>;

// Per-turn structured output emitted by interview turn LLM
export const InterviewTurnOutputSchema = z.object({
  questionText: z.string().min(3),                              // ≤3-sentence discipline enforced at prompt level
  choices: z.array(z.object({
    id: z.string(),
    label: z.string().min(1).max(80),
  })).min(2).max(4),                                            // D-01: 3–4 chips (allow 2 for yes/no)
  domain: DomainSchema.optional(),                              // the domain this turn explores
  citedClipIds: z.array(z.string().uuid()).default([]),         // grounding evidence
  doneSignal: z.boolean().default(false),                       // model thinks interview is done
});
export type InterviewTurnOutput = z.infer<typeof InterviewTurnOutputSchema>;
