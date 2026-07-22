-- kiwify_unmatched_events: a Kiwify webhook fired but its email didn't match any
-- POSTime account (typo, or paid with a different email than the account). Kept so
-- the paying customer can self-service reconcile later (see
-- app/api/account/link-payment) instead of the payment being silently lost.
-- Service-role only — no RLS policies, so no anon/authenticated access.
create table if not exists public.kiwify_unmatched_events (
  id uuid primary key default gen_random_uuid(),
  email text,
  status text check (status in ('active', 'canceled', 'late')),
  kiwify_order_id text,
  raw_payload jsonb not null,
  resolved_at timestamptz,
  resolved_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.kiwify_unmatched_events enable row level security;
