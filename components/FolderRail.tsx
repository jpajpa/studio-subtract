"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Project } from "@/content/projects";
import { Folder } from "./Folder";
import styles from "./FolderRail.module.css";

const EASE = 0.09; // per-frame approach to the target at 60fps
const FLING = 14; // how far a drag release coasts (× release velocity in px/frame)
const WHEEL_LINE = 16;
const ENTER_MAX = 8; // folders past this in the load-in stagger all start together

const mod = (n: number, m: number) => ((n % m) + m) % m;

/**
 * Endless horizontal row of folders. The set of projects is repeated enough
 * times to cover the viewport and the offset wraps by one set width, so the
 * row never ends in either direction.
 */
export function FolderRail({ projects }: { projects: Project[] }) {
  const railRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [copies, setCopies] = useState(3);

  const s = useRef({
    current: 0,
    target: 0,
    setWidth: 0,
    pitch: 0,
    margin: 0,
    raf: 0,
    last: 0,
    drag: null as null | { id: number; x: number; target: number; vx: number; t: number },
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
      const kids = track.children as HTMLCollectionOf<HTMLElement>;
      const n = projects.length;
      if (kids.length < n + 1) return;
      const st = s.current;
      st.setWidth = kids[n].offsetLeft - kids[0].offsetLeft;
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
  }, [projects.length, copies, render]);

  // Wheel + trackpad: vertical and horizontal deltas both move the row.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const scale = e.deltaMode === 1 ? WHEEL_LINE : e.deltaMode === 2 ? rail.clientWidth : 1;
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      s.current.target += d * scale;
      kick();
    };
    rail.addEventListener("wheel", onWheel, { passive: false });
    return () => rail.removeEventListener("wheel", onWheel);
  }, [kick]);

  useEffect(() => () => cancelAnimationFrame(s.current.raf), []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const st = s.current;
    st.drag = { id: e.pointerId, x: e.clientX, target: st.target, vx: 0, t: performance.now() };
    railRef.current?.setPointerCapture(e.pointerId);
    railRef.current?.classList.add("is-dragging");
    kick();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const st = s.current;
    const drag = st.drag;
    if (!drag || drag.id !== e.pointerId) return;
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
    if (!idle) st.target += st.drag.vx * FLING;
    st.drag = null;
    railRef.current?.classList.remove("is-dragging");
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
      aria-label="Projects"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
    >
      <div ref={trackRef} className={styles.track}>
        {Array.from({ length: copies }, (_, c) =>
          projects.map((p, i) => (
            <Folder
              key={`${c}-${p.slug}`}
              project={p}
              clone={c !== 1}
              // the row starts on copy 1, so stagger from its first folder
              enter={Math.min(Math.max((c - 1) * projects.length + i, 0), ENTER_MAX)}
            />
          )),
        )}
      </div>
    </div>
  );
}
