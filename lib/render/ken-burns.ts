import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";
import { path as ffprobePath } from "ffprobe-static";

function probeDurationSeconds(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffprobePath, [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);
    let out = "";
    let err = "";
    proc.stdout.on("data", (d) => (out += d));
    proc.stderr.on("data", (d) => (err += d));
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0) return reject(new Error(`ffprobe failed: ${err.slice(-500)}`));
      const seconds = parseFloat(out.trim());
      if (!Number.isFinite(seconds) || seconds <= 0) return reject(new Error("could not read audio duration"));
      resolve(seconds);
    });
  });
}

/**
 * Renders a single still image into a vertical (1080x1920) Ken Burns zoom-in
 * video, muxed with the given audio track. Video duration matches the audio.
 * Returns the resulting duration in seconds.
 */
export async function renderKenBurnsVideo(opts: {
  imagePath: string;
  audioPath: string;
  outputPath: string;
}): Promise<number> {
  const duration = await probeDurationSeconds(opts.audioPath);
  const fps = 25;
  const frames = Math.max(1, Math.round(duration * fps));
  const filter =
    `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,` +
    `zoompan=z='min(zoom+0.0015,1.3)':d=${frames}:s=1080x1920:fps=${fps}[v]`;

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(ffmpegPath as string, [
      "-y",
      "-loop",
      "1",
      "-i",
      opts.imagePath,
      "-i",
      opts.audioPath,
      "-filter_complex",
      filter,
      "-map",
      "[v]",
      "-map",
      "1:a",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-t",
      String(duration),
      opts.outputPath,
    ]);
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d));
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0) return reject(new Error(`ffmpeg failed: ${stderr.slice(-800)}`));
      resolve();
    });
  });

  return duration;
}
