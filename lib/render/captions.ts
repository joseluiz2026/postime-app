export type CaptionSegment = { text: string; start: number; end: number };

const MIN_PHRASE_SECONDS = 0.6;
const MIN_WORD_SECONDS = 0.15;
const WORDS_PER_PHRASE = 6;

const READING_WORDS_PER_MINUTE = 150;
const MIN_READING_DURATION_SECONDS = 4;
const MAX_READING_DURATION_SECONDS = 90;

/**
 * Estimates how long a video should run when there's no narration audio to
 * probe (the no-audio fallback: the roteiro text is shown as captions across
 * the whole video instead of being synced to a recording). Paced at a typical
 * spoken rate, clamped to a sane render range.
 */
export function estimateReadingDurationSeconds(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const seconds = (words / READING_WORDS_PER_MINUTE) * 60;
  return Math.min(MAX_READING_DURATION_SECONDS, Math.max(MIN_READING_DURATION_SECONDS, seconds));
}

/**
 * Splits narration text into caption chunks with start/end times proportional
 * to each chunk's character length. There's no forced-alignment/STT step in
 * this pipeline (narration audio has no transcript timing data), so this is
 * the only viable way to sync captions to audio duration.
 */
export function buildCaptionSegments(
  text: string,
  durationSeconds: number,
  mode: "phrase" | "word",
): CaptionSegment[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0 || durationSeconds <= 0) return [];

  const chunks = mode === "word" ? words : groupWords(words, WORDS_PER_PHRASE);
  const minDur = mode === "word" ? MIN_WORD_SECONDS : MIN_PHRASE_SECONDS;
  const weights = chunks.map((c) => c.length + 1);
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  let lengths = weights.map((w) => Math.max((w / totalWeight) * durationSeconds, minDur));
  const sum = lengths.reduce((a, b) => a + b, 0);
  if (sum > durationSeconds) {
    const scale = durationSeconds / sum;
    lengths = lengths.map((d) => d * scale);
  }

  let t = 0;
  return chunks.map((c, i) => {
    const start = t;
    const end = i === chunks.length - 1 ? durationSeconds : Math.min(t + lengths[i], durationSeconds);
    t = end;
    return { text: c, start, end };
  });
}

function groupWords(words: string[], size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < words.length; i += size) out.push(words.slice(i, i + size).join(" "));
  return out;
}

/**
 * Greedily wraps text into lines of at most `maxCharsPerLine` characters,
 * joined with `\n` (drawtext renders literal newlines in a textfile as
 * multiple lines). ffmpeg's drawtext has no built-in word-wrap — without
 * this, long captions run past the video's edges instead of breaking.
 */
export function wrapCaptionText(text: string, maxCharsPerLine: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";

  const lines: string[] = [];
  let current = words[0];
  for (const word of words.slice(1)) {
    if (current.length + 1 + word.length <= maxCharsPerLine) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }
  lines.push(current);
  return lines.join("\n");
}

/** Escapes a filesystem path for use inside an ffmpeg filtergraph option value. */
export function escapeFilterPath(p: string): string {
  return p.replace(/\\/g, "/").replace(/:/g, "\\:");
}

/**
 * Evenly splits narration text into `n` word-count-balanced chunks, used to derive
 * one image search query per ~3s image segment (unrelated to caption timing, which
 * uses buildCaptionSegments instead — the two run at different granularities).
 */
export function splitTextIntoChunks(text: string, n: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0 || n <= 0) return [];
  if (n === 1) return [words.join(" ")];

  const base = Math.floor(words.length / n);
  const extra = words.length % n;
  const chunks: string[] = [];
  let idx = 0;
  for (let i = 0; i < n; i++) {
    const size = base + (i < extra ? 1 : 0);
    if (size === 0) {
      chunks.push(chunks[chunks.length - 1] ?? words.join(" "));
      continue;
    }
    chunks.push(words.slice(idx, idx + size).join(" "));
    idx += size;
  }
  return chunks;
}
