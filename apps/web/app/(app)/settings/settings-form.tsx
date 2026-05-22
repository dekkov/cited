'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useActionState } from 'react';
import { updateProfile } from './actions';

interface SettingsFormProps {
  initial: {
    display_name: string;
    timezone: string;
    privacy_mode: 'public' | 'private';
  };
}

export function SettingsForm({ initial }: SettingsFormProps) {
  const [state, action, pending] = useActionState(
    updateProfile,
    {} as {
      ok?: boolean;
      message?: string;
      error?: string;
    },
  );
  return (
    <form action={action} className="space-y-4 max-w-md">
      <h1 className="text-2xl font-semibold font-[family-name:var(--font-newsreader)]">Settings</h1>
      <div className="space-y-2">
        <Label htmlFor="display_name">Display name</Label>
        <Input
          id="display_name"
          name="display_name"
          defaultValue={initial.display_name}
          maxLength={80}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="timezone">Timezone</Label>
        <Input id="timezone" name="timezone" defaultValue={initial.timezone} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="privacy_mode">Privacy mode</Label>
        <select
          id="privacy_mode"
          name="privacy_mode"
          defaultValue={initial.privacy_mode}
          className="w-full border border-[var(--color-rule)] rounded-[var(--radius-md)] px-3 py-2 bg-transparent text-sm text-[var(--color-ink)]"
        >
          <option value="private">Private</option>
          <option value="public">Public</option>
        </select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save'}
      </Button>
      {state.ok && <p className="text-sm text-green-700">{state.message}</p>}
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
