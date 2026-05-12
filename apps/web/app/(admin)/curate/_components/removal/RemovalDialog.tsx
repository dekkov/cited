'use client';

import { removeClip } from '@/app/actions/curate/removeClip';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

type RemovalReason = 'dmca' | 'factual-error' | 'medical-risk' | 'speaker-request' | 'other';

type Props = {
  clipId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function RemovalDialog({ clipId, open, onOpenChange }: Props) {
  const router = useRouter();
  const [reason, setReason] = useState<RemovalReason | ''>('');
  const [notes, setNotes] = useState('');
  const [takedownRefUrl, setTakedownRefUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) return;

    setSubmitting(true);
    try {
      await removeClip({
        clipId,
        reason: reason as RemovalReason,
        notes: notes || undefined,
        takedownRefUrl: reason === 'dmca' ? takedownRefUrl : undefined,
      });
      toast.success(`[removed] reason=${reason}`, {
        description: 'Clip soft-deleted and unlinked from habits.',
        style: { fontFamily: 'var(--font-geist-mono)', fontSize: '12px' },
      });
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      toast.error('Removal failed', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[520px] bg-[var(--color-paper)] rounded-[var(--radius-lg)] p-6"
        style={{ backdropFilter: 'blur(4px)' }}
      >
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[var(--color-ink)]">
            Remove this clip?
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-[var(--color-ink-2)] leading-[1.5]">
          Soft-deletes the clip and unlinks it from any habits using it as evidence. Habit records
          are preserved with evidence_clip_id set to NULL and flagged &ldquo;needs new
          evidence&rdquo;. The clip stays in the database for audit.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="removal-reason"
              className="text-xs font-medium text-[var(--color-ink-2)]"
            >
              Reason <span className="text-[var(--color-warn)]">*</span>
            </label>
            <Select value={reason} onValueChange={(v) => setReason(v as RemovalReason)}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select a reason…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dmca">DMCA / Takedown</SelectItem>
                <SelectItem value="factual-error">Factual error</SelectItem>
                <SelectItem value="medical-risk">Medical risk</SelectItem>
                <SelectItem value="speaker-request">Speaker request</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {reason === 'dmca' && (
            <div className="flex flex-col gap-1">
              <label
                htmlFor="removal-takedown-url"
                className="text-xs font-medium text-[var(--color-ink-2)]"
              >
                Takedown reference URL <span className="text-[var(--color-warn)]">*</span>
              </label>
              <Input
                id="removal-takedown-url"
                type="url"
                value={takedownRefUrl}
                onChange={(e) => setTakedownRefUrl(e.target.value)}
                placeholder="https://..."
                className="text-sm"
                required
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label
              htmlFor="removal-notes"
              className="text-xs font-medium text-[var(--color-ink-2)]"
            >
              Notes (optional)
            </label>
            <Textarea
              id="removal-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional context…"
              rows={3}
              className="text-sm"
            />
          </div>

          <div className="flex gap-2 justify-end mt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="text-sm"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="outline"
              disabled={submitting || !reason}
              className="text-sm border-[color:var(--color-warn)] text-[color:var(--color-warn)] bg-transparent hover:bg-[color:var(--color-warn)]/10"
            >
              {submitting ? 'Removing…' : 'Remove clip'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
