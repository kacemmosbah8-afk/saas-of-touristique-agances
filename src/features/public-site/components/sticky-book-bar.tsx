"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

type Props = {
  /** DOM id of a plain marker element rendered right after the hero's own
   * CTA button (see each product page). Found via `getElementById` rather
   * than a passed-in ref since the page itself is a server component and
   * can't hold refs — only plain markup. */
  sentinelId: string;
  name: string;
  price?: ReactNode;
  bookHref: string;
  ctaLabel: string;
};

/**
 * Persistent bottom bar with the same "Request to Book" action as the hero,
 * so the ask is never more than one scroll away on a long product page —
 * the mobile e-commerce/OTA pattern (Booking.com, Airbnb) applied here.
 * Hidden until the hero's own CTA scrolls out of view (see `sentinelId`),
 * and hidden again via `sm:hidden` on desktop where the hero CTA stays
 * close enough to the fold that a duplicate bar would just be clutter.
 */
export function StickyBookBar({ sentinelId, name, price, bookHref, ctaLabel }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const node = document.getElementById(sentinelId);
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(([entry]) => setShow(!entry.isIntersecting), {
      threshold: 0,
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [sentinelId]);

  return (
    <div
      className={cn(
        "bg-background/95 fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t p-3 backdrop-blur transition-transform duration-300 sm:hidden",
        show ? "translate-y-0" : "translate-y-full",
      )}
      aria-hidden={!show}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        {price && <p className="text-muted-foreground truncate text-xs">{price}</p>}
      </div>
      <Button asChild size="lg" className="shrink-0 text-base" tabIndex={show ? 0 : -1}>
        <Link href={bookHref}>{ctaLabel}</Link>
      </Button>
    </div>
  );
}
