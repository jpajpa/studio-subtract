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

const MEDIA = { folder: "projects" };

export default config({
  storage: { kind: "local" },
  ui: {
    brand: { name: "Studio Subtract" },
    navigation: { Site: ["home"], Work: ["projects"] },
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
        roles: fields.multiselect({
          label: "Roles",
          description: "Shown as the dots on the folder.",
          options: [
            { label: "Creative Direction", value: "cd" },
            { label: "Design", value: "design" },
          ],
          defaultValue: [],
        }),
        colour: fields.object(
          {
            top: hex("Folder top"),
            bottom: hex("Folder bottom", "Also tints the glass and the shadows."),
            label: hex("Label text"),
          },
          { label: "Colours", layout: [4, 4, 4] },
        ),

        media: fields.array(
          fields.conditional(
            fields.select({
              label: "Type",
              options: [
                { label: "Image", value: "image" },
                { label: "Video", value: "video" },
              ],
              defaultValue: "image",
            }),
            {
              image: fields.object({
                image: blobImage({ label: "Image", ...MEDIA, isRequired: true }),
                alt: fields.text({ label: "Alt text" }),
              }),
              video: fields.object({
                video: blobFile({ label: "Video (mp4)", accept: "video/mp4,video/webm", ...MEDIA, isRequired: true }),
                poster: blobImage({
                  label: "Still",
                  description: "A frame of the video at full size. Shown in the folder and while the video loads.",
                  ...MEDIA,
                  isRequired: true,
                }),
                alt: fields.text({ label: "Alt text" }),
              }),
            },
          ),
          {
            label: "Gallery",
            description: "Left to right on the project page. Uploads keep their full resolution and aspect ratio.",
            itemLabel: (p) => {
              const v = p.value as unknown as { fields: Record<string, { value: unknown }> };
              const file = v.fields[p.discriminant === "video" ? "video" : "image"]?.value as
                | string
                | { src?: string }
                | null
                | undefined;
              const url = typeof file === "string" ? file : file?.src;
              const name = url ? decodeURIComponent(url.split("/").pop() ?? "") : "";
              return `${p.discriminant === "video" ? "Video" : "Image"}${name ? ` · ${name}` : ""}`;
            },
          },
        ),

        folder: fields.array(
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
              "Which gallery items peek out of the folder on the home page, top paper first. Positions are in a 320 × 285 folder. Leave empty for an automatic layout of the first three.",
            itemLabel: (p) => `Item ${p.fields.item.value ?? "?"} at ${p.fields.x.value}, ${p.fields.y.value}`,
          },
        ),
      },
    }),
  },
});
