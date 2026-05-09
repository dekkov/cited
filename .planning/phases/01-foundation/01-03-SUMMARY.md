---
phase: 01-foundation
plan: 03
subsystem: planning
tags: [naming, branding, phase4-prereq]

requires: []
provides:
  - .planning/NAMING.md elevated to decision-ready format with 8 candidates, scoring rubric, availability methodology, and top-3 recommendation

key-files:
  created: []
  modified:
    - .planning/NAMING.md

requirements-completed: [NAME-01]

duration: ~10min
completed: 2026-05-08
---

# Phase 01 Plan 03: Naming Candidates Summary

**NAMING.md elevated from a 5-name stub to a decision-ready document with 8 candidates, 7-dimension scoring rubric, availability-check methodology, and top-3 working order.**

## Accomplishments

- Expanded from 5 to 8 candidates: Cited, Sourced, Footnote, Receipts, Lodestar, Margin, Practice, Backed
- Added scoring rubric (7 criteria: brevity, distinctiveness, domain availability, register, memorability, non-medical, non-DOAC-anchored)
- Added availability-check methodology: domain whois, GitHub org curl, USPTO TESS, social handles via namecheckr, npm scope
- Added Phase 4 deferral note (NAME-02/03 are hard-blocked on alpha launch)
- Top-3 working order recommendation: Cited > Sourced > Footnote
- Anti-names table with explicit rationale
- NAME-01 acknowledgment checkbox block

## What Wave-2+ Plans Need to Know

- Working name remains **"Cited"** throughout Phases 1–3. All code uses `@cited/*` package names.
- Final rename decision (NAME-02/03) happens in Phase 4 before alpha launch.
- Availability checks are methodology only — actual checks deferred to Phase 4 when the name is locked.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| .planning/NAMING.md | FOUND |
| ≥3 candidates | FOUND (8 total) |
| Phase 4 deferral note | FOUND |
| Commit f85fd22 | VERIFIED |
