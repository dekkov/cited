# Phase 2 Curation Tracker (ADMN-09)

**Target:** ≥30 approved clips across 4 domains by end of Phase 2.
**Budget:** ~10–12 editorial hours (lowered from 15h by AI co-pilot ADMN-10).
**Cadence:** 3–4 dedicated curation sessions distinct from engineering blocks.
**Weekly check:** if curation slips past Week 2 of Phase 2, re-evaluate clip-count target or domain consolidation.

## Per-domain progress

| Domain               | Approved | Target | Pending in Review | Notes |
|----------------------|----------|--------|-------------------|-------|
| sleep                | 0        | ≥7     | 0                 |       |
| nutrition_gut        | 0        | ≥7     | 0                 |       |
| exercise_longevity   | 0        | ≥7     | 0                 |       |
| mental_health        | 0        | ≥7     | 0                 |       |
| **Total**            | **0**    | **≥30**| **0**             |       |

Refresh source-of-truth query (run during weekly check):

```sql
SELECT domain, COUNT(*) FILTER (WHERE status='approved' AND removed_at IS NULL) AS approved,
                       COUNT(*) FILTER (WHERE status='pending') AS pending
FROM clips
GROUP BY domain
ORDER BY domain;
```

## AION-10 fixture promotion log

Promote candidate rows from `aion10_fixture_candidates` (dev table) to `tests/eval/aion-10/fixtures.jsonl` during curation. Target: ≥20 total promoted by end of Phase 2. Track promotions here:

| Date       | Fixture ID  | Source clip | Kind  | Expected grounded |
|------------|-------------|-------------|-------|-------------------|
| 2026-05-12 | fx-001..005 | seed-stubs  | mixed | seed              |

## Sessions

| Date | Hours | Clips approved (delta) | Notes |
|------|-------|------------------------|-------|
|      |       |                        |       |
