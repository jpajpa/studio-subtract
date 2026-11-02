import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Let phones on the local network load the dev server (npm run dev) and
  // hydrate; Next blocks dev resources for non-localhost origins otherwise.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
  // The 404 for unmatched URLs: the site and the editor have separate root layouts
  experimental: { globalNotFound: true },
  async redirects() {
    // a project's URL with its slug trimmed off: the folders live at /
    return [{ source: "/work", destination: "/", permanent: true }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      // Revalidating it on every visit held back the shadows by a round trip.
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
    // media uploaded through the CMS (see lib/blob-field.tsx): this project's
    // store only, or anyone's Blob images could spend its optimization quota
    remotePatterns: [{ protocol: "https", hostname: "ypahz9dhz03jeuta.public.blob.vercel-storage.com" }],
  },
};

export default nextConfig;
