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
// rail is composited), so the shadow and the SVG are drawn this much larger.
// The shadows are an image (public/folder-shadow.png, made by
// scripts/folder-shadow.mjs): blur filters on every folder made phones stutter.
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
      <div className={styles.shadow} aria-hidden />
      <svg className={styles.back} viewBox={VIEW} aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={fill[0]} />
            <stop offset="1" stopColor={fill[1]} />
          </linearGradient>
        </defs>
        <path
          d={BACK_PATH}
          fill={`url(#${gradientId})`}
        />
      </svg>

      <div className={styles.papers}>
        {papers.map((p, i) => {
          const style = {
            left: u(p.x),
            top: u(p.y),
            width: u(p.w),
            height: u(p.h),
            "--r": `${p.r ?? 0}deg`,
            "--i": i,
            "--n": papers.length,
          } as CSSProperties;
          return (
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
              style={style}
              data-paper
            />
          );
        })}
      </div>

      <div className={styles.front} data-front>
        <div className={styles.glass} />
        <p className={`${styles.label} ${styles.top}`}>{title}</p>
        <p className={`${styles.label} ${styles.bottom}`}>{category}</p>
      </div>
    </article>
  );
}
