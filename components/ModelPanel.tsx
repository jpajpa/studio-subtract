"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import styles from "./ProjectView.module.css";

/**
 * DEMO: a character at the end of the Loho gallery, floating rather than framed.
 *
 * The model is a Meshy export from the campaign, decimated from 976k triangles
 * to 60k with its three 2048 maps halved: 39.5MB down to 3.1MB, with no
 * difference I can see at the size this draws it. Geometry is uncompressed on
 * purpose: a Draco pass reaches 0.98MB but needs a decoder fetched at runtime,
 * which I could not get to resolve to prove it works.
 *
 * Deliberately not [data-panel]. open() and close() walk [data-panel],
 * [data-media] and [data-shadow] as three arrays paired by index, and pair
 * each one with paperOf[i], so a panel carrying no media and no folder paper
 * would knock that pairing out by one and send the close animation flying the
 * wrong frames into the folder. Out of that set, it simply sits in the strip.
 *
 * model-viewer's own camera-controls are off. It is driven frame by frame
 * instead, because three things move the camera at once and the built-in
 * controls would fight all of them: the pointer, where the panel sits on
 * screen, and a slow idle drift. Every input writes to a target and the camera
 * eases toward it, so nothing ever snaps.
 */
const VIEWER = "https://cdn.jsdelivr.net/npm/@google/model-viewer@4.0.0/dist/model-viewer.min.js";
const ModelViewer = "model-viewer" as unknown as React.ElementType;

const RADIUS = "200%";
const BASE_THETA = 20; // degrees, the resting three-quarter view
const BASE_PHI = 85;
const DRAG_YAW = 0.8; // degrees per pixel dragged across
const DRAG_PITCH = 0.5; // and up and down, so it turns on both axes
const CURSOR_YAW = 70; // how far the pointer alone turns it
const CURSOR_PITCH = 30;
const TRAVEL_YAW = 38; // turn across the panel's trip through the viewport
const IDLE_DEG_PER_S = 2.2;
// Two rates, so the two gestures feel different. The pointer is chased
// slowly, which is what reads as the model trailing the cursor rather than
// being pinned to it; the camera then follows its target faster, so a drag
// still lands under your hand.
const POINTER_EASE = 0.05;
const EASE = 0.12;
const PHI_MIN = 20;
const PHI_MAX = 160;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function ModelPanel() {
  const [ready, setReady] = useState(false);
  const figure = useRef<HTMLElement>(null);
  const viewer = useRef<HTMLElement & { cameraOrbit?: string }>(null);
  const s = useRef({
    theta: BASE_THETA,
    phi: BASE_PHI,
    drag: { x: 0, y: 0 }, // what the viewer has turned it by, kept between gestures
    pointer: { x: 0, y: 0 }, // where the cursor is
    lag: { x: 0, y: 0 }, // and where the model thinks it is, a beat behind
    down: null as null | { x: number; y: number; fromX: number; fromY: number },
    idle: 0,
    raf: 0,
    seen: true,
  });

  useEffect(() => {
    if (customElements.get("model-viewer")) return setReady(true);
    const found = document.querySelector<HTMLScriptElement>(`script[src="${VIEWER}"]`);
    const el = found ?? Object.assign(document.createElement("script"), { src: VIEWER, type: "module" });
    const done = () => setReady(true);
    el.addEventListener("load", done);
    if (!found) document.head.appendChild(el);
    return () => el.removeEventListener("load", done);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const st = s.current;
    const fig = figure.current;
    if (!fig) return;

    // only run while it is on screen
    const io = new IntersectionObserver(([e]) => (st.seen = e.isIntersecting), { rootMargin: "200px" });
    io.observe(fig);

    const onMove = (e: PointerEvent) => {
      st.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      st.pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      st.raf = requestAnimationFrame(frame);
      if (!st.seen || !viewer.current) return;

      st.idle += IDLE_DEG_PER_S * dt;
      // the cursor is chased, not tracked
      st.lag.x += (st.pointer.x - st.lag.x) * POINTER_EASE;
      st.lag.y += (st.pointer.y - st.lag.y) * POINTER_EASE;

      // where the panel sits across the viewport, -1 to 1: the strip scrolling
      // past turns the figure, and on phones the page scroll does the same
      const r = fig.getBoundingClientRect();
      const travel = ((r.left + r.width / 2) / window.innerWidth) * 2 - 1;

      const targetTheta =
        BASE_THETA + st.idle + st.drag.x - st.lag.x * CURSOR_YAW + travel * TRAVEL_YAW;
      const targetPhi = clamp(BASE_PHI + st.drag.y - st.lag.y * CURSOR_PITCH, PHI_MIN, PHI_MAX);

      st.theta += (targetTheta - st.theta) * EASE;
      st.phi += (targetPhi - st.phi) * EASE;
      viewer.current.cameraOrbit = `${st.theta.toFixed(2)}deg ${st.phi.toFixed(2)}deg ${RADIUS}`;
    };
    st.raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(st.raf);
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, [ready]);

  // Dragging spins it. The gallery drags and scrolls on the same events, so the
  // panel keeps pointer events to itself; wheel is left alone, so scrolling
  // still moves the strip rather than trapping the cursor here.
  const down = (e: React.PointerEvent) => {
    e.stopPropagation();
    const st = s.current;
    st.down = { x: e.clientX, y: e.clientY, fromX: st.drag.x, fromY: st.drag.y };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    e.stopPropagation();
    const d = s.current.down;
    if (!d) return;
    // both axes are negated: theta and phi move the camera, so the model only
    // follows the hand if the camera goes the other way
    s.current.drag.x = d.fromX - (e.clientX - d.x) * DRAG_YAW;
    s.current.drag.y = d.fromY - (e.clientY - d.y) * DRAG_PITCH;
  };
  const up = (e: React.PointerEvent) => {
    e.stopPropagation();
    s.current.down = null;
  };

  return (
    <figure
      ref={figure}
      className={styles.panel}
      data-model
      style={{ "--ar": "3 / 4" } as CSSProperties}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onClick={(e) => e.stopPropagation()}
    >
      {ready && (
        <ModelViewer
          ref={viewer}
          src="/loho/character.glb"
          alt="A character from the Loho Kur campaign, turned with the cursor"
          loading="eager"
          interaction-prompt="none"
          shadow-intensity="0"
          exposure="1.15"
          environment-image="neutral"
          camera-orbit={`${BASE_THETA}deg ${BASE_PHI}deg ${RADIUS}`}
          min-camera-orbit={`auto auto ${RADIUS}`}
          max-camera-orbit={`auto auto ${RADIUS}`}
          style={{ width: "100%", height: "100%", display: "block", backgroundColor: "transparent" } as CSSProperties}
        />
      )}
    </figure>
  );
}
