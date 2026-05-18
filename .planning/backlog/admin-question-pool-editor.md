# Admin: question-pool editor

**Captured:** 2026-05-17
**Status:** Backlog — post-MVP

## What

Admin UI under `apps/web/app/(admin)/curate/questions/` to add, edit, remove, reorder, and (de)activate onboarding interview questions in the question pool.

## Why

Today the pool lives in `packages/core/src/interview/question-pool.ts` as a TS literal — every change requires a code commit and deploy. Once the pool grows past ~30 or starts being tuned based on synthesis quality data, a UI editor is needed so non-engineers (curator role) can iterate.

## Acceptance sketch

- Move `QUESTION_POOL` into Postgres (`interview_questions` table — id, domain, text, choices jsonb, active bool, sort_order, created/updated).
- Migration seeds the table from the current TS literal.
- `selectQuestions(...)` reads from the DB (cached) instead of the TS const.
- Admin route: list / create / edit / archive. Per-row preview of how the question renders.
- RLS: only `curator` and `admin` roles can write; `active=true` rows readable by service role for selection.

## Dependencies

- Curator role exists (Phase 1 schema).
- Admin layout exists (`apps/web/app/(admin)/layout.tsx`).

## Out of scope (until needed)

- A/B testing different question variants.
- Per-locale translations.
- Versioning / history of edits.
