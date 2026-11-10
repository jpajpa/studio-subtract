import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    // /archive is unlisted: no nav link, not in the sitemap, not crawled
    rules: { userAgent: "*", allow: "/", disallow: ["/keystatic", "/api/", "/archive"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
