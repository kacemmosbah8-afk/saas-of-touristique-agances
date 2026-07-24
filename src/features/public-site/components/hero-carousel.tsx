"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Parallax } from "@/features/public-site/components/parallax";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { getDictionary, localeDir, interpolate, type Locale } from "@/shared/i18n/dictionary";

/**
 * Every field here comes straight from a real, published `Package` row
 * (see `page.tsx`'s `heroSlides` construction) — there is no hardcoded or
 * placeholder copy. Editing a package in the admin changes what the Hero
 * shows on the next request, with no code change required.
 */
export type HeroSlide = {
  imageUrl: string;
  alt: string;
  title: string;
  location: string | null;
  duration: string | null;
  priceLabel: string | null;
  description: string | null;
  href: string;
};

type Props = {
  slides: HeroSlide[];
  agencyName: string;
  viewTripLabel: string;
  browsePackagesLabel: string;
  browsePackagesHref: string;
  locale: Locale;
  /** Rendered only when there are no eligible slides (no published package
   * has a cover image yet) — the agency's own tagline/description/CTAs as a
   * graceful empty state, not a stand-in for real package content. */
  fallback: React.ReactNode;
};

const AUTOPLAY_MS = 6000;

/**
 * Full-bleed, auto-advancing hero image carousel. Each slide is one real
 * package — its own title, location, duration, price, and a direct "view
 * this trip" link — so the same glance that produces the emotional pull of
 * the photo also tells the visitor exactly what it is and where to click.
 * Ken-Burns-style slow zoom on the active slide adds motion even between
 * transitions. Pauses on hover/focus and respects `prefers-reduced-motion`
 * (no autoplay, no zoom, plain crossfade only).
 */
export function HeroCarousel({
  slides,
  agencyName,
  viewTripLabel,
  browsePackagesLabel,
  browsePackagesHref,
  locale,
  fallback,
}: Props) {
  // Embla's own scroll/swipe math needs to be told the direction explicitly —
  // inheriting `dir` from a CSS ancestor only affects layout, not Embla's
  // internal snap calculations. Chevron icons are swapped to match below.
  const isRtl = localeDir[locale] === "rtl";
  const dict = getDictionary(locale);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: slides.length > 1,
    direction: isRtl ? "rtl" : "ltr",
  });
  const [selected, setSelected] = useState(0);
  const [paused, setPaused] = useState(false);

  // Embla's direction is fixed at init; if the visitor switches language
  // while already on this page, re-init so swipe/drag direction follows —
  // without this, only the icons (below) would flip, not the actual drag.
  useEffect(() => {
    emblaApi?.reInit({ direction: isRtl ? "rtl" : "ltr" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRtl]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelected(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!emblaApi || slides.length <= 1 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => emblaApi.scrollNext(), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [emblaApi, paused, slides.length]);

  if (slides.length === 0) {
    return (
      <section className="from-primary/25 via-background to-background relative flex min-h-[92vh] items-end overflow-hidden bg-gradient-to-br">
        <div className="relative mx-auto w-full max-w-6xl px-4 pt-32 pb-16 sm:px-6 sm:pb-24">
          {fallback}
        </div>
      </section>
    );
  }

  const slide = slides[selected] ?? slides[0];
  // Built from whichever fields actually exist — never a fixed dot position,
  // so a package missing e.g. a destination never leaves an orphan "·".
  const metaLine = [slide.location, slide.duration, slide.priceLabel].filter(Boolean).join(" · ");

  return (
    <section
      className="relative flex min-h-[92vh] items-end overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <Parallax strength={0.15} className="absolute -inset-y-16 inset-x-0">
        <div className="h-full" ref={emblaRef}>
          <div className="flex h-full">
            {slides.map((s, i) => (
              <div key={s.href + i} className="relative h-full min-w-0 flex-[0_0_100%]">
                <Image
                  src={s.imageUrl}
                  alt={s.alt}
                  fill
                  priority={i === 0}
                  className={cn(
                    "object-cover transition-transform duration-[6000ms] ease-out motion-reduce:transition-none",
                    i === selected && "scale-110",
                  )}
                  sizes="100vw"
                />
              </div>
            ))}
          </div>
        </div>
      </Parallax>
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />

      <div className="relative mx-auto w-full max-w-6xl px-4 pt-32 pb-16 sm:px-6 sm:pb-24">
        <div className="text-white">
          <p className="mb-4 text-xs font-semibold tracking-[0.2em] text-white/70 uppercase">
            {agencyName}
          </p>
          <h1
            className={cn(
              "max-w-3xl line-clamp-2 leading-[0.98] font-semibold tracking-tight text-balance",
              // A hand-written tagline was always short; a real admin-entered
              // package name (up to 100 chars, see package.schema.ts) isn't
              // guaranteed to be. Long titles step down to a smaller display
              // size so two clamped lines never outweigh the photo — short
              // titles keep the full dramatic size unchanged.
              slide.title.length > 40
                ? "text-[clamp(2.2rem,6vw,3.75rem)]"
                : "text-[clamp(2.6rem,7vw,5rem)]",
            )}
          >
            {slide.title}
          </h1>
          {metaLine && <p className="mt-4 text-base text-white/85">{metaLine}</p>}
          {slide.description && (
            <p className="mt-4 line-clamp-2 max-w-xl text-lg leading-relaxed text-white/85">
              {slide.description}
            </p>
          )}
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg" className="text-base">
              <Link href={slide.href}>{viewTripLabel}</Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="text-base">
              <Link href={browsePackagesHref}>{browsePackagesLabel}</Link>
            </Button>
          </div>
        </div>

        {slides.length > 1 && (
          <div className="mt-10 flex items-center gap-4">
            <div className="flex gap-2">
              {slides.map((s, i) => (
                <button
                  key={s.href + i}
                  type="button"
                  aria-label={interpolate(dict.hero.goToSlide, { n: i + 1 })}
                  onClick={() => emblaApi?.scrollTo(i)}
                  className={cn(
                    "h-1 rounded-full transition-all",
                    i === selected ? "w-8 bg-white" : "w-4 bg-white/40 hover:bg-white/70",
                  )}
                />
              ))}
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                aria-label={dict.hero.previousSlide}
                onClick={() => emblaApi?.scrollPrev()}
                className="hover:bg-white/15 rounded-full p-1.5 text-white/80 transition-colors hover:text-white"
              >
                {isRtl ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
              </button>
              <button
                type="button"
                aria-label={dict.hero.nextSlide}
                onClick={() => emblaApi?.scrollNext()}
                className="hover:bg-white/15 rounded-full p-1.5 text-white/80 transition-colors hover:text-white"
              >
                {isRtl ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
