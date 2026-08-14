"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { cn } from "@/shared/lib/utils";

/**
 * One large, auto-rotating quote instead of a static 3-up grid — reads as
 * an editorial spotlight rather than a review-widget grid, matching the
 * `StoryBreak` "one big thing, not a card grid" pattern used elsewhere on
 * the storefront. Pauses under `prefers-reduced-motion` (still rotates on
 * manual dot click, just without the timer/animation).
 */
type Props = {
  quotes: string[];
  intervalMs?: number;
  dotLabel: (index: number) => string;
};

export function TestimonialSpotlight({ quotes, intervalMs = 5500, dotLabel }: Props) {
  const [index, setIndex] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (quotes.length <= 1 || reduceMotion) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % quotes.length), intervalMs);
    return () => clearInterval(id);
  }, [quotes.length, intervalMs, reduceMotion]);

  return (
    <div>
      <div className="relative min-h-[9rem] sm:min-h-[7rem]">
        <AnimatePresence mode="wait">
          <motion.blockquote
            key={index}
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -18 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto max-w-3xl text-center"
          >
            <p className="font-serif text-2xl leading-relaxed text-balance sm:text-3xl">
              &ldquo;{quotes[index]}&rdquo;
            </p>
          </motion.blockquote>
        </AnimatePresence>
      </div>
      {quotes.length > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          {quotes.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={dotLabel(i + 1)}
              onClick={() => setIndex(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === index ? "bg-primary w-7" : "bg-muted-foreground/30 hover:bg-muted-foreground/60 w-1.5",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
