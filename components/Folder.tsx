import type { CSSProperties } from "react";
import Image from "next/image";
import { ROLES, type Project } from "@/lib/projects";
import styles from "./Folder.module.css";

// Back panel outline in folder space (320 × 285): tab top-left, body from y=34.
const BACK_PATH =
  "M0 17C0 7.6 7.6 0 17 0H84C93 0 97 5 101 13C105 25 109 34 120 34H302" +
  "C312 34 320 41 320 51V265C320 276 311 285 300 285H20C9 285 0 276 0 265Z";

// Most papers are placed in y within 0–250. Push them down slightly so the
// taller back panel shows more of them above the front.
const PAPER_Y = 6;

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
  const { slug, title, year, fill, text, roles, papers } = project;
  const gradientId = `folder-fill-${slug}`;

  return (
    <article
      className={styles.folder}
      data-slug={slug}
      data-reveal={reveal ? "wait" : undefined}
      // the FolderStack script sets data-reveal/data-open before hydration
      suppressHydrationWarning={reveal}
      aria-hidden={clone || undefined}
      aria-label={clone ? undefined : `${title}, ${year}`}
      style={{ "--tint": fill[1], "--text": text, "--enter": enter } as CSSProperties}
    >
      <svg className={styles.back} viewBox="0 0 320 285" aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={fill[0]} />
            <stop offset="1" stopColor={fill[1]} />
          </linearGradient>
        </defs>
        <path
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
                top: u(p.y + PAPER_Y),
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
        <ul className={styles.dots} aria-label="Roles">
          {ROLES.filter((r) => roles.includes(r.id)).map((r) => (
            <li key={r.id} data-role={r.id} title={r.label}>
              <span className={styles.srOnly}>{r.label}</span>
            </li>
          ))}
        </ul>
        <p className={styles.label}>
          <span>{title}</span>
          <span>{year}</span>
        </p>
      </div>
    </article>
  );
}
