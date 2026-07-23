import { spawn } from "child_process";
import path from "path";
import { existsSync, statSync } from "fs";
import { writeFile } from "fs/promises";
import ffmpegStaticPath from "ffmpeg-static";
import { buildCaptionSegments, escapeFilterPath } from "./captions";

// ffmpeg-static's bundled Linux binary lacks libfreetype (no `drawtext` filter
// support), so captions never actually burned in on Vercel even though
// everything worked locally on Windows (a different, full-featured build).
// scripts/setup-ffmpeg.js downloads a Linux build that does have it into
// vendor/ffmpeg at install time; prefer that when present, and fall back to
// ffmpeg-static everywhere else (local dev, or if that download failed).
const VENDOR_FFMPEG_PATH = path.join(process.cwd(), "vendor", "ffmpeg", "ffmpeg");

function resolveFfmpegPath(): string {
  if (existsSync(VENDOR_FFMPEG_PATH) && statSync(VENDOR_FFMPEG_PATH).size > 0) {
    return VENDOR_FFMPEG_PATH;
  }
  return ffmpegStaticPath as string;
}

/**
 * Probes a media file's duration via ffmpeg itself (not ffprobe — one fewer
 * platform-specific binary to source/bundle, and ffmpeg always prints this to
 * stderr when given an input with no output).
 */
export function probeDurationSeconds(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = spawn(resolveFfmpegPath(), ["-i", filePath]);
    let err = "";
    proc.stderr.on("data", (d) => (err += d));
    proc.on("error", reject);
    proc.on("close", () => {
      const match = err.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/);
      if (!match) return reject(new Error("could not read media duration"));
      const [, hh, mm, ss] = match;
      const seconds = Number(hh) * 3600 + Number(mm) * 60 + Number(ss);
      if (!Number.isFinite(seconds) || seconds <= 0) return reject(new Error("could not read media duration"));
      resolve(seconds);
    });
  });
}

type StyleRenderConfig = {
  mode: "phrase" | "word";
  fontsize: number;
  fontcolor: string;
  y: string;
  box: boolean;
  boxcolor: string;
  boxborderw: number;
  rise: number;
  letterbox: boolean;
  uppercase: boolean;
  transition: string;
  transitionDur: number;
};

const DEFAULT_STYLE = "Minimalista";
// When there's background music, the video runs this much longer than the
// narration/captions so the music keeps playing after the speech ends, then
// fades out — instead of cutting off right when the talking stops.
const MUSIC_OUTRO_SECONDS = 3;

const STYLE_CONFIGS: Record<string, StyleRenderConfig> = {
  Minimalista: {
    mode: "phrase",
    fontsize: 58,
    fontcolor: "white",
    y: "h-280",
    box: true,
    boxcolor: "black@0.45",
    boxborderw: 24,
    rise: 0,
    letterbox: false,
    uppercase: false,
    transition: "fade",
    transitionDur: 0.4,
  },
  "Dinâmico": {
    mode: "phrase",
    fontsize: 62,
    fontcolor: "white",
    y: "h-300",
    box: true,
    boxcolor: "black@0.4",
    boxborderw: 20,
    rise: 16,
    letterbox: false,
    uppercase: false,
    transition: "slideleft",
    transitionDur: 0.3,
  },
  "Cinematográfico": {
    mode: "phrase",
    fontsize: 44,
    fontcolor: "0xE8E8E8",
    y: "h-115",
    box: false,
    boxcolor: "black@0",
    boxborderw: 0,
    rise: 0,
    letterbox: true,
    uppercase: false,
    transition: "fade",
    transitionDur: 0.6,
  },
  "Neon Bold": {
    mode: "phrase",
    fontsize: 66,
    fontcolor: "0x0B0B0B",
    y: "h-300",
    box: true,
    boxcolor: "0xFFD54A@0.92",
    boxborderw: 26,
    rise: 0,
    letterbox: false,
    uppercase: true,
    transition: "circleopen",
    transitionDur: 0.4,
  },
  "Kinetic Text": {
    mode: "word",
    fontsize: 84,
    fontcolor: "white",
    y: "(h-text_h)/2",
    box: false,
    boxcolor: "black@0",
    boxborderw: 0,
    rise: 28,
    letterbox: false,
    uppercase: false,
    transition: "fade",
    transitionDur: 0.25,
  },
  "Split Screen": {
    mode: "phrase",
    fontsize: 54,
    fontcolor: "white",
    y: "h-280",
    box: true,
    boxcolor: "black@0.45",
    boxborderw: 22,
    rise: 0,
    letterbox: false,
    uppercase: false,
    transition: "wipeup",
    transitionDur: 0.4,
  },
};

function getCaptionFontPath(): string {
  return path.join(process.cwd(), "public", "fonts", "Poppins-Bold.ttf");
}

