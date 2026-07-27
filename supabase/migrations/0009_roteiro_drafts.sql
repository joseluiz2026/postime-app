-- roteiro_drafts: one row per user holding the current batch of generated
-- roteiros that hasn't fully turned into videos yet. Previously this only
-- lived in client React state (lib/wizard-context.tsx), so a page refresh or
-- a new session lost every roteiro that wasn't already built into a video —
-- this table lets the user build videos one at a time across sessions
-- without losing the rest of the batch.
create table if not exists public.roteiro_drafts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  roteiros jsonb not null default '[]'::jsonb,
  used_temas jsonb not null default '[]'::jsonb,
  failed_temas jsonb not null default '[]'::jsonb,
  audio_paths jsonb not null default '[]'::jsonb,
  audio_durations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.roteiro_drafts enable row level security;

create policy "roteiro_drafts: user can select own row"
  on public.roteiro_drafts for select
  using (auth.uid() = user_id);

create policy "roteiro_drafts: user can insert own row"
  on public.roteiro_drafts for insert
  with check (auth.uid() = user_id);

create policy "roteiro_drafts: user can update own row"
  on public.roteiro_drafts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "roteiro_drafts: user can delete own row"
  on public.roteiro_drafts for delete
  using (auth.uid() = user_id);

drop trigger if exists roteiro_drafts_set_updated_at on public.roteiro_drafts;
create trigger roteiro_drafts_set_updated_at
  before update on public.roteiro_drafts
  for each row execute function public.set_updated_at();
