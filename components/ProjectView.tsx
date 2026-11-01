"use client";

import { useEffect, useImperativeHandle, useLayoutEffect, useRef, type CSSProperties, type Ref } from "react";
import Image from "next/image";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";
import type { Project, Section } from "@/lib/projects";
import { SiteNav } from "./SiteNav";
import styles from "./ProjectView.module.css";

if (typeof window !== "undefined") gsap.registerPlugin(SplitText, CustomEase);

const EASE = 0.085; // per-frame approach of the gallery to its target at 60fps
const FLING = 14;
const WHEEL_LINE = 16;
const FRAME_H = 780 / 1080; // frame height as a share of the viewport (Sketch)
const INTRO_DRIFT = 0.22; // heading trails the gallery: reads as further back
const DOLLY = 1.9; // how far the folders scale as the camera moves into one
const LIFT = 0.55; // s for a paper to rise out of (or sink into) its folder
const LIFT_CLEAR = 14; // px a lifted paper clears the folder's glass front by
const LIFT_STEP = 8; // px each lower paper rises less high, so they stay stacked
// s for a closing frame's descent into its folder, and how much of it the
// frame rides before its paper takes over; phones' drops are shorter
const SINK = { total: 1.15, lead: 0.25 };
const SINK_PHONE = { total: 0.85, lead: 0.18 };
// gathers speed while the frame rides it, then a long ease-out as the paper
// slides home
const SINK_EASE = CustomEase.create("sink", "M0,0 C0.38,0 0.12,1 1,1");

/** Phones: the page scrolls vertically and natively (see ProjectView.module.css). */
const isPhone = () => window.matchMedia("(max-width: 767px)").matches;

/** Nav and key; phones swap the nav for the page's own stacked one. */
const chromeEls = () => Array.from(document.querySelectorAll<HTMLElement>("[data-chrome]"));

export type ProjectViewHandle = { close: () => Promise<void> };

type Props = {
  project: Project;
  /** the folder that was clicked; null when the page was opened by URL */
  source: HTMLElement | null;
  onClose: () => void;
  section: Section;
  /** the project after this one: phones show a Next link at the end */
  nextSlug: string;
  onNext: () => void;
  ref?: Ref<ProjectViewHandle>;
};

/* ── Geometry for the folder ⇄ gallery flight ─────────────── */

type Pose = { cx: number; cy: number; w: number; h: number; angle: number };

/** Where a paper sits on screen right now, including its hover lift and tilt. */
function paperPose(img: HTMLElement, folder: HTMLElement): Pose {
  const fr = folder.getBoundingClientRect();
  const cs = getComputedStyle(img);
  const t = cs.transform;
  const m = t && t !== "none" ? new DOMMatrix(t) : new DOMMatrix();
  // exact, not offsetWidth/Height's whole pixels: rounded, a paper's shape is
  // off its frame's by up to a pixel, which the flight's clip then shows
  const w = parseFloat(cs.width);
  const h = parseFloat(cs.height);
  // papers rotate about their bottom centre (transform-origin: 50% 100%)
  const ox = fr.left + img.offsetLeft + w / 2;
  const oy = fr.top + img.offsetTop + h;
  return {
    cx: ox + m.c * (-h / 2) + m.e,
    cy: oy + m.d * (-h / 2) + m.f,
    w,
    h,
    angle: (Math.atan2(m.b, m.a) * 180) / Math.PI,
  };
}

/**
 * Transform that lays an (untransformed) gallery frame over a paper. The frame
 * scales uniformly so its image is never stretched, and a clip trims it to the
 * paper's crop.
 */
function flight(panel: HTMLElement, p: Pose) {
  const r = panel.getBoundingClientRect();
  const s = Math.max(p.w / r.width, p.h / r.height);
  const ix = (r.width - p.w / s) / 2;
  const iy = (r.height - p.h / s) / 2;
  return {
    panel: { x: p.cx - (r.left + r.width / 2), y: p.cy - (r.top + r.height / 2), scale: s, rotation: p.angle },
    clip: `inset(${iy}px ${ix}px ${iy}px ${ix}px round ${2 / s}px)`,
  };
}

// Clip tweens give their start value too: read back from the computed style,
// WebKit shortens it (`inset(1px 0px round 15px)`), and GSAP, pairing its
// numbers with the end value's, turns the corner radius into a bottom inset
const CLIP_OPEN = "inset(0px 0px 0px 0px round 0px)";

/** Folder papers bottom → top: images, or a video's still (videos only play in the gallery). */
const papersIn = (folder: HTMLElement) => Array.from(folder.querySelectorAll<HTMLImageElement>("[data-paper]"));

/**
 * How far a paper must rise for its bottom edge to clear the folder's glass
 * front (the `i`th paper from the top rises a little less).
 */
