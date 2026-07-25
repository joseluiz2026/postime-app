-- Super-admin backend: login rate limiting, admin sessions, audit log,
-- editable message templates, editable free-tier AI model config, and the
-- Hero-section video CMS. Everything here is service-role only (RLS enabled,
-- no policies) except the new public storage bucket for Hero videos, which is
-- public content by design.

create table if not exists public.admin_login_attempts (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  success boolean not null,
  created_at timestamptz not null default now()
);

alter table public.admin_login_attempts enable row level security;
create index if not exists admin_login_attempts_ip_created_idx
  on public.admin_login_attempts (ip, created_at desc);

create table if not exists public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ip text
);

alter table public.admin_sessions enable row level security;

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  target_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb,
  ip text,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;
create index if not exists admin_audit_log_created_idx
  on public.admin_audit_log (created_at desc);

-- message_templates: editable content for the 3 automated triggers (welcome,
-- limit_reached, trial_ending) so the admin can change wording without a
-- redeploy. Seeded with the current copy tone used elsewhere in the app.
create table if not exists public.message_templates (
  key text primary key,
  subject text not null,
  body text not null,
  updated_at timestamptz not null default now()
);

alter table public.message_templates enable row level security;

insert into public.message_templates (key, subject, body) values
  ('welcome', 'Bem-vindo ao POSTime!',
   'Sua conta foi criada. Você já pode gerar seus primeiros roteiros e vídeos — é só continuar de onde parou.'),
  ('limit_reached', 'Você atingiu o limite de hoje no POSTime',
   'Você usou todas as gerações disponíveis por hoje. O limite renova amanhã, ou você pode assinar o Pro para gerar sem limite.'),
  ('trial_ending', 'Seu teste grátis no POSTime está acabando',
   'Seu período de teste termina em breve. Assine o Pro para continuar gerando conteúdo sem interrupção.')
on conflict (key) do nothing;

-- ai_config: overrides for the free-tier pool-key models only (Groq primary,
-- Gemini fallback). BYOK generations are unaffected — see lib/ai/generate-roteiros.ts.
create table if not exists public.ai_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.ai_config enable row level security;

insert into public.ai_config (key, value) values
  ('free_primary_model', 'openai/gpt-oss-120b'),
  ('free_fallback_model', 'gemini-3.5-flash')
on conflict (key) do nothing;

-- hero_videos: up to 7 videos shown as tabs behind the marketing site's Hero
-- section. Empty table = today's static image (see components/site/Hero.tsx).
create table if not exists public.hero_videos (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  storage_path text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.hero_videos enable row level security;

create policy "hero_videos: anyone can read"
  on public.hero_videos for select
  using (true);

-- profiles: dedup guards so automated messages fire at most once per event.
alter table public.profiles
  add column if not exists last_limit_email_at timestamptz,
  add column if not exists trial_ending_sent boolean not null default false;

-- Storage: public bucket for Hero videos (marketing content, unlike the
-- private per-user buckets used elsewhere). Reads are public; writes are
-- service-role only (admin API routes), so no insert/update/delete policy.
insert into storage.buckets (id, name, public)
values ('postime-hero-videos', 'postime-hero-videos', true)
on conflict (id) do nothing;

create policy "postime-hero-videos: anyone can read"
  on storage.objects for select
  using (bucket_id = 'postime-hero-videos');
