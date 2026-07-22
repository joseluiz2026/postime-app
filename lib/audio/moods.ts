export const MUSIC_MOODS = ["motivacional", "calmo", "corporativo", "animado"] as const;

export type MusicMood = (typeof MUSIC_MOODS)[number];