function liftOf(paper: HTMLElement, front: HTMLElement | null, i: number) {
  const top = front?.getBoundingClientRect().top ?? paper.getBoundingClientRect().top;
  return Math.max(paper.getBoundingClientRect().bottom - top + LIFT_CLEAR - i * LIFT_STEP, 0);
}

/** Every folder in the rail (desktop) and the stack (phones). */
const allFolders = () =>
  Array.from(document.querySelectorAll<HTMLElement>("[data-rail] [data-slug], [data-folder-stack] [data-slug]"));

/** Folders that are on screen (the hidden layout's have no size). */
function visibleFolders() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return allFolders().filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.right > -100 && r.left < vw + 100 && r.bottom > -100 && r.top < vh + 100;
  });
}

/**
 * A camera moving into (cx, cy): everything grows away from that point.
 * Folders never fade themselves: the view's scrim fades over them instead,
 * because WebKit mis-draws their glass (backdrop-filter) and shadows
 * (filter) while an ancestor's opacity animates.
 */
const dolly = (el: HTMLElement, cx: number, cy: number) => {
  const r = el.getBoundingClientRect();
  return {
    x: (r.left + r.width / 2 - cx) * (DOLLY - 1),
    y: (r.top + r.height / 2 - cy) * (DOLLY - 1),
    scale: DOLLY,
  };
};

const centre = (el: HTMLElement) => {
  const r = el.getBoundingClientRect();
  return [r.left + r.width / 2, r.top + r.height / 2] as const;
};

const offCentre = (el: HTMLElement) => {
  const [x, y] = centre(el);
  return [x - innerWidth / 2, y - innerHeight / 2] as const;
};

/**
 * Project page: a horizontal strip of heading, body text and media that
 * scrolls sideways with wheel, trackpad, drag or arrow keys. It opens by
 * flying the clicked folder's papers out into the gallery frames while the
 * other folders rush past the camera, and closes by reversing that.
 */
