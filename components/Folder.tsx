import type { CSSProperties } from "react";
import type { Project } from "@/content/projects";
import styles from "./Folder.module.css";

// Back panel outline in folder space (320 × 261): tab top-left, body from y=34.
const BACK_PATH =
  "M0 17C0 7.6 7.6 0 17 0H84C93 0 97 5 101 13C105 25 109 34 120 34H302" +
  "C312 34 320 41 320 51V241C320 252 311 261 300 261H20C9 261 0 252 0 241Z";

type Props = {
  project: Project;
  /** decorative duplicate inside the infinite rail */
  clone?: boolean;
};

export function Folder({ project, clone }: Props) {
  const { slug, title, year, fill, shadow, text, papers } = project;
  const gradientId = `folder-fill-${slug}`;

  return (
    <article
      className={styles.folder}
      data-slug={slug}
      aria-hidden={clone || undefined}
      aria-label={clone ? undefined : `${title}, ${year}`}
      style={{ "--shadow": shadow, "--text": text } as CSSProperties}
    >
      <svg className={styles.back} viewBox="0 0 320 261" aria-hidden>
        {Array.isArray(fill) && (
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={fill[0]} />
              <stop offset="1" stopColor={fill[1]} />
            </linearGradient>
          </defs>
        )}
        <path
          d={BACK_PATH}
          fill={Array.isArray(fill) ? `url(#${gradientId})` : fill}
          stroke="#dedede"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className={styles.papers}>
        {papers.map((p, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            className={styles.paper}
            src={p.src}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            style={
              {
                left: p.x,
                top: p.y,
                width: p.w,
                height: p.h,
                "--r": `${p.r ?? 0}deg`,
                "--i": i,
                "--n": papers.length,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className={styles.front}>
        <div className={styles.glass} />
        <p className={styles.label}>
          <span>{title}</span>
          <span>{year}</span>
        </p>
      </div>
    </article>
  );
}
