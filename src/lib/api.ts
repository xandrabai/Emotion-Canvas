const API_URL = import.meta.env.VITE_API_URL as string;

export type MatchedArtwork = {
  id: number;
  imageUrl: string;
};

export type ArtworkMeta = {
  title: string | null;
  artist: string | null;
  date: string | null;
  genre: string | null;
};

async function postArtworks(path: string, body: unknown): Promise<MatchedArtwork[]> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`${path} failed with status ${res.status}`);
  }
  const data: { artworks: { id: number; image_url: string }[] } = await res.json();
  return data.artworks.map((a) => ({ id: a.id, imageUrl: a.image_url }));
}

export function matchArtworks(
  valence: number,
  arousal: number,
  excludeIds: number[] = []
): Promise<MatchedArtwork[]> {
  return postArtworks("/api/match", { valence, arousal, exclude_ids: excludeIds });
}

export function defaultSet(
  excludeIds: number[] = [],
  matchCount = 5
): Promise<MatchedArtwork[]> {
  return postArtworks("/api/default-set", { exclude_ids: excludeIds, match_count: matchCount });
}

export async function getArtworkMeta(id: number): Promise<ArtworkMeta> {
  const res = await fetch(`${API_URL}/api/artwork/${id}/meta`);
  if (!res.ok) {
    throw new Error(`/api/artwork/${id}/meta failed with status ${res.status}`);
  }
  return res.json();
}
