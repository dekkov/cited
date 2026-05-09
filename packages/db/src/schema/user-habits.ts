import { boolean, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { frequency } from './enums.js';
import { habitTemplates } from './habit-templates.js';

export const userHabits = pgTable('user_habits', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references((): any => sql`auth.users(id)`, { onDelete: 'cascade' }),
  habitTemplateId: uuid('habit_template_id')
    .notNull()
    .references(() => habitTemplates.id, { onDelete: 'restrict' }),
  frequency: frequency('frequency').notNull(),
  customDays: integer('custom_days').array(),
  timeOfDay: text('time_of_day'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
