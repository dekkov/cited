'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { AddPodcastInlineCombobox } from '../shared/AddPodcastInlineCombobox';

type IngestState =
  | 'idle'
  | 'resolving'
  | 'fetching'
  | 'transcribing'
  | 'indexed'
  | 'manual_fallback'
  | 'error';

type StepStatus = 'pending' | 'done' | 'active' | 'warn';

type Step = {
  label: string;
  status: StepStatus;
  detail?: string;
};

// Minimal YouTube video ID extractor matching the Plan 03 server-side logic
function extractYouTubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') {
      return u.pathname.slice(1).split('?')[0] ?? null;
    }
    const v = u.searchParams.get('v');
    if (v) return v;
    // youtube.com/shorts/ID
    const shortsMatch = u.pathname.match(/\/shorts\/([A-Za-z0-9_-]{11})/);
    if (shortsMatch) return shortsMatch[1] ?? null;
    return null;
  } catch {
    return null;
  }
}

export function IngestionForm() {
  const [url, setUrl] = useState('');
  const [state, setState] = useState<IngestState>('idle');
  const [steps, setSteps] = useState<Step[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Manual fallback fields
  const [podcastId, setPodcastId] = useState('');
  const [manualVideoId, setManualVideoId] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [manualFilename, setManualFilename] = useState('transcript.vtt');
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualSuccess, setManualSuccess] = useState(false);

  async function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSteps([]);

    // Client-side validate YouTube URL
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
      setError("Couldn't parse a YouTube video ID from that URL.");
      return;
    }

    setState('resolving');
    setSteps([
      { label: 'Resolving video metadata…', status: 'active' },
      { label: 'Fetching auto-captions…', status: 'pending' },
      { label: 'Indexed into corpus (tsvector + chunks).', status: 'pending' },
    ]);

    try {
      const res = await fetch('/api/admin/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = (await res.json()) as Record<string, unknown>;

      if (res.status === 422) {
        const msg = String(data.error ?? '');
        if (msg.toLowerCase().includes('phase 2 fallback')) {
          setSteps([
            { label: 'Resolving video metadata…', status: 'done', detail: videoId },
            {
              label: 'Fetching auto-captions…',
              status: 'warn',
              detail: 'No captions — manual upload required',
            },
            { label: 'Indexed into corpus (tsvector + chunks).', status: 'pending' },
          ]);
          // Pre-fill videoId for manual form
          setManualVideoId(videoId);
          setState('manual_fallback');
          return;
        }
        setError(String(data.error ?? 'Transcript fetch failed.'));
        setState('error');
        return;
      }

      if (!res.ok) {
        setError(String(data.error ?? 'Transcript fetch failed.'));
        setState('error');
        return;
      }

      const title = data.title ? String(data.title) : videoId;
      const chunkCount = Number(data.chunkCount ?? 0);

      setSteps([
        { label: 'Resolving video metadata…', status: 'done', detail: title },
        {
          label: 'Fetching auto-captions…',
          status: 'done',
          detail: `Captions found (${chunkCount} chunks)`,
        },
        { label: 'Indexed into corpus (tsvector + chunks).', status: 'done' },
      ]);
      setState('indexed');
    } catch {
      setError('Transcript fetch failed.');
      setState('error');
    }
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    setManualSubmitting(true);
    try {
      const res = await fetch('/api/admin/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manualTranscript: {
            podcastId,
            youtubeVideoId: manualVideoId,
            title: manualTitle || undefined,
            content: manualContent,
            filename: manualFilename,
          },
        }),
      });

      if (res.ok) {
        setManualSuccess(true);
        setSteps((prev) => [
          ...prev.slice(0, 2),
          { label: 'Indexed into corpus (tsvector + chunks).', status: 'done' },
        ]);
        setState('indexed');
      } else {
        const data = (await res.json()) as Record<string, unknown>;
        setError(String(data.error ?? 'Transcript fetch failed.'));
        setState('error');
      }
    } catch {
      setError('Transcript fetch failed.');
      setState('error');
    } finally {
      setManualSubmitting(false);
    }
  }

  const isSubmitting = state === 'resolving' || state === 'fetching' || state === 'transcribing';

  return (
    <div className="bg-[var(--color-paper-2)] rounded-[var(--radius-lg)] p-6 max-w-[720px] flex flex-col gap-4">
      {/* URL form */}
      <form onSubmit={handleUrlSubmit} className="flex flex-col gap-3">
        <label
          htmlFor="ingest-url"
          className="text-sm font-semibold text-[var(--color-ink-2)]"
          style={{ fontFamily: 'var(--font-geist-sans)' }}
        >
          YouTube URL
        </label>
        <div className="flex gap-2">
          <Input
            id="ingest-url"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
            className="flex-1 text-sm"
            style={{ fontFamily: 'var(--font-geist-mono)' }}
            disabled={isSubmitting}
          />
          <Button
            type="submit"
            disabled={isSubmitting || !url.trim()}
            className="text-sm font-medium bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-deep)] shrink-0"
            style={{ fontFamily: 'var(--font-geist-sans)' }}
          >
            {isSubmitting ? 'Fetching…' : 'Fetch transcript'}
          </Button>
        </div>
      </form>

      {/* Error state */}
      {error && state !== 'manual_fallback' && (
        <div className="text-sm text-[var(--color-warn)] flex flex-col gap-1">
          <p className="font-medium">{error}</p>
          {error.includes('YouTube video ID') && (
            <p className="text-[var(--color-ink-3)]">
              Expected formats: youtube.com/watch?v=… · youtu.be/… · youtube.com/shorts/…
            </p>
          )}
          {error.includes('Transcript fetch failed') && (
            <p className="text-[var(--color-ink-3)]">
              Retry, or paste the transcript manually into the override panel.
            </p>
          )}
        </div>
      )}

      {/* Step progress */}
      {steps.length > 0 && (
        <div className="flex flex-col gap-2 mt-1">
          {steps.map((step) => (
            <div key={step.label} className="flex items-start gap-2 text-sm">
              <span
                className="font-mono text-[12px] shrink-0 mt-0.5"
                style={{
                  color:
                    step.status === 'done'
                      ? 'var(--color-accent-deep)'
                      : step.status === 'warn'
                        ? 'var(--color-warn)'
                        : step.status === 'active'
                          ? 'var(--color-ink-2)'
                          : 'var(--color-ink-4)',
                }}
              >
                {step.status === 'done'
                  ? '[ok]'
                  : step.status === 'warn'
                    ? '[!]'
                    : step.status === 'active'
                      ? '...'
                      : '   '}
              </span>
              <div className="flex flex-col">
                <span
                  style={{
                    color:
                      step.status === 'pending'
                        ? 'var(--color-ink-4)'
                        : step.status === 'warn'
                          ? 'var(--color-warn)'
                          : 'var(--color-ink-2)',
                  }}
                >
                  {step.label.startsWith('Transcribing') ? (
                    <span className="font-mono text-[12px] text-[var(--color-ink-3)]">
                      Transcribing — ~2 min
                    </span>
                  ) : (
                    step.label
                  )}
                </span>
                {step.detail && (
                  <span className="text-[12px] text-[var(--color-ink-3)]">{step.detail}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manual fallback panel */}
      {state === 'manual_fallback' && !manualSuccess && (
        <form
          onSubmit={handleManualSubmit}
          className="flex flex-col gap-3 border-t border-[var(--color-rule)] pt-4 mt-2"
        >
          <p className="text-sm font-semibold text-[var(--color-ink-2)]">
            Manual transcript upload
          </p>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="manual-podcast"
              className="text-xs font-medium text-[var(--color-ink-3)]"
            >
              Podcast
            </label>
            <AddPodcastInlineCombobox podcasts={[]} value={podcastId} onChange={setPodcastId} />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="manual-video-id"
              className="text-xs font-medium text-[var(--color-ink-3)]"
            >
              YouTube video ID (11 chars)
            </label>
            <Input
              id="manual-video-id"
              value={manualVideoId}
              onChange={(e) => setManualVideoId(e.target.value)}
              maxLength={11}
              placeholder="dQw4w9WgXcQ"
              className="text-sm font-mono"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="manual-title" className="text-xs font-medium text-[var(--color-ink-3)]">
              Episode title (optional)
            </label>
            <Input
              id="manual-title"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              placeholder="Episode title (optional)"
              className="text-sm"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="manual-content"
              className="text-xs font-medium text-[var(--color-ink-3)]"
            >
              Transcript content (VTT / SRT / txt)
            </label>
            <Textarea
              id="manual-content"
              value={manualContent}
              onChange={(e) => setManualContent(e.target.value)}
              placeholder="Paste VTT / SRT / plaintext transcript here…"
              rows={8}
              className="text-xs font-mono"
              style={{ fontFamily: 'var(--font-geist-mono)' }}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="manual-filename"
              className="text-xs font-medium text-[var(--color-ink-3)]"
            >
              Filename
            </label>
            <Input
              id="manual-filename"
              value={manualFilename}
              onChange={(e) => setManualFilename(e.target.value)}
              placeholder="transcript.vtt"
              className="text-sm font-mono"
            />
          </div>

          <Button
            type="submit"
            disabled={manualSubmitting || !manualVideoId || !manualContent}
            className="text-sm font-medium self-start"
          >
            {manualSubmitting ? 'Uploading…' : 'Upload transcript'}
          </Button>
        </form>
      )}
    </div>
  );
}
