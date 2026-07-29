import { spawn } from "child_process";
import path from "path";
import { existsSync, statSync } from "fs";
import { writeFile } from "fs/promises";
import ffmpegStaticPath from "ffmpeg-static";
import { buildCaptionSegments, escapeFilterPath, sanitizeCaptionGlyphs, wrapCaptionText } from "./captions";

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
  // Ken Burns speed and direction — "in" pushes slowly into the frame (the
  // original, only behavior), "out" starts pushed in and eases back out,
  // which reads as "revealing" the full scene. Rate is per-frame zoom delta
  // for the multi-segment path; the single-segment path (one image fills the
  // whole video) scales it down to keep that path's historically slower feel.
  zoomRate: number;
  zoomDirection: "in" | "out";
};

const DEFAULT_STYLE = "Minimalista";
// Caption line-wrap budget: the 1080px canvas minus side margins, divided by
// an estimated average glyph width for the selected caption font (drawtext has
// no built-in word-wrap, so without this long phrases run past the frame edges).
const CAPTION_MAX_WIDTH_PX = 900;

const CAPTION_SIZE_MULTIPLIERS: Record<string, number> = { small: 0.8, medium: 1, large: 1.25 };
// Plain ffmpeg-recognized color names where they're legible as-is; green/blue/purple
// use explicit hex instead since ffmpeg's named "green"/"purple" are too dark to read.
const CAPTION_COLOR_MAP: Record<string, string> = {
  white: "white",
  black: "black",
  yellow: "yellow",
  red: "red",
  green: "0x22C55E",
  blue: "0x3B82F6",
  purple: "0xA855F7",
};
// Fixed opacities picked for legibility per color — white needs to be more
// opaque than black to still read as a solid panel behind light-on-dark text.
const CAPTION_BG_COLOR_MAP: Record<string, string> = {
  white: "white@0.8",
  black: "black@0.5",
  yellow: "0xFFD54A@0.85",
  red: "0xB91C1C@0.6",
  green: "0x22C55E@0.75",
  blue: "0x3B82F6@0.75",
  purple: "0xA855F7@0.75",
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
// Default music levels when the user hasn't set an explicit musicVolume:
// quiet under narration so it doesn't compete with speech, louder when it's
// the only audio (no narration to protect).
const DEFAULT_MUSIC_VOLUME_WITH_NARRATION = 0.15;
const DEFAULT_MUSIC_VOLUME_ALONE = 0.35;
// Every rendered video ends with this fade to black (picture) and to silence
// (all audio tracks) — a fixed, always-on outro treatment, not a per-style
// option, so no video ends on an abrupt cut regardless of style/content.
const OUTRO_FADE_SECONDS = 2;

// Optional end card (logo + subscribe CTA), composited on top of the frame
// only after OUTRO_FADE_SECONDS above has already taken it to solid black —
// a separate, longer hold so the logo/CTA have time to fade in, be read, and
// fade out again before the clip actually ends. Only rendered when the caller
// sets endCardEnabled (see renderKenBurnsVideo opts); plan/toggle gating lives
// in the API route, not here.
const OUTRO_CARD_SECONDS = 4;
const END_CARD_TRANSITION_SECONDS = 0.6;
// Bounding box the end-card logo is fit into (never cropped, never stretched)
// — matches the 600x300 upload guidance so square, round, oval, or rectangular
// logos all land at a consistent on-screen scale instead of a tall/narrow logo
// rendering unexpectedly huge under a width-only scale.
const END_CARD_LOGO_MAX_WIDTH = 320;
const END_CARD_LOGO_MAX_HEIGHT = 160;
// Used only when the end card is enabled but the caller left the CTA text
// blank — placeholder copy, swap for real branding whenever available.
const DEFAULT_END_CARD_TEXT = "Assine o app e crie o seu vídeo agora";

// Title/subtitle are a separate, always-on-screen overlay (not synced to
// narration timing like captions) — a headline card near the top of the frame.
// Fixed base sizes distinct from caption sizing since they read at a different
// visual weight (title bigger/bolder, subtitle smaller, supporting text).
const TITLE_BASE_FONTSIZE = 84;
const SUBTITLE_BASE_FONTSIZE = 42;
const TITLE_TOP_MARGIN = 90;
// Fallback gap used only when there's no title (subtitle alone still sits below
// the top margin rather than flush against it). When a title IS present, its
// actual wrapped height is measured instead — see TITLE_SUBTITLE_PADDING below.
const TITLE_SUBTITLE_GAP = 90;
// Padding between the title's own (measured) block height and the subtitle
// that follows it, once a title is present.
const TITLE_SUBTITLE_PADDING = 24;
// No line_spacing is set on the drawtext filters below, so wrapped lines pack
// at roughly the font's natural line height — approximated here since ffmpeg
// doesn't report a wrapped block's height back to us ahead of the render.
// Empirically measured against real rendered output (Poppins Bold): a naive
// 1.2x guess left the subtitle overlapping the title's last line by ~125px on
// a 7-line title — actual pitch measured ~1.40x, this adds a small margin.
const OVERLAY_LINE_HEIGHT_FACTOR = 1.45;
const LETTERBOX_HEIGHT = 150;
const OVERLAY_SIDE_MARGIN = 60;
// Cap on the in/out fade so very short cues (end close to start) still fade
// fully within their own window instead of the fade overshooting past the end.
const OVERLAY_CUE_MAX_FADE_SECONDS = 0.3;

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
    zoomRate: 0.004,
    zoomDirection: "in",
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
    zoomRate: 0.004,
    zoomDirection: "in",
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
    zoomRate: 0.004,
    zoomDirection: "in",
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
    zoomRate: 0.004,
    zoomDirection: "in",
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
    zoomRate: 0.004,
    zoomDirection: "in",
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
    zoomRate: 0.004,
    zoomDirection: "in",
  },
  "Zoom Out Cinético": {
    mode: "phrase",
    fontsize: 50,
    fontcolor: "white",
    y: "h-260",
    box: true,
    boxcolor: "black@0.4",
    boxborderw: 20,
    rise: 0,
    letterbox: false,
    uppercase: false,
    transition: "smoothleft",
    transitionDur: 0.4,
    zoomRate: 0.006,
    zoomDirection: "out",
  },
  "Deslize Vertical": {
    mode: "phrase",
    fontsize: 56,
    fontcolor: "white",
    y: "h-290",
    box: true,
    boxcolor: "black@0.4",
    boxborderw: 22,
    rise: 10,
    letterbox: false,
    uppercase: false,
    transition: "slideup",
    transitionDur: 0.35,
    zoomRate: 0.0035,
    zoomDirection: "in",
  },
  "Revelação Circular": {
    mode: "phrase",
    fontsize: 58,
    fontcolor: "0x0B0B0B",
    y: "h-300",
    box: true,
    boxcolor: "0x2DD4BF@0.85",
    boxborderw: 24,
    rise: 0,
    letterbox: false,
    uppercase: false,
    transition: "circleclose",
    transitionDur: 0.45,
    zoomRate: 0.004,
    zoomDirection: "in",
  },
  "Glitch Urbano": {
    mode: "word",
    fontsize: 78,
    fontcolor: "white",
    y: "(h-text_h)/2",
    box: false,
    boxcolor: "black@0",
    boxborderw: 0,
    rise: 24,
    letterbox: false,
    uppercase: true,
    transition: "pixelize",
    transitionDur: 0.2,
    zoomRate: 0.007,
    zoomDirection: "in",
  },
  "Dissolver Sonhador": {
    mode: "phrase",
    fontsize: 46,
    fontcolor: "0xE8E8E8",
    y: "h-120",
    box: false,
    boxcolor: "black@0",
    boxborderw: 0,
    rise: 0,
    letterbox: true,
    uppercase: false,
    transition: "dissolve",
    transitionDur: 0.7,
    zoomRate: 0.0025,
    zoomDirection: "out",
  },
  "Corte Diagonal": {
    mode: "phrase",
    fontsize: 60,
    fontcolor: "white",
    y: "h-290",
    box: true,
    boxcolor: "black@0.45",
    boxborderw: 22,
    rise: 14,
    letterbox: false,
    uppercase: false,
    transition: "diagtl",
    transitionDur: 0.35,
    zoomRate: 0.005,
    zoomDirection: "in",
  },
};

