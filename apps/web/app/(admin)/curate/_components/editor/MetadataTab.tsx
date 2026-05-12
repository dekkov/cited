'use client';

import { approveClipBaseSchema } from '@/app/actions/curate/schemas';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

// Form-level schema = approveClipBaseSchema without clipId (injected by parent at submit time).
// Uses the base ZodObject (not the ZodEffects-wrapped approveClipSchema) so zodResolver works.
const formSchema = approveClipBaseSchema.omit({ clipId: true });
type FormValues = z.infer<typeof formSchema>;

type Props = {
  defaultValues: Partial<FormValues>;
  onSubmit: (values: FormValues) => Promise<void> | void;
  onSaveDraft?: () => void;
};

const DOMAINS = [
  { value: 'sleep', label: 'Sleep' },
  { value: 'nutrition_gut', label: 'Nutrition + Gut' },
  { value: 'exercise_longevity', label: 'Exercise + Longevity' },
  { value: 'mental_health', label: 'Mental Health' },
] as const;

const SPEAKER_STATUSES = [
  { value: 'verified', label: 'Verified' },
  { value: 'unverified', label: 'Unverified' },
  { value: 'host', label: 'Host' },
] as const;

const RISK_FLAGS = [
  { value: 'medical_advice', label: 'Medical advice adjacent' },
  { value: 'supplement', label: 'Supplement' },
  { value: 'contraindication', label: 'Contraindication possible' },
  { value: 'general', label: 'General wellness' },
] as const;

const EVIDENCE_STRENGTHS = [
  { value: 'anecdotal', label: 'Anecdotal' },
  { value: 'observational', label: 'Observational' },
  { value: 'rct', label: 'RCT' },
  { value: 'meta_analysis', label: 'Meta-analysis' },
] as const;

