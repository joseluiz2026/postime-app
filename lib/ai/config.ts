import { createAdminClient } from "@/lib/supabase/admin";

export const DEFAULT_FREE_PRIMARY_MODEL = "openai/gpt-oss-120b";
export const DEFAULT_FREE_FALLBACK_MODEL = "gemini-3.5-flash";

const CACHE_TTL_MS = 60_000;
let cache: { values: Record<string, string>; expiresAt: number } | null = null;

/**
 * Admin-configurable overrides for the free-tier pool-key models (see
 * app/admin/ia). Only the pool-key call sites in app/api/roteiros/generate read
 * this — BYOK generations always use their fixed per-provider defaults. Cached
 * briefly since this is read on every free-tier generation.
 */
export async function getFreeTierModels(): Promise<{ primary: string; fallback: string }> {
  if (cache && cache.expiresAt > Date.now()) {
    return {
      primary: cache.values.free_primary_model ?? DEFAULT_FREE_PRIMARY_MODEL,
      fallback: cache.values.free_fallback_model ?? DEFAULT_FREE_FALLBACK_MODEL,
    };
  }

  const supabase = createAdminClient();
  const { data } = await supabase.from("ai_config").select("key, value");
  const values = Object.fromEntries((data ?? []).map((row) => [row.key, row.value]));
  cache = { values, expiresAt: Date.now() + CACHE_TTL_MS };

  return {
    primary: values.free_primary_model ?? DEFAULT_FREE_PRIMARY_MODEL,
    fallback: values.free_fallback_model ?? DEFAULT_FREE_FALLBACK_MODEL,
  };
}
