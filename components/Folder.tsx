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
  const { slug, title, year, category, papers } = project;

  return (
    <article
      className={styles.folder}
      data-slug={slug}
      data-reveal={reveal ? "wait" : undefined}
      // the FolderStack script sets data-reveal/data-open before hydration
      suppressHydrationWarning={reveal}
      aria-hidden={clone || undefined}
      aria-label={clone ? undefined : [title, year].filter(Boolean).join(", ")}
      style={{ "--enter": enter } as CSSProperties}
    >
      <svg className={styles.back} viewBox="0 0 320 261" aria-hidden>
        <path d={BACK_PATH} fill="#fff" stroke="#dedede" strokeWidth="1" vectorEffect="non-scaling-stroke" />
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
