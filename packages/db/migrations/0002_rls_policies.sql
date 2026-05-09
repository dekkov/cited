-- Helper: is_curator_or_admin (reads role from profiles)
create or replace function public.is_curator_or_admin()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(
    (select role in ('curator','admin') from public.profiles where id = auth.uid()),
    false
  );
$$;

-- profiles: user can read/update own row only
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- consent_records: append-only by user; user can read own
create policy "consent_select_own" on public.consent_records for select using (auth.uid() = user_id);
create policy "consent_insert_own" on public.consent_records for insert with check (auth.uid() = user_id);
-- no update / delete policy — append-only by design

-- user_habits: user owns their habits
create policy "user_habits_all_own" on public.user_habits for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- check_ins
create policy "check_ins_all_own" on public.check_ins for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- streaks
create policy "streaks_all_own" on public.streaks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- streak_freezes
create policy "streak_freezes_all_own" on public.streak_freezes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Curator-curated tables: world-readable for approved rows; write only for curators
create policy "podcasts_public_read" on public.podcasts for select using (true);
create policy "podcasts_curator_write" on public.podcasts for all
  using (public.is_curator_or_admin()) with check (public.is_curator_or_admin());

create policy "episodes_public_read" on public.episodes for select using (true);
create policy "episodes_curator_write" on public.episodes for all
  using (public.is_curator_or_admin()) with check (public.is_curator_or_admin());

-- clips: only approved + available are publicly readable; pending only to curators
create policy "clips_public_read_approved" on public.clips for select
  using (status = 'approved' and exists (
    select 1 from public.episodes e
    where e.id = clips.episode_id and e.availability = 'available'
  ));
create policy "clips_curator_read_all" on public.clips for select
  using (public.is_curator_or_admin());
create policy "clips_curator_write" on public.clips for all
  using (public.is_curator_or_admin()) with check (public.is_curator_or_admin());

create policy "clip_edits_curator" on public.clip_edits for all
  using (public.is_curator_or_admin()) with check (public.is_curator_or_admin());

create policy "transcript_chunks_curator_read" on public.transcript_chunks for select
  using (public.is_curator_or_admin());
create policy "transcript_chunks_curator_write" on public.transcript_chunks for all
  using (public.is_curator_or_admin()) with check (public.is_curator_or_admin());

create policy "habit_templates_public_read" on public.habit_templates for select using (true);
create policy "habit_templates_curator_write" on public.habit_templates for all
  using (public.is_curator_or_admin()) with check (public.is_curator_or_admin());

create policy "habit_template_clips_public_read" on public.habit_template_clips for select using (true);
create policy "habit_template_clips_curator_write" on public.habit_template_clips for all
  using (public.is_curator_or_admin()) with check (public.is_curator_or_admin());

-- extraction_jobs + clips_pending: curator/admin only
create policy "extraction_jobs_curator" on public.extraction_jobs for all
  using (public.is_curator_or_admin()) with check (public.is_curator_or_admin());
create policy "clips_pending_curator" on public.clips_pending for all
  using (public.is_curator_or_admin()) with check (public.is_curator_or_admin());

-- Trigger: auto-create profile row on auth.users insert
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
