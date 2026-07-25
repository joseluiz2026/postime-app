import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAdminSession, getClientIp, logAdminAction } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

const BUCKET = "postime-hero-videos";
const MAX_VIDEOS = 7;

export async function GET() {
  const isAdmin = await getAdminSession();
  if (!isAdmin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase.from("hero_videos").select("id, label, storage_path, position").order("position");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const videos = (data ?? []).map((v) => ({
    ...v,
    url: supabase.storage.from(BUCKET).getPublicUrl(v.storage_path).data.publicUrl,
  }));
  return NextResponse.json({ videos });
}

export async function POST(request: Request) {
  const isAdmin = await getAdminSession();
  if (!isAdmin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { count } = await supabase.from("hero_videos").select("id", { count: "exact", head: true });
  if ((count ?? 0) >= MAX_VIDEOS) {
    return NextResponse.json({ error: "max_videos_reached" }, { status: 400 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const label = String(form?.get("label") ?? "").trim() || "Vídeo";
  if (!(file instanceof File) || !file.type.startsWith("video/")) {
    return NextResponse.json({ error: "invalid_file" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() || "mp4";
  const path = `hero/${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType: file.type });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: inserted, error: insertError } = await supabase
    .from("hero_videos")
    .insert({ label, storage_path: path, position: count ?? 0 })
    .select("id")
    .single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  await logAdminAction("hero_video_add", { metadata: { label, id: inserted.id }, ip: getClientIp(request) });
  return NextResponse.json({ ok: true, id: inserted.id });
}
