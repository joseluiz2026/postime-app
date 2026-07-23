export type CaptionSegment = { text: string; start: number; end: number };

const MIN_PHRASE_SECONDS = 0.6;
const MIN_WORD_SECONDS = 0.15;
const WORDS_PER_PHRASE = 6;

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

/** Escapes a filesystem path for use inside an ffmpeg filtergraph option value. */
export function escapeFilterPath(p: string): string {
  return p.replace(/\\/g, "/").replace(/:/g, "\\:");
}
