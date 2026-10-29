"use client";

import { useEffect, useRef, type CSSProperties } from "react";

/**
 * A video paper in a folder. It loads nothing and shows its still until it
 * comes on screen, then plays muted on a loop; off screen it pauses, so the
 * rail's copies of a folder don't all stream at once.
 */
export function PaperVideo({
  src,
  poster,
  className,
  style,
}: {
  src: string;
  poster: string;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // hidden layouts (the stack on desktop, the rail on phones) never intersect
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) video.play().catch(() => {});
      else video.pause();
    });
    io.observe(video);
    return () => io.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      className={className}
      style={style}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      disablePictureInPicture
      draggable={false}
      aria-hidden
      data-paper
    />
  );
}
