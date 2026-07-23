import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["ffmpeg-static"],
  outputFileTracingIncludes: {
    // ffmpeg-static is the Windows/Mac dev binary and a Linux fallback-of-last-resort
    // (see lib/render/ken-burns.ts); vendor/ffmpeg is the full-featured Linux build
    // downloaded at install time (scripts/setup-ffmpeg.js) that actually has drawtext.
    "/api/jobs/render": ["./node_modules/ffmpeg-static/**", "./vendor/ffmpeg/**"],
  },
};

export default nextConfig;
