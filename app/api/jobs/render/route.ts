import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { NextResponse } from "next/server";
import { renderKenBurnsVideo } from "@/lib/render/ken-burns";
import { createClient } from "@/lib/supabase/server";
import { dailyVideoLimitFor, getAccessPhase } from "@/lib/plan";

export const runtime = "nodejs";
export const maxDuration = 60;

const VIDEO_TTL_SECONDS = 60 * 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const accessPhase = getAccessPhase(new Date(user.created_at));
  // TODO(Kiwify): same subscription seam as app/api/roteiros/generate/route.ts.
  const hasActiveSubscription = false;

  if (accessPhase === "locked" && !hasActiveSubscription) {
    return NextResponse.json({ error: "access_locked" }, { status: 402 });
  }

  const dailyLimit = hasActiveSubscription ? null : dailyVideoLimitFor(accessPhase);
  if (dailyLimit !== null) {
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
    const { count, error: countErr } = await supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("status", ["processando", "pronto"])
      .gte("created_at", startOfDay);
    if (!countErr && (count ?? 0) >= dailyLimit) {
      return NextResponse.json({ error: "daily_video_limit_reached", limit: dailyLimit }, { status: 429 });
    }
  }

  const body = await request.json().catch(() => null);
  const audioPath = String(body?.audioPath ?? "");
  const imageUrl = String(body?.imageUrl ?? "");
  if (!audioPath.startsWith(`${user.id}/`) || !/^https:\/\//.test(imageUrl)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .insert({ user_id: user.id, status: "processando", plan: "free", provider: "pexels" })
    .select()
    .single();
  if (jobErr || !job) {
    return NextResponse.json({ error: "job_create_failed" }, { status: 500 });
  }

  const dir = await mkdtemp(path.join(tmpdir(), "postime-render-"));
  try {
    const { data: audioBlob, error: dlErr } = await supabase.storage.from("postime-audio").download(audioPath);
    if (dlErr || !audioBlob) throw new Error("audio_download_failed");
    const audioExt = audioPath.split(".").pop() || "webm";
    const audioFile = path.join(dir, `audio.${audioExt}`);
    await writeFile(audioFile, Buffer.from(await audioBlob.arrayBuffer()));

    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error("image_download_failed");
    const imageFile = path.join(dir, "image.jpg");
    await writeFile(imageFile, Buffer.from(await imgRes.arrayBuffer()));

    const outputFile = path.join(dir, "output.mp4");
    const durationSeconds = await renderKenBurnsVideo({
      imagePath: imageFile,
      audioPath: audioFile,
      outputPath: outputFile,
    });

    const videoBuffer = await readFile(outputFile);
    const videoPath = `${user.id}/${job.id}.mp4`;
    const { error: upErr } = await supabase.storage
      .from("postime-videos")
      .upload(videoPath, videoBuffer, { contentType: "video/mp4", upsert: true });
    if (upErr) throw new Error("video_upload_failed");

    const { data: signed, error: signErr } = await supabase.storage
      .from("postime-videos")
      .createSignedUrl(videoPath, VIDEO_TTL_SECONDS);
    if (signErr || !signed) throw new Error("sign_url_failed");

    const expiresAt = new Date(Date.now() + VIDEO_TTL_SECONDS * 1000).toISOString();
    await supabase
      .from("jobs")
      .update({ status: "pronto", video_url: videoPath, expires_at: expiresAt })
      .eq("id", job.id);

    return NextResponse.json({ jobId: job.id, videoUrl: signed.signedUrl, expiresAt, durationSeconds });
  } catch (err) {
    console.error("[/api/jobs/render]", err instanceof Error ? err.message : err);
    await supabase.from("jobs").update({ status: "erro", error_message: "render_failed" }).eq("id", job.id);
    return NextResponse.json({ error: "render_failed" }, { status: 500 });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
