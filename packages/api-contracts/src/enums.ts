import { z } from 'zod';

export const UserRoleSchema = z.enum(['user', 'curator', 'admin']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const PrivacyModeSchema = z.enum(['public', 'private']);
export type PrivacyMode = z.infer<typeof PrivacyModeSchema>;

export const ClipStatusSchema = z.enum(['pending', 'approved', 'rejected', 'removed_from_source']);
export type ClipStatus = z.infer<typeof ClipStatusSchema>;

export const ClipDomainSchema = z.enum([
  'sleep',
  'nutrition_gut',
  'exercise_longevity',
  'mental_health',
]);
export type ClipDomain = z.infer<typeof ClipDomainSchema>;

export const SpeakerStatusSchema = z.enum(['verified', 'unverified', 'host']);
export type SpeakerStatus = z.infer<typeof SpeakerStatusSchema>;

export const EvidenceStrengthSchema = z.enum([
  'anecdotal',
  'observational',
  'rct',
  'meta_analysis',
]);
export type EvidenceStrength = z.infer<typeof EvidenceStrengthSchema>;

export const CheckInStatusSchema = z.enum(['done', 'skipped', 'partial']);
export type CheckInStatus = z.infer<typeof CheckInStatusSchema>;

export const FrequencySchema = z.enum(['daily', 'weekday', 'custom']);
export type Frequency = z.infer<typeof FrequencySchema>;

export const ExtractionJobStatusSchema = z.enum(['pending', 'claimed', 'done', 'failed']);
export type ExtractionJobStatus = z.infer<typeof ExtractionJobStatusSchema>;

export const ConsentScopeSchema = z.enum(['account', 'health_adjacent', 'ai_free_text']);
export type ConsentScope = z.infer<typeof ConsentScopeSchema>;

export const EpisodeAvailabilitySchema = z.enum(['available', 'removed_from_source', 'unknown']);
export type EpisodeAvailability = z.infer<typeof EpisodeAvailabilitySchema>;
