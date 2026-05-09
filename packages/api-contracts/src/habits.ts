import { z } from 'zod';
import { ClipDomainSchema, FrequencySchema } from './enums';

export const HabitTemplateSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable(),
  domain: ClipDomainSchema,
  trigger: z.string().nullable(),
  tiny_action: z.string().nullable(),
  default_frequency: FrequencySchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const UserHabitSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  habit_template_id: z.string().uuid(),
  frequency: FrequencySchema,
  custom_days: z.array(z.number().int()).nullable(),
  time_of_day: z.string().nullable(),
  active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type HabitTemplate = z.infer<typeof HabitTemplateSchema>;
export type UserHabit = z.infer<typeof UserHabitSchema>;
