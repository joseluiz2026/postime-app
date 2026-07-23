#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports -- plain CJS install script, runs standalone via `node`. */
// Downloads a full-featured static ffmpeg binary for Linux production builds.
// ffmpeg-static's bundled Linux binary (sourced from johnvansickle.com) lacks
// libfreetype, so the `drawtext` filter used to burn in captions doesn't
// exist there — every render silently failed on Vercel while working fine
// locally on Windows (ffmpeg-static's Windows binary is a different,
// full-featured gyan.dev build). This grabs BtbN's Linux GPL build instead,
// which does include drawtext + xfade + libfreetype. Local dev on any other
// platform is untouched and keeps using ffmpeg-static as before.
const fs = require("fs");
const os = require("os");
const path = require("path");
const https = require("https");
const { execFileSync } = require("child_process");

if (process.platform !== "linux") {
  process.exit(0);
}

const VENDOR_DIR = path.join(__dirname, "..", "vendor", "ffmpeg");
const BINARY_PATH = path.join(VENDOR_DIR, "ffmpeg");
const DOWNLOAD_URL =
  "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz";
const MIN_EXPECTED_SIZE = 50 * 1024 * 1024;

function download(url, dest, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirectsLeft > 0) {
          file.close();
          fs.unlinkSync(dest);
          download(res.headers.location, dest, redirectsLeft - 1).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Download failed: HTTP ${res.statusCode}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
      })
      .on("error", reject);
  });
}

async function main() {
  if (fs.existsSync(BINARY_PATH) && fs.statSync(BINARY_PATH).size > MIN_EXPECTED_SIZE) {
    console.log("[setup-ffmpeg] Binary already present, skipping.");
    return;
  }

  fs.mkdirSync(VENDOR_DIR, { recursive: true });
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ffmpeg-dl-"));
  const archivePath = path.join(tmpDir, "ffmpeg.tar.xz");

  try {
    console.log("[setup-ffmpeg] Downloading full-featured ffmpeg build for Linux...");
    await download(DOWNLOAD_URL, archivePath);

    console.log("[setup-ffmpeg] Extracting...");
    execFileSync("tar", ["-xJf", archivePath, "-C", tmpDir, "--strip-components=2", "--wildcards", "*/bin/ffmpeg"]);

    const extracted = path.join(tmpDir, "ffmpeg");
    if (!fs.existsSync(extracted) || fs.statSync(extracted).size < MIN_EXPECTED_SIZE) {
      throw new Error("extracted binary missing or unexpectedly small");
    }
    fs.copyFileSync(extracted, BINARY_PATH);
    fs.chmodSync(BINARY_PATH, 0o755);
    console.log("[setup-ffmpeg] Done:", BINARY_PATH);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  // Don't fail the whole `npm install` over this — the app falls back to
  // ffmpeg-static's binary at runtime (captions just won't render) rather
  // than the deploy being blocked entirely.
  console.error("[setup-ffmpeg] Failed, will fall back to ffmpeg-static at runtime:", err.message);
});
