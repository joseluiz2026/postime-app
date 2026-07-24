import { NextResponse } from "next/server";
import { decryptApiKey } from "@/lib/crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateRoteiros, type LlmProvider } from "@/lib/ai/generate-roteiros";
import { allowedDurationsFor, getAccessPhase, type Duration } from "@/lib/plan";

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

  // Pool key (trial/free phase): everyone shares POSTime's own Groq key, which
  // free-tier rate limits (see console.groq.com/docs/rate-limits) can exhaust under
  // concurrent signups. Fall back to the Gemini key already provisioned from before
  // the Groq switch, rather than surfacing a rate-limit error to the user.
  const groqKey = process.env.GROQ_API_KEY;
  const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (groqKey) {
    try {
      const roteiros = await generateRoteiros({ provider: "groq", apiKey: groqKey, ...genArgs });
      return NextResponse.json({ roteiros, mode: accessPhase });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      console.error("[/api/roteiros/generate] Groq pool key failed, falling back to Gemini:", message);
      await logFallbackEvent("groq", googleKey ? "google" : null, message);
    }
  }

  if (googleKey) {
    try {
      const roteiros = await generateRoteiros({ provider: "google", apiKey: googleKey, ...genArgs });
      return NextResponse.json({ roteiros, mode: accessPhase });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      console.error("[/api/roteiros/generate] Gemini fallback also failed:", message);
      await logFallbackEvent("google", null, message);
    }
  }

  if (!groqKey && !googleKey) {
    return NextResponse.json({ error: "server_not_configured" }, { status: 500 });
  }
  return NextResponse.json({ error: "generation_failed" }, { status: 502 });
}
