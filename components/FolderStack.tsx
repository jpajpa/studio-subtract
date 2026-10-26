"use client";

import { useEffect, useRef } from "react";
import type { Project } from "@/content/projects";
import { Folder } from "./Folder";

// Folders only open when their centre is this close to the viewport centre
// (as a fraction of viewport height), so nothing opens between two folders.
const OPEN_ZONE = 0.22;

/**
 * Vertical list of folders for touch screens. There is no hover, so the
 * folder nearest the middle of the screen opens instead.
 */
export function FolderStack({ projects, className }: { projects: Project[]; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = ref.current;
    if (!list) return;
    let raf = 0;
    let open: HTMLElement | null = null;

    const update = () => {
      raf = 0;
      if (!list.offsetParent) return; // stack hidden (desktop)
      const mid = window.innerHeight / 2;
      let best: HTMLElement | null = null;
      let bestDist = window.innerHeight * OPEN_ZONE;
      for (const el of list.children as HTMLCollectionOf<HTMLElement>) {
        const r = el.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - mid);
        if (d < bestDist) {
          best = el;
          bestDist = d;
        }
      }
      if (best === open) return;
      open?.removeAttribute("data-open");
      best?.setAttribute("data-open", "");
      open = best;
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {projects.map((p) => (
        <Folder key={p.slug} project={p} />
      ))}
    </div>
  );
}
