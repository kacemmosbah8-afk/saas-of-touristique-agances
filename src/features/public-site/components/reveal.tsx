"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

type Props = {
  children: ReactNode;
  /** Stagger this reveal behind siblings, in milliseconds. */
  delay?: number;
  className?: string;
  as?: "div" | "section";
};

/**
 * Fades and rises content into place the first time it enters the
 * viewport — the one "reveal" motion used everywhere on the public
 * storefront (see the design strategy: one direction, one timing,
 * applied consistently rather than a different effect per section).
 * CSS-driven (tw-animate-css's `animate-in`/`fade-in`/`slide-in-from-bottom`
 * utilities, already used by the Sheet component) — the only JS is a
 * one-shot IntersectionObserver toggling a class, so this costs nothing on
 * pages that never scroll it into view. `motion-reduce:opacity-100` keeps
 * content fully visible for reduced-motion users regardless of JS state —
 * the pre-reveal `opacity-0` is a CSS media-query override, not something
 * only the observer can undo.
 */
export function Reveal({ children, delay = 0, className, as = "div" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const Comp = as;
  return (
    <Comp
      ref={ref}
      style={visible ? { animationDelay: `${delay}ms` } : undefined}
      className={cn(
        "motion-reduce:opacity-100",
        visible
          ? "animate-in fade-in slide-in-from-bottom-12 zoom-in-95 fill-mode-both duration-1000 ease-out motion-reduce:animate-none"
          : "opacity-0",
        className,
      )}
    >
      {children}
    </Comp>
  );
}
