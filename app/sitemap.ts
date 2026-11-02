import type { MetadataRoute } from "next";
import { getPeople, getProjects } from "@/lib/cms";
import { SITE_URL } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projects, people] = await Promise.all([getProjects(), getPeople()]);
  return [
    "/",
    "/studio",
    "/contact",
    ...projects.map((p) => `/work/${p.slug}`),
    ...people.map((p) => `/studio/${p.slug}`),
  ].map((path) => ({ url: `${SITE_URL}${path === "/" ? "" : path}` }));
}
