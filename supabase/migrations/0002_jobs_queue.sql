-- jobs: one row per video-generation job (Free = image-based, Pro = AI video), async queue
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pendente' check (status in ('pendente', 'processando', 'pronto', 'erro', 'expirado')),
  plan text not null check (plan in ('free', 'pro')),
  provider text,
  scenes jsonb,
  video_url text,
  estimated_cost numeric(10, 4),
  error_message text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.jobs.expires_at is 'Set to ready-time + 60 minutes when status becomes pronto. A cleanup job deletes the stored video and flips status to expirado once this passes.';

alter table public.jobs enable row level security;

create policy "jobs: user can select own rows"
  on public.jobs for select
  using (auth.uid() = user_id);

create policy "jobs: user can insert own rows"
  on public.jobs for insert
  with check (auth.uid() = user_id);

create policy "jobs: user can update own rows"
  on public.jobs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- no delete policy: job history is kept for auditing/support

drop trigger if exists jobs_set_updated_at on public.jobs;
create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

-- Realtime: let the frontend subscribe to status changes on its own jobs
alter publication supabase_realtime add table public.jobs;

-- Storage: private buckets for recorded/uploaded narration audio and rendered videos
insert into storage.buckets (id, name, public)
values ('postime-audio', 'postime-audio', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('postime-videos', 'postime-videos', false)
on conflict (id) do nothing;

-- Storage RLS: each user can only touch files under a folder named with their own user id
create policy "postime-audio: user can select own files"
  on storage.objects for select
  using (bucket_id = 'postime-audio' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "postime-audio: user can insert own files"
  on storage.objects for insert
  with check (bucket_id = 'postime-audio' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "postime-audio: user can update own files"
  on storage.objects for update
  using (bucket_id = 'postime-audio' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "postime-audio: user can delete own files"
  on storage.objects for delete
  using (bucket_id = 'postime-audio' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "postime-videos: user can select own files"
  on storage.objects for select
  using (bucket_id = 'postime-videos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "postime-videos: user can insert own files"
  on storage.objects for insert
  with check (bucket_id = 'postime-videos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "postime-videos: user can update own files"
  on storage.objects for update
  using (bucket_id = 'postime-videos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "postime-videos: user can delete own files"
  on storage.objects for delete
  using (bucket_id = 'postime-videos' and (storage.foldername(name))[1] = auth.uid()::text);
