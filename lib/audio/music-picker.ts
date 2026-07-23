import { readdir } from "fs/promises";
import path from "path";
import { MUSIC_MOODS, type MusicMood } from "./moods";

/**
 * Picks a random background-music file for the given mood from the curated
 * public/audio/music/<mood>/ folders. `mood` is untrusted client input, so it's
 * validated against MUSIC_MOODS before ever touching a filesystem path.
 */
export async function pickMusicTrack(mood?: string): Promise<string | null> {
  const safeMood: MusicMood = (MUSIC_MOODS as readonly string[]).includes(mood ?? "")
    ? (mood as MusicMood)
    : "motivacional";

  const dir = path.join(process.cwd(), "public", "audio", "music", safeMood);
  try {
    const files = (await readdir(dir)).filter((f) => f.toLowerCase().endsWith(".mp3"));
    if (files.length === 0) return null;
    const pick = files[Math.floor(Math.random() * files.length)];
    return path.join(dir, pick);
  } catch {
    return null;
  }
}
