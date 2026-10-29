// Makes the light copy of every gallery video that lacks one: H.264, at most
// 1280px on its long side, no sound. Phones' gallery plays it instead of the
// full upload (4K videos made phones stutter).
// The copy goes to Vercel Blob next to the original as "<name>-small.mp4" and
// its URL into the entry's `small` field. Needs ffmpeg. Safe to re-run: videos
// that already have a copy are skipped.
//
//   node --env-file=.env.local scripts/video-sizes.mjs
//   node scripts/video-sizes.mjs --dry   (encode into a temp folder only)
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { put } from "@vercel/blob";
import * as yaml from "js-yaml";

const run = promisify(execFile);
const ROOT = process.cwd();
const DIRS = ["content/projects", "content/people"].map((d) => path.join(ROOT, d));
const DRY = process.argv.includes("--dry");
const LONG_SIDE = 1280;
if (!DRY && !process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN missing (see .env.local)");

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "video-sizes-"));

async function encode(url, out) {
  await run("ffmpeg", [
    "-v", "error", "-y", "-i", url,
    // fit the long side, keep even dimensions, never upscale
    "-vf", `scale='if(gt(iw,ih),min(${LONG_SIDE},iw),-2)':'if(gt(iw,ih),-2,min(${LONG_SIDE},ih))':out_range=tv,format=yuv420p`,
    "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-profile:v", "high",
    "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
    "-an", "-movflags", "+faststart",
    out,
  ]);
}

for (const dir of DIRS) {
  for (const f of (await fs.readdir(dir)).filter((f) => f.endsWith(".yaml"))) {
    const file = path.join(dir, f);
    const doc = yaml.load(await fs.readFile(file, "utf8"));
    let changed = false;

    for (const item of doc.media ?? []) {
      const v = item.value;
      if (item.discriminant !== "video" || !v.video || v.small) continue;
      const src = new URL(v.video);
      const name = path.basename(src.pathname).replace(/\.[^.]+$/, "-small.mp4");
      const out = path.join(tmp, `${path.basename(dir)}-${f.replace(/\.yaml$/, "")}-${name}`);
      await encode(v.video, out);
      const { size } = await fs.stat(out);
      const label = `${path.relative(ROOT, file)}: ${path.basename(src.pathname)} → ${(size / 1e6).toFixed(2)} MB`;
      if (DRY) {
        console.log(`${label}  (${out})`);
        continue;
      }
      // next to the original on Blob
      const pathname = decodeURIComponent(src.pathname.slice(1)).replace(/[^/]+$/, name);
      const { url } = await put(pathname, await fs.readFile(out), {
        access: "public",
        contentType: "video/mp4",
        allowOverwrite: true,
      });
      console.log(`${label}  ${url}`);
      // keep the CMS's field order: video, small, poster, alt
      item.value = Object.fromEntries(
        Object.entries(v).flatMap(([k, val]) => (k === "video" ? [[k, val], ["small", url]] : [[k, val]])),
      );
      changed = true;
    }

    if (changed) await fs.writeFile(file, yaml.dump(doc, { lineWidth: -1 }));
  }
}

if (!DRY) await fs.rm(tmp, { recursive: true, force: true });
