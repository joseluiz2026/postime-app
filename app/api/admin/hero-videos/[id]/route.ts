import { NextResponse } from "next/server";
import { getAdminSession, getClientIp, logAdminAction } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const BUCKET = "postime-hero-videos";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const isAdmin = await getAdminSession();
  if (!isAdmin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const supabase = createAdminClient();

  if (typeof body?.label === "string" && body.label.trim()) {
    const { error } = await supabase.from("hero_videos").update({ label: body.label.trim() }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logAdminAction("hero_video_update", { metadata: { id, label: body.label.trim() }, ip: getClientIp(request) });
    return NextResponse.json({ ok: true });
  }

  if (body?.direction === "up" || body?.direction === "down") {
    const { data: rows } = await supabase.from("hero_videos").select("id, position").order("position");
    if (!rows) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const idx = rows.findIndex((r) => r.id === id);
    const swapWith = body.direction === "up" ? idx - 1 : idx + 1;
    if (idx === -1 || swapWith < 0 || swapWith >= rows.length) {
      return NextResponse.json({ error: "cannot_move" }, { status: 400 });
    }

    const a = rows[idx];
    const b = rows[swapWith];
    await supabase.from("hero_videos").update({ position: b.position }).eq("id", a.id);
    await supabase.from("hero_videos").update({ position: a.position }).eq("id", b.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "invalid_input" }, { status: 400 });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const isAdmin = await getAdminSession();
  if (!isAdmin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: row } = await supabase.from("hero_videos").select("storage_path").eq("id", id).maybeSingle();
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await supabase.storage.from(BUCKET).remove([row.storage_path]);
  const { error } = await supabase.from("hero_videos").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction("hero_video_delete", { metadata: { id }, ip: getClientIp(request) });
  return NextResponse.json({ ok: true });
}
