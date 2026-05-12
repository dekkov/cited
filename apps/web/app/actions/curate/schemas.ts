import { z } from 'zod';

// Shared editorial enums — re-exported here so curation UI + server actions share one source of truth.
export const domainEnum = z.enum(['sleep', 'nutrition_gut', 'exercise_longevity', 'mental_health']);
export const speakerStatusEnum = z.enum(['verified', 'unverified', 'host']);
export const riskFlagEnum = z.enum(['medical_advice', 'supplement', 'contraindication', 'general']);

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
