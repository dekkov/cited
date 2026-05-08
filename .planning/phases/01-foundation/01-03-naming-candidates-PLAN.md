---
phase: 01-foundation
plan: 03
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/NAMING.md
autonomous: false
requirements: [NAME-01]
must_haves:
  truths:
    - "≥3 candidate project names produced, each neutral (not DOAC-anchored, not health-service-mistakable)"
    - "Each candidate has rationale + domain-availability check approach + GitHub-org availability note"
    - "User has explicitly noted final selection is deferred to Phase 4 (NAME-02/03)"
  artifacts:
    - path: ".planning/NAMING.md"
      provides: "Candidate name list with rationale, syllable count, register, availability checklist"
      contains: "Candidates"
  key_links:
    - from: ".planning/NAMING.md"
      to: "ROADMAP.md Phase 4"
      via: "explicit note that NAME-02/03 happen in Phase 4"
      pattern: "Phase 4"
---

<objective>
Produce a deliverable list of ≥3 candidate project names so Phase 4 alpha rename is unblocked. NAMING.md already exists with the working name "Cited" plus alternates; this plan elevates that into a structured, decision-ready document with availability-check methodology, register/syllable analysis, and a checkbox the user must complete to mark NAME-01 done.

Purpose: Phase 1 success criterion #5. Mitigates Pitfall 16 (renaming too late).
Output: A `.planning/NAMING.md` with ≥3 candidates, ranked, plus the explicit user acknowledgment that final selection is a Phase 4 concern.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@/home/king/Hdiary/.planning/PROJECT.md
@/home/king/Hdiary/.planning/NAMING.md
@/home/king/Hdiary/.planning/REQUIREMENTS.md
@/home/king/Hdiary/.planning/ROADMAP.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Produce structured NAMING.md with ≥3 candidates + availability methodology</name>
  <files>.planning/NAMING.md</files>
  <read_first>/home/king/Hdiary/.planning/NAMING.md, /home/king/Hdiary/.planning/PROJECT.md</read_first>
  <action>
Read the existing `.planning/NAMING.md` (working name "Cited" + alternates Receipts, Lodestar, Margin, Practice). Restructure into a decision-ready document with:

1. **Naming criteria** (verbatim, used as scoring rubric):
   - Single word strongly preferred (≤2 syllables ideal)
   - Neutral register (not health-service-mistakable; not "wellness" tropes)
   - Not DOAC-anchored (no "diary", "DOAC", host names)
   - Memorable + speakable (passes "say it on a podcast" test)
   - `.com`, `.dev`, OR `.app` should be reasonably attainable (sub-$1k acquisition or available)
   - GitHub org/handle ideally matches
   - No active US trademark conflict in IC 09 / IC 41 / IC 44

2. **Candidates table** — at minimum the 5 already in NAMING.md (Cited, Receipts, Lodestar, Margin, Practice), plus add at least 2 more so the count is ≥7 (deeper bench means a faster Phase 4 rename if first choice is blocked). Suggested additional candidates to evaluate (Claude proposes; user picks):
   - **Sourced** — "every habit sourced to a clip"
   - **Footnote** — academic-credibility register
   - **Backed** — minimalist; "backed by science"

   Table columns: `Name | Syllables | Register | Working tagline | .com status (a priori) | .dev status (a priori) | GitHub org status (a priori) | Trademark risk (a priori) | Notes`. Mark all status columns "TO CHECK" — these are Phase 4 NAME-02 actions, not Phase 1 actions.

3. **Availability check methodology** (for the user to run when NAME-02 lands in Phase 4):
   - Domain: `whois <name>.com`, `whois <name>.dev`, `whois <name>.app`; if registered, check GoDaddy/Sav.com auction listings.
   - GitHub org: `curl -sI https://github.com/<name>` — 404 = available.
   - Trademark: TESS (https://tmsearch.uspto.gov) for IC 009 (software), IC 041 (educational services), IC 044 (medical info services). EU IPO equivalent if EU launch matters.
   - Social handles: namecheckr.com or similar.

4. **Selection deferral note** (verbatim):
   > **NAME-01 deliverable**: ≥3 viable candidates produced ✓ (Phase 1).
   > **NAME-02 / NAME-03**: Domain + GitHub-org reservation, then repo + package + URL renames. **Hard-blocks Phase 4 alpha launch.** Run availability checks at start of Phase 4, not now — pre-checking now risks tipping watchers if a domain is already taken and gets squatted.

5. **Top-3 working order** (Claude's recommendation, user can override):
   1. Cited — already the working name; tightest rationale
   2. Sourced — second-tightest semantic match
   3. Footnote — strongest academic-credibility frame

6. **User acknowledgment block** at the bottom:
   ```
   ## NAME-01 Acknowledgment

   - [ ] I (the user) have reviewed the candidate list and confirm ≥3 viable names exist.
   - [ ] I understand availability checks happen in Phase 4, not now.
   - [ ] I will revisit this file at the start of Phase 4 to drive NAME-02/03.
   ```
  </action>
  <acceptance_criteria>
- `test -f .planning/NAMING.md`
- `grep -c "^| " .planning/NAMING.md` ≥ 8 (header + separator + ≥7 candidate rows)
- `grep -q "TO CHECK" .planning/NAMING.md`
- `grep -qi "Phase 4" .planning/NAMING.md`
- `grep -q "NAME-01" .planning/NAMING.md && grep -q "NAME-02" .planning/NAMING.md`
- `grep -q "Acknowledgment" .planning/NAMING.md`
- `grep -qi "trademark" .planning/NAMING.md`
- `grep -qi "TESS" .planning/NAMING.md`
  </acceptance_criteria>
  <done>NAMING.md has ≥7 candidates with rationale, availability methodology, and Phase-4 deferral note.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: User checkbox — confirm ≥3 viable candidates</name>
  <what-built>NAMING.md restructured with ≥7 candidates and clear methodology.</what-built>
  <how-to-verify>
User reviews `.planning/NAMING.md` and:
1. Confirms ≥3 of the listed candidates feel viable (not "I hate all of these").
2. Optionally adds personal alternates to the table.
3. Checks the acknowledgment boxes at the bottom of NAMING.md.

If <3 candidates feel viable, brainstorm replacements before resuming.
  </how-to-verify>
  <resume-signal>Type "approved" once ≥3 candidates feel viable and the acknowledgment boxes are checked. Or type "needs-more" with notes and Claude will iterate.</resume-signal>
</task>

</tasks>

<verification>
- `.planning/NAMING.md` lists ≥7 candidates with full row data
- "Phase 4" appears in the deferral note
- Acknowledgment block exists
</verification>

<success_criteria>
- NAME-01 closed: ≥3 viable candidates produced and user-acknowledged
- Phase 4 has a clear handoff (methodology + ranked top-3)
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/01-03-SUMMARY.md` listing:
- Final candidate count
- Top-3 user-confirmed working order
- Availability check status (should be "deferred to Phase 4" — explicit)
</output>
