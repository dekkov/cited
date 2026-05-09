import { z } from 'zod';
import { ClipDomainSchema, EvidenceStrengthSchema, SpeakerStatusSchema } from './enums';

export const ClipPendingSchema = z.object({
  id: z.string().uuid(),
  episode_id: z.string().uuid().nullable(),
  extraction_job_id: z.string().uuid().nullable(),
  youtube_video_id: z.string(),
  start_seconds: z.number().int().nonnegative(),
  end_seconds: z.number().int().positive(),
  claim: z.string().min(1),
  rationale: z.string().nullable(),
  speaker: z.string(),
  speaker_status: SpeakerStatusSchema,
  domain: ClipDomainSchema,
  evidence_strength: EvidenceStrengthSchema.nullable(),
  risk_flags: z.array(z.string()),
  embedding: z.array(z.number()).length(1536).nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type ClipPending = z.infer<typeof ClipPendingSchema>;
