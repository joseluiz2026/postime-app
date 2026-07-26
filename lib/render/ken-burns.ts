import { spawn } from "child_process";
import path from "path";
import { existsSync, statSync } from "fs";
import { writeFile } from "fs/promises";
import ffmpegStaticPath from "ffmpeg-static";
import { buildCaptionSegments, escapeFilterPath, wrapCaptionText } from "./captions";

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
// Caption line-wrap budget: the 1080px canvas minus side margins, divided by
// an estimated average glyph width for the selected caption font (drawtext has
// no built-in word-wrap, so without this long phrases run past the frame edges).
const CAPTION_MAX_WIDTH_PX = 900;

const CAPTION_SIZE_MULTIPLIERS: Record<string, number> = { small: 0.8, medium: 1, large: 1.25 };
// Plain ffmpeg-recognized color names — no need for hex, and these read fine
// as classic subtitle colors regardless of the app's own UI theme.
const CAPTION_COLOR_MAP: Record<string, string> = { white: "white", black: "black", yellow: "yellow", red: "red" };
// Fixed opacities picked for legibility per color — white needs to be more
// opaque than black to still read as a solid panel behind light-on-dark text.
const CAPTION_BG_COLOR_MAP: Record<string, string> = {
  white: "white@0.8",
  black: "black@0.5",
  yellow: "0xFFD54A@0.85",
  red: "0xB91C1C@0.6",
};
const CAPTION_FONT_FILES: Record<string, string> = {
  poppins: "Poppins-Bold.ttf",
  anton: "Anton-Regular.ttf",
  archivoblack: "ArchivoBlack-Regular.ttf",
};
// Per-font glyph-width estimate used for the same wrap-budget math as Poppins
// (see CAPTION_MAX_WIDTH_PX above). Anton is a condensed display face (narrower
// glyphs than Poppins Bold); Archivo Black is a wide/heavy face (wider glyphs).
// Erring high on the wider fonts keeps the safety margin against edge overflow.
const CAPTION_FONT_WIDTH_RATIOS: Record<string, { normal: number; uppercase: number }> = {
  poppins: { normal: 0.56, uppercase: 0.62 },
  anton: { normal: 0.48, uppercase: 0.5 },
  archivoblack: { normal: 0.62, uppercase: 0.66 },
};
// When there's background music, the video runs this much longer than the
// narration/captions so the music keeps playing after the speech ends, then
// fades out — instead of cutting off right when the talking stops.
const MUSIC_OUTRO_SECONDS = 3;

// Title/subtitle are a separate, always-on-screen overlay (not synced to
// narration timing like captions) — a headline card near the top of the frame.
// Fixed base sizes distinct from caption sizing since they read at a different
// visual weight (title bigger/bolder, subtitle smaller, supporting text).
const TITLE_BASE_FONTSIZE = 64;
const SUBTITLE_BASE_FONTSIZE = 42;
const TITLE_TOP_MARGIN = 90;
const TITLE_SUBTITLE_GAP = 90;
const LETTERBOX_HEIGHT = 150;
const OVERLAY_SIDE_MARGIN = 60;
// How long a single título/subtítulo cue stays on screen once its start time
// hits, unless the next cue in the same list starts sooner (then it's cut short).
const OVERLAY_CUE_DISPLAY_SECONDS = 4;

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

