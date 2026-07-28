import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/shared/lib/utils";

/**
 * Standard empty state for lists and detail sections: dashed rounded-xl
 * container, muted icon, short message, optional call-to-action. Matches
 * the bespoke empty states already in the app so they can migrate here
 * without a visual change.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "border-muted flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center",
        className,
      )}
    >
      {Icon ? <Icon aria-hidden="true" className="text-muted-foreground size-8" /> : null}
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {description ? (
          <p className="text-muted-foreground mx-auto max-w-sm text-sm">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
