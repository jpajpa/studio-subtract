import { collection, config, fields, singleton } from "@keystatic/core";
import { blobFile, blobImage } from "./lib/blob-field";

// Content editor at /keystatic (dev server only). Text is saved as files in
// content/; media uploads go to Vercel Blob and the YAML keeps their URLs.

const hex = (label: string, description?: string) =>
  fields.text({
    label,
    description,
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
          label: fields.text({
            label: "Link text",
            description: "Listed under the description, opens the PDF. Leave empty for “PDF”.",
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

/** Which gallery items peek out of the folder, and where. */
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
        "Which gallery items peek out of the folder, top paper first. Positions are in a 320 × 261 folder. Leave empty for an automatic layout of the first three.",
      itemLabel: (p) => `Item ${p.fields.item.value ?? "?"} at ${p.fields.x.value}, ${p.fields.y.value}`,
    },
  );

export default config({
  storage: { kind: "local" },
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
          description: "Listed at the top of the folder, e.g. “Design, Creative Direction”.",
          options: [
            { label: "Creative Direction", value: "cd" },
            { label: "Design", value: "design" },
          ],
          defaultValue: [],
        }),
        colour: fields.object(
          {
            top: hex("Folder top", "Not shown at the moment: folders are white."),
            bottom: hex("Folder bottom", "Tints the project page while its media loads."),
            label: hex("Label text", "Not shown at the moment: folder labels are grey."),
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
