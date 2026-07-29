import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { NextResponse } from "next/server";
import { probeDurationSeconds, renderKenBurnsVideo } from "@/lib/render/ken-burns";
import { estimateReadingDurationSeconds, splitTextIntoChunks } from "@/lib/render/captions";
import { computeSegmentCount } from "@/lib/render/segments";
import { searchStockImage } from "@/lib/images/stock";
import { pickMusicTrack } from "@/lib/audio/music-picker";
import { createClient } from "@/lib/supabase/server";
import { dailyVideoLimitFor, getAccessPhase } from "@/lib/plan";
import { sendLimitReachedEmailOnce } from "@/lib/admin/message-templates";

const ALLOWED_SCENE_SECONDS = [1, 2, 3, 4, 5] as const;
const DEFAULT_SCENE_SECONDS = 3;
const ALLOWED_CAPTION_COLORS = ["auto", "white", "black", "yellow", "red", "green", "blue", "purple"] as const;
const ALLOWED_CAPTION_BACKGROUNDS = ["auto", "none", "white", "black", "yellow", "red", "green", "blue", "purple"] as const;
const ALLOWED_CAPTION_SIZES = ["small", "medium", "large"] as const;
const ALLOWED_CAPTION_FONTS = ["poppins", "anton", "archivoblack"] as const;
const ALLOWED_WATERMARK_POSITIONS = ["top-left", "top-right", "bottom-left", "bottom-right"] as const;
const ALLOWED_TEXT_ALIGNS = ["left", "center", "right"] as const;
const MAX_OVERLAY_CUES = 12;
// The end-card (logo + subscribe CTA on the final black frame) is meant to be
// Pro-only. TEMPORARY: also allow it on Free-plan accounts so it can be
// tested end-to-end before launch — flip this back to false once verified.
const ALLOW_END_CARD_FOR_FREE_TESTING = true;
const MAX_END_CARD_TEXT_LENGTH = 200;

/** Sanitizes a raw título/subtítulo cue array from the client: keeps only
 * well-formed {text, start, end} entries, trims/caps text length, clamps
 * start/end to sane non-negative numbers with end strictly after start, and
 * bounds the list length. */
