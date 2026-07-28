import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ALLOWED_DURATIONS = [5, 10, 15, 30];
const DURATION_TOLERANCE = 0.75;
const EXPIRY_MINUTES = 30;
const MAX_FILE_BYTES = 30 * 1024 * 1024;

function isAllowedDuration(seconds: number): boolean {
  return ALLOWED_DURATIONS.some((d) => Math.abs(d - seconds) <= DURATION_TOLERANCE);
}

/** Deletes any of this user's clips whose 30-minute inactivity window has already
 * passed — called at the top of every GET so the list is always self-cleaning,
 * without needing a cron (see migration 0015). */
async function cleanupExpired(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const cutoff = new Date(Date.now() - EXPIRY_MINUTES * 60_000).toISOString();
  const { data: expired } = await supabase
    .from("own_video_clips")
    .select("id, storage_path")
    .eq("user_id", userId)
    .lt("last_active_at", cutoff);
  if (!expired || expired.length === 0) return;

  await supabase.storage.from("postime-video-clips").remove(expired.map((c) => c.storage_path));
  await supabase
    .from("own_video_clips")
    .delete()
    .in(
      "id",
      expired.map((c) => c.id),
    );
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await cleanupExpired(supabase, user.id);

  const { data, error } = await supabase
    .from("own_video_clips")
    .select("id, storage_path, original_name, duration_seconds, last_active_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "load_failed" }, { status: 500 });

  const clips = await Promise.all(
    (data ?? []).map(async (clip) => {
      const { data: signed } = await supabase.storage
        .from("postime-video-clips")
        .createSignedUrl(clip.storage_path, 60 * 60);
      return {
        id: clip.id,
        name: clip.original_name,
        url: signed?.signedUrl,
        path: clip.storage_path,
        durationSeconds: clip.duration_seconds,
        expiresAt: new Date(new Date(clip.last_active_at).getTime() + EXPIRY_MINUTES * 60_000).toISOString(),
      };
    }),
  );

  return NextResponse.json({ clips, expiryMinutes: EXPIRY_MINUTES });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await cleanupExpired(supabase, user.id);

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const durationSeconds = Number(form?.get("durationSeconds"));
  if (!(file instanceof File) || file.size === 0 || !Number.isFinite(durationSeconds)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  }
  if (!isAllowedDuration(durationSeconds)) {
    return NextResponse.json({ error: "invalid_duration" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() || "mp4";
  const storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("postime-video-clips")
    .upload(storagePath, file, { contentType: file.type || "video/mp4", upsert: true });
  if (upErr) return NextResponse.json({ error: "upload_failed" }, { status: 500 });

  const { data: row, error: insertErr } = await supabase
    .from("own_video_clips")
    .insert({
      user_id: user.id,
      storage_path: storagePath,
      original_name: file.name.slice(0, 200),
      duration_seconds: durationSeconds,
    })
    .select("id")
    .single();
  if (insertErr || !row) return NextResponse.json({ error: "save_failed" }, { status: 500 });

  const { data: signed } = await supabase.storage.from("postime-video-clips").createSignedUrl(storagePath, 60 * 60);
  return NextResponse.json({
    id: row.id,
    name: file.name,
    url: signed?.signedUrl,
    path: storagePath,
    durationSeconds,
    expiresAt: new Date(Date.now() + EXPIRY_MINUTES * 60_000).toISOString(),
  });
}

/** Renews the 30-minute window — either one clip (body.id) or all of the user's
 * clips at once (no body.id), for the "renovar" action on the expiry warning. */
export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : null;

  let query = supabase.from("own_video_clips").update({ last_active_at: new Date().toISOString() }).eq("user_id", user.id);
  if (id) query = query.eq("id", id);
  const { error } = await query;
  if (error) return NextResponse.json({ error: "renew_failed" }, { status: 500 });

  return NextResponse.json({ ok: true, expiresAt: new Date(Date.now() + EXPIRY_MINUTES * 60_000).toISOString() });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const { data: clip } = await supabase
    .from("own_video_clips")
    .select("storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (clip) await supabase.storage.from("postime-video-clips").remove([clip.storage_path]);

  await supabase.from("own_video_clips").delete().eq("id", id).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
