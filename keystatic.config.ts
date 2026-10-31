import { collection, config, fields, singleton } from "@keystatic/core";
import { blobFile, blobImage } from "./lib/blob-field";
import { PERSON_COLOUR } from "./lib/projects";

// Content editor at /keystatic. Text is saved as files in content/: straight
// to disk on the dev server, as commits to GitHub on the live site (sign in
// with GitHub; see docs/keystatic-github.md). Editors save to cms/ branches
// and open a PR; merging it deploys. Media uploads go to Vercel Blob
// and the YAML keeps their URLs.

export const REPO = { owner: "jpajpa", name: "studio-subtract" } as const;

const hex = (label: string, description?: string, defaultValue?: string) =>
  fields.text({
    label,
    description,
    defaultValue,
    validation: { isRequired: true, pattern: { regex: /^#[0-9a-fA-F]{6}$/, message: "A hex colour, e.g. #f98a4c" } },
  });

const itemFile = (p: { discriminant: string; value: unknown }) => {
  const v = p.value as { fields: Record<string, { value: unknown }> };
  const key = { image: "image", video: "video", pdf: "file" }[p.discriminant] ?? "image";
  const file = v.fields[key]?.value as string | { src?: string } | null | undefined;
  const url = typeof file === "string" ? file : file?.src;
  return url ? decodeURIComponent(url.split("/").pop() ?? "") : "";
};

const KIND_LABEL: Record<string, string> = { image: "Image", video: "Video", pdf: "PDF" };

/** Gallery of a project or a person: images, videos and PDFs, uploaded to Blob under `folder`. */
const mediaField = (folder: string) =>
  fields.array(
    fields.conditional(
      fields.select({
        label: "Type",
        options: [
          { label: "Image", value: "image" },
          { label: "Video", value: "video" },
          { label: "PDF", value: "pdf" },
        ],
        defaultValue: "image",
      }),
      {
        image: fields.object({
          image: blobImage({ label: "Image", folder, isRequired: true }),
          alt: fields.text({ label: "Alt text" }),
        }),
        video: fields.object({
          video: blobFile({ label: "Video (mp4)", accept: "video/mp4,video/webm", folder, isRequired: true }),
          small: blobFile({
            label: "Small video",
            description:
              "A lighter copy that phones play. Leave empty: `node --env-file=.env.local scripts/video-sizes.mjs` makes it. Until then the full video plays everywhere.",
            accept: "video/mp4",
            folder,
          }),
          poster: blobImage({
            label: "Still",
            description: "A frame of the video at full size. Shown in the folder and while the video loads.",
            folder,
            isRequired: true,
          }),
          alt: fields.text({ label: "Alt text" }),
        }),
        pdf: fields.object({
          file: blobFile({ label: "PDF", accept: "application/pdf", folder, isRequired: true }),
          cover: blobImage({
            label: "Cover",
            description: "An image of the first page. Shown in the folder and the gallery.",
            folder,
            isRequired: true,
          }),
          alt: fields.text({ label: "Alt text" }),
        }),
      },
    ),
    {
      label: "Gallery",
      description: "Left to right on the page. Uploads keep their full resolution and aspect ratio.",
      itemLabel: (p) => {
        const name = itemFile(p);
        return `${KIND_LABEL[p.discriminant] ?? "Item"}${name ? ` · ${name}` : ""}`;
      },
    },
  );

/** Which gallery items peek out of the folder, and where.
 *
 *  Keep the top paper on item 1. Opening a project flies each gallery frame
 *  out of the paper pointing at it (paperOf in ProjectView), so if the top
 *  paper is not item 1 the first frame has nothing to fly from: it pops in
 *  while the folder's front picture sails to the second frame instead.
 *  Reordering the gallery therefore needs no change here, because the papers
 *  point at positions, not at pictures. */
const folderField = () =>
  fields.array(
    fields.object(
      {
        item: fields.integer({
          label: "Gallery item",
          description: "1 = first item in the gallery",
          defaultValue: 1,
          validation: { isRequired: true, min: 1 },
        }),
        x: fields.integer({ label: "X", defaultValue: 30, validation: { isRequired: true } }),
        y: fields.integer({ label: "Y", defaultValue: 40, validation: { isRequired: true } }),
        w: fields.integer({ label: "Width", defaultValue: 240, validation: { isRequired: true, min: 1 } }),
        h: fields.integer({ label: "Height", defaultValue: 180, validation: { isRequired: true, min: 1 } }),
        rotation: fields.number({ label: "Rotation°", defaultValue: 0, step: 0.1 }),
      },
      { layout: [4, 2, 2, 2, 2, 4] },
    ),
    {
      label: "Folder papers",
      description:
        "Which gallery items peek out of the folder, top paper first. Keep the top one on item 1, so the folder's front picture is the one the project page opens with. Positions are in a 320 × 261 folder. Leave empty for an automatic layout of the first three.",
      itemLabel: (p) => `Item ${p.fields.item.value ?? "?"} at ${p.fields.x.value}, ${p.fields.y.value}`,
    },
  );

export default config({
  storage: process.env.NODE_ENV === "production" ? { kind: "github", repo: REPO } : { kind: "local" },
  ui: {
    brand: { name: "Studio Subtract" },
    navigation: { Site: ["home", "studio"], Work: ["projects"], Studio: ["people"] },
  },

  singletons: {
    home: singleton({
      label: "Home",
      path: "content/home",
      format: { data: "yaml" },
      schema: {
        projects: fields.array(fields.relationship({ label: "Project", collection: "projects" }), {
          label: "Folders",
          description: "Order of the folders on the home page, left to right. Projects not listed go at the end.",
          itemLabel: (p) => p.value ?? "Choose a project",
        }),
      },
    }),
    studio: singleton({
      label: "Studio",
      path: "content/studio",
      format: { data: "yaml" },
      schema: {
        people: fields.array(fields.relationship({ label: "Person", collection: "people" }), {
          label: "Folders",
          description: "Order of the folders on the Studio page, left to right. People not listed go at the end.",
          itemLabel: (p) => p.value ?? "Choose a person",
        }),
      },
    }),
  },

  collections: {
    projects: collection({
      label: "Projects",
      path: "content/projects/*",
      format: { data: "yaml" },
      slugField: "title",
      columns: ["title", "year"],
      schema: {
        title: fields.slug({ name: { label: "Title" }, slug: { label: "URL", description: "studiosubtract.com/work/…" } }),
        year: fields.text({ label: "Year", validation: { isRequired: true } }),
        description: fields.text({ label: "Description", multiline: true }),
        link: fields.object(
          {
            url: fields.url({ label: "Link", description: "Shown under the description. Opens in a new tab." }),
            label: fields.text({ label: "Link text", description: "Leave empty to show the web address." }),
          },
          { label: "Link", layout: [8, 4] },
        ),
        credits: fields.array(
          fields.object({ role: fields.text({ label: "Role" }), name: fields.text({ label: "Name" }) }, { layout: [6, 6] }),
          {
            label: "Credits",
            description: "Collaborators, listed under the description.",
            itemLabel: (p) => [p.fields.role.value, p.fields.name.value].filter(Boolean).join(": ") || "Credit",
          },
        ),
        roles: fields.multiselect({
          label: "Roles",
          description: "Listed at the top of the folder, e.g. “Creative Direction, Design”.",
          options: [
            { label: "Creative Direction", value: "cd" },
            { label: "Design", value: "design" },
          ],
          defaultValue: [],
        }),
        colour: fields.object(
          {
            top: hex("Folder top", "Top of the folder's gradient."),
            bottom: hex("Folder bottom", "Bottom of the folder's gradient; tints the glass, shadows and the project page while its media loads."),
            label: hex("Label text", "Colour of the folder's labels."),
          },
          { label: "Colours", layout: [4, 4, 4] },
        ),

        media: mediaField("projects"),
        folder: folderField(),
      },
    }),

    people: collection({
      label: "People",
      path: "content/people/*",
      format: { data: "yaml" },
      slugField: "name",
      columns: ["name", "role"],
      schema: {
        name: fields.slug({ name: { label: "Name" }, slug: { label: "URL", description: "studiosubtract.com/studio/…" } }),
        role: fields.text({ label: "Role", description: "Listed at the top of the folder, e.g. “Designer”." }),
        bio: fields.text({ label: "Bio", multiline: true }),
        colour: fields.object(
          {
            top: hex("Folder top", "Top of the folder's gradient.", PERSON_COLOUR.top),
            bottom: hex("Folder bottom", "Bottom of the folder's gradient; tints the glass and shadows.", PERSON_COLOUR.bottom),
            label: hex("Label text", "Colour of the folder's labels.", PERSON_COLOUR.label),
          },
          { label: "Colours", layout: [4, 4, 4] },
        ),
        link: fields.object(
          {
            url: fields.url({ label: "Link", description: "Shown under the bio. Opens in a new tab." }),
            label: fields.text({ label: "Link text", description: "Leave empty to show the web address." }),
          },
          { label: "Link", layout: [8, 4] },
        ),
        media: mediaField("people"),
        folder: folderField(),
      },
    }),
  },
});
