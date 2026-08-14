"use client";

import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring, useReducedMotion } from "framer-motion";

/**
 * Animates a number counting up from 0 the first time it scrolls into
 * view — used for the homepage's stat row (trip/destination/stay counts).
 * Spring-driven rather than a linear tween so it settles with a slight
 * overshoot-free deceleration, matching the site's other spring
 * micro-interactions. Renders the final value immediately (no animation)
 * under `prefers-reduced-motion`.
 */
type Props = {
  value: number;
  className?: string;
  suffix?: string;
};

export function CountUp({ value, className, suffix = "" }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const reduceMotion = useReducedMotion();
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { damping: 30, stiffness: 90 });

  useEffect(() => {
    if (isInView && !reduceMotion) motionValue.set(value);
  }, [isInView, motionValue, value, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    return springValue.on("change", (v) => {
      if (ref.current) ref.current.textContent = `${Math.round(v).toLocaleString()}${suffix}`;
    });
  }, [springValue, suffix, reduceMotion]);

  return (
    <span ref={ref} className={className}>
      {reduceMotion ? `${value.toLocaleString()}${suffix}` : "0"}
    </span>
  );
}
