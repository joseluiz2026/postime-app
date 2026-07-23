import { spawn } from "child_process";
import path from "path";
import { writeFile } from "fs/promises";
import ffmpegPath from "ffmpeg-static";
import { path as ffprobePath } from "ffprobe-static";
import { buildCaptionSegments, escapeFilterPath } from "./captions";

function probeDurationSeconds(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffprobePath, [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);
    let out = "";
    let err = "";
    proc.stdout.on("data", (d) => (out += d));
    proc.stderr.on("data", (d) => (err += d));
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0) return reject(new Error(`ffprobe failed: ${err.slice(-500)}`));
      const seconds = parseFloat(out.trim());
      if (!Number.isFinite(seconds) || seconds <= 0) return reject(new Error("could not read audio duration"));
      resolve(seconds);
    });
  });
}

type CaptionStyleConfig = {
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
};

const DEFAULT_STYLE = "Minimalista";

const CAPTION_STYLES: Record<string, CaptionStyleConfig> = {
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
  },
};

function getCaptionFontPath(): string {
  return path.join(process.cwd(), "public", "fonts", "Poppins-Bold.ttf");
}

async function buildCaptionChain(opts: {
  text: string;
  duration: number;
  style: string;
  workDir: string;
  inLabel: string;
}): Promise<{ lines: string[]; outLabel: string }> {
  const cfg = CAPTION_STYLES[opts.style] ?? CAPTION_STYLES[DEFAULT_STYLE];
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
 * Renders a single still image into a vertical (1080x1920) Ken Burns zoom-in
 * video, muxed with the given audio track, with optional burned-in captions
 * synced to the audio via proportional text-time splitting (no forced-alignment
 * step exists in this pipeline). Video duration matches the audio.
 * Returns the resulting duration in seconds.
 */
export async function renderKenBurnsVideo(opts: {
  imagePath: string;
  audioPath: string;
  outputPath: string;
  captionText?: string;
  style?: string;
}): Promise<number> {
  const duration = await probeDurationSeconds(opts.audioPath);
  const fps = 25;
  const frames = Math.max(1, Math.round(duration * fps));
  const workDir = path.dirname(opts.outputPath);

  const filterLines = [
    `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,` +
      `zoompan=z='min(zoom+0.0015,1.3)':d=${frames}:s=1080x1920:fps=${fps}[base]`,
  ];
  let outLabel = "base";

  if (opts.captionText && opts.captionText.trim()) {
    const chain = await buildCaptionChain({
      text: opts.captionText.trim().slice(0, 2000),
      duration,
      style: opts.style ?? DEFAULT_STYLE,
      workDir,
      inLabel: "base",
    });
    filterLines.push(...chain.lines);
    outLabel = chain.outLabel;
  }

  const scriptPath = path.join(workDir, "filtergraph.txt");
  await writeFile(scriptPath, filterLines.join(";\n"), "utf8");

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(ffmpegPath as string, [
      "-y",
      "-loop",
      "1",
      "-i",
      opts.imagePath,
      "-i",
      opts.audioPath,
      "-filter_complex_script",
      scriptPath,
      "-map",
      `[${outLabel}]`,
      "-map",
      "1:a",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-t",
      String(duration),
      opts.outputPath,
    ]);
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d));
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0) return reject(new Error(`ffmpeg failed: ${stderr.slice(-800)}`));
      resolve();
    });
  });

  return duration;
}
