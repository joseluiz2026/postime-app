import { NextResponse } from "next/server";
import { encryptApiKey } from "@/lib/crypto";
import { createClient } from "@/lib/supabase/server";
import { generateRoteiros, type LlmProvider } from "@/lib/ai/generate-roteiros";
import { PROVIDERS, type ProviderCategory } from "@/lib/ai/providers";

export const runtime = "nodejs";
export const maxDuration = 60;

// Only "texto" providers are actually wired to a real connect+validate flow today —
// see lib/ai/providers.ts for the full catalog (including roadmap-only categories).
function findImplementedProvider(category: string, providerId: string) {
  return PROVIDERS.find(
    (p) => p.category === category && p.id === providerId && p.implemented,
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const category = String(body?.category ?? "texto") as ProviderCategory;
  const provider = String(body?.provider ?? "");
  const apiKey = String(body?.apiKey ?? "").trim();

  const providerInfo = findImplementedProvider(category, provider);
  if (!providerInfo || !apiKey) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  if (category === "texto") {
    try {
      await generateRoteiros({
        provider: provider as LlmProvider,
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
  }

  const { encrypted, iv, authTag } = encryptApiKey(apiKey);
  const { error } = await supabase
    .from("user_api_keys")
    .upsert({ user_id: user.id, category, provider, encrypted_key: encrypted, iv, auth_tag: authTag }, { onConflict: "user_id,category" });

  if (error) return NextResponse.json({ error: "save_failed" }, { status: 500 });

  return NextResponse.json({ provider, modelLabel: providerInfo.modelLabel });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const category = String(body?.category ?? "texto");

  const { error } = await supabase
    .from("user_api_keys")
    .delete()
    .eq("user_id", user.id)
    .eq("category", category);
  if (error) return NextResponse.json({ error: "delete_failed" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
