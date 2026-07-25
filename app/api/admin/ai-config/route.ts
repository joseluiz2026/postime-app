import { NextResponse } from "next/server";
import { getAdminSession, getClientIp, logAdminAction } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  const isAdmin = await getAdminSession();
  if (!isAdmin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase.from("ai_config").select("key, value, updated_at").order("key");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ config: data });
}

export async function PUT(request: Request) {
  const isAdmin = await getAdminSession();
  if (!isAdmin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const key = String(body?.key ?? "");
  const value = String(body?.value ?? "").trim();

  if (!["free_primary_model", "free_fallback_model"].includes(key) || !value) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("ai_config")
    .update({ value, updated_at: new Date().toISOString() })
    .eq("key", key);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction("update_ai_config", { metadata: { key, value }, ip: getClientIp(request) });
  return NextResponse.json({ ok: true });
}
