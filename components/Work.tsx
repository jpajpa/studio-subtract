"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import styles from "@/app/(site)/page.module.css";
import type { Project } from "@/lib/projects";
import { FolderRail } from "./FolderRail";
import { FolderStack } from "./FolderStack";
import { ProjectView, type ProjectViewHandle } from "./ProjectView";
import { RoleKey } from "./RoleKey";
import { SiteNav } from "./SiteNav";

const TITLE = "Studio Subtract";
const slugFrom = (path: string) => path.match(/^\/work\/([^/]+)/)?.[1] ?? null;

/**
 * The folders plus the project page that opens over them. Opening a folder
 * only changes the URL (history.pushState, which Next keeps in sync), so the
 * folders stay mounted underneath and the transition can fly a folder's
 * papers straight into the gallery and back again.
 */
export function Work({ projects, initialSlug }: { projects: Project[]; initialSlug?: string }) {
  const urlSlug = slugFrom(usePathname());
  const [slug, setSlug] = useState(initialSlug ?? null);
  const view = useRef<ProjectViewHandle>(null);
  // folder that was clicked; null when the page was opened by URL
  const source = useRef<HTMLElement | null>(null);
  // whether "/" is the history entry behind the project page
  const pushed = useRef(false);
  const closing = useRef(false);

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
    document.title = slug ? `${projects.find((p) => p.slug === slug)?.title} — ${TITLE}` : TITLE;
  }, [slug, projects]);

  const open = useCallback((next: string, folder: HTMLElement) => {
    if (slug) return;
    source.current = folder;
    pushed.current = true;
    window.history.pushState(null, "", `/work/${next}`);
  }, [slug]);

  const requestClose = useCallback(() => {
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
    } else {
      window.history.pushState(null, "", "/");
    }
  }, []);

  // Next swaps the open project in place: "Back" still returns to the folders
  const openNext = useCallback(() => {
    const i = projects.findIndex((p) => p.slug === slug);
    source.current = null;
    window.history.replaceState(null, "", `/work/${projects[(i + 1) % projects.length].slug}`);
  }, [projects, slug]);

  const index = slug ? projects.findIndex((p) => p.slug === slug) : -1;
  const project = index >= 0 ? projects[index] : undefined;

  return (
    <main className={styles.page}>
      <SiteNav />
      <RoleKey />

      <section className={styles.work} aria-label="Work" inert={!!project || undefined}>
        <div className={styles.rail} data-rail>
          <FolderRail projects={projects} onOpen={open} />
        </div>
        <FolderStack projects={projects} className={styles.stack} onOpen={open} />
      </section>

      {project && (
        <ProjectView
          key={project.slug}
          ref={view}
          project={project}
          source={source.current}
          onClose={requestClose}
          nextSlug={projects[(index + 1) % projects.length].slug}
          onNext={openNext}
        />
      )}
    </main>
  );
}