function parseOverlayCues(raw: unknown): { text: string; start: number; end: number }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((v) => {
      if (!v || typeof v !== "object") return null;
      const text = typeof (v as Record<string, unknown>).text === "string" ? (v as { text: string }).text.trim().slice(0, 200) : "";
      const startRaw = (v as Record<string, unknown>).start;
      const start = typeof startRaw === "number" && Number.isFinite(startRaw) ? Math.max(0, startRaw) : 0;
      const endRaw = (v as Record<string, unknown>).end;
      const end = typeof endRaw === "number" && Number.isFinite(endRaw) ? Math.max(start + 0.1, endRaw) : start + 4;
      return text ? { text, start, end } : null;
    })
    .filter((v): v is { text: string; start: number; end: number } => v !== null)
    .slice(0, MAX_OVERLAY_CUES);
}

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
    // A render that's still "processando" after this long didn't just get
    // slow — the route's maxDuration (60s) already killed it, and since a
    // platform-level kill skips the catch block below, that row never gets
    // marked "erro". Without this cutoff, a single stuck render would keep
    // silently eating one of the user's few daily slots forever.
    const staleProcessandoBefore = new Date(now.getTime() - 5 * 60_000).toISOString();
    const { count, error: countErr } = await supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", startOfDay)
      .or(`status.eq.pronto,and(status.eq.processando,created_at.gte.${staleProcessandoBefore})`);
    if (!countErr && (count ?? 0) >= dailyLimit) {
      if (user.email) void sendLimitReachedEmailOnce(user.id, user.email);
      return NextResponse.json({ error: "daily_video_limit_reached", limit: dailyLimit }, { status: 429 });
    }
  }

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.slice(0, 120) : null;
  const caption = typeof body?.caption === "string" ? body.caption.slice(0, 800) : null;
  const hashtags: string[] = Array.isArray(body?.hashtags)
    ? body.hashtags.filter((h: unknown): h is string => typeof h === "string" && h.trim().length > 0).slice(0, 10)
    : [];
  const temaIndex = Number.isInteger(body?.temaIndex) ? (body.temaIndex as number) : null;
  const audioPath = String(body?.audioPath ?? "");
  const imageUrl = String(body?.imageUrl ?? "");
  const captionText = typeof body?.text === "string" ? body.text.slice(0, 2000) : undefined;
  const style = typeof body?.style === "string" ? body.style.slice(0, 40) : undefined;
  const mood = typeof body?.mood === "string" ? body.mood.slice(0, 40) : undefined;
  const imageTheme = typeof body?.imageTheme === "string" ? body.imageTheme.slice(0, 60) : null;
  const sceneSeconds = ALLOWED_SCENE_SECONDS.includes(body?.sceneSeconds)
    ? (body.sceneSeconds as number)
    : DEFAULT_SCENE_SECONDS;
  const narrationVolume =
    typeof body?.narrationVolume === "number" && Number.isFinite(body.narrationVolume)
      ? Math.min(200, Math.max(0, body.narrationVolume))
      : 100;
  const musicVolume =
    typeof body?.musicVolume === "number" && Number.isFinite(body.musicVolume)
      ? Math.min(100, Math.max(0, body.musicVolume))
      : undefined;
  const captionColor = ALLOWED_CAPTION_COLORS.includes(body?.captionColor) ? (body.captionColor as string) : "auto";
  const captionSize = ALLOWED_CAPTION_SIZES.includes(body?.captionSize) ? (body.captionSize as string) : "medium";
  const captionFont = ALLOWED_CAPTION_FONTS.includes(body?.captionFont) ? (body.captionFont as string) : "poppins";
  const captionShadow = body?.captionShadow === true;
  const captionBackground = ALLOWED_CAPTION_BACKGROUNDS.includes(body?.captionBackground)
    ? (body.captionBackground as string)
    : "auto";
  const captionPositionY =
    typeof body?.captionPositionY === "number" && Number.isFinite(body.captionPositionY)
      ? Math.min(100, Math.max(0, body.captionPositionY))
      : undefined;
  const titleCues = parseOverlayCues(body?.titleCues);
  const titleAlign = ALLOWED_TEXT_ALIGNS.includes(body?.titleAlign) ? (body.titleAlign as string) : "center";
  const titleColor = ALLOWED_CAPTION_COLORS.includes(body?.titleColor) ? (body.titleColor as string) : "auto";
  const titleSize = ALLOWED_CAPTION_SIZES.includes(body?.titleSize) ? (body.titleSize as string) : "medium";
  const titleFont = ALLOWED_CAPTION_FONTS.includes(body?.titleFont) ? (body.titleFont as string) : "poppins";
  const titleShadow = body?.titleShadow === true;
  const subtitleCues = parseOverlayCues(body?.subtitleCues);
  const subtitleAlign = ALLOWED_TEXT_ALIGNS.includes(body?.subtitleAlign) ? (body.subtitleAlign as string) : "center";
  const subtitleColor = ALLOWED_CAPTION_COLORS.includes(body?.subtitleColor) ? (body.subtitleColor as string) : "auto";
  const subtitleSize = ALLOWED_CAPTION_SIZES.includes(body?.subtitleSize) ? (body.subtitleSize as string) : "medium";
  const subtitleFont = ALLOWED_CAPTION_FONTS.includes(body?.subtitleFont) ? (body.subtitleFont as string) : "poppins";
  const subtitleShadow = body?.subtitleShadow === true;
  const watermarkPath = typeof body?.watermarkPath === "string" ? body.watermarkPath : "";
  const watermarkPosition = ALLOWED_WATERMARK_POSITIONS.includes(body?.watermarkPosition)
    ? (body.watermarkPosition as string)
    : "bottom-right";
  const watermarkOpacity =
    typeof body?.watermarkOpacity === "number" && Number.isFinite(body.watermarkOpacity)
      ? Math.min(100, Math.max(0, body.watermarkOpacity))
      : 100;
  const endCardEnabledRequested = body?.endCardEnabled === true;
  const endCardLogoPath = typeof body?.endCardLogoPath === "string" ? body.endCardLogoPath : "";
  const endCardText =
    typeof body?.endCardText === "string" ? body.endCardText.trim().slice(0, MAX_END_CARD_TEXT_LENGTH) : "";
  // Per-segment own-photo overrides (from the Estilo "Fotos por vídeo" picker) — index
  // k is the k-th image segment of this video. A non-https entry is treated as "no
  // override for this slot", same as it being absent — that slot still auto-fetches stock.
  const ownImageUrls: (string | null)[] = Array.isArray(body?.ownImageUrls)
    ? body.ownImageUrls.map((v: unknown) => (typeof v === "string" && /^https:\/\//.test(v) ? v : null))
    : [];
  // Parallel to ownImageUrls — "video" means that slot's URL is a real uploaded
  // clip (see app/app/estilo's per-scene picker), not a still photo.
  const ownMediaTypes: ("image" | "video")[] = Array.isArray(body?.ownMediaTypes)
    ? body.ownMediaTypes.map((v: unknown) => (v === "video" ? "video" : "image"))
    : [];
  const hasAudio = audioPath.length > 0;
  const hasWatermark = watermarkPath.length > 0;
  const hasEndCardLogo = endCardLogoPath.length > 0;
  if (
    (hasAudio && !audioPath.startsWith(`${user.id}/`)) ||
    (hasWatermark && !watermarkPath.startsWith(`${user.id}/`)) ||
    (hasEndCardLogo && !endCardLogoPath.startsWith(`${user.id}/`)) ||
    !/^https:\/\//.test(imageUrl)
  ) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  // No recorded narration: the video falls back to showing the roteiro text as
  // captions throughout, so there must be text to show.
  if (!hasAudio && !captionText) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .insert({
      user_id: user.id,
      status: "processando",
      plan: "free",
      provider: "pexels",
      title,
      caption,
      hashtags,
      image_url: imageUrl || null,
      tema_index: temaIndex,
    })
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
    const numSegments = computeSegmentCount(duration, sceneSeconds);
    // Segment 0 is the already-fetched cover image (keeps the video's opening frame
    // consistent with the thumbnail shown in the UI) unless the user explicitly
    // assigned their own photo to that slot. Any other segment uses the user's
    // assigned photo when present (skipping the stock search entirely — this is what
    // makes "só minhas fotos" possible with zero stock-provider calls); segments left
    // unassigned fall back to one auto-fetched stock photo per text chunk, same as before.
    // Own photos land in these slots in whatever order the client sent them in
    // ownImageUrls — see wizard-context.tsx's assignOwnImagesInOrder, which fills
    // that array by natural-sorting the user's uploaded filenames.
    const imageUrls: (string | null)[] = new Array(numSegments).fill(null);
    const mediaTypes: ("image" | "video")[] = new Array(numSegments).fill("image");
    imageUrls[0] = ownImageUrls[0] || imageUrl;
    mediaTypes[0] = ownImageUrls[0] ? (ownMediaTypes[0] ?? "image") : "image";
    for (let k = 1; k < numSegments; k++) {
      if (ownImageUrls[k]) {
        imageUrls[k] = ownImageUrls[k];
        mediaTypes[k] = ownMediaTypes[k] ?? "image";
      }
    }

    const autoIndices = imageUrls.reduce<number[]>((acc, v, k) => {
      if (v === null) acc.push(k);
      return acc;
    }, []);
    if (autoIndices.length > 0 && captionText) {
      const chunks = splitTextIntoChunks(captionText, imageUrls.length);
      const fetched = await Promise.all(
        autoIndices.map(async (k) => {
          try {
            const found = await searchStockImage(chunks[k] ?? captionText, { themeQuery: imageTheme });
            return found?.url ?? null;
          } catch {
            return null;
          }
        }),
      );
      autoIndices.forEach((k, pos) => {
        imageUrls[k] = fetched[pos] ?? imageUrl;
      });
    }
    const finalImageUrls = imageUrls.map((v) => v ?? imageUrl);

    const imageFiles = await Promise.all(
      finalImageUrls.map(async (url, i) => {
        const mediaRes = await fetch(url);
        if (!mediaRes.ok) throw new Error("image_download_failed");
        const ext = mediaTypes[i] === "video" ? "mp4" : "jpg";
        const mediaFile = path.join(dir, `image${i}.${ext}`);
        await writeFile(mediaFile, Buffer.from(await mediaRes.arrayBuffer()));
        return mediaFile;
      }),
    );

    // Pro-only feature (see ALLOW_END_CARD_FOR_FREE_TESTING above for the
    // temporary testing exception) — gated here rather than in ken-burns.ts so
    // the renderer stays a dumb executor of whatever it's told to draw.
    const endCardEligible = hasActiveSubscription || ALLOW_END_CARD_FOR_FREE_TESTING;
    const showEndCard = endCardEnabledRequested && endCardEligible;

    // Independent of each other and of the image downloads above — run them
    // concurrently rather than one-after-another, since every second here
    // eats into the render route's tight 60s budget alongside ffmpeg itself.
    const [musicPath, watermarkFile, endCardLogoFile] = await Promise.all([
      pickMusicTrack(mood),
      (async () => {
        if (!hasWatermark) return undefined;
        const { data: wmBlob, error: wmErr } = await supabase.storage.from("postime-images").download(watermarkPath);
        if (wmErr || !wmBlob) return undefined;
        const file = path.join(dir, "watermark.png");
        await writeFile(file, Buffer.from(await wmBlob.arrayBuffer()));
        return file;
      })(),
      (async () => {
        if (!showEndCard || !hasEndCardLogo) return undefined;
        const { data: logoBlob, error: logoErr } = await supabase.storage
          .from("postime-images")
          .download(endCardLogoPath);
        if (logoErr || !logoBlob) return undefined;
        const file = path.join(dir, "end-card-logo.png");
        await writeFile(file, Buffer.from(await logoBlob.arrayBuffer()));
        return file;
      })(),
    ]);

    const outputFile = path.join(dir, "output.mp4");
    const durationSeconds = await renderKenBurnsVideo({
      imagePaths: imageFiles,
      mediaTypes,
      audioPath: audioFile,
      outputPath: outputFile,
      durationSeconds: duration,
      captionText,
      style,
      narrationVolume,
      musicVolume,
      captionColor: captionColor === "auto" ? undefined : captionColor,
      captionSize,
      captionShadow,
      captionBackground,
      captionPositionY,
      titleCues,
      titleAlign,
      titleColor: titleColor === "auto" ? undefined : titleColor,
      titleSize,
      titleFont,
      titleShadow,
      subtitleCues,
      subtitleAlign,
      subtitleColor: subtitleColor === "auto" ? undefined : subtitleColor,
      subtitleSize,
      subtitleFont,
      subtitleShadow,
      watermarkPath: watermarkFile,
      watermarkPosition: watermarkFile ? (watermarkPosition as "top-left" | "top-right" | "bottom-left" | "bottom-right") : undefined,
      watermarkOpacity,
      captionFont,
      musicPath: musicPath ?? undefined,
      endCardEnabled: showEndCard,
      endCardLogoPath: endCardLogoFile,
      endCardText: showEndCard ? endCardText || undefined : undefined,
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
      .update({ status: "pronto", video_url: videoPath, expires_at: expiresAt, duration_seconds: durationSeconds })
      .eq("id", job.id);

    return NextResponse.json({
      jobId: job.id,
      videoUrl: signed.signedUrl,
      videoPath,
      expiresAt,
      durationSeconds,
    });
  } catch (err) {
    console.error("[/api/jobs/render]", err instanceof Error ? err.message : err);
    await supabase.from("jobs").update({ status: "erro", error_message: "render_failed" }).eq("id", job.id);
    return NextResponse.json({ error: "render_failed" }, { status: 500 });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// Lets the user discard a video they don't like (from the "Regravar" button on
// any video card, not just failed ones) — deletes the rendered file immediately
// so a disliked take doesn't linger in storage until its TTL expires.
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const videoPath = typeof body?.videoPath === "string" ? body.videoPath : "";
  if (!videoPath.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  await supabase.storage.from("postime-videos").remove([videoPath]);
  // The GET history handler above only filters on the jobs row (status
  // "pronto" + video_url set) — it never checks whether the file still
  // exists in storage. Without this, removing just the file left the row
  // behind, so the deleted video kept reappearing in "vídeos prontos" on
  // every refresh even though playing it would 404.
  await supabase
    .from("jobs")
    .update({ status: "expirado", video_url: null })
    .eq("user_id", user.id)
    .eq("video_url", videoPath);
  return NextResponse.json({ ok: true });
}

/**
 * Video history: nothing ever deletes the file in storage once a job reaches
 * "pronto" (no cleanup job has ever run, despite the jobs migration's original
 * comment describing one — see project memory), so a fresh signed URL can be minted
 * for any past job regardless of whether its original expires_at already passed.
 * This is what lets the wizard show "vídeos prontos" again after a refresh instead
 * of only for the current in-memory session.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: jobs, error } = await supabase
    .from("jobs")
    .select("id, title, caption, hashtags, tema_index, image_url, video_url, duration_seconds, created_at")
    // NOTE: created_at is also returned to the client below (as createdAt) so a
    // failed/dropped render request can tell "this job" apart from an older
    // "pronto" job for the same tema when recovering a lost response — see
    // wizard-context.tsx's render catch block.
    .eq("user_id", user.id)
    .eq("status", "pronto")
    .not("video_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) return NextResponse.json({ error: "load_failed" }, { status: 500 });

  const videos = await Promise.all(
    (jobs ?? []).map(async (job) => {
      const { data: signed } = await supabase.storage
        .from("postime-videos")
        .createSignedUrl(job.video_url as string, VIDEO_TTL_SECONDS);
      return {
        id: job.id,
        title: job.title ?? "Vídeo",
        caption: job.caption ?? undefined,
        hashtags: job.hashtags ?? undefined,
        temaIndex: job.tema_index ?? -1,
        imageUrl: job.image_url ?? undefined,
        videoUrl: signed?.signedUrl,
        videoPath: job.video_url as string,
        durationSeconds: job.duration_seconds ?? undefined,
        expiresAt: new Date(Date.now() + VIDEO_TTL_SECONDS * 1000).toISOString(),
        createdAt: job.created_at as string,
      };
    }),
  );

  return NextResponse.json({ videos });
}
