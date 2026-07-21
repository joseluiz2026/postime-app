import { NextResponse } from "next/server";
import { encryptApiKey } from "@/lib/crypto";
import { createClient } from "@/lib/supabase/server";
import { generateRoteiros, type LlmProvider } from "@/lib/ai/generate-roteiros";

export const runtime = "nodejs";
export const maxDuration = 60;

const VALID_PROVIDERS: LlmProvider[] = ["google", "openai", "anthropic"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const provider = body?.provider as LlmProvider;
  const apiKey = String(body?.apiKey ?? "").trim();

  if (!VALID_PROVIDERS.includes(provider) || !apiKey) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  try {
    await generateRoteiros({
      provider,
      apiKey,
      qty: 1,
      duration: "15s",
      sourceHint: "teste de conexão",
      sourceIsRealContent: false,
    });
  } catch (err) {
    console.error("[/api/account/api-key]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "invalid_key" }, { status: 400 });
  }

  const { encrypted, iv, authTag } = encryptApiKey(apiKey);
  const { error } = await supabase.from("user_api_keys").upsert({
    user_id: user.id,
    provider,
    encrypted_key: encrypted,
    iv,
    auth_tag: authTag,
  });

  if (error) return NextResponse.json({ error: "save_failed" }, { status: 500 });

  return NextResponse.json({ provider });
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await supabase.from("user_api_keys").delete().eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "delete_failed" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
