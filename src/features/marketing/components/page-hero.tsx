import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  /** "lg" is the home page's scale; every other marketing page uses the default. */
  size?: "default" | "lg";
  children?: ReactNode;
};

/** Consistent hero block reused across every marketing page — not just the home page. */
export function PageHero({ eyebrow, title, description, size = "default", children }: Props) {
  return (
    <section className="relative isolate overflow-hidden">
      {/* Faint radial wash from above the fold — built on the primary token so it
          stays subtle and correct in both light and dark themes. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(ellipse_80%_60%_at_50%_-20%,color-mix(in_oklab,var(--color-primary)_9%,transparent),transparent)]"
      />
      <div
        className={cn(
          "mx-auto max-w-4xl px-6 text-center",
          size === "lg" ? "py-24 sm:py-32" : "py-16 sm:py-20",
        )}
      >
        {eyebrow && (
          <p className="border-primary/20 bg-primary/5 text-primary inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium">
            {eyebrow}
          </p>
        )}
        <h1
          className={cn(
            "mt-4 font-semibold tracking-tight text-balance",
            size === "lg" ? "text-4xl sm:text-5xl md:text-6xl" : "text-4xl sm:text-5xl",
          )}
        >
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-balance">
            {description}
          </p>
        )}
        {children && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">{children}</div>
        )}
      </div>
    </section>
  );
}
