-- jobs already tracks every render (video_url, expires_at, status) with RLS letting
-- the owner read their own rows — but nothing in the app ever queried it, so a page
-- refresh lost every finished video from view even though the file was still sitting
-- in storage (no cleanup job has ever actually run to delete it — see
-- app/api/jobs/render's GET handler, which re-signs a fresh URL from the same path
-- instead of assuming the original TTL is still valid). These 3 columns are just
-- enough to render a video history card without a second lookup: cover thumbnail,
-- a human title, the render's duration, and which tema it came from (so
-- regravar/excluir still work on a video loaded from history).
alter table public.jobs
  add column if not exists title text,
  add column if not exists image_url text,
  add column if not exists duration_seconds numeric,
  add column if not exists tema_index integer;
