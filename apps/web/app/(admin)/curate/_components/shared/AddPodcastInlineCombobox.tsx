'use client';

import { addPodcast } from '@/app/actions/curate/addPodcast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';

export type PodcastOption = {
  id: string;
  name: string;
};

type Props = {
  podcasts: PodcastOption[];
  value: string;
  onChange: (podcastId: string) => void;
};

export function AddPodcastInlineCombobox({ podcasts, value, onChange }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newHost, setNewHost] = useState('');
  const [trustTier, setTrustTier] = useState<number>(1);
  const [localPodcasts, setLocalPodcasts] = useState<PodcastOption[]>(podcasts);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const result = await addPodcast({
        name: newName.trim(),
        host: newHost.trim() || undefined,
        trustTier,
      });
      const created: PodcastOption = { id: result.id, name: result.name };
      setLocalPodcasts((prev) => [...prev, created]);
      onChange(created.id);
      setShowCreate(false);
      setNewName('');
      setNewHost('');
      setTrustTier(1);
    } catch (err) {
      console.error('Failed to create podcast', err);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Select
        value={value}
        onValueChange={(v) => {
          if (v === '__create__') {
            setShowCreate(true);
          } else {
            setShowCreate(false);
            onChange(v);
          }
        }}
      >
        <SelectTrigger className="text-sm">
          <SelectValue placeholder="Select podcast…" />
        </SelectTrigger>
        <SelectContent>
          {localPodcasts.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
          <SelectItem value="__create__">+ Create new podcast…</SelectItem>
        </SelectContent>
      </Select>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="flex flex-col gap-2 p-3 border border-[var(--color-rule)] rounded-[var(--radius-md)] bg-[var(--color-paper-2)]"
        >
          <p className="text-xs font-semibold text-[var(--color-ink-2)]">New podcast</p>
          <Input
            placeholder="Podcast name *"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            className="text-sm"
          />
          <Input
            placeholder="Host (optional)"
            value={newHost}
            onChange={(e) => setNewHost(e.target.value)}
            className="text-sm"
          />
          <Select value={String(trustTier)} onValueChange={(v) => setTrustTier(Number(v))}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Trust tier" />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map((t) => (
                <SelectItem key={t} value={String(t)}>
                  Tier {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button type="submit" disabled={creating || !newName.trim()} className="text-sm flex-1">
              {creating ? 'Creating…' : 'Create podcast'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowCreate(false)}
              className="text-sm"
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
