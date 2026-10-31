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

// A contact shadow, then two soft ones that fall below the folder, in black.
// The soft ones are cast from a narrower folder (eroded sideways), so they
// pool underneath, as under a folder lying on a desk, instead of hazing out
// past its sides.
const soft = (narrow, blur, dy, opacity) => `
      <feMorphology in="SourceAlpha" operator="erode" radius="${narrow} 0"/>
      <feGaussianBlur stdDeviation="${blur}"/>
      <feOffset dy="${dy}"/>
      <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${opacity} 0"/>`;
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W * SCALE}" height="${H * SCALE}" viewBox="${-PAD.x} ${-PAD.top} ${W} ${H}">
  <defs>
    <filter id="s" filterUnits="userSpaceOnUse" x="${-PAD.x}" y="${-PAD.top}" width="${W}" height="${H}">
      <feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/>
      <feOffset dy="1.5"/>
      <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.18 0" result="contact"/>
      ${soft(16, 8, 12, 0.06)}
      <feComposite in2="contact" result="near"/>
      ${soft(40, 20, 30, 0.1)}
      <feComposite in2="near"/>
    </filter>
  </defs>
  <path d="${BACK_PATH}" filter="url(#s)"/>
</svg>`;

// The panel's own silhouette, cut out of the shadows. Left in, it peeked out
// past the folder's back panel as a dark hairline: the image is softer than
// the vector panel drawn over it, more so when the page is zoomed in.
const panel = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W * SCALE}" height="${H * SCALE}" viewBox="${-PAD.x} ${-PAD.top} ${W} ${H}">
  <path d="${BACK_PATH}"/>
</svg>`;

const out = path.join(process.cwd(), "public/folder-shadow.png");
await sharp(Buffer.from(svg))
  .composite([{ input: Buffer.from(panel), blend: "dest-out" }])
  // grey + alpha: only the alpha matters, the mask is tinted in CSS
  .toColourspace("b-w")
  .png({ compressionLevel: 9 })
  .toFile(out);
console.log(`wrote ${path.relative(process.cwd(), out)}`);
