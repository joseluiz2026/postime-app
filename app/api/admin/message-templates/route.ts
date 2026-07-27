import { NextResponse } from "next/server";
import { getAdminSession, getClientIp, logAdminAction } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { MESSAGE_TEMPLATE_KEYS } from "@/lib/admin/message-templates";

export const runtime = "nodejs";

export async function GET() {
  const isAdmin = await getAdminSession();
  if (!isAdmin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase.from("message_templates").select("key, subject, body, updated_at").order("key");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ templates: data });
}

export async function PUT(request: Request) {
  const isAdmin = await getAdminSession();
  if (!isAdmin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const key = String(body?.key ?? "");
  const subject = String(body?.subject ?? "").trim();
  const messageBody = String(body?.body ?? "").trim();

  if (!(MESSAGE_TEMPLATE_KEYS as readonly string[]).includes(key) || !subject || !messageBody) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("message_templates")
    .update({ subject, body: messageBody, updated_at: new Date().toISOString() })
    .eq("key", key);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction("update_message_template", { metadata: { key }, ip: getClientIp(request) });
  return NextResponse.json({ ok: true });
}
