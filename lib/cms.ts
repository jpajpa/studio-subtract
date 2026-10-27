// Server only: reads CMS content from the repo and measures media.
import path from "node:path";
import { cache } from "react";
import { createReader } from "@keystatic/core/reader";
import sharp from "sharp";
import config from "@/keystatic.config";
import type { Media, Paper, Project, Role } from "./projects";

const reader = createReader(process.cwd(), config);

/** Pixel size of a file in public/, upright (EXIF rotation applied). */
async function measure(src: string): Promise<[number, number]> {
  const meta = await sharp(path.join(process.cwd(), "public", src)).metadata();
  const w = meta.autoOrient?.width ?? meta.width ?? 4;
  const h = meta.autoOrient?.height ?? meta.height ?? 3;
  return [w, h];
}

// Fan used when a project has no folder papers set: up to three items, top
// first, each fitted to its own aspect ratio.
const AUTO = [
  { x: 64, y: 30, r: 1.2 },
  { x: 22, y: 52, r: -1.5 },
  { x: 40, y: 78, r: 0 },
];
const AUTO_BOX = { w: 240, h: 175 };

function autoPapers(media: Media[]): Paper[] {
  return media
    .slice(0, AUTO.length)
    .map((m, i) => {
      const k = Math.min(AUTO_BOX.w / m.w, AUTO_BOX.h / m.h);
      const w = Math.round(m.w * k);
      const h = Math.round(m.h * k);
      const { x, y, r } = AUTO[i];
      return { media: i, src: m.src, x: Math.min(x, 310 - w), y, w, h, r };
    })
    .reverse();
}

export const getProjects = cache(async (): Promise<Project[]> => {
  const [entries, home] = await Promise.all([
    reader.collections.projects.all(),
    reader.singletons.home.read(),
  ]);

  const projects = await Promise.all(
    entries.map(async ({ slug, entry }): Promise<Project> => {
      const media = (
        await Promise.all(
          entry.media.map(async (item): Promise<Media | null> => {
            const still = item.discriminant === "video" ? item.value.poster : item.value.image;
            if (!still) return null;
            const [w, h] = await measure(still);
            return {
              kind: item.discriminant,
              src: still,
              video: item.discriminant === "video" ? (item.value.video ?? undefined) : undefined,
              w,
              h,
              alt: item.value.alt,
            };
          }),
        )
      ).filter((m): m is Media => m !== null);

      // the CMS lists papers top first; the folder draws bottom → top
      const papers: Paper[] = entry.folder
        .filter((p) => p.item !== null && media[p.item - 1])
        .map((p) => ({
          media: p.item! - 1,
          src: media[p.item! - 1].src,
          x: p.x ?? 0,
          y: p.y ?? 0,
          w: p.w ?? 1,
          h: p.h ?? 1,
          r: p.rotation ?? 0,
        }))
        .reverse();

      return {
        slug,
        title: entry.title,
        year: entry.year,
        description: entry.description,
        fill: [entry.colour.top, entry.colour.bottom],
        text: entry.colour.label,
        roles: entry.roles as Role[],
        media,
        papers: papers.length ? papers : autoPapers(media),
      };
    }),
  );

  // home order first, then anything not listed
  const order = (home?.projects ?? []).filter((s): s is string => !!s);
  const rank = (slug: string) => {
    const i = order.indexOf(slug);
    return i === -1 ? order.length : i;
  };
  return projects.sort((a, b) => rank(a.slug) - rank(b.slug) || a.title.localeCompare(b.title));
});
