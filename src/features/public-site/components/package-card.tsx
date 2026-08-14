"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, MapPin } from "lucide-react";

import type { PackageSummary } from "@/features/packages/queries/list-packages.query";
import { ImagePlaceholder } from "@/shared/components/media/image-placeholder";
import { cn } from "@/shared/lib/utils";
import { getDictionary, type Locale } from "@/shared/i18n/dictionary";
import { localize } from "@/shared/lib/i18n/localize";

type Props = {
  tenantSlug: string;
  pkg: PackageSummary;
  locale: Locale;
  /** Larger title/padding for a spotlight slot (e.g. the homepage's first featured card). */
  large?: boolean;
};

/**
 * Full-bleed image + gradient + serif title overlay — matches the treatment
 * already proven on the Packages listing page's bento grid, so the
 * homepage's featured spotlight doesn't read as a weaker, different card
 * style sitting next to it.
 */
export function PackageCard({ tenantSlug, pkg, locale, large = false }: Props) {
  const dict = getDictionary(locale);
  const reduceMotion = useReducedMotion();
  const name = localize(locale, pkg.name, pkg.nameFr);
  const location = [
    localize(locale, pkg.destination ?? "", pkg.destinationFr) || null,
    localize(locale, pkg.country ?? "", pkg.countryFr) || null,
  ]
    .filter(Boolean)
    .join(", ");
  const duration =
    pkg.duration && pkg.durationNights
      ? `${pkg.duration} ${pkg.duration === 1 ? dict.hero.dayOne : dict.hero.dayOther} / ${pkg.durationNights} ${pkg.durationNights === 1 ? dict.hero.nightOne : dict.hero.nightOther}`
      : pkg.duration
        ? `${pkg.duration} ${pkg.duration === 1 ? dict.hero.dayOne : dict.hero.dayOther}`
        : null;

  return (
    <motion.div
      whileHover={
        reduceMotion ? undefined : { y: -8, boxShadow: "0 24px 48px -16px rgba(0,0,0,0.35)" }
      }
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="rounded-2xl"
    >
      <Link
        href={`/${tenantSlug}/packages/${pkg.slug}`}
        className="group relative block aspect-[4/3] w-full overflow-hidden rounded-2xl"
      >
      <div className="bg-muted absolute inset-0">
        {pkg.coverImageUrl ? (
          <Image
            src={pkg.coverImageUrl}
            alt={name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <ImagePlaceholder />
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent transition-opacity group-hover:from-black/85" />
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
        <p
          className={cn(
            "font-serif font-semibold text-white",
            large ? "text-2xl sm:text-3xl" : "text-lg",
          )}
        >
          {name}
        </p>
        {location && (
          <p className="mt-0.5 flex items-center gap-1 text-sm text-white/75">
            <MapPin className="size-3.5 shrink-0" />
            {location}
          </p>
        )}
        <div className="mt-0.5 flex items-baseline justify-between gap-2">
          {duration && <p className="text-sm text-white/60">{duration}</p>}
          {pkg.sellingPrice != null && (
            <p className="text-sm text-white/75">
              {dict.product.from} {pkg.currency} {pkg.sellingPrice.toLocaleString()} {dict.product.perPerson}
            </p>
          )}
        </div>
        <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-white underline decoration-white/40 underline-offset-4 transition-colors group-hover:decoration-white">
          {dict.hero.viewTrip}
          <ArrowUpRight className="size-3.5 rtl:-scale-x-100" />
        </p>
      </div>
      </Link>
    </motion.div>
  );
}
