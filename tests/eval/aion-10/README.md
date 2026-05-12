# AION-10 Hallucination Eval

This directory holds the AION-10 hand-graded hallucination eval (CONTEXT GA5 / REQUIREMENTS AION-10).

## Files
- `fixtures.jsonl` — hand-graded examples (one JSON per line). Target ≥20 by end of Phase 2.
- `judge-prompt.md` — system prompt for the Claude Sonnet judge.
- `runner.ts` — vitest gating runner (run by CI).
- `runner.test.ts` — unit tests for runner logic.

## Fixture leakage discipline (Pitfall 9)
Reserve 3–5 episodes that NEVER appear in the live corpus as eval-only. Document them in this README when promoted from `aion10_fixture_candidates` (Plan 01) into `fixtures.jsonl`.

## Thresholds
- grounded ≥ 90%
- hallucinated == 0%

CI fails if either threshold is breached.
