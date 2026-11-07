"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import styles from "@/app/(site)/page.module.css";
import { SECTIONS, type Project, type Section } from "@/lib/projects";
import { FolderRail } from "./FolderRail";
import { FolderStack } from "./FolderStack";
import type { ProjectViewHandle } from "./ProjectView";
import { SiteNav } from "./SiteNav";

// Its animation libraries wait until the page is up (see the preload in Work)
const ProjectView = dynamic(() => import("./ProjectView").then((m) => m.ProjectView));
const PRELOAD_AFTER = 1500; // ms

const TITLE = "Studio Subtract";
const slugFrom = (path: string, base: string) =>
  path.startsWith(`${base}/`) ? (path.slice(base.length + 1).split("/")[0] || null) : null;

/**
 * The folders plus the project page that opens over them. Both sections run
 * the same endless rail; Studio starts it near the end of the set, on the last
 * person, so the page opens mid-row rather than at a first folder. Opening a folder
 * only changes the URL (history.pushState, which Next keeps in sync), so the
 * folders stay mounted underneath and the transition can fly a folder's
 * papers straight into the gallery and back again.
 */
export function Work({
  projects,
  initialSlug,
  section: id = "work",
}: {
  projects: Project[];
  initialSlug?: string;
  section?: Section["id"];
}) {
  const section = SECTIONS[id];
  const { home, base } = section;
  const urlSlug = slugFrom(usePathname(), base);
  const [slug, setSlug] = useState(initialSlug ?? null);
  const view = useRef<ProjectViewHandle>(null);
  // folder that was clicked; null when the page was opened by URL
  const source = useRef<HTMLElement | null>(null);
  // whether "/" is the history entry behind the project page
  const pushed = useRef(false);
  const closing = useRef(false);
  // the folder to hand focus back to once its page has closed
  const refocus = useRef<HTMLElement | null>(null);
  // whether that folder was opened from the keyboard, so its focus ring comes back too
  const byKeyboard = useRef(false);

  // ready before the first click, so the folder opens without waiting for it
  useEffect(() => {
    const t = setTimeout(() => void import("./ProjectView"), PRELOAD_AFTER);
    return () => clearTimeout(t);
  }, []);

  // The URL drives what is open, so Back/Forward animate too.
  useEffect(() => {
    if (urlSlug && urlSlug !== slug) {
      setSlug(urlSlug);
    } else if (!urlSlug && slug && !closing.current) {
      closing.current = true;
      (view.current?.close() ?? Promise.resolve()).then(() => {
        closing.current = false;
        // Back before the page had started: nothing else shuts its folder.
        // Phones: the stack then re-opens whichever folder is mid-screen.
        source.current?.removeAttribute("data-open");
        window.dispatchEvent(new Event("folderstack:sync"));
        refocus.current = source.current;
        source.current = null;
        setSlug(null);
      });
    }
  }, [urlSlug, slug]);

  // after the folders stop being inert; a rail's decorative copy keeps no focus
  useEffect(() => {
    const folder = refocus.current;
    if (slug || !folder) return;
    refocus.current = null;
    const link = folder.querySelector("a");
    if (!link || folder.hasAttribute("aria-hidden")) return;
    // Browsers ring a link focused by script after any key press (Escape), and
    // Safari after a click too. Opened by pointer, it stays quiet until focus
    // really moves on: the window losing focus leaves activeElement where it is.
    if (!byKeyboard.current) {
      const moved = () => {
        if (document.activeElement === link) return;
        link.removeAttribute("data-quiet");
        link.removeEventListener("blur", moved);
      };
      link.setAttribute("data-quiet", "");
      link.addEventListener("blur", moved);
    }
    link.focus({ preventScroll: true });
  }, [slug]);

  // A folder opens in place, so the title is set here rather than by the page
  // that would have loaded. It is the studio's name wherever you are, the same
  // as every server-rendered page (lib/seo.ts): the URL already says which
  // project is open, and the window only has room for one of them.
  useEffect(() => {
    document.title = TITLE;
  }, []);

  const open = useCallback((next: string, folder: HTMLElement) => {
    if (slug) return;
    // straight away, so its front opens on this folder's spring (Folder.module.css)
    folder.setAttribute("data-open", "");
    byKeyboard.current = !!folder.querySelector("a")?.matches(":focus-visible");
    source.current = folder;
    pushed.current = true;
    window.history.pushState(null, "", `${base}/${next}`);
  }, [slug, base]);

  const requestClose = useCallback(() => {
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
    } else {
      window.history.pushState(null, "", home);
    }
  }, [home]);

  // Next swaps the open project in place: "Back" still returns to the folders
  const openNext = useCallback(() => {
    const i = projects.findIndex((p) => p.slug === slug);
    source.current = null;
    window.history.replaceState(null, "", `${base}/${projects[(i + 1) % projects.length].slug}`);
  }, [projects, slug, base]);

  const index = slug ? projects.findIndex((p) => p.slug === slug) : -1;
  const project = index >= 0 ? projects[index] : undefined;

  return (
    <main className={styles.page} data-section={id}>
      {/* out of sight behind an open project: no tab stops there either */}
      <SiteNav section={section} inert={!!project} />

      <section className={styles.work} aria-label={section.label} inert={!!project || undefined}>
        <div className={styles.rail} data-rail>
          <FolderRail
            projects={projects}
            base={base}
            label={section.label}
            // Studio opens on the last person rather than the first, so the row
            // reads as already under way. Work opens where it always has.
            start={id === "studio" ? projects.length - 1 : 0}
            onOpen={open}
          />
        </div>
        <FolderStack projects={projects} base={base} className={styles.stack} onOpen={open} />
      </section>

      {project && (
        <ProjectView
          key={project.slug}
          ref={view}
          project={project}
          source={source.current}
          onClose={requestClose}
          section={section}
          nextSlug={projects[(index + 1) % projects.length].slug}
          onNext={openNext}
        />
      )}
    </main>
  );
}
