import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Let phones on the local network load the dev server (npm run dev) and
  // hydrate; Next blocks dev resources for non-localhost origins otherwise.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
  // Revalidating it on every visit held back the shadows by a round trip.
  async headers() {
    return [
      {
        source: "/folder-shadow.png",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
    ];
  },
  images: {
    // folder papers at 85, gallery frames at 90 (see Folder, ProjectView)
    qualities: [75, 85, 90],
    formats: ["image/avif", "image/webp"],
    // Fewer widths: every one is a long URL in each image's srcset, repeated
    // for every folder in the page's HTML.
    deviceSizes: [640, 828, 1200, 2048, 3840],
    imageSizes: [256, 384],
    // media uploaded through the CMS (see lib/blob-field.tsx)
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
};

export default nextConfig;
