import { NextResponse } from "next/server";
import { decryptApiKey } from "@/lib/crypto";
import { createClient } from "@/lib/supabase/server";
import { generateRoteiros, type LlmProvider } from "@/lib/ai/generate-roteiros";
import { TRIAL_DAYS } from "@/lib/plan";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const trialEndsAt = new Date(user.created_at);
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);
  const trialActive = Date.now() < trialEndsAt.getTime();
  // TODO(Kiwify): swap this for a real subscription lookup once the webhook is wired up.
  // Until then, nobody has an active paid subscription, by design — the 7-day trial
  // is the only access path (see lib/plan.ts).
  const hasActiveSubscription = false;

  if (!trialActive && !hasActiveSubscription) {
    return NextResponse.json(
      { error: "trial_expired", trialEndedAt: trialEndsAt.toISOString() },
      { status: 402 },
    );
  }

  const body = await request.json().catch(() => null);
  const qty = Math.max(1, Math.min(20, Number(body?.qty) || 1));
  const duration = (["15s", "30s", "60s"] as const).includes(body?.duration) ? body.duration : "15s";
  const sourceType = String(body?.sourceType ?? "");
  const sourceText = String(body?.sourceText ?? "").trim();
  const sourceIsRealContent = sourceType === "texto" && sourceText.length > 0;

  const { data: keyRow } = await supabase
    .from("user_api_keys")
    .select("provider, encrypted_key, iv, auth_tag")
    .eq("user_id", user.id)
    .eq("category", "texto")
    .maybeSingle();

  try {
    const provider = (keyRow?.provider as LlmProvider | undefined) ?? "groq";
    const apiKey = keyRow
      ? decryptApiKey(keyRow.encrypted_key, keyRow.iv, keyRow.auth_tag)
      : process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "server_not_configured" }, { status: 500 });
    }

    const roteiros = await generateRoteiros({
      provider,
      apiKey,
      qty,
      duration,
      sourceHint: sourceText,
      sourceIsRealContent,
    });

    return NextResponse.json({ roteiros, mode: keyRow ? "byok" : "trial" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    console.error("[/api/roteiros/generate]", message);
    if (/api key|unauthorized|401|invalid/i.test(message)) {
      return NextResponse.json({ error: "invalid_key" }, { status: 401 });
    }
    return NextResponse.json({ error: "generation_failed" }, { status: 502 });
  }
}
