import { date, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { checkInStatus } from './enums.js';
import { userHabits } from './user-habits.js';

export const checkIns = pgTable(
  'check_ins',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userHabitId: uuid('user_habit_id')
      .notNull()
      .references(() => userHabits.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references((): any => sql`auth.users(id)`, { onDelete: 'cascade' }),
    checkInDate: date('check_in_date').notNull(),
    status: checkInStatus('status').notNull(),
    mood: integer('mood'),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.userHabitId, t.checkInDate)],
);
