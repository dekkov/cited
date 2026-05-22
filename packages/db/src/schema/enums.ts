import { pgEnum } from 'drizzle-orm/pg-core';

export const userRole = pgEnum('user_role', ['user', 'curator', 'admin']);

export const privacyMode = pgEnum('privacy_mode', ['public', 'private']);

export const clipStatus = pgEnum('clip_status', [
  'pending',
  'approved',
  'rejected',
  'removed_from_source',
]);

export const clipDomain = pgEnum('clip_domain', [
  'sleep',
  'nutrition_gut',
  'exercise_longevity',
  'mental_health',
]);

export const speakerStatus = pgEnum('speaker_status', ['verified', 'unverified', 'host']);

export const evidenceStrength = pgEnum('evidence_strength', [
  'anecdotal',
  'observational',
  'rct',
  'meta_analysis',
]);

export const checkInStatus = pgEnum('check_in_status', ['done', 'skipped', 'partial']);

export const frequency = pgEnum('frequency', ['daily', 'weekday', 'custom']);

export const extractionJobStatus = pgEnum('extraction_job_status', [
  'pending',
  'claimed',
  'done',
  'failed',
]);

export const consentScope = pgEnum('consent_scope', ['account', 'health_adjacent', 'ai_free_text']);

export const episodeAvailability = pgEnum('episode_availability', [
  'available',
  'removed_from_source',
  'unknown',
]);

export const clipEditAction = pgEnum('clip_edit_action', [
  'created',
  'updated',
  'approved',
  'rejected',
  'ai_suggested',
  'ai_accepted',
  'ai_rejected',
  'removed',
  'unremoved',
  'embedded',
  'embed_failed',
]);

export const userHabitStatus = pgEnum('user_habit_status', ['active', 'archived', 'graduated']);
