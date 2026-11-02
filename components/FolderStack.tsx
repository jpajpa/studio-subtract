"use client";

import { useEffect, useRef } from "react";
import type { Project } from "@/lib/projects";
import { Folder } from "./Folder";

const config = {
  // Folders only open when their centre is this close to the viewport centre
  // (as a fraction of viewport height), so nothing opens between two folders.
  openZone: 0.22,
  // Folders further than this from the screen aren't drawn at all.
  drawMargin: "120% 0px",
  // A folder rises in once it is this far inside the bottom of the screen.
  revealMargin: "0px 0px -8% 0px",
  // Longest a folder waits for its images before rising anyway (ms).
  imageWait: 500,
  // The shadow's mask (Folder.module.css): CSS fetches masks with CORS, so this
  // and the preload in the layout must too, or each gets its own copy.
  shadow: "/folder-shadow.png",
};

const ON_SCREEN_AT_LOAD = 2; // folders visible on a phone before scrolling

type StackEl = HTMLDivElement & { stop?: () => void };

/**
 * Runs as soon as the stack is parsed, before React hydrates, so folders
 * reveal and open on time even on a slow phone (or if hydration never comes).
 * Must stay self-contained: it is serialised into an inline <script>.
 */
function stackScript(cfg: typeof config) {
  const list = document.querySelector<StackEl>("[data-folder-stack]");
  if (!list) return;
  const folders = Array.from(list.children) as HTMLElement[];

  // Open the folder nearest the middle of the screen (there is no hover).
  // Where CSS can scrub the opening with the scroll (Folder.module.css),
  // it does that instead and this stays off.
  const scrubbed =
    CSS.supports("animation-timeline: view()") && matchMedia("(prefers-reduced-motion: no-preference)").matches;
  let open: HTMLElement | null = null;
  let raf = 0;
  const update = () => {
    raf = 0;
    if (!list.offsetParent) return; // stack hidden (desktop)
    const mid = window.innerHeight / 2;
    let best: HTMLElement | null = null;
    let bestDist = window.innerHeight * cfg.openZone;
    for (const el of folders) {
      const r = el.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - mid);
      if (d < bestDist) {
        best = el;
        bestDist = d;
      }
    }
    if (best === open) return;
    if (open) open.removeAttribute("data-open");
    if (best) best.setAttribute("data-open", "");
    open = best;
  };
  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(update);
  };
  const sync = () => {
    for (const el of folders) el.removeAttribute("data-open");
    open = null;
    update();
  };
  if (!scrubbed) {
    update();
    addEventListener("scroll", schedule, { passive: true });
    // after a project page closes over the stack: start again from the scroll
    addEventListener("folderstack:sync", sync);
    addEventListener("resize", schedule);
  }

  // Each folder rises the first time it scrolls into view, once its images
  // and shadow are in (or after imageWait), so it never rises empty.
  const shadow = new Image();
  shadow.crossOrigin = "anonymous";
  shadow.src = cfg.shadow;
  const loaded = (img: HTMLImageElement) =>
    img.complete
      ? null
      : new Promise((done) => {
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        });
  const imagesReady = (el: HTMLElement) =>
    Promise.race([
      Promise.all([
        // the shadow rises with the folder, not after it
        shadow.decode().catch(() => {}),
        ...Array.from(el.querySelectorAll<HTMLImageElement>("[data-paper]"), loaded),
      ]),
      new Promise((done) => setTimeout(done, cfg.imageWait)),
    ]);

  const io = new IntersectionObserver(
    (entries) => {
      if (!list.offsetParent) return;
      entries.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      let k = 0; // folders that come in together rise one after another
      for (const e of entries) {
        const el = e.target as HTMLElement;
        if (e.isIntersecting) {
          const i = k++;
          io.unobserve(el);
          imagesReady(el).then(() => {
            el.style.setProperty("--enter", String(i));
            el.dataset.reveal = "in";
            // landed: let go of the animation
            const land = (a: AnimationEvent) => {
              if (a.target !== el || !a.animationName.includes("folder-rise")) return;
              el.removeEventListener("animationend", land);
              el.dataset.reveal = "done";
            };
            el.addEventListener("animationend", land);
          });
        } else if (e.boundingClientRect.bottom < 0) {
          // flung past without ever registering: show it, no animation
          io.unobserve(el);
          el.dataset.reveal = "done";
        }
      }
    },
    { rootMargin: cfg.revealMargin },
  );
  for (const el of folders) io.observe(el);

  // Far off screen a folder's glass, papers and scroll-scrubbed animations cost
  // every frame for nothing. Its box stays, so nothing shifts on the way back.
  const near = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        e.target.toggleAttribute("data-far", !e.isIntersecting && !!list.offsetParent);
      }
    },
    { rootMargin: cfg.drawMargin },
  );
  for (const el of folders) near.observe(el);

  list.stop = () => {
    cancelAnimationFrame(raf);
    removeEventListener("scroll", schedule);
    removeEventListener("folderstack:sync", sync);
    removeEventListener("resize", schedule);
    io.disconnect();
    near.disconnect();
  };
}

type Props = {
  projects: Project[];
  className?: string;
  onOpen?: (slug: string, folder: HTMLElement) => void;
};

/** Vertical list of folders for touch screens. Tapping a folder opens it. */
export function FolderStack({ projects, className, onOpen }: Props) {
  const ref = useRef<StackEl>(null);

  // Arriving by a link, React doesn't run the inline script: start it from here.
  useEffect(() => {
    const list = ref.current;
    if (!list) return;
    if (!list.stop) stackScript(config);
    return () => {
      list.stop?.();
      delete list.stop;
    };
  }, []);

  return (
    <>
      <div
        ref={ref}
        className={className}
        data-folder-stack
        onClick={(e) => {
          const folder = (e.target as HTMLElement).closest<HTMLElement>("[data-slug]");
          if (folder?.dataset.slug) onOpen?.(folder.dataset.slug, folder);
        }}
      >
        {projects.map((p, i) => (
          <Folder key={p.slug} project={p} reveal eager={i < ON_SCREEN_AT_LOAD} />
        ))}
      </div>
      <script dangerouslySetInnerHTML={{ __html: `(${stackScript})(${JSON.stringify(config)})` }} />
    </>
  );
}
