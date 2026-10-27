import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Let phones on the local network load the dev server (npm run dev) and
  // hydrate; Next blocks dev resources for non-localhost origins otherwise.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
  images: {
    // folder papers at 85, gallery frames at 90 (see Folder, ProjectView)
    qualities: [75, 85, 90],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
