import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoginForm } from './login-form';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/guards';

export default async function LoginPage() {
  const u = await getSessionUser();
  if (u) redirect('/dashboard');
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in to Cited</CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
