import { describe, it, expect } from 'vitest';

const skip =
  !process.env['DATABASE_URL'] ||
  !process.env['SUPABASE_URL'] ||
  !process.env['SUPABASE_SERVICE_ROLE_KEY'];

describe.skipIf(skip)('cascade delete from auth.users', () => {
  it('removes all child rows in user-scoped tables', async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const postgresDefault = (await import('postgres')).default;

    const admin = createClient(
      process.env['SUPABASE_URL']!,
      process.env['SUPABASE_SERVICE_ROLE_KEY']!,
    );
    const sql = postgresDefault(process.env['DATABASE_URL']!, { prepare: false });
    const timestamp = Date.now();

    const u = await admin.auth.admin.createUser({
      email: `cascade-${timestamp}@example.com`,
      password: 'Password1!',
      email_confirm: true,
    });
    const uid = u.data.user!.id;

    const { data: ht } = await admin
      .from('habit_templates')
      .upsert(
        { slug: `cascade-h-${timestamp}`, title: 'C', domain: 'sleep' },
        { onConflict: 'slug' },
      )
      .select()
      .single();
    await admin
      .from('user_habits')
      .insert({ user_id: uid, habit_template_id: ht!.id, frequency: 'daily' });
    await admin
      .from('consent_records')
      .insert({ user_id: uid, scope: 'account', granted: true });

    // delete user — this triggers cascade via auth.users → profiles → child tables
    await admin.auth.admin.deleteUser(uid);

    // assert row counts in all user-scoped tables
    const tables = [
      'profiles',
      'user_habits',
      'check_ins',
      'streaks',
      'streak_freezes',
      'consent_records',
    ];
    for (const t of tables) {
      const idCol = t === 'profiles' ? 'id' : 'user_id';
      const r = await sql.unsafe(
        `select count(*)::int as c from public.${t} where ${idCol} = $1`,
        [uid],
      );
      expect(r[0]?.c, `${t} should have 0 rows for deleted user`).toBe(0);
    }

    await sql.end();
  });
});
