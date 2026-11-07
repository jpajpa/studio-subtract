"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Project } from "@/lib/projects";
import { wheelScrollsPage } from "@/lib/wheel";
import { clickFolder, Folder } from "./Folder";
import styles from "./FolderRail.module.css";

const EASE = 0.09; // per-frame approach to the target at 60fps
const FLING = 14; // how far a drag release coasts (× release velocity in px/frame)
const WHEEL_LINE = 16;
const ENTER_MAX = 8; // folders past this in the load-in stagger all start together
const CLICK_SLOP = 6; // px a press can travel and still count as a click
// Folders in the unit that repeats. The row is endless by repositioning itself
// one unit along, which moves every folder at once, so how long the unit is
// decides how often that happens and how much is standing ready past the edge
// of the window. Tied to the number of items it punishes a short list twice:
// Work's eleven projects wrap every 4510px with 3220px in hand, five people
// every 2050px with 760px. A short list repeats inside the unit instead, so
// the row it draws is unchanged and the unit it wraps is Work's length.
const MIN_SET = 10;

const mod = (n: number, m: number) => ((n % m) + m) % m;

/**
 * Endless horizontal row of folders. The set of projects is repeated enough
 * times to cover the viewport and the offset wraps by one set width, so the
 * row never ends in either direction.
 */
