// Builds lightweight WebP "papers" for the homepage folders from the raw
// project files in public/work/<slug>. Raw files are never modified.
import { readdir, mkdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import sharp from "sharp";

const run = promisify(execFile);
const SRC = "public/work";
const OUT = "public/media";
const MAX = 960; // long edge, ~3x the largest paper on screen

const IMAGE = /\.(jpe?g|png|webp)$/i;
const VIDEO = /\.(mp4|mov)$/i;

// Specific video frames used in the Sketch comps (seconds).
const FRAME_AT = {
  "sjj/Mockup (5.1, 4.1 Combined 60 BPM).mp4": 2.12,
};

const slugify = (name) =>
  name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

async function toWebp(input, output) {
  await sharp(input)
    .resize(MAX, MAX, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(output);
}

async function videoFrame(input, output, at) {
  const tmp = output.replace(/\.webp$/, ".png");
  await run("ffmpeg", ["-y", "-v", "error", "-ss", String(at), "-i", input, "-frames:v", "1", tmp]);
  await toWebp(tmp, output);
  await run("rm", [tmp]);
}

const projects = (await readdir(SRC, { withFileTypes: true })).filter((d) => d.isDirectory());

for (const { name: slug } of projects) {
  const outDir = path.join(OUT, slug);
  await mkdir(outDir, { recursive: true });

  for (const file of await readdir(path.join(SRC, slug))) {
    const input = path.join(SRC, slug, file);
    const output = path.join(outDir, `${slugify(file)}.webp`);
    try {
      if (IMAGE.test(file)) await toWebp(input, output);
      else if (VIDEO.test(file)) await videoFrame(input, output, FRAME_AT[`${slug}/${file}`] ?? 0);
      else continue;
      console.log("✓", output);
    } catch (err) {
      console.warn("✗", input, "-", err.message.split("\n")[0]);
    }
  }
}
