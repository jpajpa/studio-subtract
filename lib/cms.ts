// Server only: reads CMS content from the repo. Media lives on Vercel Blob;
// the CMS stores each image's URL and pixel size.
import { cache } from "react";
import { createReader } from "@keystatic/core/reader";
import config from "@/keystatic.config";
import { categoryOf, type Media, type Paper, type Project, type Role } from "./projects";

const reader = createReader(process.cwd(), config);

/** A link's default text: the address without scheme or "www.", and without
 *  the path when it is only a query (youtube.com/watch?v=… → youtube.com). */
function address(url: string) {
  const u = new URL(url);
  const host = u.hostname.replace(/^www\./, "");
  const path = u.search ? "" : u.pathname.replace(/\/$/, "");
  return host + path;
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

// Shapes of the CMS fields both projects and people share
type MediaEntry = Awaited<ReturnType<typeof reader.collections.projects.all>>[number]["entry"]["media"][number];
type FolderEntry = Awaited<ReturnType<typeof reader.collections.projects.all>>[number]["entry"]["folder"][number];

function mediaOf(items: readonly MediaEntry[]): Media[] {
  return items
    .map((item): Media | null => {
      if (item.discriminant === "pdf") {
        const { file, cover, label, alt } = item.value;
        if (!file || !cover) return null;
        return { kind: "pdf", src: cover.src, pdf: { url: file, label: label || "PDF" }, w: cover.width, h: cover.height, alt };
      }
      const still = item.discriminant === "video" ? item.value.poster : item.value.image;
      if (!still) return null;
      return {
        kind: item.discriminant,
        src: still.src,
        video: item.discriminant === "video" ? (item.value.video ?? undefined) : undefined,
        w: still.width,
        h: still.height,
        alt: item.value.alt,
      };
    })
    .filter((m): m is Media => m !== null);
}

function papersOf(folder: readonly FolderEntry[], media: Media[]): Paper[] {
  // the CMS lists papers top first; the folder draws bottom → top
  const papers: Paper[] = folder
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
  return papers.length ? papers : autoPapers(media);
}

/** Sorts by a CMS order list first, then anything not listed by title. */
function ordered(items: Project[], order: readonly (string | null)[] | undefined) {
  const list = (order ?? []).filter((s): s is string => !!s);
  const rank = (slug: string) => {
    const i = list.indexOf(slug);
    return i === -1 ? list.length : i;
  };
  return items.sort((a, b) => rank(a.slug) - rank(b.slug) || a.title.localeCompare(b.title));
}

const linkOf = (link: { url: string | null; label: string }) =>
  link.url ? { url: link.url, label: link.label || address(link.url) } : undefined;

export const getProjects = cache(async (): Promise<Project[]> => {
  const [entries, home] = await Promise.all([
    reader.collections.projects.all(),
    reader.singletons.home.read(),
  ]);

  const projects = entries.map(({ slug, entry }): Project => {
    const media = mediaOf(entry.media);
    return {
      slug,
      title: entry.title,
      year: entry.year,
      category: categoryOf(entry.roles as Role[]),
      description: entry.description,
      link: linkOf(entry.link),
      credits: entry.credits.filter((c) => c.role || c.name),
      fill: [entry.colour.top, entry.colour.bottom],
      text: entry.colour.label,
      media,
      papers: papersOf(entry.folder, media),
    };
  });

  return ordered(projects, home?.projects);
});

// people have no colour of their own: white folders, grey labels
const PERSON_FILL: [string, string] = ["#ffffff", "#f2f2f2"];
const PERSON_TEXT = "#3b3b3b";

/** The Studio page's folders, one per person. */
export const getPeople = cache(async (): Promise<Project[]> => {
  const [entries, studio] = await Promise.all([
    reader.collections.people.all(),
    reader.singletons.studio.read(),
  ]);

  const people = entries.map(({ slug, entry }): Project => {
    const media = mediaOf(entry.media);
    return {
      slug,
      title: entry.name,
      year: "",
      category: entry.role,
      description: entry.bio,
      link: linkOf(entry.link),
      credits: [],
      fill: PERSON_FILL,
      text: PERSON_TEXT,
      media,
      papers: papersOf(entry.folder, media),
    };
  });

  return ordered(people, studio?.people);
});