export function FolderRail({
  projects,
  base,
  label = "Projects",
  onOpen,
}: {
  projects: Project[];
  /** where a folder's page lives */
  base: string;
  /** what the carousel is called, for screen readers */
  label?: string;
  /** a folder was clicked (not dragged) */
  onOpen?: (slug: string, folder: HTMLElement) => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  // Starts with just the real folders: phones never show the rail, so they
  // never pay for its clones. A visible rail adds them before its first paint.
  const [copies, setCopies] = useState(1);
  // ... and the same goes for the repeats inside one set
  const reps = copies === 1 ? 1 : Math.ceil(MIN_SET / projects.length);
  const setLen = projects.length * reps;

  const s = useRef({
    current: 0,
    target: 0,
    setWidth: 0,
    pitch: 0,
    margin: 0,
    raf: 0,
    last: 0,
    drag: null as null | { id: number; x: number; y: number; target: number; vx: number; t: number },
    // the last press became a drag: the click that ends it opens nothing
    dragged: false,
  });

  const render = useCallback(() => {
    const st = s.current;
    const track = trackRef.current;
    if (!track || !st.setWidth) return;
    const x = st.margin - st.setWidth - mod(st.current, st.setWidth);
    track.style.transform = `translate3d(${x}px, 0, 0)`;
  }, []);

  const tick = useCallback(
    (now: number) => {
      const st = s.current;
      const dt = st.last ? Math.min((now - st.last) / (1000 / 60), 3) : 1;
      st.last = now;
      const k = 1 - Math.pow(1 - EASE, dt);
      st.current += (st.target - st.current) * k;
      render();
      if (Math.abs(st.target - st.current) > 0.05 || st.drag) {
        st.raf = requestAnimationFrame(tick);
      } else {
        st.current = st.target;
        render();
        st.raf = 0;
        st.last = 0;
      }
    },
    [render],
  );

  const kick = useCallback(() => {
    if (!s.current.raf) s.current.raf = requestAnimationFrame(tick);
  }, [tick]);

  // Measure one set width + left margin; add copies to cover wide screens.
  useLayoutEffect(() => {
    const rail = railRef.current;
    const track = trackRef.current;
    if (!rail || !track) return;

    const measure = () => {
      if (!rail.offsetParent) return; // hidden (phones)
      if (copies === 1) {
        setCopies(3);
        return;
      }
      const kids = track.children as HTMLCollectionOf<HTMLElement>;
      const n = setLen;
      if (kids.length < n + 1) return;
      const st = s.current;
      const setWidth = kids[n].offsetLeft - kids[0].offsetLeft;
      // not laid out yet (hidden, or a 0px-wide window): nothing to cover
      if (setWidth <= 0) return;
      st.setWidth = setWidth;
      st.pitch = st.setWidth / n;
      st.margin = parseFloat(getComputedStyle(rail).getPropertyValue("--rail-margin")) || 0;
      const needed = Math.ceil((rail.clientWidth + st.setWidth) / st.setWidth) + 1;
      setCopies((c) => (c === needed ? c : needed));
      render();
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(rail);
    return () => ro.disconnect();
  }, [setLen, copies, render]);

  // Wheel + trackpad: vertical and horizontal deltas both move the row,
  // wherever the pointer is on the page, so it never scrolls vertically.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const onWheel = (e: WheelEvent) => {
      // hidden (phones), under an open project, or a pinch-zoom
      if (!rail.offsetParent || rail.closest("[inert]") || e.ctrlKey || wheelScrollsPage(e)) return;
      e.preventDefault();
      const scale = e.deltaMode === 1 ? WHEEL_LINE : e.deltaMode === 2 ? rail.clientWidth : 1;
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      s.current.target += d * scale;
      kick();
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [kick]);

  useEffect(() => () => cancelAnimationFrame(s.current.raf), []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const st = s.current;
    st.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, target: st.target, vx: 0, t: performance.now() };
    st.dragged = false;
    railRef.current?.classList.add("is-dragging");
    kick();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const st = s.current;
    const drag = st.drag;
    if (!drag || drag.id !== e.pointerId) return;
    // capture only once it's a real drag, so a plain click still reaches the
    // folder's link (a captured one lands on the rail, and cmd-click is lost)
    if (!st.dragged && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) >= CLICK_SLOP) {
      st.dragged = true;
      railRef.current?.setPointerCapture(e.pointerId);
    }
    const now = performance.now();
    const next = drag.target - (e.clientX - drag.x);
    const frames = Math.max((now - drag.t) / (1000 / 60), 0.5);
    drag.vx = drag.vx * 0.6 + ((next - st.target) / frames) * 0.4;
    drag.t = now;
    st.target = next;
    st.current = next; // follow the finger 1:1 while dragging
    kick();
  };

  const endDrag = (e: React.PointerEvent) => {
    const st = s.current;
    if (!st.drag || st.drag.id !== e.pointerId) return;
    // Ignore stale velocity if the pointer rested before release.
    const idle = performance.now() - st.drag.t > 80;
    if (!idle && st.dragged) st.target += st.drag.vx * FLING;
    st.drag = null;
    railRef.current?.classList.remove("is-dragging");
    kick();
  };

  const onClick = (e: React.MouseEvent) => {
    // detail 0: the keyboard's click on a link, which no drag can have ended
    if (s.current.dragged && e.detail) {
      e.preventDefault();
      return;
    }
    clickFolder(e, onOpen);
  };

  // The row can't scroll by itself: tabbing to a folder off screen brings it in
  const onFocus = (e: React.FocusEvent) => {
    const target = e.target as HTMLElement;
    const folder = target.closest<HTMLElement>("[data-slug]");
    const rail = railRef.current;
    if (!folder || !rail || !target.matches(":focus-visible")) return;
    const r = folder.getBoundingClientRect();
    if (r.left >= 0 && r.right <= rail.clientWidth) return;
    s.current.target += r.left - s.current.margin;
    kick();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const st = s.current;
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" ? 1 : -1;
    st.target = (Math.round(st.target / st.pitch) + dir) * st.pitch;
    kick();
  };

  return (
    <div
      ref={railRef}
      className={styles.rail}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClick={onClick}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
    >
      <div ref={trackRef} className={styles.track}>
        {(copies === 1 ? [1] : Array.from({ length: copies }, (_, c) => c)).map((c) =>
          Array.from({ length: reps }, (_, rep) =>
            projects.map((p, i) => {
              // where this folder sits in the repeating unit
              const k = rep * projects.length + i;
              return (
                <Folder
                  key={`${c}-${rep}-${p.slug}`}
                  project={p}
                  href={`${base}/${p.slug}`}
                  // one real folder per person: the unit's own repeats are
                  // duplicates too, or a list of five would hold ten tab stops
                  clone={c !== 1 || rep !== 0}
                  // the row rests on copy 1's first folder, so stagger from there
                  enter={Math.min(Math.max((c - 1) * setLen + k, 0), ENTER_MAX)}
                />
              );
            }),
          ),
        )}
      </div>
    </div>
  );
}
