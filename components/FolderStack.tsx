import type { Project } from "@/lib/projects";
import { Folder } from "./Folder";

const config = {
  // Folders only open when their centre is this close to the viewport centre
  // (as a fraction of viewport height), so nothing opens between two folders.
  openZone: 0.22,
  // A folder rises in once it is this far inside the bottom of the screen.
  revealMargin: "0px 0px -8% 0px",
  // Longest a folder waits for its images before rising anyway (ms).
  imageWait: 500,
};

const ON_SCREEN_AT_LOAD = 2; // folders visible on a phone before scrolling

/**
 * Runs as soon as the stack is parsed, before React hydrates, so folders
 * reveal and open on time even on a slow phone (or if hydration never comes).
 * Must stay self-contained: it is serialised into an inline <script>.
 */
function stackScript(cfg: typeof config) {
  const list = document.querySelector<HTMLElement>("[data-folder-stack]");
  if (!list) return;
  const folders = Array.from(list.children) as HTMLElement[];

  // Open the folder nearest the middle of the screen (there is no hover).
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
  update();
  addEventListener("scroll", schedule, { passive: true });
  // after a project page closes over the stack: start again from the scroll
  addEventListener("folderstack:sync", () => {
    for (const el of folders) el.removeAttribute("data-open");
    open = null;
    update();
  });
  addEventListener("resize", schedule);

  // Each folder rises the first time it scrolls into view, once its images
  // are in (or after imageWait), so it never rises empty.
  const loaded = (img: HTMLImageElement) =>
    img.complete
      ? null
      : new Promise((done) => {
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        });
  const imagesReady = (el: HTMLElement) =>
    Promise.race([
      Promise.all(Array.from(el.querySelectorAll("img"), loaded)),
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
}

type Props = {
  projects: Project[];
  className?: string;
  onOpen?: (slug: string, folder: HTMLElement) => void;
};

/** Vertical list of folders for touch screens. Tapping a folder opens it. */
export function FolderStack({ projects, className, onOpen }: Props) {
  return (
    <>
      <div
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
