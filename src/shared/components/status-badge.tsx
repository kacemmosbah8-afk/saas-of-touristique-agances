import type { ReactNode } from "react";

import { STATUS_TONE_CLASS, type StatusTone } from "@/shared/lib/status-tone";
import { cn } from "@/shared/lib/utils";

export function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        STATUS_TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
