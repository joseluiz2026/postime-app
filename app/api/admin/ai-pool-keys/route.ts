import { NextResponse } from "next/server";
import { getAdminSession, getClientIp, logAdminAction } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptApiKey } from "@/lib/crypto";

export const runtime = "nodejs";

const SLOTS = ["groq_1", "groq_2", "google_1", "google_2"] as const;
type Slot = (typeof SLOTS)[number];

// The env var each slot falls back to when there's no override saved here —
// see app/api/roteiros/generate, which reads a DB override first and only
// uses these when the slot has none.
const ENV_FALLBACK: Record<Slot, string> = {
  groq_1: "GROQ_API_KEY",
  groq_2: "GROQ_API_KEY_2",
  google_1: "GOOGLE_GENERATIVE_AI_API_KEY",
  google_2: "GOOGLE_GENERATIVE_AI_API_KEY_2",
};

export async function GET() {
  const isAdmin = await getAdminSession();
  if (!isAdmin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase.from("ai_pool_keys").select("slot, encrypted_key, updated_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const bySlot = new Map(data.map((row) => [row.slot, row]));
  const slots = SLOTS.map((slot) => {
    const row = bySlot.get(slot);
    // Last 4 chars of the base64 ciphertext isn't the real key's last 4 chars,
    // but it's still a stable fingerprint — enough to eyeball "yep, still the
    // key I pasted last time" without ever decrypting for display.
    return {
      slot,
      hasOverride: !!row,
      fingerprint: row ? row.encrypted_key.slice(-6) : null,
      updatedAt: row?.updated_at ?? null,
      hasEnvFallback: !!process.env[ENV_FALLBACK[slot]],
    };
  });

  return NextResponse.json({ slots });
}

export async function PUT(request: Request) {
  const isAdmin = await getAdminSession();
  if (!isAdmin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const slot = String(body?.slot ?? "");
  const value = String(body?.value ?? "").trim();

  if (!SLOTS.includes(slot as Slot) || !value) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const { encrypted, iv, authTag } = encryptApiKey(value);
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("ai_pool_keys")
    .upsert({ slot, encrypted_key: encrypted, iv, auth_tag: authTag, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction("update_ai_pool_key", { metadata: { slot }, ip: getClientIp(request) });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const isAdmin = await getAdminSession();
  if (!isAdmin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const slot = String(body?.slot ?? "");
  if (!SLOTS.includes(slot as Slot)) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const supabase = createAdminClient();
  const { error } = await supabase.from("ai_pool_keys").delete().eq("slot", slot);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction("clear_ai_pool_key", { metadata: { slot }, ip: getClientIp(request) });
  return NextResponse.json({ ok: true });
}
