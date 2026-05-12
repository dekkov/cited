# Cited Editorial & Attribution Policy

## Purpose

This document defines the editorial gate for all clips in Cited. Every clip must pass this review before appearing to users.

## Reviewer Credentials

Clips touching any of the following topics require review and approval by a qualified reviewer before the clip is published:

- Dietary supplements or nutraceuticals
- Intermittent fasting or calorie restriction protocols
- Hormone optimization (testosterone, estrogen, cortisol, thyroid)
- Sleep pharmacology (melatonin dosing, sedatives)
- Mental health interventions (therapy modalities, psychedelics)
- Cardiovascular risk interventions

**Qualified reviewer** means a credentialed professional with at least one of:
- **MD** or **DO** (medical doctor / doctor of osteopathic medicine)
- **RD** (registered dietitian)
- **PhD** in a relevant field (nutrition science, exercise physiology, neuroscience, pharmacology, psychiatry, or similar)

The credentialed reviewer pool is listed as **TODO** — see Phase 2 for reviewer onboarding process.

## Hard Exclusions

The following content is **never permitted**, regardless of speaker credentials or reviewer approval:

- Prescription drug recommendations (by name or class) — no prescription-only drug may be named
- Dosing instructions for any drug or supplement (specific mg/dose/frequency)
- Diagnosis or treatment of any diagnosed medical condition
- Any claim that contradicts an established clinical consensus without extraordinary peer-reviewed evidence

These are binding hard blocks enforced at clip approval (ADMN-06, Phase 2 admin interface).

## Disclaimer

Cited is not medical advice. Content on Cited is provided for informational and educational purposes only. Users must consult a qualified healthcare professional before making changes to their health habits, diet, supplementation, or treatment plans.

## Speaker Attribution Rule

Clips attribute the **named credentialed guest** — the expert appearing on the podcast — not the host.

- Use the guest's full name and credentials in the clip card (e.g., "Dr. Matthew Walker, PhD — Neuroscientist, UC Berkeley")
- Never attribute a claim to "DOAC host" or "podcast"
- Never imply the guest endorses Cited the application or the habit recommendation derived from their clip

See `docs/legal/right-of-publicity.md` for the full publicity rights stance.

## Reviewer Process

Pull requests that touch clip text (`claim` field), `risk_flags`, or `speaker_credentials` are automatically labeled `needs-medical-review`. Merge is blocked until a reviewer with the required credential approves.

The PR template includes a checklist item for this label. See `.github/PULL_REQUEST_TEMPLATE.md`.

## Clip Length Guidance

**TBD in Phase 2 (LGL-08).** Placeholder: clips should be as detailed as needed to convey the claim — not more. Editorial guidance will favor brevity where the claim is short. There is no hard cap; fair-use posture rests primarily on factors 1 (transformative) and 4 (no market harm).

## Clip Length Editorial Guidance (LGL-08)

There is no hard cap on clip length. Editorial guidance:

1. **As detailed as needed to convey the claim, not more.** A 30-second clip with a clear claim is preferred over a 90-second clip padded with conversational filler.
2. **Sponsor-read offset rule.** If the episode contains a sponsor read within ±2 minutes of a candidate clip, shift the window to fully exclude the sponsor segment. Never include a sponsor-read sentence in a clip.
3. **Qualifier-must-be-in-window rule.** If the speaker qualifies a claim ("for most healthy adults", "if you don't have hypertension"), that qualifier MUST be inside the clip start/end. Splitting the claim from its qualifier is misrepresentation and breaks the transformative-use posture.
4. **Why this matters legally.** With no length cap, fair-use factor 3 (amount used) carries less weight. The defense rests harder on factor 1 (transformative use — operationalizing a habit) and factor 4 (no market harm — drives traffic back to DOAC via the prominent "Watch on Diary of a CEO" CTA).
5. **Hard exclusions.** Never approve clips covering prescription drugs, dosing of any substance, or treatment of diagnosed conditions (ADMN-06 enforces this at the database boundary).

## Last Updated

2026-05-12