/** Builds the zoompan filter's `z=` expression for one style's Ken Burns
 * motion: "in" eases from 1.0 up toward 1.3 (the original, only behavior);
 * "out" starts already at 1.3 and eases back down to 1.0, reading as the
 * shot pulling back to reveal the full scene. `rate` is the per-frame zoom
 * delta — larger values push/pull faster. */
function zoompanExpr(direction: "in" | "out", rate: number): string {
  return direction === "out" ? `if(eq(on,1),1.3,max(zoom-${rate},1.0))` : `min(zoom+${rate},1.3)`;
}

function getCaptionFontPath(font?: string): string {
  const file = (font && CAPTION_FONT_FILES[font]) || CAPTION_FONT_FILES.poppins;
  return path.join(process.cwd(), "public", "fonts", file);
}

/** A "video" segment is a real user-uploaded clip (looped via -stream_loop -1 at the
 * input level so it always has enough frames regardless of its own length) — it
 * gets trimmed to the needed duration instead of zoompan'd, since it already has
 * real motion. Everything downstream (xfade concat, captions, etc.) treats both
 * kinds identically once they're labeled video streams. */
function buildMultiImageChain(opts: {
  // Per-segment "solo" duration in seconds — segments need not be equal
  // length (the scheduled-own-photo render path builds a plan with
  // variable-length segments; the plain segment-per-scene path just passes
  // an array of `duration/n` repeated n times).
  segDurs: number[];
  mediaTypes: ("image" | "video")[];
  outroSeconds: number;
  fps: number;
  cfg: StyleRenderConfig;
}): { lines: string[]; outLabel: string } {
  const { segDurs, mediaTypes, outroSeconds, fps, cfg } = opts;
  const n = segDurs.length;
  const typeAt = (i: number): "image" | "video" => mediaTypes[i] ?? "image";

  if (n <= 1) {
    const seconds = (segDurs[0] ?? 0) + outroSeconds;
    if (typeAt(0) === "video") {
      return {
        lines: [
          `[0:v]trim=0:${seconds.toFixed(3)},setpts=PTS-STARTPTS,` +
            `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=${fps},setsar=1[base]`,
        ],
        outLabel: "base",
      };
    }
    const frames = Math.max(1, Math.round(seconds * fps));
    // Scaled down from the per-segment rate below (by the original 0.0015/0.004
    // ratio) — a single image fills the whole video, so the same raw rate would
    // zoom far more than intended over that much longer duration.
    const soloRate = cfg.zoomRate * 0.375;
    return {
      lines: [
        `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,` +
          `zoompan=z='${zoompanExpr(cfg.zoomDirection, soloRate)}':d=${frames}:s=1080x1920:fps=${fps}[base]`,
      ],
      outLabel: "base",
    };
  }

  // Each source clip is rendered slightly longer than its "solo" segment so the tail
  // can crossfade into the next clip's head; xfade then consumes that overlap. The
  // combined timeline ends up a hair longer than `duration`, trimmed off by -t later.
  // The last clip additionally gets `outroSeconds` of extra frames so the picture
  // keeps moving during the music-only tail instead of running out of video.
  // Capped by the *shortest* segment (not a single shared segDur anymore) so no
  // transition overruns the segment it's attached to.
  const td = Math.min(cfg.transitionDur, Math.min(...segDurs) * 0.6);
  const zoomExpr = zoompanExpr(cfg.zoomDirection, cfg.zoomRate);

  const lines: string[] = [];
  for (let i = 0; i < n; i++) {
    const clipDur = segDurs[i] + td;
    const thisClipDur = i === n - 1 ? clipDur + outroSeconds : clipDur;
    const frames = Math.max(1, Math.round(thisClipDur * fps));
    if (typeAt(i) === "video") {
      lines.push(
        `[${i}:v]trim=0:${thisClipDur.toFixed(3)},setpts=PTS-STARTPTS,` +
          `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=${fps},setsar=1[img${i}]`,
      );
    } else {
      lines.push(
        `[${i}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,` +
          `zoompan=z='${zoomExpr}':d=${frames}:s=1080x1920:fps=${fps}[img${i}]`,
      );
    }
  }

  let cur = "img0";
  let cumulative = 0;
  for (let i = 1; i < n; i++) {
    cumulative += segDurs[i - 1];
    const out = i === n - 1 ? "base" : `x${i}`;
    lines.push(
      `[${cur}][img${i}]xfade=transition=${cfg.transition}:duration=${td.toFixed(3)}:offset=${cumulative.toFixed(3)}[${out}]`,
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

    const raw = sanitizeCaptionGlyphs(cfg.uppercase ? segments[i].text.toUpperCase() : segments[i].text);
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
 * visible from its own `start` to `end` second, fading in/out at the edges
 * of that window.
 */
async function buildOverlayCuesChain(opts: {
  cues: { text: string; start: number; end: number }[];
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
}): Promise<{ lines: string[]; outLabel: string; maxLines: number }> {
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

  const lines: string[] = [];
  let cur = opts.inLabel;
  let maxLines = 0;

  for (let i = 0; i < opts.cues.length; i++) {
    const cue = opts.cues[i];
    const start = Math.min(Math.max(0, cue.start), opts.duration);
    const end = Math.min(Math.max(cue.end, start + 0.02), opts.duration);
    if (end - start < 0.02) continue;

    const displayText = wrapCaptionText(cue.text, maxCharsPerLine);
    maxLines = Math.max(maxLines, displayText.split("\n").length);
    const txtPath = path.join(opts.workDir, `${opts.idPrefix}_${i}.txt`);
    await writeFile(txtPath, displayText, "utf8");
    const txtEsc = escapeFilterPath(txtPath);
    const fade = Math.min(OVERLAY_CUE_MAX_FADE_SECONDS, (end - start) / 3).toFixed(3);
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

  return { lines, outLabel: cur, maxLines };
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
  // Parallel to imagePaths — "video" means that path is a real clip (trimmed to
  // fit its segment, looped if shorter than needed) instead of a still zoompan'd.
  // Omitted/shorter than imagePaths defaults every unlisted entry to "image".
  mediaTypes?: ("image" | "video")[];
  // Parallel to imagePaths — explicit "solo" duration (seconds) for each
  // segment, for callers building a plan with unequal segment lengths (own
  // photos scheduled at specific times, gaps filled with shorter auto
  // segments). Must match imagePaths.length or it's ignored; omitted (the
  // common case) divides `duration` evenly across all segments, same as
  // before this option existed.
  segmentDurations?: number[];
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
  titleCues?: { text: string; start: number; end: number }[];
  titleAlign?: string;
  titleColor?: string;
  titleSize?: string;
  titleFont?: string;
  titleShadow?: boolean;
  subtitleCues?: { text: string; start: number; end: number }[];
  subtitleAlign?: string;
  subtitleColor?: string;
  subtitleSize?: string;
  subtitleFont?: string;
  subtitleShadow?: boolean;
  durationSeconds?: number;
  musicPath?: string;
  // 0-200, percentage of the narration's original recorded volume; 100 = unchanged.
  narrationVolume?: number;
  // 0-100 absolute percentage overriding the automatic music level; undefined/null
  // keeps the automatic behavior (quieter under narration, louder alone).
  musicVolume?: number | null;
  watermarkPath?: string;
  watermarkPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  // End card: a logo + CTA shown after the outro fade, on the already-black
  // frame (see OUTRO_CARD_SECONDS). endCardEnabled is the on/off switch — the
  // logo/text below are only rendered when it's true; endCardText falls back
  // to DEFAULT_END_CARD_TEXT when left blank.
  endCardEnabled?: boolean;
  endCardLogoPath?: string;
  endCardText?: string;
}): Promise<number> {
  if (opts.imagePaths.length === 0) throw new Error("renderKenBurnsVideo: no images provided");
  if (!opts.audioPath && opts.durationSeconds === undefined) {
    throw new Error("renderKenBurnsVideo: durationSeconds is required when audioPath is absent");
  }

  const duration = opts.durationSeconds ?? (await probeDurationSeconds(opts.audioPath!));
  const musicOutroSeconds = opts.musicPath ? MUSIC_OUTRO_SECONDS : 0;
  const hasEndCard = opts.endCardEnabled === true;
  const cardSeconds = hasEndCard ? OUTRO_CARD_SECONDS : 0;
  // "contentEnd" is where the narration/music tail actually finishes and the
  // outro fade-to-black completes — the end card (if any) then holds on that
  // black frame for cardSeconds more before the clip actually ends.
  const contentEnd = duration + musicOutroSeconds;
  const outputDuration = contentEnd + cardSeconds;
  // Clamped so a video shorter than the fade itself just fades from the start
  // instead of computing a negative offset.
  const outroFadeStart = Math.max(0, contentEnd - OUTRO_FADE_SECONDS);
  // Extra tail of frames the base image/video chain needs to generate so
  // there's picture (now solid black past outroFadeStart) covering the full
  // output, including any end-card hold on top of the existing music outro.
  const chainTailSeconds = musicOutroSeconds + cardSeconds;
  const fps = 25;
  const workDir = path.dirname(opts.outputPath);
  const cfg = STYLE_CONFIGS[opts.style ?? DEFAULT_STYLE] ?? STYLE_CONFIGS[DEFAULT_STYLE];

  const segDurs =
    opts.segmentDurations && opts.segmentDurations.length === opts.imagePaths.length
      ? opts.segmentDurations
      : Array.from({ length: opts.imagePaths.length }, () => duration / opts.imagePaths.length);

  const { lines: imageLines, outLabel: imagesOutLabel } = buildMultiImageChain({
    segDurs,
    mediaTypes: opts.mediaTypes ?? [],
    outroSeconds: chainTailSeconds,
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
  // Default gap for a subtitle with no title above it; replaced with a
  // measured value once the title chain (if any) reports its wrapped height.
  let subtitleY = overlayTopY + TITLE_SUBTITLE_GAP;
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
    // Wraps to more than one line push the subtitle down accordingly, instead
    // of the old fixed 90px gap that only fit a single title line — a longer
    // title used to render its 2nd+ line on top of the subtitle.
    const titleFontsize = Math.round(
      TITLE_BASE_FONTSIZE * (CAPTION_SIZE_MULTIPLIERS[opts.titleSize ?? "medium"] ?? 1),
    );
    const titleBlockHeight = titleChain.maxLines * titleFontsize * OVERLAY_LINE_HEIGHT_FACTOR;
    subtitleY = overlayTopY + titleBlockHeight + TITLE_SUBTITLE_PADDING;
  }
  if (opts.subtitleCues && opts.subtitleCues.length > 0) {
    const subtitleChain = await buildOverlayCuesChain({
      cues: opts.subtitleCues,
      duration,
      workDir,
      inLabel: outLabel,
      idPrefix: "subtitle",
      y: subtitleY,
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
  for (let i = 0; i < opts.imagePaths.length; i++) {
    const imagePath = opts.imagePaths[i];
    if ((opts.mediaTypes?.[i] ?? "image") === "video") {
      // Looped indefinitely (same technique as the music input below) so a clip
      // shorter than the segment it's filling (plus crossfade/outro overlap) still
      // has enough frames — trim= in the filter chain cuts it back down.
      args.push("-stream_loop", "-1", "-i", imagePath);
    } else {
      args.push("-loop", "1", "-i", imagePath);
    }
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

  // Looped (like the base images) rather than a single frame: the fade filter
  // applied to it below needs a continuous stream of timestamps to compute its
  // in/out alpha ramp against, not one static frame repeated by overlay's sync.
  let endCardLogoInputIndex: number | null = null;
  if (hasEndCard && opts.endCardLogoPath) {
    args.push("-loop", "1", "-i", opts.endCardLogoPath);
    endCardLogoInputIndex = nextInputIndex++;
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

  // Applied last, after every overlay (captions, titles, watermark) is already
  // composited in — so the whole frame fades together instead of the picture
  // fading while text/logo stay hard-cut on top of it.
  filterLines.push(`[${outLabel}]fade=t=out:st=${outroFadeStart.toFixed(3)}:d=${OUTRO_FADE_SECONDS}:color=black[vout]`);
  outLabel = "vout";

  // End card: composited on top of the now-solid-black [vout], so it never
  // interacts with the fade above — it fades in once the picture has already
  // gone black, holds, then fades back out before the clip ends.
  if (hasEndCard) {
    const cardStart = contentEnd;
    const cardEnd = outputDuration;
    const cardFadeDur = Math.min(END_CARD_TRANSITION_SECONDS, cardSeconds / 2);
    const cardFadeOutStart = Math.max(cardStart, cardEnd - cardFadeDur);

    if (endCardLogoInputIndex !== null) {
      filterLines.push(
        `[${endCardLogoInputIndex}:v]scale=${END_CARD_LOGO_MAX_WIDTH}:${END_CARD_LOGO_MAX_HEIGHT}:force_original_aspect_ratio=decrease,format=yuva420p,` +
          `fade=t=in:st=${cardStart.toFixed(3)}:d=${cardFadeDur.toFixed(3)}:alpha=1,` +
          `fade=t=out:st=${cardFadeOutStart.toFixed(3)}:d=${cardFadeDur.toFixed(3)}:alpha=1[endcardlogo]`,
      );
      // enable=... matters here, not just cosmetically: without it, overlay
      // alpha-blends this image into every frame of the *entire* video (even
      // while invisible before cardStart), which was costly enough over a
      // full-length render to blow past Vercel's 60s function timeout — jobs
      // got killed mid-render and stuck in "processando" forever, since the
      // route's catch block never runs on a hard platform kill.
      filterLines.push(
        `[${outLabel}][endcardlogo]overlay=x=(main_w-overlay_w)/2:y=(main_h-overlay_h)/2-120:` +
          `enable='between(t,${cardStart.toFixed(3)},${cardEnd.toFixed(3)})'[endcardimg]`,
      );
      outLabel = "endcardimg";
    }

    const ctaText = (opts.endCardText && opts.endCardText.trim()) || DEFAULT_END_CARD_TEXT;
    const ctaFontsize = 46;
    const ctaWidthRatios = CAPTION_FONT_WIDTH_RATIOS.poppins;
    const ctaMaxChars = Math.max(6, Math.floor(CAPTION_MAX_WIDTH_PX / (ctaFontsize * ctaWidthRatios.normal)));
    const ctaDisplayText = wrapCaptionText(sanitizeCaptionGlyphs(ctaText), ctaMaxChars);
    const ctaTxtPath = path.join(workDir, "endcard_cta.txt");
    await writeFile(ctaTxtPath, ctaDisplayText, "utf8");
    const ctaTxtEsc = escapeFilterPath(ctaTxtPath);
    const ctaFontEsc = escapeFilterPath(getCaptionFontPath("poppins"));
    const ctaY = endCardLogoInputIndex !== null ? "h/2+140" : "(h-text_h)/2";
    const ctaFadeInEnd = (cardStart + cardFadeDur).toFixed(3);

    filterLines.push(
      `[${outLabel}]drawtext=fontfile='${ctaFontEsc}':textfile='${ctaTxtEsc}':fontsize=${ctaFontsize}:` +
        `fontcolor=white:x=(w-text_w)/2:text_align=center:y=${ctaY}:` +
        `shadowcolor=black@0.65:shadowx=2:shadowy=2:` +
        `alpha='if(lt(t,${ctaFadeInEnd}),(t-${cardStart.toFixed(3)})/${cardFadeDur.toFixed(3)},` +
        `if(gt(t,${cardFadeOutStart.toFixed(3)}),(${cardEnd.toFixed(3)}-t)/${cardFadeDur.toFixed(3)},1))':` +
        `enable='between(t,${cardStart.toFixed(3)},${cardEnd.toFixed(3)})'[endcardtext]`,
    );
    outLabel = "endcardtext";
  }

  let audioMapSpec: string;
  const musicDur = contentEnd.toFixed(3);
  const musicFadeSeconds = OUTRO_FADE_SECONDS;
  const fadeOutStart = outroFadeStart.toFixed(3);
  const narrationVolume = (Math.max(0, opts.narrationVolume ?? 100) / 100).toFixed(3);
  const musicVolumeOverride =
    typeof opts.musicVolume === "number" ? (Math.max(0, opts.musicVolume) / 100).toFixed(3) : null;
  // Every audio branch below finishes (music/narration fade to silence) by
  // contentEnd — apad extends that silence through the end-card hold so the
  // audio track's length still matches the (now longer) video instead of
  // ending early inside the container.
  const audioPad = cardSeconds > 0 ? ",apad" : "";

  if (narrationInputIndex !== null && musicInputIndex !== null) {
    const musicVolume = musicVolumeOverride ?? DEFAULT_MUSIC_VOLUME_WITH_NARRATION.toString();
    filterLines.push(
      `[${musicInputIndex}:a]atrim=0:${musicDur},asetpts=PTS-STARTPTS,volume=${musicVolume},` +
        `afade=t=in:st=0:d=${musicFadeSeconds},afade=t=out:st=${fadeOutStart}:d=${musicFadeSeconds}[music]`,
    );
    filterLines.push(`[${narrationInputIndex}:a]volume=${narrationVolume}[narr]`);
    filterLines.push(
      // duration=longest (not "first"): music now intentionally outlasts the
      // narration by outroSeconds, so the mix must follow music's length, not
      // cut off the moment the narration track ends.
      `[narr][music]amix=inputs=2:duration=longest:dropout_transition=0:normalize=0${audioPad}[aout]`,
    );
    audioMapSpec = "[aout]";
  } else if (narrationInputIndex !== null) {
    // No music outro here, so (unlike the mixed branch above) narration is
    // still playing right up to the end — it needs its own fade to go quiet
    // together with the picture instead of getting cut off under the fade.
    filterLines.push(
      `[${narrationInputIndex}:a]volume=${narrationVolume},afade=t=out:st=${fadeOutStart}:d=${musicFadeSeconds}${audioPad}[narr]`,
    );
    audioMapSpec = "[narr]";
  } else if (musicInputIndex !== null) {
    const musicVolume = musicVolumeOverride ?? DEFAULT_MUSIC_VOLUME_ALONE.toString();
    filterLines.push(
      `[${musicInputIndex}:a]atrim=0:${musicDur},asetpts=PTS-STARTPTS,volume=${musicVolume},` +
        `afade=t=in:st=0:d=${musicFadeSeconds},afade=t=out:st=${fadeOutStart}:d=${musicFadeSeconds}${audioPad}[music]`,
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
    // non-concurrent video. Went past "veryfast" to "ultrafast" after a render
    // (with own-photo scheduling, which fragments the filter graph into more
    // segments) landed at 60.6s — over the limit even at "veryfast". Output is
    // short-form vertical video that gets re-compressed by TikTok/social
    // platforms anyway, so the extra quality tradeoff isn't visually meaningful,
    // and the encode-speed margin is what keeps renders from silently vanishing
    // client-side when they graze the timeout.
    "-preset",
    "ultrafast",
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