export function ProjectView({ project, source, onClose, section, nextSlug, onNext, ref }: Props) {
  // Studio pages name the person, then their role on the line below. Work
  // pages keep the title alone: a project's category is already on its folder.
  const showRole = section.id === "studio" && !!project.category;
  const { media, papers: folderPapers } = project;
  // each gallery item flies from its topmost paper in the folder, if it has one
  const paperOf = media.map((_, i) => folderPapers.findLastIndex((p) => p.media === i));
  // how far down the folder's stack that paper lies (0 = top): frames rise,
  // stack and fly in this order, not the gallery's, so none swap places
  const depthOf = paperOf.map((k) => folderPapers.length - 1 - k);
  // frames from higher papers fly over those from lower ones; the rest under all
  const zOf = (i: number) => paperOf[i] + 1;
  const root = useRef<HTMLDivElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const intro = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const body = useRef<HTMLParagraphElement>(null);
  const role = useRef<HTMLParagraphElement>(null);
  const back = useRef<HTMLAnchorElement>(null);
  const pager = useRef<HTMLElement>(null);
  const bar = useRef<HTMLSpanElement>(null);

  const s = useRef({
    current: 0,
    target: 0,
    max: 0,
    raf: 0,
    last: 0,
    live: false, // accepts input (off while animating in/out)
    drag: null as null | { id: number; x: number; target: number; vx: number; t: number; moved: boolean },
    // the last drag moved the gallery: the click that ends it opens nothing
    dragged: false,
    split: [] as SplitText[],
  });

  const q = (sel: string) => Array.from(root.current?.querySelectorAll<HTMLElement>(sel) ?? []);

  /* ── Video ────────────────────────────────────────────── */

  // Gallery videos wait on their still until their frame has landed: one
  // starting mid-flight (whenever it happened to load) decodes while it is
  // scaled and clipped every frame, which stutters, worst in Safari
  const play = (v: HTMLVideoElement | null | undefined) => {
    if (v?.paused) v.play().catch(() => {});
  };
  const videoIn = (panel: HTMLElement | undefined) => panel?.querySelector("video");

  /* ── Gallery scroll ───────────────────────────────────── */

  const render = () => {
    const st = s.current;
    if (!track.current) return;
    gsap.set(track.current, { x: -st.current });
    gsap.set(intro.current, { x: st.current * INTRO_DRIFT });
    if (bar.current) gsap.set(bar.current, { scaleX: st.max ? st.current / st.max : 0 });
  };

  const tick = (now: number) => {
    const st = s.current;
    const dt = st.last ? Math.min((now - st.last) / (1000 / 60), 3) : 1;
    st.last = now;
    st.current += (st.target - st.current) * (1 - Math.pow(1 - EASE, dt));
    render();
    if (Math.abs(st.target - st.current) > 0.05 || st.drag) {
      st.raf = requestAnimationFrame(tick);
    } else {
      st.current = st.target;
      render();
      st.raf = 0;
      st.last = 0;
    }
  };

  const kick = () => {
    if (!s.current.raf) s.current.raf = requestAnimationFrame(tick);
  };

  const moveTo = (x: number) => {
    const st = s.current;
    st.target = gsap.utils.clamp(0, st.max, x);
    kick();
  };

  const measure = () => {
    const st = s.current;
    const t = track.current;
    const v = viewport.current;
    if (!t || !v) return;
    // phones scroll the page natively, so the strip stays put
    st.max = isPhone() ? 0 : Math.max(t.offsetWidth - v.clientWidth, 0);
    // With no range there is nothing for the bar to report: a gallery that
    // fits, or a person with no media at all. It would sit there as an empty
    // rule promising a scroll that cannot happen, so it goes. Measured again
    // on every resize, so it comes back the moment the strip outgrows the
    // viewport.
    bar.current?.parentElement?.toggleAttribute("data-idle", st.max === 0);
    st.target = gsap.utils.clamp(0, st.max, st.target);
    st.current = gsap.utils.clamp(0, st.max, st.current);
    render();
  };

  useEffect(() => {
    const v = viewport.current;
    if (!v) return;
    const onWheel = (e: WheelEvent) => {
      if (isPhone()) return;
      e.preventDefault();
      if (!s.current.live) return;
      const scale = e.deltaMode === 1 ? WHEEL_LINE : e.deltaMode === 2 ? v.clientWidth : 1;
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      moveTo(s.current.target + d * scale);
    };
    const onKey = (e: KeyboardEvent) => {
      if (!s.current.live) return;
      const step = window.innerWidth * 0.5;
      if (e.key === "Escape") onClose();
      else if (isPhone()) return;
      else if (e.key === "ArrowRight" || e.key === "PageDown") moveTo(s.current.target + step);
      else if (e.key === "ArrowLeft" || e.key === "PageUp") moveTo(s.current.target - step);
      else if (e.key === "Home") moveTo(0);
      else if (e.key === "End") moveTo(s.current.max);
      else return;
      e.preventDefault();
    };
    const ro = new ResizeObserver(measure);
    ro.observe(v);
    v.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      ro.disconnect();
      v.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(s.current.raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  const onPointerDown = (e: React.PointerEvent) => {
    const st = s.current;
    // PDF covers are links you can also drag the gallery by
    const link = (e.target as HTMLElement).closest("a");
    if (e.button !== 0 || !st.live || isPhone() || (link && !link.hasAttribute("data-pdf"))) return;
    st.drag = { id: e.pointerId, x: e.clientX, target: st.target, vx: 0, t: performance.now(), moved: false };
    st.dragged = false;
    kick();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const st = s.current;
    const drag = st.drag;
    if (!drag || drag.id !== e.pointerId) return;
    // capture only once it's a real drag, so a plain click still reaches a PDF link
    if (!drag.moved) {
      if (Math.abs(e.clientX - drag.x) < 4) return;
      drag.moved = st.dragged = true;
      viewport.current?.setPointerCapture(e.pointerId);
    }
    const now = performance.now();
    const next = gsap.utils.clamp(0, st.max, drag.target - (e.clientX - drag.x));
    const frames = Math.max((now - drag.t) / (1000 / 60), 0.5);
    drag.vx = drag.vx * 0.6 + ((next - st.target) / frames) * 0.4;
    drag.t = now;
    st.target = st.current = next;
    kick();
  };

  /* ── Click outside to close (desktop) ─────────────────── */

  /** Empty page: not a frame, the text column or a link. */
  const isEmpty = (t: EventTarget | null) =>
    !(t as HTMLElement | null)?.closest?.(`[data-media], .${styles.intro}, a, nav`);

  // a small "Close" label trails the cursor over empty page
  const cursor = useRef<HTMLSpanElement>(null);
  const moveCursor = (e: React.PointerEvent) => {
    const c = cursor.current;
    if (!c) return;
    const show = e.pointerType === "mouse" && !isPhone() && s.current.live && !s.current.drag?.moved && isEmpty(e.target);
    c.toggleAttribute("data-on", show);
    if (show) c.style.translate = `${e.clientX}px ${e.clientY}px`;
  };

  const onViewportClick = (e: React.MouseEvent) => {
    // the click that ends a drag closes nothing
    if (isPhone() || !s.current.live || s.current.dragged || !isEmpty(e.target)) return;
    cursor.current?.removeAttribute("data-on");
    onClose();
  };

  const endDrag = (e: React.PointerEvent) => {
    const st = s.current;
    if (!st.drag || st.drag.id !== e.pointerId) return;
    const idle = performance.now() - st.drag.t > 80;
    const vx = st.drag.vx;
    st.drag = null;
    moveTo(st.target + (idle ? 0 : vx * FLING));
  };

  /* ── Text ─────────────────────────────────────────────── */

  const splitText = () => {
    const st = s.current;
    st.split.forEach((sp) => sp.revert());
    st.split = [
      SplitText.create(title.current!, { type: "lines,chars", mask: "lines", linesClass: styles.line }),
      SplitText.create(body.current!, { type: "lines", mask: "lines", linesClass: styles.line }),
    ];
    // a person's role, when there is one, leads the body lines in
    if (role.current) {
      st.split.push(SplitText.create(role.current, { type: "lines", mask: "lines", linesClass: styles.line }));
    }
    return { chars: st.split[0].chars, lines: introLines() };
  };

  // link and credit rows animate like body lines; each row is its own mask
  const metaLines = () => q(`.${styles.intro} .${styles.row} > *`);

  /** Every masked line under the title, top to bottom, so they stagger in order. */
  const introLines = () => {
    const st = s.current;
    return [...(st.split[2]?.lines ?? []), ...(st.split[1]?.lines ?? []), ...metaLines()];
  };

  useEffect(() => () => s.current.split.forEach((sp) => sp.revert()), []);

  /* ── Open ─────────────────────────────────────────────── */

  useLayoutEffect(() => {
    // a context so a re-run (React StrictMode in dev) starts from a clean slate
    let raf = 0;
    const ctx = gsap.context(() => {
      const tl = open();
      // Mounting the page and splitting its text makes the next frame late;
      // starting the clock after that frame keeps the first moves from
      // skipping ahead (most visible on phones).
      raf = requestAnimationFrame(() => (raf = requestAnimationFrame(() => tl.play())));
    });
    return () => {
      cancelAnimationFrame(raf);
      ctx.revert();
    };
    // mount only: the view is keyed by project
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = () => {
    const el = root.current!;
    const panels = q("[data-panel]");
    const frames = q("[data-media]");
    const shadows = q("[data-shadow]");
    const chrome = chromeEls();
    const folders = visibleFolders();
    const phone = isPhone();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const { chars, lines } = splitText();
    measure();
    el.dataset.ready = "";
    // the scrim covers the folders from here on (opaque unless flying out)
    gsap.set(el, { backgroundColor: "transparent" });

    // folders and nav were animated in by CSS; that would override GSAP
    for (const f of [...folders, ...chrome]) f.style.animation = "none";
    // the phone nav's scroll-hide transitions would trail every GSAP tick
    gsap.set(chrome, { transition: "none" });

    const tl = gsap.timeline({
      paused: true,
      onComplete: () => {
        s.current.live = true;
        // any not started on landing (opened by URL, reduced motion)
        q("video").forEach((v) => play(v as HTMLVideoElement));
        gsap.set(panels, { clearProps: "zIndex" });
        // out of sight under the scrim: stop compositing their glass
        gsap.set(folders, { opacity: 0 });
        render();
        viewport.current?.focus({ preventScroll: true });
      },
    });

    if (reduced) {
      gsap.set([...folders, ...chrome], { opacity: 0 });
      tl.from(el, { opacity: 0, duration: 0.4 });
      return tl;
    }

    tl.to(chrome, { opacity: 0, y: -8, duration: 0.4, ease: "power2.in" }, 0);

    if (source) {
      gsap.set(scrim.current, { opacity: 0 });
      const papers = papersIn(source);
      const front = source.querySelector<HTMLElement>("[data-front]");
      const [sx, sy] = centre(source);
      // phones scrub a folder open with the scroll (Folder.module.css): the
      // papers hold the pose they're in, and the flight takes them from there
      // (through GSAP, so its context's revert leaves no inline pose behind)
      const held = papers.map((p) => getComputedStyle(p).transform);
      papers.forEach((p, i) => gsap.set(p, { transform: held[i] }));
      source.setAttribute("data-flight", "");
      source.setAttribute("data-open", "");
      // GSAP drives the papers now, not their hover transition
      gsap.set(papers, { transition: "none" });

      // 1. The papers rise up out of the folder, from behind its glass, top
      //    one first. 2. Clear of it, each becomes its gallery frame and flies
      //    into place.
      let handoff = 0;
      panels.forEach((panel, i) => {
        const paper = papers[paperOf[i]];
        if (!paper) {
          // not in the folder: drift in once the others are under way
          tl.from(panel, { y: 60, opacity: 0, duration: 1.2, ease: "expo.out" }, LIFT + 0.3 + i * 0.07);
          tl.call(play, [videoIn(panel)], LIFT + 0.3 + i * 0.07 + 0.8);
          return;
        }
        const up = depthOf[i] * 0.06;
        const lift = liftOf(paper, front, depthOf[i]);
        const pose = paperPose(paper, source);
        tl.to(paper, { y: `-=${lift}`, duration: LIFT, ease: "power3.inOut" }, up);

        // phones hand over as the paper eases into the top of its rise (under
        // a pixel short of it), so it doesn't sit there before flying
        const at = up + LIFT * (phone ? 0.85 : 1);
        handoff = Math.max(handoff, at);
        // its shadow and depth shading ease away as it rises, gone by the
        // handover, so the frame takes over without a blink or a jump in tone
        tl.to(paper, { "--paper-shadow": 0, duration: at - up, ease: "power1.inOut" }, up);
        const f = flight(panel, { ...pose, cy: pose.cy - lift });
        gsap.set(panel, { ...f.panel, zIndex: zOf(i), opacity: 0 });
        // the paper's image (already loaded) shows until the frame's own
        // larger one arrives, so a frame never flies in empty
        gsap.set(frames[i], { clipPath: f.clip, backgroundImage: `url("${paper.currentSrc || paper.src}")` });
        // its big soft shadow eases in over the second half of the flight:
        // scaled down, it breaks up in WebKit
        gsap.set(shadows[i], { opacity: 0 });
        tl.set(panel, { opacity: 1 }, at);
        tl.set(paper, { visibility: "hidden" }, at);
        // phones: short flights; expo's long flat start reads as the papers
        // stalling after they rise
        const fly = phone ? { duration: 1.05, ease: "power2.inOut" } : { duration: 1.35, ease: "expo.inOut" };
        const unclip = phone ? { duration: 0.9, ease: "power2.inOut" } : { duration: 1.15, ease: "expo.inOut" };
        tl.to(panel, { x: 0, y: 0, scale: 1, rotation: 0, ...fly }, at);
        tl.fromTo(frames[i], { clipPath: f.clip }, { clipPath: CLIP_OPEN, ...unclip }, at + 0.08);
        tl.to(shadows[i], { opacity: 1, duration: fly.duration * 0.7, ease: "sine.inOut" }, at + fly.duration * 0.5);
        tl.call(play, [videoIn(panel)], at + fly.duration);
      });

      // The camera dives into the folder: the rest rush outward past it
      // while the page fades up over them.
      const dive = Math.max(handoff - 0.2, 0);
      folders
        .filter((f) => f !== source)
        .forEach((f) => tl.to(f, { ...dolly(f, sx, sy), duration: 1.1, ease: "power3.in" }, dive));
      tl.to(source, { scale: DOLLY, duration: 1.1, ease: "power3.in" }, dive + 0.12);
      tl.to(scrim.current, { opacity: 1, duration: 0.75, ease: "power1.in" }, dive + 0.2);
    } else {
      // Opened by URL: the folders wait out of shot; the gallery glides in.
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      folders.forEach((f) => gsap.set(f, dolly(f, cx, cy)));
      gsap.set(chrome, { opacity: 0 });
      if (phone) {
        tl.from(panels, { y: window.innerHeight * 0.3, opacity: 0, duration: 1.5, ease: "expo.out", stagger: 0.09 }, 0.15);
      } else tl.from(
        panels,
        {
          x: window.innerWidth * 0.55,
          rotationY: -24,
          z: -260,
          opacity: 0,
          transformPerspective: 1800,
          transformOrigin: "0% 50%",
          duration: 1.7,
          ease: "expo.out",
          stagger: 0.09,
        },
        0.15,
      );
    }

    const t = source ? LIFT + 0.75 : 0.3;
    tl.from(chars, { yPercent: 115, duration: 1.1, ease: "expo.out", stagger: 0.028 }, t);
    if (lines.length) tl.from(lines, { yPercent: 115, duration: 1, ease: "expo.out", stagger: 0.08 }, t + 0.18);
    tl.from([back.current, pager.current], { opacity: 0, y: 8, duration: 0.8, ease: "power3.out" }, t + 0.3);
    // phones' nav: explicit end values (its CSS transitions would be read
    // mid-way), then handed back to CSS so it can slide away on scroll
    tl.fromTo(
      q("[data-inner-nav]"),
      { opacity: 0, y: 8, transition: "none" },
      { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", clearProps: "all" },
      t + 0.3,
    );
    tl.from(bar.current!.parentElement, { scaleX: 0, transformOrigin: "0% 50%", duration: 1.2, ease: "expo.inOut" }, t + 0.2);
    return tl;
  };

  /* ── Close ────────────────────────────────────────────── */

  useImperativeHandle(ref, () => ({
    close: () =>
      new Promise<void>((resolve) => {
        const st = s.current;
        const el = root.current!;
        st.live = false;
        st.drag = null;
        cursor.current?.removeAttribute("data-on");
        cancelAnimationFrame(st.raf);
        st.raf = 0;
        // frames fly back holding their current picture: no decoding mid-flight
        q("video").forEach((v) => (v as HTMLVideoElement).pause());

        const panels = q("[data-panel]");
        const frames = q("[data-media]");
        const shadows = q("[data-shadow]");
        const chrome = chromeEls();
        gsap.set(chrome, { transition: "none" });
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        // Each frame eases out to just above the folder and is already
        // sinking as it arrives; its paper takes over at the same speed and
        // settles in, in one motion. Phones: the same quicker flights as on
        // opening.
        const phone = isPhone();
        const fly = phone ? { duration: 1, ease: "power2.inOut" } : { duration: 1, ease: "power3.out" };
        const clip = phone ? { duration: 0.9, ease: "power2.inOut" } : { duration: 0.9, ease: "power3.out" };

        // Folders back at rest for measuring (still invisible: same frame).
        const folders = allFolders();
        gsap.set(folders, { clearProps: "transform,opacity" });
        const onScreen = visibleFolders();
        // the clicked folder, or this project's folder nearest the middle of the screen
        const home =
          (source?.isConnected && onScreen.includes(source) ? source : null) ??
          onScreen
            .filter((f) => f.dataset.slug === project.slug)
            .sort((a, b) => Math.hypot(...offCentre(a)) - Math.hypot(...offCentre(b)))[0] ??
          null;
        const [hx, hy] = home ? centre(home) : [innerWidth / 2, innerHeight / 2];
        const from = new Map(onScreen.map((f) => [f, dolly(f, hx, hy)]));

        const done = () => {
          if (home) {
            gsap.set(papersIn(home), { clearProps: "visibility,transform,transition,--paper-shadow" });
            home.removeAttribute("data-open"); // closes with its own CSS transition
          }
          // phones: the scroll takes over the folders' opening again
          if (home) gsap.set(home.querySelector("[data-front]"), { clearProps: "transform" });
          for (const f of folders) f.removeAttribute("data-flight");
          // phones: the stack re-opens whichever folder is mid-screen
          window.dispatchEvent(new Event("folderstack:sync"));
          gsap.set(folders, { clearProps: "transform,opacity,willChange" });
          gsap.set(chrome, { clearProps: "transform,opacity,transition" });
          resolve();
        };

        if (reduced) {
          gsap.set(onScreen, { opacity: 0 });
          gsap.timeline({ onComplete: done })
            .to(el, { opacity: 0, duration: 0.3 })
            .to([...onScreen, ...chrome], { opacity: 1, duration: 0.3 });
          return;
        }

        // Where each frame lands: just above the home folder (held open, at
        // rest), where its paper then takes over and sinks back in.
        let poses: (Pose | null)[] = panels.map(() => null);
        const lifts: number[] = [];
        const homePapers = home ? papersIn(home) : [];
        if (home) {
          const front = home.querySelector<HTMLElement>("[data-front]");
          // The opening flight left its papers lifted (inline): measure from
          // the open folder itself, or the lift comes out as nothing and the
          // papers hang above the folder until it closes.
          const els = [...homePapers, front];
          gsap.set(els, { transition: "none", clearProps: "transform" });
          home.setAttribute("data-open", "");
          // phones: the pose the scroll holds this folder in (Folder.module.css).
          // The papers sink back to it, so the scroll takes over without a jump
          // (it can't ease in like the CSS transition does elsewhere). Read
          // with the lift gone: WebKit hasn't restarted the scroll animation
          // yet, so it reports the folder's own (open) pose.
          home.removeAttribute("data-flight");
          const held = els.map((el) =>
            el && getComputedStyle(el).animationName !== "none" ? getComputedStyle(el).transform : null,
          );
          home.setAttribute("data-flight", "");
          els.forEach((el, k) => {
            if (el && held[k]) gsap.set(el, { transform: held[k] });
          });
          poses = paperOf.map((k, i) => {
            const paper = homePapers[k];
            if (!paper) return null;
            const pose = paperPose(paper, home);
            lifts[i] = liftOf(paper, front, depthOf[i]);
            return { ...pose, cy: pose.cy - lifts[i] };
          });
          gsap.set(front, { clearProps: "transition" });
          // only papers that have a frame to come back from leave the folder
          paperOf.forEach((k, i) => {
            if (homePapers[k]) gsap.set(homePapers[k], { visibility: "hidden", y: `-=${lifts[i]}` });
          });
        }

        // each folder keeps its layer while it shrinks back, instead of being
        // redrawn (glass, papers and all) at every step of the scale
        onScreen.forEach((f) => gsap.set(f, { ...from.get(f)!, willChange: "transform" }));

        // Showing the folders again is one heavy frame (every glass front
        // drawn at the dolly's scale): the clock starts after it, so the
        // flights don't open by skipping ahead
        const tl = gsap.timeline({ paused: true, onComplete: done });
        requestAnimationFrame(() => requestAnimationFrame(() => tl.play()));
        tl.to(scrim.current, { opacity: 0, duration: 0.7, ease: "power1.out" }, 0.25);
        tl.to(st.split[0].chars, { yPercent: -115, duration: 0.55, ease: "power3.in", stagger: 0.015 }, 0);
        const lines = introLines();
        if (lines.length) tl.to(lines, { yPercent: -115, duration: 0.5, ease: "power3.in", stagger: 0.04 }, 0.05);
        gsap.set(q("[data-inner-nav]"), { transition: "none" });
        tl.to([back.current, pager.current, bar.current!.parentElement, ...q("[data-inner-nav]")], { opacity: 0, duration: 0.35 }, 0);

        // Frames fly to just above the folder (bottom one first, so the top
        // paper goes in last), then become papers and sink back in.
        let order = 0;
        let lastAbove = 0;
        const bottomUp = panels.map((_, i) => i).sort((a, b) => paperOf[a] - paperOf[b]);
        for (const i of bottomUp) {
          const panel = panels[i];
          const pose = poses[i];
          gsap.set(panel, { zIndex: zOf(i) });
          if (!pose) {
            tl.to(panel, { y: 60, opacity: 0, duration: 0.6, ease: "power2.in" }, 0.15 + i * 0.05);
            continue;
          }
          const at = 0.15 + order++ * 0.06;
          const paper = homePapers[paperOf[i]];
          const above = at + fly.duration;
          lastAbove = Math.max(lastAbove, above);
          tl.to(shadows[i], { opacity: 0, duration: fly.duration * 0.5, ease: "sine.inOut" }, at);
          // takes over shadowless and unshaded, as the frame was; both return
          // as it sinks back in
          tl.set(paper, { visibility: "visible", "--paper-shadow": 0 }, above);
          tl.set(panel, { opacity: 0 }, above);

          // One descent, from `lead` before the frame lands to the paper at
          // rest, on a single curve: the frame rides its first part and the
          // paper the rest, so it never stops between. The frame lands `early`
          // higher, and has sunk that far by the handover, which happens
          // exactly where it always did. Desktop papers settle into the closed
          // folder; phones' back into the pose the scroll holds them in.
          const { total, lead } = phone ? SINK_PHONE : SINK;
          const settle = phone ? { y: `+=${lifts[i]}` } : { x: 0, y: 0, rotation: parseFloat(paper.style.getPropertyValue("--r")) || 0 };
          const drop = phone ? lifts[i] : -(gsap.getProperty(paper, "y") as number);
          const k = SINK_EASE(lead / total);
          const early = (drop * k) / (1 - k);
          const f = flight(panel, { ...pose, cy: pose.cy - early });
          tl.to(panel, { ...f.panel, ...fly }, at);
          tl.fromTo(frames[i], { clipPath: CLIP_OPEN }, { clipPath: f.clip, ...clip }, at);
          // inside the frame, so the descent stays straight down whatever its
          // tilt and scale (both settled by now)
          const rad = (f.panel.rotation * Math.PI) / 180;
          tl.to(
            frames[i],
            {
              x: (early * Math.sin(rad)) / f.panel.scale,
              y: (early * Math.cos(rad)) / f.panel.scale,
              duration: lead,
              ease: (u: number) => SINK_EASE((u * lead) / total) / k,
            },
            above - lead,
          );
          const rest = { duration: total - lead, ease: (u: number) => (SINK_EASE((lead + u * (total - lead)) / total) - k) / (1 - k) };
          tl.to(paper, { ...settle, ...rest }, above);
          tl.to(paper, { "--paper-shadow": 1, duration: rest.duration, ease: "power1.inOut" }, above);
        }

        // Desktop: the front tips shut (its own CSS transition) as the top
        // paper goes in; papers with no frame to come back from close with it
        if (home && !phone && lastAbove) {
          tl.call(
            () => {
              gsap.set(homePapers.filter((_, k) => !paperOf.includes(k)), { clearProps: "transition" });
              home.removeAttribute("data-open");
            },
            undefined,
            lastAbove,
          );
          // the page unmounts once that has settled too: taking it down
          // mid-motion costs a visible hitch
          tl.set({}, {}, lastAbove + 0.7);
        }

        // The camera pulls back out of the folder.
        onScreen.forEach((f) => {
          const at = f === home ? 0.25 : 0.4;
          tl.to(f, { x: 0, y: 0, scale: 1, duration: f === home ? 1 : 1.1, ease: "expo.out" }, at);
        });
        tl.to(chrome, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, 0.9);
      }),
  }));

  // PDFs open from their covers in the gallery, so only the project's own link is listed
  const links = project.link ? [project.link] : [];

  return (
    <div
      ref={root}
      className={styles.view}
      role="dialog"
      aria-modal="true"
      aria-label={[project.title, project.year].filter(Boolean).join(", ")}
      style={{ "--tint": project.fill[1] } as CSSProperties}
    >
      <div ref={scrim} className={styles.scrim} aria-hidden />

      <SiteNav section={section} inner onHome={() => s.current.live && onClose()} />

      <a
        ref={back}
        className={styles.back}
        href={section.home}
        onClick={(e) => {
          e.preventDefault();
          if (s.current.live) onClose();
        }}
      >
        Back
      </a>

      <div
        ref={viewport}
        className={styles.viewport}
        tabIndex={-1}
        onPointerDown={onPointerDown}
        onPointerMove={(e) => {
          onPointerMove(e);
          moveCursor(e);
        }}
        onPointerLeave={() => cursor.current?.removeAttribute("data-on")}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={onViewportClick}
      >
        <div ref={track} className={styles.track}>
          <header ref={intro} className={styles.intro}>
            <h1 ref={title} className={styles.title}>
              {project.title}
            </h1>
            {showRole && (
              <p ref={role} className={styles.subtitle}>
                {project.category}
              </p>
            )}
            <p ref={body} className={styles.body} hidden={!project.description}>
              {project.description}
            </p>
            {(project.credits.length > 0 || links.length > 0) && (
              <div className={styles.meta}>
                {project.credits.length > 0 && (
                  <ul className={styles.credits}>
                    {project.credits.map((c, i) => (
                      <li key={i} className={styles.row}>
                        <span>
                          <span className={styles.role}>{c.role}</span> {c.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {links.map((l, i) => (
                  <p key={i} className={styles.row}>
                    <a className={styles.link} href={l.url} target="_blank" rel="noreferrer">
                      {l.label} ↗
                    </a>
                  </p>
                ))}
              </div>
            )}
          </header>

          {media.map((m, i) => (
            <figure
              key={`${i}-${m.src}`}
              className={styles.panel}
              data-panel
              style={{ "--ar": `${m.w} / ${m.h}` } as CSSProperties}
            >
              <div className={styles.shadow} data-shadow />
              <div className={styles.media} data-media>
                {m.pdf ? (
                  <a
                    className={styles.pdf}
                    href={m.pdf}
                    target="_blank"
                    rel="noreferrer"
                    data-pdf
                    draggable={false}
                    onClick={(e) => {
                      if (s.current.dragged) e.preventDefault();
                    }}
                  >
                    <Image
                      src={m.src}
                      alt={m.alt}
                      width={m.w}
                      height={m.h}
                      sizes={`(max-width: 767px) calc(100vw - 52px), calc(${(FRAME_H * 100).toFixed(2)}svh * ${(m.w / m.h).toFixed(4)})`}
                      quality={90}
                      loading={i < 3 ? "eager" : "lazy"}
                      draggable={false}
                    />
                    <span className={styles.pdfTag}>View PDF ↗</span>
                  </a>
                ) : m.kind === "video" ? (
                  <video poster={m.src} width={m.w} height={m.h} muted loop playsInline preload="auto" aria-label={m.alt || undefined}>
                    {/* phones play the lighter copy: a full 4K upload stutters there */}
                    {m.small && <source src={m.small} media="(max-width: 767px)" />}
                    <source src={m.video} />
                  </video>
                ) : (
                  <Image
                    src={m.src}
                    alt={m.alt}
                    width={m.w}
                    height={m.h}
                    // desktop: every frame is FRAME_H of the viewport tall, its width follows
                    // the image; phones: frames span the column
                    sizes={`(max-width: 767px) calc(100vw - 52px), calc(${(FRAME_H * 100).toFixed(2)}svh * ${(m.w / m.h).toFixed(4)})`}
                    quality={90}
                    loading={i < 3 ? "eager" : "lazy"}
                    draggable={false}
                  />
                )}
              </div>
            </figure>
          ))}

          <nav ref={pager} className={styles.pager} aria-label={section.label}>
            <a
              href={section.home}
              aria-label="Back"
              onClick={(e) => {
                e.preventDefault();
                if (s.current.live) onClose();
              }}
            >
              <Arrow />
            </a>
            <a
              href={`${section.base}/${nextSlug}`}
              aria-label="Next"
              onClick={(e) => {
                e.preventDefault();
                if (s.current.live) onNext();
              }}
            >
              <Arrow next />
            </a>
          </nav>
        </div>
      </div>

      <div className={styles.progress} aria-hidden>
        <span ref={bar} />
      </div>

      <span ref={cursor} className={styles.cursor} aria-hidden>
        Close
      </span>
    </div>
  );
}

/** Footer arrow (Sketch "Mobile/Inner Page 2"): left for Back, right for Next. */
function Arrow({ next }: { next?: boolean }) {
  return (
    <svg width="24" height="19" viewBox="0 0 24 19" fill="none" aria-hidden style={next ? { transform: "scaleX(-1)" } : undefined}>
      <path d="M3 9.5h18M10.5 2 3 9.5l7.5 7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
