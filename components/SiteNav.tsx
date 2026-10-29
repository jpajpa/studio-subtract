"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import styles from "./SiteNav.module.css";

const TOP_ZONE = 24; // always shown this close to the top
const HIDE_AFTER = 8; // px scrolled down before hiding
const SHOW_AFTER = 12; // px scrolled up before showing again

type Props = {
  /** phones' project page: stacked top-left over a fade, "Work" closes it */
  inner?: boolean;
  onWork?: () => void;
};

/**
 * Main nav. Desktop: stacked top-left. Phones: one row fixed to the top that
 * slides away while scrolling down and returns on a small scroll up (stacked
 * on project pages, Sketch "Mobile/Inner Page").
 */
export function SiteNav({ inner, onWork }: Props = {}) {
  const [hidden, setHidden] = useState(false);
  const s = useRef({ lastY: 0, travel: 0, scroller: null as EventTarget | null });
  const pathname = usePathname();

  // a project page opening or closing starts at its top: show the nav
  useEffect(() => {
    s.current.scroller = null;
    setHidden(false);
  }, [pathname]);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const st = s.current;
      // the page, or a project page scrolling on its own over it
      const el = st.scroller instanceof Element ? st.scroller : null;
      const y = Math.max(el ? el.scrollTop : window.scrollY, 0);
      const delta = y - st.lastY;
      st.lastY = y;
      if (y < TOP_ZONE) {
        st.travel = 0;
        setHidden(false);
        return;
      }
      // Accumulate travel in one direction; reset when it flips.
      st.travel = Math.sign(delta) === Math.sign(st.travel) ? st.travel + delta : delta;
      if (st.travel > HIDE_AFTER) setHidden(true);
      else if (st.travel < -SHOW_AFTER) setHidden(false);
    };
    const onScroll = (e: Event) => {
      const st = s.current;
      if (e.target !== st.scroller) {
        // a different scroller: measure from its own position
        st.scroller = e.target;
        st.lastY = e.target instanceof Element ? e.target.scrollTop : window.scrollY;
        st.travel = 0;
      }
      if (!raf) raf = requestAnimationFrame(update);
    };
    // capture: scroll events from elements don't bubble
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("scroll", onScroll, { capture: true });
    };
  }, []);

  return (
    <nav
      className={inner ? `${styles.nav} ${styles.inner}` : styles.nav}
      data-chrome={inner ? undefined : "nav"}
      data-inner-nav={inner || undefined}
      data-hidden={hidden || undefined}
      aria-label="Main"
    >
      <a
        href="/"
        aria-current={inner ? undefined : "page"}
        onClick={
          onWork &&
          ((e) => {
            e.preventDefault();
            onWork();
          })
        }
      >
        Work
      </a>
      <a href="#studio">Studio</a>
      <a href="#contact">Contact</a>
    </nav>
  );
}
