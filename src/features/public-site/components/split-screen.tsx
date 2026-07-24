import Image from "next/image";
import type { ReactNode } from "react";

import { ImagePlaceholder } from "@/shared/components/media/image-placeholder";

type Props = {
  imageUrl: string | null;
  imageAlt: string;
  /** Small label over the image, e.g. the agency name or the product being requested. */
  imageCaption?: ReactNode;
  children: ReactNode;
};

/**
 * Full-height photograph on one side, a short functional form on the
 * other — replaces a centered form box on a plain background. Used by
 * Contact and the Booking Request page so the visitor's last step still
 * feels like part of the trip, not a checkout form (design strategy,
 * "Contact & Booking Request" pattern).
 */
export function SplitScreen({ imageUrl, imageAlt, imageCaption, children }: Props) {
  return (
    <div className="grid lg:grid-cols-2">
      <div className="bg-muted relative hidden aspect-[4/5] w-full overflow-hidden lg:block lg:aspect-auto">
        {imageUrl ? (
          <Image src={imageUrl} alt={imageAlt} fill priority className="object-cover" sizes="50vw" />
        ) : (
          <ImagePlaceholder />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/10" />
        {imageCaption && (
          <div className="absolute inset-x-0 bottom-0 p-10 text-white">{imageCaption}</div>
        )}
      </div>
      <div className="flex items-center px-6 py-16 sm:px-10 lg:px-16 lg:py-0">
        <div className="mx-auto w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
