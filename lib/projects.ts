// Project and people shapes the site renders. Content comes from the CMS (see
// keystatic.config.ts and lib/cms.ts); this file has no server code so client
// components can import it.

/** What the studio did on a project; listed on the folder's front. */
export type Role = "cd" | "design";

// in the order they're listed, as in Sketch "Home, Folder v2"
export const ROLES: { id: Role; label: string }[] = [
  { id: "design", label: "Design" },
  { id: "cd", label: "Creative Direction" },
];

/** A project's category line, e.g. "Design, Creative Direction". */
export const categoryOf = (roles: Role[]) =>
  ROLES.filter((r) => roles.includes(r.id))
    .map((r) => r.label)
    .join(", ");

/** One gallery item at its full size. Videos use their still for `src`,
 *  PDFs the image of their first page. */
export type Media = {
  kind: "image" | "video" | "pdf";
  src: string;
  video?: string;
  /** the PDF itself and its link text */
  pdf?: { url: string; label: string };
  w: number;
  h: number;
  alt: string;
};

/** A gallery item peeking out of the folder, in folder space (320 × 261). */
export type Paper = {
  /** index into the project's media */
  media: number;
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** resting rotation in degrees */
  r: number;
};

/**
 * A folder and the page it opens: a project on Work, or a person on Studio
 * (title = name, category = role).
 */
export type Project = {
  slug: string;
  title: string;
  /** empty for people */
  year: string;
  /** the folder's top line */
  category: string;
  description: string;
  link?: { url: string; label: string };
  credits: { role: string; name: string }[];
  /** the project's own color as a [top, bottom] gradient; tints the back
   *  panel, the glass, the shadows and the project page's media placeholders */
  fill: [string, string];
  /** label color */
  text: string;
  media: Media[];
  /** bottom → top */
  papers: Paper[];
};

/** Where a set of folders lives: the folder list, and the base of each page's URL. */
export type Section = { id: "work" | "studio"; home: string; base: string; label: string };

export const WORK: Section = { id: "work", home: "/", base: "/work", label: "Work" };
export const STUDIO: Section = { id: "studio", home: "/studio", base: "/studio", label: "Studio" };
export const SECTIONS = { work: WORK, studio: STUDIO };
