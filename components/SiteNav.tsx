"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./SiteNav.module.css";

const TOP_ZONE = 24; // always shown this close to the top
const HIDE_AFTER = 8; // px scrolled down before hiding
const SHOW_AFTER = 12; // px scrolled up before showing again

/**
 * Main nav. Desktop: stacked top-left. Phones: one row fixed to the top that
 * slides away while scrolling down and returns on a small scroll up.
 */
export function SiteNav() {
  const [hidden, setHidden] = useState(false);
  const s = useRef({ lastY: 0, travel: 0 });

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = Math.max(window.scrollY, 0);
      const st = s.current;
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
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <nav className={styles.nav} data-hidden={hidden || undefined} aria-label="Main">
      <a href="/" aria-current="page">
        Work
      </a>
      <a href="#studio">Studio</a>
      <a href="#contact">Contact</a>
    </nav>
  );
}
