import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { NextResponse } from "next/server";
import { probeDurationSeconds, renderKenBurnsVideo } from "@/lib/render/ken-burns";
import { estimateReadingDurationSeconds, splitTextIntoChunks } from "@/lib/render/captions";
import { searchPexelsImage } from "@/lib/images/pexels";
import { pickMusicTrack } from "@/lib/audio/music-picker";
import { createClient } from "@/lib/supabase/server";
import { dailyVideoLimitFor, getAccessPhase } from "@/lib/plan";

const IMAGE_SEGMENT_SECONDS = 3;
const MAX_IMAGE_SEGMENTS = 12;

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
  const { data: subRow } = await supabase.from("subscriptions").select("status").eq("user_id", user.id).maybeSingle();
  const hasActiveSubscription = subRow?.status === "active";

  if (accessPhase === "locked" && !hasActiveSubscription) {
    return NextResponse.json({ error: "access_locked" }, { status: 402 });
  }

  const dailyLimit = dailyVideoLimitFor(accessPhase, hasActiveSubscription);
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
  const captionText = typeof body?.text === "string" ? body.text.slice(0, 2000) : undefined;
  const style = typeof body?.style === "string" ? body.style.slice(0, 40) : undefined;
  const mood = typeof body?.mood === "string" ? body.mood.slice(0, 40) : undefined;
  const hasAudio = audioPath.length > 0;
  if ((hasAudio && !audioPath.startsWith(`${user.id}/`)) || !/^https:\/\//.test(imageUrl)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  // No recorded narration: the video falls back to showing the roteiro text as
  // captions throughout, so there must be text to show.
  if (!hasAudio && !captionText) {
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
    let audioFile: string | undefined;
    let duration: number;
    if (hasAudio) {
      const { data: audioBlob, error: dlErr } = await supabase.storage.from("postime-audio").download(audioPath);
      if (dlErr || !audioBlob) throw new Error("audio_download_failed");
      const audioExt = audioPath.split(".").pop() || "webm";
      audioFile = path.join(dir, `audio.${audioExt}`);
      await writeFile(audioFile, Buffer.from(await audioBlob.arrayBuffer()));
      duration = await probeDurationSeconds(audioFile);
    } else {
      duration = estimateReadingDurationSeconds(captionText!);
    }
    const numSegments = Math.max(
      1,
      Math.min(MAX_IMAGE_SEGMENTS, Math.round(duration / IMAGE_SEGMENT_SECONDS)),
    );

    // First segment reuses the already-fetched cover image (keeps the video's opening
    // frame consistent with the thumbnail shown in the UI); extra segments get their
    // own Pexels image, one per text chunk, so each ~3s image relates to that part of
    // the narration.
    const imageUrls = [imageUrl];
    if (numSegments > 1 && captionText) {
      const chunks = splitTextIntoChunks(captionText, numSegments);
      const extra = await Promise.all(
        chunks.slice(1).map(async (chunk) => {
          try {
            const found = await searchPexelsImage(chunk);
            return found?.url ?? null;
          } catch {
            return null;
          }
        }),
      );
      for (const url of extra) imageUrls.push(url ?? imageUrl);
    }

    const imageFiles = await Promise.all(
      imageUrls.map(async (url, i) => {
        const imgRes = await fetch(url);
        if (!imgRes.ok) throw new Error("image_download_failed");
        const imageFile = path.join(dir, `image${i}.jpg`);
        await writeFile(imageFile, Buffer.from(await imgRes.arrayBuffer()));
        return imageFile;
      }),
    );

    const musicPath = await pickMusicTrack(mood);

    const outputFile = path.join(dir, "output.mp4");
    const durationSeconds = await renderKenBurnsVideo({
      imagePaths: imageFiles,
      audioPath: audioFile,
      outputPath: outputFile,
      durationSeconds: duration,
      captionText,
      style,
      musicPath: musicPath ?? undefined,
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
