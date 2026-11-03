import type { Metadata } from "next";
import type { Project } from "./projects";

export const SITE_URL = "https://studiosubtract.com";
const SITE_NAME = "Studio Subtract";
const DESCRIPTION = "Studio Subtract is a creative direction and design studio.";
const DESCRIPTION_MAX = 160;
const SHARE_WIDTH = 1200; // one of images.deviceSizes in next.config.ts

/** Long descriptions cut at a word, for search results and link previews. */
function short(text: string) {
  const line = text.replace(/\s+/g, " ").trim();
  if (line.length <= DESCRIPTION_MAX) return line;
  return `${line.slice(0, DESCRIPTION_MAX - 1).replace(/\s+\S*$/, "")}…`;
}

/** A project's first picture, through the optimizer: uploads can be several MB. */
function shareImage(project?: Project) {
  const media = project?.media[0];
  if (!media) return undefined;
  const width = Math.min(SHARE_WIDTH, media.w);
  return [
    {
      url: `/_next/image?url=${encodeURIComponent(media.src)}&w=${SHARE_WIDTH}&q=75`,
      width,
      height: Math.round((width * media.h) / media.w),
    },
  ];
}

export function pageMetadata({
  description = DESCRIPTION,
  path,
  project,
}: {
  description?: string;
  path: string;
  /** whose first picture a shared link shows */
  project?: Project;
}): Metadata {
  const text = short(description);
  const images = shareImage(project);
  // The studio's name is the title everywhere: the browser tab, the share
  // card, the search result. A page says which one it is through its
  // description, its picture and its address, all of which are still its own.
  // There is no per page name left to pass in, so there is no argument for it
  // either, and nothing can quietly go back to setting one.
  return {
    title: SITE_NAME,
    description: text,
    alternates: { canonical: path },
    openGraph: { title: SITE_NAME, description: text, url: path, siteName: SITE_NAME, type: "website", images },
    twitter: { card: images ? "summary_large_image" : "summary", title: SITE_NAME, description: text, images },
  };
}
