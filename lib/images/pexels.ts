export type SceneImage = {
  url: string;
  photographer: string;
  photographerUrl: string;
  alt: string;
};

function toSearchQuery(text: string): string {
  return text
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 8)
    .join(" ");
}

export async function searchPexelsImage(rawQuery: string): Promise<SceneImage | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) throw new Error("PEXELS_API_KEY not configured");

  const query = toSearchQuery(rawQuery) || "conteúdo redes sociais";
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=portrait`;
  const res = await fetch(url, { headers: { Authorization: apiKey } });
  if (!res.ok) throw new Error(`Pexels API error: ${res.status}`);

  const data = await res.json();
  const photo = data.photos?.[0];
  if (!photo) return null;

  return {
    url: photo.src.large,
    photographer: photo.photographer,
    photographerUrl: photo.photographer_url,
    alt: photo.alt || query,
  };
}
