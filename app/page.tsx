import { Folder } from "@/components/Folder";
import { FolderRail } from "@/components/FolderRail";
import { projects } from "@/content/projects";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <nav className={styles.nav} aria-label="Main">
        <a href="/" aria-current="page">
          Work
        </a>
        <a href="#studio">Studio</a>
        <a href="#contact">Contact</a>
      </nav>

      <section className={styles.work} aria-label="Work">
        <div className={styles.rail}>
          <FolderRail projects={projects} />
        </div>
        <div className={styles.stack}>
          {projects.map((p) => (
            <Folder key={p.slug} project={p} />
          ))}
        </div>
      </section>
    </main>
  );
}
