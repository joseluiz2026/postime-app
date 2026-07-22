-- user_api_keys: was one key per user, ever (user_id as sole primary key).
-- Central de Provedores de IA needs one active key per provider *category*
-- (texto/imagem/video/voz), so a user can hold a text key and, later, an
-- image/video/voice key at the same time without overwriting each other.
alter table public.user_api_keys add column if not exists category text not null default 'texto';

alter table public.user_api_keys drop constraint if exists user_api_keys_pkey;
alter table public.user_api_keys add primary key (user_id, category);

-- The provider whitelist here already went stale once (Groq was added in code
-- without updating this constraint, so saving a Groq BYOK key silently failed
-- at the DB layer). Provider/category validity is enforced at the app layer
-- against the single provider registry (lib/ai/providers.ts) instead, so
-- adding a new provider never requires a migration.
alter table public.user_api_keys drop constraint if exists user_api_keys_provider_check;
