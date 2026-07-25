export type SceneImage = {
  url: string;
  photographer: string;
  photographerUrl: string;
  alt: string;
};

const POOL_SIZE = 12;

function toSearchQuery(text: string): string {
  return text
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 8)
    .join(" ");
}

/**
 * Pexels' search is deterministic per query, so always taking the top result
 * (the old `per_page=1` behavior) meant identical/similar-sounding scripts always
 * got the exact same photo — the "images feel repetitive" complaint. Fetching a
 * pool and picking randomly among it fixes that without needing a second provider.
 */
export async function searchPexelsImage(
  rawQuery: string,
  opts?: { themeQuery?: string | null },
): Promise<SceneImage | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) throw new Error("PEXELS_API_KEY not configured");

  // A chosen theme fully replaces the content-derived query rather than blending
  // with it — tested empirically: prepending a theme to a specific content query
  // (e.g. "cars automotive home office coffee laptop") gets drowned out by the
  // more specific content terms and Pexels just returns office photos. Matches
  // the same "auto vs explicit override" convention as musicMoodByTema.
  const query = opts?.themeQuery || toSearchQuery(rawQuery) || "conteúdo redes sociais";
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