function getCaptionFontPath(font?: string): string {
  const file = (font && CAPTION_FONT_FILES[font]) || CAPTION_FONT_FILES.poppins;
  return path.join(process.cwd(), "public", "fonts", file);
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
  captionColor?: string;
  captionSize?: string;
  captionFont?: string;
  captionShadow?: boolean;
  captionBackground?: string;
  captionPositionY?: number;
}): Promise<{ lines: string[]; outLabel: string }> {
  const cfg = STYLE_CONFIGS[opts.style] ?? STYLE_CONFIGS[DEFAULT_STYLE];
  const fontsize = Math.round(cfg.fontsize * (CAPTION_SIZE_MULTIPLIERS[opts.captionSize ?? "medium"] ?? 1));
  const fontcolor = (opts.captionColor && CAPTION_COLOR_MAP[opts.captionColor]) || cfg.fontcolor;
  // A user-picked slider position (0 = top, 100 = bottom of frame) overrides the
  // style's own fixed y — anchored by the text's vertical center, not its top edge,
  // so the slider behaves the same regardless of font size or line count.
  const yBase =
    typeof opts.captionPositionY === "number"
      ? `(h*${(opts.captionPositionY / 100).toFixed(4)}-text_h/2)`
      : cfg.y;
  // "none" forces the box off regardless of the style's own default; a color
  // forces it on with that color; "auto"/undefined keeps the style's own box
  // and boxcolor exactly as before (no regression for existing behavior).
  const bg = opts.captionBackground;
  const hasBox = bg === "none" ? false : bg && bg !== "auto" ? true : cfg.box;
  const boxcolorOverride = bg && bg !== "auto" && bg !== "none" ? CAPTION_BG_COLOR_MAP[bg] : undefined;
  const widthRatios = CAPTION_FONT_WIDTH_RATIOS[opts.captionFont ?? "poppins"] ?? CAPTION_FONT_WIDTH_RATIOS.poppins;
  const segments = buildCaptionSegments(opts.text, opts.duration, cfg.mode);
  const lines: string[] = [];
  let cur = opts.inLabel;

  if (cfg.letterbox) {
    lines.push(`[${cur}]drawbox=x=0:y=0:w=1080:h=${LETTERBOX_HEIGHT}:color=black:t=fill[lb0]`);
    lines.push(`[lb0]drawbox=x=0:y=${1920 - LETTERBOX_HEIGHT}:w=1080:h=${LETTERBOX_HEIGHT}:color=black:t=fill[lb1]`);
    cur = "lb1";
  }

  const fontEsc = escapeFilterPath(getCaptionFontPath(opts.captionFont));

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.end - seg.start < 0.02) continue;

    const raw = cfg.uppercase ? segments[i].text.toUpperCase() : segments[i].text;
    const charWidthRatio = cfg.uppercase ? widthRatios.uppercase : widthRatios.normal;
    const maxCharsPerLine = Math.max(6, Math.floor(CAPTION_MAX_WIDTH_PX / (fontsize * charWidthRatio)));
    // Word mode already burns one word at a time, so there's nothing to wrap.
    const displayText = cfg.mode === "word" ? raw : wrapCaptionText(raw, maxCharsPerLine);
    const txtPath = path.join(opts.workDir, `cap_${i}.txt`);
    await writeFile(txtPath, displayText, "utf8");
    const txtEsc = escapeFilterPath(txtPath);

    const start = seg.start.toFixed(3);
    const end = seg.end.toFixed(3);
    const fade = Math.min(0.12, (seg.end - seg.start) / 3).toFixed(3);

    const parts = [
      `fontfile='${fontEsc}'`,
      `textfile='${txtEsc}'`,
      `fontsize=${fontsize}`,
      `fontcolor=${fontcolor}`,
      `x=(w-text_w)/2`,
      // x=(w-text_w)/2 alone only centers the block by its widest wrapped line —
      // shorter lines then sit left-aligned inside that block. text_align=center
      // re-centers each line within the block so every line reads centered.
      `text_align=center`,
      cfg.rise > 0
        ? `y='${yBase}+(1-min((t-${start})/0.12,1))*${cfg.rise}'`
        : `y='${yBase}'`,
    ];
    if (hasBox) {
      // A dark translucent panel is usually the default — if the user picked
      // black caption text on top of it (and didn't also override the
      // background color), swap to a light panel so the text doesn't
      // disappear against its own background.
      const boxcolor =
        boxcolorOverride ?? (fontcolor === "black" && cfg.boxcolor.includes("black") ? "white@0.75" : cfg.boxcolor);
      parts.push(`box=1`, `boxcolor=${boxcolor}`, `boxborderw=${cfg.boxborderw}`);
    }
    if (opts.captionShadow) {
      // drawtext has no true gaussian blur, so this is a soft offset shadow
      // (semi-transparent, scaled with font size) rather than a blurred one —
      // a real blur would mean a second pass through ffmpeg's gblur filter per
      // caption cue, which risks reintroducing the render-time/timeout issues
      // just fixed. This reads as a soft shadow at normal caption sizes.
      const shadowOffset = Math.max(2, Math.round(fontsize * 0.035));
      parts.push(`shadowcolor=black@0.65`, `shadowx=${shadowOffset}`, `shadowy=${shadowOffset}`);
    }
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
 * A list of timed text overlay cues (title or subtitle) — unlike captions,
 * cues aren't synced to narration and have no background panel, just
 * positioned text with a shared alignment/font/size/color/shadow. Each cue is
 * visible for `OVERLAY_CUE_DISPLAY_SECONDS` starting at its own `start` time,
 * cut short if the next cue starts before that window ends.
 */
