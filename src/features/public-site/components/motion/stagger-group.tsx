"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";

/**
 * Orchestrated multi-element entrance — a headline, its supporting copy,
 * and a CTA arriving in sequence rather than all at once (the "stagger"
 * choreography award-winning sites use, vs. the site's existing `Reveal`
 * which fades a single block in on its own). `StaggerGroup` sets up the
 * timing; each direct child that should participate gets wrapped in
 * `StaggerItem`. Falls back to plain, fully-visible markup under
 * `prefers-reduced-motion` — same convention as `Reveal`/`Parallax`.
 */

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

type Props = {
  children: React.ReactNode;
  className?: string;
};

export function StaggerGroup({ children, className }: Props) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <div className={className}>{children}</div>;

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className={className}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: Props) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <div className={className}>{children}</div>;

  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
}
