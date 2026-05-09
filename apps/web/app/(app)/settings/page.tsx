import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { requireUser } from '@/lib/auth/guards';

export default async function SettingsPage() {
  await requireUser();
  // TODO(01-07): server action to update profiles table — for now this is a non-interactive stub
  return (
    <form className="space-y-4 max-w-md">
      <h1 className="text-2xl font-semibold font-[family-name:var(--font-newsreader)]">Settings</h1>
      <div className="space-y-2">
        <Label htmlFor="display_name">Display name</Label>
        <Input id="display_name" name="display_name" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="timezone">Timezone</Label>
        <Input id="timezone" name="timezone" defaultValue="UTC" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="privacy_mode">Privacy mode</Label>
        <select
          id="privacy_mode"
          name="privacy_mode"
          className="w-full border border-[var(--color-rule)] rounded-[var(--radius-md)] px-3 py-2 bg-transparent text-sm text-[var(--color-ink)]"
        >
          <option value="private">Private</option>
          <option value="public">Public</option>
        </select>
      </div>
      <Button type="submit" disabled>
        Save (server action lands in 01-07)
      </Button>
    </form>
  );
}
