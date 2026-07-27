-- kiwify_webhook_log: raw payload of every Kiwify webhook call received (approved,
-- late, canceled, matched or not) — not just the unmatched-email case that
-- kiwify_unmatched_events already covers. Kiwify's exact delivered payload shape was
-- never confirmed against real docs/traffic (see app/api/webhooks/kiwify), so this is
-- the safety net: the first real event, whatever it turns out to look like, is fully
-- inspectable here instead of only visible in short-lived function logs.
-- Service-role only — no RLS policies, so no anon/authenticated access.
create table if not exists public.kiwify_webhook_log (
  id uuid primary key default gen_random_uuid(),
  raw_payload jsonb not null,
  parsed_email text,
  parsed_event text,
  matched boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.kiwify_webhook_log enable row level security;