function buildMultiImageChain(opts: {
  imageCount: number;
  duration: number;
  outroSeconds: number;
  fps: number;
  cfg: StyleRenderConfig;
}): { lines: string[]; outLabel: string } {
  const { imageCount: n, duration, outroSeconds, fps, cfg } = opts;

  if (n <= 1) {
    const frames = Math.max(1, Math.round((duration + outroSeconds) * fps));
    return {
      lines: [
        `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,` +
          `zoompan=z='min(zoom+0.0015,1.3)':d=${frames}:s=1080x1920:fps=${fps}[base]`,
      ],
      outLabel: "base",
    };
  }

  // Each source clip is rendered slightly longer than its "solo" segment so the tail
  // can crossfade into the next clip's head; xfade then consumes that overlap. The
  // combined timeline ends up a hair longer than `duration`, trimmed off by -t later.
  // The last clip additionally gets `outroSeconds` of extra frames so the picture
  // keeps moving during the music-only tail instead of running out of video.
  const segDur = duration / n;
  const td = Math.min(cfg.transitionDur, segDur * 0.6);
  const clipDur = segDur + td;
  const frames = Math.max(1, Math.round(clipDur * fps));
  const lastFrames = Math.max(1, Math.round((clipDur + outroSeconds) * fps));
  const zoomRate = 0.004;

  const lines: string[] = [];
  for (let i = 0; i < n; i++) {
    lines.push(
      `[${i}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,` +
        `zoompan=z='min(zoom+${zoomRate},1.3)':d=${i === n - 1 ? lastFrames : frames}:s=1080x1920:fps=${fps}[img${i}]`,
    );
  }

  let cur = "img0";
  for (let i = 1; i < n; i++) {
    const offset = (i * segDur).toFixed(3);
    const out = i === n - 1 ? "base" : `x${i}`;
    lines.push(
      `[${cur}][img${i}]xfade=transition=${cfg.transition}:duration=${td.toFixed(3)}:offset=${offset}[${out}]`,
    );
    cur = out;
  }

  return { lines, outLabel: "base" };
}

async function buildCaptionChain(opts: {
  text: string;
  duration: number;
  style: string;
  workDir: string;
  inLabel: string;
}): Promise<{ lines: string[]; outLabel: string }> {
  const cfg = STYLE_CONFIGS[opts.style] ?? STYLE_CONFIGS[DEFAULT_STYLE];
  const segments = buildCaptionSegments(opts.text, opts.duration, cfg.mode);
  const lines: string[] = [];
  let cur = opts.inLabel;

  if (cfg.letterbox) {
    lines.push(`[${cur}]drawbox=x=0:y=0:w=1080:h=150:color=black:t=fill[lb0]`);
    lines.push(`[lb0]drawbox=x=0:y=1770:w=1080:h=150:color=black:t=fill[lb1]`);
    cur = "lb1";
  }

  const fontEsc = escapeFilterPath(getCaptionFontPath());

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.end - seg.start < 0.02) continue;

    const raw = cfg.uppercase ? segments[i].text.toUpperCase() : segments[i].text;
    const txtPath = path.join(opts.workDir, `cap_${i}.txt`);
    await writeFile(txtPath, raw, "utf8");
    const txtEsc = escapeFilterPath(txtPath);

    const start = seg.start.toFixed(3);
    const end = seg.end.toFixed(3);
    const fade = Math.min(0.12, (seg.end - seg.start) / 3).toFixed(3);

    const parts = [
      `fontfile='${fontEsc}'`,
      `textfile='${txtEsc}'`,
      `fontsize=${cfg.fontsize}`,
      `fontcolor=${cfg.fontcolor}`,
      `x=(w-text_w)/2`,
      cfg.rise > 0
        ? `y='${cfg.y}+(1-min((t-${start})/0.12,1))*${cfg.rise}'`
        : `y='${cfg.y}'`,
    ];
    if (cfg.box) parts.push(`box=1`, `boxcolor=${cfg.boxcolor}`, `boxborderw=${cfg.boxborderw}`);
    parts.push(
      `alpha='if(lt(t,${start}+${fade}),(t-${start})/${fade},if(gt(t,${end}-${fade}),(${end}-t)/${fade},1))'`,
      `enable='between(t,${start},${end})'`,
    );

    const out = `cap${i}`;
    lines.push(`[${cur}]drawtext=${parts.join(":")}[${out}]`);
    cur = out;
  }

  return { lines, outLabel: cur };
}

/**
 * Renders one or more still images into a vertical (1080x1920) Ken Burns video.
 * With more than one image, each gets its own ~equal-length segment and
 * consecutive segments crossfade (transition style depends on `style`).
 * Optional burned-in captions are synced to the narration via proportional
 * text-time splitting (no forced-alignment step exists in this pipeline). An
 * optional background music track is looped/trimmed to match, faded in/out,
 * and mixed under the narration (fixed-level mix, not dynamic ducking). When
 * music is present the video runs `MUSIC_OUTRO_SECONDS` longer than the
 * narration/captions — the picture keeps moving and the music keeps playing
 * (then fades out) instead of cutting off the instant the speech ends.
 *
 * `audioPath` (narration) is optional: when there's no recorded narration,
 * `durationSeconds` must be supplied instead (typically an estimate from the
 * caption text's reading time), and the video's audio track becomes the music
 * alone (louder, since there's no narration to protect) or silence if there's
 * no music either. Returns the duration in seconds.
 */
