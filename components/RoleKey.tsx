import { ROLES } from "@/lib/projects";
import styles from "./RoleKey.module.css";

/** Key for the two role dots on every folder. */
export function RoleKey() {
  return (
    <ul className={styles.key} aria-label="Key" data-chrome>
      {ROLES.map((r) => (
        <li key={r.id}>
          <span className={styles.dot} data-role={r.id} aria-hidden />
          {r.label}
        </li>
      ))}
    </ul>
  );
}
