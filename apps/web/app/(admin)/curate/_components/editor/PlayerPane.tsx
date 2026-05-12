'use client';

import { YouTubeEmbed } from '@next/third-parties/google';

type Props = {
  youtubeVideoId: string;
  startSec: number;
};

// Phase 2 simplification: re-mount on selection change so YouTube re-seeks.
// Phase 3 will use the imperative IFrame Player API for in-place seeks.
export function PlayerPane({ youtubeVideoId, startSec }: Props) {
  const start = Math.max(0, Math.floor(startSec));
  return (
    <div
      className="h-full flex items-center justify-center"
      style={{ background: 'var(--color-paper-2)' }}
    >
      <div className="w-full max-w-3xl px-4">
        <YouTubeEmbed
          key={`${youtubeVideoId}-${start}`}
          videoid={youtubeVideoId}
          params={`start=${start}`}
          playlabel="Play preview"
        />
      </div>
    </div>
  );
}
