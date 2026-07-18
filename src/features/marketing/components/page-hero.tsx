import type { ReactNode } from "react";
import Image from "next/image";

import { cn } from "@/shared/lib/utils";
import { RouteMotif } from "@/shared/components/brand/route-motif";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  /** "lg" is the home page's scale; every other marketing page uses the default. */
  size?: "default" | "lg";
  children?: ReactNode;
  /** Full-bleed background photo — curated per page, not every page has one. See PROJECT.md. */
  image?: { src: string; alt: string };
};

/** Consistent hero block reused across every marketing page — not just the home page. */
export function PageHero({ eyebrow, title, description, size = "default", children, image }: Props) {
  return (
    <section className="relative isolate overflow-hidden">
      {image ? (
        <>
          <Image
            src={image.src}
            alt={image.alt}
            fill
            priority
            sizes="100vw"
            className="pointer-events-none -z-20 object-cover"
            style={{ objectPosition: "center 35%" }}
          />
          {/* Dark, brand-tinted scrim — heaviest where the centered text sits,
              fading toward the edges so the photo still reads at the sides.
              Fixed dark tone rather than the theme-swapping --color-foreground
              token: this scrim exists to guarantee white-text contrast over a
              photo, which must hold in both light and dark theme. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(ellipse_70%_90%_at_50%_45%,oklch(0.2_0.02_50_/_78%),oklch(0.2_0.02_50_/_45%)_75%,oklch(0.2_0.02_50_/_35%))]"
          />
        </>
      ) : (
        <>
          {/* Faint radial wash from above the fold — built on the primary token so it
              stays subtle and correct in both light and dark themes. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(ellipse_80%_60%_at_50%_-20%,color-mix(in_oklab,var(--color-primary)_9%,transparent),transparent)]"
          />
          <RouteMotif className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07]" />
        </>
      )}
      <div
        className={cn(
          "mx-auto max-w-4xl px-6 text-center",
          size === "lg" ? "py-24 sm:py-32" : "py-16 sm:py-20",
          image && "py-28 sm:py-40",
        )}
      >
        {eyebrow && (
          <p
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
              image
                ? "border-white/30 bg-white/10 text-white"
                : "border-primary/20 bg-primary/5 text-primary",
            )}
          >
            {eyebrow}
          </p>
        )}
        <h1
          className={cn(
            "mt-4 font-semibold tracking-tight text-balance",
            size === "lg" ? "text-4xl sm:text-5xl md:text-6xl" : "text-4xl sm:text-5xl",
            image && "text-white",
          )}
        >
          {title}
        </h1>
        {description && (
          <p
            className={cn(
              "mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-balance",
              image ? "text-white/85" : "text-muted-foreground",
            )}
          >
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
