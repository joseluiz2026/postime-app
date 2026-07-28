import { NextResponse } from "next/server";
import { decryptApiKey } from "@/lib/crypto";
import { createClient } from "@/lib/supabase/server";
import { generateSupportReply, type SupportChatMessage } from "@/lib/ai/support-chat";
import type { LlmProvider } from "@/lib/ai/generate-roteiros";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 4000;

// TEMP (2026-07-28): liberado pro Free testar o suporte por IA. Voltar pra `false`
// (ou apagar essa flag, junto com a do AccountModal) quando o teste acabar.
const TEMP_SUPPORT_CHAT_OPEN_TO_ALL = true;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Support chat is Pro-only regardless of trial/free phase — it runs on the
  // user's own key, but access to the feature itself is gated on subscription.
  const { data: subRow } = await supabase.from("subscriptions").select("status").eq("user_id", user.id).maybeSingle();
  if (subRow?.status !== "active" && !TEMP_SUPPORT_CHAT_OPEN_TO_ALL) {
    return NextResponse.json({ error: "pro_required" }, { status: 402 });
  }

  const { data: keyRow } = await supabase
    .from("user_api_keys")
    .select("provider, encrypted_key, iv, auth_tag")
    .eq("user_id", user.id)
    .eq("category", "texto")
    .maybeSingle();

  if (!keyRow) {
    return NextResponse.json({ error: "no_key" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const rawMessages = Array.isArray(body?.messages) ? body.messages : [];
  const messages: SupportChatMessage[] = rawMessages
    .filter((m: unknown): m is SupportChatMessage => {
      const msg = m as SupportChatMessage;
      return (msg?.role === "user" || msg?.role === "assistant") && typeof msg?.content === "string" && msg.content.trim().length > 0;
    })
    .slice(-MAX_MESSAGES)
    .map((m: SupportChatMessage) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_LENGTH) }));

  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    const apiKey = decryptApiKey(keyRow.encrypted_key, keyRow.iv, keyRow.auth_tag);
    const reply = await generateSupportReply({
      provider: keyRow.provider as LlmProvider,
      apiKey,
      messages,
    });
    return NextResponse.json({ reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    console.error("[/api/support/chat] failed:", message);
    if (/api key|unauthorized|401|invalid/i.test(message)) {
      return NextResponse.json({ error: "invalid_key" }, { status: 401 });
    }
    return NextResponse.json({ error: "generation_failed" }, { status: 502 });
  }
}
