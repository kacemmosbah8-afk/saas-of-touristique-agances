"use client";

import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** How far the layer drifts relative to scroll distance — higher = more dramatic. */
  strength?: number;
  className?: string;
};

/**
 * Classic scroll parallax: translates its content slightly slower/faster
 * than the page scrolls, so hero imagery feels alive instead of static even
 * between carousel transitions. Pure `requestAnimationFrame` + a passive
 * scroll listener (no scroll library) — one instance per hero, negligible
 * cost. No-ops entirely under `prefers-reduced-motion`.
 */
export function Parallax({ children, strength = 0.25, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const node = ref.current;
    if (!node) return;

    let ticking = false;
    function apply() {
      if (!node) return;
      const rect = node.getBoundingClientRect();
      // Only bother once the element is anywhere near the viewport.
      if (rect.bottom < -200 || rect.top > window.innerHeight + 200) {
        ticking = false;
        return;
      }
      const offset = rect.top * strength;
      node.style.transform = `translate3d(0, ${offset}px, 0)`;
      ticking = false;
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(apply);
    }

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [strength]);

  return (
    <div ref={ref} className={className} style={{ willChange: "transform" }}>
      {children}
    </div>
  );
}
