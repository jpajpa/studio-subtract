import type { CSSProperties } from "react";
import Image from "next/image";
import type { Project } from "@/lib/projects";
import styles from "./Folder.module.css";

// Back panel outline in folder space (320 × 261), from Sketch "Home, Folder v2":
// tab top-left, body from y=34.
const BACK_PATH =
  "M0.6 17.4C0.6 8.1 8.1 0.6 17.4 0.6H84.5C93.8 0.6 101.3 8.1 101.3 17.4" +
  "C101.3 26.7 108.8 34.2 118.1 34.2H302.6C311.9 34.2 319.4 41.7 319.4 50.9" +
  "V240.6C319.4 251.7 310.4 260.7 299.3 260.7H20.7C9.6 260.7 0.6 251.7 0.6 240.6Z";

// Room around the back panel for its shadows, in folder units. Safari clips
// shadows that spill past an element's box (in tile-sized rectangles once the
// rail is composited), so the SVG is drawn this much larger and the shadows
// are painted inside it.
const PAD = { x: 80, top: 50, bottom: 120 };
const VIEW = `${-PAD.x} ${-PAD.top} ${320 + 2 * PAD.x} ${261 + PAD.top + PAD.bottom}`;

/** Paper geometry in folder units, scaled by --u (see Folder.module.css). */
const u = (n: number) => `calc(${n} * var(--u))`;

type Props = {
  project: Project;
  /** decorative duplicate inside the infinite rail */
  clone?: boolean;
  /** position in the load-in stagger */
  enter?: number;
  /** wait hidden until the FolderStack script reveals it on scroll */
  reveal?: boolean;
  /** on screen at load: fetch images right away instead of lazily */
  eager?: boolean;
};

export function Folder({ project, clone, enter = 0, reveal, eager }: Props) {
  const { slug, title, year, category, fill, text, papers } = project;
  const gradientId = `folder-fill-${slug}`;
  const shadowId = `folder-shadow-${slug}`;

  return (
    <article
      className={styles.folder}
      data-slug={slug}
      data-reveal={reveal ? "wait" : undefined}
      // the FolderStack script sets data-reveal/data-open before hydration
      suppressHydrationWarning={reveal}
      aria-hidden={clone || undefined}
      aria-label={clone ? undefined : [title, year].filter(Boolean).join(", ")}
      style={{ "--tint": fill[1], "--text": text, "--enter": enter } as CSSProperties}
    >
      <svg className={styles.back} viewBox={VIEW} aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={fill[0]} />
            <stop offset="1" stopColor={fill[1]} />
          </linearGradient>
          {/* contact shadow + a soft, wide one: the folder sits above the page */}
          <filter
            id={shadowId}
            filterUnits="userSpaceOnUse"
            x={-PAD.x}
            y={-PAD.top}
            width={320 + 2 * PAD.x}
            height={261 + PAD.top + PAD.bottom}
          >
            <feDropShadow dx="0" dy="1" stdDeviation="0.75" floodOpacity="0.22" />
            <feDropShadow dx="0" dy="12" stdDeviation="8" floodOpacity="0.16" />
            <feDropShadow dx="0" dy="30" stdDeviation="20" floodOpacity="0.14" />
          </filter>
        </defs>
        <path
          filter={`url(#${shadowId})`}
          d={BACK_PATH}
          fill={`url(#${gradientId})`}
          stroke="rgba(0, 0, 0, 0.06)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className={styles.papers}>
        {papers.map((p, i) => (
          <Image
            key={i}
            className={styles.paper}
            src={p.src}
            alt=""
            width={p.w}
            height={p.h}
            // papers are drawn at folder units ≈ CSS px on desktop
            sizes={`${Math.ceil(p.w)}px`}
            quality={85}
            loading={eager ? "eager" : "lazy"}
            draggable={false}
            style={
              {
                left: u(p.x),
                top: u(p.y),
                width: u(p.w),
                height: u(p.h),
                "--r": `${p.r ?? 0}deg`,
                "--i": i,
                "--n": papers.length,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className={styles.front} data-front>
        <div className={styles.glass} />
        <p className={`${styles.label} ${styles.top}`}>{category}</p>
        <p className={`${styles.label} ${styles.bottom}`}>{title}</p>
      </div>
    </article>
  );
}
