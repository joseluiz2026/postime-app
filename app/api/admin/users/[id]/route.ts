import { NextResponse } from "next/server";
import { getAdminSession, getClientIp, logAdminAction } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SUSPEND_DURATION } from "@/lib/admin/users";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const isAdmin = await getAdminSession();
  if (!isAdmin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const action = body?.action as "suspend" | "unsuspend" | "reset_password" | undefined;
  const ip = getClientIp(request);
  const supabase = createAdminClient();

  if (action === "suspend" || action === "unsuspend") {
    const { error } = await supabase.auth.admin.updateUserById(id, {
      ban_duration: action === "suspend" ? SUSPEND_DURATION : "none",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logAdminAction(action === "suspend" ? "suspend_user" : "unsuspend_user", { targetUserId: id, ip });
    return NextResponse.json({ ok: true });
  }

  if (action === "reset_password") {
    const password = String(body?.password ?? "");
    if (password.length < 8) {
      return NextResponse.json({ error: "password_too_short" }, { status: 400 });
    }
    const { error } = await supabase.auth.admin.updateUserById(id, { password });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logAdminAction("reset_password", { targetUserId: id, ip });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "invalid_action" }, { status: 400 });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const isAdmin = await getAdminSession();
  if (!isAdmin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const ip = getClientIp(request);
  const supabase = createAdminClient();

  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction("delete_user", { targetUserId: id, ip });
  return NextResponse.json({ ok: true });
}
