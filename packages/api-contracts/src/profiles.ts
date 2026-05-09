import { z } from 'zod';
import { PrivacyModeSchema, UserRoleSchema } from './enums';

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  display_name: z.string(),
  timezone: z.string(),
  goals: z.record(z.unknown()),
  role: UserRoleSchema,
  privacy_mode: PrivacyModeSchema,
  disclaimer_accepted_at: z.string().datetime().nullable(),
  dob: z.string().nullable(),
  dob_jurisdiction: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Profile = z.infer<typeof ProfileSchema>;
