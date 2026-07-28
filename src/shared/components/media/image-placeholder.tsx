import { ImageIcon } from "lucide-react";

import { cn } from "@/shared/lib/utils";

type Props = {
  className?: string;
  iconClassName?: string;
};

/**
 * On-brand fallback for any image slot with no photo yet — a soft
 * terracotta/sage gradient with a faint icon, instead of leaving the slot
 * either blank or showing literal "no image" text. Used everywhere a
 * cover/hero image is optional on the public storefront, so an agency that
 * hasn't finished uploading photos still reads as an intentional, designed
 * page rather than a broken/empty one.
 */
export function ImagePlaceholder({ className, iconClassName }: Props) {
  return (
    <div
      className={cn(
        "from-primary/15 via-muted to-brand-sage/15 flex h-full w-full items-center justify-center bg-gradient-to-br",
        className,
      )}
    >
      <ImageIcon className={cn("text-foreground/15 size-10", iconClassName)} aria-hidden />
    </div>
  );
}
