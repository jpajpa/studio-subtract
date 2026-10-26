// Homepage folders. Geometry is in folder space (320 × 261), taken from the
// Sketch comps "Home, 1" / "Home, 2". Papers are listed bottom → top.

export type Paper = {
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** resting rotation in degrees */
  r?: number;
};

export type Project = {
  slug: string;
  title: string;
  year: string;
  /** back panel fill: a color, or [top, bottom] gradient */
  fill: string | [string, string];
  /** tint of the folder's drop shadow */
  shadow: string;
  /** label color, set by hand per folder */
  text: string;
  /** three swatches, left → right */
  dots: [string, string, string];
  papers: Paper[];
  /** true until the real title/year/colors are supplied */
  placeholder?: boolean;
};

const WHITE = "#ffffff";
const NEUTRAL_SHADOW = "rgba(84, 84, 84, 0.15)";
const m = (slug: string, file: string) => `/media/${slug}/${file}.webp`;

export const projects: Project[] = [
  {
    slug: "chess",
    title: "Chess",
    year: "2025",
    fill: WHITE,
    shadow: NEUTRAL_SHADOW,
    text: "#ececec", // light: sits over dark/saturated imagery
    dots: ["#d2c091", "#bababa", "#000000"],
    papers: [
      { src: m("chess", "slides-2-0004-page-5"), x: 13, y: 40, w: 264, h: 211 },
      { src: m("chess", "slides-2-0001-page-2"), x: 56, y: 23, w: 246, h: 197, r: 0.6 },
      { src: m("chess", "slides-2-0002-page-3"), x: 61, y: 55, w: 246, h: 197 },
    ],
  },
  {
    slug: "vic",
    title: "The Vic Mensa Show",
    year: "2026",
    fill: WHITE,
    shadow: NEUTRAL_SHADOW,
    text: "#ffffff", // light: sits over dark/saturated imagery
    dots: ["#000000", "#e7952a", "#bf5321"],
    papers: [
      { src: m("vic", "original-5f23f4c46077841d3bd9bd2609d7cde0"), x: 112, y: 101, w: 173, h: 130 },
      { src: m("vic", "original-c2c273672eb6c99e3a6e9e90dccc6f9b"), x: 12, y: 80, w: 228, h: 171 },
      { src: m("vic", "original-5f23f4c46077841d3bd9bd2609d7cde0"), x: 16, y: 46, w: 173, h: 130 },
      { src: m("vic", "original-c40b6059104bab13f625dba95389e983"), x: 121, y: 45, w: 173, h: 130, r: 1 },
    ],
  },
  {
    slug: "sjj",
    title: "SJJ",
    year: "2025",
    fill: WHITE,
    shadow: NEUTRAL_SHADOW,
    text: "#454545",
    dots: ["#000000", "#329d94", "#dee481"],
    papers: [
      { src: m("sjj", "interface-system"), x: 22, y: 122, w: 276, h: 114 },
      { src: m("sjj", "mockup-5-1-4-1-combined-60-bpm"), x: 22, y: 5, w: 147, h: 244 },
      { src: m("sjj", "mockup-passive-typography-2"), x: 125, y: 0, w: 147, h: 244 },
    ],
  },
  {
    slug: "spaciom",
    title: "Spaciom",
    year: "2026",
    fill: WHITE,
    shadow: NEUTRAL_SHADOW,
    text: "#3b3b3b",
    dots: ["#000000", "#bababa", "#f8f8f8"],
    papers: [
      { src: m("spaciom", "logoconstruction-2inv"), x: 76, y: 23, w: 230, h: 163 },
      { src: m("spaciom", "logoconstruction-1inv"), x: 19, y: 70, w: 230, h: 163 },
      { src: m("spaciom", "logoconstruction-3inv"), x: 0, y: 93, w: 230, h: 163 },
    ],
  },
  {
    slug: "vector",
    title: "Vector Studio",
    year: "2026",
    fill: WHITE,
    shadow: NEUTRAL_SHADOW,
    text: "#3b3b3b",
    dots: ["#000000", "#bababa", "#f8f8f8"],
    papers: [
      { src: m("vector", "original-aba9a49d5ec5ebd58869da8fdb14f3ad"), x: 39, y: 41, w: 270, h: 191, r: 1.2 },
      { src: m("vector", "original-206ddf04bacc81e30cd0334f93aeda1e"), x: 23, y: 41, w: 270, h: 180 },
    ],
  },
  {
    slug: "furniture",
    title: "Furniture",
    year: "2026",
    fill: WHITE,
    shadow: NEUTRAL_SHADOW,
    text: "#454545",
    dots: ["#000000", "#e0e0e0", "#f2f2f7"],
    papers: [
      { src: m("furniture", "65-dining-set7"), x: 16, y: 26, w: 155, h: 116 },
      { src: m("furniture", "66-dining-set3"), x: 142, y: 37, w: 155, h: 116 },
      { src: m("furniture", "67-dining-set2"), x: 28, y: 126, w: 155, h: 116 },
      { src: m("furniture", "68-dining-set1"), x: 141, y: 126, w: 155, h: 116 },
    ],
  },

  // — Not in Sketch yet: titles, years and colors are placeholders. —
  {
    slug: "hikarinoyami",
    title: "Hikari no Yami",
    year: "2025",
    fill: WHITE,
    shadow: NEUTRAL_SHADOW,
    text: "#454545",
    dots: ["#000000", "#5a5a5a", "#e6e6e6"],
    placeholder: true,
    papers: [
      { src: m("hikarinoyami", "61-hikarinoyami-01"), x: 30, y: 18, w: 150, h: 212, r: -2 },
      { src: m("hikarinoyami", "62-hikarinoyami-03"), x: 140, y: 10, w: 150, h: 212, r: 1.5 },
      { src: m("hikarinoyami", "59-hikarinoyami-05"), x: 85, y: 40, w: 150, h: 212 },
    ],
  },
  {
    slug: "erosion",
    title: "Erosion",
    year: "2023",
    fill: WHITE,
    shadow: NEUTRAL_SHADOW,
    text: "#454545",
    dots: ["#000000", "#8a8a8a", "#e9e9e9"],
    placeholder: true,
    papers: [
      { src: m("erosion", "5-erosion-zellerfeldsample-1"), x: 176, y: 16, w: 124, h: 165, r: 1.5 },
      { src: m("erosion", "3-erosionrockvis1"), x: 22, y: 30, w: 180, h: 180 },
      { src: m("erosion", "1-erosion-compr-1"), x: 110, y: 72, w: 190, h: 142, r: -1 },
    ],
  },
  {
    slug: "loho",
    title: "Loho",
    year: "2025",
    fill: WHITE,
    shadow: NEUTRAL_SHADOW,
    text: "#454545",
    dots: ["#000000", "#bababa", "#f8f8f8"],
    placeholder: true,
    papers: [
      { src: m("loho", "16-loho-kur-commercial1"), x: 18, y: 22, w: 250, h: 141, r: -1 },
      { src: m("loho", "15-loho-kur-commercial2"), x: 52, y: 52, w: 250, h: 141, r: 1 },
      { src: m("loho", "14-loho-kur-commercial3"), x: 30, y: 92, w: 250, h: 141 },
    ],
  },
  {
    slug: "sortacase",
    title: "Sortacase",
    year: "2025",
    fill: WHITE,
    shadow: NEUTRAL_SHADOW,
    text: "#454545",
    dots: ["#000000", "#bababa", "#f8f8f8"],
    placeholder: true,
    papers: [
      { src: m("sortacase", "102-sortacase-1"), x: 60, y: 18, w: 240, h: 170, r: 1 },
      { src: m("sortacase", "99-sortacase-web7"), x: 14, y: 50, w: 230, h: 163 },
      { src: m("sortacase", "100-sortacase-web6"), x: 80, y: 84, w: 220, h: 156, r: -1 },
    ],
  },
  {
    // Source videos in public/work/ihategum are corrupt — empty folder for now.
    slug: "ihategum",
    title: "I Hate Gum",
    year: "2025",
    fill: WHITE,
    shadow: NEUTRAL_SHADOW,
    text: "#454545",
    dots: ["#000000", "#bababa", "#f8f8f8"],
    placeholder: true,
    papers: [],
  },
];
