"use client";

import { useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/shared/lib/utils";

/**
 * Wraps a `<Button>` (or any element) so it drifts slightly toward the
 * cursor on hover — the "magnetic" micro-interaction from the
 * award-winning-site research, used on the hero's primary CTA. A thin
 * `motion.div` wrapper rather than a `Button` variant, so it composes with
 * `asChild`/`<Link>` without touching `button.tsx`. No-ops under
 * `prefers-reduced-motion`.
 */
type Props = {
  children: React.ReactNode;
  className?: string;
  /** How far the button drifts toward the cursor, as a fraction of cursor offset. */
  strength?: number;
};

export function MagneticButton({ children, className, strength = 0.3 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const reduceMotion = useReducedMotion();

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduceMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setOffset({
      x: (e.clientX - rect.left - rect.width / 2) * strength,
      y: (e.clientY - rect.top - rect.height / 2) * strength,
    });
  }

  function handleMouseLeave() {
    setOffset({ x: 0, y: 0 });
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: offset.x, y: offset.y }}
      transition={{ type: "spring", stiffness: 150, damping: 12, mass: 0.3 }}
      className={cn("inline-block", className)}
    >
      {children}
    </motion.div>
  );
}
