'use client';

import { acceptCopilotSuggestion, rejectCopilotSuggestion } from '@/app/actions/curate/copilot';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { toast } from 'sonner';
import { SuggestionCard } from '../copilot/SuggestionCard';

type CopilotKind = 'suggest-start-end' | 'refine-claim' | 'propose-alternative';

const KIND_LABELS: Record<CopilotKind, string> = {
  'suggest-start-end': 'Suggest start/end',
  'refine-claim': 'Refine claim',
  'propose-alternative': 'Propose alternative phrasing',
};

type SuggestionItem = {
  id: string;
  kind: CopilotKind;
  timestamp: string;
  before: string;
  after: string;
  similarity: number;
  suggestion: Record<string, unknown>;
  streaming?: boolean;
};

type Props = {
  clipId: string;
};

function formatHMS(s: number): string {
  const total = Math.max(0, Math.floor(s));
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export function CopilotTab({ clipId }: Props) {
  const [activeKind, setActiveKind] = useState<CopilotKind>('suggest-start-end');
  const [freeText, setFreeText] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const handleStream = async () => {
    if (isStreaming) return;
    setIsStreaming(true);

    const tempId = crypto.randomUUID();
    const ts = formatHMS(Date.now() / 1000);

    // Add a streaming placeholder
    setSuggestions((prev) => [
      {
        id: tempId,
        kind: activeKind,
        timestamp: ts,
        before: '',
        after: '',
        similarity: 1,
        suggestion: {},
        streaming: true,
      },
      ...prev,
    ]);

    try {
      const res = await fetch('/api/admin/copilot/stream', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          clipId,
          kind: activeKind,
          selection: freeText || '(no selection — describe what to analyze)',
          freeText: freeText || undefined,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Copilot stream returned ${res.status}`);
      }

      // Read the stream and collect the final JSON object
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
      }

      // Parse last complete JSON line
      const lines = full.trim().split('\n').filter(Boolean);
      let parsed: Record<string, unknown> = {};
      for (const line of lines.reverse()) {
        try {
          parsed = JSON.parse(line);
          break;
        } catch {
          // skip partial lines
        }
      }

      const similarity: number = (parsed.similarity as number) ?? 1;
      const suggestionPayload = (parsed.suggestion ?? parsed) as Record<string, unknown>;
      const after = formatSuggestionText(activeKind, suggestionPayload);

      setSuggestions((prev) =>
        prev.map((s) =>
          s.id === tempId
            ? { ...s, after, similarity, suggestion: suggestionPayload, streaming: false }
            : s,
        ),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Co-pilot error: ${msg}`, {
        style: { fontFamily: 'var(--font-geist-mono)', fontSize: '12px' },
      });
      setSuggestions((prev) => prev.filter((s) => s.id !== tempId));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleAccept = async (item: SuggestionItem) => {
    await acceptCopilotSuggestion({
      clipId,
      kind: item.kind,
      suggestion: item.suggestion,
      similarity: item.similarity,
    });
    toast.success('Suggestion accepted.', {
      style: { fontFamily: 'var(--font-geist-mono)', fontSize: '12px' },
    });
    setSuggestions((prev) => prev.filter((s) => s.id !== item.id));
  };

  const handleDiscard = async (item: SuggestionItem) => {
    await rejectCopilotSuggestion({
      clipId,
      kind: item.kind,
      suggestion: item.suggestion,
      similarity: item.similarity,
    });
    toast('Suggestion discarded.', {
      style: { fontFamily: 'var(--font-geist-mono)', fontSize: '12px' },
    });
    setSuggestions((prev) => prev.filter((s) => s.id !== item.id));
  };

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ background: 'var(--color-paper)' }}
    >
      {/* Preset buttons + free text */}
      <div
        className="flex-none p-4 border-b space-y-3"
        style={{ borderColor: 'var(--color-rule)' }}
      >
        <div className="flex flex-wrap gap-2">
          {(Object.keys(KIND_LABELS) as CopilotKind[]).map((kind) => (
            <Button
              key={kind}
              size="sm"
              variant={activeKind === kind ? 'default' : 'outline'}
              onClick={() => setActiveKind(kind)}
              style={{
                fontSize: '12px',
                fontFamily: 'var(--font-geist-mono)',
                ...(activeKind === kind
                  ? { background: 'var(--color-accent)', color: 'var(--color-paper)' }
                  : { borderColor: 'var(--color-rule)', color: 'var(--color-ink)' }),
              }}
            >
              {KIND_LABELS[kind]}
            </Button>
          ))}
        </div>
        <Textarea
          placeholder="Optional: paste a transcript selection or ask a question…"
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          rows={2}
          className="text-sm"
          style={{ fontFamily: 'var(--font-geist-sans)', fontSize: '14px' }}
        />
        <Button
          onClick={handleStream}
          disabled={isStreaming}
          style={{
            background: 'var(--color-accent)',
            color: 'var(--color-paper)',
            fontSize: '14px',
          }}
        >
          {isStreaming ? 'Streaming…' : 'Ask co-pilot'}
        </Button>
      </div>

      {/* Suggestion list — newest first */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {suggestions.length === 0 && (
          <p
            className="text-xs"
            style={{ color: 'var(--color-ink-3)', fontFamily: 'var(--font-geist-mono)' }}
          >
            No suggestions yet. Pick a preset and click Ask co-pilot.
          </p>
        )}
        {suggestions.map((item) => (
          <SuggestionCard
            key={item.id}
            kind={item.kind}
            timestamp={item.timestamp}
            similarity={item.similarity}
            before={item.before}
            after={item.after}
            {...(item.streaming !== undefined ? { streaming: item.streaming } : {})}
            onApply={() => handleAccept(item)}
            onDiscard={() => handleDiscard(item)}
          />
        ))}
      </div>
    </div>
  );
}

function formatSuggestionText(kind: CopilotKind, suggestion: Record<string, unknown>): string {
  if (kind === 'suggest-start-end') {
    const start = suggestion.startSec as number | undefined;
    const end = suggestion.endSec as number | undefined;
    const rationale = suggestion.rationale as string | undefined;
    return `${start !== undefined ? formatHMS(start) : '?'} → ${end !== undefined ? formatHMS(end) : '?'}\n${rationale ?? ''}`;
  }
  if (kind === 'refine-claim') {
    return (suggestion.refinedClaim as string | undefined) ?? '';
  }
  return (suggestion.alternativeClaim as string | undefined) ?? '';
}
