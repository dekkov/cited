// ADMN-06 + LGL-08 enforcement.
// Two-layer denylist: prescription drug names + dosing pattern regex + condition-treatment phrases.
// Surface the matched pattern in the error toast so curator sees *why* it blocked.

export type HardBlockHit = {
  kind: 'prescription' | 'dosing' | 'condition_treatment';
  pattern: string;
  match: string;
};

const PRESCRIPTION_NAMES = [
  'ozempic',
  'wegovy',
  'mounjaro',
  'zepbound',
  'metformin',
  'lisinopril',
  'atorvastatin',
  'rosuvastatin',
  'levothyroxine',
  'amlodipine',
  'losartan',
  'sertraline',
  'fluoxetine',
  'escitalopram',
  'bupropion',
  'trazodone',
  'zolpidem',
  'eszopiclone',
  'modafinil',
  'adderall',
  'ritalin',
  'vyvanse',
  'xanax',
  'klonopin',
  'ativan',
  'gabapentin',
  'tirzepatide',
  'semaglutide',
  'liraglutide',
];

const DOSING_RE =
  /\b\d+(?:\.\d+)?\s*(?:mg|mcg|µg|g(?!\w)|ml|iu|units?|tablets?|capsules?|pills?|doses?)\b/i;

const CONDITION_TREATMENT_RE =
  /\b(?:if you (?:have|are diagnosed with)|treat(?:ing|ment of)?|cure for)\s+(?:hypertension|diabetes|depression|anxiety|insomnia|adhd|cancer|crohn|copd|ibs|migraine|epilepsy)\b/i;

export function matchesHardBlock(text: string): HardBlockHit | null {
  const lower = text.toLowerCase();
  for (const name of PRESCRIPTION_NAMES) {
    if (lower.includes(name)) {
      return { kind: 'prescription', pattern: name, match: name };
    }
  }
  const dose = lower.match(DOSING_RE);
  if (dose) return { kind: 'dosing', pattern: DOSING_RE.source, match: dose[0] };
  const cond = lower.match(CONDITION_TREATMENT_RE);
  if (cond)
    return { kind: 'condition_treatment', pattern: CONDITION_TREATMENT_RE.source, match: cond[0] };
  return null;
}
