import Image from "next/image";
import Link from "next/link";

type Props = {
  href: string;
  name: string;
  imageUrl: string | null;
  meta?: string | null;
  price?: string | null;
};

/**
 * A single compact list row (thumbnail + name + meta + price) — used to pack
 * several categories into one homepage section instead of a full image-card
 * grid per category. The full-card treatment (`PackageCard` etc.) still owns
 * the dedicated listing pages; this is homepage-only, so those components
 * are reused there unmodified.
 */
export function CompactItemRow({ href, name, imageUrl, meta, price }: Props) {
  return (
    <Link
      href={href}
      className="group hover:bg-muted/50 flex items-center gap-3 rounded-lg p-2 transition-colors"
    >
      <div className="bg-muted relative size-14 shrink-0 overflow-hidden rounded-md">
        {imageUrl ? (
          <Image src={imageUrl} alt={name} fill className="object-cover" sizes="56px" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="group-hover:text-primary truncate text-sm font-medium transition-colors">
          {name}
        </p>
        {meta && <p className="text-muted-foreground truncate text-xs">{meta}</p>}
      </div>
      {price && <p className="shrink-0 text-sm font-semibold">{price}</p>}
    </Link>
  );
}
