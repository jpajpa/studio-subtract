import { FolderRail } from "@/components/FolderRail";
import { FolderStack } from "@/components/FolderStack";
import { RoleKey } from "@/components/RoleKey";
import { SiteNav } from "@/components/SiteNav";
import { projects } from "@/content/projects";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <SiteNav />
      <RoleKey />

      <section className={styles.work} aria-label="Work">
        <div className={styles.rail}>
          <FolderRail projects={projects} />
        </div>
        <FolderStack projects={projects} className={styles.stack} />
      </section>
    </main>
  );
}
