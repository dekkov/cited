import { getSessionUser } from '@/lib/auth/guards';
import { getDb } from '@/lib/db';
import { clips, episodes, eq, transcripts } from '@cited/db';
import { redirect } from 'next/navigation';
import { ThreePanePanels } from '../../_components/editor/ThreePanePanels';
import type { TranscriptWord } from '../../_components/editor/TranscriptPane';

// Transcript segments as stored in transcripts.segments jsonb.
type TranscriptSegment = {
  start: number;
  end: number;
  text: string;
  words?: Array<{ text: string; start: number; end: number }>;
};

function db() {
  return getDb();
}

export default async function ClipEditorPage({
  params,
}: {
  params: Promise<{ clipId: string }>;
}) {
  const user = await getSessionUser();
  if (!user || (user.role !== 'curator' && user.role !== 'admin')) {
    redirect('/admin');
  }

  const { clipId } = await params;

  // Load clip
  const [clip] = await db().select().from(clips).where(eq(clips.id, clipId)).limit(1);

  if (!clip) {
    redirect('/admin');
  }

  // Load episode for youtube video id
  const [episode] = await db()
    .select()
    .from(episodes)
    .where(eq(episodes.id, clip.episodeId))
    .limit(1);

  // Load transcript for word-level data
  const [transcript] = episode?.youtubeVideoId
    ? await db()
        .select()
        .from(transcripts)
        .where(eq(transcripts.videoId, episode.youtubeVideoId))
        .limit(1)
    : [];

  // Flatten segments → TranscriptWord[]
  const words: TranscriptWord[] = [];
  if (transcript?.segments) {
    const segs = transcript.segments as TranscriptSegment[];
    for (const seg of segs) {
      if (seg.words && seg.words.length > 0) {
        for (const w of seg.words) {
          words.push({ text: w.text, start: w.start, end: w.end });
        }
      } else {
        // Segment-level fallback (no per-word timing)
        words.push({ text: seg.text, start: seg.start, end: seg.end });
      }
    }
  }

  const youtubeVideoId = episode?.youtubeVideoId ?? '';

  const defaultValues = {
    claim: clip.claim ?? '',
    rationale: clip.rationale ?? '',
    speaker: clip.speaker ?? '',
    speakerStatus: (clip.speakerStatus as 'verified' | 'unverified' | 'host') ?? 'unverified',
    domain:
      (clip.domain as 'sleep' | 'nutrition_gut' | 'exercise_longevity' | 'mental_health') ??
      'sleep',
    riskFlags:
      (clip.riskFlags as Array<'medical_advice' | 'supplement' | 'contraindication' | 'general'>) ??
      [],
    startSec: clip.startSeconds ?? 0,
    endSec: clip.endSeconds ?? 0,
    evidenceStrength:
      (clip.evidenceStrength as
        | 'anecdotal'
        | 'observational'
        | 'rct'
        | 'meta_analysis'
        | undefined) ?? undefined,
  };

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--color-paper)' }}>
      {/* Page header */}
      <header
        className="flex-none px-6 py-3 border-b flex items-center justify-between"
        style={{
          borderColor: 'var(--color-rule)',
          background: 'var(--color-paper-2)',
        }}
      >
        <h1
          className="text-base font-semibold"
          style={{
            fontFamily: 'var(--font-newsreader)',
            color: 'var(--color-ink)',
            fontSize: '16px',
          }}
        >
          Clip editor
          {episode?.title && (
            <span
              className="ml-3 font-normal"
              style={{
                color: 'var(--color-ink-3)',
                fontSize: '14px',
                fontFamily: 'var(--font-geist-sans)',
              }}
            >
              — {episode.title}
            </span>
          )}
        </h1>
        <span
          className="text-xs px-2 py-0.5 rounded-sm"
          style={{
            fontFamily: 'var(--font-geist-mono)',
            color: 'var(--color-ink-3)',
            background: 'var(--color-paper-3)',
          }}
        >
          {clip.status}
        </span>
      </header>

      {/* Three-pane workspace */}
      <div className="flex-1 overflow-hidden">
        <ThreePanePanels
          clipId={clipId}
          youtubeVideoId={youtubeVideoId}
          words={words}
          defaultValues={defaultValues}
        />
      </div>
    </div>
  );
}
