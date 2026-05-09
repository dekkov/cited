import { z } from 'zod';
import { CheckInStatusSchema } from './enums';

export const CheckInSchema = z.object({
  id: z.string().uuid(),
  user_habit_id: z.string().uuid(),
  user_id: z.string().uuid(),
  check_in_date: z.string(),
  status: CheckInStatusSchema,
  mood: z.number().int().min(1).max(5).nullable(),
  note: z.string().nullable(),
  created_at: z.string().datetime(),
});

export type CheckIn = z.infer<typeof CheckInSchema>;
