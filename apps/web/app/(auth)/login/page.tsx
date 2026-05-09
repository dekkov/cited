import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  return (
    <main className="w-full max-w-md px-4">
      <Card>
        <CardHeader>
          <CardTitle>Sign in to Cited</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[var(--color-ink-3)]">
            Magic link + Google OAuth wire-up lands in plan 01-07.
          </p>
          <Button disabled className="w-full">
            Continue with email (coming soon)
          </Button>
          <Button disabled variant="outline" className="w-full">
            Continue with Google (coming soon)
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