export async function renderKenBurnsVideo(opts: {
  imagePaths: string[];
  audioPath?: string;
  outputPath: string;
  captionText?: string;
  style?: string;
  durationSeconds?: number;
  musicPath?: string;
}): Promise<number> {
  if (opts.imagePaths.length === 0) throw new Error("renderKenBurnsVideo: no images provided");
  if (!opts.audioPath && opts.durationSeconds === undefined) {
    throw new Error("renderKenBurnsVideo: durationSeconds is required when audioPath is absent");
  }

  const duration = opts.durationSeconds ?? (await probeDurationSeconds(opts.audioPath!));
  const outroSeconds = opts.musicPath ? MUSIC_OUTRO_SECONDS : 0;
  const outputDuration = duration + outroSeconds;
  const fps = 25;
  const workDir = path.dirname(opts.outputPath);
  const cfg = STYLE_CONFIGS[opts.style ?? DEFAULT_STYLE] ?? STYLE_CONFIGS[DEFAULT_STYLE];

  const { lines: imageLines, outLabel: imagesOutLabel } = buildMultiImageChain({
    imageCount: opts.imagePaths.length,
    duration,
    outroSeconds,
    fps,
    cfg,
  });

  const filterLines = [...imageLines];
  let outLabel = imagesOutLabel;

  if (opts.captionText && opts.captionText.trim()) {
    const chain = await buildCaptionChain({
      text: opts.captionText.trim().slice(0, 2000),
      duration,
      style: opts.style ?? DEFAULT_STYLE,
      workDir,
      inLabel: imagesOutLabel,
    });
    filterLines.push(...chain.lines);
    outLabel = chain.outLabel;
  }

  const args: string[] = ["-y"];
  let nextInputIndex = 0;
  for (const imagePath of opts.imagePaths) {
    args.push("-loop", "1", "-i", imagePath);
    nextInputIndex++;
  }

  let narrationInputIndex: number | null = null;
  if (opts.audioPath) {
    args.push("-i", opts.audioPath);
    narrationInputIndex = nextInputIndex++;
  }

  let musicInputIndex: number | null = null;
  if (opts.musicPath) {
    args.push("-stream_loop", "-1", "-i", opts.musicPath);
    musicInputIndex = nextInputIndex++;
  }

  let silentInputIndex: number | null = null;
  if (narrationInputIndex === null && musicInputIndex === null) {
    args.push("-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100");
    silentInputIndex = nextInputIndex++;
  }

  let audioMapSpec: string;
  const musicDur = outputDuration.toFixed(3);
  const musicFadeSeconds = 2;
  const fadeOutStart = Math.max(0, outputDuration - musicFadeSeconds).toFixed(3);

  if (narrationInputIndex !== null && musicInputIndex !== null) {
    filterLines.push(
      `[${musicInputIndex}:a]atrim=0:${musicDur},asetpts=PTS-STARTPTS,volume=0.15,` +
        `afade=t=in:st=0:d=${musicFadeSeconds},afade=t=out:st=${fadeOutStart}:d=${musicFadeSeconds}[music]`,
    );
    filterLines.push(
      // duration=longest (not "first"): music now intentionally outlasts the
      // narration by outroSeconds, so the mix must follow music's length, not
      // cut off the moment the narration track ends.
      `[${narrationInputIndex}:a][music]amix=inputs=2:duration=longest:dropout_transition=0:normalize=0[aout]`,
    );
    audioMapSpec = "[aout]";
  } else if (narrationInputIndex !== null) {
    audioMapSpec = `${narrationInputIndex}:a`;
  } else if (musicInputIndex !== null) {
    filterLines.push(
      `[${musicInputIndex}:a]atrim=0:${musicDur},asetpts=PTS-STARTPTS,volume=0.35,` +
        `afade=t=in:st=0:d=${musicFadeSeconds},afade=t=out:st=${fadeOutStart}:d=${musicFadeSeconds}[music]`,
    );
    audioMapSpec = "[music]";
  } else {
    audioMapSpec = `${silentInputIndex}:a`;
  }

  const scriptPath = path.join(workDir, "filtergraph.txt");
  await writeFile(scriptPath, filterLines.join(";\n"), "utf8");

  args.push(
    "-filter_complex_script",
    scriptPath,
    "-map",
    `[${outLabel}]`,
    "-map",
    audioMapSpec,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-t",
    String(outputDuration),
    opts.outputPath,
  );

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(resolveFfmpegPath(), args);
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d));
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0) return reject(new Error(`ffmpeg failed: ${stderr.slice(-800)}`));
      resolve();
    });
  });

  return outputDuration;
}
