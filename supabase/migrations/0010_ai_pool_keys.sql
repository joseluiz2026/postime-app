-- ai_pool_keys: encrypted overrides for POSTime's own free-tier pool keys
-- (groq_1/groq_2/google_1/google_2 — see app/api/roteiros/generate), editable
-- from the Superadmin panel so a key can be rotated without a redeploy. Falls
-- back to the GROQ_API_KEY / GROQ_API_KEY_2 / GOOGLE_GENERATIVE_AI_API_KEY /
-- GOOGLE_GENERATIVE_AI_API_KEY_2 env vars when a slot has no row here.
-- Service-role only, same as ai_config/fallback_events — no RLS policies, so
-- no anon/authenticated access at all.
create table if not exists public.ai_pool_keys (
  slot text primary key check (slot in ('groq_1', 'groq_2', 'google_1', 'google_2')),
  encrypted_key text not null,
  iv text not null,
  auth_tag text not null,
  updated_at timestamptz not null default now()
);

alter table public.ai_pool_keys enable row level security;
