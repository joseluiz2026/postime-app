-- Storage: private bucket for user-uploaded video clips (5/10/15/30s presets — see
-- app/app/estilo, duration validated client-side same as the watermark PNG checks).
-- Unlike postime-images (own photos), these need a real DB row per file — not just
-- listed off the bucket — because they auto-expire after 30 minutes of inactivity
-- and that needs a queryable timestamp to enforce (see own_video_clips.last_active_at
-- below). Cleanup is lazy: GET /api/account/video-clips deletes anything past its
-- expiry before returning the list, rather than needing a cron.
insert into storage.buckets (id, name, public)
values ('postime-video-clips', 'postime-video-clips', false)
on conflict (id) do nothing;

create policy "postime-video-clips: user can select own files"
  on storage.objects for select
  using (bucket_id = 'postime-video-clips' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "postime-video-clips: user can insert own files"
  on storage.objects for insert
  with check (bucket_id = 'postime-video-clips' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "postime-video-clips: user can update own files"
  on storage.objects for update
  using (bucket_id = 'postime-video-clips' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "postime-video-clips: user can delete own files"
  on storage.objects for delete
  using (bucket_id = 'postime-video-clips' and (storage.foldername(name))[1] = auth.uid()::text);

create table if not exists public.own_video_clips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  original_name text not null,
  duration_seconds numeric not null,
  created_at timestamptz not null default now(),
  -- Bumped by any activity that should keep the clip alive (upload, assigning it to
  -- a scene, an explicit "renovar" click) — the 30-minute expiry counts from this,
  -- not from created_at, matching an inactivity timeout rather than a hard TTL.
  last_active_at timestamptz not null default now()
);

alter table public.own_video_clips enable row level security;

create policy "own_video_clips: user can select own rows"
  on public.own_video_clips for select
  using (auth.uid() = user_id);

create policy "own_video_clips: user can insert own rows"
  on public.own_video_clips for insert
  with check (auth.uid() = user_id);

create policy "own_video_clips: user can update own rows"
  on public.own_video_clips for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own_video_clips: user can delete own rows"
  on public.own_video_clips for delete
  using (auth.uid() = user_id);
