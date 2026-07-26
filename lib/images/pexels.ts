import type { SceneImage } from "./types";

const POOL_SIZE = 12;

/**
 * Pexels' search is deterministic per query, so always taking the top result
 * (the old `per_page=1` behavior) meant identical/similar-sounding scripts always
 * got the exact same photo — the "images feel repetitive" complaint. Fetching a
 * pool and picking randomly among it fixes that without needing a second provider.
 */
export async function searchPexelsImage(query: string): Promise<SceneImage | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) throw new Error("PEXELS_API_KEY not configured");

  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${POOL_SIZE}&orientation=portrait`;
  const res = await fetch(url, { headers: { Authorization: apiKey } });
  if (!res.ok) throw new Error(`Pexels API error: ${res.status}`);

  const data = await res.json();
  const photos = data.photos ?? [];
  if (photos.length === 0) return null;

  const photo = photos[Math.floor(Math.random() * photos.length)];

  return {
    url: photo.src.large,
    photographer: photo.photographer,
    photographerUrl: photo.photographer_url,
    alt: photo.alt || query,
  };
}