async function buildOverlayCuesChain(opts: {
  cues: { text: string; start: number }[];
  duration: number;
  workDir: string;
  inLabel: string;
  idPrefix: string;
  y: number;
  baseFontsize: number;
  align?: string;
  color?: string;
  size?: string;
  font?: string;
  shadow?: boolean;
}): Promise<{ lines: string[]; outLabel: string }> {
  const fontsize = Math.round(opts.baseFontsize * (CAPTION_SIZE_MULTIPLIERS[opts.size ?? "medium"] ?? 1));
  const fontcolor = (opts.color && CAPTION_COLOR_MAP[opts.color]) || "white";
  const widthRatios = CAPTION_FONT_WIDTH_RATIOS[opts.font ?? "poppins"] ?? CAPTION_FONT_WIDTH_RATIOS.poppins;
  const maxCharsPerLine = Math.max(6, Math.floor(CAPTION_MAX_WIDTH_PX / (fontsize * widthRatios.normal)));
  const fontEsc = escapeFilterPath(getCaptionFontPath(opts.font));

  const align = opts.align === "left" || opts.align === "right" ? opts.align : "center";
  const x =
    align === "left"
      ? `${OVERLAY_SIDE_MARGIN}`
      : align === "right"
        ? `w-text_w-${OVERLAY_SIDE_MARGIN}`
        : `(w-text_w)/2`;

  const sorted = [...opts.cues].sort((a, b) => a.start - b.start);
  const lines: string[] = [];
  let cur = opts.inLabel;

  for (let i = 0; i < sorted.length; i++) {
    const cue = sorted[i];
    const start = Math.min(cue.start, opts.duration);
    const nextStart = i + 1 < sorted.length ? sorted[i + 1].start : opts.duration;
    const end = Math.min(start + OVERLAY_CUE_DISPLAY_SECONDS, nextStart, opts.duration);
    if (end - start < 0.02) continue;

    const displayText = wrapCaptionText(cue.text, maxCharsPerLine);
    const txtPath = path.join(opts.workDir, `${opts.idPrefix}_${i}.txt`);
    await writeFile(txtPath, displayText, "utf8");
    const txtEsc = escapeFilterPath(txtPath);
    const fade = Math.min(0.3, (end - start) / 3).toFixed(3);
    const startStr = start.toFixed(3);
    const endStr = end.toFixed(3);

    const parts = [
      `fontfile='${fontEsc}'`,
      `textfile='${txtEsc}'`,
      `fontsize=${fontsize}`,
      `fontcolor=${fontcolor}`,
      `x=${x}`,
      `text_align=${align}`,
      `y=${opts.y}`,
    ];
    if (opts.shadow) {
      const shadowOffset = Math.max(2, Math.round(fontsize * 0.035));
      parts.push(`shadowcolor=black@0.65`, `shadowx=${shadowOffset}`, `shadowy=${shadowOffset}`);
    }
    parts.push(
      `alpha='if(lt(t,${startStr}+${fade}),(t-${startStr})/${fade},if(gt(t,${endStr}-${fade}),(${endStr}-t)/${fade},1))'`,
      `enable='between(t,${startStr},${endStr})'`,
    );

    const out = `${opts.idPrefix}${i}`;
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
  captionColor?: string;
  captionSize?: string;
  captionFont?: string;
  captionShadow?: boolean;
  captionBackground?: string;
  captionPositionY?: number;
  titleCues?: { text: string; start: number }[];
  titleAlign?: string;
  titleColor?: string;
  titleSize?: string;
  titleFont?: string;
  titleShadow?: boolean;
  subtitleCues?: { text: string; start: number }[];
  subtitleAlign?: string;
  subtitleColor?: string;
  subtitleSize?: string;
  subtitleFont?: string;
  subtitleShadow?: boolean;
  durationSeconds?: number;
  musicPath?: string;
  watermarkPath?: string;
  watermarkPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
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
      captionColor: opts.captionColor,
      captionSize: opts.captionSize,
      captionFont: opts.captionFont,
      captionShadow: opts.captionShadow,
      captionBackground: opts.captionBackground,
      captionPositionY: opts.captionPositionY,
    });
    filterLines.push(...chain.lines);
    outLabel = chain.outLabel;
  }

  // Title/subtitle sit near the top and are unrelated to caption timing/style,
  // so they're built independently and just chained onto whatever came before.
  const overlayTopY = cfg.letterbox ? LETTERBOX_HEIGHT + 30 : TITLE_TOP_MARGIN;
  if (opts.titleCues && opts.titleCues.length > 0) {
    const titleChain = await buildOverlayCuesChain({
      cues: opts.titleCues,
      duration,
      workDir,
      inLabel: outLabel,
      idPrefix: "title",
      y: overlayTopY,
      baseFontsize: TITLE_BASE_FONTSIZE,
      align: opts.titleAlign,
      color: opts.titleColor,
      size: opts.titleSize,
      font: opts.titleFont,
      shadow: opts.titleShadow,
    });
    filterLines.push(...titleChain.lines);
    outLabel = titleChain.outLabel;
  }
  if (opts.subtitleCues && opts.subtitleCues.length > 0) {
    const subtitleChain = await buildOverlayCuesChain({
      cues: opts.subtitleCues,
      duration,
      workDir,
      inLabel: outLabel,
      idPrefix: "subtitle",
      y: overlayTopY + TITLE_SUBTITLE_GAP,
      baseFontsize: SUBTITLE_BASE_FONTSIZE,
      align: opts.subtitleAlign,
      color: opts.subtitleColor,
      size: opts.subtitleSize,
      font: opts.subtitleFont,
      shadow: opts.subtitleShadow,
    });
    filterLines.push(...subtitleChain.lines);
    outLabel = subtitleChain.outLabel;
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

  let watermarkInputIndex: number | null = null;
  if (opts.watermarkPath) {
    args.push("-i", opts.watermarkPath);
    watermarkInputIndex = nextInputIndex++;
  }

  if (watermarkInputIndex !== null) {
    // Scaled to a fixed width (not proportional to canvas) so the logo reads as
    // a consistent brand mark regardless of scene count; corner margin keeps it
    // clear of both the safe-area edges and any caption box.
    const margin = 24;
    const watermarkXY: Record<string, string> = {
      "top-left": `x=${margin}:y=${margin}`,
      "top-right": `x=main_w-overlay_w-${margin}:y=${margin}`,
      "bottom-left": `x=${margin}:y=main_h-overlay_h-${margin}`,
      "bottom-right": `x=main_w-overlay_w-${margin}:y=main_h-overlay_h-${margin}`,
    };
    const xy = watermarkXY[opts.watermarkPosition ?? "bottom-right"];
    filterLines.push(`[${watermarkInputIndex}:v]scale=180:-1[wm]`);
    filterLines.push(`[${outLabel}][wm]overlay=${xy}[wmout]`);
    outLabel = "wmout";
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

  args.push(
    // Passed inline rather than via -filter_complex_script/-/filter_complex:
    // the "_script" flag was removed in newer ffmpeg builds (including the
    // vendored Linux binary) in favor of "-/filter_complex", but that syntax
    // doesn't exist yet in older builds (including the local Windows dev
    // binary) — plain "-filter_complex <graph>" has been stable across every
    // ffmpeg version and works on both.
    "-filter_complex",
    filterLines.join(";\n"),
    "-map",
    `[${outLabel}]`,
    "-map",
    audioMapSpec,
    "-c:v",
    "libx264",
    // Default "medium" preset was too slow for Vercel's shared serverless CPU —
    // renders were blowing past the 60s function timeout even for a single,
    // non-concurrent video. "veryfast" trades some compression efficiency
    // (slightly bigger file) for a large encode-speed win; output is short-form
    // vertical video that gets re-compressed by TikTok/social platforms anyway,
    // so the quality tradeoff is not visually meaningful.
    "-preset",
    "veryfast",
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
