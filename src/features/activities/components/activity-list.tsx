"use client";

import { useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ticket, Plus } from "lucide-react";
import type { ResourceStatus } from "@prisma/client";

import type { ActivitySummary } from "@/features/activities/queries/list-activities.query";
import {
  updateActivityStatusAction,
  deleteActivityCatalogAction,
} from "@/features/activities/actions/activity.action";
import { ResourceStatusBadge } from "@/shared/components/resource-status-badge";
import { ResourceRowActions } from "@/shared/components/data/resource-row-actions";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";
import { type Locale } from "@/shared/i18n/dictionary";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

type Props = {
  tenantSlug: string;
  tenantId: string;
  activities: ActivitySummary[];
  canCreate: boolean;
  canManage: boolean;
  canDelete: boolean;
  locale: Locale;
};

export function ActivityList({
  tenantSlug,
  tenantId,
  activities,
  canCreate,
  canManage,
  canDelete,
  locale,
}: Props) {
  const dict = getAdminDictionary(locale).activities;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function formatDuration(minutes: number | null) {
    if (minutes == null) return "—";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}${dict.minutesAbbrev}`;
    if (m === 0) return `${h}${dict.hoursAbbrev}`;
    return `${h}${dict.hoursAbbrev} ${m}${dict.minutesAbbrev}`;
  }

  function setStatus(id: string, status: ResourceStatus) {
    startTransition(async () => {
      const result = await updateActivityStatusAction(tenantId, id, { status });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(dict.statusUpdated);
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteActivityCatalogAction(tenantId, id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(dict.deleted);
      router.refresh();
    });
  }

  if (activities.length === 0) {
    return (
      <EmptyState
        icon={Ticket}
        title={dict.noMatch}
        action={
          canCreate ? (
            <Link href={`/${tenantSlug}/admin/activities/new`}>
              <Button size="sm">
                <Plus className="me-1.5 size-4" />
                {dict.addFirstActivity}
              </Button>
            </Link>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/40 border-b">
            <th className="px-4 py-3 text-left font-medium">{dict.columnActivity}</th>
            <th className="hidden px-4 py-3 text-left font-medium sm:table-cell">
              {dict.columnCategory}
            </th>
            <th className="hidden px-4 py-3 text-left font-medium md:table-cell">
              {dict.columnDuration}
            </th>
            <th className="hidden px-4 py-3 text-left font-medium lg:table-cell">
              {dict.columnPrice}
            </th>
            <th className="px-4 py-3 text-left font-medium">{dict.columnStatus}</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {activities.map((a) => (
            <tr key={a.id} className="hover:bg-muted/20 border-b last:border-0">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {a.coverImageUrl ? (
                    <div className="relative size-10 shrink-0 overflow-hidden rounded">
                      <Image src={a.coverImageUrl} alt={a.name} fill className="object-cover" sizes="40px" />
                    </div>
                  ) : (
                    <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded">
                      <Ticket className="text-muted-foreground size-4" />
                    </div>
                  )}
                  <div>
                    <Link
                      href={`/${tenantSlug}/admin/activities/${a.id}/edit`}
                      className="font-medium hover:underline"
                    >
                      {a.name}
                    </Link>
                    {(a.city || a.country) && (
                      <p className="text-muted-foreground text-xs">
                        {[a.city, a.country].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              </td>
              <td className="text-muted-foreground hidden px-4 py-3 sm:table-cell">
                {a.category ?? "—"}
              </td>
              <td className="text-muted-foreground hidden px-4 py-3 md:table-cell">
                {formatDuration(a.durationMinutes)}
              </td>
              <td className="text-muted-foreground hidden px-4 py-3 lg:table-cell">
                {a.sellingPrice != null ? `${a.currency} ${a.sellingPrice.toLocaleString()}` : "—"}
              </td>
              <td className="px-4 py-3">
                <ResourceStatusBadge status={a.status} />
              </td>
              <td className="px-4 py-3 text-right">
                <ResourceRowActions
                  editHref={`/${tenantSlug}/admin/activities/${a.id}/edit`}
                  status={a.status}
                  canManage={canManage}
                  canDelete={canDelete}
                  disabled={isPending}
                  onStatus={(s) => setStatus(a.id, s)}
                  onDelete={() => remove(a.id)}
                  locale={locale}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
