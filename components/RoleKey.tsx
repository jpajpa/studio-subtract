import { TAGS } from "@/lib/projects";
import { Tag } from "./Tag";
import styles from "./RoleKey.module.css";

/** Key for the role tag on every folder. */
export function RoleKey() {
  return (
    <ul className={styles.key} aria-label="Key" data-chrome>
      {TAGS.map((t) => (
        <li key={t.id}>
          <Tag kind={t.id} className={styles.tag} />
          {t.label}
        </li>
      ))}
    </ul>
  );
}
