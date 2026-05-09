import { pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { userHabits } from './user-habits.js';

export const streakFreezes = pgTable('streak_freezes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references((): any => sql`auth.users(id)`, { onDelete: 'cascade' }),
  userHabitId: uuid('user_habit_id')
    .notNull()
    .references(() => userHabits.id, { onDelete: 'cascade' }),
  bankedAt: timestamp('banked_at', { withTimezone: true }).notNull().defaultNow(),
  usedAt: timestamp('used_at', { withTimezone: true }),
});
