// Project shapes the site renders. Content comes from the CMS (see
// keystatic.config.ts and lib/cms.ts); this file has no server code so client
// components can import it.

/** What the studio did on a project; shown as the folder's tag. */
export type Role = "cd" | "design";

export const ROLES: { id: Role; label: string }[] = [
  { id: "cd", label: "Creative Direction" },
  { id: "design", label: "Design" },
];

/** A folder's tag: circle, square, or triangle for both roles. */
export type Tag = Role | "both";

export const TAGS: { id: Tag; label: string }[] = [
  { id: "cd", label: "Creative Direction" },
  { id: "design", label: "Design" },
  { id: "both", label: "CD+D" },
];

export const tagOf = (roles: Role[]): Tag | null =>
  roles.includes("cd") && roles.includes("design") ? "both" : (roles[0] ?? null);

/** One gallery item at its full size. Videos use their still for `src`. */
export type Media = {
  kind: "image" | "video";
  src: string;
  video?: string;
  w: number;
  h: number;
  alt: string;
};

/** A gallery item peeking out of the folder, in folder space (320 × 285). */
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

export type Project = {
  slug: string;
  title: string;
  year: string;
  description: string;
  link?: { url: string; label: string };
  credits: { role: string; name: string }[];
  /** the project's own color as a [top, bottom] gradient; tints the back
   *  panel, the glass and the shadows */
  fill: [string, string];
  /** label color */
  text: string;
  roles: Role[];
  media: Media[];
  /** bottom → top */
  papers: Paper[];
};
