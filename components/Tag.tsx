import { useId } from "react";
import type { Tag as TagKind } from "@/lib/projects";

// Shapes on a 26 × 26 grid, as drawn in Sketch "Home, New tags".
// The triangle's round stroke gives it the 2px corner radius.
const SHAPES: Record<TagKind, React.ReactElement> = {
  cd: <circle cx="13" cy="13" r="13" />,
  design: <rect x="1" y="1" width="24" height="24" rx="5" />,
  both: <path d="M13 2.3L24 23H2Z" stroke="#000" strokeWidth="3" strokeLinejoin="round" />,
};

/**
 * A role tag debossed into whatever it sits on: the shape itself is clear,
 * only its inner shadow (dark at the top, a light lip at the bottom) shows.
 */
export function Tag({ kind, className }: { kind: TagKind; className?: string }) {
  const id = useId();
  return (
    <svg className={className} viewBox="0 0 26 26" overflow="visible" aria-hidden>
      <defs>
        <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
          {/* Sketch: inner shadow 0 1 2 #00000040 */}
          <feOffset in="SourceAlpha" dy="1" />
          <feGaussianBlur stdDeviation="1" result="down" />
          <feComposite in="SourceAlpha" in2="down" operator="out" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.25 0" result="shade" />
          {/* light catching the stamp's lower edge, so it reads on dark folders */}
          <feOffset in="SourceAlpha" dy="-1" />
          <feGaussianBlur stdDeviation="0.75" result="up" />
          <feComposite in="SourceAlpha" in2="up" operator="out" />
          <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.35 0" result="lip" />
          <feMerge>
            <feMergeNode in="lip" />
            <feMergeNode in="shade" />
          </feMerge>
        </filter>
      </defs>
      <g filter={`url(#${id})`}>{SHAPES[kind]}</g>
    </svg>
  );
}
