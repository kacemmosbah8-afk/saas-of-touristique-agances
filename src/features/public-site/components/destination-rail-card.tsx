"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import { ImagePlaceholder } from "@/shared/components/media/image-placeholder";
import { cn } from "@/shared/lib/utils";

type Props = {
  href: string;
  name: string;
  country: string;
  imageUrl: string | null;
  large: boolean;
};

/**
 * One card in the homepage's destination rail — extracted from `page.tsx`
 * (a server component) purely so the hover spring-lift below can use
 * Framer Motion's `whileHover`, same treatment as `PackageCard`.
 */
export function DestinationRailCard({ href, name, country, imageUrl, large }: Props) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      whileHover={reduceMotion ? undefined : { y: -6, boxShadow: "0 20px 40px -14px rgba(0,0,0,0.35)" }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={cn("shrink-0 snap-start rounded-2xl", large ? "w-64 sm:w-80" : "w-44 sm:w-52")}
    >
      <Link href={href} className="group block">
        <div className="bg-muted relative aspect-[3/4] w-full overflow-hidden rounded-2xl">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              sizes={large ? "320px" : "208px"}
            />
          ) : (
            <ImagePlaceholder />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/0 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4">
            <p className={cn("font-serif font-semibold text-white", large ? "text-xl" : "text-base")}>{name}</p>
            {country && <p className="text-xs text-white/75">{country}</p>}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