export function MetadataTab({ defaultValues, onSubmit, onSaveDraft }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      claim: defaultValues.claim ?? '',
      rationale: defaultValues.rationale ?? '',
      speaker: defaultValues.speaker ?? '',
      speakerStatus: defaultValues.speakerStatus ?? 'unverified',
      domain: defaultValues.domain ?? 'sleep',
      riskFlags: defaultValues.riskFlags ?? [],
      startSec: defaultValues.startSec ?? 0,
      endSec: defaultValues.endSec ?? 0,
      ...(defaultValues.evidenceStrength
        ? { evidenceStrength: defaultValues.evidenceStrength }
        : {}),
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = form;

  const claim = watch('claim');
  const riskFlags = watch('riskFlags') ?? [];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Claim + Newsreader-italic preview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
          <div>
            <Label htmlFor="claim" className="text-sm">
              Claim
            </Label>
            <Textarea id="claim" {...register('claim')} rows={4} aria-invalid={!!errors.claim} />
            <p
              className="mt-1 text-xs"
              style={{
                fontFamily: 'var(--font-geist-mono)',
                color: 'var(--color-ink-3)',
              }}
            >
              Length: as detailed as needed to convey the claim, not more.
            </p>
            {errors.claim && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-warn)' }}>
                {errors.claim.message}
              </p>
            )}
          </div>
          <div
            className="rounded-md p-4"
            style={{
              background: 'var(--color-paper-2)',
              color: 'var(--color-accent-deep)',
              fontFamily: 'var(--font-newsreader)',
              fontStyle: 'italic',
              fontSize: '16px',
              lineHeight: 1.5,
              minHeight: '110px',
            }}
            aria-label="Claim preview"
          >
            {claim || <span style={{ opacity: 0.5 }}>Claim preview…</span>}
          </div>
        </div>

        {/* Rationale */}
        <div>
          <Label htmlFor="rationale" className="text-sm">
            Rationale
          </Label>
          <Textarea
            id="rationale"
            {...register('rationale')}
            rows={5}
            aria-invalid={!!errors.rationale}
          />
          {errors.rationale && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-warn)' }}>
              {errors.rationale.message}
            </p>
          )}
        </div>

        {/* Speaker + status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="speaker" className="text-sm">
              Speaker
            </Label>
            <Input id="speaker" {...register('speaker')} aria-invalid={!!errors.speaker} />
            {errors.speaker && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-warn)' }}>
                {errors.speaker.message}
              </p>
            )}
          </div>
          <fieldset>
            <legend className="text-sm mb-1">Speaker status</legend>
            <div className="flex gap-3 text-sm" role="radiogroup" aria-label="Speaker status">
              {SPEAKER_STATUSES.map((opt) => (
                <label key={opt.value} className="inline-flex items-center gap-1">
                  <input
                    type="radio"
                    value={opt.value}
                    {...register('speakerStatus')}
                    aria-label={opt.label}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        {/* Domain + Evidence */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <fieldset>
            <legend className="text-sm mb-1">Domain</legend>
            <div className="flex flex-wrap gap-3 text-sm" role="radiogroup" aria-label="Domain">
              {DOMAINS.map((opt) => (
                <label key={opt.value} className="inline-flex items-center gap-1">
                  <input
                    type="radio"
                    value={opt.value}
                    {...register('domain')}
                    aria-label={opt.label}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <Label htmlFor="evidenceStrength" className="text-sm">
              Evidence strength
            </Label>
            <Select
              onValueChange={(v) =>
                setValue('evidenceStrength', v as FormValues['evidenceStrength'])
              }
              {...(defaultValues.evidenceStrength !== undefined
                ? { defaultValue: defaultValues.evidenceStrength }
                : {})}
            >
              <SelectTrigger id="evidenceStrength" aria-label="Evidence strength">
                <SelectValue placeholder="Pick one (optional)" />
              </SelectTrigger>
              <SelectContent>
                {EVIDENCE_STRENGTHS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Risk flags */}
        <fieldset>
          <legend className="text-sm mb-1">Risk flags (at least one required)</legend>
          <div className="grid grid-cols-2 gap-2">
            {RISK_FLAGS.map((opt) => {
              const checked = riskFlags.includes(opt.value);
              const checkboxId = `risk-flag-${opt.value}`;
              return (
                <label
                  key={opt.value}
                  htmlFor={checkboxId}
                  className="inline-flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    id={checkboxId}
                    aria-label={opt.label}
                    checked={checked}
                    onCheckedChange={(c) => {
                      const next = c
                        ? [...new Set([...riskFlags, opt.value])]
                        : riskFlags.filter((r) => r !== opt.value);
                      setValue('riskFlags', next as FormValues['riskFlags'], {
                        shouldValidate: true,
                      });
                    }}
                  />
                  {opt.label}
                </label>
              );
            })}
          </div>
          {errors.riskFlags && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-warn)' }}>
              {errors.riskFlags.message ?? 'risk_flags is mandatory'}
            </p>
          )}
        </fieldset>

        {/* Start / End */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="startSec" className="text-sm">
              Start (sec)
            </Label>
            <Input
              id="startSec"
              type="number"
              step="0.1"
              {...register('startSec', { valueAsNumber: true })}
            />
          </div>
          <div>
            <Label htmlFor="endSec" className="text-sm">
              End (sec)
            </Label>
            <Input
              id="endSec"
              type="number"
              step="0.1"
              {...register('endSec', { valueAsNumber: true })}
            />
          </div>
        </div>
      </div>

      {/* Sticky footer */}
      <div
        className="sticky bottom-0 flex items-center justify-between gap-2 px-4 py-3 border-t"
        style={{
          borderColor: 'var(--color-rule)',
          background: 'var(--color-paper)',
        }}
      >
        <Button type="button" variant="ghost" onClick={onSaveDraft} disabled={isSubmitting}>
          Save draft
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          style={{
            background: 'var(--color-accent)',
            color: 'var(--color-paper)',
          }}
        >
          {isSubmitting ? 'Publishing…' : 'Approve & publish'}
        </Button>
      </div>
    </form>
  );
}
