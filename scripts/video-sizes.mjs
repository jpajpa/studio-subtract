// Makes every gallery video light enough to stream. H.264, no sound (the site
// plays them muted), two sizes on Vercel Blob next to the original:
//   "<name>-web.mp4"    at most 1920px on its long side, about 3 Mbps at most;
//                       replaces `video` when the upload is heavy, not H.264 or
//                       has sound (4K HEVC cost every Loho visit 28 MB)
//   "<name>-small.mp4"  at most 1280px, for phones, goes into `small`
// Needs ffmpeg. Safe to re-run: done videos are skipped. Originals stay on Blob.
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
const WEB = { longSide: 1920, crf: 23, maxrate: "3M", bufsize: "6M" };
const SMALL = { longSide: 1280, crf: 26, maxrate: "1.5M", bufsize: "3M" };
const HEAVY_BPS = 3e6;
if (!DRY && !process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN missing (see .env.local)");

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "video-sizes-"));

async function encode(url, out, { longSide, crf, maxrate, bufsize }) {
  await run("ffmpeg", [
    "-v", "error", "-y", "-i", url,
    // fit the long side, keep even dimensions, never upscale
    "-vf", `scale='if(gt(iw,ih),min(${longSide},iw),-2)':'if(gt(iw,ih),-2,min(${longSide},ih))':out_range=tv,format=yuv420p`,
    "-c:v", "libx264", "-preset", "slow", "-crf", `${crf}`, "-maxrate", maxrate, "-bufsize", bufsize, "-profile:v", "high",
    "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
    "-an", "-movflags", "+faststart",
    out,
  ]);
}

async function needsWeb(url) {
  if (/-web\.mp4$/.test(new URL(url).pathname)) return false;
  const { stdout } = await run("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,codec_name:format=size,duration", "-of", "json", url]);
  const { streams, format } = JSON.parse(stdout);
  const video = streams.find((s) => s.codec_type === "video");
  const sound = streams.some((s) => s.codec_type === "audio");
  return video?.codec_name !== "h264" || sound || (format.size * 8) / format.duration > HEAVY_BPS;
}

/** Encodes `url` and returns the new Blob URL, or null if it isn't worth replacing. */
async function make(url, suffix, settings, { label, within }) {
  const src = new URL(url);
  const name = path.basename(src.pathname).replace(/\.[^.]+$/, `-${suffix}.mp4`);
  const out = path.join(tmp, `${label.replace(/\W+/g, "-")}-${name}`);
  await encode(url, out, settings);
  const { size } = await fs.stat(out);
  const line = `${label}: ${path.basename(src.pathname)} → ${name} ${(size / 1e6).toFixed(2)} MB`;
  if (within && size >= within) return console.log(`${line}  (no smaller, kept the upload)`), null;
  if (DRY) return console.log(`${line}  (${out})`), null;
  // next to the original on Blob
  const pathname = decodeURIComponent(src.pathname.slice(1)).replace(/[^/]+$/, name);
  const { url: uploaded } = await put(pathname, await fs.readFile(out), {
    access: "public",
    contentType: "video/mp4",
    allowOverwrite: true,
  });
  console.log(`${line}  ${uploaded}`);
  return uploaded;
}

for (const dir of DIRS) {
  for (const f of (await fs.readdir(dir)).filter((f) => f.endsWith(".yaml"))) {
    const file = path.join(dir, f);
    const label = path.relative(ROOT, file);
    const doc = yaml.load(await fs.readFile(file, "utf8"));
    let changed = false;

    for (const item of doc.media ?? []) {
      const v = item.value;
      if (item.discriminant !== "video" || !v.video) continue;
      // the small copy first, while `video` is still the best source
      const small = v.small || (await make(v.video, "small", SMALL, { label }));
      let video = v.video;
      if (await needsWeb(video)) {
        const head = await fetch(video, { method: "HEAD" });
        const within = Number(head.headers.get("content-length")) || undefined;
        video = (await make(video, "web", WEB, { label, within })) ?? video;
      }
      if (video === v.video && small === (v.small ?? null)) continue;
      // keep the CMS's field order: video, small, poster, alt
      const { video: _v, small: _s, ...rest } = v;
      item.value = { video, ...(small ? { small } : {}), ...rest };
      changed = true;
    }

    if (changed) await fs.writeFile(file, yaml.dump(doc, { lineWidth: -1 }));
  }
}

if (!DRY) await fs.rm(tmp, { recursive: true, force: true });
