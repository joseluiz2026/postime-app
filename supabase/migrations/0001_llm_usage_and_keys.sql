-- profiles: one row per user, tracks lifetime free-generation usage
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  lifetime_generations integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: user can select own row"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "profiles: user can insert own row"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "profiles: user can update own row"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- no delete policy: users cannot reset their own usage counter by deleting the row

-- user_api_keys: one active BYOK key per user (single provider at a time)
create table if not exists public.user_api_keys (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google', 'openai', 'anthropic')),
  encrypted_key text not null,
  iv text not null,
  auth_tag text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_api_keys enable row level security;

create policy "user_api_keys: user can select own row"
  on public.user_api_keys for select
  using (auth.uid() = user_id);

create policy "user_api_keys: user can insert own row"
  on public.user_api_keys for insert
  with check (auth.uid() = user_id);

create policy "user_api_keys: user can update own row"
  on public.user_api_keys for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_api_keys: user can delete own row"
  on public.user_api_keys for delete
  using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists user_api_keys_set_updated_at on public.user_api_keys;
create trigger user_api_keys_set_updated_at
  before update on public.user_api_keys
  for each row execute function public.set_updated_at();
