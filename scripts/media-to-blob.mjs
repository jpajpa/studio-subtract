// One-off: uploads project media still stored in public/ to Vercel Blob and
// rewrites content/projects/*.yaml to point at it. Safe to re-run: items that
// already have a Blob URL are skipped.
//
//   node --env-file=.env.local scripts/media-to-blob.mjs
import fs from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import * as yaml from "js-yaml";
import sharp from "sharp";

const ROOT = process.cwd();
const DIR = path.join(ROOT, "content/projects");
if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN missing (see .env.local)");

const local = (v) => typeof v === "string" && v.startsWith("/");

async function upload(src, slug, name) {
  const file = path.join(ROOT, "public", src);
  const body = await fs.readFile(file);
  const { url } = await put(`projects/${slug}/${name}${path.extname(src)}`, body, {
    access: "public",
    allowOverwrite: true,
    multipart: body.length > 20 * 1024 * 1024,
  });
  console.log(`  ${src} → ${url}`);
  return url;
}

async function image(src, slug, name) {
  const meta = await sharp(path.join(ROOT, "public", src)).metadata();
  return {
    src: await upload(src, slug, name),
    width: meta.autoOrient?.width ?? meta.width,
    height: meta.autoOrient?.height ?? meta.height,
  };
}

for (const f of (await fs.readdir(DIR)).filter((f) => f.endsWith(".yaml"))) {
  const slug = f.replace(/\.yaml$/, "");
  const doc = yaml.load(await fs.readFile(path.join(DIR, f), "utf8"));
  let changed = false;
  console.log(slug);

  for (const [i, item] of (doc.media ?? []).entries()) {
    const v = item.value;
    if (item.discriminant === "image" && local(v.image)) {
      v.image = await image(v.image, slug, `${i + 1}`);
      changed = true;
    }
    if (item.discriminant === "video") {
      if (local(v.video)) (v.video = await upload(v.video, slug, `${i + 1}`)), (changed = true);
      if (local(v.poster)) (v.poster = await image(v.poster, slug, `${i + 1}-still`)), (changed = true);
    }
  }

  if (changed) await fs.writeFile(path.join(DIR, f), yaml.dump(doc, { lineWidth: -1 }));
}
