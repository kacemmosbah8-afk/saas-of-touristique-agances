import Image from "next/image";

import { cn } from "@/shared/lib/utils";

type Props = {
  /** Pixel size of the mark (square). Defaults to 28px — comparable to the nav's line-height. */
  size?: number;
  className?: string;
};

/**
 * One One Tourism's own logo — a fixed asset (`public/brand/logo.png`), not
 * admin-editable. This is a one-customer, custom-built site: the brand
 * comes with the codebase itself, the same way the terracotta placeholder
 * mark it replaces used to. One component so every surface (marketing nav,
 * footer, dashboard header, auth/onboarding screens) stays in sync with a
 * single visual asset.
 */
export function Logo({ size = 28, className }: Props) {
  return (
    <Image
      src="/brand/logo.png"
      alt=""
      width={size}
      height={size}
      aria-hidden
      className={cn("rounded-full object-contain", className)}
    />
  );
}
