import type { LucideIcon } from "lucide-react";

import { cn } from "@/shared/lib/utils";

type Props = {
  icon: LucideIcon;
  /** Alternates between the two brand accents for deliberate variety across
   * a row of chips (nav sections, category columns) — same "alternating
   * icons, badges" pattern documented on `--brand-sage` in globals.css. */
  variant?: "primary" | "gold";
  size?: number;
  className?: string;
};

/**
 * A small, soft-tinted icon badge — replaces a bare inline lucide icon
 * wherever a nav item or section header wants to read as a deliberate,
 * on-brand mark rather than a plain glyph. One shared component so the
 * dashboard sidebar and the public homepage's category headers stay
 * visually consistent.
 */
export function IconChip({ icon: Icon, variant = "primary", size = 28, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md",
        variant === "primary" ? "bg-primary/10 text-primary" : "bg-brand-sage/20 text-brand-sage-foreground",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Icon size={Math.round(size * 0.6)} />
    </span>
  );
}
