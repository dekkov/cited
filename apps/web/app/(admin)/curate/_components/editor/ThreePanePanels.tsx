'use client';

import { approveClip } from '@/app/actions/curate/approveClip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { toast } from 'sonner';
import { CopilotTab } from './CopilotTab';
import { MetadataTab } from './MetadataTab';
import { PlayerPane } from './PlayerPane';
import { TranscriptPane, type TranscriptWord } from './TranscriptPane';

type Props = {
  clipId: string;
  youtubeVideoId: string;
  words: TranscriptWord[];
  defaultValues: Parameters<typeof MetadataTab>[0]['defaultValues'];
};

export function ThreePanePanels({ clipId, youtubeVideoId, words, defaultValues }: Props) {
  const [selectionStartIndex, setSelectionStartIndex] = useState<number | null>(null);
  const [selectionEndIndex, setSelectionEndIndex] = useState<number | null>(null);
  const [startSec, setStartSec] = useState<number>(defaultValues.startSec ?? 0);

  const handleSelectionChange = (start: number | null, end: number | null) => {
    setSelectionStartIndex(start);
    setSelectionEndIndex(end);
    if (start !== null && words[start]) {
      setStartSec(words[start].start);
    }
  };

  const handleSetStart = (sec: number) => {
    setStartSec(sec);
    const idx = words.findIndex((w) => Math.abs(w.start - sec) < 0.01);
    if (idx >= 0) setSelectionStartIndex(idx);
  };

  const handleSetEnd = (sec: number) => {
    const idx = words.findIndex((w) => Math.abs(w.end - sec) < 0.01);
    if (idx >= 0) setSelectionEndIndex(idx);
  };

  const handleNudge = (deltaSec: number) => {
    setStartSec((prev) => Math.max(0, prev + deltaSec));
  };

  return (
    <PanelGroup orientation="horizontal" className="h-full">
      {/* Left: Transcript */}
      <Panel defaultSize={40} minSize={25} aria-label="Transcript panel">
        <TranscriptPane
          words={words}
          selectionStartIndex={selectionStartIndex}
          selectionEndIndex={selectionEndIndex}
          onSelectionChange={handleSelectionChange}
          onSetStart={handleSetStart}
          onSetEnd={handleSetEnd}
          onNudge={handleNudge}
        />
      </Panel>

      <PanelResizeHandle
        className="w-1 cursor-col-resize hover:bg-[var(--color-accent)]"
        aria-label="Resize transcript and right panels"
        style={{ background: 'var(--color-rule)' }}
      />

      {/* Right column: player on top, tabbed metadata+copilot below */}
      <Panel defaultSize={60} minSize={30} aria-label="Editor right panel">
        <PanelGroup orientation="vertical">
          <Panel defaultSize={45} minSize={20} aria-label="Player panel">
            <PlayerPane youtubeVideoId={youtubeVideoId} startSec={startSec} />
          </Panel>

          <PanelResizeHandle
            className="h-1 cursor-row-resize hover:bg-[var(--color-accent)]"
            aria-label="Resize player and metadata panels"
            style={{ background: 'var(--color-rule)' }}
          />

          <Panel defaultSize={55} minSize={30} aria-label="Metadata and copilot panel">
            <Tabs defaultValue="metadata" className="h-full flex flex-col">
              <TabsList
                className="mx-4 mt-3 self-start"
                style={{ background: 'var(--color-paper-2)' }}
              >
                <TabsTrigger value="metadata" style={{ fontSize: '14px' }}>
                  Metadata
                </TabsTrigger>
                <TabsTrigger value="copilot" style={{ fontSize: '14px' }}>
                  AI co-pilot
                </TabsTrigger>
              </TabsList>

              <TabsContent value="metadata" className="flex-1 overflow-hidden mt-0">
                <MetadataTab
                  defaultValues={{
                    ...defaultValues,
                    startSec,
                    endSec:
                      (selectionEndIndex !== null && words[selectionEndIndex]
                        ? words[selectionEndIndex].end
                        : defaultValues.endSec) ?? 0,
                  }}
                  onSubmit={async (values) => {
                    await approveClip({ ...values, clipId });
                    toast.success('Clip approved and published.');
                  }}
                  onSaveDraft={() => {
                    toast.info('Draft saved. (Persistence lands in 02-05.)');
                  }}
                />
              </TabsContent>

              <TabsContent value="copilot" className="flex-1 overflow-hidden mt-0">
                <CopilotTab clipId={clipId} />
              </TabsContent>
            </Tabs>
          </Panel>
        </PanelGroup>
      </Panel>
    </PanelGroup>
  );
}
