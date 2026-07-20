import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";

import type { PackageSummary } from "@/features/packages/queries/list-packages.query";

type Props = {
  tenantSlug: string;
  pkg: PackageSummary;
};

export function PackageCard({ tenantSlug, pkg }: Props) {
  const location = [pkg.destination, pkg.country].filter(Boolean).join(", ");
  const duration =
    pkg.duration && pkg.durationNights
      ? `${pkg.duration} days / ${pkg.durationNights} nights`
      : pkg.duration
        ? `${pkg.duration} days`
        : null;

  return (
    <Link
      href={`/${tenantSlug}/packages/${pkg.slug}`}
      className="group border-border overflow-hidden rounded-xl border transition-shadow hover:shadow-md"
    >
      <div className="bg-muted relative aspect-[4/3] w-full overflow-hidden">
        {pkg.coverImageUrl ? (
          <Image
            src={pkg.coverImageUrl}
            alt={pkg.name}
            fill
            className="object-cover transition-transform group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="text-muted-foreground/50 flex h-full items-center justify-center text-sm">
            No image yet
          </div>
        )}
      </div>
      <div className="space-y-1.5 p-4">
        <h3 className="group-hover:text-primary font-semibold transition-colors">{pkg.name}</h3>
        {location && (
          <p className="text-muted-foreground flex items-center gap-1 text-sm">
            <MapPin className="size-3.5 shrink-0" />
            {location}
          </p>
        )}
        {duration && <p className="text-muted-foreground text-sm">{duration}</p>}
      </div>
    </Link>
  );
}
