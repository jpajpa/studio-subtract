// SVG filter that bends the backdrop near the glass edges, approximating the
// refraction of Apple's Liquid Glass (Sketch's "Glass" blur). Only Chromium
// supports url() inside backdrop-filter, so the `liquid` class is opted into
// there; other browsers keep the plain frosted fallback.

const W = 320;
const H = 202;
const R = 20;
const EDGE = 9; // width of the refracting rim
const SOFT = 7; // falloff between rim and flat centre

// R channel encodes x-offset, B channel y-offset; 50% grey = no displacement.
const map = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="x" x1="0" x2="1"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#f00"/></linearGradient>
    <linearGradient id="y" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#00f"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#000"/>
  <rect width="${W}" height="${H}" rx="${R}" fill="url(#x)"/>
  <rect width="${W}" height="${H}" rx="${R}" fill="url(#y)" style="mix-blend-mode:difference"/>
  <rect x="${EDGE}" y="${EDGE}" width="${W - EDGE * 2}" height="${H - EDGE * 2}" rx="${R - 4}"
        fill="hsl(0 0% 50%)" style="filter:blur(${SOFT}px)"/>
</svg>`;

const href = `data:image/svg+xml,${encodeURIComponent(map.trim())}`;

const detect = `(() => {
  const ua = navigator.userAgent;
  if (/Chrome\\//.test(ua) && !/Firefox|FxiOS/.test(ua)) document.documentElement.classList.add('liquid');
})()`;

export function LiquidGlass() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: detect }} />
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <filter
          id="liquid-glass"
          x="0"
          y="0"
          width={W}
          height={H}
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feImage href={href} x="0" y="0" width={W} height={H} result="map" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="map"
            scale="-42"
            xChannelSelector="R"
            yChannelSelector="B"
          />
        </filter>
      </svg>
    </>
  );
}
