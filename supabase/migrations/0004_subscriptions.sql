-- subscriptions: one row per user, written only by the Kiwify webhook (service role).
-- Status is the sole source of truth for "does this account bypass the trial/free
-- phase limits" — see lib/plan.ts and app/api/webhooks/kiwify/route.ts.
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null check (status in ('active', 'canceled', 'late')),
  kiwify_order_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "subscriptions: user can select own row"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- No insert/update/delete policy for regular users — only the webhook (service role,
-- which bypasses RLS) writes here.

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();
