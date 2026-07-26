import { createAdminClient } from "@/lib/supabase/admin";
import { searchPexelsImage } from "./pexels";
import { searchPixabayImage } from "./pixabay";
import type { SceneImage } from "./types";

function toSearchQuery(text: string): string {
  return text
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 8)
    .join(" ");
}

// Best-effort diagnostic counter, same table/pattern as the Groq→Gemini fallback in
// app/api/roteiros/generate/route.ts — never lets a logging hiccup affect the actual
// fallback flow.
async function logImageFallbackEvent(fromProvider: string, toProvider: string | null, reason: string) {
  try {
    await createAdminClient()
      .from("fallback_events")
      .insert({ from_provider: fromProvider, to_provider: toProvider, reason: reason.slice(0, 500) });
  } catch {
    // diagnostic only
  }
}

/**
 * Pexels is the primary stock-photo source; Pixabay is a fallback for when Pexels is
 * down or its free-tier rate limit (typically 200 req/hour) is exhausted — unlike the
 * Groq→Gemini fallback, Pexels previously had no fallback at all, so a rate-limit hit
 * failed the whole build for that user with no recovery. A chosen theme (see
 * lib/images/themes.ts) fully replaces the content-derived query rather than blending
 * with it — tested empirically that blending gets drowned out by specific content terms.
 */
export async function searchStockImage(
  rawQuery: string,
  opts?: { themeQuery?: string | null },
): Promise<SceneImage | null> {
  const query = opts?.themeQuery || toSearchQuery(rawQuery) || "conteúdo redes sociais";

  try {
    return await searchPexelsImage(query);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const hasPixabay = Boolean(process.env.PIXABAY_API_KEY);
    console.error("[searchStockImage] Pexels failed, falling back to Pixabay:", message);
    await logImageFallbackEvent("pexels", hasPixabay ? "pixabay" : null, message);
    if (!hasPixabay) throw err;

    try {
      return await searchPixabayImage(query);
    } catch (fallbackErr) {
      const fallbackMessage = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      console.error("[searchStockImage] Pixabay fallback also failed:", fallbackMessage);
      await logImageFallbackEvent("pixabay", null, fallbackMessage);
      throw fallbackErr;
    }
  }
}
