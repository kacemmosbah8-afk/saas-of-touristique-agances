import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { Reveal } from "@/features/public-site/components/reveal";
import { ImagePlaceholder } from "@/shared/components/media/image-placeholder";
import { cn } from "@/shared/lib/utils";
import { localeDir, type Locale } from "@/shared/i18n/dictionary";

type Props = {
  kicker: string;
  title: string;
  children: ReactNode;
  imageUrl: string | null;
  imageAlt: string;
  href?: string;
  cta?: string;
  locale: Locale;
  /** Mirror the image/copy sides — alternate this between consecutive breaks. */
  reverse?: boolean;
};

/**
 * A single large image paired with a short story instead of a card grid —
 * the "editorial framing over product grids" pattern from the design
 * strategy. Used to break the rhythm of list/rail sections on the homepage,
 * Packages, and Destinations.
 */
export function StoryBreak({
  kicker,
  title,
  children,
  imageUrl,
  imageAlt,
  href,
  cta,
  locale,
  reverse,
}: Props) {
  // Same "arrow must point toward reading progression" rule as SectionHeader.
  const arrow = localeDir[locale] === "rtl" ? "←" : "→";
  return (
    <div className={cn("grid items-center gap-10 lg:grid-cols-2 lg:gap-16", reverse && "lg:[&>*:first-child]:order-2")}>
      <Reveal>
        <div className="bg-muted relative aspect-[4/3] w-full overflow-hidden rounded-2xl sm:aspect-[16/11]">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={imageAlt}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          ) : (
            <ImagePlaceholder />
          )}
        </div>
      </Reveal>
      <Reveal delay={120}>
        <p className="text-brand-sage mb-3 text-xs font-semibold tracking-[0.14em] uppercase">
          {kicker}
        </p>
        <h2 className="text-3xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-4xl">
          {title}
        </h2>
        <div className="text-muted-foreground mt-5 max-w-prose text-lg leading-relaxed">{children}</div>
        {href && cta && (
          <Link
            href={href}
            className="text-primary mt-6 inline-flex items-center gap-1.5 text-sm font-semibold underline decoration-1 underline-offset-4 hover:gap-2.5"
          >
            {cta}
            <span aria-hidden>{arrow}</span>
          </Link>
        )}
      </Reveal>
    </div>
  );
}
