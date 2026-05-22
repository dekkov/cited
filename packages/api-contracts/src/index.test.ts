import { describe, expect, it } from 'vitest';
import {
  API_CONTRACT_VERSION,
  ClipDomainSchema,
  ClipPendingSchema,
  ClipSchema,
  ExtractionJobResultSchema,
  ExtractionJobSchema,
  ExtractionJobStatusSchema,
  ProfileSchema,
  UserRoleSchema,
} from './index';

describe('@cited/api-contracts smoke tests', () => {
  it('exports API_CONTRACT_VERSION', () => {
    expect(API_CONTRACT_VERSION).toBe('0.1.0');
  });

  it('ProfileSchema parses valid profile', () => {
    const profile = ProfileSchema.parse({
      id: '00000000-0000-0000-0000-000000000001',
      display_name: 'Test User',
      timezone: 'UTC',
      goals: {},
      role: 'user',
      privacy_mode: 'private',
      disclaimer_accepted_at: null,
      dob: null,
      dob_jurisdiction: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    });
    expect(profile.role).toBe('user');
  });

  it('ClipSchema parses valid clip', () => {
    const clip = ClipSchema.parse({
      id: '00000000-0000-0000-0000-000000000002',
      episode_id: '00000000-0000-0000-0000-000000000003',
      youtube_video_id: 'dQw4w9WgXcQ',
      start_seconds: 120,
      end_seconds: 180,
      claim: 'Sleep improves memory consolidation',
      rationale: 'Dr. Walker explains REM sleep role',
      speaker: 'Matthew Walker',
      speaker_status: 'verified',
      domain: 'sleep',
      evidence_strength: 'rct',
      risk_flags: [],
      status: 'approved',
      embedding: null,
      created_by: null,
      approved_by: null,
      approved_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    });
    expect(clip.domain).toBe('sleep');
    expect(clip.youtube_video_id).toBe('dQw4w9WgXcQ');
  });

  it('ExtractionJobSchema parses valid job', () => {
    const job = ExtractionJobSchema.parse({
      id: '00000000-0000-0000-0000-000000000004',
      podcast_id: null,
      youtube_video_id: 'dQw4w9WgXcQ',
      status: 'pending',
      claimed_by: null,
      claimed_at: null,
      attempt_count: 0,
      payload: { youtube_video_id: 'dQw4w9WgXcQ' },
      result: null,
      error: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    });
    expect(job.status).toBe('pending');
    expect(job.youtube_video_id).toBe('dQw4w9WgXcQ');
  });

  it('ExtractionJobResultSchema parses result with proposed_clips', () => {
    const result = ExtractionJobResultSchema.parse({
      proposed_clips: [
        {
          start_seconds: 0,
          end_seconds: 90,
          claim: 'Test claim',
          speaker: 'Dr. Test',
          speaker_status: 'verified',
          domain: 'sleep',
          risk_flags: [],
        },
      ],
    });
    expect(result.proposed_clips).toHaveLength(1);
  });

  it('ClipPendingSchema parses valid pending clip', () => {
    const pending = ClipPendingSchema.parse({
      id: '00000000-0000-0000-0000-000000000005',
      episode_id: null,
      extraction_job_id: null,
      youtube_video_id: 'abc123',
      start_seconds: 10,
      end_seconds: 100,
      claim: 'A claim',
      rationale: null,
      speaker: 'Speaker',
      speaker_status: 'unverified',
      domain: 'nutrition_gut',
      evidence_strength: null,
      risk_flags: [],
      embedding: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    });
    expect(pending.domain).toBe('nutrition_gut');
  });

  it('enum schemas reject invalid values', () => {
    expect(() => UserRoleSchema.parse('superadmin')).toThrow();
    expect(() => ClipDomainSchema.parse('cardiology')).toThrow();
    expect(() => ExtractionJobStatusSchema.parse('processing')).toThrow();
  });
});
