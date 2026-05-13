import { boolean, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { frequency, userHabitStatus } from './enums';
import { habitTemplates } from './habit-templates';

// Note: userId references auth.users(id) on delete cascade
// This FK is managed in migration SQL (auth.users is Supabase Auth — not introspectable by drizzle-kit)
export const userHabits = pgTable('user_habits', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  habitTemplateId: uuid('habit_template_id')
    .notNull()
    .references(() => habitTemplates.id, { onDelete: 'restrict' }),
  frequency: frequency('frequency').notNull(),
  customDays: integer('custom_days').array(),
  timeOfDay: text('time_of_day'),
  active: boolean('active').notNull().default(true),
  // Phase 3: lifecycle status (D-09 graduation)
  status: userHabitStatus('status').notNull().default('active'),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  graduatedAt: timestamp('graduated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
