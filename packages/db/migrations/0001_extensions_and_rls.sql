-- Required extensions
create extension if not exists vector;
create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

-- Add auth.users foreign key constraints (Supabase Auth manages this table)
alter table public.profiles
  add constraint profiles_id_fk
  foreign key (id) references auth.users(id) on delete cascade;

alter table public.consent_records
  add constraint consent_records_user_id_fk
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.user_habits
  add constraint user_habits_user_id_fk
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.check_ins
  add constraint check_ins_user_id_fk
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.streaks
  add constraint streaks_user_id_fk
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.streak_freezes
  add constraint streak_freezes_user_id_fk
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.clips
  add constraint clips_created_by_fk
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.clips
  add constraint clips_approved_by_fk
  foreign key (approved_by) references auth.users(id) on delete set null;

alter table public.clip_edits
  add constraint clip_edits_actor_id_fk
  foreign key (actor_id) references auth.users(id) on delete set null;

-- HNSW indexes for vector cosine search (pgvector 0.8+ default)
create index if not exists clips_embedding_hnsw_idx
  on public.clips using hnsw (embedding vector_cosine_ops);
create index if not exists transcript_chunks_embedding_hnsw_idx
  on public.transcript_chunks using hnsw (embedding vector_cosine_ops);
create index if not exists clips_pending_embedding_hnsw_idx
  on public.clips_pending using hnsw (embedding vector_cosine_ops);

-- tsvector index for hybrid search on clips (used by AION-03 in Phase 3)
create index if not exists clips_text_search_idx
  on public.clips using gin (
    to_tsvector('english', coalesce(claim, '') || ' ' || coalesce(rationale, ''))
  );

-- Enable RLS on EVERY table (default-deny; explicit policies in 0002)
alter table public.profiles enable row level security;
alter table public.consent_records enable row level security;
alter table public.user_habits enable row level security;
alter table public.check_ins enable row level security;
alter table public.streaks enable row level security;
alter table public.streak_freezes enable row level security;
alter table public.podcasts enable row level security;
alter table public.episodes enable row level security;
alter table public.clips enable row level security;
alter table public.clip_edits enable row level security;
alter table public.transcript_chunks enable row level security;
alter table public.habit_templates enable row level security;
alter table public.habit_template_clips enable row level security;
alter table public.extraction_jobs enable row level security;
alter table public.clips_pending enable row level security;
