import { NextResponse } from "next/server";
import { decryptApiKey } from "@/lib/crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateRoteiros, type LlmProvider } from "@/lib/ai/generate-roteiros";
import { allowedDurationsFor, getAccessPhase, type Duration } from "@/lib/plan";
import { getFreeTierModels } from "@/lib/ai/config";

// Best-effort diagnostic counter — never lets a logging hiccup affect the actual
// fallback flow. Vercel's own log retention is too short to answer "how often does
// this actually fire", so this persists it instead (see project memory).
async function logFallbackEvent(fromProvider: string, toProvider: string | null, reason: string) {
  try {
    await createAdminClient()
      .from("fallback_events")
      .insert({ from_provider: fromProvider, to_provider: toProvider, reason: reason.slice(0, 500) });
  } catch {
    // diagnostic only
  }
}

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const accessPhase = getAccessPhase(new Date(user.created_at));
  // Applies to BYOK too — bringing your own key does not bypass the phase or an
  // expired subscription (deliberate: see project memory on the trial redesign).
  const { data: subRow } = await supabase.from("subscriptions").select("status").eq("user_id", user.id).maybeSingle();
  const hasActiveSubscription = subRow?.status === "active";

  if (accessPhase === "locked" && !hasActiveSubscription) {
    return NextResponse.json({ error: "access_locked" }, { status: 402 });
  }

  const body = await request.json().catch(() => null);
  const qty = Math.max(1, Math.min(20, Number(body?.qty) || 1));
  const requestedDuration = (["15s", "30s"] as const).includes(body?.duration)
    ? (body.duration as Duration)
    : "15s";
  const sourceType = String(body?.sourceType ?? "");
  const sourceText = String(body?.sourceText ?? "").trim();
  const sourceIsRealContent = sourceType === "texto" && sourceText.length > 0;

  if (!allowedDurationsFor(accessPhase, hasActiveSubscription).includes(requestedDuration)) {
    return NextResponse.json({ error: "duration_not_allowed" }, { status: 403 });
  }

  const { data: keyRow } = await supabase
    .from("user_api_keys")
    .select("provider, encrypted_key, iv, auth_tag")
    .eq("user_id", user.id)
    .eq("category", "texto")
    .maybeSingle();

  const genArgs = { qty, duration: requestedDuration, sourceHint: sourceText, sourceIsRealContent };

  if (keyRow) {
    // BYOK: never fall back to POSTime's own pool key — a failure here is the
    // user's own key/provider and should surface as such, not get masked.
    try {
      const apiKey = decryptApiKey(keyRow.encrypted_key, keyRow.iv, keyRow.auth_tag);
      const roteiros = await generateRoteiros({
        provider: keyRow.provider as LlmProvider,
        apiKey,
        ...genArgs,
      });
      return NextResponse.json({ roteiros, mode: "byok" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      console.error("[/api/roteiros/generate] BYOK failed:", message);
      if (/api key|unauthorized|401|invalid/i.test(message)) {
        return NextResponse.json({ error: "invalid_key" }, { status: 401 });
      }
      return NextResponse.json({ error: "generation_failed" }, { status: 502 });
    }
  }

  // Pool key (trial/free phase): everyone shares POSTime's own keys, and free-tier
  // rate limits (see console.groq.com/docs/rate-limits) can exhaust a single key
  // under concurrent signups. Two independent keys per provider (separate accounts,
  // not just re-requesting — a rate limit is per-account) plus a second provider
  // means one exhausted/expired/down key doesn't take generation down entirely.
  // Tried in order; each hop is logged so fallback_events shows how often — and how
  // deep into the chain — this actually fires.
  const freeModels = await getFreeTierModels();
  const attempts: { provider: LlmProvider; apiKey: string; model: string; label: string }[] = [];
  if (process.env.GROQ_API_KEY) {
    attempts.push({ provider: "groq", apiKey: process.env.GROQ_API_KEY, model: freeModels.primary, label: "groq-1" });
  }
  if (process.env.GROQ_API_KEY_2) {
    attempts.push({ provider: "groq", apiKey: process.env.GROQ_API_KEY_2, model: freeModels.primary, label: "groq-2" });
  }
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    attempts.push({
      provider: "google",
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      model: freeModels.fallback,
      label: "google-1",
    });
  }
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY_2) {
    attempts.push({
      provider: "google",
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY_2,
      model: freeModels.fallback,
      label: "google-2",
    });
  }

  if (attempts.length === 0) {
    return NextResponse.json({ error: "server_not_configured" }, { status: 500 });
  }

  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    try {
      const roteiros = await generateRoteiros({
        provider: attempt.provider,
        apiKey: attempt.apiKey,
        modelOverride: attempt.model,
        ...genArgs,
      });
      return NextResponse.json({ roteiros, mode: accessPhase });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      const nextLabel = attempts[i + 1]?.label ?? null;
      console.error(
        `[/api/roteiros/generate] ${attempt.label} failed${nextLabel ? `, falling back to ${nextLabel}` : " — no keys left"}:`,
        message,
      );
      await logFallbackEvent(attempt.label, nextLabel, message);
    }
  }

  return NextResponse.json({ error: "generation_failed" }, { status: 502 });
}
