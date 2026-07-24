-- fallback_events: diagnostic counter for when POSTime's shared pool key for
-- roteiro generation (Groq) fails and the app silently falls back to the
-- Gemini pool key instead of surfacing an error to the user (see
-- app/api/roteiros/generate). Lets us check later whether/how often the
-- fallback actually fires, without relying on Vercel's short log retention.
-- Service-role only — no RLS policies, so no anon/authenticated access.
create table if not exists public.fallback_events (
  id uuid primary key default gen_random_uuid(),
  from_provider text not null,
  to_provider text,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.fallback_events enable row level security;
