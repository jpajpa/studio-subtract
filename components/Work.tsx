"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import styles from "@/app/(site)/page.module.css";
import { SECTIONS, type Project, type Section } from "@/lib/projects";
import { Folder } from "./Folder";
import { FolderRail } from "./FolderRail";
import { FolderStack } from "./FolderStack";
import { ProjectView, type ProjectViewHandle } from "./ProjectView";
import { SiteNav } from "./SiteNav";

const TITLE = "Studio Subtract";
const slugFrom = (path: string, base: string) =>
  path.startsWith(`${base}/`) ? (path.slice(base.length + 1).split("/")[0] || null) : null;

/**
 * The folders plus the project page that opens over them. Work shows
 * projects on an endless rail; Studio shows people in a plain row. Opening a folder
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
  const row = useRef<HTMLDivElement>(null);

  // The URL drives what is open, so Back/Forward animate too.
  useEffect(() => {
    if (urlSlug && urlSlug !== slug) {
      setSlug(urlSlug);
    } else if (!urlSlug && slug && !closing.current) {
      closing.current = true;
      (view.current?.close() ?? Promise.resolve()).then(() => {
        closing.current = false;
        source.current = null;
        setSlug(null);
      });
    }
  }, [urlSlug, slug]);

  useEffect(() => {
    const list = id === "work" ? TITLE : `${section.label} — ${TITLE}`;
    document.title = slug ? `${projects.find((p) => p.slug === slug)?.title} — ${TITLE}` : list;
  }, [slug, projects, section]);

  // Studio has no rail to absorb the wheel, so a trackpad would scroll the
  // document and rubber-band the folders and the header with it. Neutral state
  // is locked: swallow the wheel as FolderRail does, unless the row is hidden
  // (phones scroll the stack normally), a project is open, or it's a pinch.
  useEffect(() => {
    if (id === "work") return;
    const el = row.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!el.offsetParent || el.closest("[inert]") || e.ctrlKey) return;
      e.preventDefault();
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [id]);

  const open = useCallback((next: string, folder: HTMLElement) => {
    if (slug) return;
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
    <main className={styles.page}>
      <SiteNav section={section} />

      <section className={styles.work} aria-label={section.label} inert={!!project || undefined}>
        {id === "work" ? (
          <div className={styles.rail} data-rail>
            <FolderRail projects={projects} onOpen={open} />
          </div>
        ) : (
          <div
            ref={row}
            className={styles.row}
            data-rail
            onClick={(e) => {
              const folder = (e.target as HTMLElement).closest<HTMLElement>("[data-slug]");
              if (folder?.dataset.slug) open(folder.dataset.slug, folder);
            }}
          >
            {projects.map((p, i) => (
              <Folder key={p.slug} project={p} enter={i} eager />
            ))}
          </div>
        )}
        <FolderStack projects={projects} className={styles.stack} onOpen={open} />
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
