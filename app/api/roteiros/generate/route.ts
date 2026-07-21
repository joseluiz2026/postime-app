import { NextResponse } from "next/server";
import { decryptApiKey } from "@/lib/crypto";
import { createClient } from "@/lib/supabase/server";
import { generateRoteiros, type LlmProvider } from "@/lib/ai/generate-roteiros";

export const runtime = "nodejs";
export const maxDuration = 60;

const FREE_LIFETIME_LIMIT = 18;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

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
    .maybeSingle();

  try {
    if (keyRow) {
      const apiKey = decryptApiKey(keyRow.encrypted_key, keyRow.iv, keyRow.auth_tag);
      const roteiros = await generateRoteiros({
        provider: keyRow.provider as LlmProvider,
        apiKey,
        qty,
        duration,
        sourceHint: sourceText,
        sourceIsRealContent,
      });
      return NextResponse.json({ roteiros, mode: "byok", remaining: null });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("lifetime_generations")
      .eq("user_id", user.id)
      .maybeSingle();
    const used = profile?.lifetime_generations ?? 0;

    if (used + qty > FREE_LIFETIME_LIMIT) {
      return NextResponse.json(
        { error: "limit_reached", remaining: Math.max(0, FREE_LIFETIME_LIMIT - used) },
        { status: 409 },
      );
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "server_not_configured" }, { status: 500 });
    }

    const roteiros = await generateRoteiros({
      provider: "groq",
      apiKey,
      qty,
      duration,
      sourceHint: sourceText,
      sourceIsRealContent,
    });

    const nextUsed = used + qty;
    await supabase.from("profiles").upsert({ user_id: user.id, lifetime_generations: nextUsed });

    return NextResponse.json({ roteiros, mode: "free", remaining: FREE_LIFETIME_LIMIT - nextUsed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    console.error("[/api/roteiros/generate]", message);
    if (/api key|unauthorized|401|invalid/i.test(message)) {
      return NextResponse.json({ error: "invalid_key" }, { status: 401 });
    }
    return NextResponse.json({ error: "generation_failed" }, { status: 502 });
  }
}
