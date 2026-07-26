// Pure math shared by the client (photo-assignment preview) and the render
// route (actual ffmpeg segment count) — must stay in sync, or the "N imagens
// necessárias" shown before render could drift from what the render actually builds.

export const MAX_IMAGE_SEGMENTS = 30;
// Padding added to narration/caption duration before splitting into scenes — gives
// the scene count a little slack instead of exactly matching the spoken content.
export const SCENE_COUNT_PADDING_SECONDS = 6;

export function computeSegmentCount(durationSeconds: number, sceneSeconds: number): number {
  return Math.max(
    1,
    Math.min(MAX_IMAGE_SEGMENTS, Math.round((durationSeconds + SCENE_COUNT_PADDING_SECONDS) / sceneSeconds)),
  );
}
