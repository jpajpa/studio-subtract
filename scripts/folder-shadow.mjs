// Renders the folder's drop shadows once, as an image, so browsers don't run
// three SVG blur filters per folder on every repaint (slow in WebKit, and
// the cause of stutter on phones). Folder.module.css tints it per folder by
// using it as a mask. Re-run after changing the shape or the shadows:
//
//   node scripts/folder-shadow.mjs
import path from "node:path";
import sharp from "sharp";

// Same as Folder.tsx: the back panel outline in folder space (320 × 261),
// drawn inside a box padded for the shadows.
const BACK_PATH =
  "M0.6 17.4C0.6 8.1 8.1 0.6 17.4 0.6H84.5C93.8 0.6 101.3 8.1 101.3 17.4" +
  "C101.3 26.7 108.8 34.2 118.1 34.2H302.6C311.9 34.2 319.4 41.7 319.4 50.9" +
  "V240.6C319.4 251.7 310.4 260.7 299.3 260.7H20.7C9.6 260.7 0.6 251.7 0.6 240.6Z";
const PAD = { x: 80, top: 50, bottom: 120 };
const W = 320 + 2 * PAD.x;
const H = 261 + PAD.top + PAD.bottom;
const SCALE = 2; // the shadows are soft, so 2× folder units is plenty

// contact shadow + a soft, wide one, in black; the panel itself is in the
// image too, but the folder's own back panel covers it
const svg = (filter, extra = "", wrap = (el) => el) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${W * SCALE}" height="${H * SCALE}" viewBox="${-PAD.x} ${-PAD.top} ${W} ${H}">
  <defs>
    <filter id="s" filterUnits="userSpaceOnUse" x="${-PAD.x}" y="${-PAD.top}" width="${W}" height="${H}">
      ${filter}
    </filter>${extra}
  </defs>
  ${wrap(`<path d="${BACK_PATH}" filter="url(#s)"/>`)}
</svg>`;

const shadows = svg(`
      <feDropShadow dx="0" dy="1" stdDeviation="0.75" flood-opacity="0.22"/>
      <feDropShadow dx="0" dy="12" stdDeviation="8" flood-opacity="0.16"/>
      <feDropShadow dx="0" dy="30" stdDeviation="20" flood-opacity="0.14"/>`);

// A soft rim along the back panel's top edges, under the shadows. The contact
// shadow falls downwards, so on its own it leaves a pale folder's tab melting
// into the pale page; this stands in for an outline stroke, which WebKit
// redraws badly while a folder scales. It fades out past the glass front's
// top (y 59.3) and rounded corners, so the front itself has no outline.
const rim = svg(
  `
      <feMorphology in="SourceAlpha" operator="dilate" radius="0.5"/>
      <feGaussianBlur stdDeviation="0.5"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.25"/></feComponentTransfer>`,
  `
    <linearGradient id="fade" gradientUnits="userSpaceOnUse" x1="0" y1="59" x2="0" y2="80">
      <stop offset="0" stop-color="#fff"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <mask id="top" maskUnits="userSpaceOnUse" x="${-PAD.x}" y="${-PAD.top}" width="${W}" height="${H}">
      <rect x="${-PAD.x}" y="${-PAD.top}" width="${W}" height="${H}" fill="url(#fade)"/>
    </mask>`,
  (el) => `<g mask="url(#top)">${el}</g>`,
);

const out = path.join(process.cwd(), "public/folder-shadow.png");
await sharp(Buffer.from(shadows))
  .composite([{ input: Buffer.from(rim), blend: "dest-over" }])
  // grey + alpha: only the alpha matters, the mask is tinted in CSS
  .toColourspace("b-w")
  .png({ compressionLevel: 9 })
  .toFile(out);
console.log(`wrote ${path.relative(process.cwd(), out)}`);
