-- AI-generated TikTok posting metadata (title already existed from 0013, now
-- also populated from the roteiro's tiktokTitle instead of a generic label) —
-- caption and hashtags let the download page offer ready-to-paste copy per
-- video, and need to survive a page refresh the same way title/thumbnail do.
alter table public.jobs
  add column if not exists caption text,
  add column if not exists hashtags text[];
