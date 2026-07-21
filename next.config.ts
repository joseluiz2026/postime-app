import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["ffmpeg-static", "ffprobe-static"],
  outputFileTracingIncludes: {
    "/api/jobs/render": ["./node_modules/ffmpeg-static/**", "./node_modules/ffprobe-static/**"],
  },
};

export default nextConfig;
