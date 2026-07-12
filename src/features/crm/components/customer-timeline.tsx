import type { CustomerActivityType } from "@prisma/client";
import {
  UserPlus,
  Pencil,
  RefreshCw,
  StickyNote,
  Mail,
  Phone,
  CalendarClock,
  Tag,
  ArrowRightLeft,
  CircleDot,
} from "lucide-react";

import type { CustomerTimelineItem } from "@/features/crm/queries/get-customer.query";

const ACTIVITY_ICONS: Record<CustomerActivityType, typeof CircleDot> = {
  CREATED: UserPlus,
  UPDATED: Pencil,
  STATUS_CHANGED: RefreshCw,
  NOTE_ADDED: StickyNote,
  EMAIL: Mail,
  CALL: Phone,
  MEETING: CalendarClock,
  TAG_ADDED: Tag,
  CONVERTED: ArrowRightLeft,
  OTHER: CircleDot,
};

export function CustomerTimeline({ items }: { items: CustomerTimelineItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed py-8 text-center text-sm">
        No activity yet.
      </p>
    );
  }

  return (
    <ol className="relative space-y-0">
      {items.map((item, i) => {
        const Icon = ACTIVITY_ICONS[item.type];
        const isLast = i === items.length - 1;
        return (
          <li key={item.id} className="relative flex gap-3 pb-6 last:pb-0">
            {!isLast && (
              <span className="bg-border absolute top-7 left-[13px] h-full w-px" aria-hidden />
            )}
            <span className="bg-muted text-muted-foreground z-10 flex size-7 shrink-0 items-center justify-center rounded-full">
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm font-medium">{item.title}</p>
              {item.description && (
                <p className="text-muted-foreground text-sm">{item.description}</p>
              )}
              <p className="text-muted-foreground mt-0.5 text-xs">
                {new Date(item.createdAt).toLocaleString()}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
