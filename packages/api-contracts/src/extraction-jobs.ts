import { z } from 'zod';
import { ClipDomainSchema, EvidenceStrengthSchema, ExtractionJobStatusSchema, SpeakerStatusSchema } from './enums';

export const ExtractionJobPayloadSchema = z.object({
  youtube_video_id: z.string().min(1),
  desired_chunks_seconds: z.number().int().positive().optional(),
  prompt_context: z.string().optional(),
});

export const ProposedClipSchema = z.object({
  start_seconds: z.number().int().nonnegative(),
  end_seconds: z.number().int().positive(),
  claim: z.string().min(1).max(500),
  speaker: z.string(),
  speaker_status: SpeakerStatusSchema,
  domain: ClipDomainSchema,
  evidence_strength: EvidenceStrengthSchema.optional(),
  risk_flags: z.array(z.string()),
  rationale: z.string().optional(),
});

export const ExtractionJobResultSchema = z.object({
  transcript_uri: z.string().url().optional(),
  transcript_text: z.string().optional(),
  proposed_clips: z.array(ProposedClipSchema).default([]),
});

export const ExtractionJobSchema = z.object({
  id: z.string().uuid(),
  podcast_id: z.string().uuid().nullable(),
  youtube_video_id: z.string(),
  status: ExtractionJobStatusSchema,
  claimed_by: z.string().nullable(),
  claimed_at: z.string().datetime().nullable(),
  attempt_count: z.number().int().nonnegative(),
  payload: ExtractionJobPayloadSchema,
  result: ExtractionJobResultSchema.nullable(),
  error: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type ExtractionJobPayload = z.infer<typeof ExtractionJobPayloadSchema>;
export type ExtractionJobResult = z.infer<typeof ExtractionJobResultSchema>;
export type ExtractionJob = z.infer<typeof ExtractionJobSchema>;
export type ProposedClip = z.infer<typeof ProposedClipSchema>;
