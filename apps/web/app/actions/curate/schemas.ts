import { matchesHardBlock } from '@/lib/curate/hardBlockKeywords';
import { z } from 'zod';

// Shared editorial enums — re-exported here so curation UI + server actions share one source of truth.
export const domainEnum = z.enum(['sleep', 'nutrition_gut', 'exercise_longevity', 'mental_health']);
export const speakerStatusEnum = z.enum(['verified', 'unverified', 'host']);
export const riskFlagEnum = z.enum(['medical_advice', 'supplement', 'contraindication', 'general']);
export const evidenceStrengthEnum = z.enum(['anecdotal', 'observational', 'rct', 'meta_analysis']);

export type Domain = z.infer<typeof domainEnum>;
export type SpeakerStatus = z.infer<typeof speakerStatusEnum>;
export type RiskFlag = z.infer<typeof riskFlagEnum>;

// ADMN-16 inline add-podcast — name is required; host/trustTier default sensibly.
export const addPodcastSchema = z.object({
  name: z.string().min(1).max(200),
  host: z.string().max(200).optional(),
  trustTier: z.number().int().min(1).max(5).default(1),
});

export type AddPodcastInput = z.infer<typeof addPodcastSchema>;

// ADMN-12 — POST /api/admin/ingest body. Exactly one of url | manualTranscript required.
export const manualTranscriptSchema = z.object({
  podcastId: z.string().uuid(),
  youtubeVideoId: z
    .string()
    .regex(/^[A-Za-z0-9_-]{11}$/, 'youtubeVideoId must be the 11-char YouTube ID'),
  title: z.string().max(500).optional(),
  content: z.string().min(50),
  filename: z.string().min(1),
});

export const ingestUrlSchema = z
  .object({
    url: z.string().url().optional(),
    manualTranscript: manualTranscriptSchema.optional(),
  })
  .refine((d) => Boolean(d.url) !== Boolean(d.manualTranscript), {
    message: 'Provide exactly one of: url, manualTranscript',
  });

export type IngestInput = z.infer<typeof ingestUrlSchema>;
export type ManualTranscriptInput = z.infer<typeof manualTranscriptSchema>;

// ADMN-05 (mandatory risk flags) + ADMN-06 (hard-block prescription/dosing/condition_treatment)
// + ADMN-15 (no fixed length cap). Used by approveClip server action.
//
// approveClipBaseSchema: plain ZodObject (no .refine) — used for form schemas in the UI
// where zodResolver needs a ZodObject shape.  Exported for MetadataTab + other form uses.
export const approveClipBaseSchema = z.object({
  clipId: z.string().uuid(),
  claim: z.string().min(10).max(2000),
  rationale: z.string().min(10).max(4000),
  speaker: z.string().min(1).max(200),
  speakerStatus: speakerStatusEnum,
  domain: domainEnum,
  riskFlags: z.array(riskFlagEnum).min(1, 'risk_flags is mandatory at approval (ADMN-05)'),
  startSec: z.number().min(0),
  endSec: z.number(),
  evidenceStrength: evidenceStrengthEnum.optional(),
});

// approveClipSchema: full server-side schema with .refine() cross-field checks + hard-block.
// ZodEffects — do NOT use directly with zodResolver; use approveClipBaseSchema.omit({clipId:true}) instead.
export const approveClipSchema = approveClipBaseSchema
  .refine((d) => d.endSec > d.startSec, { message: 'end must be > start' })
  .refine(
    (d) => !matchesHardBlock(`${d.claim}\n${d.rationale}`),
    (d) => {
      const hit = matchesHardBlock(`${d.claim}\n${d.rationale}`);
      return {
        message: `Can't publish: this clip touches prescription / dosing / treatment of a diagnosed condition (matched: "${hit?.match ?? ''}"). See MEDICAL_REVIEW.md.`,
      };
    },
  );

export type ApproveClipInput = z.infer<typeof approveClipSchema>;
