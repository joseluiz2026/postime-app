import type { SceneImage } from "./types";

const POOL_SIZE = 12;

/** Fallback stock-photo provider for when Pexels is down/rate-limited (see lib/images/stock.ts). */
export async function searchPixabayImage(query: string): Promise<SceneImage | null> {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) throw new Error("PIXABAY_API_KEY not configured");

  const url =
    `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(query)}` +
    `&image_type=photo&orientation=vertical&safesearch=true&per_page=${POOL_SIZE}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Pixabay API error: ${res.status}`);

  const data = await res.json();
  const hits = data.hits ?? [];
  if (hits.length === 0) return null;

  const hit = hits[Math.floor(Math.random() * hits.length)];

  return {
    url: hit.largeImageURL,
    photographer: hit.user,
    photographerUrl: `https://pixabay.com/users/${encodeURIComponent(hit.user)}-${hit.user_id}/`,
    alt: hit.tags || query,
  };
}
