# Naming

**Working name:** **Cited**
**Status:** Working name selected; availability checks deferred to Phase 4 (NAME-02/03). Final lock before public alpha launch.

---

## Naming Criteria (Scoring Rubric)

Used to evaluate all candidates. Higher adherence = higher ranking.

1. **Length** — Single word strongly preferred; ≤2 syllables ideal.
2. **Register** — Neutral: not health-service-mistakable ("wellness" tropes avoided); not DOAC-anchored (no "diary", "DOAC", host names).
3. **Memorability** — Passes the "say it on a podcast" test: clear, no spelling ambiguity.
4. **Domain attainability** — `.com`, `.dev`, or `.app` should be reasonably attainable (sub-$1k acquisition or available at registration price).
5. **GitHub org/handle** — Ideally matches or has a close prefix variant (`use-`, `get-`, `-app`).
6. **Trademark posture** — No active US trademark conflict in IC 009 (software), IC 041 (educational services), IC 044 (medical/health info services).

---

## Candidates

| Name | Syllables | Register | Working tagline | .com status | .dev status | GitHub org status | Trademark risk | Notes |
|------|-----------|----------|-----------------|-------------|-------------|-------------------|---------------|-------|
| **Cited** | 2 | Academic/credible | "Habits backed by people who study this for a living." | TO CHECK | TO CHECK | TO CHECK | TO CHECK | Current working name. Passive descriptor + brand verb. Neutral, no health mistakability. |
| **Sourced** | 1 | Journalistic/neutral | "Every habit sourced to the research." | TO CHECK | TO CHECK | TO CHECK | TO CHECK | Tightest semantic match after Cited. Implies provenance without medical register. |
| **Footnote** | 2 | Academic/playful | "The footnote between what experts say and what you actually do." | TO CHECK | TO CHECK | TO CHECK | TO CHECK | Strongest academic-credibility frame. Slightly more memorable brand story. |
| **Receipts** | 2 | Dev-culture/meme | "Every habit comes with receipts." | TO CHECK | TO CHECK | TO CHECK | TO CHECK | High Show HN energy. Logo concept: receipt + checkbox. Risk: meme-y register may not age well. |
| **Lodestar** | 2 | Poetic/thoughtful | "Habits, with a lodestar to follow." | TO CHECK | TO CHECK | TO CHECK | TO CHECK | Distinctive, highly googleable, almost certainly available. Risk: non-native speakers may not know the word. |
| **Margin** | 2 | Literary/quiet | "The margin is where the real work happens." | TO CHECK | TO CHECK | TO CHECK | TO CHECK | Marginalia framing — habits as commentary on what experts said. Risk: trademark crowded (finance, MarginNote app). |
| **Practice** | 2 | Minimalist/calm | "Just Practice." | TO CHECK | TO CHECK | TO CHECK | TO CHECK | Apple-register: stripped-down, habits are practices. Risk: extremely generic; SEO brutal; trademark undefendable. |
| **Backed** | 1 | Direct/neutral | "Backed by science. Built into habits." | TO CHECK | TO CHECK | TO CHECK | TO CHECK | Minimalist; implies evidence without academic register. Risk: common adjective, very short — may be taken everywhere. |

> All status columns are marked TO CHECK. These are Phase 4 NAME-02 actions, not Phase 1 actions. Running checks now risks tipping domain watchers who may squat if they see interest signals.

---

## Availability Check Methodology

Run these commands at the start of Phase 4, before selecting the final name.

### Domain

```bash
whois cited.com
whois cited.dev
whois cited.app
```

If registered, check [GoDaddy Auctions](https://auctions.godaddy.com), [Sav.com](https://sav.com), [Afternic](https://afternic.com) for resale listings. Budget: sub-$1k acquisition or available at registration price (~$10–15/yr for `.dev`/`.app`).

### GitHub Org

```bash
curl -sI https://github.com/<name> | grep "HTTP/"
# HTTP/2 404 = available
# HTTP/2 200 = taken (check profile for activity level — abandoned orgs sometimes transfer)
```

Also check `https://github.com/use<name>`, `https://github.com/get<name>`, `https://github.com/<name>-app`.

### Trademark

Search [USPTO TESS](https://tmsearch.uspto.gov) for each candidate under:
- IC 009 — Computer software
- IC 041 — Educational services / information
- IC 044 — Medical/health information services

Also check [EUIPO eSearch](https://euipo.europa.eu/eSearch/) if EU launch is in scope.

Filter: look for **live marks** with **confusingly similar goods/services**. A mark in an unrelated class (e.g., "Cited" for car parts) is not a conflict.

### Social Handles

Use [namecheckr.com](https://namecheckr.com) or [namechk.com](https://namechk.com) to batch-check availability across X, Bluesky, LinkedIn, Instagram, Mastodon, TikTok.

### npm Scope

```bash
npm info @<name> 2>&1 | head -5
# "Not found" = scope likely available (verify on npmjs.com)
```

---

## Top-3 Working Order (Claude's Recommendation)

User can override at Phase 4; this is a starting point for the availability checks.

1. **Cited** — already the working name; tightest rationale; one syllable shorter than it sounds ("SY-ted" is punchy); every repo commit message already reads naturally ("cited-by: Huberman — sleep pressure").
2. **Sourced** — second-tightest semantic match; one syllable; strong journalism register without medical risk.
3. **Footnote** — strongest academic-credibility narrative; two syllables but very clean; `footnote.dev` or `footnote.app` likely more attainable than `cited.com`.

---

## Selection Deferral Note

> **NAME-01 deliverable**: ≥3 viable candidates produced (Phase 1). ✓
> **NAME-02 / NAME-03**: Domain + GitHub-org reservation, then repo + package + URL renames. **Hard-blocks Phase 4 alpha launch.** Run availability checks at the start of Phase 4, not now — pre-checking risks tipping domain watchers if a name is already taken and gets squatted after a search spike.

The Phase 4 task order is:
1. Run all availability checks (NAME-02) against the top-3 in ranked order.
2. Reserve domain + GitHub org for the first name that passes all checks.
3. Execute repo rename, package scope rename, URL updates (NAME-03).
4. Unblock alpha launch.

---

## Anti-Names (Explicitly Avoided)

| Category | Examples | Reason |
|----------|----------|--------|
| DOAC-anchored | "DOAC Habits", "TheDiary*", "CEO Health" | Single-podcaster brand entanglement; kills schema-agnostic story and future expansion. |
| Medical-service-mistakable | "YourDoctor", "HealthCoach AI", "RxHabits" | Legal/regulatory exposure; conflicts with "not medical advice" posture. |
| Huberman-anchored | Any host name | Pitfall research flagged — Huberman 2024 controversies add reputational risk. |
| Generic health-tech vocab | "Wellnessify", "HabitFlow", "Vitalize" | Undifferentiated; no trademark defense; SEO nightmare. |

---

## NAME-01 Acknowledgment

- [ ] I (the user) have reviewed the candidate list and confirm ≥3 viable names exist.
- [ ] I understand availability checks happen in Phase 4, not now.
- [ ] I will revisit this file at the start of Phase 4 to drive NAME-02/03.

---

*Last updated: 2026-05-07 — restructured to decision-ready format with ≥8 candidates, availability methodology, and Phase 4 deferral note.*
