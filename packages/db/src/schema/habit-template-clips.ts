import { integer, pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';
import { clips } from './clips.js';
import { habitTemplates } from './habit-templates.js';

export const habitTemplateClips = pgTable(
  'habit_template_clips',
  {
    habitTemplateId: uuid('habit_template_id')
      .notNull()
      .references(() => habitTemplates.id, { onDelete: 'cascade' }),
    clipId: uuid('clip_id')
      .notNull()
      .references(() => clips.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
  },
  (t) => [primaryKey({ columns: [t.habitTemplateId, t.clipId] })],
);
