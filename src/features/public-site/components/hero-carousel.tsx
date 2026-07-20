"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Parallax } from "@/features/public-site/components/parallax";
import { cn } from "@/shared/lib/utils";

export type HeroSlide = {
  imageUrl: string;
  alt: string;
};

type Props = {
  slides: HeroSlide[];
  /** Rendered on top of every slide — the headline/copy/CTAs stay fixed while images rotate. */
  children: React.ReactNode;
};

const AUTOPLAY_MS = 6000;

/**
 * Full-bleed, auto-advancing hero image carousel. A single static hero image
 * read as flat; rotating through a few of the agency's best photos reads as
 * a living, premium brand. Ken-Burns-style slow zoom on the active slide
 * adds motion even between transitions. Pauses on hover/focus and respects
 * `prefers-reduced-motion` (no autoplay, no zoom, plain crossfade only).
 */
export function HeroCarousel({ slides, children }: Props) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: slides.length > 1 });
  const [selected, setSelected] = useState(0);
  const [paused, setPaused] = useState(false);

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
          {children}
        </div>
      </section>
    );
  }

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
            {slides.map((slide, i) => (
              <div key={slide.imageUrl + i} className="relative h-full min-w-0 flex-[0_0_100%]">
                <Image
                  src={slide.imageUrl}
                  alt={slide.alt}
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
        {children}

        {slides.length > 1 && (
          <div className="mt-10 flex items-center gap-4">
            <div className="flex gap-2">
              {slides.map((slide, i) => (
                <button
                  key={slide.imageUrl + i}
                  type="button"
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => emblaApi?.scrollTo(i)}
                  className={cn(
                    "h-1 rounded-full transition-all",
                    i === selected ? "bg-white w-8" : "bg-white/40 hover:bg-white/70 w-4",
                  )}
                />
              ))}
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                aria-label="Previous slide"
                onClick={() => emblaApi?.scrollPrev()}
                className="hover:bg-white/15 rounded-full p-1.5 text-white/80 transition-colors hover:text-white"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Next slide"
                onClick={() => emblaApi?.scrollNext()}
                className="hover:bg-white/15 rounded-full p-1.5 text-white/80 transition-colors hover:text-white"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
