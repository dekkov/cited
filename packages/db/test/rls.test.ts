import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const SUPABASE_URL = process.env['SUPABASE_URL'];
const SERVICE_ROLE = process.env['SUPABASE_SERVICE_ROLE_KEY'];
const ANON_KEY = process.env['SUPABASE_ANON_KEY'];
const DB_URL = process.env['DATABASE_URL'];

const skip = !SUPABASE_URL || !SERVICE_ROLE || !ANON_KEY || !DB_URL;

describe.skipIf(skip)('RLS isolation', () => {
  // All initialization deferred inside beforeAll to avoid errors when vars absent
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let admin: any;
  let userA: { id: string; jwt: string };
  let userB: { id: string; jwt: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sql: any;

  beforeAll(async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const postgresDefault = (await import('postgres')).default;
    sql = postgresDefault(DB_URL!, { prepare: false });
    admin = createClient(SUPABASE_URL!, SERVICE_ROLE!);

    const timestamp = Date.now();
    const a = await admin.auth.admin.createUser({
      email: `rls-a-${timestamp}@example.com`,
      password: 'Password1!',
      email_confirm: true,
    });
    const b = await admin.auth.admin.createUser({
      email: `rls-b-${timestamp}@example.com`,
      password: 'Password1!',
      email_confirm: true,
    });
    const aSession = await createClient(SUPABASE_URL!, ANON_KEY!).auth.signInWithPassword({
      email: a.data.user!.email!,
      password: 'Password1!',
    });
    const bSession = await createClient(SUPABASE_URL!, ANON_KEY!).auth.signInWithPassword({
      email: b.data.user!.email!,
      password: 'Password1!',
    });
    userA = { id: a.data.user!.id, jwt: aSession.data.session!.access_token };
    userB = { id: b.data.user!.id, jwt: bSession.data.session!.access_token };

    const timestamp2 = Date.now();
    await admin
      .from('habit_templates')
      .insert({ slug: `rls-test-habit-${timestamp2}`, title: 'RLS Test', domain: 'sleep' })
      .select();
    const ht = await admin
      .from('habit_templates')
      .select('id')
      .eq('slug', `rls-test-habit-${timestamp2}`)
      .single();
    await admin
      .from('user_habits')
      .insert({ user_id: userB.id, habit_template_id: ht.data!.id, frequency: 'daily' });
  });

  it('user A cannot read user B user_habits', async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const cliA = createClient(SUPABASE_URL!, ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${userA.jwt}` } },
    });
    const { data } = await cliA.from('user_habits').select('*');
    expect(data?.every((r: any) => r.user_id === userA.id)).toBe(true);
    expect(data?.some((r: any) => r.user_id === userB.id)).toBe(false);
  });

  it('user A cannot insert user_habit with user_id = B', async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const cliA = createClient(SUPABASE_URL!, ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${userA.jwt}` } },
    });
    const { error } = await cliA.from('user_habits').insert({
      user_id: userB.id,
      habit_template_id: '00000000-0000-0000-0000-000000000000',
      frequency: 'daily',
    });
    expect(error).not.toBeNull();
  });

  it('anon role sees 0 profiles', async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const anon = createClient(SUPABASE_URL!, ANON_KEY!);
    const { data } = await anon.from('profiles').select('*');
    expect(data).toEqual([]);
  });

  it('anon role sees only approved clips', async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const anon = createClient(SUPABASE_URL!, ANON_KEY!);
    const { data } = await anon.from('clips').select('*');
    expect((data ?? []).every((c: any) => c.status === 'approved')).toBe(true);
  });

  it('user A cannot read user B consent_records (Article 9 GDPR isolation)', async () => {
    const { createClient } = await import('@supabase/supabase-js');
    await admin
      .from('consent_records')
      .insert({ user_id: userB.id, scope: 'account', granted: true });
    const cliA = createClient(SUPABASE_URL!, ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${userA.jwt}` } },
    });
    const { data } = await cliA.from('consent_records').select('*');
    expect(data ?? []).toEqual([]);
  });

  afterAll(async () => {
    if (sql) await sql.end();
    if (userA?.id) await admin?.auth.admin.deleteUser(userA.id);
    if (userB?.id) await admin?.auth.admin.deleteUser(userB.id);
  });
});
